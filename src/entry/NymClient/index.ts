import WebSocket from 'ws';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { log } from '../../log';
import { JsonRpcId, NymResponse, RelayedResponse } from '../../interfaces';
import { createRelayedRequest, createSendMessage, jsonRpcError, SELF_ADDRESS_REQUEST } from '../../protocol';

// How long to wait before reconnecting a dropped websocket.
const RECONNECT_DELAY_MS = 5_000;

// How long to wait for a relayed response before failing the request.
const REQUEST_TIMEOUT_MS = 30_000;

interface PendingRequest {
    httpResponse: ExpressResponse;
    originalId: JsonRpcId;
    timer: NodeJS.Timeout;
}

class NymClient {
    private websocketConnection?: WebSocket;
    private readonly websocketUrl: string;
    private readonly exitNodeAddress: string;
    private ourAddress?: string;
    private requestId = 0;
    private readonly pendingRequests = new Map<number, PendingRequest>();
    private reconnectTimer?: NodeJS.Timeout;

    constructor(websocketUrl: string, exitNodeAddress: string) {
        this.websocketUrl = websocketUrl;
        this.exitNodeAddress = exitNodeAddress;
    }

    start(): void {
        this.connect();
    }

    private connect(): void {
        log(`Connecting to ${this.websocketUrl}`);

        const ws = new WebSocket(this.websocketUrl);
        this.websocketConnection = ws;

        ws.on('open', () => {
            log('Connected to the Nym websocket client');
            this.sendSelfAddressRequest();
        });

        ws.on('message', (data: WebSocket.RawData, isBinary: boolean) => {
            if (isBinary) {
                log('Ignoring unexpected binary message');
                return;
            }
            this.onMessage(data.toString());
        });

        ws.on('error', (err: Error) => {
            log(`Websocket error: ${err.message}. Is the Nym websocket client running at ${this.websocketUrl}?`);
        });

        ws.on('close', () => {
            this.ourAddress = undefined;
            log('Websocket connection closed. Attempting to reconnect...');
            this.scheduleReconnect();
        });
    }

    private scheduleReconnect(): void {
        if (this.reconnectTimer) {
            return;
        }
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = undefined;
            this.connect();
        }, RECONNECT_DELAY_MS);
    }

    private onMessage(data: string): void {
        let response: NymResponse;
        try {
            response = JSON.parse(data);
        } catch {
            log('Received a non-JSON message from the Nym client');
            return;
        }
        this.handleResponse(response);
    }

    private handleResponse(response: NymResponse): void {
        switch (response.type) {
            case 'error':
                log(`Nym client responded with error: ${response.message}`);
                break;
            case 'selfAddress':
                this.ourAddress = response.address;
                log(`Our local client's address is: ${this.ourAddress}`);
                break;
            case 'received':
                this.replyBack(response.message);
                break;
            default:
                log('Received an unknown message type from the Nym client');
        }
    }

    private sendSelfAddressRequest(): void {
        this.websocketConnection?.send(JSON.stringify(SELF_ADDRESS_REQUEST));
    }

    relayRequest(request: ExpressRequest, httpResponse: ExpressResponse): void {
        const rpcRequest = request.body;
        const originalId: JsonRpcId = rpcRequest?.id ?? null;

        if (!this.websocketConnection || this.websocketConnection.readyState !== WebSocket.OPEN || !this.ourAddress) {
            httpResponse
                .status(503)
                .json(jsonRpcError(originalId, -32000, 'Nym connection is not ready, please retry shortly'));
            return;
        }

        this.requestId += 1;
        const requestId = this.requestId;

        const container = createRelayedRequest(rpcRequest, this.ourAddress, requestId);
        const message = createSendMessage(container, this.exitNodeAddress);

        const timer = setTimeout(() => {
            if (this.pendingRequests.delete(requestId)) {
                log(`Request ${requestId} timed out after ${REQUEST_TIMEOUT_MS}ms`);
                httpResponse
                    .status(504)
                    .json(jsonRpcError(originalId, -32000, 'Timed out waiting for a response from the exit node'));
            }
        }, REQUEST_TIMEOUT_MS);

        this.pendingRequests.set(requestId, { httpResponse, originalId, timer });
        this.websocketConnection.send(JSON.stringify(message));
    }

    private replyBack(rawMessage: string): void {
        let payload: RelayedResponse;
        try {
            payload = JSON.parse(rawMessage);
        } catch {
            log('Could not parse relayed response from the exit node');
            return;
        }

        const pending = this.pendingRequests.get(payload.requestId);
        if (!pending) {
            log(`No pending request found for relayed response ${payload.requestId}`);
            return;
        }

        clearTimeout(pending.timer);
        this.pendingRequests.delete(payload.requestId);

        const rpcResponse = payload.rpcResponse;
        // Restore the caller's original JSON-RPC id so wallets can correlate
        // the response with their request.
        rpcResponse.id = pending.originalId;
        pending.httpResponse.json(rpcResponse);
    }
}

export { NymClient };
