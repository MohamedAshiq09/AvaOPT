import { ethers, Contract, BrowserProvider } from 'ethers';
import { CONTRACT_CONFIG, TOKEN_INFO, YIELDHUB_ABI } from './web3-config';

// Yield optimizer data types
export interface YieldOpportunity {
  id: string;
  subnet: string;
  protocol: string;
  tokenAddress: string;
  tokenSymbol: string;
  apy: string;
  rawAPY: bigint;
  riskLevel: 'Low' | 'Medium' | 'High';
  riskScore: number;
  estimatedReturn: string;
  tvl: string;
  rawTVL: bigint;
  isActive: boolean;
  lastUpdate: number;
}

export interface OptimizationResult {
  recommendedOpportunities: YieldOpportunity[];
  totalEstimatedReturn: number;
  averageAPY: number;
  riskScore: number;
  diversificationScore: number;
}

export interface OptimizationParams {
  investmentAmount: number;
  riskTolerance: number; // 0-100
  timeHorizon: number; // days
  diversificationPreference: number; // 0-100
}

export class YieldOptimizerService {
  private provider: BrowserProvider | null = null;
  private yieldHubContract: Contract | null = null;

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

  // Get all available yield opportunities from contracts
  async getYieldOpportunities(): Promise<YieldOpportunity[]> {
    if (!this.yieldHubContract) return this.getMockOpportunities();

    try {
      const supportedTokens = Object.values(CONTRACT_CONFIG.TOKENS);
      const opportunities: YieldOpportunity[] = [];

      for (const tokenAddress of supportedTokens) {
        const tokenInfo = TOKEN_INFO[tokenAddress as keyof typeof TOKEN_INFO];
        if (!tokenInfo) continue;

        try {
          let apyBps, tvl, liquidityIndex, lastUpdate, optimizedAPY;
          
          try {
            // Get Aave data from YieldHub contract
            [apyBps, tvl, liquidityIndex, lastUpdate] = await this.yieldHubContract.getAaveDetails(tokenAddress);
            optimizedAPY = await this.yieldHubContract.calculateOptimizedAPY(tokenAddress);
          } catch (detailsError: any) {
            console.log(`getAaveDetails failed in YieldOptimizer for ${tokenAddress}, using individual methods:`, detailsError.message);
            
            // Fallback to individual methods (these work!)
            apyBps = await this.yieldHubContract.getAaveAPY(tokenAddress);
            tvl = await this.yieldHubContract.getAaveTVL(tokenAddress);
            liquidityIndex = BigInt(0);
            lastUpdate = BigInt(Math.floor(Date.now() / 1000));
            optimizedAPY = apyBps; // Use APY as optimized fallback
          }
          
          // Calculate risk score based on various factors
          const riskScore = this.calculateRiskScore(apyBps, tvl, tokenAddress);
          const riskLevel = this.getRiskLevel(riskScore);

          // Create Aave opportunity
          const aaveOpportunity: YieldOpportunity = {
            id: `aave-${tokenAddress}`,
            subnet: 'Avalanche Fuji',
            protocol: 'Aave V3',
            tokenAddress,
            tokenSymbol: tokenInfo.symbol,
            apy: this.formatAPY(apyBps),
            rawAPY: apyBps,
            riskLevel,
            riskScore,
            estimatedReturn: '$0', // Will be calculated based on investment amount
            tvl: this.formatTVL(tvl),
            rawTVL: tvl,
            isActive: true,
            lastUpdate: Number(lastUpdate),
          };

          opportunities.push(aaveOpportunity);

          // If we have optimized APY different from Aave APY, create optimized opportunity
          if (optimizedAPY > apyBps) {
            const optimizedRiskScore = this.calculateRiskScore(optimizedAPY, tvl, tokenAddress, true);
            const optimizedOpportunity: YieldOpportunity = {
              id: `optimized-${tokenAddress}`,
              subnet: 'Cross-Chain',
              protocol: 'SubnetYield Core',
              tokenAddress,
              tokenSymbol: tokenInfo.symbol,
              apy: this.formatAPY(optimizedAPY),
              rawAPY: optimizedAPY,
              riskLevel: this.getRiskLevel(optimizedRiskScore),
              riskScore: optimizedRiskScore,
              estimatedReturn: '$0',
              tvl: this.formatTVL(tvl),
              rawTVL: tvl,
              isActive: true,
              lastUpdate: Date.now(),
            };

            opportunities.push(optimizedOpportunity);
          }

        } catch (error) {
          console.warn(`Failed to fetch data for ${tokenInfo.symbol}:`, error);
        }
      }

      // Sort by APY descending
      opportunities.sort((a, b) => Number(b.rawAPY) - Number(a.rawAPY));

      return opportunities.length > 0 ? opportunities : this.getMockOpportunities();
    } catch (error) {
      console.error('Error fetching yield opportunities:', error);
      return this.getMockOpportunities();
    }
  }

  // Calculate risk score based on various factors
  private calculateRiskScore(
    apy: bigint, 
    tvl: bigint, 
    tokenAddress: string, 
    isOptimized: boolean = false
  ): number {
    let riskScore = 30; // Base risk score

    // APY risk factor
    const apyPercent = Number(apy) / 100;
    if (apyPercent > 20) {
      riskScore += 30; // Very high APY = higher risk
    } else if (apyPercent > 10) {
      riskScore += 20; // High APY = medium-high risk
    } else if (apyPercent > 5) {
      riskScore += 10; // Moderate APY = low-medium risk
    }

    // TVL risk factor (higher TVL = lower risk)
    const tvlUSD = Number(tvl) / 1e18;
    if (tvlUSD > 10000000) { // > $10M
      riskScore -= 15; // Large TVL = lower risk
    } else if (tvlUSD > 1000000) { // > $1M
      riskScore -= 10; // Medium TVL = slightly lower risk
    } else if (tvlUSD < 100000) { // < $100K
      riskScore += 15; // Low TVL = higher risk
    }

    // Token-specific risk factors
    const tokenInfo = TOKEN_INFO[tokenAddress as keyof typeof TOKEN_INFO];
    if (tokenInfo) {
      if (tokenInfo.symbol === 'WETH') {
        riskScore -= 5; // ETH is generally considered lower risk
      } else if (tokenInfo.symbol === 'WAVAX') {
        riskScore -= 3; // AVAX is native token, slightly lower risk
      }
    }

    // Optimized strategy risk adjustment
    if (isOptimized) {
      riskScore += 10; // Cross-chain optimization adds some risk
    }

    // Aave protocol risk adjustment
    riskScore -= 10; // Aave is a well-established protocol

    return Math.max(0, Math.min(100, riskScore));
  }

  // Convert risk score to risk level
  private getRiskLevel(riskScore: number): 'Low' | 'Medium' | 'High' {
    if (riskScore <= 30) return 'Low';
    if (riskScore <= 60) return 'Medium';
    return 'High';
  }

  // Optimize yield opportunities based on user parameters
  async optimizeYield(params: OptimizationParams): Promise<OptimizationResult> {
    const allOpportunities = await this.getYieldOpportunities();
    
    // Filter opportunities based on risk tolerance
    const filteredOpportunities = allOpportunities.filter(opp => {
      const riskThreshold = this.getRiskThreshold(params.riskTolerance);
      return opp.riskScore <= riskThreshold && opp.isActive;
    });

    // Calculate estimated returns for each opportunity
    const opportunitiesWithReturns = filteredOpportunities.map(opp => ({
      ...opp,
      estimatedReturn: this.calculateEstimatedReturn(
        params.investmentAmount,
        Number(opp.rawAPY) / 100,
        params.timeHorizon
      ),
    }));

    // Sort by risk-adjusted return
    const sortedOpportunities = opportunitiesWithReturns.sort((a, b) => {
      const aScore = this.calculateRiskAdjustedScore(a, params.riskTolerance);
      const bScore = this.calculateRiskAdjustedScore(b, params.riskTolerance);
      return bScore - aScore;
    });

    // Select top opportunities based on diversification preference
    const recommendedOpportunities = this.selectDiversifiedOpportunities(
      sortedOpportunities,
      params.diversificationPreference
    );

    // Calculate aggregate metrics
    const totalEstimatedReturn = recommendedOpportunities.reduce((sum, opp) => {
      return sum + parseFloat(opp.estimatedReturn.replace('$', '').replace(',', ''));
    }, 0);

    const averageAPY = recommendedOpportunities.reduce((sum, opp) => {
      return sum + (Number(opp.rawAPY) / 100);
    }, 0) / Math.max(recommendedOpportunities.length, 1);

    const averageRiskScore = recommendedOpportunities.reduce((sum, opp) => {
      return sum + opp.riskScore;
    }, 0) / Math.max(recommendedOpportunities.length, 1);

    const diversificationScore = this.calculateDiversificationScore(recommendedOpportunities);

    return {
      recommendedOpportunities,
      totalEstimatedReturn,
      averageAPY,
      riskScore: averageRiskScore,
      diversificationScore,
    };
  }

  // Calculate risk threshold based on user tolerance
  private getRiskThreshold(riskTolerance: number): number {
    // Convert 0-100 risk tolerance to risk score threshold
    if (riskTolerance <= 33) return 30; // Low risk tolerance
    if (riskTolerance <= 66) return 60; // Medium risk tolerance
    return 100; // High risk tolerance
  }

  // Calculate estimated return for a given investment
  private calculateEstimatedReturn(
    investmentAmount: number,
    apyDecimal: number,
    timeHorizonDays: number
  ): string {
    const annualReturn = investmentAmount * apyDecimal;
    const dailyReturn = annualReturn / 365;
    const estimatedReturn = dailyReturn * timeHorizonDays;
    
    return this.formatCurrency(estimatedReturn);
  }

  // Calculate risk-adjusted score for sorting
  private calculateRiskAdjustedScore(
    opportunity: YieldOpportunity,
    riskTolerance: number
  ): number {
    const apyScore = Number(opportunity.rawAPY) / 100;
    const riskPenalty = (opportunity.riskScore / 100) * (1 - riskTolerance / 100);
    return apyScore - riskPenalty;
  }

  // Select diversified opportunities
  private selectDiversifiedOpportunities(
    opportunities: YieldOpportunity[],
    diversificationPreference: number
  ): YieldOpportunity[] {
    if (diversificationPreference < 50) {
      // Low diversification - prefer top opportunities
      return opportunities.slice(0, 3);
    } else {
      // High diversification - select from different protocols/tokens
      const selected: YieldOpportunity[] = [];
      const usedProtocols = new Set<string>();
      const usedTokens = new Set<string>();

      for (const opp of opportunities) {
        if (selected.length >= 5) break;

        const protocolKey = `${opp.protocol}-${opp.tokenSymbol}`;
        if (diversificationPreference > 75) {
          // Very high diversification
          if (!usedProtocols.has(opp.protocol) && !usedTokens.has(opp.tokenSymbol)) {
            selected.push(opp);
            usedProtocols.add(opp.protocol);
            usedTokens.add(opp.tokenSymbol);
          }
        } else {
          // Medium diversification
          if (!usedProtocols.has(protocolKey)) {
            selected.push(opp);
            usedProtocols.add(protocolKey);
          }
        }
      }

      return selected.length > 0 ? selected : opportunities.slice(0, 3);
    }
  }

  // Calculate diversification score
  private calculateDiversificationScore(opportunities: YieldOpportunity[]): number {
    const uniqueProtocols = new Set(opportunities.map(opp => opp.protocol)).size;
    const uniqueTokens = new Set(opportunities.map(opp => opp.tokenSymbol)).size;
    const uniqueSubnets = new Set(opportunities.map(opp => opp.subnet)).size;

    // Score based on diversity (0-100)
    const protocolScore = Math.min(uniqueProtocols * 25, 50);
    const tokenScore = Math.min(uniqueTokens * 20, 30);
    const subnetScore = Math.min(uniqueSubnets * 10, 20);

    return protocolScore + tokenScore + subnetScore;
  }

  // Get mock opportunities for fallback
  private getMockOpportunities(): YieldOpportunity[] {
    return [
      {
        id: 'mock-aave-weth',
        subnet: 'Avalanche Fuji',
        protocol: 'Aave V3',
        tokenAddress: CONTRACT_CONFIG.TOKENS.WETH,
        tokenSymbol: 'WETH',
        apy: '8.5%',
        rawAPY: BigInt(850),
        riskLevel: 'Low',
        riskScore: 25,
        estimatedReturn: '$0',
        tvl: '$2.5M',
        rawTVL: BigInt('2500000000000000000000000'),
        isActive: true,
        lastUpdate: Date.now(),
      },
      {
        id: 'mock-optimized-wavax',
        subnet: 'Cross-Chain',
        protocol: 'SubnetYield Core',
        tokenAddress: CONTRACT_CONFIG.TOKENS.WAVAX,
        tokenSymbol: 'WAVAX',
        apy: '12.2%',
        rawAPY: BigInt(1220),
        riskLevel: 'Medium',
        riskScore: 45,
        estimatedReturn: '$0',
        tvl: '$1.8M',
        rawTVL: BigInt('1800000000000000000000000'),
        isActive: true,
        lastUpdate: Date.now(),
      },
      {
        id: 'mock-aave-usdc',
        subnet: 'Avalanche Fuji',
        protocol: 'Aave V3',
        tokenAddress: CONTRACT_CONFIG.TOKENS.USDC,
        tokenSymbol: 'USDC',
        apy: '6.8%',
        rawAPY: BigInt(680),
        riskLevel: 'Low',
        riskScore: 20,
        estimatedReturn: '$0',
        tvl: '$5.2M',
        rawTVL: BigInt('5200000000000000000000000'),
        isActive: true,
        lastUpdate: Date.now(),
      },
    ];
  }

  // Utility functions
  private formatAPY(apyBps: bigint): string {
    return `${(Number(apyBps) / 100).toFixed(1)}%`;
  }

  private formatTVL(tvl: bigint): string {
    const tvlNum = Number(tvl) / 1e18;
    if (tvlNum >= 1e9) return `$${(tvlNum / 1e9).toFixed(1)}B`;
    if (tvlNum >= 1e6) return `$${(tvlNum / 1e6).toFixed(1)}M`;
    if (tvlNum >= 1e3) return `$${(tvlNum / 1e3).toFixed(1)}K`;
    return `$${tvlNum.toFixed(0)}`;
  }

  private formatCurrency(amount: number): string {
    if (amount >= 1e6) {
      return `$${(amount / 1e6).toFixed(2)}M`;
    } else if (amount >= 1e3) {
      return `$${(amount / 1e3).toFixed(1)}K`;
    } else {
      return `$${amount.toFixed(0)}`;
    }
  }

  // Static utility functions
  static formatCurrency(amount: number): string {
    if (amount >= 1e6) {
      return `$${(amount / 1e6).toFixed(2)}M`;
    } else if (amount >= 1e3) {
      return `$${(amount / 1e3).toFixed(1)}K`;
    } else {
      return `$${amount.toFixed(0)}`;
    }
  }

  static getRiskLevelColor(riskLevel: 'Low' | 'Medium' | 'High'): string {
    switch (riskLevel) {
      case 'Low': return 'bg-[#00ffaa20] text-[#00ffaa] hover:bg-[#00ffaa30]';
      case 'Medium': return 'bg-[#ffff0020] text-[#ffff00] hover:bg-[#ffff0030]';
      case 'High': return 'bg-[#ff555520] text-[#ff5555] hover:bg-[#ff555530]';
      default: return 'bg-[#283039]';
    }
  }
}

export default YieldOptimizerService;