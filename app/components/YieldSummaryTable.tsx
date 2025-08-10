'use client';

import React, { useState } from 'react';
import { RefreshCw, ExternalLink, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { useWeb3 } from '../lib/Web3Context';
import { TOKEN_INFO, CONTRACT_CONFIG } from '../lib/web3-config';

const YieldSummaryTable: React.FC = () => {
  const { 
    tokenYieldData, 
    supportedTokens, 
    refreshTokenData, 
    isLoadingData, 
    isConnected, 
    chainId,
    getOptimalYield 
  } = useWeb3();
  
  const [loadingOptimalYields, setLoadingOptimalYields] = useState<Record<string, boolean>>({});

  const handleRefreshAll = async () => {
    await refreshTokenData();
  };

  const handleGetOptimalYield = async (tokenAddress: string) => {
    setLoadingOptimalYields(prev => ({ ...prev, [tokenAddress]: true }));
    try {
      const optimalYield = await getOptimalYield(tokenAddress);
      if (optimalYield) {
        // Show optimal yield in a toast or modal - for now just log it
        console.log('Optimal yield for', tokenAddress, optimalYield);
      }
    } finally {
      setLoadingOptimalYields(prev => ({ ...prev, [tokenAddress]: false }));
    }
  };

  const getExplorerUrl = (tokenAddress: string) => {
    return `https://testnet.snowtrace.io/address/${tokenAddress}`;
  };

  const getStatusColor = (tokenData: any) => {
    if (tokenData.isLoading) return 'bg-blue-600';
    if (tokenData.error) return 'bg-red-600';
    if (tokenData.isDataFresh) return 'bg-green-600';
    return 'bg-yellow-600';
  };

  const getStatusText = (tokenData: any) => {
    if (tokenData.isLoading) return 'Loading';
    if (tokenData.error) return 'Error';
    if (tokenData.isDataFresh) return 'Fresh';
    return 'Stale';
  };

  const getStatusIcon = (tokenData: any) => {
    if (tokenData.isLoading) return <RefreshCw className="w-4 h-4 animate-spin" />;
    if (tokenData.error) return <AlertCircle className="w-4 h-4" />;
    if (tokenData.isDataFresh) return <CheckCircle className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  return (
    <div className="px-4 py-3">
      {/* Table Header with Refresh Button */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em]">
          Cross-Chain Yield Summary
        </h2>
        <button
          onClick={handleRefreshAll}
          disabled={isLoadingData}
          className="flex items-center gap-2 px-4 py-2 bg-[#283039] hover:bg-[#374151] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
          {isLoadingData ? 'Refreshing...' : 'Refresh All'}
        </button>
      </div>

      {/* Connection Status Banner */}
      {(!isConnected || chainId !== 43113) && (
        <div className="mb-4 p-4 bg-orange-900/20 border border-orange-600 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-400" />
            <span className="text-orange-400 font-medium">
              {!isConnected 
                ? 'Connect your wallet to view real-time data from Fuji testnet' 
                : 'Switch to Fuji testnet to access live yield data'}
            </span>
          </div>
        </div>
      )}

      <div className="flex overflow-hidden rounded-lg border border-[#3b4754] bg-[#111418]">
        <table className="flex-1">
          <thead>
            <tr className="bg-[#1b2127]">
              <th className="px-4 py-3 text-left text-white text-sm font-medium leading-normal">
                Token
              </th>
              <th className="px-4 py-3 text-left text-white text-sm font-medium leading-normal">
                C-Chain APY
              </th>
              <th className="px-4 py-3 text-left text-white text-sm font-medium leading-normal">
                TVL
              </th>
              <th className="px-4 py-3 text-left text-white text-sm font-medium leading-normal">
                Cross-Chain APY
              </th>
              <th className="px-4 py-3 text-left text-white text-sm font-medium leading-normal">
                Status
              </th>
              <th className="px-4 py-3 text-left text-white text-sm font-medium leading-normal">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {supportedTokens.map((tokenAddress) => {
              const tokenData = tokenYieldData[tokenAddress];
              const tokenInfo = TOKEN_INFO[tokenAddress as keyof typeof TOKEN_INFO];
              
              if (!tokenData || !tokenInfo) return null;

              return (
                <tr key={tokenAddress} className="border-t border-t-[#3b4754]">
                  {/* Token Info */}
                  <td className="h-[72px] px-4 py-2 text-white text-sm font-normal leading-normal">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{tokenInfo.icon}</span>
                      <div>
                        <div className="font-medium">{tokenInfo.symbol}</div>
                        <div className="text-[#9cabba] text-xs">{tokenInfo.name}</div>
                      </div>
                    </div>
                  </td>

                  {/* Aave APY */}
                  <td className="h-[72px] px-4 py-2 text-white text-sm font-normal leading-normal">
                    {tokenData.isLoading ? (
                      <div className="animate-pulse bg-[#283039] rounded h-4 w-16"></div>
                    ) : tokenData.error ? (
                      <span className="text-red-400">Error</span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-green-400" />
                        <span className="font-medium">{tokenData.apy}</span>
                      </div>
                    )}
                  </td>

                  {/* TVL */}
                  <td className="h-[72px] px-4 py-2 text-[#9cabba] text-sm font-normal leading-normal">
                    {tokenData.isLoading ? (
                      <div className="animate-pulse bg-[#283039] rounded h-4 w-20"></div>
                    ) : tokenData.error ? (
                      <span className="text-red-400">Error</span>
                    ) : (
                      tokenData.tvl
                    )}
                  </td>

                  {/* Optimized APY */}
                  <td className="h-[72px] px-4 py-2 text-white text-sm font-normal leading-normal">
                    {tokenData.isLoading ? (
                      <div className="animate-pulse bg-[#283039] rounded h-4 w-16"></div>
                    ) : tokenData.error ? (
                      <span className="text-red-400">Error</span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-purple-400" />
                        <span className="font-medium text-purple-400">{tokenData.optimizedAPY}</span>
                      </div>
                    )}
                  </td>

                  {/* Status */}
                  <td className="h-[72px] px-4 py-2 text-sm font-normal leading-normal">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-white text-xs font-medium ${getStatusColor(tokenData)}`}>
                      {getStatusIcon(tokenData)}
                      <span>{getStatusText(tokenData)}</span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="h-[72px] px-4 py-2 text-sm font-normal leading-normal">
                    <div className="flex items-center gap-2">
                      {/* View on Explorer */}
                      <a
                        href={getExplorerUrl(tokenAddress)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-8 h-8 bg-[#283039] hover:bg-[#374151] rounded-lg transition-colors"
                        title="View on Snowtrace"
                      >
                        <ExternalLink className="w-4 h-4 text-white" />
                      </a>

                      {/* Get Optimal Yield */}
                      <button
                        onClick={() => handleGetOptimalYield(tokenAddress)}
                        disabled={loadingOptimalYields[tokenAddress] || !isConnected || chainId !== 43113}
                        className="flex items-center justify-center w-8 h-8 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                        title="Get Optimal Yield"
                      >
                        {loadingOptimalYields[tokenAddress] ? (
                          <RefreshCw className="w-4 h-4 text-white animate-spin" />
                        ) : (
                          <TrendingUp className="w-4 h-4 text-white" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Contract Info */}
      <div className="mt-4 p-4 bg-[#1b2127] border border-[#3b4754] rounded-lg">
        <h3 className="text-white text-sm font-medium mb-2">Contract Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-[#9cabba]">YieldHub: </span>
            <a 
              href={`https://testnet.snowtrace.io/address/${CONTRACT_CONFIG.YIELD_HUB_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 font-mono"
            >
              {CONTRACT_CONFIG.YIELD_HUB_ADDRESS}
            </a>
          </div>
          <div>
            <span className="text-[#9cabba]">Network: </span>
            <span className="text-white">Avalanche Fuji Testnet (43113)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YieldSummaryTable;