/**
 * @type import('hardhat/config').HardhatUserConfig
 */
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  // GAP-E fix: Hardhat's artifact auto-cleanup deletes any file in the artifacts
  // directory that is not a valid Hardhat artifact — which wiped the tracked
  // pipeline outputs artifacts/build_*.json on every compile/test run.
  // Hardhat now owns ./artifacts-hardhat only; artifacts/ is reserved for
  // pipeline build outputs (tracked in git).
  paths: {
    artifacts: "./artifacts-hardhat",
    cache: "./cache-hardhat",
  },
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "cancun",
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
      allowUnlimitedContractSize: true,
    },
    arcTestnet: {
      chainId: 5042002,
      url: "https://rpc.testnet.arc.io",
      accounts: process.env.DEV_WALLET_PRIVATE_KEY ? [process.env.DEV_WALLET_PRIVATE_KEY] : [],
      gasPrice: "auto",
    },
    arcMainnet: {
      chainId: 5042,
      url: "https://rpc.mainnet.arc.io",
      accounts: process.env.DEV_WALLET_PRIVATE_KEY ? [process.env.DEV_WALLET_PRIVATE_KEY] : [],
      gasPrice: "auto",
    },
  },
  etherscan: {
    apiKey: {
      arcTestnet: "arc-testnet",
      arcMainnet: "arc-mainnet",
    },
    customChains: [
      {
        network: "arcTestnet",
        chainId: 5042002,
        urls: {
          apiURL: "https://explorer.testnet.arc.io/api",
          browserURL: "https://explorer.testnet.arc.io",
        },
      },
      {
        network: "arcMainnet",
        chainId: 5042,
        urls: {
          apiURL: "https://explorer.mainnet.arc.io/api",
          browserURL: "https://explorer.mainnet.arc.io",
        },
      },
    ],
  },
};