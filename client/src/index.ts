import WebSocket from 'ws';
import express from 'express';

// Nym exit node address
var targetAddress: string = process.env.EXIT_NODE_ADDRESS;

class NymClient {
    // Websocket connection to the Nym client
    websocketConnection: any;

    // Local Nym Websocket URL
    websocketURL: string

    // Local Nym client address
    ourAddress: string;

    // Request list ID
    requestId: number = 0;

    // Request list
    requestsToResolve: any = {};

    // Nym exit node address
    exitNodeAddress: string;

    constructor(WebsocketUrl: string, exitNodeAddress: string) {
        this.websocketURL = WebsocketUrl;
        this.exitNodeAddress = exitNodeAddress;
    }

    handleResponse(response: any, isBinary: boolean): void {
        try {
            let r = response;
            if (r.type == "error") {
                log("Server responded with error: " + r.message);
            } else if (r.type == "selfAddress") {
                this.ourAddress = r.address;
                log(`Our local client's address is: ${this.ourAddress}.`);
            } else if (r.type == "received") {
                // Reply back to the RPC server
                this.replyBack(r);
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
    
        return new Promise(function (resolve, _) {
            var server: any;
            try {
                server = new WebSocket(url);
            } catch (err) {
                log("Error connecting, error:");
                log(err);
            }
    
            server.on('open', function open() {
                log('Connected');
                resolve(server);
            })
        });
    }

    sendSelfAddressRequest(): void {
        var selfAddressRequest = {
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
            recipient: targetAddress,
            withReplySurb: false,
        }

        // Save request to resolve when response is received
        this.requestsToResolve[this.requestId] = response;

        // Send message to Nym client
        this.websocketConnection.send(JSON.stringify(message));
    }

    replyBack(response: any): void {
        log('Replying back');
        log(response);
    
        var rpcResponseMessage = JSON.parse(response.message);
        var rpcResponse = rpcResponseMessage.rpcResponse;
        var rpcRequestId = rpcResponseMessage.requestId;
    
        var initialRequest = this.requestsToResolve[rpcRequestId];
        initialRequest.json(rpcResponse);
    }
}


class RPCListener { 
    // RPC server
    rpcServer: any;

    // Listen port
    port: number;

    // Nym client
    nymWebsocketClient: NymClient;

    constructor(listenPort: any, nymWebsocketClient: NymClient) { 
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
function log(message: any) {
    console.log(message);
}


// Start connection with Nym Websocket client
var exitNodeAddress = process.env.EXIT_NODE_ADDRESS;
var nymClient = new NymClient(process.env.NYM_HOST_URL || 'ws://localhost:3000', exitNodeAddress);
nymClient.start();

// Start port to wait for RPC requests
var rpcListener = new RPCListener(process.env.ETH_RPC_PORT || 8545, nymClient);
rpcListener.start();
