'use client';

import React, { useState } from 'react';
import { RefreshCw, TrendingUp, DollarSign, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useWeb3 } from '../lib/Web3Context';
import { TOKEN_INFO } from '../lib/web3-config';

interface YieldDataCardProps {
  tokenAddress: string;
}

const YieldDataCard: React.FC<YieldDataCardProps> = ({ tokenAddress }) => {
  const { tokenYieldData, updateAaveData, isConnected, chainId, refreshTokenData } = useWeb3();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const tokenData = tokenYieldData[tokenAddress];
  const tokenInfo = TOKEN_INFO[tokenAddress as keyof typeof TOKEN_INFO];

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

      {/* Yield Metrics */}
      <div className="grid grid-cols-2 gap-4">
        {/* Aave APY */}
        <div className="flex flex-col gap-1">
          <p className="text-[#9cabba] text-sm font-normal">Aave APY</p>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <p className="text-white text-xl font-bold">
              {tokenData.isLoading ? (
                <div className="animate-pulse bg-[#283039] rounded h-6 w-16"></div>
              ) : tokenData.error ? (
                <span className="text-red-400 text-sm">Error</span>
              ) : (
                tokenData.apy
              )}
            </p>
          </div>
        </div>

        {/* TVL */}
        <div className="flex flex-col gap-1">
          <p className="text-[#9cabba] text-sm font-normal">Total Value Locked</p>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-blue-400" />
            <p className="text-white text-xl font-bold">
              {tokenData.isLoading ? (
                <div className="animate-pulse bg-[#283039] rounded h-6 w-20"></div>
              ) : tokenData.error ? (
                <span className="text-red-400 text-sm">Error</span>
              ) : (
                tokenData.tvl
              )}
            </p>
          </div>
        </div>

        {/* Optimized APY */}
        <div className="flex flex-col gap-1">
          <p className="text-[#9cabba] text-sm font-normal">Optimized APY</p>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <p className="text-white text-xl font-bold">
              {tokenData.isLoading ? (
                <div className="animate-pulse bg-[#283039] rounded h-6 w-16"></div>
              ) : tokenData.error ? (
                <span className="text-red-400 text-sm">Error</span>
              ) : (
                tokenData.optimizedAPY
              )}
            </p>
          </div>
        </div>

        {/* Last Update */}
        <div className="flex flex-col gap-1">
          <p className="text-[#9cabba] text-sm font-normal">Last Update</p>
          <p className="text-white text-sm font-medium">
            {tokenData.lastUpdate > 0 ? (
              new Date(tokenData.lastUpdate * 1000).toLocaleTimeString()
            ) : (
              'Never'
            )}
          </p>
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

        {/* Update On-Chain Data Button */}
        <button
          onClick={handleUpdateData}
          disabled={!canUpdate}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          <TrendingUp className={`w-4 h-4 ${isUpdating ? 'animate-pulse' : ''}`} />
          {isUpdating ? 'Updating...' : 'Update Data'}
        </button>
      </div>

      {/* Connection Status */}
      {(!isConnected || chainId !== 43113) && (
        <div className="flex items-center gap-2 p-3 bg-orange-900/20 border border-orange-600 rounded-lg">
          <XCircle className="w-4 h-4 text-orange-400" />
          <span className="text-orange-400 text-sm font-medium">
            {!isConnected ? 'Connect wallet to update data' : 'Switch to Fuji testnet'}
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