"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Bell, X } from 'lucide-react';
import Navbar from '../Navbar';

interface Transaction {
  type: string;
  amount: string;
  subnet: string;
  timestamp: string;
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null; 

  const transactions: Transaction[] = [
    {
      type: 'Deposit',
      amount: '+$1,000',
      subnet: 'Subnet A',
      timestamp: '2024-07-26 10:00 AM'
    },
    {
      type: 'Withdrawal',
      amount: '-$500',
      subnet: 'Subnet B',
      timestamp: '2024-07-25 02:30 PM'
    },
    {
      type: 'Yield Earned',
      amount: '+$50',
      subnet: 'Subnet A',
      timestamp: '2024-07-24 09:15 AM'
    },
    {
      type: 'Deposit',
      amount: '+$2,000',
      subnet: 'Subnet C',
      timestamp: '2024-07-23 04:45 PM'
    },
    {
      type: 'Withdrawal',
      amount: '-$1,200',
      subnet: 'Subnet B',
      timestamp: '2024-07-22 11:00 AM'
    },
    {
      type: 'Yield Earned',
      amount: '+$75',
      subnet: 'Subnet C',
      timestamp: '2024-07-21 08:30 AM'
    },
    {
      type: 'Deposit',
      amount: '+$3,500',
      subnet: 'Subnet A',
      timestamp: '2024-07-20 06:15 PM'
    },
    {
      type: 'Withdrawal',
      amount: '-$800',
      subnet: 'Subnet B',
      timestamp: '2024-07-19 01:45 PM'
    },
    {
      type: 'Yield Earned',
      amount: '+$120',
      subnet: 'Subnet A',
      timestamp: '2024-07-18 11:20 AM'
    },
    {
      type: 'Deposit',
      amount: '+$1,500',
      subnet: 'Subnet C',
      timestamp: '2024-07-17 03:30 PM'
    }
  ];

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-opacity-100 flex items-center justify-center z-50 p-4">
      <div className="bg-[#111418] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden border border-[#2a2a2a]">
        <div className="flex items-center justify-between p-6 border-b border-[#2a2a2a]">
          <div>
            <h2 className="text-white text-2xl font-bold">Transaction History</h2>
            <p className="text-[#777] text-sm mt-1">View your transaction history across different subnets.</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-[#00ffaa] p-2 hover:bg-[#1a1a1a] rounded-lg transition-all duration-300"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 overflow-auto max-h-105">
          <div className="overflow-hidden rounded-lg border border-[#2a2a2a] hover:border-[#00ffaa] transition-all duration-300">
            <table className="w-full">
              <thead>
                <tr className="bg-[#1a1a1a]">
                  <th className="px-4 py-3 text-left text-[#aaa] text-sm font-medium">Type</th>
                  <th className="px-4 py-3 text-left text-[#aaa] text-sm font-medium">Amount</th>
                  <th className="px-4 py-3 text-left text-[#aaa] text-sm font-medium">Subnet</th>
                  <th className="px-4 py-3 text-left text-[#aaa] text-sm font-medium">Timestamp</th>
                  <th className="px-4 py-3 text-left text-[#aaa] text-sm font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction, index) => (
                  <tr key={index} className="border-t border-[#2a2a2a] hover:bg-[#1a1a1a] transition-colors duration-200">
                    <td className="h-[72px] px-4 py-2 text-white text-sm font-normal">{transaction.type}</td>
                    <td className="h-[72px] px-4 py-2 text-[#777] text-sm font-normal">{transaction.amount}</td>
                    <td className="h-[72px] px-4 py-2 text-[#777] text-sm font-normal">{transaction.subnet}</td>
                    <td className="h-[72px] px-4 py-2 text-[#777] text-sm font-normal">{transaction.timestamp}</td>
                    <td className="h-[72px] px-4 py-2">
                      <button className="text-[#00ffaa] text-sm font-bold hover:text-white hover:shadow-[0_0_10px_rgba(0,255,170,0.3)] transition-all duration-300">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const SubnetYieldPortfolio: React.FC = () => {
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState<boolean>(false);
  const [isClient, setIsClient] = useState<boolean>(false);
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

  const LogoIcon: React.FC = () => (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M39.475 21.6262C40.358 21.4363 40.6863 21.5589 40.7581 21.5934C40.7876 21.655 40.8547 21.857 40.8082 22.3336C40.7408 23.0255 40.4502 24.0046 39.8572 25.2301C38.6799 27.6631 36.5085 30.6631 33.5858 33.5858C30.6631 36.5085 27.6632 38.6799 25.2301 39.8572C24.0046 40.4502 23.0255 40.7407 22.3336 40.8082C21.8571 40.8547 21.6551 40.7875 21.5934 40.7581C21.5589 40.6863 21.4363 40.358 21.6262 39.475C21.8562 38.4054 22.4689 36.9657 23.5038 35.2817C24.7575 33.2417 26.5497 30.9744 28.7621 28.762C30.9744 26.5497 33.2417 24.7574 35.2817 23.5037C36.9657 22.4689 38.4054 21.8562 39.475 21.6262ZM4.41189 29.2403L18.7597 43.5881C19.8813 44.7097 21.4027 44.9179 22.7217 44.7893C24.0585 44.659 25.5148 44.1631 26.9723 43.4579C29.9052 42.0387 33.2618 39.5667 36.4142 36.4142C39.5667 33.2618 42.0387 29.9052 43.4579 26.9723C44.1631 25.5148 44.659 24.0585 44.7893 22.7217C44.9179 21.4027 44.7097 19.8813 43.5881 18.7597L29.2403 4.41187C27.8527 3.02428 25.8765 3.02573 24.2861 3.36776C22.6081 3.72863 20.7334 4.58419 18.8396 5.74801C16.4978 7.18716 13.9881 9.18353 11.5858 11.5858C9.18354 13.988 7.18717 16.4978 5.74802 18.8396C4.58421 20.7334 3.72865 22.6081 3.36778 24.2861C3.02574 25.8765 3.02429 27.8527 4.41189 29.2403Z"
        fill="currentColor"
      />
    </svg>
  );

  const PerformanceChart: React.FC = () => (
    <div className="min-h-[180px] flex flex-col gap-8 py-4">
      <svg width="100%" height="148" viewBox="-3 0 478 150" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
        <path
          d="M0 109C18.1538 109 18.1538 21 36.3077 21C54.4615 21 54.4615 41 72.6154 41C90.7692 41 90.7692 93 108.923 93C127.077 93 127.077 33 145.231 33C163.385 33 163.385 101 181.538 101C199.692 101 199.692 61 217.846 61C236 61 236 45 254.154 45C272.308 45 272.308 121 290.462 121C308.615 121 308.615 149 326.769 149C344.923 149 344.923 1 363.077 1C381.231 1 381.231 81 399.385 81C417.538 81 417.538 129 435.692 129C453.846 129 453.846 25 472 25V149H326.769H0V109Z"
          fill="url(#paint0_linear)"
        />
        <path
          d="M0 109C18.1538 109 18.1538 21 36.3077 21C54.4615 21 54.4615 41 72.6154 41C90.7692 41 90.7692 93 108.923 93C127.077 93 127.077 33 145.231 33C163.385 33 163.385 101 181.538 101C199.692 101 199.692 61 217.846 61C236 61 236 45 254.154 45C272.308 45 272.308 121 290.462 121C308.615 121 308.615 149 326.769 149C344.923 149 344.923 1 363.077 1C381.231 1 381.231 81 399.385 81C417.538 81 417.538 129 435.692 129C453.846 129 453.846 25 472 25"
          stroke="#00ffaa"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="paint0_linear" x1="236" y1="1" x2="236" y2="149" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00ffaa20" />
            <stop offset="1" stopColor="#00ffaa20" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      <div className="flex justify-around">
        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'].map((month) => (
          <p key={month} className="text-[#777] text-[13px] font-bold leading-normal tracking-[0.015em] hover:text-[#aaa] transition-colors duration-300">
            {month}
          </p>
        ))}
      </div>
    </div>
  );

  return (
    <div 
      className="relative flex w-full min-h-screen flex-col bg-[#0a0a0a] overflow-x-hidden" 
      style={{ fontFamily: 'Inter, "Noto Sans", sans-serif' }}
    >
      <div className="flex h-full grow flex-col">
        {/* Header */}
        <Navbar />

        {/* Main Content */}
        <div className="px-4 md:px-40 flex flex-1 justify-center py-5">
          <div className="flex flex-col max-w-[960px] flex-1">
            {/* Page Header */}
            <div className="group">
              <div className="flex flex-wrap justify-between gap-3 p-4">
                <div className="flex min-w-72 flex-col gap-3">
                  <h1 className="text-white tracking-light text-2xl md:text-[32px] font-bold leading-tight">
                    Port<span className="text-[#00ffaa]">folio</span>
                  </h1>
                  <p className="text-[#777] text-sm font-normal leading-normal">
                    View your asset balances, historical performance, and manage your investments across different subnets.
                  </p>
                </div>
                <button
                  onClick={() => setIsTransactionModalOpen(true)}
                  className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-8 px-4 bg-[#00ffaa20] text-[#00ffaa] hover:bg-[#00ffaa30] hover:text-white hover:shadow-[0_0_15px_rgba(0,255,170,0.3)] text-sm font-medium leading-normal transition-all duration-300"
                >
                  <span className="truncate">View Transactions</span>
                </button>
              </div>
            </div>

            {/* Overview Section */}
            <div className="group" ref={el => cardRefs.current[0] = el}>
              <h2 className="text-white text-xl md:text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">
                Overview
                <span className="block h-0.5 w-0 bg-[#00ffaa] transition-all duration-500 group-hover:w-16 mt-1"></span>
              </h2>
            </div>
            
            {/* Overview Cards */}
            <div className="group flex flex-wrap gap-4 p-4" ref={el => cardRefs.current[1] = el}>
              <div className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-lg p-6 bg-[#111418] border border-[#2a2a2a] hover:border-[#00ffaa] hover: hover:bg-[#1a1a1a] transition-all duration-300">
                <p className="text-[#aaa] text-base font-medium leading-normal">Total Portfolio Value</p>
                <p className="text-white tracking-light text-2xl font-bold leading-tight">$12,345.67</p>
                <p className="text-[#00ffaa] text-base font-medium leading-normal">+2.5%</p>
              </div>
              <div className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-lg p-6 bg-[#111418] border border-[#2a2a2a] hover:border-[#00ffaa] hover:bg-[#1a1a1a] transition-all duration-300">
                <p className="text-[#aaa] text-base font-medium leading-normal">Total Yield Earned</p>
                <p className="text-white tracking-light text-2xl font-bold leading-tight">$567.89</p>
                <p className="text-[#00ffaa] text-base font-medium leading-normal">+1.2%</p>
              </div>
            </div>

            {/* Performance Chart */}
            <div className="group flex flex-wrap gap-4 px-4 py-6" ref={el => cardRefs.current[2] = el}>
              <div className="flex min-w-72 flex-1 flex-col gap-2 rounded-lg border border-[#2a2a2a] bg-[#111418] p-6 hover:border-[#00ffaa] hover:bg-[#1a1a1a] transition-all duration-300">
                <p className="text-[#aaa] text-base font-medium leading-normal">Portfolio Performance</p>
                <p className="text-white tracking-light text-[32px] font-bold leading-tight truncate">$12,345.67</p>
                <div className="flex gap-1">
                  <p className="text-[#777] text-base font-normal leading-normal">Last 30 Days</p>
                  <p className="text-[#00ffaa] text-base font-medium leading-normal">+2.5%</p>
                </div>
                <PerformanceChart />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Modal */}
      <TransactionModal 
        isOpen={isTransactionModalOpen} 
        onClose={() => setIsTransactionModalOpen(false)} 
      />
    </div>
  );
};

export default SubnetYieldPortfolio;