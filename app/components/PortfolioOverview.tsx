'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  BarChart3, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Activity
} from 'lucide-react';
import { useWeb3 } from '../lib/Web3Context';
import PortfolioService, { 
  PortfolioSummary, 
  PortfolioMetrics, 
  PortfolioPosition 
} from '../lib/portfolio-service';

const PortfolioOverview: React.FC = () => {
  const { provider, account, isConnected, chainId } = useWeb3();
  const [portfolioService, setPortfolioService] = useState<PortfolioService | null>(null);
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null);
  const [portfolioMetrics, setPortfolioMetrics] = useState<PortfolioMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Initialize portfolio service
  useEffect(() => {
    if (provider && chainId === 43113) {
      const service = new PortfolioService(provider);
      setPortfolioService(service);
    } else {
      setPortfolioService(null);
    }
  }, [provider, chainId]);

  // Load portfolio data
  const loadPortfolioData = async () => {
    if (!portfolioService || !account) return;

    setIsLoading(true);
    setError(null);

    try {
      const [summary, metrics] = await Promise.all([
        portfolioService.getPortfolioSummary(account),
        portfolioService.getPortfolioMetrics(account)
      ]);

      setPortfolioSummary(summary);
      setPortfolioMetrics(metrics);
      setLastUpdate(new Date());
    } catch (err: any) {
      console.error('Error loading portfolio data:', err);
      setError(err.message || 'Failed to load portfolio data');
    } finally {
      setIsLoading(false);
    }
  };

  // Load data when service and account are ready
  useEffect(() => {
    if (portfolioService && account) {
      loadPortfolioData();
    }
  }, [portfolioService, account]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!portfolioService || !account) return;

    const interval = setInterval(loadPortfolioData, 60000);
    return () => clearInterval(interval);
  }, [portfolioService, account]);

  // Generate chart data
  const getChartData = () => {
    if (!portfolioSummary) return { svgPath: '', labels: [] };
    
    return portfolioService?.getChartData(portfolioSummary.performanceHistory) || {
      svgPath: '',
      labels: []
    };
  };

  const chartData = getChartData();

  // Get health factor color
  const getHealthFactorColor = (healthFactor: number) => {
    if (healthFactor >= 2) return 'text-green-400';
    if (healthFactor >= 1.5) return 'text-yellow-400';
    if (healthFactor >= 1.1) return 'text-orange-400';
    return 'text-red-400';
  };

  const getHealthFactorStatus = (healthFactor: number) => {
    if (healthFactor >= 2) return { text: 'Healthy', icon: CheckCircle };
    if (healthFactor >= 1.5) return { text: 'Good', icon: CheckCircle };
    if (healthFactor >= 1.1) return { text: 'Caution', icon: AlertTriangle };
    return { text: 'Risk', icon: AlertTriangle };
  };

  // Format functions
  const formatCurrency = (amount: number) => PortfolioService.formatCurrency(amount);
  const formatPercentage = (percentage: number) => PortfolioService.formatPercentage(percentage);

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-white text-xl md:text-[22px] font-bold leading-tight tracking-[-0.015em]">
            Portfolio Overview
            <span className="block h-0.5 w-0 bg-[#00ffaa] transition-all duration-500 group-hover:w-16 mt-1"></span>
          </h2>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
            isConnected && account && chainId === 43113
              ? 'bg-green-900/30 text-green-400'
              : 'bg-red-900/30 text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isConnected && account && chainId === 43113 ? 'bg-green-400' : 'bg-red-400'
            }`} />
            {isConnected && account && chainId === 43113 ? 'Live Data' : 'Connect Wallet'}
          </div>
          
          {/* Refresh Button */}
          <button
            onClick={loadPortfolioData}
            disabled={isLoading || !portfolioService}
            className="flex items-center gap-2 px-3 py-1 bg-[#283039] hover:bg-[#374151] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Connection Warning */}
      {(!isConnected || !account || chainId !== 43113) && (
        <div className="flex items-center gap-2 p-3 bg-orange-900/20 border border-orange-600 rounded-lg mb-4">
          <AlertTriangle className="w-4 h-4 text-orange-400" />
          <span className="text-orange-400 text-sm font-medium">
            {!isConnected 
              ? 'Connect your wallet to view portfolio data' 
              : !account
              ? 'Wallet connection required'
              : 'Switch to Fuji testnet for live portfolio tracking'}
          </span>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-600 rounded-lg mb-4">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-red-400 text-sm font-medium">{error}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        {/* Main Portfolio Card */}
        <div className="flex min-w-72 flex-1 flex-col gap-2 rounded-lg border border-[#2a2a2a] p-6 bg-[#111418] hover:border-[#00ffaa] transition-all duration-300">
          {/* Portfolio Value Header */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-[#aaa] text-base font-medium leading-normal">Portfolio Value Over Time</p>
            {lastUpdate && (
              <div className="flex items-center gap-1 text-xs text-[#777]">
                <Activity className="w-3 h-3" />
                <span>{lastUpdate.toLocaleTimeString()}</span>
              </div>
            )}
          </div>

          {/* Total Value */}
          <div className="flex items-baseline gap-3 mb-2">
            <p className="text-white tracking-light text-2xl md:text-[32px] font-bold leading-tight">
              {isLoading ? (
                <div className="animate-pulse bg-[#283039] rounded h-8 w-32"></div>
              ) : portfolioSummary ? (
                formatCurrency(portfolioSummary.totalValueUSD)
              ) : (
                '$0.00'
              )}
            </p>
            
            {portfolioMetrics && (
              <div className="flex items-center gap-1">
                {portfolioMetrics.change30d >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-[#00ffaa]" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-[#ff5555]" />
                )}
                <p className={`text-base font-medium leading-normal ${
                  portfolioMetrics.change30d >= 0 ? 'text-[#00ffaa]' : 'text-[#ff5555]'
                }`}>
                  {formatPercentage(portfolioMetrics.change30d)}
                </p>
              </div>
            )}
          </div>

          {/* Period Performance */}
          <div className="flex gap-4 mb-4">
            <div className="text-[#777] text-sm">
              <span>Last 90 Days</span>
            </div>
            {portfolioMetrics && (
              <>
                <div className="text-[#777] text-sm">
                  <span>24h: </span>
                  <span className={portfolioMetrics.change24h >= 0 ? 'text-[#00ffaa]' : 'text-[#ff5555]'}>
                    {formatPercentage(portfolioMetrics.change24h)}
                  </span>
                </div>
                <div className="text-[#777] text-sm">
                  <span>7d: </span>
                  <span className={portfolioMetrics.change7d >= 0 ? 'text-[#00ffaa]' : 'text-[#ff5555]'}>
                    {formatPercentage(portfolioMetrics.change7d)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Chart */}
          <div className="flex min-h-[180px] flex-1 flex-col gap-8 py-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-[148px]">
                <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
              </div>
            ) : chartData.svgPath ? (
              <svg
                width="100%"
                height="148"
                viewBox="-3 0 478 150"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
                className="group-hover:[&_path]:stroke-[#00ffaa] transition-all duration-500"
              >
                <defs>
                  <linearGradient id="portfolioGradient" x1="236" y1="1" x2="236" y2="149" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#111418" />
                    <stop offset="1" stopColor="#00ffaa" stopOpacity="0.1" />
                  </linearGradient>
                </defs>
                <path
                  d={`${chartData.svgPath}V149H0V109Z`}
                  fill="url(#portfolioGradient)"
                  className="transition-all duration-500 group-hover:opacity-80"
                />
                <path
                  d={chartData.svgPath}
                  stroke="#777"
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                  className="transition-all duration-500"
                />
              </svg>
            ) : (
              // Fallback to original static chart
              <svg
                width="100%"
                height="148"
                viewBox="-3 0 478 150"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
                className="group-hover:[&_path]:stroke-[#00ffaa] transition-all duration-500"
              >
                <path
                  d="M0 109C18.1538 109 18.1538 21 36.3077 21C54.4615 21 54.4615 41 72.6154 41C90.7692 41 90.7692 93 108.923 93C127.077 93 127.077 33 145.231 33C163.385 33 163.385 101 181.538 101C199.692 101 199.692 61 217.846 61C236 61 236 45 254.154 45C272.308 45 272.308 121 290.462 121C308.615 121 308.615 149 326.769 149C344.923 149 344.923 1 363.077 1C381.231 1 381.231 81 399.385 81C417.538 81 417.538 129 435.692 129C453.846 129 453.846 25 472 25V149H326.769H0V109Z"
                  fill="url(#paint0_linear_1131_5935)"
                  className="transition-all duration-500 group-hover:opacity-80"
                />
                <path
                  d="M0 109C18.1538 109 18.1538 21 36.3077 21C54.4615 21 54.4615 41 72.6154 41C90.7692 41 90.7692 93 108.923 93C127.077 93 127.077 33 145.231 33C163.385 33 163.385 101 181.538 101C199.692 101 199.692 61 217.846 61C236 61 236 45 254.154 45C272.308 45 272.308 121 290.462 121C308.615 121 308.615 149 326.769 149C344.923 149 344.923 1 363.077 1C381.231 1 381.231 81 399.385 81C417.538 81 417.538 129 435.692 129C453.846 129 453.846 25 472 25"
                  stroke="#777"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
                <defs>
                  <linearGradient id="paint0_linear_1131_5935" x1="236" y1="1" x2="236" y2="149" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#111418" />
                    <stop offset="1" stopColor="#00ffaa" stopOpacity="0.1" />
                  </linearGradient>
                </defs>
              </svg>
            )}
            
            {/* Chart Labels */}
            <div className="flex justify-around">
              {chartData.labels.length > 0 ? (
                chartData.labels.slice(-6).map((label, index) => (
                  <p 
                    key={index} 
                    className="text-[#777] text-xs md:text-[13px] font-bold leading-normal tracking-[0.015em] group-hover:text-[#00ffaa] transition-colors duration-300"
                  >
                    {label}
                  </p>
                ))
              ) : (
                ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month) => (
                  <p 
                    key={month} 
                    className="text-[#777] text-xs md:text-[13px] font-bold leading-normal tracking-[0.015em] group-hover:text-[#00ffaa] transition-colors duration-300"
                  >
                    {month}
                  </p>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Portfolio Metrics Sidebar */}
        {portfolioSummary && portfolioMetrics && (
          <div className="flex flex-col gap-4 min-w-[280px]">
            {/* Portfolio Stats */}
            <div className="rounded-lg border border-[#2a2a2a] p-4 bg-[#111418] hover:border-[#00ffaa] transition-all duration-300">
              <h3 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
                <PieChart className="w-4 h-4" />
                Portfolio Stats
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[#777] text-sm">Net Worth:</span>
                  <span className="text-white font-medium">
                    {formatCurrency(portfolioSummary.netWorth)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-[#777] text-sm">Total Supplied:</span>
                  <span className="text-green-400 font-medium">
                    {formatCurrency(portfolioSummary.totalSuppliedUSD)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-[#777] text-sm">Total Borrowed:</span>
                  <span className="text-red-400 font-medium">
                    {formatCurrency(portfolioSummary.totalBorrowedUSD)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-[#777] text-sm">Yield Earned:</span>
                  <span className="text-[#00ffaa] font-medium">
                    {formatCurrency(portfolioSummary.totalEarnedYield)}
                  </span>
                </div>
              </div>
            </div>

            {/* Health & Risk */}
            <div className="rounded-lg border border-[#2a2a2a] p-4 bg-[#111418] hover:border-[#00ffaa] transition-all duration-300">
              <h3 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Health & Risk
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[#777] text-sm">Health Factor:</span>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const status = getHealthFactorStatus(portfolioSummary.healthFactor);
                      const Icon = status.icon;
                      return (
                        <>
                          <Icon className="w-3 h-3 text-[#777]" />
                          <span className={`font-medium ${getHealthFactorColor(portfolioSummary.healthFactor)}`}>
                            {portfolioSummary.healthFactor.toFixed(2)}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-[#777] text-sm">Risk Score:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-[#283039] rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          portfolioMetrics.riskScore <= 30 ? 'bg-green-400' :
                          portfolioMetrics.riskScore <= 60 ? 'bg-yellow-400' : 'bg-red-400'
                        }`}
                        style={{ width: `${portfolioMetrics.riskScore}%` }}
                      />
                    </div>
                    <span className="text-white text-sm font-medium">
                      {portfolioMetrics.riskScore.toFixed(0)}
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-[#777] text-sm">Avg APY:</span>
                  <span className="text-[#00ffaa] font-medium">
                    {portfolioMetrics.averageAPY.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortfolioOverview;