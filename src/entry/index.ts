import { NymClient } from './NymClient';
import { RpcListener } from './RpcListener';

// Start connection with Nym Websocket client
const exitNodeAddress = process.env.EXIT_NODE_ADDRESS;
const nymClient = new NymClient(process.env.NYM_HOST_URL || 'ws://localhost:3000', exitNodeAddress);
nymClient.start();

// Start port to wait for RPC requests
const rpcListener = new RpcListener(process.env.ETH_RPC_PORT || '8545', nymClient);
rpcListener.start();
