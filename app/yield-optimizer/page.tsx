'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '../Navbar';

interface YieldOpportunity {
  subnet: string;
  protocol: string;
  apy: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  estimatedReturn: string;
}

const SubnetYieldCore: React.FC = () => {
  const [investmentAmount, setInvestmentAmount] = useState<string>('');
  const [riskTolerance, setRiskTolerance] = useState<number>(32);
  const [isClient, setIsClient] = useState(false);

  // Ensure client-side hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  const yieldOpportunities: YieldOpportunity[] = [
    {
      subnet: 'Subnet A',
      protocol: 'Protocol X',
      apy: '12.5%',
      riskLevel: 'Low',
      estimatedReturn: '$1250'
    },
    {
      subnet: 'Subnet B',
      protocol: 'Protocol Y',
      apy: '15.2%',
      riskLevel: 'Medium',
      estimatedReturn: '$1520'
    },
    {
      subnet: 'Subnet C',
      protocol: 'Protocol Z',
      apy: '18.8%',
      riskLevel: 'High',
      estimatedReturn: '$1880'
    }
  ];

  const getRiskLevelText = (value: number): string => {
    if (value <= 33) return 'Low';
    if (value <= 66) return 'Medium';
    return 'High';
  };

  const getRiskLevelButtonColor = (riskLevel: string): string => {
    switch (riskLevel) {
      case 'Low': return 'bg-green-600';
      case 'Medium': return 'bg-yellow-600';
      case 'High': return 'bg-red-600';
      default: return 'bg-[#283039]';
    }
  };

  return (
    <>
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
              {/* Title Section */}
              <div className="flex flex-wrap justify-between gap-3 p-4">
                <div className="flex min-w-72 flex-col gap-3">
                  <p className="text-white tracking-light text-[32px] font-bold leading-tight">
                    Yield Optimizer
                  </p>
                  <p className="text-[#9cabba] text-sm font-normal leading-normal">
                    Maximize your DeFi returns across Avalanche subnets with our intelligent yield optimization tool.
                  </p>
                </div>
              </div>

              {/* Investment Amount Input - Hydration Safe */}
              <div className="flex max-w-[480px] flex-wrap items-end gap-4 px-4 py-3">
                <label className="flex flex-col min-w-40 flex-1">
                  <p className="text-white text-base font-medium leading-normal pb-2">
                    Investment Amount (USD)
                  </p>
                  {isClient ? (
                    <input
                      type="text"
                      placeholder="Enter amount"
                      className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-0 border-none bg-[#283039] focus:border-none h-14 placeholder:text-[#9cabba] p-4 text-base font-normal leading-normal"
                      value={investmentAmount}
                      onChange={(e) => setInvestmentAmount(e.target.value)}
                      suppressHydrationWarning={true}
                    />
                  ) : (
                    <div className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white border-none bg-[#283039] h-14 p-4 text-base font-normal leading-normal text-[#9cabba]">
                      Enter amount
                    </div>
                  )}
                </label>
              </div>

              {/* Risk Tolerance Slider - Hydration Safe */}
              <div className="@container">
                <div className="relative flex w-full flex-col items-start justify-between gap-3 p-4 @[480px]:flex-row @[480px]:items-center">
                  <div className="flex w-full shrink-[3] items-center justify-between">
                    <p className="text-white text-base font-medium leading-normal">Risk Tolerance</p>
                    <p className="text-white text-sm font-normal leading-normal @[480px]:hidden">
                      {getRiskLevelText(riskTolerance)}
                    </p>
                  </div>
                  <div className="flex h-4 w-full items-center gap-4">
                    <div className="flex h-1 flex-1 rounded-sm bg-[#3b4754] relative">
                      <div 
                        className="h-full rounded-sm bg-white transition-all duration-300" 
                        style={{ width: `${riskTolerance}%` }}
                      />
                      {isClient && (
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={riskTolerance}
                          onChange={(e) => setRiskTolerance(Number(e.target.value))}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          suppressHydrationWarning={true}
                        />
                      )}
                      <div 
                        className="absolute -top-1.5 size-4 rounded-full bg-white transition-all duration-300" 
                        style={{ left: `calc(${riskTolerance}% - 8px)` }}
                      />
                    </div>
                    <p className="text-white text-sm font-normal leading-normal hidden @[480px]:block">
                      {getRiskLevelText(riskTolerance)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Yield Opportunities Table */}
              <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">
                Optimized Yield Opportunities
              </h2>
              
              <div className="px-4 py-3 @container">
                <div className="flex overflow-hidden rounded-lg border border-[#3b4754] bg-[#111418]">
                  <table className="flex-1">
                    <thead>
                      <tr className="bg-[#1b2127]">
                        <th className="px-4 py-3 text-left text-white w-[400px] text-sm font-medium leading-normal">
                          Subnet
                        </th>
                        <th className="px-4 py-3 text-left text-white w-[400px] text-sm font-medium leading-normal">
                          Protocol
                        </th>
                        <th className="px-4 py-3 text-left text-white w-[400px] text-sm font-medium leading-normal">
                          APY
                        </th>
                        <th className="px-4 py-3 text-left text-white w-60 text-sm font-medium leading-normal">
                          Risk Level
                        </th>
                        <th className="px-4 py-3 text-left text-white w-[400px] text-sm font-medium leading-normal">
                          Estimated Return
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {yieldOpportunities.map((opportunity, index) => (
                        <tr key={index} className="border-t border-t-[#3b4754]">
                          <td className="h-[72px] px-4 py-2 w-[400px] text-white text-sm font-normal leading-normal">
                            {opportunity.subnet}
                          </td>
                          <td className="h-[72px] px-4 py-2 w-[400px] text-white text-sm font-normal leading-normal">
                            {opportunity.protocol}
                          </td>
                          <td className="h-[72px] px-4 py-2 w-[400px] text-[#9cabba] text-sm font-normal leading-normal">
                            {opportunity.apy}
                          </td>
                          <td className="h-[72px] px-4 py-2 w-60 text-sm font-normal leading-normal">
                            <button 
                              className={`flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-8 px-4 ${getRiskLevelButtonColor(opportunity.riskLevel)} text-white text-sm font-medium leading-normal w-full`}
                              suppressHydrationWarning={true}
                            >
                              <span className="truncate">{opportunity.riskLevel}</span>
                            </button>
                          </td>
                          <td className="h-[72px] px-4 py-2 w-[400px] text-[#9cabba] text-sm font-normal leading-normal">
                            {opportunity.estimatedReturn}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Disclaimer */}
              <p className="text-white text-base font-normal leading-normal pb-3 pt-1 px-4">
                Note: APYs and estimated returns are subject to change based on market conditions and protocol performance. 
                Risk levels are indicative and should be considered alongside your own research.
              </p>

              {/* Adjust Parameters Button */}
              <div className="flex px-4 py-3 justify-start">
                <button 
                  className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#0d80f2] text-white text-sm font-bold leading-normal tracking-[0.015em]"
                  suppressHydrationWarning={true}
                >
                  <span className="truncate">Adjust Parameters</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SubnetYieldCore;