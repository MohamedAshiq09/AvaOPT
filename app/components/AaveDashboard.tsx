'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Shield, 
  DollarSign, 
  BarChart3, 
  Users, 
  Activity,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { useWeb3 } from '../lib/Web3Context';
import { TOKEN_INFO, CONTRACT_CONFIG } from '../lib/web3-config';
import AaveService, { UserAccountData } from '../lib/aave-service';
import EnhancedAaveCard from './EnhancedAaveCard';

const AaveDashboard: React.FC = () => {
  const { 
    provider, 
    account, 
    isConnected, 
    chainId, 
    supportedTokens,
    tokenYieldData 
  } = useWeb3();
  
  const [aaveService, setAaveService] = useState<AaveService | null>(null);
  const [userAccountData, setUserAccountData] = useState<UserAccountData | null>(null);
  const [allReserveTokens, setAllReserveTokens] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Initialize Aave service
  useEffect(() => {
    if (provider && chainId === 43113) {
      const service = new AaveService(provider);
      setAaveService(service);
    } else {
      setAaveService(null);
    }
  }, [provider, chainId]);

  // Load user account data
  const loadUserData = async () => {
    if (!aaveService || !account) return;

    setIsLoading(true);
    try {
      const [userData, reserveTokens] = await Promise.all([
        aaveService.getUserAccountData(account),
        aaveService.getAllReserveTokens()
      ]);

      setUserAccountData(userData);
      setAllReserveTokens(reserveTokens);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data when service and account are ready
  useEffect(() => {
    if (aaveService && account) {
      loadUserData();
    }
  }, [aaveService, account]);

  // Calculate aggregated metrics
  const calculateAggregatedMetrics = () => {
    let totalTVL = BigInt(0);
    let weightedAPY = BigInt(0);
    let totalWeight = BigInt(0);
    let activeTokens = 0;

    supportedTokens.forEach(tokenAddress => {
      const data = tokenYieldData[tokenAddress];
      if (data && !data.error && data.rawTVL > 0) {
        totalTVL += data.rawTVL;
        weightedAPY += data.rawAPY * data.rawTVL;
        totalWeight += data.rawTVL;
        activeTokens++;
      }
    });

    const averageAPY = totalWeight > 0 ? weightedAPY / totalWeight : BigInt(0);

    return {
      totalTVL,
      averageAPY,
      activeTokens,
      totalTokens: supportedTokens.length
    };
  };

  const metrics = calculateAggregatedMetrics();
  const formatTVL = (tvl: bigint) => AaveService.formatTVL(tvl);
  const formatAPY = (apy: bigint) => AaveService.formatAPY(apy);
  const formatHealthFactor = (hf: bigint) => AaveService.formatHealthFactor(hf);

  const getHealthFactorColor = (healthFactor: bigint) => {
    const hf = Number(healthFactor) / 1e18;
    if (hf >= 2) return 'text-green-400';
    if (hf >= 1.5) return 'text-yellow-400';
    if (hf >= 1.1) return 'text-orange-400';
    return 'text-red-400';
  };

  const getHealthFactorStatus = (healthFactor: bigint) => {
    const hf = Number(healthFactor) / 1e18;
    if (hf >= 2) return { text: 'Healthy', icon: CheckCircle };
    if (hf >= 1.5) return { text: 'Good', icon: CheckCircle };
    if (hf >= 1.1) return { text: 'Caution', icon: AlertTriangle };
    return { text: 'Risk', icon: AlertTriangle };
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-white text-2xl font-bold leading-tight">
            Aave V3 Dashboard
          </h2>
          <p className="text-[#9cabba] text-sm">
            Real-time Aave protocol data and user positions on Avalanche Fuji
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Network Status */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
            isConnected && chainId === 43113
              ? 'bg-green-900/30 text-green-400'
              : 'bg-red-900/30 text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isConnected && chainId === 43113 ? 'bg-green-400' : 'bg-red-400'
            }`} />
            {isConnected && chainId === 43113 ? 'Fuji Connected' : 'Not Connected'}
          </div>
          
          {/* Refresh Button */}
          <button
            onClick={loadUserData}
            disabled={isLoading || !aaveService}
            className="flex items-center gap-2 px-4 py-2 bg-[#283039] hover:bg-[#374151] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Connection Warning */}
      {(!isConnected || chainId !== 43113) && (
        <div className="flex items-center gap-3 p-4 bg-orange-900/20 border border-orange-600 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0" />
          <div>
            <p className="text-orange-400 font-medium">
              {!isConnected 
                ? 'Connect your wallet to view Aave data and user positions' 
                : 'Switch to Avalanche Fuji testnet to access Aave V3 data'}
            </p>
            <p className="text-orange-300 text-sm mt-1">
              Live data requires connection to Fuji testnet (Chain ID: 43113)
            </p>
          </div>
        </div>
      )}

      {/* Aggregated Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total TVL */}
        <div className="bg-[#1b2127] border border-[#3b4754] rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-900/30 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-[#9cabba] text-sm">Total TVL</p>
              <p className="text-white text-xl font-bold">
                {formatTVL(metrics.totalTVL)}
              </p>
            </div>
          </div>
          <p className="text-[#9cabba] text-xs">
            Across {metrics.activeTokens} active tokens
          </p>
        </div>

        {/* Average APY */}
        <div className="bg-[#1b2127] border border-[#3b4754] rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-900/30 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-[#9cabba] text-sm">Weighted Avg APY</p>
              <p className="text-white text-xl font-bold">
                {formatAPY(metrics.averageAPY)}
              </p>
            </div>
          </div>
          <p className="text-[#9cabba] text-xs">
            TVL-weighted average yield
          </p>
        </div>

        {/* User Health Factor */}
        <div className="bg-[#1b2127] border border-[#3b4754] rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-900/30 rounded-lg">
              <Shield className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-[#9cabba] text-sm">Health Factor</p>
              <p className={`text-xl font-bold ${
                userAccountData ? getHealthFactorColor(userAccountData.healthFactor) : 'text-white'
              }`}>
                {userAccountData ? formatHealthFactor(userAccountData.healthFactor) : 'N/A'}
              </p>
            </div>
          </div>
          {userAccountData && (
            <div className="flex items-center gap-1">
              {(() => {
                const status = getHealthFactorStatus(userAccountData.healthFactor);
                const Icon = status.icon;
                return (
                  <>
                    <Icon className="w-3 h-3 text-[#9cabba]" />
                    <p className="text-[#9cabba] text-xs">{status.text}</p>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* User Collateral */}
        <div className="bg-[#1b2127] border border-[#3b4754] rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-yellow-900/30 rounded-lg">
              <BarChart3 className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-[#9cabba] text-sm">Total Collateral</p>
              <p className="text-white text-xl font-bold">
                {userAccountData ? 
                  `$${(Number(userAccountData.totalCollateralETH) / 1e18).toFixed(2)}` : 
                  '$0.00'
                }
              </p>
            </div>
          </div>
          <p className="text-[#9cabba] text-xs">
            {userAccountData && userAccountData.totalDebtETH > 0 ? 
              `Debt: $${(Number(userAccountData.totalDebtETH) / 1e18).toFixed(2)}` :
              'No active positions'
            }
          </p>
        </div>
      </div>

      {/* User Position Details */}
      {userAccountData && (userAccountData.totalCollateralETH > 0 || userAccountData.totalDebtETH > 0) && (
        <div className="bg-[#1b2127] border border-[#3b4754] rounded-lg p-6">
          <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Your Aave Position
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Collateral */}
            <div className="space-y-3">
              <h4 className="text-[#9cabba] text-sm font-medium">Collateral</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-white text-sm">Total Value:</span>
                  <span className="text-green-400 font-medium">
                    ${(Number(userAccountData.totalCollateralETH) / 1e18).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white text-sm">LTV:</span>
                  <span className="text-white">
                    {(Number(userAccountData.ltv) / 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Debt */}
            <div className="space-y-3">
              <h4 className="text-[#9cabba] text-sm font-medium">Debt</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-white text-sm">Total Debt:</span>
                  <span className="text-red-400 font-medium">
                    ${(Number(userAccountData.totalDebtETH) / 1e18).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white text-sm">Available to Borrow:</span>
                  <span className="text-white">
                    ${(Number(userAccountData.availableBorrowsETH) / 1e18).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Risk Metrics */}
            <div className="space-y-3">
              <h4 className="text-[#9cabba] text-sm font-medium">Risk Metrics</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-white text-sm">Health Factor:</span>
                  <span className={getHealthFactorColor(userAccountData.healthFactor)}>
                    {formatHealthFactor(userAccountData.healthFactor)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white text-sm">Liquidation Threshold:</span>
                  <span className="text-white">
                    {(Number(userAccountData.currentLiquidationThreshold) / 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Token Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white text-lg font-bold">Token Details</h3>
          <div className="flex items-center gap-2 text-sm text-[#9cabba]">
            <Activity className="w-4 h-4" />
            <span>Live data from Aave V3</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {supportedTokens.map(tokenAddress => (
            <EnhancedAaveCard key={tokenAddress} tokenAddress={tokenAddress} />
          ))}
        </div>
      </div>

      {/* Footer Links */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-[#3b4754]">
        <div className="flex items-center gap-4 text-sm text-[#9cabba]">
          <span>Last updated: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}</span>
          <span>•</span>
          <span>Auto-refresh: 30s</span>
        </div>
        
        <div className="flex items-center gap-4">
          <a
            href="https://app.aave.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm transition-colors"
          >
            <span>Open Aave App</span>
            <ExternalLink className="w-4 h-4" />
          </a>
          <a
            href={`https://testnet.snowtrace.io/address/${CONTRACT_CONFIG.YIELD_HUB_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm transition-colors"
          >
            <span>View Contract</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default AaveDashboard;