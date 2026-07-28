import { JsonRpcId, JsonRpcRequest, JsonRpcResponse, RelayedRequest, RelayedResponse } from '../interfaces';

// A `send` command understood by the Nym websocket client.
export interface NymSendMessage {
    type: 'send';
    message: string;
    recipient: string;
    withReplySurb: boolean;
}

// Request the local Nym client to report its own address.
export const SELF_ADDRESS_REQUEST = { type: 'selfAddress' as const };

// Build the container that the `entry` relays to the `exit`.
export function createRelayedRequest(rpcRequest: JsonRpcRequest, replyTo: string, requestId: number): RelayedRequest {
    return { rpcRequest, replyTo, requestId };
}

// Build the container that the `exit` relays back to the `entry`.
export function createRelayedResponse(rpcResponse: JsonRpcResponse, requestId: number): RelayedResponse {
    return { rpcResponse, requestId };
}

// Wrap an arbitrary payload into a Nym `send` command addressed to `recipient`.
export function createSendMessage(payload: unknown, recipient: string, withReplySurb = false): NymSendMessage {
    return {
        type: 'send',
        message: JSON.stringify(payload),
        recipient,
        withReplySurb,
    };
}

// Build a JSON-RPC 2.0 error response, preserving the original request id.
export function jsonRpcError(id: JsonRpcId, code: number, message: string, data?: unknown): JsonRpcResponse {
    return {
        jsonrpc: '2.0',
        id,
        error: { code, message, ...(data !== undefined ? { data } : {}) },
    };
}

// Best-effort check that a parsed body looks like a JSON-RPC request.
export function isJsonRpcRequest(body: unknown): body is JsonRpcRequest {
    return typeof body === 'object' && body !== null && typeof (body as { method?: unknown }).method === 'string';
}
