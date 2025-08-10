'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle,
  ArrowRight,
  Network,
  Target,
  Shield,
  Clock
} from 'lucide-react';
import { useWeb3 } from '../lib/Web3Context';
import SubnetService, { 
  SubnetYieldData, 
  type CrossChainYieldComparison 
} from '../lib/subnet-service';

const CrossChainYieldComparison: React.FC = () => {
  const { provider, account, isConnected, chainId } = useWeb3();
  const [subnetService, setSubnetService] = useState<SubnetService | null>(null);
  const [yieldData, setYieldData] = useState<SubnetYieldData[]>([]);
  const [comparisons, setComparisons] = useState<CrossChainYieldComparison[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [subnetAvailability, setSubnetAvailability] = useState<{
    isAvailable: boolean;
    error?: string;
  }>({ isAvailable: false });

  // Initialize subnet service
  useEffect(() => {
    if (provider && chainId === 43113) {
      const service = new SubnetService(provider);
      setSubnetService(service);
    } else {
      setSubnetService(null);
    }
  }, [provider, chainId]);

  // Check subnet availability
  const checkSubnetAvailability = async () => {
    if (!subnetService) return;

    try {
      const availability = await subnetService.checkSubnetAvailability();
      setSubnetAvailability(availability);
    } catch (error: any) {
      setSubnetAvailability({ isAvailable: false, error: error.message });
    }
  };

  // Load cross-chain yield data
  const loadYieldData = async (useSimulated: boolean = false) => {
    if (!subnetService) return;

    setIsLoading(true);
    setError(null);

    try {
      let allYieldData: SubnetYieldData[] = [];
      let allComparisons: CrossChainYieldComparison[] = [];

      if (useSimulated || !subnetAvailability.isAvailable) {
        // Use simulated data for demo
        console.log('Using simulated subnet data for demo');
        const supportedTokens = [
          '0xd00ae08403B9bbb9124bB305C09058E32C39A48c', // WAVAX
          '0x28A8E6e41F84e62284970E4bc0867cEe2AAd0DA4', // WETH
          '0x407287b03D1167593AF113d32093942be13A535f'  // TOKEN3
        ];

        for (const tokenAddress of supportedTokens) {
          const simulatedData = await subnetService.getSimulatedSubnetData(tokenAddress);
          allYieldData.push(simulatedData);

          // Create comparison
          const comparison: CrossChainYieldComparison = {
            tokenAddress,
            tokenSymbol: simulatedData.tokenSymbol,
            cChainAPY: Number(simulatedData.aaveAPY) / 100,
            subnetAPY: Number(simulatedData.subnetAPY) / 100,
            optimizedAPY: Number(simulatedData.optimizedAPY) / 100,
            yieldDifference: (Number(simulatedData.subnetAPY) - Number(simulatedData.aaveAPY)) / 100,
            recommendedChain: Number(simulatedData.optimizedAPY) > Math.max(Number(simulatedData.aaveAPY), Number(simulatedData.subnetAPY)) 
              ? 'Optimized' 
              : Number(simulatedData.subnetAPY) > Number(simulatedData.aaveAPY) * 1.1 
              ? 'Subnet' 
              : 'C-Chain',
            riskAssessment: 'Low'
          };
          allComparisons.push(comparison);
        }
      } else {
        // Try to get real data
        allYieldData = await subnetService.getAllYieldData();
        
        for (const data of allYieldData) {
          const comparison = await subnetService.getYieldComparison(data.tokenAddress);
          if (comparison) {
            allComparisons.push(comparison);
          }
        }
      }

      setYieldData(allYieldData);
      setComparisons(allComparisons);
      setLastUpdate(new Date());
    } catch (err: any) {
      console.error('Error loading yield data:', err);
      setError(err.message || 'Failed to load cross-chain yield data');
    } finally {
      setIsLoading(false);
    }
  };

  // Request fresh subnet data
  const requestSubnetData = async (tokenAddress: string) => {
    if (!subnetService || !account) return;

    try {
      const requestId = await subnetService.requestSubnetYield(tokenAddress);
      if (requestId) {
        console.log(`AWM request sent for ${tokenAddress}: ${requestId}`);
        // Refresh data after a delay to allow for AWM processing
        setTimeout(() => loadYieldData(), 10000); // 10 seconds
      }
    } catch (error: any) {
      console.error('Error requesting subnet data:', error);
      setError(`Failed to request subnet data: ${error.message}`);
    }
  };

  // Load data when service is ready
  useEffect(() => {
    if (subnetService) {
      checkSubnetAvailability();
    }
  }, [subnetService]);

  useEffect(() => {
    if (subnetService && subnetAvailability) {
      loadYieldData();
    }
  }, [subnetService, subnetAvailability]);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    if (!subnetService) return;

    const interval = setInterval(() => {
      loadYieldData();
    }, 120000);

    return () => clearInterval(interval);
  }, [subnetService]);

  const getTrendIcon = (difference: number) => {
    if (difference > 0) return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (difference < 0) return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <ArrowRight className="w-4 h-4 text-gray-400" />;
  };

  const getRecommendationBadge = (recommendation: string) => {
    const colors = {
      'Optimized': 'bg-purple-900/30 text-purple-400 border-purple-600',
      'Subnet': 'bg-blue-900/30 text-blue-400 border-blue-600',
      'C-Chain': 'bg-green-900/30 text-green-400 border-green-600'
    };

    return (
      <div className={`px-3 py-1 rounded-full text-xs font-medium border ${colors[recommendation as keyof typeof colors] || 'bg-gray-900/30 text-gray-400 border-gray-600'}`}>
        {recommendation}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white text-xl font-bold leading-tight flex items-center gap-2">
            <Network className="w-5 h-5 text-[#00ffaa]" />
            Cross-Chain Yield Comparison
          </h2>
          <p className="text-[#9cabba] text-sm mt-1">
            Compare yields between C-Chain (Aave) and Avalanche subnets via AWM
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Subnet Status */}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
            subnetAvailability.isAvailable
              ? 'bg-green-900/30 text-green-400'
              : 'bg-orange-900/30 text-orange-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              subnetAvailability.isAvailable ? 'bg-green-400' : 'bg-orange-400'
            }`} />
            {subnetAvailability.isAvailable ? 'Subnet Connected' : 'Using Demo Data'}
          </div>
          
          {/* Refresh Button */}
          <button
            onClick={() => loadYieldData()}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1 bg-[#283039] hover:bg-[#374151] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Connection Warning */}
      {(!isConnected || chainId !== 43113) && (
        <div className="flex items-center gap-2 p-4 bg-orange-900/20 border border-orange-600 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-orange-400" />
          <span className="text-orange-400 text-sm font-medium">
            {!isConnected 
              ? 'Connect your wallet to access cross-chain yield data' 
              : 'Switch to Fuji testnet for live cross-chain comparison'}
          </span>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-900/20 border border-red-600 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-red-400 text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Subnet Availability Notice */}
      {!subnetAvailability.isAvailable && (
        <div className="flex items-center gap-2 p-4 bg-blue-900/20 border border-blue-600 rounded-lg">
          <Network className="w-4 h-4 text-blue-400" />
          <div>
            <span className="text-blue-400 text-sm font-medium">
              Demo Mode: Subnet AWM integration ready but using simulated data
            </span>
            <p className="text-blue-300 text-xs mt-1">
              {subnetAvailability.error || 'Showing realistic cross-chain yield comparison with mock subnet data'}
            </p>
          </div>
        </div>
      )}

      {/* Yield Comparison Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="bg-[#1b2127] border border-[#3b4754] rounded-lg p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-[#283039] rounded w-1/2"></div>
                <div className="h-8 bg-[#283039] rounded w-3/4"></div>
                <div className="h-4 bg-[#283039] rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      ) : comparisons.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {comparisons.map((comparison, index) => (
            <div
              key={comparison.tokenAddress}
              className="bg-[#1b2127] border border-[#3b4754] rounded-lg p-6 hover:border-[#00ffaa] transition-all duration-300"
            >
              {/* Token Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-white text-lg font-bold">{comparison.tokenSymbol}</h3>
                  <p className="text-[#9cabba] text-sm">Cross-Chain Comparison</p>
                </div>
                {getRecommendationBadge(comparison.recommendedChain)}
              </div>

              {/* Yield Comparison */}
              <div className="space-y-3 mb-4">
                {/* C-Chain (Aave) */}
                <div className="flex items-center justify-between p-3 bg-[#283039] rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-white text-sm font-medium">C-Chain (Aave)</span>
                  </div>
                  <span className="text-green-400 font-bold">{comparison.cChainAPY.toFixed(2)}%</span>
                </div>

                {/* Subnet */}
                <div className="flex items-center justify-between p-3 bg-[#283039] rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span className="text-white text-sm font-medium">Subnet (DEX)</span>
                  </div>
                  <span className="text-blue-400 font-bold">{comparison.subnetAPY.toFixed(2)}%</span>
                </div>

                {/* Optimized */}
                <div className="flex items-center justify-between p-3 bg-[#283039] rounded-lg border border-purple-600/30">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-purple-400" />
                    <span className="text-white text-sm font-medium">Optimized</span>
                  </div>
                  <span className="text-purple-400 font-bold">{comparison.optimizedAPY.toFixed(2)}%</span>
                </div>
              </div>

              {/* Yield Difference */}
              <div className="flex items-center justify-between mb-4 p-3 bg-[#1a1a1a] rounded-lg">
                <div className="flex items-center gap-2">
                  {getTrendIcon(comparison.yieldDifference)}
                  <span className="text-[#9cabba] text-sm">Yield Difference</span>
                </div>
                <span className={`font-bold ${
                  comparison.yieldDifference > 0 ? 'text-green-400' : 
                  comparison.yieldDifference < 0 ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {comparison.yieldDifference > 0 ? '+' : ''}{comparison.yieldDifference.toFixed(2)}%
                </span>
              </div>

              {/* Risk Assessment */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#9cabba]" />
                  <span className="text-[#9cabba] text-sm">Risk Level</span>
                </div>
                <span className={`text-sm font-medium ${SubnetService.getRiskColor(comparison.riskAssessment)}`}>
                  {comparison.riskAssessment}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {!subnetAvailability.isAvailable && (
                  <button
                    onClick={() => requestSubnetData(comparison.tokenAddress)}
                    disabled={!account || isLoading}
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors flex-1"
                  >
                    <Network className="w-3 h-3" />
                    Request Live Data
                  </button>
                )}
                
                <button
                  className="flex items-center justify-center gap-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors flex-1"
                >
                  <Target className="w-3 h-3" />
                  Optimize
                </button>
              </div>

              {/* Last Update */}
              <div className="flex items-center justify-center gap-1 mt-3 pt-3 border-t border-[#3b4754]">
                <Clock className="w-3 h-3 text-[#777]" />
                <span className="text-[#777] text-xs">
                  {lastUpdate ? `Updated ${lastUpdate.toLocaleTimeString()}` : 'No updates'}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Network className="w-12 h-12 text-[#777] mx-auto mb-4" />
          <h3 className="text-white text-lg font-medium mb-2">No Cross-Chain Data Available</h3>
          <p className="text-[#9cabba] text-sm mb-4">
            {!isConnected || chainId !== 43113 
              ? 'Connect to Fuji testnet to view cross-chain yield comparisons'
              : 'Unable to load cross-chain yield data at this time'}
          </p>
          <button
            onClick={() => loadYieldData(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#00ffaa] hover:bg-[#00ffaa]/80 text-black font-medium rounded-lg transition-colors mx-auto"
          >
            <Zap className="w-4 h-4" />
            Load Demo Data
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-[#3b4754] text-sm text-[#9cabba]">
        <div className="flex items-center gap-4">
          <span>{comparisons.length} cross-chain comparisons</span>
          <span>•</span>
          <span>AWM-powered subnet integration</span>
          {lastUpdate && (
            <>
              <span>•</span>
              <span>Last update: {lastUpdate.toLocaleTimeString()}</span>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <span>SubnetYield Core</span>
          <div className="w-2 h-2 bg-[#00ffaa] rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
};

export default CrossChainYieldComparison;