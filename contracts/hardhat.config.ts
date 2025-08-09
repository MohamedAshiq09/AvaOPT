import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true, // Enable via IR for better optimization
    },
  },
  
  networks: {
    hardhat: {
      chainId: 31337,
      accounts: {
        count: 20,
        accountsBalance: "10000000000000000000000", // 10,000 ETH
      },
      allowUnlimitedContractSize: true,
      blockGasLimit: 30000000,
    },
    
    fuji: {
      url: process.env.RPC_FUJI || "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      accounts: process.env.AVAX_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      gas: "auto",
      gasPrice: 25000000000, 
      gasMultiplier: 1.2,
      timeout: 60000,
    },
    
    
  },
  
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
    alwaysGenerateOverloads: false,
  },
  
  etherscan: {
    apiKey: {
      avalanche: process.env.SNOWTRACE_API_KEY || "",
      avalancheFujiTestnet: process.env.SNOWTRACE_API_KEY || "",
    },
    customChains: [
      {
        network: "avalancheFujiTestnet",
        chainId: 43113,
        urls: {
          apiURL: "https://api-testnet.snowtrace.io/api",
          browserURL: "https://testnet.snowtrace.io/"
        }
      }
    ]
  },
  
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    gasPrice: 25,
    token: "AVAX",
  },
  
  mocha: {
    timeout: 60000,
  },
  
  paths: {
    sources: "./contracts",
    tests: "./test", 
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;