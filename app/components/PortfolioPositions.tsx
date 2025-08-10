'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Wallet, 
  PiggyBank,
  CreditCard,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Eye,
  EyeOff
} from 'lucide-react';
import { useWeb3 } from '../lib/Web3Context';
import { TOKEN_INFO } from '../lib/web3-config';
import PortfolioService, { PortfolioPosition } from '../lib/portfolio-service';

const PortfolioPositions: React.FC = () => {
  const { provider, account, isConnected, chainId } = useWeb3();
  const [portfolioService, setPortfolioService] = useState<PortfolioService | null>(null);
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSmallBalances, setShowSmallBalances] = useState(false);

  // Initialize portfolio service
  useEffect(() => {
    if (provider && chainId === 43113) {
      const service = new PortfolioService(provider);
      setPortfolioService(service);
    } else {
      setPortfolioService(null);
    }
  }, [provider, chainId]);

  // Load positions
  const loadPositions = async () => {
    if (!portfolioService || !account) return;

    setIsLoading(true);
    setError(null);

    try {
      const summary = await portfolioService.getPortfolioSummary(account);
      if (summary) {
        setPositions(summary.positions);
      }
    } catch (err: any) {
      console.error('Error loading positions:', err);
      setError(err.message || 'Failed to load positions');
    } finally {
      setIsLoading(false);
    }
  };

  // Load data when service and account are ready
  useEffect(() => {
    if (portfolioService && account) {
      loadPositions();
    }
  }, [portfolioService, account]);

  // Filter positions based on balance threshold
  const filteredPositions = positions.filter(position => {
    const totalValue = position.balanceUSD + position.aaveSuppliedUSD;
    return showSmallBalances || totalValue >= 1; // Show positions worth $1 or more
  });

  const formatCurrency = (amount: number) => PortfolioService.formatCurrency(amount);
  const formatAPY = (apy: number) => PortfolioService.formatAPY(apy);

  const getPositionTypeIcon = (position: PortfolioPosition) => {
    if (position.aaveSuppliedUSD > 0 && position.aaveBorrowedUSD > 0) {
      return <CreditCard className="w-4 h-4 text-purple-400" />;
    } else if (position.aaveSuppliedUSD > 0) {
      return <PiggyBank className="w-4 h-4 text-green-400" />;
    } else {
      return <Wallet className="w-4 h-4 text-blue-400" />;
    }
  };

  const getPositionType = (position: PortfolioPosition) => {
    if (position.aaveSuppliedUSD > 0 && position.aaveBorrowedUSD > 0) {
      return 'Leveraged';
    } else if (position.aaveSuppliedUSD > 0) {
      return 'Supplied';
    } else {
      return 'Wallet';
    }
  };

  if (!isConnected || !account || chainId !== 43113) {
    return (
      <div className="flex items-center gap-2 p-4 bg-orange-900/20 border border-orange-600 rounded-lg">
        <AlertTriangle className="w-4 h-4 text-orange-400" />
        <span className="text-orange-400 text-sm font-medium">
          Connect your wallet to Fuji testnet to view portfolio positions
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white text-lg font-bold">Portfolio Positions</h3>
          <p className="text-[#9cabba] text-sm">
            Your token balances and Aave positions
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Toggle Small Balances */}
          <button
            onClick={() => setShowSmallBalances(!showSmallBalances)}
            className="flex items-center gap-2 px-3 py-1 bg-[#283039] hover:bg-[#374151] text-white text-xs font-medium rounded-lg transition-colors"
          >
            {showSmallBalances ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {showSmallBalances ? 'Hide Small' : 'Show All'}
          </button>
          
          {/* Refresh Button */}
          <button
            onClick={loadPositions}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1 bg-[#283039] hover:bg-[#374151] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

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
          <span className="ml-2 text-white">Loading positions...</span>
        </div>
      )}

      {/* Positions Grid */}
      {!isLoading && filteredPositions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredPositions.map((position) => {
            const tokenInfo = TOKEN_INFO[position.tokenAddress as keyof typeof TOKEN_INFO];
            const totalValue = position.balanceUSD + position.aaveSuppliedUSD;
            const netPosition = position.aaveSuppliedUSD - position.aaveBorrowedUSD;
            
            return (
              <div
                key={position.tokenAddress}
                className="bg-[#1b2127] border border-[#3b4754] rounded-lg p-4 hover:border-[#00ffaa] transition-all duration-300"
              >
                {/* Token Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{tokenInfo?.icon || '🪙'}</span>
                    <div>
                      <h4 className="text-white font-medium">{position.symbol}</h4>
                      <p className="text-[#9cabba] text-xs">{position.name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getPositionTypeIcon(position)}
                    <span className="text-[#9cabba] text-xs font-medium">
                      {getPositionType(position)}
                    </span>
                  </div>
                </div>

                {/* Position Values */}
                <div className="space-y-3">
                  {/* Total Value */}
                  <div className="flex justify-between items-center">
                    <span className="text-[#9cabba] text-sm">Total Value:</span>
                    <span className="text-white font-medium">
                      {formatCurrency(totalValue)}
                    </span>
                  </div>

                  {/* Wallet Balance */}
                  {position.balanceUSD > 0.01 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[#9cabba] text-sm flex items-center gap-1">
                        <Wallet className="w-3 h-3" />
                        Wallet:
                      </span>
                      <span className="text-blue-400 font-medium">
                        {formatCurrency(position.balanceUSD)}
                      </span>
                    </div>
                  )}

                  {/* Aave Supplied */}
                  {position.aaveSuppliedUSD > 0.01 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[#9cabba] text-sm flex items-center gap-1">
                        <PiggyBank className="w-3 h-3" />
                        Supplied:
                      </span>
                      <span className="text-green-400 font-medium">
                        {formatCurrency(position.aaveSuppliedUSD)}
                      </span>
                    </div>
                  )}

                  {/* Aave Borrowed */}
                  {position.aaveBorrowedUSD > 0.01 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[#9cabba] text-sm flex items-center gap-1">
                        <CreditCard className="w-3 h-3" />
                        Borrowed:
                      </span>
                      <span className="text-red-400 font-medium">
                        {formatCurrency(position.aaveBorrowedUSD)}
                      </span>
                    </div>
                  )}

                  {/* Net Position (if leveraged) */}
                  {position.aaveSuppliedUSD > 0 && position.aaveBorrowedUSD > 0 && (
                    <div className="flex justify-between items-center pt-2 border-t border-[#3b4754]">
                      <span className="text-[#9cabba] text-sm">Net Position:</span>
                      <span className={`font-medium ${
                        netPosition >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatCurrency(Math.abs(netPosition))}
                      </span>
                    </div>
                  )}

                  {/* APY and Yield */}
                  {position.currentAPY > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[#9cabba] text-sm flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Current APY:
                      </span>
                      <span className="text-[#00ffaa] font-medium">
                        {formatAPY(position.currentAPY)}
                      </span>
                    </div>
                  )}

                  {/* Earned Yield */}
                  {position.earnedYield > 0.01 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[#9cabba] text-sm">30d Yield:</span>
                      <span className="text-[#00ffaa] font-medium">
                        {formatCurrency(position.earnedYield)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4 pt-3 border-t border-[#3b4754]">
                  <a
                    href={`https://testnet.snowtrace.io/address/${position.tokenAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 px-3 py-1 bg-[#283039] hover:bg-[#374151] text-white text-xs font-medium rounded-lg transition-colors flex-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View Token
                  </a>
                  
                  {position.aaveSuppliedUSD > 0 && (
                    <a
                      href="https://app.aave.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors flex-1"
                    >
                      <DollarSign className="w-3 h-3" />
                      Manage
                    </a>
                  )}
                </div>

                {/* Last Update */}
                <div className="flex justify-center mt-2">
                  <span className="text-[#777] text-xs">
                    Updated: {new Date(position.lastUpdate).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredPositions.length === 0 && (
        <div className="text-center py-8">
          <Wallet className="w-12 h-12 text-[#777] mx-auto mb-3" />
          <h3 className="text-white text-lg font-medium mb-2">No Positions Found</h3>
          <p className="text-[#9cabba] text-sm mb-4">
            {positions.length === 0 
              ? "You don't have any token balances or Aave positions yet."
              : "All positions are below the display threshold. Click 'Show All' to see them."
            }
          </p>
          <div className="flex justify-center gap-3">
            <a
              href="https://app.aave.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <DollarSign className="w-4 h-4" />
              Open Aave
            </a>
            <button
              onClick={() => setShowSmallBalances(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#283039] hover:bg-[#374151] text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4" />
              Show All Balances
            </button>
          </div>
        </div>
      )}

      {/* Summary Footer */}
      {!isLoading && filteredPositions.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-[#3b4754] text-sm text-[#9cabba]">
          <span>
            Showing {filteredPositions.length} of {positions.length} positions
          </span>
          <span>
            Auto-refresh: 60s
          </span>
        </div>
      )}
    </div>
  );
};

export default PortfolioPositions;