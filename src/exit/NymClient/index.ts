import WebSocket from 'ws';
import { log } from '../log';
import { Response } from '../../interfaces/Response';

import { EthereumRpcClient } from '../EthereumRpcClient';

class NymClient {
    // Websocket connection
    websocketConnection: WebSocket;

    // Nym Websocket URL
    websocketUrl: string;

    // Nym client address
    ourAddress: string;

    // Ethereum RPC client
    ethereumRpcClient: EthereumRpcClient;

    constructor(websocketUrl: string, ethereumRpcClient: EthereumRpcClient) {
        this.websocketUrl = websocketUrl;
        this.ethereumRpcClient = ethereumRpcClient;
    }

    async start() {
        this.websocketConnection = await this.connectWebsocket(this.websocketUrl)
            .then((c) => {
                return c;
            })
            .catch((err) => {
                log(`Websocket connection error. Is the Nym websocket client running at ${this.websocketUrl}?`);
                log(err);
            });

        if (this.websocketConnection == null) {
            log('Could not initialize websocket connection. Exiting.');
        }

        this.websocketConnection.on('message', (data, isBinary: boolean) => {
            this.handleResponse(JSON.parse(data.toString()), isBinary);
        });

        // Get the Nym's client address
        this.sendSelfAddressRequest();
    }

    sendSelfAddressRequest(): void {
        const selfAddressRequest = {
            type: 'selfAddress',
        };

        this.websocketConnection.send(JSON.stringify(selfAddressRequest));
    }

    handleResponse(response: Response, isBinary: boolean): void {
        if (isBinary) {
            log('Received binary message');
        }

        try {
            if (response.type == 'error') {
                log('Server responded with error: ' + response.message);
            } else if (response.type == 'selfAddress') {
                this.ourAddress = response.address;
                log(`The exit node's address is: `);
                log(this.ourAddress);
                log(`You should specify this address as the target address when running the entry utility.`);
            } else if (response.type == 'received') {
                // Send request to the RPC server
                this.ethereumRpcClient.sendAndCallback(response, this.websocketConnection);
            }
        } catch (err) {
            log('Error handling response');
            log(err);
            log(response.toString());
        }
    }

    async connectWebsocket(url: string) {
        return new Promise((resolve, reject) => {
            let server: WebSocket;
            try {
                server = new WebSocket(url);
            } catch (err) {
                log('Error connecting, error:');
                log(err);
                reject();
            }

            server.on('open', () => {
                log('Connected');
                resolve(server);
            });
        });
    }
}

export { NymClient };
