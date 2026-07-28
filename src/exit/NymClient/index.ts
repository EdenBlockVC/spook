import WebSocket from 'ws';
import { log } from '../../log';
import { NymResponse } from '../../interfaces';
import { SELF_ADDRESS_REQUEST } from '../../protocol';
import { EthereumRpcClient } from '../EthereumRpcClient';

// How long to wait before reconnecting a dropped websocket.
const RECONNECT_DELAY_MS = 5_000;

class NymClient {
    private websocketConnection?: WebSocket;
    private readonly websocketUrl: string;
    private readonly ethereumRpcClient: EthereumRpcClient;
    private ourAddress?: string;
    private reconnectTimer?: NodeJS.Timeout;

    constructor(websocketUrl: string, ethereumRpcClient: EthereumRpcClient) {
        this.websocketUrl = websocketUrl;
        this.ethereumRpcClient = ethereumRpcClient;
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

    private sendSelfAddressRequest(): void {
        this.websocketConnection?.send(JSON.stringify(SELF_ADDRESS_REQUEST));
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
                log("The exit node's address is:");
                log(this.ourAddress);
                log('You should specify this address as the target address when running the entry utility.');
                break;
            case 'received':
                if (this.websocketConnection) {
                    void this.ethereumRpcClient.handleRelayedRequest(response.message, this.websocketConnection);
                }
                break;
            default:
                log('Received an unknown message type from the Nym client');
        }
    }
}

export { NymClient };
