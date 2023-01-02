import WebSocket from 'ws';

import express from 'express';

// Websocket connection to the Nym client
var websocketConnection: any;

// Local Nym client address
var ourAddress: string;

// RPC server
var rpcServer: any;

// Address to send messages to (provider address)
var targetAddress: string;

// Main function
async function startNymWebsocketConnection() {
    var port = '3000';
    var localClientUrl = "ws://127.0.0.1:" + port;

    websocketConnection = await connectWebsocket(localClientUrl).then(function (c) {
        return c;
    }).catch(function (err) {
        log("Websocket connection error. Is the client running on port `" + port + "`?");
    });

    if (websocketConnection == null) {
        log('Could not initialize websocket connection. Exiting.');
        return;
    }

    websocketConnection.on('message', function (data, isBinary: boolean) {
        handleResponse(data, isBinary);
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
    log(response.toString());
    log(isBinary ? 'binary' : 'text');
    log('======RESPONSE======');

    try {
        let r = JSON.parse(response.toString());
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
        log(response.toString());
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

    rpcServer.listen(8545);
}

var requestsToResolve: any;

async function makeRequest(request, response) {
    var requestId: number = Math.random();

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

function replyBack(response: JSON) {
    log('Replying back');
    log(response);
}

// Log message
function log(message: any) {
    console.log(message);
}

// Start connection with Nym Websocket client
startNymWebsocketConnection();

// Start port to wait for RPC requests
startRPCServer();
