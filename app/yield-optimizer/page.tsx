'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Ensure client-side hydration and animate cards
  useEffect(() => {
    setIsClient(true);
    
    const animateCards = () => {
      cardRefs.current.forEach((card, index) => {
        if (card) {
          card.style.opacity = '0';
          card.style.transform = 'translateY(20px)';
          setTimeout(() => {
            card.style.transition = `opacity 0.5s ease ${index * 0.1}s, transform 0.5s ease ${index * 0.1}s`;
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          }, 100);
        }
      });
    };

    const timer = setTimeout(animateCards, 100);
    return () => clearTimeout(timer);
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
      case 'Low': return 'bg-[#00ffaa20] text-[#00ffaa] hover:bg-[#00ffaa30]';
      case 'Medium': return 'bg-[#ffff0020] text-[#ffff00] hover:bg-[#ffff0030]';
      case 'High': return 'bg-[#ff555520] text-[#ff5555] hover:bg-[#ff555530]';
      default: return 'bg-[#283039]';
    }
  };

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
            {/* Title Section */}
            <div className="group">
              <div className="flex flex-wrap justify-between gap-3 p-4">
                <div className="flex min-w-72 flex-col gap-3">
                  <h1 className="text-white tracking-light text-2xl md:text-[32px] font-bold leading-tight">
                    Yield<span className="text-[#00ffaa]">Optimizer</span>
                  </h1>
                  <p className="text-[#777] text-sm font-normal leading-normal">
                    Maximize your DeFi returns across Avalanche subnets with our intelligent yield optimization tool.
                  </p>
                </div>
              </div>
            </div>

            {/* Investment Amount Input */}
            <div className="group" ref={el => cardRefs.current[0] = el}>
              <div className="flex max-w-[480px] flex-wrap items-end gap-4 px-4 py-3">
                <label className="flex flex-col min-w-40 flex-1">
                  <p className="text-[#aaa] text-base font-medium leading-normal pb-2">
                    Investment Amount (USD)
                  </p>
                  {isClient ? (
                    <input
                      type="text"
                      placeholder="Enter amount"
                      className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-0 border border-[#2a2a2a] bg-[#111418] hover:border-[#00ffaa] focus:border-[#00ffaa] transition-all duration-300 h-14 placeholder:text-[#777] p-4 text-base font-normal leading-normal"
                      value={investmentAmount}
                      onChange={(e) => setInvestmentAmount(e.target.value)}
                      suppressHydrationWarning={true}
                    />
                  ) : (
                    <div className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white border border-[#2a2a2a] bg-[#111418] h-14 p-4 text-base font-normal leading-normal text-[#777]">
                      Enter amount
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Risk Tolerance Slider */}
            <div className="group @container" ref={el => cardRefs.current[1] = el}>
              <div className="relative flex w-full flex-col items-start justify-between gap-3 p-4 @[480px]:flex-row @[480px]:items-center">
                <div className="flex w-full shrink-[3] items-center justify-between">
                  <p className="text-[#aaa] text-base font-medium leading-normal">Risk Tolerance</p>
                  <p className="text-white text-sm font-normal leading-normal @[480px]:hidden">
                    {getRiskLevelText(riskTolerance)}
                  </p>
                </div>
                <div className="flex h-4 w-full items-center gap-4">
                  <div className="flex h-1 flex-1 rounded-sm bg-[#2a2a2a] relative">
                    <div 
                      className="h-full rounded-sm bg-[#00ffaa] transition-all duration-300" 
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
                      className="absolute -top-1.5 size-4 rounded-full bg-[#00ffaa] transition-all duration-300 hover:size-5 hover:-top-2" 
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
            <div className="group" ref={el => cardRefs.current[2] = el}>
              <h2 className="text-white text-xl md:text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">
                Optimized Yield Opportunities
                <span className="block h-0.5 w-0 bg-[#00ffaa] transition-all duration-500 group-hover:w-16 mt-1"></span>
              </h2>
              
              <div className="px-4 py-3 @container">
                <div className="flex overflow-hidden rounded-lg border border-[#2a2a2a] bg-[#111418] hover:border-[#00ffaa] transition-all duration-300 min-w-[600px]">
                  <table className="flex-1 w-full">
                    <thead>
                      <tr className="bg-[#1a1a1a]">
                        <th className="px-4 py-3 text-left text-[#aaa] text-sm font-medium leading-normal">
                          Subnet
                        </th>
                        <th className="px-4 py-3 text-left text-[#aaa] text-sm font-medium leading-normal">
                          Protocol
                        </th>
                        <th className="px-4 py-3 text-left text-[#aaa] text-sm font-medium leading-normal">
                          APY
                        </th>
                        <th className="px-4 py-3 text-left text-[#aaa] text-sm font-medium leading-normal">
                          Risk Level
                        </th>
                        <th className="px-4 py-3 text-left text-[#aaa] text-sm font-medium leading-normal">
                          Estimated Return
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {yieldOpportunities.map((opportunity, index) => (
                        <tr 
                          key={index} 
                          className="border-t border-t-[#2a2a2a] hover:bg-[#1a1a1a] transition-colors duration-200"
                        >
                          <td className="h-[72px] px-4 py-2 text-white text-sm font-normal leading-normal">
                            {opportunity.subnet}
                          </td>
                          <td className="h-[72px] px-4 py-2 text-white text-sm font-normal leading-normal">
                            {opportunity.protocol}
                          </td>
                          <td className="h-[72px] px-4 py-2 text-[#00ffaa] text-sm font-normal leading-normal">
                            {opportunity.apy}
                          </td>
                          <td className="h-[72px] px-4 py-2 text-sm font-normal leading-normal">
                            <button 
                              className={`flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-8 px-4 ${getRiskLevelButtonColor(opportunity.riskLevel)} transition-colors duration-200 w-full`}
                              suppressHydrationWarning={true}
                            >
                              <span className="truncate">{opportunity.riskLevel}</span>
                            </button>
                          </td>
                          <td className="h-[72px] px-4 py-2 text-white text-sm font-normal leading-normal">
                            {opportunity.estimatedReturn}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="group" ref={el => cardRefs.current[3] = el}>
              <p className="text-[#777] text-sm font-normal leading-normal pb-3 pt-1 px-4 group-hover:text-[#aaa] transition-colors duration-300">
                Note: APYs and estimated returns are subject to change based on market conditions and protocol performance. 
                Risk levels are indicative and should be considered alongside your own research.
              </p>
            </div>

            {/* Adjust Parameters Button */}
            <div className="group flex px-4 py-3 justify-start" ref={el => cardRefs.current[4] = el}>
              <button 
                className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#00ffaa20] text-[#00ffaa] hover:bg-[#00ffaa30] hover:text-white hover:shadow-[0_0_15px_rgba(0,255,170,0.3)] text-sm font-bold leading-normal tracking-[0.015em] transition-all duration-300"
                suppressHydrationWarning={true}
              >
                <span className="truncate">Adjust Parameters</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubnetYieldCore;