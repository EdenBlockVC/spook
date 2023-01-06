import { log } from '../log';
import { Response } from '../../interfaces/Response';

import axios from 'axios';

class EthereumRpcClient {
    // Ethereum RPC URL
    ethereumRpcUrl: string;

    // Request list ID
    requestId = 0;

    // Request list
    requestsToResolve: object = {};

    constructor(ethereumRpcUrl: string) {
        this.ethereumRpcUrl = ethereumRpcUrl;
    }

    sendAndCallback(response: Response, nymWebsocketConnection: WebSocket) {
        log(`Sending request to the Ethereum RPC provider:`);
        log(response);

        const rpcRequestContainer = JSON.parse(response.message);
        const rpcRequest = rpcRequestContainer.rpcRequest;
        // Replace request id
        this.requestId += 1;
        rpcRequest.id = this.requestId;

        log(rpcRequest);

        // Save request id to be able to respond back
        this.requestsToResolve[this.requestId] = rpcRequestContainer;

        axios
            .post(this.ethereumRpcUrl, rpcRequest)
            .then((response) => {
                log('RPC response:');
                log(response.data);

                const rpcResponse = response.data;
                const rpcResponseId = rpcResponse.id;
                const initialRequest = this.requestsToResolve[rpcResponseId];

                const replyBackMessage = {
                    type: 'send',
                    message: JSON.stringify({
                        rpcResponse: response.data,
                        requestId: initialRequest.requestId,
                    }),
                    recipient: initialRequest.replyTo,
                };

                log('Repling back message:');
                log(replyBackMessage);

                nymWebsocketConnection.send(JSON.stringify(replyBackMessage));
            })
            .catch((error) => {
                log('RPC error:');
                log(error);
            });
    }
}

export { EthereumRpcClient };
