import { log } from '../log';
import { Response } from '../../interfaces/Response';
import WebSocket from 'ws';

class NymClient {
    // Websocket connection to the Nym client
    websocketConnection: WebSocket;

    // Nym Websocket URL
    websocketUrl: string;

    // Nym client address
    ourAddress: string;

    // Request list ID
    requestId = 0;

    // Request list
    requestsToResolve: object = {};

    // Nym exit node address
    exitNodeAddress: string;

    constructor(websocketUrl: string, exitNodeAddress: string) {
        this.websocketUrl = websocketUrl;
        this.exitNodeAddress = exitNodeAddress;
    }

    async start() {
        log(`Connecting to ${this.websocketUrl}`);

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
            return;
        }

        this.websocketConnection.on('message', (data, isBinary: boolean) => {
            this.handleResponse(JSON.parse(data.toString()), isBinary);
        });

        // Get the Nym's client address
        this.sendSelfAddressRequest();
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
                log(`Our local client's address is: ${this.ourAddress}.`);
            } else if (response.type == 'received') {
                // Reply back to the RPC server
                this.replyBack(response);
            }
        } catch (err) {
            log('Error handling response');
            log(err);
            log(response);
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

    sendSelfAddressRequest(): void {
        const selfAddressRequest = {
            type: 'selfAddress',
        };

        this.websocketConnection.send(JSON.stringify(selfAddressRequest));
    }

    relayRequest(request, response): void {
        this.requestId += 1;

        const containerMessage = {
            rpcRequest: request.body,
            replyTo: this.ourAddress,
            requestId: this.requestId,
        };

        const message = {
            type: 'send',
            message: JSON.stringify(containerMessage),
            recipient: this.exitNodeAddress,
            withReplySurb: false,
        };

        // Save request to resolve when response is received
        this.requestsToResolve[this.requestId] = response;

        // Send message to Nym client
        this.websocketConnection.send(JSON.stringify(message));
    }

    replyBack(response: Response): void {
        log('Replying back');
        log(response);

        const rpcResponseMessage = JSON.parse(response.message);
        const rpcResponse = rpcResponseMessage.rpcResponse;
        const rpcRequestId = rpcResponseMessage.requestId;

        const initialRequest = this.requestsToResolve[rpcRequestId];
        initialRequest.json(rpcResponse);
    }
}

export { NymClient };
