import express from 'express';
import type { Request, Response } from 'express';
import { NymClient } from '../NymClient';
import { log } from '../../log';
import { isJsonRpcRequest, jsonRpcError } from '../../protocol';

class RpcListener {
    private readonly port: string;
    private readonly nymWebsocketClient: NymClient;

    constructor(listenPort: string, nymWebsocketClient: NymClient) {
        this.port = listenPort;
        this.nymWebsocketClient = nymWebsocketClient;
    }

    start = (): void => {
        const app = express();
        app.use(express.json());

        // Relay JSON-RPC POST requests through the Nym network.
        app.post('/', (request: Request, response: Response) => {
            if (!isJsonRpcRequest(request.body)) {
                response.status(400).json(jsonRpcError(null, -32600, 'Invalid JSON-RPC request'));
                return;
            }
            this.nymWebsocketClient.relayRequest(request, response);
        });

        app.listen(Number(this.port), () => {
            log(`RPC listener started on port ${this.port}`);
        });
    };
}

export { RpcListener };
