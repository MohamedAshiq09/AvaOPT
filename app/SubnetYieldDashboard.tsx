'use client';

import React, { useEffect, useRef, useState } from 'react';
import Navbar from './Navbar';
import YieldDataCard from './components/YieldDataCard';
import YieldSummaryTable from './components/YieldSummaryTable';
import AaveDashboard from './components/AaveDashboard';
import PortfolioOverview from './components/PortfolioOverview';
import PortfolioPositions from './components/PortfolioPositions';
import CrossChainYieldComparison from './components/CrossChainYieldComparison';
import { useWeb3 } from './lib/Web3Context';

interface SubnetData {
  name: string;
  pool: string;
  yield: string;
  status: 'Active' | 'Inactive';
}

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
}

interface TvlData {
  name: string;
  height: number;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, isPositive }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (card) {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      const timer = setTimeout(() => {
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div
      ref={cardRef}
      className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-lg p-6 bg-[#111418] border border-[#2a2a2a] hover:border-[#00ffaa] transition-all duration-300 hover:shadow-[0_0_15px_rgba(0,255,170,0.2)]"
    >
      <p className="text-[#aaa] text-base font-medium leading-normal">{title}</p>
      <p className="text-white tracking-light text-2xl font-bold leading-tight">{value}</p>
      <p className={`text-base font-medium leading-normal ${isPositive ? 'text-[#00ffaa]' : 'text-[#ff5555]'}`}>
        {change} {isPositive ? '↑' : '↓'}
      </p>
    </div>
  );
};

const SubnetYieldDashboard: React.FC = () => {
  const {
    tokenYieldData,
    supportedTokens,
    isConnected,
    chainId,
    isLoadingData,
    autoRefresh,
    setAutoRefresh
  } = useWeb3();

  const [activeTab, setActiveTab] = useState<'overview' | 'portfolio' | 'aave'>('overview');

  // Calculate aggregated metrics from real data
  const calculateTotalTVL = () => {
    let total = BigInt(0);
    supportedTokens.forEach(token => {
      const data = tokenYieldData[token];
      if (data && !data.error) {
        total += data.rawTVL;
      }
    });
    return total;
  };

  const calculateAverageAPY = () => {
    let totalAPY = BigInt(0);
    let count = 0;
    supportedTokens.forEach(token => {
      const data = tokenYieldData[token];
      if (data && !data.error && data.rawAPY > 0) {
        totalAPY += data.rawAPY;
        count++;
      }
    });
    return count > 0 ? totalAPY / BigInt(count) : BigInt(0);
  };

  const formatTVLFromBigInt = (tvl: bigint) => {
    const tvlNum = Number(tvl) / 1e18;
    if (tvlNum >= 1e9) return `$${(tvlNum / 1e9).toFixed(2)}B`;
    if (tvlNum >= 1e6) return `$${(tvlNum / 1e6).toFixed(2)}M`;
    if (tvlNum >= 1e3) return `$${(tvlNum / 1e3).toFixed(2)}K`;
    return `$${tvlNum.toFixed(2)}`;
  };

  const formatAPYFromBps = (bps: bigint) => {
    return `${(Number(bps) / 100).toFixed(2)}%`;
  };

  const totalTVL = calculateTotalTVL();
  const averageAPY = calculateAverageAPY();

  const subnetData: SubnetData[] = [
    { name: 'Subnet A', pool: 'Pool X', yield: '5.2%', status: 'Active' },
    { name: 'Subnet B', pool: 'Pool Y', yield: '4.8%', status: 'Active' },
    { name: 'Subnet C', pool: 'Pool Z', yield: '3.5%', status: 'Inactive' },
    { name: 'Subnet D', pool: 'Pool W', yield: '1.7%', status: 'Active' },
  ];

  const tvlData: TvlData[] = [
    { name: 'Subnet A', height: 60 },
    { name: 'Subnet B', height: 40 },
    { name: 'Subnet C', height: 30 },
    { name: 'Subnet D', height: 40 },
  ];

  // Animation for chart bars
  useEffect(() => {
    const bars = document.querySelectorAll('.tvl-bar');
    bars.forEach((bar, index) => {
      const element = bar as HTMLElement;
      element.style.height = '0';
      setTimeout(() => {
        element.style.transition = `height 0.8s ease ${index * 0.1}s`;
        element.style.height = `${element.dataset.height}%`;
      }, 100);
    });
  }, []);

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
            {/* Page Header */}
            <div className="flex flex-wrap justify-between gap-3 p-4">
              <div className="flex min-w-72 flex-col gap-3">
                <h1 className="text-white tracking-light text-2xl md:text-[32px] font-bold leading-tight">
                  Subnet<span className="text-[#00ffaa]">Yield</span> Core
                </h1>
                <p className="text-[#777] text-sm font-normal leading-normal">
                  Cross-subnet DeFi yield aggregator using Avalanche Warp Messaging (AWM)
                </p>
                <p className="text-[#9cabba] text-sm font-normal leading-normal">
                  Live data from C-Chain (Aave V3) and Avalanche subnets via AWM.
                  {isConnected && chainId === 43113
                    ? ' Connected to Fuji testnet - Cross-chain data active.'
                    : ' Connect to Fuji testnet for live cross-chain data.'}
                </p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4">
                {/* Tab Navigation */}
                <div className="flex bg-[#1a1a1a] rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'overview'
                      ? 'bg-[#00ffaa] text-black'
                      : 'text-white hover:text-[#00ffaa]'
                      }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('portfolio')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'portfolio'
                      ? 'bg-[#00ffaa] text-black'
                      : 'text-white hover:text-[#00ffaa]'
                      }`}
                  >
                    Portfolio
                  </button>
                  <button
                    onClick={() => setActiveTab('aave')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'aave'
                      ? 'bg-[#00ffaa] text-black'
                      : 'text-white hover:text-[#00ffaa]'
                      }`}
                  >
                    Aave Details
                  </button>
                </div>

                {/* Auto-refresh toggle */}
                <label className="flex items-center gap-2 text-white text-sm">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="rounded"
                  />
                  Auto-refresh
                </label>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <>
                {/* Real-Time Metrics Cards */}
                <div className="flex flex-wrap gap-4 p-4">
                  <MetricCard
                    title="Total Value Locked (TVL)"
                    value={isLoadingData ? "Loading..." : formatTVLFromBigInt(totalTVL)}
                    change={isConnected && chainId === 43113 ? "Live Data" : "Connect for Live Data"}
                    isPositive={true}
                  />
                  <MetricCard
                    title="Cross-Chain Avg APY"
                    value={isLoadingData ? "Loading..." : formatAPYFromBps(averageAPY)}
                    change={isConnected && chainId === 43113 ? "C-Chain + Subnet" : "Connect Wallet"}
                    isPositive={true}
                  />
                  <MetricCard
                    title="AWM Status"
                    value={isConnected ? (chainId === 43113 ? "Cross-Chain Active" : `Chain ${chainId}`) : "Disconnected"}
                    change={isConnected && chainId === 43113 ? "Subnet Connected" : "Connect for AWM"}
                    isPositive={isConnected && chainId === 43113}
                  />
                </div>

                {/* Real-Time Yield Data Cards */}
                <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">
                  Cross-Chain Token Yields
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-4 py-3">
                  {supportedTokens.map(tokenAddress => (
                    <YieldDataCard key={tokenAddress} tokenAddress={tokenAddress} />
                  ))}
                </div>

                {/* TVL Chart */}
                <div className="group">
                  <h2 className="text-white text-xl md:text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">
                    TVL Across Subnets
                    <span className="block h-0.5 w-0 bg-[#00ffaa] transition-all duration-500 group-hover:w-16 mt-1"></span>
                  </h2>
                  <div className="flex flex-wrap gap-4 px-4 py-6">
                    <div className="flex min-w-72 flex-1 flex-col gap-2 rounded-lg border border-[#2a2a2a] p-6 bg-[#111418] hover:border-[#00ffaa] transition-all duration-300">
                      <p className="text-[#aaa] text-base font-medium leading-normal">TVL Distribution</p>
                      <p className="text-white tracking-light text-2xl md:text-[32px] font-bold leading-tight truncate">$12.5M</p>
                      <div className="flex gap-1">
                        <p className="text-[#777] text-base font-normal leading-normal">Last 30 Days</p>
                        <p className="text-[#00ffaa] text-base font-medium leading-normal">+2.3%</p>
                      </div>
                      <div className="grid min-h-[180px] grid-flow-col gap-4 md:gap-6 grid-rows-[1fr_auto] items-end justify-items-center px-3 mt-4">
                        {tvlData.map((item, index) => (
                          <React.Fragment key={index}>
                            <div
                              className="tvl-bar border-[#00ffaa] bg-gradient-to-t from-[#00ffaa30] to-[#00ffaa10] border-t-2 w-full rounded-t-sm"
                              data-height={item.height}
                              style={{ height: '0' }}
                            />
                            <p className="text-[#777] text-xs md:text-[13px] font-bold leading-normal tracking-[0.015em] group-hover:text-[#00ffaa] transition-colors duration-300">
                              {item.name}
                            </p>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cross-Chain Yield Comparison */}
                <div className="px-4 py-6">
                  <CrossChainYieldComparison />
                </div>

                {/* Real-Time Yield Summary Table */}
                <YieldSummaryTable />

                {/* Portfolio Overview with Backend Integration */}
                <div className="px-4 py-6">
                  <PortfolioOverview />
                </div>
              </>
            )}

            {/* Portfolio Tab */}
            {activeTab === 'portfolio' && (
              <div className="p-4 space-y-6">
                <PortfolioOverview />
                <PortfolioPositions />
              </div>
            )}

            {/* Aave Dashboard Tab */}
            {activeTab === 'aave' && (
              <div className="p-4">
                <AaveDashboard />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubnetYieldDashboard;