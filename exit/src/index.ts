import { NymClient } from './NymClient';
import { EthereumRpcClient } from './EthereumRpcClient';

const ethereumRpcUrl: string = process.env.ETH_RPC_URL || 'http://localhost:8545';
const ethereumRpcClient = new EthereumRpcClient(ethereumRpcUrl);

const nymClient = new NymClient(process.env.NYM_HOST_URL || 'ws://localhost:3001', ethereumRpcClient);
nymClient.start();
