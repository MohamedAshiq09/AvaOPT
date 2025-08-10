'use client';

import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, AlertTriangle, TrendingUp, Zap, Target } from 'lucide-react';
import Navbar from '../Navbar';
import { useWeb3 } from '../lib/Web3Context';
import YieldOptimizerService, {
  YieldOpportunity,
  OptimizationResult,
  OptimizationParams
} from '../lib/yield-optimizer-service';
import SubnetService, { SubnetYieldData } from '../lib/subnet-service';

// YieldOpportunity interface is now imported from the service

const SubnetYieldCore: React.FC = () => {
  const { provider, account, isConnected, chainId } = useWeb3();
  const [investmentAmount, setInvestmentAmount] = useState<string>('10000');
  const [riskTolerance, setRiskTolerance] = useState<number>(32);
  const [isClient, setIsClient] = useState(false);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Backend integration state
  const [optimizerService, setOptimizerService] = useState<YieldOptimizerService | null>(null);
  const [subnetService, setSubnetService] = useState<SubnetService | null>(null);
  const [yieldOpportunities, setYieldOpportunities] = useState<YieldOpportunity[]>([]);
  const [subnetYieldData, setSubnetYieldData] = useState<SubnetYieldData[]>([]);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Initialize services
  useEffect(() => {
    if (provider && chainId === 43113) {
      const optimizerSvc = new YieldOptimizerService(provider);
      const subnetSvc = new SubnetService(provider);
      setOptimizerService(optimizerSvc);
      setSubnetService(subnetSvc);
    } else {
      setOptimizerService(null);
      setSubnetService(null);
    }
  }, [provider, chainId]);

  // Load yield opportunities
  const loadYieldOpportunities = async () => {
    if (!optimizerService) return;

    setIsLoading(true);
    setError(null);

    try {
      // Load both Aave and subnet data
      const [opportunities, subnetData] = await Promise.all([
        optimizerService.getYieldOpportunities(),
        subnetService ? subnetService.getAllYieldData() : []
      ]);

      setYieldOpportunities(opportunities);
      setSubnetYieldData(subnetData);
      setLastUpdate(new Date());

      // Auto-optimize with current parameters
      if (investmentAmount && parseFloat(investmentAmount) > 0) {
        await optimizeYield(opportunities);
      }
    } catch (err: any) {
      console.error('Error loading yield opportunities:', err);
      setError(err.message || 'Failed to load yield opportunities');
    } finally {
      setIsLoading(false);
    }
  };

  // Optimize yield based on current parameters
  const optimizeYield = async (opportunities?: YieldOpportunity[]) => {
    if (!optimizerService || !investmentAmount || parseFloat(investmentAmount) <= 0) return;

    try {
      const params: OptimizationParams = {
        investmentAmount: parseFloat(investmentAmount),
        riskTolerance,
        timeHorizon: 365, // 1 year default
        diversificationPreference: 50, // Medium diversification
      };

      const result = await optimizerService.optimizeYield(params);
      setOptimizationResult(result);
    } catch (err: any) {
      console.error('Error optimizing yield:', err);
    }
  };

  // Load data when service is ready
  useEffect(() => {
    if (optimizerService) {
      loadYieldOpportunities();
    }
  }, [optimizerService]);

  // Re-optimize when parameters change
  useEffect(() => {
    if (optimizerService && yieldOpportunities.length > 0) {
      const debounceTimer = setTimeout(() => {
        optimizeYield();
      }, 500);

      return () => clearTimeout(debounceTimer);
    }
  }, [investmentAmount, riskTolerance, optimizerService, yieldOpportunities]);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    if (!optimizerService) return;

    const interval = setInterval(loadYieldOpportunities, 120000);
    return () => clearInterval(interval);
  }, [optimizerService]);

  // Ensure client-side hydration and animate cards
  useEffect(() => {
    setIsClient(true);

    const animateCards = () => {
      cardRefs.current.forEach((card, index) => {
        if (card) {
          card.style.opacity = '0';
          card.style.transform = 'translateY(20px)';
          setTimeout(() => {
            card.style.transition = `opacity 0.5s ease ${index * 0.1}s, transform 0.5s ease ${index * 0.1}s`;
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          }, 100);
        }
      });
    };

    const timer = setTimeout(animateCards, 100);
    return () => clearTimeout(timer);
  }, []);

  // Get displayed opportunities (optimized if available, otherwise all)
  const displayedOpportunities = optimizationResult?.recommendedOpportunities || yieldOpportunities;

  const getRiskLevelText = (value: number): string => {
    if (value <= 33) return 'Low';
    if (value <= 66) return 'Medium';
    return 'High';
  };

  const getRiskLevelButtonColor = (riskLevel: string): string => {
    return YieldOptimizerService.getRiskLevelColor(riskLevel as 'Low' | 'Medium' | 'High');
  };

  return (
    <div
      className="relative flex size-full min-h-screen flex-col bg-[#0a0a0a] overflow-x-hidden"
      style={{ fontFamily: 'Inter, "Noto Sans", sans-serif' }}
    >
      <div className="layout-container flex h-full grow flex-col">
        {/* Header */}
        <Navbar />

        {/* Main Content */}
        <div className="px-4 md:px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
            {/* Title Section */}
            <div className="group">
              <div className="flex flex-wrap justify-between gap-3 p-4">
                <div className="flex min-w-72 flex-col gap-3">
                  <h1 className="text-white tracking-light text-2xl md:text-[32px] font-bold leading-tight">
                    Yield<span className="text-[#00ffaa]">Optimizer</span>
                  </h1>
                  <p className="text-[#777] text-sm font-normal leading-normal">
                    Maximize your DeFi returns with real-time yield optimization powered by your YieldHub contract.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* Connection Status */}
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${isConnected && chainId === 43113
                    ? 'bg-green-900/30 text-green-400'
                    : 'bg-red-900/30 text-red-400'
                    }`}>
                    <div className={`w-2 h-2 rounded-full ${isConnected && chainId === 43113 ? 'bg-green-400' : 'bg-red-400'
                      }`} />
                    {isConnected && chainId === 43113 ? 'Live Data' : 'Connect Wallet'}
                  </div>

                  {/* Refresh Button */}
                  <button
                    onClick={loadYieldOpportunities}
                    disabled={isLoading || !optimizerService}
                    className="flex items-center gap-2 px-3 py-1 bg-[#283039] hover:bg-[#374151] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                    {isLoading ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
              </div>
            </div>

            {/* Connection Warning */}
            {(!isConnected || chainId !== 43113) && (
              <div className="flex items-center gap-2 p-4 mx-4 bg-orange-900/20 border border-orange-600 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-orange-400" />
                <span className="text-orange-400 text-sm font-medium">
                  {!isConnected
                    ? 'Connect your wallet to access real yield optimization data'
                    : 'Switch to Fuji testnet for live yield opportunities'}
                </span>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="flex items-center gap-2 p-4 mx-4 bg-red-900/20 border border-red-600 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-red-400 text-sm font-medium">{error}</span>
              </div>
            )}

            {/* Investment Amount Input */}
            <div className="group" ref={el => cardRefs.current[0] = el}>
              <div className="flex max-w-[480px] flex-wrap items-end gap-4 px-4 py-3">
                <label className="flex flex-col min-w-40 flex-1">
                  <p className="text-[#aaa] text-base font-medium leading-normal pb-2">
                    Investment Amount (USD)
                  </p>
                  {isClient ? (
                    <input
                      type="text"
                      placeholder="Enter amount"
                      className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-0 border border-[#2a2a2a] bg-[#111418] hover:border-[#00ffaa] focus:border-[#00ffaa] transition-all duration-300 h-14 placeholder:text-[#777] p-4 text-base font-normal leading-normal"
                      value={investmentAmount}
                      onChange={(e) => setInvestmentAmount(e.target.value)}
                      suppressHydrationWarning={true}
                    />
                  ) : (
                    <div className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white border border-[#2a2a2a] bg-[#111418] h-14 p-4 text-base font-normal leading-normal text-[#777]">
                      Enter amount
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Risk Tolerance Slider */}
            <div className="group @container" ref={el => cardRefs.current[1] = el}>
              <div className="relative flex w-full flex-col items-start justify-between gap-3 p-4 @[480px]:flex-row @[480px]:items-center">
                <div className="flex w-full shrink-[3] items-center justify-between">
                  <p className="text-[#aaa] text-base font-medium leading-normal">Risk Tolerance</p>
                  <p className="text-white text-sm font-normal leading-normal @[480px]:hidden">
                    {getRiskLevelText(riskTolerance)}
                  </p>
                </div>
                <div className="flex h-4 w-full items-center gap-4">
                  <div className="flex h-1 flex-1 rounded-sm bg-[#2a2a2a] relative">
                    <div
                      className="h-full rounded-sm bg-[#00ffaa] transition-all duration-300"
                      style={{ width: `${riskTolerance}%` }}
                    />
                    {isClient && (
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={riskTolerance}
                        onChange={(e) => setRiskTolerance(Number(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        suppressHydrationWarning={true}
                      />
                    )}
                    <div
                      className="absolute -top-1.5 size-4 rounded-full bg-[#00ffaa] transition-all duration-300 hover:size-5 hover:-top-2"
                      style={{ left: `calc(${riskTolerance}% - 8px)` }}
                    />
                  </div>
                  <p className="text-white text-sm font-normal leading-normal hidden @[480px]:block">
                    {getRiskLevelText(riskTolerance)}
                  </p>
                </div>
              </div>
            </div>

            {/* Cross-Chain Data Summary */}
            {subnetYieldData.length > 0 && (
              <div className="group px-4 py-3" ref={el => cardRefs.current[2] = el}>
                <h3 className="text-white text-lg font-bold mb-3 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[#00ffaa]" />
                  Cross-Chain Yield Data
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {subnetYieldData.slice(0, 3).map((data, index) => (
                    <div key={data.tokenAddress} className="bg-[#111418] border border-[#2a2a2a] rounded-lg p-4 hover:border-[#00ffaa] transition-all duration-300">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium">{data.tokenSymbol}</span>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${data.requestStatus === 'completed' ? 'bg-green-900/30 text-green-400' :
                          data.requestStatus === 'pending' ? 'bg-yellow-900/30 text-yellow-400' :
                            'bg-blue-900/30 text-blue-400'
                          }`}>
                          {data.requestStatus === 'completed' ? 'Live' : 'Demo'}
                        </div>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[#9cabba]">C-Chain:</span>
                          <span className="text-green-400">{data.aaveAPYFormatted}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#9cabba]">Subnet:</span>
                          <span className="text-blue-400">{data.subnetAPYFormatted}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span className="text-[#9cabba]">Optimized:</span>
                          <span className="text-purple-400">{data.optimizedAPYFormatted}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Optimization Summary */}
            {optimizationResult && (
              <div className="group px-4 py-3" ref={el => cardRefs.current[2] = el}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-[#111418] border border-[#2a2a2a] rounded-lg p-4 hover:border-[#00ffaa] transition-all duration-300">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-[#00ffaa]" />
                      <span className="text-[#aaa] text-sm">Estimated Return</span>
                    </div>
                    <p className="text-white text-xl font-bold">
                      {YieldOptimizerService.formatCurrency(optimizationResult.totalEstimatedReturn)}
                    </p>
                  </div>

                  <div className="bg-[#111418] border border-[#2a2a2a] rounded-lg p-4 hover:border-[#00ffaa] transition-all duration-300">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-green-400" />
                      <span className="text-[#aaa] text-sm">Average APY</span>
                    </div>
                    <p className="text-white text-xl font-bold">
                      {optimizationResult.averageAPY.toFixed(1)}%
                    </p>
                  </div>

                  <div className="bg-[#111418] border border-[#2a2a2a] rounded-lg p-4 hover:border-[#00ffaa] transition-all duration-300">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      <span className="text-[#aaa] text-sm">Risk Score</span>
                    </div>
                    <p className="text-white text-xl font-bold">
                      {optimizationResult.riskScore.toFixed(0)}/100
                    </p>
                  </div>

                  <div className="bg-[#111418] border border-[#2a2a2a] rounded-lg p-4 hover:border-[#00ffaa] transition-all duration-300">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-purple-400" />
                      <span className="text-[#aaa] text-sm">Diversification</span>
                    </div>
                    <p className="text-white text-xl font-bold">
                      {optimizationResult.diversificationScore.toFixed(0)}/100
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Yield Opportunities Table */}
            <div className="group" ref={el => cardRefs.current[3] = el}>
              <div className="flex items-center justify-between px-4 pb-3 pt-5">
                <div>
                  <h2 className="text-white text-xl md:text-[22px] font-bold leading-tight tracking-[-0.015em]">
                    {optimizationResult ? 'Recommended Opportunities' : 'Available Opportunities'}
                    <span className="block h-0.5 w-0 bg-[#00ffaa] transition-all duration-500 group-hover:w-16 mt-1"></span>
                  </h2>
                </div>
                {lastUpdate && (
                  <span className="text-[#777] text-xs">
                    Updated: {lastUpdate.toLocaleTimeString()}
                  </span>
                )}
              </div>

              <div className="px-4 py-3 @container">
                <div className="flex overflow-hidden rounded-lg border border-[#2a2a2a] bg-[#111418] hover:border-[#00ffaa] transition-all duration-300 min-w-[600px]">
                  <table className="flex-1 w-full">
                    <thead>
                      <tr className="bg-[#1a1a1a]">
                        <th className="px-4 py-3 text-left text-[#aaa] text-sm font-medium leading-normal">
                          Subnet
                        </th>
                        <th className="px-4 py-3 text-left text-[#aaa] text-sm font-medium leading-normal">
                          Protocol
                        </th>
                        <th className="px-4 py-3 text-left text-[#aaa] text-sm font-medium leading-normal">
                          APY
                        </th>
                        <th className="px-4 py-3 text-left text-[#aaa] text-sm font-medium leading-normal">
                          Risk Level
                        </th>
                        <th className="px-4 py-3 text-left text-[#aaa] text-sm font-medium leading-normal">
                          Estimated Return
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        // Loading skeleton
                        Array.from({ length: 3 }).map((_, index) => (
                          <tr key={`loading-${index}`} className="border-t border-t-[#2a2a2a]">
                            <td className="h-[72px] px-4 py-2">
                              <div className="animate-pulse bg-[#283039] rounded h-4 w-24"></div>
                            </td>
                            <td className="h-[72px] px-4 py-2">
                              <div className="animate-pulse bg-[#283039] rounded h-4 w-20"></div>
                            </td>
                            <td className="h-[72px] px-4 py-2">
                              <div className="animate-pulse bg-[#283039] rounded h-4 w-16"></div>
                            </td>
                            <td className="h-[72px] px-4 py-2">
                              <div className="animate-pulse bg-[#283039] rounded h-8 w-20"></div>
                            </td>
                            <td className="h-[72px] px-4 py-2">
                              <div className="animate-pulse bg-[#283039] rounded h-4 w-16"></div>
                            </td>
                          </tr>
                        ))
                      ) : displayedOpportunities.length > 0 ? (
                        displayedOpportunities.map((opportunity, index) => (
                          <tr
                            key={opportunity.id || index}
                            className="border-t border-t-[#2a2a2a] hover:bg-[#1a1a1a] transition-colors duration-200"
                          >
                            <td className="h-[72px] px-4 py-2 text-white text-sm font-normal leading-normal">
                              <div className="flex items-center gap-2">
                                <span>{opportunity.subnet}</span>
                                {opportunity.tokenSymbol && (
                                  <span className="text-[#777] text-xs">({opportunity.tokenSymbol})</span>
                                )}
                              </div>
                            </td>
                            <td className="h-[72px] px-4 py-2 text-white text-sm font-normal leading-normal">
                              <div className="flex flex-col">
                                <span>{opportunity.protocol}</span>
                                {opportunity.tvl && (
                                  <span className="text-[#777] text-xs">TVL: {opportunity.tvl}</span>
                                )}
                              </div>
                            </td>
                            <td className="h-[72px] px-4 py-2 text-[#00ffaa] text-sm font-normal leading-normal">
                              <div className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                <span className="font-medium">{opportunity.apy}</span>
                              </div>
                            </td>
                            <td className="h-[72px] px-4 py-2 text-sm font-normal leading-normal">
                              <button
                                className={`flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-8 px-4 ${getRiskLevelButtonColor(opportunity.riskLevel)} transition-colors duration-200 w-full`}
                                suppressHydrationWarning={true}
                              >
                                <span className="truncate">{opportunity.riskLevel}</span>
                              </button>
                            </td>
                            <td className="h-[72px] px-4 py-2 text-white text-sm font-normal leading-normal">
                              <div className="flex flex-col">
                                <span className="font-medium">{opportunity.estimatedReturn}</span>
                                {opportunity.lastUpdate && (
                                  <span className="text-[#777] text-xs">
                                    {new Date(opportunity.lastUpdate).toLocaleTimeString()}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        // Empty state
                        <tr className="border-t border-t-[#2a2a2a]">
                          <td colSpan={5} className="h-[120px] px-4 py-2 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <AlertTriangle className="w-8 h-8 text-[#777]" />
                              <span className="text-[#777] text-sm">
                                {!isConnected || chainId !== 43113
                                  ? 'Connect to Fuji testnet to view yield opportunities'
                                  : 'No yield opportunities available'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="group" ref={el => cardRefs.current[4] = el}>
              <p className="text-[#777] text-sm font-normal leading-normal pb-3 pt-1 px-4 group-hover:text-[#aaa] transition-colors duration-300">
                Note: APYs and estimated returns are fetched from live contracts and subject to change based on market conditions.
                Risk levels are calculated based on protocol metrics and should be considered alongside your own research.
                {optimizationResult && (
                  <span className="block mt-1 text-[#00ffaa]">
                    Optimization based on ${investmentAmount} investment with {getRiskLevelText(riskTolerance)} risk tolerance.
                  </span>
                )}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="group flex px-4 py-3 justify-between items-center" ref={el => cardRefs.current[5] = el}>
              <div className="flex gap-3">
                <button
                  onClick={loadYieldOpportunities}
                  disabled={isLoading || !optimizerService}
                  className="flex items-center gap-2 px-4 py-2 bg-[#283039] hover:bg-[#374151] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  {isLoading ? 'Optimizing...' : 'Re-optimize'}
                </button>

                <button
                  className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#00ffaa20] text-[#00ffaa] hover:bg-[#00ffaa30] hover:text-white hover:shadow-[0_0_15px_rgba(0,255,170,0.3)] text-sm font-bold leading-normal tracking-[0.015em] transition-all duration-300"
                  suppressHydrationWarning={true}
                >
                  <span className="truncate">View Portfolio</span>
                </button>
              </div>

              {optimizationResult && (
                <div className="text-right">
                  <p className="text-[#777] text-xs">
                    {optimizationResult.recommendedOpportunities.length} opportunities selected
                  </p>
                  <p className="text-[#777] text-xs">
                    Auto-refresh: 2min
                  </p>
                </div>
              )}
            </div>

            {/* Status Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-6 border-t border-[#2a2a2a]">
              <div className="flex items-center gap-4 text-sm text-[#777]">
                <span>
                  {displayedOpportunities.length} opportunities available
                </span>
                <span>•</span>
                <span>Powered by YieldHub Contract</span>
                {lastUpdate && (
                  <>
                    <span>•</span>
                    <span>Last update: {lastUpdate.toLocaleTimeString()}</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-[#777]">
                <span>Real-time optimization</span>
                <div className="w-2 h-2 bg-[#00ffaa] rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubnetYieldCore;