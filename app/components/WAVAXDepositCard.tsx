'use client';

import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  ArrowDown, 
  Settings, 
  Info, 
  CheckCircle, 
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useWeb3 } from '../lib/Web3Context';
import UniswapDepositService, { TokenBalance, DepositResult } from '../lib/uniswap-service';
import { toast } from 'react-toastify';

const WAVAXDepositCard: React.FC = () => {
  const { provider, account, isConnected, chainId } = useWeb3();
  const [depositService, setDepositService] = useState<UniswapDepositService | null>(null);
  const [wavaxBalance, setWavaxBalance] = useState<TokenBalance | null>(null);
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [slippageTolerance, setSlippageTolerance] = useState<number>(2);
  const [isApproving, setIsApproving] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [depositEstimate, setDepositEstimate] = useState<{
    estimatedLPTokens: string;
    priceImpact: string;
  } | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Initialize service
  useEffect(() => {
    if (provider && chainId === 43113) {
      const service = new UniswapDepositService(provider);
      setDepositService(service);
    } else {
      setDepositService(null);
    }
  }, [provider, chainId]);

  // Load user balance
  useEffect(() => {
    if (depositService && account) {
      loadWAVAXBalance();
      checkApprovalStatus();
    }
  }, [depositService, account]);

  // Update estimate when amount changes
  useEffect(() => {
    if (depositService && depositAmount && parseFloat(depositAmount) > 0) {
      updateDepositEstimate();
    } else {
      setDepositEstimate(null);
    }
  }, [depositAmount, depositService]);

  const loadWAVAXBalance = async () => {
    if (!depositService || !account) return;

    try {
      const balance = await depositService.getWAVAXBalance(account);
      setWavaxBalance(balance);
    } catch (error) {
      console.error('Error loading WAVAX balance:', error);
    }
  };

  const checkApprovalStatus = async () => {
    if (!depositService || !account || !depositAmount) return;

    try {
      const allowance = await depositService.checkWAVAXAllowance(account);
      const amountWei = BigInt(parseFloat(depositAmount) * 1e18);
      setIsApproved(allowance >= amountWei);
    } catch (error) {
      console.error('Error checking approval:', error);
    }
  };

  const updateDepositEstimate = async () => {
    if (!depositService) return;

    try {
      const estimate = await depositService.getDepositEstimate(depositAmount);
      setDepositEstimate(estimate);
    } catch (error) {
      console.error('Error getting deposit estimate:', error);
    }
  };

  const handleApprove = async () => {
    if (!depositService || !depositAmount) return;

    setIsApproving(true);
    try {
      const txHash = await depositService.approveWAVAX(depositAmount);
      toast.success('WAVAX approved successfully!');
      setIsApproved(true);
      await checkApprovalStatus();
    } catch (error: any) {
      toast.error(`Approval failed: ${error.message}`);
    } finally {
      setIsApproving(false);
    }
  };

  const handleDeposit = async () => {
    if (!depositService || !depositAmount) return;

    setIsDepositing(true);
    try {
      const result: DepositResult = await depositService.depositWAVAX(
        depositAmount,
        slippageTolerance
      );

      if (result.success) {
        toast.success('WAVAX deposited successfully!');
        setDepositAmount('');
        setIsApproved(false);
        await loadWAVAXBalance();
      } else {
        toast.error(`Deposit failed: ${result.error}`);
      }
    } catch (error: any) {
      toast.error(`Deposit failed: ${error.message}`);
    } finally {
      setIsDepositing(false);
    }
  };

  const handleMaxClick = () => {
    if (wavaxBalance) {
      // Leave a small amount for gas fees
      const maxAmount = Math.max(0, parseFloat(wavaxBalance.formattedBalance) - 0.01);
      setDepositAmount(maxAmount.toString());
    }
  };

  const canDeposit = isConnected && 
                   chainId === 43113 && 
                   depositAmount && 
                   parseFloat(depositAmount) > 0 && 
                   wavaxBalance && 
                   parseFloat(depositAmount) <= parseFloat(wavaxBalance.formattedBalance);

  if (!isConnected || chainId !== 43113) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Wallet className="w-5 h-5 text-[#00ffaa]" />
          <h3 className="text-white text-lg font-bold">WAVAX Deposit</h3>
        </div>
        <div className="flex items-center gap-2 p-4 bg-orange-900/20 border border-orange-600 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-orange-400" />
          <span className="text-orange-400 text-sm">
            {!isConnected ? 'Connect wallet to deposit WAVAX' : 'Switch to Fuji testnet'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-[#00ffaa]/50 hover:bg-white/10 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Wallet className="w-5 h-5 text-[#00ffaa]" />
          <h3 className="text-white text-lg font-bold">WAVAX Deposit</h3>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <Settings className="w-4 h-4 text-white/60" />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-white text-sm">Slippage Tolerance</span>
            <div className="flex items-center gap-2">
              {[1, 2, 5].map((value) => (
                <button
                  key={value}
                  onClick={() => setSlippageTolerance(value)}
                  className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                    slippageTolerance === value
                      ? 'bg-[#00ffaa] text-black'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {value}%
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Balance Display */}
      {wavaxBalance && (
        <div className="mb-4 p-3 bg-white/5 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-white/60 text-sm">WAVAX Balance</span>
            <span className="text-white font-medium">{wavaxBalance.formattedBalance} WAVAX</span>
          </div>
        </div>
      )}

      {/* Deposit Input */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-white text-sm font-medium">Deposit Amount</label>
          <button
            onClick={handleMaxClick}
            className="text-[#00ffaa] text-xs hover:text-[#00ffaa]/80 transition-colors"
          >
            MAX
          </button>
        </div>
        <div className="relative">
          <input
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="0.0"
            className="w-full p-4 bg-white/5 border border-white/10 rounded-lg text-white text-lg font-medium placeholder-white/40 focus:border-[#00ffaa]/50 focus:outline-none transition-colors"
          />
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
            <span className="text-white/60 text-sm">🏔️</span>
            <span className="text-white text-sm font-medium">WAVAX</span>
          </div>
        </div>
      </div>

      {/* Deposit Estimate */}
      {depositEstimate && (
        <div className="mb-4 p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-[#00ffaa]" />
            <span className="text-white text-sm font-medium">Deposit Estimate</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/60">LP Tokens (estimated)</span>
              <span className="text-white">{depositEstimate.estimatedLPTokens}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Price Impact</span>
              <span className="text-green-400">{depositEstimate.priceImpact}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Slippage Tolerance</span>
              <span className="text-white">{slippageTolerance}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {!isApproved && canDeposit && (
          <button
            onClick={handleApprove}
            disabled={isApproving}
            className="w-full flex items-center justify-center gap-2 p-4 bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-blue-400 font-medium rounded-lg border border-blue-500/30 transition-all duration-200"
          >
            {isApproving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Approve WAVAX
              </>
            )}
          </button>
        )}

        <button
          onClick={handleDeposit}
          disabled={!canDeposit || !isApproved || isDepositing}
          className="w-full flex items-center justify-center gap-2 p-4 bg-[#00ffaa]/20 hover:bg-[#00ffaa]/30 disabled:opacity-50 disabled:cursor-not-allowed text-[#00ffaa] font-medium rounded-lg border border-[#00ffaa]/30 transition-all duration-200"
        >
          {isDepositing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Depositing...
            </>
          ) : (
            <>
              <ArrowDown className="w-4 h-4" />
              Deposit to Uniswap V2
            </>
          )}
        </button>
      </div>

      {/* Info Footer */}
      <div className="mt-4 p-3 bg-blue-900/20 border border-blue-600/30 rounded-lg">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-blue-300 text-xs">
            <p className="font-medium mb-1">Uniswap V2 Liquidity Deposit</p>
            <p>You'll receive LP tokens representing your share of the WAVAX/AVAX pool. These tokens can be used to earn trading fees and can be withdrawn at any time.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WAVAXDepositCard;