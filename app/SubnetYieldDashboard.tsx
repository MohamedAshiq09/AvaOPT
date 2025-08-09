import React from 'react';
import Navbar from './Navbar';

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
                <p className="text-white tracking-light text-[32px] font-bold leading-tight">Dashboard</p>
                <p className="text-[#9cabba] text-sm font-normal leading-normal">
                  Overview of your SubnetYield Core performance and key metrics.
                </p>
              </div>
            </div>

            {/* Metrics Cards */}
            <div className="flex flex-wrap gap-4 p-4">
              <MetricCard
                title="Total Value Locked (TVL)"
                value="$12.5M"
                change="+2.3%"
                isPositive={true}
              />
              <MetricCard
                title="Available Yields"
                value="15.2%"
                change="-1.1%"
                isPositive={false}
              />
              <MetricCard
                title="Portfolio Performance"
                value="+8.5%"
                change="+0.7%"
                isPositive={true}
              />
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

            {/* Yield Summary Table */}
            <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">
              Yield Summary
            </h2>
            <div className="px-4 py-3">
              <div className="flex overflow-hidden rounded-lg border border-[#3b4754] bg-[#111418]">
                <table className="flex-1">
                  <thead>
                    <tr className="bg-[#1b2127]">
                      <th className="px-4 py-3 text-left text-white w-[400px] text-sm font-medium leading-normal">
                        Subnet
                      </th>
                      <th className="px-4 py-3 text-left text-white w-[400px] text-sm font-medium leading-normal">
                        Pool
                      </th>
                      <th className="px-4 py-3 text-left text-white w-[400px] text-sm font-medium leading-normal">
                        Yield
                      </th>
                      <th className="px-4 py-3 text-left text-white w-60 text-sm font-medium leading-normal">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {subnetData.map((subnet, index) => (
                      <tr key={index} className="border-t border-t-[#3b4754]">
                        <td className="h-[72px] px-4 py-2 w-[400px] text-white text-sm font-normal leading-normal">
                          {subnet.name}
                        </td>
                        <td className="h-[72px] px-4 py-2 w-[400px] text-[#9cabba] text-sm font-normal leading-normal">
                          {subnet.pool}
                        </td>
                        <td className="h-[72px] px-4 py-2 w-[400px] text-[#9cabba] text-sm font-normal leading-normal">
                          {subnet.yield}
                        </td>
                        <td className="h-[72px] px-4 py-2 w-60 text-sm font-normal leading-normal">
                          <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-8 px-4 bg-[#283039] text-white text-sm font-medium leading-normal w-full">
                            <span className="truncate">{subnet.status}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

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