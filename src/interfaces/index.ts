// JSON-RPC 2.0 identifier. Per spec it may be a string, number or null.
export type JsonRpcId = string | number | null;

// A JSON-RPC 2.0 request as received from a wallet or CLI tool.
export interface JsonRpcRequest {
    jsonrpc?: string;
    method: string;
    params?: unknown;
    id: JsonRpcId;
}

export interface JsonRpcErrorObject {
    code: number;
    message: string;
    data?: unknown;
}

// A JSON-RPC 2.0 response forwarded back to the caller.
export interface JsonRpcResponse {
    jsonrpc: string;
    id: JsonRpcId;
    result?: unknown;
    error?: JsonRpcErrorObject;
}

// Messages received from the local Nym websocket client.
// This is a discriminated union keyed on `type`.
export type NymResponse =
    | { type: 'error'; message: string }
    | { type: 'selfAddress'; address: string }
    | { type: 'received'; message: string; senderTag?: string };

// Container relayed from the `entry` to the `exit` through the Nym network.
export interface RelayedRequest {
    rpcRequest: JsonRpcRequest;
    replyTo: string;
    requestId: number;
}

// Container relayed from the `exit` back to the `entry` through the Nym network.
export interface RelayedResponse {
    rpcResponse: JsonRpcResponse;
    requestId: number;
}
