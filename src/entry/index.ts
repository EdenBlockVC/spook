import 'dotenv/config';
import { NymClient } from './NymClient';
import { RpcListener } from './RpcListener';
import { log } from '../log';

const exitNodeAddress = process.env.EXIT_NODE_ADDRESS;
if (!exitNodeAddress) {
    log('EXIT_NODE_ADDRESS is not set. Set it to the address printed by the exit node.');
    process.exit(1);
}

// Start connection with the Nym websocket client.
const nymClient = new NymClient(process.env.NYM_HOST_URL || 'ws://localhost:3000', exitNodeAddress);
nymClient.start();

// Listen for incoming RPC requests and relay them through Nym.
const rpcListener = new RpcListener(process.env.ETH_RPC_PORT || '8545', nymClient);
rpcListener.start();
