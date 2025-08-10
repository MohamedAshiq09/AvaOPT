import React from 'react';
import Navbar from './Navbar';
import YieldDataCard from './components/YieldDataCard';
import YieldSummaryTable from './components/YieldSummaryTable';
import { useWeb3 } from './lib/Web3Context';
import { CONTRACT_CONFIG } from './lib/web3-config';

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

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, isPositive }) => (
  <div className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-lg p-6 bg-[#283039]">
    <p className="text-white text-base font-medium leading-normal">{title}</p>
    <p className="text-white tracking-light text-2xl font-bold leading-tight">{value}</p>
    <p className={`text-base font-medium leading-normal ${isPositive ? 'text-[#0bda5b]' : 'text-[#fa6238]'}`}>
      {change}
    </p>
  </div>
);

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

  // Calculate aggregated metrics from real data
  const calculateTotalTVL = () => {
    let total = 0n;
    supportedTokens.forEach(token => {
      const data = tokenYieldData[token];
      if (data && !data.error) {
        total += data.rawTVL;
      }
    });
    return total;
  };

  const calculateAverageAPY = () => {
    let totalAPY = 0n;
    let count = 0;
    supportedTokens.forEach(token => {
      const data = tokenYieldData[token];
      if (data && !data.error && data.rawAPY > 0) {
        totalAPY += data.rawAPY;
        count++;
      }
    });
    return count > 0 ? totalAPY / BigInt(count) : 0n;
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

  const tvlData = [
    { name: 'Subnet A', height: 60 },
    { name: 'Subnet B', height: 40 },
    { name: 'Subnet C', height: 30 },
    { name: 'Subnet D', height: 40 },
  ];

  return (
    <div 
      className="relative flex size-full min-h-screen flex-col bg-[#111418] dark group/design-root overflow-x-hidden" 
      style={{ fontFamily: 'Inter, "Noto Sans", sans-serif' }}
    >
      <div className="layout-container flex h-full grow flex-col">
        {/* Header */}
        <Navbar />

        {/* Main Content */}
        <div className="px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
            {/* Page Header */}
            <div className="flex flex-wrap justify-between gap-3 p-4">
              <div className="flex min-w-72 flex-col gap-3">
                <p className="text-white tracking-light text-[32px] font-bold leading-tight">
                  Real-Time Yield Dashboard
                </p>
                <p className="text-[#9cabba] text-sm font-normal leading-normal">
                  Live Aave yield data from Avalanche Fuji testnet. 
                  {isConnected && chainId === 43113 
                    ? ' Connected to Fuji testnet.' 
                    : ' Connect to Fuji testnet for live data.'}
                </p>
              </div>
              
              {/* Auto-refresh toggle */}
              <div className="flex items-center gap-2">
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

            {/* Real-Time Metrics Cards */}
            <div className="flex flex-wrap gap-4 p-4">
              <MetricCard
                title="Total Value Locked (TVL)"
                value={isLoadingData ? "Loading..." : formatTVLFromBigInt(totalTVL)}
                change={isConnected && chainId === 43113 ? "Live Data" : "Connect for Live Data"}
                isPositive={true}
              />
              <MetricCard
                title="Average Aave APY"
                value={isLoadingData ? "Loading..." : formatAPYFromBps(averageAPY)}
                change={isConnected && chainId === 43113 ? "Real-time" : "Connect Wallet"}
                isPositive={true}
              />
              <MetricCard
                title="Network Status"
                value={isConnected ? (chainId === 43113 ? "Fuji Connected" : `Chain ${chainId}`) : "Disconnected"}
                change={isConnected && chainId === 43113 ? "Ready" : "Action Required"}
                isPositive={isConnected && chainId === 43113}
              />
            </div>

            {/* Real-Time Yield Data Cards */}
            <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">
              Live Token Yields
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-4 py-3">
              {supportedTokens.map(tokenAddress => (
                <YieldDataCard key={tokenAddress} tokenAddress={tokenAddress} />
              ))}
            </div>

            {/* TVL Chart */}
            <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">
              TVL Across Subnets
            </h2>
            <div className="flex flex-wrap gap-4 px-4 py-6">
              <div className="flex min-w-72 flex-1 flex-col gap-2 rounded-lg border border-[#3b4754] p-6">
                <p className="text-white text-base font-medium leading-normal">TVL Distribution</p>
                <p className="text-white tracking-light text-[32px] font-bold leading-tight truncate">$12.5M</p>
                <div className="flex gap-1">
                  <p className="text-[#9cabba] text-base font-normal leading-normal">Last 30 Days</p>
                  <p className="text-[#0bda5b] text-base font-medium leading-normal">+2.3%</p>
                </div>
                <div className="grid min-h-[180px] grid-flow-col gap-6 grid-rows-[1fr_auto] items-end justify-items-center px-3">
                  {tvlData.map((item, index) => (
                    <React.Fragment key={index}>
                      <div
                        className="border-[#9cabba] bg-[#283039] border-t-2 w-full"
                        style={{ height: `${item.height}%` }}
                      />
                      <p className="text-[#9cabba] text-[13px] font-bold leading-normal tracking-[0.015em]">
                        {item.name}
                      </p>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            {/* Real-Time Yield Summary Table */}
            <YieldSummaryTable />

            {/* Portfolio Chart */}
            <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">
              Portfolio Overview
            </h2>
            <div className="flex flex-wrap gap-4 px-4 py-6">
              <div className="flex min-w-72 flex-1 flex-col gap-2 rounded-lg border border-[#3b4754] p-6">
                <p className="text-white text-base font-medium leading-normal">Portfolio Value Over Time</p>
                <p className="text-white tracking-light text-[32px] font-bold leading-tight truncate">$50,000</p>
                <div className="flex gap-1">
                  <p className="text-[#9cabba] text-base font-normal leading-normal">Last 90 Days</p>
                  <p className="text-[#0bda5b] text-base font-medium leading-normal">+8.5%</p>
                </div>
                <div className="flex min-h-[180px] flex-1 flex-col gap-8 py-4">
                  <svg
                    width="100%"
                    height="148"
                    viewBox="-3 0 478 150"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M0 109C18.1538 109 18.1538 21 36.3077 21C54.4615 21 54.4615 41 72.6154 41C90.7692 41 90.7692 93 108.923 93C127.077 93 127.077 33 145.231 33C163.385 33 163.385 101 181.538 101C199.692 101 199.692 61 217.846 61C236 61 236 45 254.154 45C272.308 45 272.308 121 290.462 121C308.615 121 308.615 149 326.769 149C344.923 149 344.923 1 363.077 1C381.231 1 381.231 81 399.385 81C417.538 81 417.538 129 435.692 129C453.846 129 453.846 25 472 25V149H326.769H0V109Z"
                      fill="url(#paint0_linear_1131_5935)"
                    />
                    <path
                      d="M0 109C18.1538 109 18.1538 21 36.3077 21C54.4615 21 54.4615 41 72.6154 41C90.7692 41 90.7692 93 108.923 93C127.077 93 127.077 33 145.231 33C163.385 33 163.385 101 181.538 101C199.692 101 199.692 61 217.846 61C236 61 236 45 254.154 45C272.308 45 272.308 121 290.462 121C308.615 121 308.615 149 326.769 149C344.923 149 344.923 1 363.077 1C381.231 1 381.231 81 399.385 81C417.538 81 417.538 129 435.692 129C453.846 129 453.846 25 472 25"
                      stroke="#9cabba"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="paint0_linear_1131_5935" x1="236" y1="1" x2="236" y2="149" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#283039" />
                        <stop offset="1" stopColor="#283039" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="flex justify-around">
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month) => (
                      <p key={month} className="text-[#9cabba] text-[13px] font-bold leading-normal tracking-[0.015em]">
                        {month}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubnetYieldDashboard;