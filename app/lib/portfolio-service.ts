import { ethers, Contract, BrowserProvider } from 'ethers';
import { CONTRACT_CONFIG, TOKEN_INFO } from './web3-config';

// Portfolio data types
export interface PortfolioPosition {
  tokenAddress: string;
  symbol: string;
  name: string;
  balance: bigint;
  balanceUSD: number;
  aaveSupplied: bigint;
  aaveSuppliedUSD: number;
  aaveBorrowed: bigint;
  aaveBorrowedUSD: number;
  currentAPY: number;
  earnedYield: number;
  lastUpdate: number;
}

export interface PortfolioSummary {
  totalValueUSD: number;
  totalSuppliedUSD: number;
  totalBorrowedUSD: number;
  totalEarnedYield: number;
  netWorth: number;
  healthFactor: number;
  positions: PortfolioPosition[];
  performanceHistory: PortfolioHistoryPoint[];
  lastUpdate: number;
}

export interface PortfolioHistoryPoint {
  timestamp: number;
  totalValueUSD: number;
  totalEarnedYield: number;
  date: string;
}

export interface PortfolioMetrics {
  totalValue: number;
  change24h: number;
  change7d: number;
  change30d: number;
  totalYieldEarned: number;
  averageAPY: number;
  riskScore: number;
}

// ERC20 ABI for balance checking
const ERC20_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Aave aToken ABI for supplied balance
const ATOKEN_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Simple price oracle interface (you can replace with real price feeds)
interface PriceOracle {
  getPrice(tokenAddress: string): Promise<number>;
}

class MockPriceOracle implements PriceOracle {
  private prices: Record<string, number> = {
    [CONTRACT_CONFIG.TOKENS.WETH]: 2000, // Mock ETH price
    [CONTRACT_CONFIG.TOKENS.WAVAX]: 25,  // Mock AVAX price
    [CONTRACT_CONFIG.TOKENS.USDC]: 1,    // Mock USDC price
  };

  async getPrice(tokenAddress: string): Promise<number> {
    // Add some realistic price variation
    const basePrice = this.prices[tokenAddress] || 1;
    const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
    return basePrice * (1 + variation);
  }
}

export class PortfolioService {
  private provider: BrowserProvider | null = null;
  private priceOracle: PriceOracle;
  private yieldHubContract: Contract | null = null;

  constructor(provider?: BrowserProvider) {
    this.priceOracle = new MockPriceOracle();
    if (provider) {
      this.setProvider(provider);
    }
  }

  setProvider(provider: BrowserProvider) {
    this.provider = provider;
    if (CONTRACT_CONFIG.YIELD_HUB_ADDRESS) {
      // Import the YieldHub ABI from web3-config
      const { YIELDHUB_ABI } = require('./web3-config');
      this.yieldHubContract = new Contract(
        CONTRACT_CONFIG.YIELD_HUB_ADDRESS,
        YIELDHUB_ABI,
        provider
      );
    }
  }

  // Get comprehensive portfolio data for a user
  async getPortfolioSummary(userAddress: string): Promise<PortfolioSummary | null> {
    if (!this.provider || !userAddress) return null;

    try {
      const supportedTokens = Object.values(CONTRACT_CONFIG.TOKENS);
      const positions: PortfolioPosition[] = [];
      let totalValueUSD = 0;
      let totalSuppliedUSD = 0;
      let totalBorrowedUSD = 0;
      let totalEarnedYield = 0;

      // Get positions for each supported token
      for (const tokenAddress of supportedTokens) {
        const position = await this.getTokenPosition(userAddress, tokenAddress);
        if (position) {
          positions.push(position);
          totalValueUSD += position.balanceUSD + position.aaveSuppliedUSD;
          totalSuppliedUSD += position.aaveSuppliedUSD;
          totalBorrowedUSD += position.aaveBorrowedUSD;
          totalEarnedYield += position.earnedYield;
        }
      }

      // Get user account data from Aave for health factor
      let healthFactor = 0;
      if (this.yieldHubContract) {
        try {
          // This would call your YieldHub contract to get user account data
          // For now, we'll use a mock value
          healthFactor = 2.5; // Mock healthy position
        } catch (error) {
          console.warn('Could not fetch health factor:', error);
        }
      }

      // Generate performance history (mock data for now)
      const performanceHistory = this.generatePerformanceHistory(totalValueUSD);

      return {
        totalValueUSD,
        totalSuppliedUSD,
        totalBorrowedUSD,
        totalEarnedYield,
        netWorth: totalValueUSD - totalBorrowedUSD,
        healthFactor,
        positions,
        performanceHistory,
        lastUpdate: Date.now(),
      };
    } catch (error) {
      console.error('Error fetching portfolio summary:', error);
      return null;
    }
  }

  // Get position data for a specific token
  private async getTokenPosition(
    userAddress: string, 
    tokenAddress: string
  ): Promise<PortfolioPosition | null> {
    if (!this.provider) return null;

    try {
      const tokenInfo = TOKEN_INFO[tokenAddress as keyof typeof TOKEN_INFO];
      if (!tokenInfo) return null;

      // Get token contract
      const tokenContract = new Contract(tokenAddress, ERC20_ABI, this.provider);
      
      // Get wallet balance
      const balance = await tokenContract.balanceOf(userAddress);
      
      // Get current price
      const price = await this.priceOracle.getPrice(tokenAddress);
      
      // Calculate USD values
      const balanceFormatted = Number(balance) / Math.pow(10, tokenInfo.decimals);
      const balanceUSD = balanceFormatted * price;

      // Get Aave position data (mock for now - you can integrate with your Aave adapter)
      const aaveSupplied = BigInt(0); // Would get from Aave
      const aaveBorrowed = BigInt(0); // Would get from Aave
      const aaveSuppliedUSD = 0; // Would calculate from Aave data
      const aaveBorrowedUSD = 0; // Would calculate from Aave data

      // Get current APY from your YieldHub contract
      let currentAPY = 0;
      if (this.yieldHubContract) {
        try {
          const apyBps = await this.yieldHubContract.getAaveAPY(tokenAddress);
          currentAPY = Number(apyBps) / 100; // Convert basis points to percentage
        } catch (error) {
          console.warn(`Could not fetch APY for ${tokenInfo.symbol}:`, error);
        }
      }

      // Calculate earned yield (mock calculation)
      const earnedYield = aaveSuppliedUSD * (currentAPY / 100) * (30 / 365); // 30-day yield

      // Only return position if user has balance or Aave position
      if (balance > 0 || aaveSupplied > 0 || aaveBorrowed > 0) {
        return {
          tokenAddress,
          symbol: tokenInfo.symbol,
          name: tokenInfo.name,
          balance,
          balanceUSD,
          aaveSupplied,
          aaveSuppliedUSD,
          aaveBorrowed,
          aaveBorrowedUSD,
          currentAPY,
          earnedYield,
          lastUpdate: Date.now(),
        };
      }

      return null;
    } catch (error) {
      console.error(`Error fetching position for ${tokenAddress}:`, error);
      return null;
    }
  }

  // Generate mock performance history (replace with real historical data)
  private generatePerformanceHistory(currentValue: number): PortfolioHistoryPoint[] {
    const history: PortfolioHistoryPoint[] = [];
    const days = 90; // 90 days of history
    const now = Date.now();

    for (let i = days; i >= 0; i--) {
      const timestamp = now - (i * 24 * 60 * 60 * 1000);
      const date = new Date(timestamp);
      
      // Generate realistic portfolio growth
      const daysFactor = (days - i) / days;
      const baseGrowth = 1 + (daysFactor * 0.085); // 8.5% growth over period
      const randomVariation = 1 + (Math.random() - 0.5) * 0.1; // ±5% daily variation
      
      const totalValueUSD = currentValue * baseGrowth * randomVariation;
      const totalEarnedYield = totalValueUSD * 0.05 * daysFactor; // 5% yield over period

      history.push({
        timestamp,
        totalValueUSD,
        totalEarnedYield,
        date: date.toISOString().split('T')[0], // YYYY-MM-DD format
      });
    }

    return history;
  }

  // Calculate portfolio metrics
  async getPortfolioMetrics(userAddress: string): Promise<PortfolioMetrics | null> {
    const summary = await this.getPortfolioSummary(userAddress);
    if (!summary) return null;

    const history = summary.performanceHistory;
    const currentValue = summary.totalValueUSD;

    // Calculate changes
    const change24h = this.calculateChange(history, 1);
    const change7d = this.calculateChange(history, 7);
    const change30d = this.calculateChange(history, 30);

    // Calculate average APY
    const totalSupplied = summary.totalSuppliedUSD;
    const weightedAPY = summary.positions.reduce((sum, pos) => {
      return sum + (pos.currentAPY * pos.aaveSuppliedUSD);
    }, 0);
    const averageAPY = totalSupplied > 0 ? weightedAPY / totalSupplied : 0;

    // Calculate risk score (simplified)
    const riskScore = this.calculateRiskScore(summary);

    return {
      totalValue: currentValue,
      change24h,
      change7d,
      change30d,
      totalYieldEarned: summary.totalEarnedYield,
      averageAPY,
      riskScore,
    };
  }

  private calculateChange(history: PortfolioHistoryPoint[], days: number): number {
    if (history.length < days + 1) return 0;

    const current = history[history.length - 1].totalValueUSD;
    const past = history[history.length - 1 - days].totalValueUSD;
    
    return past > 0 ? ((current - past) / past) * 100 : 0;
  }

  private calculateRiskScore(summary: PortfolioSummary): number {
    // Simple risk calculation based on health factor and diversification
    let riskScore = 50; // Base risk score

    // Health factor impact
    if (summary.healthFactor > 2) {
      riskScore -= 20; // Lower risk for healthy positions
    } else if (summary.healthFactor < 1.5) {
      riskScore += 30; // Higher risk for unhealthy positions
    }

    // Diversification impact
    const activePositions = summary.positions.filter(p => p.balanceUSD > 10);
    if (activePositions.length > 2) {
      riskScore -= 10; // Lower risk for diversified portfolio
    } else if (activePositions.length === 1) {
      riskScore += 15; // Higher risk for concentrated portfolio
    }

    // Leverage impact
    const leverageRatio = summary.totalBorrowedUSD / summary.totalSuppliedUSD;
    if (leverageRatio > 0.5) {
      riskScore += 20; // Higher risk for high leverage
    }

    return Math.max(0, Math.min(100, riskScore));
  }

  // Get chart data for portfolio visualization
  getChartData(history: PortfolioHistoryPoint[]): {
    labels: string[];
    values: number[];
    svgPath: string;
  } {
    const labels = history.slice(-30).map(point => {
      const date = new Date(point.timestamp);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const values = history.slice(-30).map(point => point.totalValueUSD);
    
    // Generate SVG path for the chart
    const svgPath = this.generateSVGPath(values);

    return { labels, values, svgPath };
  }

  private generateSVGPath(values: number[]): string {
    if (values.length === 0) return '';

    const width = 472;
    const height = 149;
    const padding = 10;

    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue || 1;

    let path = '';
    
    values.forEach((value, index) => {
      const x = (index / (values.length - 1)) * (width - 2 * padding) + padding;
      const y = height - padding - ((value - minValue) / valueRange) * (height - 2 * padding);
      
      if (index === 0) {
        path += `M${x} ${y}`;
      } else {
        path += `L${x} ${y}`;
      }
    });

    return path;
  }

  // Utility functions
  static formatCurrency(amount: number): string {
    if (amount >= 1e9) {
      return `$${(amount / 1e9).toFixed(2)}B`;
    } else if (amount >= 1e6) {
      return `$${(amount / 1e6).toFixed(2)}M`;
    } else if (amount >= 1e3) {
      return `$${(amount / 1e3).toFixed(2)}K`;
    } else {
      return `$${amount.toFixed(2)}`;
    }
  }

  static formatPercentage(percentage: number): string {
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(2)}%`;
  }

  static formatAPY(apy: number): string {
    return `${apy.toFixed(2)}%`;
  }
}

export default PortfolioService;