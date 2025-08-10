import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "hardhat-gas-reporter";
import "solidity-coverage";
import * as dotenv from "dotenv";

dotenv.config();

// Check if API key is available
const hasSnowtraceKey = process.env.SNOWTRACE_API_KEY && process.env.SNOWTRACE_API_KEY.length > 0;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    // Avalanche Fuji Testnet (C-Chain) - Multiple RPC endpoints for reliability
    fuji: {
      url: process.env.FUJI_RPC_URL || "https://avalanche-fuji-c-chain-rpc.publicnode.com",
      chainId: 43113,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 25000000000, // 25 gwei
      gas: 8000000,
      timeout: 60000,
    },
    // Backup Fuji endpoints
    fuji_backup1: {
      url: "https://rpc.ankr.com/avalanche_fuji",
      chainId: 43113,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 25000000000,
      gas: 8000000,
      timeout: 60000,
    },
    fuji_backup2: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 25000000000,
      gas: 8000000,
      timeout: 60000,
    },
    fuji_backup3: {
      url: "https://avalanche-fuji.blockpi.network/v1/rpc/public",
      chainId: 43113,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 25000000000,
      gas: 8000000,
      timeout: 60000,
    },
    // Avalanche Mainnet (C-Chain)
    mainnet: {
      url: "https://api.avax.network/ext/bc/C/rpc",
      chainId: 43114,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 25000000000, // 25 gwei
      gas: 8000000,
    },
    // DeFi Kingdoms Subnet (Real DeFi protocols)
    dfk: {
      url: "https://subnets.avax.network/defi-kingdoms/dfk-chain/rpc",
      chainId: 53935,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 25000000000,
      gas: 8000000,
      timeout: 60000,
    },
    // DeFi Kingdoms Testnet
    dfk_testnet: {
      url: "https://subnets.avax.network/defi-kingdoms/dfk-chain-testnet/rpc", 
      chainId: 335,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 25000000000,
      gas: 8000000,
      timeout: 60000,
    },
    // Local Hardhat Network
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    // Hardhat Network
    hardhat: {
      chainId: 31337,
      gas: 12000000,
      blockGasLimit: 12000000,
      allowUnlimitedContractSize: true,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  etherscan: {
    apiKey: {
      // Avalanche - Use API key if available, otherwise empty for free tier
      avalanche: hasSnowtraceKey ? process.env.SNOWTRACE_API_KEY! : "no-api-key-required",
      avalancheFujiTestnet: hasSnowtraceKey ? process.env.SNOWTRACE_API_KEY! : "no-api-key-required",
    },
    customChains: [
      {
        network: "avalanche",
        chainId: 43114,
        urls: {
          // New Snowtrace API endpoints (Routescan/Avascan)
          apiURL: "https://api.routescan.io/v2/network/mainnet/evm/43114/etherscan",
          browserURL: "https://snowtrace.io/"
        }
      },
      {
        network: "avalancheFujiTestnet", 
        chainId: 43113,
        urls: {
          // New Snowtrace API endpoints for testnet
          apiURL: "https://api.routescan.io/v2/network/testnet/evm/43113/etherscan",
          browserURL: "https://testnet.snowtrace.io/"
        }
      }
    ]
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000,
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};

export default config;