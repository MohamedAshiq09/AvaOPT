import { ethers, Contract, BrowserProvider } from 'ethers';
import { CONTRACT_CONFIG, YIELDHUB_ABI } from './web3-config';

// Subnet data types
export interface SubnetYieldData {
  tokenAddress: string;
  tokenSymbol: string;
  subnetAPY: bigint;
  subnetAPYFormatted: string;
  aaveAPY: bigint;
  aaveAPYFormatted: string;
  optimizedAPY: bigint;
  optimizedAPYFormatted: string;
  subnetTVL: bigint;
  subnetTVLFormatted: string;
  protocolName: string;
  lastUpdate: number;
  isSubnetDataFresh: boolean;
  requestId?: string;
  requestStatus: 'pending' | 'completed' | 'failed' | 'none';
}

export interface SubnetRequestStatus {
  requestId: string;
  tokenAddress: string;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
  response?: {
    apyBps: bigint;
    tvl: bigint;
    protocol: string;
    timestamp: number;
  };
}

export interface CrossChainYieldComparison {
  tokenAddress: string;
  tokenSymbol: string;
  cChainAPY: number;
  subnetAPY: number;
  optimizedAPY: number;
  yieldDifference: number;
  recommendedChain: 'C-Chain' | 'Subnet' | 'Optimized';
  riskAssessment: 'Low' | 'Medium' | 'High';
}

// Subnet configuration
const SUBNET_CONFIG = {
  // YieldScout contract address from deployment
  YIELD_SCOUT_ADDRESS: '0x19899f97bE6d982C14089e7608AC8e8208FbA0d5',
  // Mock protocol address
  MOCK_PROTOCOL_ADDRESS: '0xB0D8385Ed3bFE999d3F10Fa0CBcAf8545EF58953',
  // Teleporter messenger
  TELEPORTER_MESSENGER: '0x253b2784c75e510dD0fF1da844684a1aC0aa5fcf',
  // Destination chain ID for AWM (this would be the subnet chain ID)
  DEST_CHAIN_ID: '0x9f3be606497285d0ffbb5ac9ba24aa60346a9b1812479ed66cb329f394a4b1c7', // Example subnet chain ID
  // Supported tokens (from YieldHub contract)
  SUPPORTED_TOKENS: [
    '0xd00ae08403B9bbb9124bB305C09058E32C39A48c', // WAVAX
    '0x28A8E6e41F84e62284970E4bc0867cEe2AAd0DA4', // WETH
    '0x407287b03D1167593AF113d32093942be13A535f', // USDT
    '0xD90db1ca5A6e9873BCD9B0279AE038272b656728', // USDC.e
    '0x3E937B4881CBd500d05EeDAB7BA203f2b7B3f74f', // DAI
    '0xFc7215C9498Fc12b22Bc0ed335871Db4315f03d3'  // LINK
  ]
};

export class SubnetService {
  private provider: BrowserProvider | null = null;
  private yieldHubContract: Contract | null = null;
  private pendingRequests: Map<string, SubnetRequestStatus> = new Map();

  constructor(provider?: BrowserProvider) {
    if (provider) {
      this.setProvider(provider);
    }
  }

  setProvider(provider: BrowserProvider) {
    this.provider = provider;
    if (CONTRACT_CONFIG.YIELD_HUB_ADDRESS) {
      this.yieldHubContract = new Contract(
        CONTRACT_CONFIG.YIELD_HUB_ADDRESS,
        YIELDHUB_ABI,
        provider
      );
    }
  }

  // Request subnet yield data via AWM
  async requestSubnetYield(tokenAddress: string): Promise<string | null> {
    if (!this.yieldHubContract || !this.provider) {
      throw new Error('Contract not initialized');
    }

    try {
      // For now, simulate the AWM request since the contract method isn't deployed yet
      console.log('Simulating AWM request for token:', tokenAddress);
      
      const requestId = ethers.keccak256(ethers.toUtf8Bytes(tokenAddress + Date.now()));
      
      // Track the simulated request
      this.pendingRequests.set(requestId, {
        requestId,
        tokenAddress,
        timestamp: Date.now(),
        status: 'pending'
      });

      // Simulate processing delay
      setTimeout(() => {
        const request = this.pendingRequests.get(requestId);
        if (request) {
          request.status = 'completed';
          this.pendingRequests.set(requestId, request);
        }
      }, 5000);

      return requestId;
    } catch (error: any) {
      console.error('Error requesting subnet yield:', error);
      throw new Error(`Failed to request subnet yield: ${error.message}`);
    }
  }

  // Get comprehensive yield data including subnet data
  async getComprehensiveYieldData(tokenAddress: string): Promise<SubnetYieldData | null> {
    if (!this.yieldHubContract) return null;

    try {
      let apyBps, tvl, liquidityIndex, lastUpdate, optimizedAPY;
      
      try {
        // Try to get Aave data from YieldHub
        [apyBps, tvl, liquidityIndex, lastUpdate] = await this.yieldHubContract.getAaveDetails(tokenAddress);
        optimizedAPY = await this.yieldHubContract.calculateOptimizedAPY(tokenAddress);
      } catch (detailsError: any) {
        console.log(`getAaveDetails failed in SubnetService for ${tokenAddress}, using individual methods:`, detailsError.message);
        
        // Fallback to individual methods (these work!)
        apyBps = await this.yieldHubContract.getAaveAPY(tokenAddress);
        tvl = await this.yieldHubContract.getAaveTVL(tokenAddress);
        liquidityIndex = BigInt(0);
        lastUpdate = BigInt(Math.floor(Date.now() / 1000));
        optimizedAPY = apyBps; // Use APY as optimized fallback
      }
      
      // Get token info
      const tokenInfo = this.getTokenInfo(tokenAddress);
      
      // For now, simulate subnet data since AWM integration is not fully deployed
      const simulatedSubnetData = await this.getSimulatedSubnetData(tokenAddress);
      
      return {
        tokenAddress,
        tokenSymbol: tokenInfo.symbol,
        subnetAPY: simulatedSubnetData.subnetAPY,
        subnetAPYFormatted: simulatedSubnetData.subnetAPYFormatted,
        aaveAPY: apyBps,
        aaveAPYFormatted: this.formatAPY(apyBps),
        optimizedAPY: optimizedAPY,
        optimizedAPYFormatted: this.formatAPY(optimizedAPY),
        subnetTVL: simulatedSubnetData.subnetTVL,
        subnetTVLFormatted: simulatedSubnetData.subnetTVLFormatted,
        protocolName: simulatedSubnetData.protocolName,
        lastUpdate: Number(lastUpdate),
        isSubnetDataFresh: this.isDataFresh(Number(lastUpdate)),
        requestStatus: 'completed'
      };
    } catch (error) {
      console.error('Error fetching comprehensive yield data:', error);
      // Fallback to fully simulated data
      return await this.getSimulatedSubnetData(tokenAddress);
    }
  }

  // Get yield comparison across chains
  async getYieldComparison(tokenAddress: string): Promise<CrossChainYieldComparison | null> {
    const yieldData = await this.getComprehensiveYieldData(tokenAddress);
    if (!yieldData) return null;

    const cChainAPY = Number(yieldData.aaveAPY) / 100;
    const subnetAPY = Number(yieldData.subnetAPY) / 100;
    const optimizedAPY = Number(yieldData.optimizedAPY) / 100;

    const yieldDifference = subnetAPY - cChainAPY;
    
    let recommendedChain: 'C-Chain' | 'Subnet' | 'Optimized' = 'C-Chain';
    if (optimizedAPY > Math.max(cChainAPY, subnetAPY)) {
      recommendedChain = 'Optimized';
    } else if (subnetAPY > cChainAPY * 1.1) { // 10% threshold
      recommendedChain = 'Subnet';
    }

    const riskAssessment = this.assessRisk(cChainAPY, subnetAPY, yieldData.isSubnetDataFresh);

    return {
      tokenAddress,
      tokenSymbol: yieldData.tokenSymbol,
      cChainAPY,
      subnetAPY,
      optimizedAPY,
      yieldDifference,
      recommendedChain,
      riskAssessment
    };
  }

  // Get all supported tokens yield data
  async getAllYieldData(): Promise<SubnetYieldData[]> {
    const results: SubnetYieldData[] = [];
    
    for (const tokenAddress of SUBNET_CONFIG.SUPPORTED_TOKENS) {
      try {
        const yieldData = await this.getComprehensiveYieldData(tokenAddress);
        if (yieldData) {
          results.push(yieldData);
        }
      } catch (error) {
        console.warn(`Failed to fetch data for token ${tokenAddress}:`, error);
      }
    }

    return results;
  }

  // Check request status
  getRequestStatus(requestId: string): SubnetRequestStatus | null {
    return this.pendingRequests.get(requestId) || null;
  }

  // Get all pending requests
  getPendingRequests(): SubnetRequestStatus[] {
    return Array.from(this.pendingRequests.values()).filter(req => req.status === 'pending');
  }

  // Simulate subnet data for demo purposes (fallback when AWM is not working)
  async getSimulatedSubnetData(tokenAddress: string): Promise<SubnetYieldData> {
    const tokenInfo = this.getTokenInfo(tokenAddress);
    
    // Simulate higher APY on subnet
    const baseAPY = 500 + Math.floor(Math.random() * 800); // 5-13% APY
    const subnetBonus = 200 + Math.floor(Math.random() * 400); // 2-6% bonus
    const subnetAPY = BigInt(baseAPY + subnetBonus);
    const aaveAPY = BigInt(baseAPY);
    const optimizedAPY = (BigInt(baseAPY) + subnetAPY) / BigInt(2); // Weighted average

    // Simulate TVL
    const baseTVL = BigInt('1000000000000000000000000'); // 1M base
    const randomMultiplier = BigInt(Math.floor(Math.random() * 5) + 1);
    const subnetTVL = baseTVL * randomMultiplier;

    return {
      tokenAddress,
      tokenSymbol: tokenInfo.symbol,
      subnetAPY,
      subnetAPYFormatted: this.formatAPY(subnetAPY),
      aaveAPY,
      aaveAPYFormatted: this.formatAPY(aaveAPY),
      optimizedAPY,
      optimizedAPYFormatted: this.formatAPY(optimizedAPY),
      subnetTVL,
      subnetTVLFormatted: this.formatTVL(subnetTVL),
      protocolName: 'SubnetDEX',
      lastUpdate: Date.now(),
      isSubnetDataFresh: true,
      requestStatus: 'completed'
    };
  }

  // Check if subnet is available and working
  async checkSubnetAvailability(): Promise<{
    isAvailable: boolean;
    lastSuccessfulRequest?: number;
    error?: string;
  }> {
    try {
      if (!this.yieldHubContract) {
        return { isAvailable: false, error: 'Contract not initialized' };
      }

      // Check if destination subnet is configured
      const destChainId = await this.yieldHubContract.destChainId();
      const destReceiver = await this.yieldHubContract.destReceiver();
      
      if (destChainId === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        return { isAvailable: false, error: 'Subnet not configured' };
      }

      // Check for recent successful requests
      const recentRequests = Array.from(this.pendingRequests.values())
        .filter(req => req.status === 'completed' && Date.now() - req.timestamp < 300000); // 5 minutes

      return {
        isAvailable: true,
        lastSuccessfulRequest: recentRequests.length > 0 ? 
          Math.max(...recentRequests.map(req => req.timestamp)) : undefined
      };
    } catch (error: any) {
      return { isAvailable: false, error: error.message };
    }
  }

  // Utility functions
  private extractRequestIdFromReceipt(receipt: any): string | null {
    try {
      // Look for SubnetRequest event
      const event = receipt.logs.find((log: any) => 
        log.topics && log.topics[0] && log.topics[0].includes('SubnetRequest')
      );
      
      if (event && event.topics[1]) {
        return event.topics[1]; // Request ID is typically the first indexed parameter
      }
      
      // Fallback: generate request ID from transaction hash
      return ethers.keccak256(ethers.toUtf8Bytes(receipt.hash + Date.now()));
    } catch (error) {
      console.warn('Could not extract request ID:', error);
      return null;
    }
  }

  private isDataFresh(timestamp: number): boolean {
    const FRESHNESS_THRESHOLD = 300000; // 5 minutes
    return Date.now() - timestamp < FRESHNESS_THRESHOLD;
  }

  private getTokenInfo(tokenAddress: string): { symbol: string; name: string } {
    const tokenMap: Record<string, { symbol: string; name: string }> = {
      '0xd00ae08403B9bbb9124bB305C09058E32C39A48c': { symbol: 'WAVAX', name: 'Wrapped AVAX' },
      '0x28A8E6e41F84e62284970E4bc0867cEe2AAd0DA4': { symbol: 'WETH', name: 'Wrapped Ether' },
      '0x407287b03D1167593AF113d32093942be13A535f': { symbol: 'USDT', name: 'Tether USD' },
      '0xD90db1ca5A6e9873BCD9B0279AE038272b656728': { symbol: 'USDC.e', name: 'Bridged USDC' },
      '0x3E937B4881CBd500d05EeDAB7BA203f2b7B3f74f': { symbol: 'DAI', name: 'Dai Stablecoin' },
      '0xFc7215C9498Fc12b22Bc0ed335871Db4315f03d3': { symbol: 'LINK', name: 'Chainlink Token' },
    };
    
    return tokenMap[tokenAddress] || { symbol: 'UNKNOWN', name: 'Unknown Token' };
  }

  private decodeProtocolName(protocolBytes: string): string {
    try {
      return ethers.decodeBytes32String(protocolBytes);
    } catch {
      return 'SubnetDEX';
    }
  }

  private assessRisk(cChainAPY: number, subnetAPY: number, isDataFresh: boolean): 'Low' | 'Medium' | 'High' {
    if (!isDataFresh) return 'High';
    
    const yieldDiff = Math.abs(subnetAPY - cChainAPY);
    if (yieldDiff > 10) return 'High';
    if (yieldDiff > 5) return 'Medium';
    return 'Low';
  }

  private formatAPY(apyBps: bigint): string {
    return `${(Number(apyBps) / 100).toFixed(2)}%`;
  }

  private formatTVL(tvl: bigint): string {
    const tvlNum = Number(tvl) / 1e18;
    if (tvlNum >= 1e9) return `$${(tvlNum / 1e9).toFixed(2)}B`;
    if (tvlNum >= 1e6) return `$${(tvlNum / 1e6).toFixed(2)}M`;
    if (tvlNum >= 1e3) return `$${(tvlNum / 1e3).toFixed(2)}K`;
    return `$${tvlNum.toFixed(2)}`;
  }

  // Static utility functions
  static formatAPY(apyBps: bigint): string {
    return `${(Number(apyBps) / 100).toFixed(2)}%`;
  }

  static formatTVL(tvl: bigint): string {
    const tvlNum = Number(tvl) / 1e18;
    if (tvlNum >= 1e9) return `$${(tvlNum / 1e9).toFixed(2)}B`;
    if (tvlNum >= 1e6) return `$${(tvlNum / 1e6).toFixed(2)}M`;
    if (tvlNum >= 1e3) return `$${(tvlNum / 1e3).toFixed(2)}K`;
    return `$${tvlNum.toFixed(2)}`;
  }

  static getRecommendationColor(recommendation: string): string {
    switch (recommendation) {
      case 'Optimized': return 'text-purple-400';
      case 'Subnet': return 'text-blue-400';
      case 'C-Chain': return 'text-green-400';
      default: return 'text-white';
    }
  }

  static getRiskColor(risk: string): string {
    switch (risk) {
      case 'Low': return 'text-green-400';
      case 'Medium': return 'text-yellow-400';
      case 'High': return 'text-red-400';
      default: return 'text-white';
    }
  }
}

export default SubnetService;