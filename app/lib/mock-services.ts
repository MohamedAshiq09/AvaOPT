// Mock Services for Development and Testing
// This file provides mock data when real services fail

export interface MockYieldData {
  apy: number;
  tvl: string;
  protocol: string;
  risk: 'low' | 'medium' | 'high';
  timestamp: number;
}

export interface MockPortfolioData {
  totalValue: string;
  totalYield: string;
  positions: Array<{
    token: string;
    amount: string;
    value: string;
    apy: number;
    protocol: string;
  }>;
}

export class MockAaveService {
  static async getYieldData(token: string): Promise<MockYieldData> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const mockData: Record<string, MockYieldData> = {
      'USDC': {
        apy: 4.25,
        tvl: '1,234,567,890',
        protocol: 'Aave V3',
        risk: 'low',
        timestamp: Date.now()
      },
      'WAVAX': {
        apy: 6.75,
        tvl: '987,654,321',
        protocol: 'Aave V3',
        risk: 'medium',
        timestamp: Date.now()
      },
      'USDT': {
        apy: 3.95,
        tvl: '2,345,678,901',
        protocol: 'Aave V3',
        risk: 'low',
        timestamp: Date.now()
      }
    };

    return mockData[token] || {
      apy: 5.50,
      tvl: '500,000,000',
      protocol: 'Aave V3',
      risk: 'medium',
      timestamp: Date.now()
    };
  }

  static async getAllTokensData(): Promise<Record<string, MockYieldData>> {
    const tokens = ['USDC', 'WAVAX', 'USDT'];
    const data: Record<string, MockYieldData> = {};
    
    for (const token of tokens) {
      data[token] = await this.getYieldData(token);
    }
    
    return data;
  }
}

export class MockSubnetService {
  static async getYieldData(token: string): Promise<MockYieldData> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const mockData: Record<string, MockYieldData> = {
      'USDC': {
        apy: 8.50,
        tvl: '45,678,901',
        protocol: 'DeFi Kingdoms',
        risk: 'high',
        timestamp: Date.now()
      },
      'WAVAX': {
        apy: 12.25,
        tvl: '23,456,789',
        protocol: 'DeFi Kingdoms',
        risk: 'high',
        timestamp: Date.now()
      },
      'USDT': {
        apy: 7.80,
        tvl: '67,890,123',
        protocol: 'DeFi Kingdoms',
        risk: 'high',
        timestamp: Date.now()
      }
    };

    return mockData[token] || {
      apy: 9.75,
      tvl: '30,000,000',
      protocol: 'DeFi Kingdoms',
      risk: 'high',
      timestamp: Date.now()
    };
  }

  static async requestCrossChainData(token: string): Promise<{ requestId: string; status: string }> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      requestId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'completed'
    };
  }
}

export class MockUniswapService {
  static async getTokenPrice(token: string): Promise<number> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const mockPrices: Record<string, number> = {
      'USDC': 1.00,
      'WAVAX': 42.50,
      'USDT': 0.99
    };

    return mockPrices[token] || 25.00;
  }

  static async getPoolData(tokenA: string, tokenB: string): Promise<{
    liquidity: string;
    volume24h: string;
    fee: number;
  }> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    return {
      liquidity: '1,234,567.89',
      volume24h: '987,654.32',
      fee: 0.3
    };
  }
}

export class MockPortfolioService {
  static async getPortfolioData(address: string): Promise<MockPortfolioData> {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    return {
      totalValue: '15,432.67',
      totalYield: '1,234.56',
      positions: [
        {
          token: 'USDC',
          amount: '5,000.00',
          value: '5,000.00',
          apy: 4.25,
          protocol: 'Aave V3'
        },
        {
          token: 'WAVAX',
          amount: '150.25',
          value: '6,385.63',
          apy: 6.75,
          protocol: 'Aave V3'
        },
        {
          token: 'USDT',
          amount: '4,047.04',
          value: '4,047.04',
          apy: 3.95,
          protocol: 'Aave V3'
        }
      ]
    };
  }

  static async getYieldHistory(address: string, days: number = 30): Promise<Array<{
    date: string;
    yield: number;
    apy: number;
  }>> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const history = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      history.push({
        date: date.toISOString().split('T')[0],
        yield: Math.random() * 100 + 50, // Random yield between 50-150
        apy: Math.random() * 5 + 3 // Random APY between 3-8%
      });
    }
    
    return history;
  }
}

export class MockWeb3Service {
  static async connectWallet(): Promise<{ address: string; chainId: number }> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      address: '0x742d35Cc6634C0532925a3b8D4C9db96590c6C87',
      chainId: 43113 // Fuji testnet
    };
  }

  static async getBalance(token: string, address: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const mockBalances: Record<string, string> = {
      'USDC': '2,500.00',
      'WAVAX': '75.5