'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers, BrowserProvider, Contract } from 'ethers';
import { toast } from 'react-toastify';
import { 
  FUJI_TESTNET_CONFIG, 
  CONTRACT_CONFIG, 
  YIELDHUB_ABI, 
  TOKEN_INFO,
  formatAPY,
  formatTVL 
} from './web3-config';

// Types
interface TokenYieldData {
  address: string;
  symbol: string;
  name: string;
  apy: string;
  rawAPY: bigint;
  tvl: string;
  rawTVL: bigint;
  optimizedAPY: string;
  rawOptimizedAPY: bigint;
  isDataFresh: boolean;
  lastUpdate: number;
  isLoading: boolean;
  error?: string;
}

interface OptimalYieldData {
  protocol: string;
  apy: string;
  rawAPY: bigint;
  riskScore: number;
}

interface Web3ContextType {
  // Connection state
  account: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: number | null;
  provider: BrowserProvider | null;
  yieldHubContract: Contract | null;
  
  // Token data
  supportedTokens: string[];
  tokenYieldData: Record<string, TokenYieldData>;
  isLoadingData: boolean;
  
  // Functions
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchToFuji: () => Promise<boolean>;
  refreshTokenData: (tokenAddress?: string) => Promise<void>;
  updateAaveData: (tokenAddress: string) => Promise<void>;
  getOptimalYield: (tokenAddress: string) => Promise<OptimalYieldData | null>;
  
  // Auto-refresh
  autoRefresh: boolean;
  setAutoRefresh: (enabled: boolean) => void;
}

const Web3Context = createContext<Web3ContextType | null>(null);

// Custom hook
export const useWeb3 = (): Web3ContextType => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

// Provider component
interface Web3ProviderProps {
  children: ReactNode;
}

export const Web3Provider: React.FC<Web3ProviderProps> = ({ children }) => {
  // State
  const [account, setAccount] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [yieldHubContract, setYieldHubContract] = useState<Contract | null>(null);
  const [supportedTokens, setSupportedTokens] = useState<string[]>([]);
  const [tokenYieldData, setTokenYieldData] = useState<Record<string, TokenYieldData>>({});
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Initialize supported tokens
  useEffect(() => {
    const tokens = Object.values(CONTRACT_CONFIG.TOKENS);
    setSupportedTokens(tokens);
    
    // Initialize token data structure
    const initialTokenData: Record<string, TokenYieldData> = {};
    tokens.forEach(tokenAddress => {
      const tokenInfo = TOKEN_INFO[tokenAddress as keyof typeof TOKEN_INFO];
      initialTokenData[tokenAddress] = {
        address: tokenAddress,
        symbol: tokenInfo?.symbol || 'UNKNOWN',
        name: tokenInfo?.name || 'Unknown Token',
        apy: '0.00%',
        rawAPY: BigInt(0),
        tvl: '$0',
        rawTVL: BigInt(0),
        optimizedAPY: '0.00%',
        rawOptimizedAPY: BigInt(0),
        isDataFresh: false,
        lastUpdate: 0,
        isLoading: false,
      };
    });
    setTokenYieldData(initialTokenData);
  }, []);

  // Check for existing connection on load
  useEffect(() => {
    checkConnection();
    
    // Setup event listeners
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || !yieldHubContract) return;

    const interval = setInterval(async () => {
      await refreshTokenData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, yieldHubContract]);

  // Check existing connection
  const checkConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const browserProvider = new BrowserProvider(window.ethereum);
        const accounts = await browserProvider.listAccounts();
        
        if (accounts.length > 0) {
          const network = await browserProvider.getNetwork();
          setAccount(accounts[0].address);
          setIsConnected(true);
          setChainId(Number(network.chainId));
          setProvider(browserProvider);
          
          if (Number(network.chainId) === 43113) {
            setupContract(browserProvider);
          }
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    }
  };

  // Setup contract instance
  const setupContract = (browserProvider: BrowserProvider) => {
    try {
      const contract = new Contract(
        CONTRACT_CONFIG.YIELD_HUB_ADDRESS,
        YIELDHUB_ABI,
        browserProvider
      );
      setYieldHubContract(contract);
      
      // Initial data load
      setTimeout(() => refreshTokenData(), 1000);
    } catch (error) {
      console.error('Error setting up contract:', error);
      toast.error('Failed to connect to YieldHub contract');
    }
  };

  // Connect wallet
  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      toast.error('MetaMask is not installed');
      return;
    }

    setIsConnecting(true);
    try {
      const browserProvider = new BrowserProvider(window.ethereum);
      await browserProvider.send('eth_requestAccounts', []);
      
      const accounts = await browserProvider.listAccounts();
      const network = await browserProvider.getNetwork();
      
      setAccount(accounts[0].address);
      setIsConnected(true);
      setChainId(Number(network.chainId));
      setProvider(browserProvider);

      // Check if on Fuji testnet
      if (Number(network.chainId) !== 43113) {
        const switched = await switchToFuji();
        if (switched) {
          setupContract(browserProvider);
        }
      } else {
        setupContract(browserProvider);
      }

      toast.success('Wallet connected successfully!');
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      if (error.code === 4001) {
        toast.warn('Please connect to MetaMask');
      } else {
        toast.error('Failed to connect wallet');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setAccount(null);
    setIsConnected(false);
    setChainId(null);
    setProvider(null);
    setYieldHubContract(null);
    toast.success('Wallet disconnected');
  };

  // Switch to Fuji testnet
  const switchToFuji = async (): Promise<boolean> => {
    if (typeof window.ethereum === 'undefined') return false;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: FUJI_TESTNET_CONFIG.chainId }],
      });
      return true;
    } catch (switchError: any) {
      // Chain not added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [FUJI_TESTNET_CONFIG],
          });
          return true;
        } catch (addError) {
          console.error('Error adding Fuji network:', addError);
          toast.error('Failed to add Fuji testnet to MetaMask');
          return false;
        }
      }
      console.error('Error switching to Fuji:', switchError);
      toast.error('Failed to switch to Fuji testnet');
      return false;
    }
  };

  // Refresh token data
  const refreshTokenData = async (tokenAddress?: string) => {
    if (!yieldHubContract) return;

    setIsLoadingData(true);
    const tokensToRefresh = tokenAddress ? [tokenAddress] : supportedTokens;

    try {
      const updatedData = { ...tokenYieldData };

      for (const token of tokensToRefresh) {
        updatedData[token] = { ...updatedData[token], isLoading: true, error: undefined };
      }
      setTokenYieldData(updatedData);

      for (const token of tokensToRefresh) {
        try {
          // Use the same approach as the working yield optimizer service
          const [apyBps, tvl, liquidityIndex, lastUpdate] = await yieldHubContract.getAaveDetails(token);
          const optimizedAPY = await yieldHubContract.calculateOptimizedAPY(token);
          
          // Check data freshness
          const isDataFresh = await yieldHubContract.isDataFresh(lastUpdate);

          updatedData[token] = {
            ...updatedData[token],
            rawAPY: apyBps,
            apy: formatAPY(apyBps),
            rawTVL: tvl,
            tvl: formatTVL(tvl),
            rawOptimizedAPY: optimizedAPY,
            optimizedAPY: formatAPY(optimizedAPY),
            isDataFresh,
            lastUpdate: Number(lastUpdate),
            isLoading: false,
          };
        } catch (error) {
          console.error(`Error fetching data for token ${token}:`, error);
          
          // Fallback to individual methods only if getAaveDetails fails
          try {
            console.log(`Trying individual methods for ${token}...`);
            const apyBps = await yieldHubContract.getAaveAPY(token);
            const tvl = await yieldHubContract.getAaveTVL(token);
            
            updatedData[token] = {
              ...updatedData[token],
              rawAPY: apyBps,
              apy: formatAPY(apyBps),
              rawTVL: tvl,
              tvl: formatTVL(tvl),
              rawOptimizedAPY: apyBps, // Use APY as optimized fallback
              optimizedAPY: formatAPY(apyBps),
              isDataFresh: true, // Assume fresh for individual methods
              lastUpdate: Math.floor(Date.now() / 1000),
              isLoading: false,
            };
          } catch (fallbackError) {
            console.error(`Fallback also failed for ${token}:`, fallbackError);
            updatedData[token] = {
              ...updatedData[token],
              isLoading: false,
              error: 'Failed to fetch data',
            };
          }
        }
      }

      setTokenYieldData(updatedData);
    } catch (error) {
      console.error('Error refreshing token data:', error);
      toast.error('Failed to refresh yield data');
    } finally {
      setIsLoadingData(false);
    }
  };

  // Update Aave data on-chain
  const updateAaveData = async (tokenAddress: string) => {
    if (!yieldHubContract || !provider) return;

    try {
      const signer = await provider.getSigner();
      const contractWithSigner = yieldHubContract.connect(signer);
      
      toast.info('Updating Aave data on-chain...');
      const tx = await contractWithSigner.updateAaveData(tokenAddress);
      
      toast.info('Transaction submitted. Waiting for confirmation...');
      await tx.wait();
      
      toast.success('Aave data updated successfully!');
      
      // Refresh data after update
      setTimeout(() => refreshTokenData(tokenAddress), 2000);
    } catch (error: any) {
      console.error('Error updating Aave data:', error);
      toast.error(`Failed to update Aave data: ${error.message}`);
    }
  };

  // Get optimal yield
  const getOptimalYield = async (tokenAddress: string): Promise<OptimalYieldData | null> => {
    if (!yieldHubContract) return null;

    try {
      const [protocol, apy, riskScore] = await yieldHubContract.getOptimalYield(tokenAddress);
      
      // Convert bytes32 protocol to string
      const protocolName = ethers.decodeBytes32String(protocol);
      
      return {
        protocol: protocolName,
        rawAPY: apy,
        apy: formatAPY(apy),
        riskScore: Number(riskScore),
      };
    } catch (error) {
      console.error('Error getting optimal yield:', error);
      return null;
    }
  };

  // Event handlers
  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else {
      setAccount(accounts[0]);
    }
  };

  const handleChainChanged = (chainId: string) => {
    const newChainId = parseInt(chainId, 16);
    setChainId(newChainId);
    
    if (newChainId === 43113 && provider) {
      setupContract(provider);
    } else {
      setYieldHubContract(null);
      toast.warn('Please switch to Fuji testnet for full functionality');
    }
  };

  const contextValue: Web3ContextType = {
    // Connection state
    account,
    isConnected,
    isConnecting,
    chainId,
    provider,
    yieldHubContract,
    
    // Token data
    supportedTokens,
    tokenYieldData,
    isLoadingData,
    
    // Functions
    connectWallet,
    disconnectWallet,
    switchToFuji,
    refreshTokenData,
    updateAaveData,
    getOptimalYield,
    
    // Auto-refresh
    autoRefresh,
    setAutoRefresh,
  };

  return (
    <Web3Context.Provider value={contextValue}>
      {children}
    </Web3Context.Provider>
  );
};

export default Web3Provider;