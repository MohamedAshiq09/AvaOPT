// Web3 Configuration for Fuji Testnet Integration
export const FUJI_TESTNET_CONFIG = {
  chainId: '0xA869', // 43113 in hex
  chainName: 'Avalanche Fuji Testnet',
  nativeCurrency: {
    name: 'AVAX',
    symbol: 'AVAX',
    decimals: 18,
  },
  rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
  blockExplorerUrls: ['https://testnet.snowtrace.io/'],
};

// Contract Configuration
export const CONTRACT_CONFIG = {
  YIELD_HUB_ADDRESS: '0x15855D3E2fbC21694e65469Cc824eC61c2B62b27',
  TELEPORTER_MESSENGER: '0x253b2784c75e510dD0fF1da844684a1aC0aa5fcf',
  // Aave V3 Integration
  AAVE_ADAPTER_ADDRESS: '0x0000000000000000000000000000000000000000', // TODO: Deploy AaveV3Adapter
  AAVE_ADDRESSES_PROVIDER: '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb', // Aave V3 on Fuji
  AAVE_DATA_PROVIDER: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654', // Aave V3 Data Provider on Fuji
  // Supported tokens on Fuji testnet (from contract)
  TOKENS: {
    WAVAX: '0xd00ae08403B9bbb9124bB305C09058E32C39A48c', // WAVAX - supported
    WETH: '0x28A8E6e41F84e62284970E4bc0867cEe2AAd0DA4', // WETH - supported  
    USDT: '0x407287b03D1167593AF113d32093942be13A535f', // USDT - Tether USD
    USDC_E: '0xD90db1ca5A6e9873BCD9B0279AE038272b656728', // USDC.e - Bridged USDC
    DAI: '0x3E937B4881CBd500d05EeDAB7BA203f2b7B3f74f', // DAI - Dai Stablecoin
    LINK: '0xFc7215C9498Fc12b22Bc0ed335871Db4315f03d3', // LINK - Chainlink Token
  },
} as const;

// YieldHub ABI - Essential functions for the integration
export const YIELDHUB_ABI = [
  // View functions for data retrieval
  {
    "inputs": [{"internalType": "address", "name": "_token", "type": "address"}],
    "name": "getAaveAPY",
    "outputs": [{"internalType": "uint256", "name": "apyBps", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "_token", "type": "address"}],
    "name": "getAaveTVL",
    "outputs": [{"internalType": "uint256", "name": "tvl", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "_token", "type": "address"}],
    "name": "getAaveDetails",
    "outputs": [
      {"internalType": "uint256", "name": "apyBps", "type": "uint256"},
      {"internalType": "uint256", "name": "tvl", "type": "uint256"},
      {"internalType": "uint256", "name": "liquidityIndex", "type": "uint256"},
      {"internalType": "uint256", "name": "lastUpdate", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "_token", "type": "address"}],
    "name": "calculateOptimizedAPY",
    "outputs": [{"internalType": "uint256", "name": "optimizedAPY", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "_token", "type": "address"}],
    "name": "getOptimalYield",
    "outputs": [
      {"internalType": "bytes32", "name": "protocol", "type": "bytes32"},
      {"internalType": "uint256", "name": "apy", "type": "uint256"},
      {"internalType": "uint256", "name": "riskScore", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getSupportedTokens",
    "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "timestamp", "type": "uint256"}],
    "name": "isDataFresh",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  // State-changing functions for data updates
  {
    "inputs": [{"internalType": "address", "name": "_token", "type": "address"}],
    "name": "updateAaveData",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address[]", "name": "_tokens", "type": "address[]"}],
    "name": "batchUpdateAaveData",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// Token metadata for display
export const TOKEN_INFO = {
  [CONTRACT_CONFIG.TOKENS.WAVAX]: {
    symbol: 'WAVAX',
    name: 'Wrapped AVAX',
    decimals: 18,
    icon: '🏔️',
  },
  [CONTRACT_CONFIG.TOKENS.WETH]: {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    icon: '🔗',
  },
  [CONTRACT_CONFIG.TOKENS.USDT]: {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    icon: '💵',
  },
  [CONTRACT_CONFIG.TOKENS.USDC_E]: {
    symbol: 'USDC.e',
    name: 'Bridged USDC',
    decimals: 6,
    icon: '🔵',
  },
  [CONTRACT_CONFIG.TOKENS.DAI]: {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    icon: '🟡',
  },
  [CONTRACT_CONFIG.TOKENS.LINK]: {
    symbol: 'LINK',
    name: 'Chainlink Token',
    decimals: 18,
    icon: '🔗',
  },
} as const;

// Utility functions
export const formatAPY = (apyBps: bigint | string | number): string => {
  const bps = typeof apyBps === 'bigint' ? apyBps : BigInt(apyBps);
  return (Number(bps) / 100).toFixed(2) + '%';
};

export const formatTVL = (tvl: bigint | string | number): string => {
  const tvlNum = typeof tvl === 'bigint' ? Number(tvl) : Number(tvl);
  const formatted = tvlNum / 1e18; // Assuming 18 decimals
  
  if (formatted >= 1e9) {
    return `$${(formatted / 1e9).toFixed(2)}B`;
  } else if (formatted >= 1e6) {
    return `$${(formatted / 1e6).toFixed(2)}M`;
  } else if (formatted >= 1e3) {
    return `$${(formatted / 1e3).toFixed(2)}K`;
  } else {
    return `$${formatted.toFixed(2)}`;
  }
};

export const isAddressEqual = (addr1: string, addr2: string): boolean => {
  return addr1.toLowerCase() === addr2.toLowerCase();
};