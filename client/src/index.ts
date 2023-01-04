import WebSocket from 'ws';
import express from 'express';

interface Response { 
    type: string;
    message: string;
    address: string;
}

class NymClient {
    // Websocket connection to the Nym client
    websocketConnection: WebSocket;

    // Local Nym Websocket URL
    websocketURL: string

    // Local Nym client address
    ourAddress: string;

    // Request list ID
    requestId = 0;

    // Request list
    requestsToResolve: object = {};

    // Nym exit node address
    exitNodeAddress: string;

    constructor(WebsocketUrl: string, exitNodeAddress: string) {
        this.websocketURL = WebsocketUrl;
        this.exitNodeAddress = exitNodeAddress;
    }

    handleResponse(response: Response, isBinary: boolean): void {
        if (isBinary) {
            log('Received binary message');
        }

        try {
            if (response.type == "error") {
                log("Server responded with error: " + response.message);
            } else if (response.type == "selfAddress") {
                this.ourAddress = response.address;
                log(`Our local client's address is: ${this.ourAddress}.`);
            } else if (response.type == "received") {
                // Reply back to the RPC server
                this.replyBack(response);
            }
        } catch (err) {
            log('Error handling response');
            log(err);
            log(response);
        }
    }    

    async start() {
        log(`Connectingg to ${this.websocketURL}`);

        this.websocketConnection = await this.connectWebsocket(this.websocketURL).then(function (c) {
            return c;
        }).catch(function (err) {
            log(`Websocket connection error. Is the Nym websocket client running at ${this.websocketURL}?`);
            log(err);
        });

        if (this.websocketConnection == null) {
            log('Could not initialize websocket connection. Exiting.');
            return;
        }

        this.websocketConnection.on('message', (data, isBinary: boolean) => {
            this.handleResponse(JSON.parse(data.toString()), isBinary);
        })

        // Get the client's address
        this.sendSelfAddressRequest();
    }

    async connectWebsocket(url: string) {
        log(`Trying to connect to ${url}`)
    
        return new Promise(function (resolve, reject) {
            let server: WebSocket;
            try {
                server = new WebSocket(url);
            } catch (err) {
                log("Error connecting, error:");
                log(err);
                reject();
            }
    
            server.on('open', function open() {
                log('Connected');
                resolve(server);
            })
        });
    }

    sendSelfAddressRequest(): void {
        const selfAddressRequest = {
            type: "selfAddress"
        }
    
        this.websocketConnection.send(JSON.stringify(selfAddressRequest));
    }
    
    relayRequest(request, response): void {
        this.requestId += 1;

        const containerMessage = {
            rpcRequest: request.body,
            replyTo: this.ourAddress,
            requestId: this.requestId,
        }

        const message = {
            type: "send",
            message: JSON.stringify(containerMessage),
            recipient: this.exitNodeAddress,
            withReplySurb: false,
        }

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


class RPCListener { 
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
        log('Starting RPC server');

        this.rpcServer = express();
        this.rpcServer.use(express.json());

        // Relay post requests to the Nym client
        this.rpcServer.post('/', (request, response) => {
            this.nymWebsocketClient.relayRequest(request, response);
        })

        // Start listening
        this.rpcServer.listen(this.port);
    }
}

// Log message
function log(message) {
    console.log(message);
}


// Start connection with Nym Websocket client
const exitNodeAddress = process.env.EXIT_NODE_ADDRESS;
const nymClient = new NymClient(process.env.NYM_HOST_URL || 'ws://localhost:3000', exitNodeAddress);
nymClient.start();

// Start port to wait for RPC requests
const rpcListener = new RPCListener(process.env.ETH_RPC_PORT || '8545', nymClient);
rpcListener.start();
