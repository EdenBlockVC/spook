console.log("Starting provider")

import WebSocket from 'ws';
import axios from 'axios';

var ourAddress: string;
var websocketConnection: any;
// TODO: read this from process.env
var ethereumRPCUrl: string = 'https://eth-mainnet.g.alchemy.com/v2/9A0skgonLxqrtMN51Bo2TlSGMLpTAPoB';

async function main() {
    var port = process.env.PORT || 3001;
    var localClientUrl = process.env.LOCAL_CLIENT_URL || 'ws://localhost:' + port;

    log(localClientUrl);

    websocketConnection = await connectWebsocket(localClientUrl).then(function (c) {
        return c;
    }).catch(function (err) {
        log("Websocket connection error. Is the client running on port `" + port + "`?");
    });

    if (websocketConnection == null) {
        log('Could not initialize websocket connection. Exiting.');
    }

    websocketConnection.on('message', function (data, isBinary: boolean) {
        handleResponse(JSON.parse(data.toString()), isBinary);
    });
        
    // Get the client's address
    sendSelfAddressRequest();

    return 'OK';
}

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

function sendSelfAddressRequest() {
    var selfAddressRequest = {
        type: "selfAddress"
    }

    websocketConnection.send(JSON.stringify(selfAddressRequest));
}

function handleResponse(response: any, isBinary: boolean) {
    log('======REQUEST======');
    log(response);
    log(isBinary ? 'binary' : 'text');
    log('======REQUEST======');

    try {
        let r = response;
        if (r.type == "error") {
            log("Server responded with error: " + r.message);
        } else if (r.type == "selfAddress") {
            ourAddress = r.address;
            log(`Our local client's address is: ${ourAddress}.`);
        } else if (r.type == "received") {
            // Send request to the RPC server
            // replyBack(r);
            makeRPCRequest(r);
        }
    } catch (err) {
        log('Error handling response');
        log(err);
        log(response.toString());
    }
}

// {"id":2,"jsonrpc":"2.0","method":"eth_chainId"}
var exampleRPC = {
    type: 'received',
    message: '{"rpcRequest":{"id":1,"jsonrpc":"2.0","method":"eth_chainId"}}',
    // recipient: undefined,
    // withReplySurb: false
}

var requestId: number = 0;
var requestsToResolve: any = {};

function makeRPCRequest(r) {
    log(`Sending RPC request to the RPC server:`);
    log(r);

    var rpcRequestContainer = JSON.parse(r.message);
    var rpcRequest = rpcRequestContainer.rpcRequest;
    // Replace request id
    requestId += 1;
    rpcRequest.id = requestId;

    log(rpcRequest);

    // Save request id to be able to respond back
    requestsToResolve[requestId] = rpcRequestContainer;

    axios.post(ethereumRPCUrl, rpcRequest)
        .then(function (response) { 
            log("RPC response:")
            log(response.data);

            // TODO: Send response back to the client
            var rpcResponse = response.data;
            var rpcResponseId = rpcResponse.id;
            var initialRequest = requestsToResolve[rpcResponseId];
            
            var replyBackMessage = {
                type: "send",
                message: JSON.stringify({
                    rpcResponse: response.data,
                    requestId: initialRequest.requestId,
                }),
                recipient: initialRequest.replyTo,
            }

            log("Reply back message:");
            log(replyBackMessage);

            websocketConnection.send(JSON.stringify(replyBackMessage));
        })
        .catch(function (error) {
            log("RPC error:")
            log(error);
            // TOOD: Send error back to the client
        })
        .finally(function () { 
            log("RPC done");
        })

}


// Log message
function log(message: any) {
    console.log(message);
}

main();