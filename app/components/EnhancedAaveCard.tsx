'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Shield, 
  AlertTriangle, 
  Info, 
  DollarSign,
  BarChart3,
  Clock,
  Zap,
  RefreshCw
} from 'lucide-react';
import { useWeb3 } from '../lib/Web3Context';
import { TOKEN_INFO } from '../lib/web3-config';
import AaveService, { 
  AaveReserveData, 
  EnhancedAPYData, 
  RiskMetrics 
} from '../lib/aave-service';

interface EnhancedAaveCardProps {
  tokenAddress: string;
}

const EnhancedAaveCard: React.FC<EnhancedAaveCardProps> = ({ tokenAddress }) => {
  const { provider, account, isConnected, chainId } = useWeb3();
  const [aaveService, setAaveService] = useState<AaveService | null>(null);
  const [reserveData, setReserveData] = useState<AaveReserveData | null>(null);
  const [apyData, setApyData] = useState<EnhancedAPYData | null>(null);
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const tokenInfo = TOKEN_INFO[tokenAddress as keyof typeof TOKEN_INFO];

  // Initialize Aave service
  useEffect(() => {
    if (provider && chainId === 43113) {
      const service = new AaveService(provider);
      setAaveService(service);
    } else {
      setAaveService(null);
    }
  }, [provider, chainId]);

  // Load Aave data
  const loadAaveData = async () => {
    if (!aaveService || !tokenInfo) return;

    setIsLoading(true);
    setError(null);

    try {
      const [reserve, apy, risk] = await Promise.all([
        aaveService.getTokenReserveData(tokenAddress),
        aaveService.getEnhancedAPYData(tokenAddress),
        aaveService.getRiskMetrics(tokenAddress)
      ]);

      setReserveData(reserve);
      setApyData(apy);
      setRiskMetrics(risk);
      setLastUpdate(new Date());
    } catch (err: any) {
      console.error('Error loading Aave data:', err);
      setError(err.message || 'Failed to load Aave data');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-load data when service is ready
  useEffect(() => {
    if (aaveService) {
      loadAaveData();
    }
  }, [aaveService]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!aaveService) return;

    const interval = setInterval(loadAaveData, 30000);
    return () => clearInterval(interval);
  }, [aaveService]);

  if (!tokenInfo) {
    return null;
  }

  const formatAPY = (rate: bigint) => AaveService.formatAPY(rate);
  const formatTVL = (tvl: bigint) => AaveService.formatTVL(tvl);
  const formatUtilization = (rate: bigint) => AaveService.formatUtilization(rate);
  const getRiskLevel = (score: bigint) => AaveService.getRiskLevel(score);

  const isDataStale = lastUpdate && (Date.now() - lastUpdate.getTime()) > 60000; // 1 minute

  return (
    <div className="bg-[#1b2127] border border-[#3b4754] rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{tokenInfo.icon}</span>
          <div>
            <h3 className="text-white text-lg font-bold">{tokenInfo.symbol}</h3>
            <p className="text-[#9cabba] text-sm">Aave V3 Integration</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Status Indicator */}
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            reserveData?.isActive && !reserveData?.isFrozen
              ? 'bg-green-900/30 text-green-400'
              : 'bg-red-900/30 text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              reserveData?.isActive && !reserveData?.isFrozen
                ? 'bg-green-400'
                : 'bg-red-400'
            }`} />
            {reserveData?.isActive && !reserveData?.isFrozen ? 'Active' : 'Inactive'}
          </div>
          
          {/* Refresh Button */}
          <button
            onClick={loadAaveData}
            disabled={isLoading}
            className="p-2 bg-[#283039] hover:bg-[#374151] disabled:opacity-50 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-white ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Connection Status */}
      {(!isConnected || chainId !== 43113) && (
        <div className="flex items-center gap-2 p-3 bg-orange-900/20 border border-orange-600 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-orange-400" />
          <span className="text-orange-400 text-sm font-medium">
            {!isConnected ? 'Connect wallet for live Aave data' : 'Switch to Fuji testnet'}
          </span>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-600 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-red-400 text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
          <span className="ml-2 text-white">Loading Aave data...</span>
        </div>
      )}

      {/* Main Data Display */}
      {!isLoading && reserveData && apyData && (
        <>
          {/* Primary Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Supply APY */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-[#9cabba] text-sm">Supply APY</span>
              </div>
              <p className="text-white text-xl font-bold">
                {formatAPY(apyData.currentAPY)}
              </p>
            </div>

            {/* Borrow APY */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-400" />
                <span className="text-[#9cabba] text-sm">Borrow APY</span>
              </div>
              <p className="text-white text-xl font-bold">
                {formatAPY(apyData.borrowAPY)}
              </p>
            </div>

            {/* Total Supply */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-400" />
                <span className="text-[#9cabba] text-sm">Total Supply</span>
              </div>
              <p className="text-white text-xl font-bold">
                {formatTVL(apyData.totalSupply)}
              </p>
            </div>

            {/* Utilization */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                <span className="text-[#9cabba] text-sm">Utilization</span>
              </div>
              <p className="text-white text-xl font-bold">
                {formatUtilization(apyData.utilizationRate)}
              </p>
            </div>
          </div>

          {/* Risk Metrics */}
          {riskMetrics && (
            <div className="space-y-3">
              <h4 className="text-white text-sm font-medium flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Risk Assessment
              </h4>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Overall Risk Score */}
                <div className="space-y-2">
                  <span className="text-[#9cabba] text-xs">Overall Risk</span>
                  <div className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      getRiskLevel(riskMetrics.riskScore).color
                    } bg-opacity-20`}>
                      {getRiskLevel(riskMetrics.riskScore).level}
                    </div>
                    <span className="text-white text-sm">
                      {Number(riskMetrics.riskScore)}/100
                    </span>
                  </div>
                </div>

                {/* Liquidity Risk */}
                <div className="space-y-2">
                  <span className="text-[#9cabba] text-xs">Liquidity Risk</span>
                  <div className="w-full bg-[#283039] rounded-full h-2">
                    <div 
                      className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Number(riskMetrics.liquidityRisk)}%` }}
                    />
                  </div>
                </div>

                {/* Volatility Risk */}
                <div className="space-y-2">
                  <span className="text-[#9cabba] text-xs">Volatility Risk</span>
                  <div className="w-full bg-[#283039] rounded-full h-2">
                    <div 
                      className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Number(riskMetrics.volatilityRisk)}%` }}
                    />
                  </div>
                </div>

                {/* Utilization Risk */}
                <div className="space-y-2">
                  <span className="text-[#9cabba] text-xs">Utilization Risk</span>
                  <div className="w-full bg-[#283039] rounded-full h-2">
                    <div 
                      className="bg-purple-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Number(riskMetrics.utilizationRisk)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Additional Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4 border-t border-[#3b4754]">
            {/* Protocol Details */}
            <div className="space-y-3">
              <h4 className="text-white text-sm font-medium flex items-center gap-2">
                <Info className="w-4 h-4" />
                Protocol Details
              </h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#9cabba]">LTV:</span>
                  <span className="text-white">{(Number(reserveData.ltv) / 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9cabba]">Liquidation Threshold:</span>
                  <span className="text-white">{(Number(reserveData.liquidationThreshold) / 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9cabba]">Reserve Factor:</span>
                  <span className="text-white">{(Number(reserveData.reserveFactor) / 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9cabba]">Borrowing:</span>
                  <span className={reserveData.borrowingEnabled ? 'text-green-400' : 'text-red-400'}>
                    {reserveData.borrowingEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            {/* Market Activity */}
            <div className="space-y-3">
              <h4 className="text-white text-sm font-medium flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Market Activity
              </h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#9cabba]">Total Borrowed:</span>
                  <span className="text-white">{formatTVL(apyData.totalBorrow)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9cabba]">Available Liquidity:</span>
                  <span className="text-white">
                    {formatTVL(apyData.totalSupply - apyData.totalBorrow)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9cabba]">Last Update:</span>
                  <span className={`${isDataStale ? 'text-yellow-400' : 'text-white'}`}>
                    {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9cabba]">Data Status:</span>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${
                      isDataStale ? 'bg-yellow-400' : 'bg-green-400'
                    }`} />
                    <span className={isDataStale ? 'text-yellow-400' : 'text-green-400'}>
                      {isDataStale ? 'Stale' : 'Fresh'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-[#3b4754] text-xs text-[#9cabba]">
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3" />
          <span>Auto-refresh: 30s</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Powered by Aave V3</span>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
};

export default EnhancedAaveCard;