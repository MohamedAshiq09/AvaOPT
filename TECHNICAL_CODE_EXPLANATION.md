# SubnetYield Core - Technical Code Explanation

## 🏗️ **Architecture Overview**

SubnetYield Core is built as a modern React/Next.js application with TypeScript, integrating directly with Ethereum-compatible smart contracts on Avalanche Fuji testnet. The architecture follows a modular, service-oriented design pattern.

```
Frontend (React/Next.js)
├── Components (UI Cards & Interfaces)
├── Services (Blockchain Integration)
├── Context (State Management)
└── Smart Contracts (Avalanche/Fuji)
```

## 🎛️ **Core Components Explained**

### **1. YieldDataCard Component**

**Purpose**: Displays real-time yield data for individual tokens with cross-chain comparison.

**How It Works**:
```typescript
// Component receives a token address as prop
const YieldDataCard: React.FC<YieldDataCardProps> = ({ tokenAddress }) => {
  // Gets data from Web3Context (global state)
  const { tokenYieldData, updateAaveData, isConnected, chainId, refreshTokenData, provider } = useWeb3();
  
  // Local state for subnet data and loading states
  const [subnetData, setSubnetData] = useState<SubnetYieldData | null>(null);
  const [isLoadingSubnet, setIsLoadingSubnet] = useState(false);
```

**Button Functionality**:
- **Refresh Button**: Calls `refreshTokenData()` to fetch latest yield data from contracts
- **Update Cross-Chain Button**: Triggers `updateAaveData()` to update on-chain Aave data
- **Request Subnet Data Button**: Uses AWM to request fresh subnet yield information

**Data Flow**:
1. Component mounts → Initialize SubnetService with provider
2. Load real Aave data from YieldHub contract
3. Load simulated subnet data for comparison
4. Display both with visual indicators for data freshness
5. Auto-refresh every 30 seconds via Web3Context

**Visual Elements**:
- **C-Chain Section**: Green dot + live Aave V3 APY (5.13%)
- **Subnet Section**: Blue dot + simulated subnet APY (8.2%+)
- **Optimized Section**: Purple gradient + calculated best yield
- **Action Buttons**: Styled with hover effects and loading states

### **2. WAVAXDepositCard Component**

**Purpose**: Allows users to deposit WAVAX tokens into Uniswap V2 liquidity pools.

**How It Works**:
```typescript
const WAVAXDepositCard: React.FC = () => {
  // Initialize Uniswap service when provider is available
  useEffect(() => {
    if (provider && chainId === 43113) {
      const service = new UniswapDepositService(provider);
      setDepositService(service);
    }
  }, [provider, chainId]);
```

**Button Functionality**:

**Approve Button**:
```typescript
const handleApprove = async () => {
  setIsApproving(true);
  try {
    // Calls ERC20 approve function on WAVAX contract
    const txHash = await depositService.approveWAVAX(depositAmount);
    toast.success('WAVAX approved successfully!');
    setIsApproved(true);
  } catch (error) {
    toast.error(`Approval failed: ${error.message}`);
  } finally {
    setIsApproving(false);
  }
};
```

**Deposit Button**:
```typescript
const handleDeposit = async () => {
  setIsDepositing(true);
  try {
    // Calls Uniswap V2 Router addLiquidityETH function
    const result = await depositService.depositWAVAX(depositAmount, slippageTolerance);
    if (result.success) {
      toast.success('WAVAX deposited successfully!');
      // Reset form and refresh balance
      setDepositAmount('');
      await loadWAVAXBalance();
    }
  } catch (error) {
    toast.error(`Deposit failed: ${error.message}`);
  } finally {
    setIsDepositing(false);
  }
};
```

**MAX Button**:
```typescript
const handleMaxClick = () => {
  if (wavaxBalance) {
    // Leave 0.01 AVAX for gas fees
    const maxAmount = Math.max(0, parseFloat(wavaxBalance.formattedBalance) - 0.01);
    setDepositAmount(maxAmount.toString());
  }
};
```

**Settings Button**: Toggles slippage tolerance panel (1%, 2%, 5% options)

### **3. CrossChainYieldComparison Component**

**Purpose**: Displays comprehensive yield comparison across multiple tokens and chains.

**How It Works**:
```typescript
// Loads yield data from SubnetService
const loadYieldData = async (useSimulated: boolean = false) => {
  setIsLoading(true);
  try {
    if (useSimulated || !subnetAvailability.isAvailable) {
      // Use simulated data for demo
      const supportedTokens = ['WAVAX', 'WETH', 'USDT'];
      for (const tokenAddress of supportedTokens) {
        const simulatedData = await subnetService.getSimulatedSubnetData(tokenAddress);
        // Create comparison object with C-Chain vs Subnet yields
        const comparison = {
          tokenAddress,
          tokenSymbol: simulatedData.tokenSymbol,
          cChainAPY: Number(simulatedData.aaveAPY) / 100,
          subnetAPY: Number(simulatedData.subnetAPY) / 100,
          yieldDifference: (subnetAPY - cChainAPY),
          recommendedChain: optimizedAPY > max(cChainAPY, subnetAPY) ? 'Optimized' : 'Subnet'
        };
      }
    }
  } catch (error) {
    setError(error.message);
  } finally {
    setIsLoading(false);
  }
};
```

**Button Functionality**:
- **Request Live Data Button**: Triggers AWM request for fresh subnet data
- **Optimize Button**: Placeholder for future yield optimization execution
- **Refresh Button**: Reloads all yield comparison data

## 🔧 **Service Layer Architecture**

### **1. Web3Context (Global State Management)**

**Purpose**: Manages wallet connection, contract interactions, and global application state.

**Key Functions**:
```typescript
// Connects to MetaMask and initializes contracts
const connectWallet = async () => {
  const browserProvider = new BrowserProvider(window.ethereum);
  await browserProvider.send('eth_requestAccounts', []);
  const accounts = await browserProvider.listAccounts();
  setAccount(accounts[0].address);
  setIsConnected(true);
  setupContract(browserProvider);
};

// Refreshes token yield data from contracts
const refreshTokenData = async (tokenAddress?: string) => {
  const tokensToRefresh = tokenAddress ? [tokenAddress] : supportedTokens;
  for (const token of tokensToRefresh) {
    try {
      // Primary: Try comprehensive data method
      const [apyBps, tvl, liquidityIndex, lastUpdate] = await yieldHubContract.getAaveDetails(token);
      const optimizedAPY = await yieldHubContract.calculateOptimizedAPY(token);
    } catch (error) {
      // Fallback: Use individual methods
      const apyBps = await yieldHubContract.getAaveAPY(token);
      const tvl = await yieldHubContract.getAaveTVL(token);
    }
  }
};
```

**Auto-Refresh Mechanism**:
```typescript
useEffect(() => {
  if (!autoRefresh || !yieldHubContract) return;
  const interval = setInterval(async () => {
    await refreshTokenData(); // Refresh every 30 seconds
  }, 30000);
  return () => clearInterval(interval);
}, [autoRefresh, yieldHubContract]);
```

### **2. SubnetService (Cross-Chain Data)**

**Purpose**: Handles subnet yield data fetching and AWM integration.

**Key Functions**:
```typescript
// Gets comprehensive yield data including subnet information
async getComprehensiveYieldData(tokenAddress: string): Promise<SubnetYieldData | null> {
  try {
    // Try to get real Aave data from YieldHub
    const [apyBps, tvl, liquidityIndex, lastUpdate] = await this.yieldHubContract.getAaveDetails(tokenAddress);
    const optimizedAPY = await this.yieldHubContract.calculateOptimizedAPY(tokenAddress);
    
    // Get simulated subnet data (fallback until AWM is fully deployed)
    const simulatedSubnetData = await this.getSimulatedSubnetData(tokenAddress);
    
    return {
      tokenAddress,
      tokenSymbol: tokenInfo.symbol,
      subnetAPY: simulatedSubnetData.subnetAPY,
      aaveAPY: apyBps,
      optimizedAPY: optimizedAPY,
      // ... other properties
    };
  } catch (error) {
    // Fallback to fully simulated data
    return await this.getSimulatedSubnetData(tokenAddress);
  }
}

// Simulates realistic subnet data for demo purposes
async getSimulatedSubnetData(tokenAddress: string): Promise<SubnetYieldData> {
  const baseAPY = 500 + Math.floor(Math.random() * 800); // 5-13% APY
  const subnetBonus = 200 + Math.floor(Math.random() * 400); // 2-6% bonus
  const subnetAPY = BigInt(baseAPY + subnetBonus);
  const aaveAPY = BigInt(baseAPY);
  
  return {
    tokenAddress,
    tokenSymbol: tokenInfo.symbol,
    subnetAPY,
    subnetAPYFormatted: this.formatAPY(subnetAPY),
    aaveAPY,
    aaveAPYFormatted: this.formatAPY(aaveAPY),
    // ... other properties
  };
}
```

### **3. UniswapDepositService (DeFi Integration)**

**Purpose**: Handles Uniswap V2 liquidity pool deposits and token operations.

**Key Functions**:
```typescript
// Deposits WAVAX into Uniswap V2 liquidity pool
async depositWAVAX(amount: string, slippageTolerance: number = 2): Promise<DepositResult> {
  const signer = await this.provider.getSigner();
  const contractWithSigner = this.routerContract.connect(signer);
  
  const amountWei = ethers.parseEther(amount);
  const avaxAmountWei = ethers.parseEther(amount); // 1:1 ratio
  
  // Calculate minimum amounts with slippage protection
  const slippageMultiplier = (100 - slippageTolerance) / 100;
  const minTokenAmount = BigInt(Math.floor(Number(amountWei) * slippageMultiplier));
  const minAVAXAmount = BigInt(Math.floor(Number(avaxAmountWei) * slippageMultiplier));
  
  // Execute the deposit transaction
  const tx = await contractWithSigner.addLiquidityETH(
    UNISWAP_V2_CONFIG.WAVAX_ADDRESS,
    amountWei,                    // WAVAX amount
    minTokenAmount,               // Minimum WAVAX (slippage protection)
    minAVAXAmount,               // Minimum AVAX (slippage protection)
    await signer.getAddress(),    // LP tokens recipient
    deadline,                     // Transaction deadline
    { value: avaxAmountWei }     // AVAX to pair with WAVAX
  );
  
  return { success: true, transactionHash: tx.hash };
}
```

## 🎨 **UI/UX Implementation**

### **Glass-Morphism Design System**

**Base Card Styling**:
```css
.card-base {
  background: rgba(255, 255, 255, 0.05);  /* bg-white/5 */
  backdrop-filter: blur(12px);              /* backdrop-blur-sm */
  border: 1px solid rgba(255, 255, 255, 0.1); /* border-white/10 */
  border-radius: 12px;                      /* rounded-xl */
}

.card-hover {
  border-color: rgba(0, 255, 170, 0.5);   /* hover:border-[#00ffaa]/50 */
  background: rgba(255, 255, 255, 0.1);    /* hover:bg-white/10 */
  transition: all 0.3s ease;               /* transition-all duration-300 */
}
```

**Color Scheme**:
- **Primary Green**: `#00ffaa` (brand color for accents and CTAs)
- **Background**: `#0a0a0a` (deep black for main background)
- **Card Background**: `rgba(255, 255, 255, 0.05)` (subtle white overlay)
- **Text Primary**: `#ffffff` (pure white for headings)
- **Text Secondary**: `rgba(255, 255, 255, 0.6)` (60% white for descriptions)
- **Text Tertiary**: `rgba(255, 255, 255, 0.4)` (40% white for labels)

### **Animation System**

**Card Entrance Animation**:
```typescript
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
```

**Loading States**:
```typescript
// Skeleton loader for data loading
{isLoading ? (
  <div className="animate-pulse bg-white/10 rounded h-5 w-16"></div>
) : (
  <span className="text-green-400 text-lg font-bold">{data.apy}</span>
)}
```

### **Responsive Grid System**

**Token Cards Layout**:
```css
.token-grid {
  display: grid;
  grid-template-columns: 1fr;           /* Mobile: single column */
  gap: 1.5rem;                          /* gap-6 */
}

@media (min-width: 1024px) {
  .token-grid {
    grid-template-columns: 1fr 1fr;     /* Desktop: two columns */
  }
}

@media (min-width: 1280px) {
  .token-grid {
    grid-template-columns: 1fr 1fr 1fr; /* Large: three columns */
  }
}
```

## 🔐 **Security Implementation**

### **Input Validation**

**Amount Validation**:
```typescript
const canDeposit = isConnected && 
                   chainId === 43113 && 
                   depositAmount && 
                   parseFloat(depositAmount) > 0 && 
                   wavaxBalance && 
                   parseFloat(depositAmount) <= parseFloat(wavaxBalance.formattedBalance);
```

**Network Validation**:
```typescript
if (!isConnected || chainId !== 43113) {
  return (
    <div className="bg-orange-900/20 border border-orange-600 rounded-lg">
      <AlertTriangle className="w-4 h-4 text-orange-400" />
      <span>Switch to Fuji testnet for full functionality</span>
    </div>
  );
}
```

### **Transaction Safety**

**Slippage Protection**:
```typescript
const slippageMultiplier = (100 - slippageTolerance) / 100;
const minTokenAmount = BigInt(Math.floor(Number(amountWei) * slippageMultiplier));
```

**Deadline Protection**:
```typescript
const deadline = Math.floor(Date.now() / 1000) + 1200; // 20 minutes from now
```

**Approval Limits**:
```typescript
// Only approve exact amount needed, not unlimited
const amountWei = ethers.parseEther(amount);
await contractWithSigner.approve(ROUTER_ADDRESS, amountWei);
```

## 📊 **Data Flow Architecture**

### **Real-Time Data Pipeline**

1. **Contract Integration**:
   ```
   YieldHub Contract (Fuji) → getAaveDetails() → Real APY/TVL Data
   ```

2. **Fallback Mechanism**:
   ```
   getAaveDetails() fails → getAaveAPY() + getAaveTVL() → Individual Methods
   ```

3. **Data Processing**:
   ```
   Raw BigInt Values → formatAPY() / formatTVL() → User-Friendly Display
   ```

4. **State Management**:
   ```
   Contract Data → Web3Context → Component State → UI Update
   ```

### **Error Handling Flow**

```typescript
try {
  // Primary data source
  const data = await contract.getAaveDetails(token);
} catch (primaryError) {
  try {
    // Fallback data source
    const apy = await contract.getAaveAPY(token);
    const tvl = await contract.getAaveTVL(token);
  } catch (fallbackError) {
    // User-friendly error display
    setError('Failed to fetch data');
  }
}
```

## 🚀 **Performance Optimizations**

### **Efficient Re-rendering**

**Memoized Components**:
```typescript
const YieldDataCard = React.memo(({ tokenAddress }) => {
  // Component only re-renders when tokenAddress changes
});
```

**Optimized State Updates**:
```typescript
// Batch state updates to prevent multiple re-renders
const updatedData = { ...tokenYieldData };
for (const token of tokensToRefresh) {
  updatedData[token] = { ...updatedData[token], isLoading: true };
}
setTokenYieldData(updatedData); // Single state update
```

### **Smart Contract Optimization**

**Batch Calls**:
```typescript
// Get multiple data points in single call when possible
const [apyBps, tvl, liquidityIndex, lastUpdate] = await yieldHubContract.getAaveDetails(token);
```

**Conditional Execution**:
```typescript
// Only update data if it's actually stale
const isDataFresh = await yieldHubContract.isDataFresh(lastUpdate);
if (!isDataFresh) {
  await updateAaveData(token);
}
```

This technical explanation covers how every button, card, and interaction works in the SubnetYield Core platform, providing both high-level architecture understanding and detailed implementation specifics.