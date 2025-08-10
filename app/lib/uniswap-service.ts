import { ethers, Contract, BrowserProvider } from 'ethers';
import { CONTRACT_CONFIG } from './web3-config';

// Uniswap V2 configuration for Avalanche Fuji
const UNISWAP_V2_CONFIG = {
  ROUTER_ADDRESS: '0x2D99ABD9008Dc933ff5c0CD271B88309593aB921', // Trader Joe Router on Fuji
  FACTORY_ADDRESS: '0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10', // Trader Joe Factory on Fuji
  WAVAX_ADDRESS: '0xd00ae08403B9bbb9124bB305C09058E32C39A48c', // WAVAX on Fuji
  USDC_ADDRESS: '0x5425890298aed601595a70AB815c96711a31Bc65', // USDC on Fuji for pairing
};

// Uniswap V2 Router ABI (minimal for our needs)
const UNISWAP_V2_ROUTER_ABI = [
  {
    "inputs": [
      {"internalType": "uint256", "name": "amountTokenDesired", "type": "uint256"},
      {"internalType": "uint256", "name": "amountTokenMin", "type": "uint256"},
      {"internalType": "uint256", "name": "amountETHMin", "type": "uint256"},
      {"internalType": "address", "name": "to", "type": "address"},
      {"internalType": "uint256", "name": "deadline", "type": "uint256"}
    ],
    "name": "addLiquidityETH",
    "outputs": [
      {"internalType": "uint256", "name": "amountToken", "type": "uint256"},
      {"internalType": "uint256", "name": "amountETH", "type": "uint256"},
      {"internalType": "uint256", "name": "liquidity", "type": "uint256"}
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "amountIn", "type": "uint256"},
      {"internalType": "address[]", "name": "path", "type": "address[]"}
    ],
    "name": "getAmountsOut",
    "outputs": [{"internalType": "uint256[]", "name": "amounts", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// ERC20 ABI for token operations
const ERC20_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "spender", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "owner", "type": "address"}, {"internalType": "address", "name": "spender", "type": "address"}],
    "name": "allowance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

export interface DepositResult {
  success: boolean;
  transactionHash?: string;
  liquidityTokens?: string;
  error?: string;
}

export interface TokenBalance {
  balance: string;
  formattedBalance: string;
}

export class UniswapDepositService {
  private provider: BrowserProvider | null = null;
  private routerContract: Contract | null = null;
  private wavaxContract: Contract | null = null;

  constructor(provider?: BrowserProvider) {
    if (provider) {
      this.setProvider(provider);
    }
  }

  setProvider(provider: BrowserProvider) {
    this.provider = provider;
    this.routerContract = new Contract(
      UNISWAP_V2_CONFIG.ROUTER_ADDRESS,
      UNISWAP_V2_ROUTER_ABI,
      provider
    );
    this.wavaxContract = new Contract(
      UNISWAP_V2_CONFIG.WAVAX_ADDRESS,
      ERC20_ABI,
      provider
    );
  }

  // Get user's WAVAX balance
  async getWAVAXBalance(userAddress: string): Promise<TokenBalance> {
    if (!this.wavaxContract) {
      throw new Error('Service not initialized');
    }

    try {
      const balance = await this.wavaxContract.balanceOf(userAddress);
      const formattedBalance = ethers.formatEther(balance);
      
      return {
        balance: balance.toString(),
        formattedBalance: parseFloat(formattedBalance).toFixed(4)
      };
    } catch (error: any) {
      console.error('Error getting WAVAX balance:', error);
      throw new Error(`Failed to get WAVAX balance: ${error.message}`);
    }
  }

  // Check if user has approved WAVAX spending
  async checkWAVAXAllowance(userAddress: string): Promise<bigint> {
    if (!this.wavaxContract) {
      throw new Error('Service not initialized');
    }

    try {
      const allowance = await this.wavaxContract.allowance(
        userAddress,
        UNISWAP_V2_CONFIG.ROUTER_ADDRESS
      );
      return allowance;
    } catch (error: any) {
      console.error('Error checking allowance:', error);
      throw new Error(`Failed to check allowance: ${error.message}`);
    }
  }

  // Approve WAVAX spending
  async approveWAVAX(amount: string): Promise<string> {
    if (!this.wavaxContract || !this.provider) {
      throw new Error('Service not initialized');
    }

    try {
      const signer = await this.provider.getSigner();
      const contractWithSigner = this.wavaxContract.connect(signer);
      
      const amountWei = ethers.parseEther(amount);
      const tx = await contractWithSigner.approve(
        UNISWAP_V2_CONFIG.ROUTER_ADDRESS,
        amountWei
      );
      
      console.log('Approval transaction sent:', tx.hash);
      await tx.wait();
      
      return tx.hash;
    } catch (error: any) {
      console.error('Error approving WAVAX:', error);
      throw new Error(`Failed to approve WAVAX: ${error.message}`);
    }
  }

  // Deposit WAVAX into Uniswap V2 liquidity pool (WAVAX/AVAX pair)
  async depositWAVAX(amount: string, slippageTolerance: number = 2): Promise<DepositResult> {
    if (!this.routerContract || !this.provider) {
      throw new Error('Service not initialized');
    }

    try {
      const signer = await this.provider.getSigner();
      const contractWithSigner = this.routerContract.connect(signer);
      
      const amountWei = ethers.parseEther(amount);
      const avaxAmountWei = ethers.parseEther(amount); // 1:1 ratio for simplicity
      
      // Calculate minimum amounts with slippage tolerance
      const slippageMultiplier = (100 - slippageTolerance) / 100;
      const minTokenAmount = BigInt(Math.floor(Number(amountWei) * slippageMultiplier));
      const minAVAXAmount = BigInt(Math.floor(Number(avaxAmountWei) * slippageMultiplier));
      
      // Set deadline to 20 minutes from now
      const deadline = Math.floor(Date.now() / 1000) + 1200;
      
      console.log('Adding liquidity with params:', {
        amountTokenDesired: amountWei.toString(),
        amountTokenMin: minTokenAmount.toString(),
        amountETHMin: minAVAXAmount.toString(),
        deadline
      });
      
      const tx = await contractWithSigner.addLiquidityETH(
        UNISWAP_V2_CONFIG.WAVAX_ADDRESS,
        amountWei,
        minTokenAmount,
        minAVAXAmount,
        await signer.getAddress(),
        deadline,
        { value: avaxAmountWei } // Send AVAX along with the transaction
      );
      
      console.log('Deposit transaction sent:', tx.hash);
      const receipt = await tx.wait();
      
      // Extract liquidity tokens from receipt (simplified)
      const liquidityTokens = "LP Tokens received"; // In a real implementation, parse from logs
      
      return {
        success: true,
        transactionHash: tx.hash,
        liquidityTokens,
      };
    } catch (error: any) {
      console.error('Error depositing WAVAX:', error);
      return {
        success: false,
        error: error.message || 'Failed to deposit WAVAX'
      };
    }
  }

  // Get estimated output for deposit (how much LP tokens user will receive)
  async getDepositEstimate(wavaxAmount: string): Promise<{
    estimatedLPTokens: string;
    priceImpact: string;
  }> {
    try {
      // Simplified estimation - in a real implementation, you'd query the pool reserves
      const lpTokensEstimate = (parseFloat(wavaxAmount) * 0.99).toFixed(4); // Rough estimate
      const priceImpact = "0.1"; // Simplified price impact
      
      return {
        estimatedLPTokens: lpTokensEstimate,
        priceImpact
      };
    } catch (error: any) {
      console.error('Error getting deposit estimate:', error);
      throw new Error(`Failed to get deposit estimate: ${error.message}`);
    }
  }

  // Utility function to format token amounts
  static formatTokenAmount(amount: bigint, decimals: number = 18): string {
    const formatted = ethers.formatUnits(amount, decimals);
    return parseFloat(formatted).toFixed(4);
  }
}

export default UniswapDepositService;