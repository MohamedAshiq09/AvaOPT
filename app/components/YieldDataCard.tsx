'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useWeb3 } from '../lib/Web3Context';
import { TOKEN_INFO } from '../lib/web3-config';
import SubnetService, { SubnetYieldData } from '../lib/subnet-service';

interface YieldDataCardProps {
  tokenAddress: string;
}

const YieldDataCard: React.FC<YieldDataCardProps> = ({ tokenAddress }) => {
  const { tokenYieldData, updateAaveData, isConnected, chainId, refreshTokenData, provider } = useWeb3();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [subnetData, setSubnetData] = useState<SubnetYieldData | null>(null);
  const [subnetService, setSubnetService] = useState<SubnetService | null>(null);
  const [isLoadingSubnet, setIsLoadingSubnet] = useState(false);

  const tokenData = tokenYieldData[tokenAddress];
  const tokenInfo = TOKEN_INFO[tokenAddress as keyof typeof TOKEN_INFO];

  // Initialize subnet service when provider is available
  useEffect(() => {
    if (provider) {
      const service = new SubnetService(provider);
      setSubnetService(service);
    }
  }, [provider]);

  // Load subnet data on component mount and when connected
  useEffect(() => {
    if (subnetService && isConnected && chainId === 43113) {
      loadSubnetData();
    }
  }, [subnetService, isConnected, chainId, tokenAddress]);

  const loadSubnetData = async () => {
    if (!subnetService) return;

    setIsLoadingSubnet(true);
    try {
      // First try to get real subnet data
      let data = await subnetService.getComprehensiveYieldData(tokenAddress);

      // If no real data available, check subnet availability
      if (!data) {
        const availability = await subnetService.checkSubnetAvailability();
        if (!availability.isAvailable) {
          // Use simulated data as fallback
          data = await subnetService.getSimulatedSubnetData(tokenAddress);
        }
      }

      setSubnetData(data);
    } catch (error) {
      console.error('Error loading subnet data:', error);
      // Fallback to simulated data on error
      try {
        const fallbackData = await subnetService.getSimulatedSubnetData(tokenAddress);
        setSubnetData(fallbackData);
      } catch (fallbackError) {
        console.error('Error loading fallback subnet data:', fallbackError);
      }
    } finally {
      setIsLoadingSubnet(false);
    }
  };

  if (!tokenData || !tokenInfo) {
    return null;
  }

  const handleUpdateData = async () => {
    if (!isConnected || chainId !== 43113) return;

    setIsUpdating(true);
    try {
      await updateAaveData(tokenAddress);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      await refreshTokenData(tokenAddress);
      await loadSubnetData(); // Also refresh subnet data
    } finally {
      setIsRefreshing(false);
    }
  };

  const getDataFreshnessColor = () => {
    if (tokenData.isDataFresh) return 'text-green-400';
    return 'text-yellow-400';
  };

  const getDataFreshnessIcon = () => {
    if (tokenData.isDataFresh) return <CheckCircle className="w-4 h-4" />;
    return <AlertTriangle className="w-4 h-4" />;
  };

  const canUpdate = isConnected && chainId === 43113 && !isUpdating && !tokenData.isLoading;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-[#3b4754] p-6 bg-[#1b2127]">
      {/* Token Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{tokenInfo.icon}</span>
          <div>
            <h3 className="text-white text-lg font-bold leading-tight">{tokenInfo.symbol}</h3>
            <p className="text-[#9cabba] text-sm font-normal">{tokenInfo.name}</p>
          </div>
        </div>

        {/* Data Freshness Indicator */}
        <div className={`flex items-center gap-2 ${getDataFreshnessColor()}`}>
          {getDataFreshnessIcon()}
          <span className="text-xs font-medium">
            {tokenData.isDataFresh ? 'Fresh' : 'Stale'}
          </span>
        </div>
      </div>

      {/* Cross-Chain Yield Metrics */}
      <div className="space-y-4">
        {/* C-Chain (Aave) Section */}
        <div className="bg-[#283039] rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-white text-sm font-medium">C-Chain (Aave V3)</span>
            </div>
            <span className="text-green-400 text-lg font-bold">
              {tokenData.isLoading ? (
                <div className="animate-pulse bg-[#1a1a1a] rounded h-5 w-16"></div>
              ) : tokenData.error ? (
                <span className="text-red-400 text-xs">Error</span>
              ) : (
                tokenData.apy
              )}
            </span>
          </div>
          <div className="flex justify-between text-xs text-[#9cabba]">
            <span>TVL: {tokenData.isLoading ? '...' : tokenData.error ? 'Error' : tokenData.tvl}</span>
            <span>Live Data</span>
          </div>
        </div>

        {/* Subnet Section */}
        <div className="bg-[#283039] rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${subnetData?.isSubnetDataFresh ? 'bg-blue-400' : 'bg-yellow-400'}`}></div>
              <span className="text-white text-sm font-medium">Subnet (AWM)</span>
            </div>
            <span className="text-blue-400 text-lg font-bold">
              {isLoadingSubnet || tokenData.isLoading ? (
                <div className="animate-pulse bg-[#1a1a1a] rounded h-5 w-16"></div>
              ) : subnetData ? (
                subnetData.subnetAPYFormatted
              ) : (
                <span className="text-red-400 text-xs">No Data</span>
              )}
            </span>
          </div>
          <div className="flex justify-between text-xs text-[#9cabba]">
            <span>TVL: {subnetData ? subnetData.subnetTVLFormatted : 'N/A'}</span>
            <span>
              {subnetData?.requestStatus === 'completed' ? 'Live Data' :
                subnetData?.requestStatus === 'pending' ? 'Updating...' :
                  subnetData ? 'Simulated' : 'No Data'}
            </span>
          </div>
        </div>

        {/* Optimized Result */}
        <div className="bg-gradient-to-r from-purple-900/20 to-purple-800/20 border border-purple-600/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <span className="text-white text-sm font-medium">Cross-Chain Optimized</span>
            </div>
            <span className="text-purple-400 text-lg font-bold">
              {isLoadingSubnet || tokenData.isLoading ? (
                <div className="animate-pulse bg-[#1a1a1a] rounded h-5 w-16"></div>
              ) : tokenData.error ? (
                <span className="text-red-400 text-xs">Error</span>
              ) : subnetData ? (
                subnetData.optimizedAPYFormatted
              ) : (
                tokenData.optimizedAPY
              )}
            </span>
          </div>
          <div className="flex justify-between text-xs text-[#9cabba]">
            <span>Best of both chains</span>
            <span>
              {subnetData?.lastUpdate ? (
                new Date(subnetData.lastUpdate).toLocaleTimeString()
              ) : tokenData.lastUpdate > 0 ? (
                new Date(tokenData.lastUpdate * 1000).toLocaleTimeString()
              ) : (
                'Real-time'
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        {/* Refresh Button */}
        <button
          onClick={handleRefreshData}
          disabled={isRefreshing || tokenData.isLoading}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-[#283039] hover:bg-[#374151] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>

        {/* Update Cross-Chain Data Button */}
        <button
          onClick={handleUpdateData}
          disabled={!canUpdate}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          <TrendingUp className={`w-4 h-4 ${isUpdating ? 'animate-pulse' : ''}`} />
          {isUpdating ? 'Updating...' : 'Update Cross-Chain'}
        </button>

        {/* Request Subnet Data Button */}
        {subnetService && isConnected && chainId === 43113 && (
          <button
            onClick={async () => {
              if (!subnetService) return;
              setIsLoadingSubnet(true);
              try {
                const requestId = await subnetService.requestSubnetYield(tokenAddress);
                if (requestId) {
                  // Poll for result
                  const pollInterval = setInterval(async () => {
                    const status = subnetService.getRequestStatus(requestId);
                    if (status?.status === 'completed') {
                      clearInterval(pollInterval);
                      await loadSubnetData();
                    }
                  }, 5000);

                  // Stop polling after 2 minutes
                  setTimeout(() => clearInterval(pollInterval), 120000);
                }
              } catch (error) {
                console.error('Error requesting subnet data:', error);
              } finally {
                setIsLoadingSubnet(false);
              }
            }}
            disabled={isLoadingSubnet}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingSubnet ? 'animate-spin' : ''}`} />
            {isLoadingSubnet ? 'Requesting...' : 'Request Subnet Data'}
          </button>
        )}
      </div>

      {/* Connection Status */}
      {(!isConnected || chainId !== 43113) && (
        <div className="flex items-center gap-2 p-3 bg-orange-900/20 border border-orange-600 rounded-lg">
          <XCircle className="w-4 h-4 text-orange-400" />
          <span className="text-orange-400 text-sm font-medium">
            {!isConnected ? 'Connect wallet for cross-chain data' : 'Switch to Fuji for AWM integration'}
          </span>
        </div>
      )}

      {/* Error Display */}
      {tokenData.error && (
        <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-600 rounded-lg">
          <XCircle className="w-4 h-4 text-red-400" />
          <span className="text-red-400 text-sm font-medium">{tokenData.error}</span>
        </div>
      )}
    </div>
  );
};

export default YieldDataCard;