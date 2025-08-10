// 'use client';

// import React, { useState, useRef, useEffect } from 'react';
// import Navbar from './Navbar';
// import YieldDataCard from './components/YieldDataCard';
// import YieldSummaryTable from './components/YieldSummaryTable';
// import AaveDashboard from './components/AaveDashboard';
// import PortfolioOverview from './components/PortfolioOverview';
// import PortfolioPositions from './components/PortfolioPositions';
// import CrossChainYieldComparison from './components/CrossChainYieldComparison';
// import { useWeb3 } from './lib/Web3Context';

// interface MetricCardProps {
//   title: string;
//   value: string;
//   change: string;
//   isPositive: boolean;
// }

// const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, isPositive }) => {
//   const cardRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     const card = cardRef.current;
//     if (card) {
//       card.style.opacity = '0';
//       card.style.transform = 'translateY(20px)';
//       const timer = setTimeout(() => {
//         card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
//         card.style.opacity = '1';
//         card.style.transform = 'translateY(0)';
//       }, 100);
//       return () => clearTimeout(timer);
//     }
//   }, []);

//   return (
//     <div
//       ref={cardRef}
//       className="flex min-w-[158px] flex-1 flex-col gap-3 rounded-xl p-6 bg-white/5 backdrop-blur-sm border border-white/10 hover:border-[#00ffaa]/50 hover:bg-white/10 transition-all duration-300 group"
//     >
//       <p className="text-white/60 text-sm font-medium">{title}</p>
//       <p className="text-white text-3xl font-bold group-hover:text-[#00ffaa] transition-colors">{value}</p>
//       <p className={`text-sm font-semibold flex items-center gap-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
//         <span>{change}</span>
//         <span className="text-lg">{isPositive ? '↗' : '↘'}</span>
//       </p>
//     </div>
//   );
// };

// const SubnetYieldDashboard: React.FC = () => {
//   const {
//     tokenYieldData,
//     supportedTokens,
//     isConnected,
//     chainId,
//     isLoadingData,
//     autoRefresh,
//     setAutoRefresh
//   } = useWeb3();

//   const [activeTab, setActiveTab] = useState<'overview' | 'portfolio' | 'aave'>('overview');

//   // Calculate aggregated metrics from real data
//   const calculateTotalTVL = () => {
//     let total = BigInt(0);
//     supportedTokens.forEach(token => {
//       const data = tokenYieldData[token];
//       if (data && !data.error) {
//         total += data.rawTVL;
//       }
//     });
//     return total;
//   };

//   const calculateAverageAPY = () => {
//     let totalAPY = BigInt(0);
//     let count = 0;
//     supportedTokens.forEach(token => {
//       const data = tokenYieldData[token];
//       if (data && !data.error && data.rawAPY > 0) {
//         totalAPY += data.rawAPY;
//         count++;
//       }
//     });
//     return count > 0 ? totalAPY / BigInt(count) : BigInt(0);
//   };

//   const formatTVLFromBigInt = (tvl: bigint) => {
//     const tvlNum = Number(tvl) / 1e18;
//     if (tvlNum >= 1e9) return `$${(tvlNum / 1e9).toFixed(2)}B`;
//     if (tvlNum >= 1e6) return `$${(tvlNum / 1e6).toFixed(2)}M`;
//     if (tvlNum >= 1e3) return `$${(tvlNum / 1e3).toFixed(2)}K`;
//     return `$${tvlNum.toFixed(2)}`;
//   };

//   const formatAPYFromBps = (bps: bigint) => {
//     return `${(Number(bps) / 100).toFixed(2)}%`;
//   };

//   const totalTVL = calculateTotalTVL();
//   const averageAPY = calculateAverageAPY();



//   return (
//     <div
//       className="relative flex size-full min-h-screen flex-col bg-[#0a0a0a] overflow-x-hidden"
//       style={{ fontFamily: 'Inter, "Noto Sans", sans-serif' }}
//     >
//       <div className="layout-container flex h-full grow flex-col">
//         {/* Header */}
//         <Navbar />

//         {/* Main Content */}
//         <div className="px-4 md:px-40 flex flex-1 justify-center py-5">
//           <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
//             {/* Page Header */}
//             <div className="flex flex-wrap justify-between gap-3 p-4">
//               <div className="flex min-w-72 flex-col gap-3">
//                 <h1 className="text-white tracking-light text-2xl md:text-[32px] font-bold leading-tight">
//                   Subnet<span className="text-[#00ffaa]">Yield</span> Core
//                 </h1>
//                 <p className="text-[#777] text-sm font-normal leading-normal">
//                   Cross-subnet DeFi yield aggregator using Avalanche Warp Messaging (AWM)
//                 </p>
//                 <p className="text-[#9cabba] text-sm font-normal leading-normal">
//                   Live data from C-Chain (Aave V3) and Avalanche subnets via AWM.
//                   {isConnected && chainId === 43113
//                     ? ' Connected to Fuji testnet - Cross-chain data active.'
//                     : ' Connect to Fuji testnet for live cross-chain data.'}
//                 </p>
//               </div>

//               {/* Controls */}
//               <div className="flex items-center gap-4">
//                 {/* Tab Navigation */}
//                 <div className="flex bg-[#1a1a1a] rounded-lg p-1">
//                   <button
//                     onClick={() => setActiveTab('overview')}
//                     className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'overview'
//                       ? 'bg-[#00ffaa] text-black'
//                       : 'text-white hover:text-[#00ffaa]'
//                       }`}
//                   >
//                     Overview
//                   </button>
//                   <button
//                     onClick={() => setActiveTab('portfolio')}
//                     className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'portfolio'
//                       ? 'bg-[#00ffaa] text-black'
//                       : 'text-white hover:text-[#00ffaa]'
//                       }`}
//                   >
//                     Portfolio
//                   </button>
//                   <button
//                     onClick={() => setActiveTab('aave')}
//                     className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'aave'
//                       ? 'bg-[#00ffaa] text-black'
//                       : 'text-white hover:text-[#00ffaa]'
//                       }`}
//                   >
//                     Aave Details
//                   </button>
//                 </div>

//                 {/* Auto-refresh toggle */}
//                 <label className="flex items-center gap-2 text-white text-sm">
//                   <input
//                     type="checkbox"
//                     checked={autoRefresh}
//                     onChange={(e) => setAutoRefresh(e.target.checked)}
//                     className="rounded"
//                   />
//                   Auto-refresh
//                 </label>
//               </div>
//             </div>

//             {/* Tab Content */}
//             {activeTab === 'overview' && (
//               <>
//                 {/* Real-Time Metrics Cards */}
//                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
//                   <MetricCard
//                     title="Total Value Locked (TVL)"
//                     value={isLoadingData ? "Loading..." : formatTVLFromBigInt(totalTVL)}
//                     change={isConnected && chainId === 43113 ? "Live Data" : "Connect for Live Data"}
//                     isPositive={true}
//                   />
//                   <MetricCard
//                     title="Cross-Chain Avg APY"
//                     value={isLoadingData ? "Loading..." : formatAPYFromBps(averageAPY)}
//                     change={isConnected && chainId === 43113 ? "C-Chain + Subnet" : "Connect Wallet"}
//                     isPositive={true}
//                   />
//                   <MetricCard
//                     title="AWM Status"
//                     value={isConnected ? (chainId === 43113 ? "Cross-Chain Active" : `Chain ${chainId}`) : "Disconnected"}
//                     change={isConnected && chainId === 43113 ? "Subnet Connected" : "Connect for AWM"}
//                     isPositive={isConnected && chainId === 43113}
//                   />
//                 </div>

//                 {/* Real-Time Yield Data Cards */}
//                 <div className="px-6 py-4">
//                   <h2 className="text-white text-2xl font-bold mb-6">
//                     Cross-Chain Token Yields
//                   </h2>
//                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//                     {supportedTokens.map(tokenAddress => (
//                       <YieldDataCard key={tokenAddress} tokenAddress={tokenAddress} />
//                     ))}
//                   </div>
//                 </div>



//                 {/* Cross-Chain Yield Comparison */}
//                 <div className="px-6 py-8">
//                   <CrossChainYieldComparison />
//                 </div>

//                 {/* Real-Time Yield Summary Table */}
//                 <div className="px-6 py-8">
//                   <YieldSummaryTable />
//                 </div>

//                 {/* Portfolio Overview with Backend Integration */}
//                 <div className="px-6 py-8">
//                   <PortfolioOverview />
//                 </div>
//               </>
//             )}

//             {/* Portfolio Tab */}
//             {activeTab === 'portfolio' && (
//               <div className="p-4 space-y-6">
//                 <PortfolioOverview />
//                 <PortfolioPositions />
//               </div>
//             )}

//             {/* Aave Dashboard Tab */}
//             {activeTab === 'aave' && (
//               <div className="p-4">
//                 <AaveDashboard />
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default SubnetYieldDashboard;



'use client';

import React, { useState, useRef, useEffect } from 'react';
import Navbar from './Navbar';
import YieldDataCard from './components/YieldDataCard';
import YieldSummaryTable from './components/YieldSummaryTable';
import AaveDashboard from './components/AaveDashboard';
import PortfolioOverview from './components/PortfolioOverview';
import PortfolioPositions from './components/PortfolioPositions';
import CrossChainYieldComparison from './components/CrossChainYieldComparison';
import { useWeb3 } from './lib/Web3Context';

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
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
      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6 hover:border-[#00ffaa]/30 hover:bg-white/8 transition-all duration-300"
    >
      <div className="space-y-4">
        <h3 className="text-white/70 text-sm font-medium">{title}</h3>
        <p className="text-white text-2xl font-semibold">{value}</p>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {change}
          </span>
          <span className="text-lg">
            {isPositive ? '↗' : '↘'}
          </span>
        </div>
      </div>
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

  return (
    <div
      className="min-h-screen bg-[#0a0a0a]"
      style={{ fontFamily: 'Inter, "Noto Sans", sans-serif' }}
    >
      {/* Header */}
      <Navbar />

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            
            {/* Title Section */}
            <div className="flex-1">
              <h1 className="text-white text-3xl font-bold mb-3">
                Subnet<span className="text-[#00ffaa]">Yield</span> Core
              </h1>
              <p className="text-gray-400 text-base mb-4 max-w-2xl">
                Cross-subnet DeFi yield aggregator using Avalanche Warp Messaging (AWM)
              </p>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${isConnected && chainId === 43113 ? 'bg-[#00ffaa]' : 'bg-gray-500'}`}></div>
                <p className="text-gray-300 text-sm">
                  {isConnected && chainId === 43113
                    ? 'Connected to Fuji testnet - Cross-chain data active'
                    : 'Connect to Fuji testnet for live cross-chain data'}
                </p>
              </div>
            </div>

            {/* Controls Section */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              
              {/* Tab Navigation */}
              <div className="flex bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-1">
                {[
                  { key: 'overview', label: 'Overview' },
                  { key: 'portfolio', label: 'Portfolio' },
                  { key: 'aave', label: 'Aave Details' }
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key as any)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                      activeTab === key
                        ? 'bg-[#00ffaa] text-black'
                        : 'text-white hover:text-[#00ffaa] hover:bg-white/5'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Auto-refresh Toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4 text-[#00ffaa] bg-transparent border-2 border-white/20 rounded focus:ring-[#00ffaa] focus:ring-2"
                />
                <span className="text-white text-sm font-medium">Auto-refresh</span>
              </label>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard
                title="Total Value Locked"
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
                value={isConnected ? (chainId === 43113 ? "Active" : `Chain ${chainId}`) : "Disconnected"}
                change={isConnected && chainId === 43113 ? "Subnet Connected" : "Connect for AWM"}
                isPositive={isConnected && chainId === 43113}
              />
            </div>

            {/* Token Yields Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-white text-xl font-semibold">Cross-Chain Token Yields</h2>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#00ffaa] rounded-full animate-pulse"></div>
                  <span className="text-gray-400 text-sm">Live Data</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {supportedTokens.map(tokenAddress => (
                  <YieldDataCard key={tokenAddress} tokenAddress={tokenAddress} />
                ))}
              </div>
            </div>

            {/* Cross-Chain Yield Comparison */}
            {/* <div className="space-y-4">
              <h2 className="text-white text-xl font-semibold">Cross-Chain Yield Comparison</h2>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
                <CrossChainYieldComparison />
              </div>
            </div> */}

            {/* Yield Summary Table */}
            <div className="space-y-4">
              <h2 className="text-white text-xl font-semibold">Yield Summary</h2>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
                <YieldSummaryTable />
              </div>
            </div>

            {/* Portfolio Overview */}
            <div className="space-y-4">
              <h2 className="text-white text-xl font-semibold">Portfolio Overview</h2>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
                <PortfolioOverview />
              </div>
            </div>
          </div>
        )}

        {/* Portfolio Tab */}
        {activeTab === 'portfolio' && (
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
              <PortfolioOverview />
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
              <PortfolioPositions />
            </div>
          </div>
        )}

        {/* Aave Dashboard Tab */}
        {activeTab === 'aave' && (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
            <AaveDashboard />
          </div>
        )}
      </div>
    </div>
  );
};

export default SubnetYieldDashboard;