// src/orchestrator/networks.js
// Network definitions for Arc (testnet and mainnet)
// BUILD_014: Arc Mainnet Readiness

const NETWORKS = {
  testnet: {
    name: 'Arc Testnet',
    chainId: 5042002,
    rpcUrl: 'https://rpc.testnet.arc.io',
    isMainnet: false,
    symbol: 'USDC',
    description: 'Arc Testnet — Circle L1 test network',
  },
  mainnet: {
    name: 'Arc Mainnet',
    chainId: 5042000, // Placeholder — verify actual mainnet chain ID
    rpcUrl: 'https://rpc.mainnet.arc.io', // Placeholder — verify actual RPC
    isMainnet: true,
    symbol: 'USDC',
    description: 'Arc Mainnet — Circle L1 production network',
  },
};

// Default to testnet for safety
const DEFAULT_NETWORK = process.env.ARC_NETWORK || 'testnet';

function getNetwork(name = DEFAULT_NETWORK) {
  const network = NETWORKS[name];
  if (!network) {
    throw new Error(`Unknown network: ${name}. Available: ${Object.keys(NETWORKS).join(', ')}`);
  }
  return network;
}

function getCurrentNetwork() {
  return getNetwork(DEFAULT_NETWORK);
}

function isMainnet() {
  return getCurrentNetwork().isMainnet;
}

function getRpcUrl() {
  return getCurrentNetwork().rpcUrl;
}

function getChainId() {
  return getCurrentNetwork().chainId;
}

module.exports = {
  NETWORKS,
  getNetwork,
  getCurrentNetwork,
  isMainnet,
  getRpcUrl,
  getChainId,
  DEFAULT_NETWORK,
};