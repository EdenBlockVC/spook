import axios from 'axios';
import type WebSocket from 'ws';
import { log } from '../../log';
import { JsonRpcResponse, RelayedRequest } from '../../interfaces';
import { createRelayedResponse, createSendMessage, jsonRpcError } from '../../protocol';

// How long to wait for the upstream Ethereum RPC provider before failing.
const UPSTREAM_TIMEOUT_MS = 30_000;

class EthereumRpcClient {
    private readonly ethereumRpcUrl: string;

    constructor(ethereumRpcUrl: string) {
        this.ethereumRpcUrl = ethereumRpcUrl;
    }

    // Forward a relayed request to the Ethereum RPC provider and send the
    // response back through the Nym websocket connection. Each call is fully
    // self-contained, so concurrent requests cannot collide.
    async handleRelayedRequest(rawMessage: string, nymWebsocketConnection: WebSocket): Promise<void> {
        let container: RelayedRequest;
        try {
            container = JSON.parse(rawMessage);
        } catch {
            log('Could not parse relayed request from the entry node');
            return;
        }

        const { rpcRequest, replyTo, requestId } = container;
        const originalId = rpcRequest.id;

        let rpcResponse: JsonRpcResponse;
        try {
            log(`Forwarding request to ${this.ethereumRpcUrl}: ${rpcRequest.method}`);
            const upstream = await axios.post<JsonRpcResponse>(this.ethereumRpcUrl, rpcRequest, {
                timeout: UPSTREAM_TIMEOUT_MS,
            });
            rpcResponse = upstream.data;
            // Preserve the caller's original JSON-RPC id end to end.
            rpcResponse.id = originalId;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            log(`Upstream RPC error: ${message}`);
            rpcResponse = jsonRpcError(originalId, -32000, `Upstream RPC error: ${message}`);
        }

        const reply = createSendMessage(createRelayedResponse(rpcResponse, requestId), replyTo);
        nymWebsocketConnection.send(JSON.stringify(reply));
    }
}

export { EthereumRpcClient };
