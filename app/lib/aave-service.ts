import { ethers, Contract, BrowserProvider } from 'ethers';
import { CONTRACT_CONFIG } from './web3-config';

// Enhanced Aave data types
export interface AaveReserveData {
  liquidityRate: bigint;
  variableBorrowRate: bigint;
  stableBorrowRate: bigint;
  totalAToken: bigint;
  totalStableDebt: bigint;
  totalVariableDebt: bigint;
  liquidityIndex: bigint;
  variableBorrowIndex: bigint;
  lastUpdateTimestamp: number;
  isActive: boolean;
  isFrozen: boolean;
  borrowingEnabled: boolean;
  stableBorrowRateEnabled: boolean;
  reserveFactor: bigint;
  ltv: bigint;
  liquidationThreshold: bigint;
  liquidationBonus: bigint;
}

export interface EnhancedAPYData {
  currentAPY: bigint;
  borrowAPY: bigint;
  utilizationRate: bigint;
  totalSupply: bigint;
  totalBorrow: bigint;
}

export interface UserAccountData {
  totalCollateralETH: bigint;
  totalDebtETH: bigint;
  availableBorrowsETH: bigint;
  currentLiquidationThreshold: bigint;
  ltv: bigint;
  healthFactor: bigint;
}

export interface RiskMetrics {
  riskScore: bigint;
  liquidityRisk: bigint;
  volatilityRisk: bigint;
  utilizationRisk: bigint;
}

export interface ProjectedEarnings {
  projectedEarnings: bigint;
  effectiveAPY: bigint;
}

// Aave V3 Adapter ABI (essential functions)
const AAVE_ADAPTER_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "token", "type": "address"}],
    "name": "getTokenReserveData",
    "outputs": [{
      "components": [
        {"internalType": "uint256", "name": "liquidityRate", "type": "uint256"},
        {"internalType": "uint256", "name": "variableBorrowRate", "type": "uint256"},
        {"internalType": "uint256", "name": "stableBorrowRate", "type": "uint256"},
        {"internalType": "uint256", "name": "totalAToken", "type": "uint256"},
        {"internalType": "uint256", "name": "totalStableDebt", "type": "uint256"},
        {"internalType": "uint256", "name": "totalVariableDebt", "type": "uint256"},
        {"internalType": "uint256", "name": "liquidityIndex", "type": "uint256"},
        {"internalType": "uint256", "name": "variableBorrowIndex", "type": "uint256"},
        {"internalType": "uint256", "name": "lastUpdateTimestamp", "type": "uint256"},
        {"internalType": "bool", "name": "isActive", "type": "bool"},
        {"internalType": "bool", "name": "isFrozen", "type": "bool"},
        {"internalType": "bool", "name": "borrowingEnabled", "type": "bool"},
        {"internalType": "bool", "name": "stableBorrowRateEnabled", "type": "bool"},
        {"internalType": "uint256", "name": "reserveFactor", "type": "uint256"},
        {"internalType": "uint256", "name": "ltv", "type": "uint256"},
        {"internalType": "uint256", "name": "liquidationThreshold", "type": "uint256"},
        {"internalType": "uint256", "name": "liquidationBonus", "type": "uint256"}
      ],
      "internalType": "struct AaveV3Adapter.TokenReserveData",
      "name": "reserveData",
      "type": "tuple"
    }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "token", "type": "address"}],
    "name": "getEnhancedAPYData",
    "outputs": [
      {"internalType": "uint256", "name": "currentAPY", "type": "uint256"},
      {"internalType": "uint256", "name": "borrowAPY", "type": "uint256"},
      {"internalType": "uint256", "name": "utilizationRate", "type": "uint256"},
      {"internalType": "uint256", "name": "totalSupply", "type": "uint256"},
      {"internalType": "uint256", "name": "totalBorrow", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "getUserAccountData",
    "outputs": [{
      "components": [
        {"internalType": "uint256", "name": "totalCollateralETH", "type": "uint256"},
        {"internalType": "uint256", "name": "totalDebtETH", "type": "uint256"},
        {"internalType": "uint256", "name": "availableBorrowsETH", "type": "uint256"},
        {"internalType": "uint256", "name": "currentLiquidationThreshold", "type": "uint256"},
        {"internalType": "uint256", "name": "ltv", "type": "uint256"},
        {"internalType": "uint256", "name": "healthFactor", "type": "uint256"}
      ],
      "internalType": "struct AaveV3Adapter.UserAccountData",
      "name": "accountData",
      "type": "tuple"
    }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "token", "type": "address"}],
    "name": "getRiskMetrics",
    "outputs": [
      {"internalType": "uint256", "name": "riskScore", "type": "uint256"},
      {"internalType": "uint256", "name": "liquidityRisk", "type": "uint256"},
      {"internalType": "uint256", "name": "volatilityRisk", "type": "uint256"},
      {"internalType": "uint256", "name": "utilizationRisk", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "token", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"},
      {"internalType": "uint256", "name": "timeHorizon", "type": "uint256"}
    ],
    "name": "calculateProjectedEarnings",
    "outputs": [
      {"internalType": "uint256", "name": "projectedEarnings", "type": "uint256"},
      {"internalType": "uint256", "name": "effectiveAPY", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "token", "type": "address"}],
    "name": "getTokenStatus",
    "outputs": [
      {"internalType": "bool", "name": "isSupported", "type": "bool"},
      {"internalType": "bool", "name": "isActive", "type": "bool"},
      {"internalType": "bool", "name": "isFrozen", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllReserveTokens",
    "outputs": [{"internalType": "address[]", "name": "tokens", "type": "address[]"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Aave V3 Adapter contract address (you'll need to deploy this)
const AAVE_ADAPTER_ADDRESS = '0x0000000000000000000000000000000000000000'; // TODO: Deploy and update

export class AaveService {
  private provider: BrowserProvider | null = null;
  private adapterContract: Contract | null = null;

  constructor(provider?: BrowserProvider) {
    if (provider) {
      this.setProvider(provider);
    }
  }

  setProvider(provider: BrowserProvider) {
    this.provider = provider;
    if (AAVE_ADAPTER_ADDRESS !== '0x0000000000000000000000000000000000000000') {
      this.adapterContract = new Contract(AAVE_ADAPTER_ADDRESS, AAVE_ADAPTER_ABI, provider);
    }
  }

  // Get comprehensive reserve data for a token
  async getTokenReserveData(tokenAddress: string): Promise<AaveReserveData | null> {
    if (!this.adapterContract) return null;

    try {
      const reserveData = await this.adapterContract.getTokenReserveData(tokenAddress);
      
      return {
        liquidityRate: reserveData.liquidityRate,
        variableBorrowRate: reserveData.variableBorrowRate,
        stableBorrowRate: reserveData.stableBorrowRate,
        totalAToken: reserveData.totalAToken,
        totalStableDebt: reserveData.totalStableDebt,
        totalVariableDebt: reserveData.totalVariableDebt,
        liquidityIndex: reserveData.liquidityIndex,
        variableBorrowIndex: reserveData.variableBorrowIndex,
        lastUpdateTimestamp: Number(reserveData.lastUpdateTimestamp),
        isActive: reserveData.isActive,
        isFrozen: reserveData.isFrozen,
        borrowingEnabled: reserveData.borrowingEnabled,
        stableBorrowRateEnabled: reserveData.stableBorrowRateEnabled,
        reserveFactor: reserveData.reserveFactor,
        ltv: reserveData.ltv,
        liquidationThreshold: reserveData.liquidationThreshold,
        liquidationBonus: reserveData.liquidationBonus,
      };
    } catch (error) {
      console.error('Error fetching reserve data:', error);
      return null;
    }
  }

  // Get enhanced APY data with utilization metrics
  async getEnhancedAPYData(tokenAddress: string): Promise<EnhancedAPYData | null> {
    if (!this.adapterContract) return null;

    try {
      const [currentAPY, borrowAPY, utilizationRate, totalSupply, totalBorrow] = 
        await this.adapterContract.getEnhancedAPYData(tokenAddress);
      
      return {
        currentAPY,
        borrowAPY,
        utilizationRate,
        totalSupply,
        totalBorrow,
      };
    } catch (error) {
      console.error('Error fetching enhanced APY data:', error);
      return null;
    }
  }

  // Get user account data for risk assessment
  async getUserAccountData(userAddress: string): Promise<UserAccountData | null> {
    if (!this.adapterContract) return null;

    try {
      const accountData = await this.adapterContract.getUserAccountData(userAddress);
      
      return {
        totalCollateralETH: accountData.totalCollateralETH,
        totalDebtETH: accountData.totalDebtETH,
        availableBorrowsETH: accountData.availableBorrowsETH,
        currentLiquidationThreshold: accountData.currentLiquidationThreshold,
        ltv: accountData.ltv,
        healthFactor: accountData.healthFactor,
      };
    } catch (error) {
      console.error('Error fetching user account data:', error);
      return null;
    }
  }

  // Get risk metrics for a token
  async getRiskMetrics(tokenAddress: string): Promise<RiskMetrics | null> {
    if (!this.adapterContract) return null;

    try {
      const [riskScore, liquidityRisk, volatilityRisk, utilizationRisk] = 
        await this.adapterContract.getRiskMetrics(tokenAddress);
      
      return {
        riskScore,
        liquidityRisk,
        volatilityRisk,
        utilizationRisk,
      };
    } catch (error) {
      console.error('Error fetching risk metrics:', error);
      return null;
    }
  }

  // Calculate projected earnings for a deposit
  async calculateProjectedEarnings(
    tokenAddress: string, 
    amount: bigint, 
    timeHorizonDays: number
  ): Promise<ProjectedEarnings | null> {
    if (!this.adapterContract) return null;

    try {
      const timeHorizonSeconds = timeHorizonDays * 24 * 60 * 60;
      const [projectedEarnings, effectiveAPY] = 
        await this.adapterContract.calculateProjectedEarnings(
          tokenAddress, 
          amount, 
          timeHorizonSeconds
        );
      
      return {
        projectedEarnings,
        effectiveAPY,
      };
    } catch (error) {
      console.error('Error calculating projected earnings:', error);
      return null;
    }
  }

  // Check token status in Aave
  async getTokenStatus(tokenAddress: string): Promise<{
    isSupported: boolean;
    isActive: boolean;
    isFrozen: boolean;
  } | null> {
    if (!this.adapterContract) return null;

    try {
      const [isSupported, isActive, isFrozen] = 
        await this.adapterContract.getTokenStatus(tokenAddress);
      
      return {
        isSupported,
        isActive,
        isFrozen,
      };
    } catch (error) {
      console.error('Error fetching token status:', error);
      return null;
    }
  }

  // Get all supported tokens in Aave
  async getAllReserveTokens(): Promise<string[]> {
    if (!this.adapterContract) return [];

    try {
      return await this.adapterContract.getAllReserveTokens();
    } catch (error) {
      console.error('Error fetching all reserve tokens:', error);
      return [];
    }
  }

  // Utility functions for formatting
  static formatAPY(apyBps: bigint): string {
    return `${(Number(apyBps) / 100).toFixed(2)}%`;
  }

  static formatTVL(tvl: bigint, decimals: number = 18): string {
    const tvlNum = Number(tvl) / Math.pow(10, decimals);
    
    if (tvlNum >= 1e9) {
      return `$${(tvlNum / 1e9).toFixed(2)}B`;
    } else if (tvlNum >= 1e6) {
      return `$${(tvlNum / 1e6).toFixed(2)}M`;
    } else if (tvlNum >= 1e3) {
      return `$${(tvlNum / 1e3).toFixed(2)}K`;
    } else {
      return `$${tvlNum.toFixed(2)}`;
    }
  }

  static formatHealthFactor(healthFactor: bigint): string {
    if (healthFactor === BigInt(2) ** BigInt(256) - BigInt(1)) {
      return '∞';
    }
    return (Number(healthFactor) / 1e18).toFixed(2);
  }

  static getRiskLevel(riskScore: bigint): {
    level: 'Low' | 'Medium' | 'High' | 'Very High';
    color: string;
  } {
    const score = Number(riskScore);
    
    if (score <= 20) {
      return { level: 'Low', color: 'text-green-400' };
    } else if (score <= 40) {
      return { level: 'Medium', color: 'text-yellow-400' };
    } else if (score <= 70) {
      return { level: 'High', color: 'text-orange-400' };
    } else {
      return { level: 'Very High', color: 'text-red-400' };
    }
  }

  static formatUtilization(utilizationRate: bigint): string {
    return `${(Number(utilizationRate) / 100).toFixed(1)}%`;
  }
}

export default AaveService;