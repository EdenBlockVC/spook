import express from 'express';
import { NymClient } from '../NymClient';
import { log } from '../../log';

class RpcListener {
    // RPC server
    rpcServer: express.Application;

    // Listen port
    port: string;

    // Nym client
    nymWebsocketClient: NymClient;

    constructor(listenPort: string, nymWebsocketClient: NymClient) {
        this.port = listenPort;
        this.nymWebsocketClient = nymWebsocketClient;
    }

    start = () => {
        log('Starting RPC listener');

        this.rpcServer = express();
        this.rpcServer.use(express.json());

        // Relay post requests to the Nym client
        this.rpcServer.post('/', (request, response) => {
            this.nymWebsocketClient.relayRequest(request, response);
        });

        // Start listening
        this.rpcServer.listen(this.port);
    };
}

export { RpcListener };
