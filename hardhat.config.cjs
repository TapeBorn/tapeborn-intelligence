/**
 * @type import('hardhat/config').HardhatUserConfig
 */
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
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