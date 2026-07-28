import { describe, it, expect } from 'vitest';
import {
    createRelayedRequest,
    createRelayedResponse,
    createSendMessage,
    isJsonRpcRequest,
    jsonRpcError,
    SELF_ADDRESS_REQUEST,
} from './index';
import { JsonRpcRequest, JsonRpcResponse } from '../interfaces';

describe('createRelayedRequest', () => {
    it('wraps the rpc request with routing metadata', () => {
        const rpcRequest: JsonRpcRequest = { jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 7 };
        const container = createRelayedRequest(rpcRequest, 'reply-address', 42);

        expect(container).toEqual({ rpcRequest, replyTo: 'reply-address', requestId: 42 });
    });
});

describe('createRelayedResponse', () => {
    it('wraps the rpc response with the correlation id', () => {
        const rpcResponse: JsonRpcResponse = { jsonrpc: '2.0', id: 7, result: '0x1' };
        expect(createRelayedResponse(rpcResponse, 42)).toEqual({ rpcResponse, requestId: 42 });
    });
});

describe('createSendMessage', () => {
    it('serializes the payload into a Nym send command', () => {
        const message = createSendMessage({ hello: 'world' }, 'recipient-address');

        expect(message).toEqual({
            type: 'send',
            message: JSON.stringify({ hello: 'world' }),
            recipient: 'recipient-address',
            withReplySurb: false,
        });
    });

    it('honours the withReplySurb flag', () => {
        expect(createSendMessage({}, 'r', true).withReplySurb).toBe(true);
    });
});

describe('jsonRpcError', () => {
    it('preserves the original id and omits data when not provided', () => {
        const error = jsonRpcError(123, -32000, 'boom');
        expect(error).toEqual({ jsonrpc: '2.0', id: 123, error: { code: -32000, message: 'boom' } });
    });

    it('includes data when provided', () => {
        const error = jsonRpcError(null, -32600, 'bad', { detail: 1 });
        expect(error.error?.data).toEqual({ detail: 1 });
    });
});

describe('isJsonRpcRequest', () => {
    it('accepts objects with a string method', () => {
        expect(isJsonRpcRequest({ method: 'eth_call', id: 1 })).toBe(true);
    });

    it('rejects non-objects and objects without a method', () => {
        expect(isJsonRpcRequest(null)).toBe(false);
        expect(isJsonRpcRequest('eth_call')).toBe(false);
        expect(isJsonRpcRequest({ id: 1 })).toBe(false);
        expect(isJsonRpcRequest({ method: 5 })).toBe(false);
    });
});

describe('SELF_ADDRESS_REQUEST', () => {
    it('is the selfAddress command', () => {
        expect(SELF_ADDRESS_REQUEST).toEqual({ type: 'selfAddress' });
    });
});
