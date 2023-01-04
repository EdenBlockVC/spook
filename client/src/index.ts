import WebSocket from 'ws';
import express from 'express';

// Websocket connection to the Nym client
var websocketConnection: any;

// Local Nym client address
var ourAddress: string;

// RPC server
var rpcServer: any;

// Nym exit node address
var targetAddress: string = process.env.EXIT_NODE_ADDRESS;

// Main function
async function startNymWebsocketConnection() {
    var localClientUrl = process.env.NYM_HOST_URL || 'ws://localhost:3000';

    log(`Connectingg to ${localClientUrl}`);

    websocketConnection = await connectWebsocket(localClientUrl).then(function (c) {
        return c;
    }).catch(function (err) {
        log(`Websocket connection error. Is the Nym websocket client running at ${localClientUrl}?`);
    });

    if (websocketConnection == null) {
        log('Could not initialize websocket connection. Exiting.');
        return;
    }

    websocketConnection.on('message', function (data, isBinary: boolean) {
        handleResponse(JSON.parse(data.toString()), isBinary);
    })

    // Get the client's address
    sendSelfAddressRequest();

    return 'OK';
}

// Connects to the Nym websocket client
function connectWebsocket(url: string) {
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

function handleResponse(response: any, isBinary: boolean) {
    log('======RESPONSE======');
    log(response);
    log(isBinary ? 'binary' : 'text');
    log('======RESPONSE======');

    try {
        let r = response;
        if (r.type == "error") {
            log("Server responded with error: " + r.message);
        } else if (r.type == "selfAddress") {
            ourAddress = r.address;
            log(`Our local client's address is: ${ourAddress}.`);
        } else if (r.type == "received") {
            // Reply back to the RPC server
            replyBack(r);
        }
    } catch (err) {
        log('Error handling response');
        log(err);
        log(response);
    }
}

function sendSelfAddressRequest() {
    var selfAddressRequest = {
        type: "selfAddress"
    }

    websocketConnection.send(JSON.stringify(selfAddressRequest));
}

async function startRPCServer() {
    log('Starting RPC server');

    rpcServer = express();
    rpcServer.use(express.json());

    rpcServer.post('/', (request, response) => {
        makeRequest(request, response);
    })

    rpcServer.listen(process.env.ETH_RPC_PORT || 8545);
}

var requestId: number = 0;
var requestsToResolve: any = {};

async function makeRequest(request, response) {
    requestId += 1;

    const containerMessage = {
        rpcRequest: request.body,
        replyTo: ourAddress,
        requestId: requestId,
    }

    const message = {
        type: "send",
        message: JSON.stringify(containerMessage),
        recipient: targetAddress,
        withReplySurb: false,
    }

    log(message);

    // Save request to resolve when response is received
    requestsToResolve[requestId] = response;

    // Send message to Nym client
    websocketConnection.send(JSON.stringify(message));
}

function replyBack(response: any) {
    log('Replying back');
    log(response);

    var rpcResponseMessage = JSON.parse(response.message);
    var rpcResponse = rpcResponseMessage.rpcResponse;
    var rpcRequestId = rpcResponseMessage.requestId;

    var initialRequest = requestsToResolve[rpcRequestId];
    initialRequest.json(rpcResponse);
}

// Log message
function log(message: any) {
    console.log(message);
}

// Start connection with Nym Websocket client
startNymWebsocketConnection();

// Start port to wait for RPC requests
startRPCServer();
