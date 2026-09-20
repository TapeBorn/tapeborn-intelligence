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
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC on Arc Testnet
    description: 'Arc Testnet — Circle L1 test network',
  },
  mainnet: {
    name: 'Arc Mainnet',
    chainId: 5042, // Official Arc Mainnet chain ID (0x13b2)
    rpcUrl: 'https://rpc.mainnet.arc.io',
    isMainnet: true,
    symbol: 'USDC',
    usdcAddress: '0x...', // TODO: Set official USDC mainnet address when available
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

function getUsdcAddress() {
  const network = getCurrentNetwork();
  const addr = network.usdcAddress;
  if (!addr || addr === '0x...') {
    throw new Error(`USDC address not configured for ${network.name} (${network.chainId}). Set ARC_USDC_ADDRESS env var or update networks.js`);
  }
  return addr;
}

function validateNetworkConfig() {
  const network = getCurrentNetwork();
  const required = ['name', 'chainId', 'rpcUrl', 'symbol', 'usdcAddress'];
  for (const field of required) {
    if (!network[field]) {
      throw new Error(`Network config missing required field: ${field}`);
    }
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(network.usdcAddress)) {
    throw new Error(`Invalid USDC address format: ${network.usdcAddress} (must be 0x + 40 hex chars)`);
  }
}

module.exports = {
  NETWORKS,
  getNetwork,
  getCurrentNetwork,
  isMainnet,
  getRpcUrl,
  getChainId,
  getUsdcAddress,
  validateNetworkConfig,
  DEFAULT_NETWORK,
};