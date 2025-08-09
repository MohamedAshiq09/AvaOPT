# 🚀 YieldScout Deployment Guide

Complete guide to deploy YieldScout contracts on Avalanche C-Chain for the SubnetYield Core hackathon project.

## 📋 Prerequisites Checklist

### 1. Development Environment
- [ ] Node.js v16+ installed
- [ ] Git installed
- [ ] Code editor (VS Code recommended)
- [ ] MetaMask or similar wallet

### 2. Wallet Setup
- [ ] MetaMask wallet configured
- [ ] Private key exported (keep secure!)
- [ ] Wallet connected to Avalanche networks

### 3. Testnet Funds
- [ ] AVAX tokens from Fuji faucet
- [ ] Sufficient balance for deployment (~0.5 AVAX recommended)

## 🛠️ Installation Steps

### Step 1: Install Dependencies
```bash
cd contracts
npm install
```

### Step 2: Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your details
nano .env
```

Required environment variables:
```env
# Your wallet private key (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# Snowtrace API key (OPTIONAL - FREE TIER AVAILABLE)
# Leave empty for free tier: 10,000 calls/day, 2 req/sec
SNOWTRACE_API_KEY=

# Optional: CoinMarketCap API for gas reporting
COINMARKETCAP_API_KEY=
```

**🆓 Good News**: Snowtrace now offers a **FREE tier** with no API key required!
- **10,000 API calls per day**
- **2 requests per second**
- **Perfect for hackathon development**

### Step 3: Get Testnet Funds
1. Visit [Avalanche Fuji Faucet](https://faucet.avax.network/)
2. Enter your wallet address
3. Request AVAX tokens
4. Wait for confirmation

### Step 4: Contract Verification Options
You have **3 options** for contract verification:

**Option 1: Automatic (Free API)**
- Leave `SNOWTRACE_API_KEY` empty in `.env`
- Uses free tier: 10,000 calls/day
- Run: `npm run verify:fuji`

**Option 2: Manual Verification**
- Set `SKIP_VERIFICATION=true` in `.env`
- Run: `npm run verify:manual`
- Follow generated instructions

**Option 3: Get API Key (Optional)**
- Visit: https://snowtrace.dev
- Request API key for higher limits
- Add to `.env` file

## 🌐 Network Configuration

### Avalanche Fuji Testnet (Recommended)
- **Network Name**: Avalanche Fuji C-Chain
- **RPC URL**: https://api.avax-test.network/ext/bc/C/rpc
- **Chain ID**: 43113
- **Symbol**: AVAX
- **Explorer**: https://testnet.snowtrace.io/

### Add to MetaMask
```javascript
// Network details for MetaMask
{
  "chainId": "0xA869", // 43113 in hex
  "chainName": "Avalanche Fuji Testnet",
  "rpcUrls": ["https://api.avax-test.network/ext/bc/C/rpc"],
  "nativeCurrency": {
    "name": "AVAX",
    "symbol": "AVAX",
    "decimals": 18
  },
  "blockExplorerUrls": ["https://testnet.snowtrace.io/"]
}
```

## 🚀 Deployment Process

### Step 1: Compile Contracts
```bash
npm run compile
```

Expected output:
```
✅ Compiled 8 Solidity files successfully
```

### Step 2: Run Tests (Optional but Recommended)
```bash
npm test
```

### Step 3: Deploy to Fuji Testnet
```bash
npm run deploy:fuji
```

Expected deployment output:
```
🌟 Starting SubnetYield Core deployment...

🌐 Network: fuji (Chain ID: 43113)
⚙️  Configuration loaded for fuji
👤 Deployer: 0x...
💰 Balance: 2.5 AVAX

🚀 Deploying MockDEXProtocol...
✅ MockDEXProtocol deployed to: 0x...
🔄 Initializing mock protocol with demo data...
✅ Mock protocol initialized with demo data

🚀 Deploying YieldScout...
   Teleporter: 0x253b2784c75e510dD0fF1da844684a1aC0aa5fcf
   Protocol: 0x...
   Supported tokens: 3
✅ YieldScout deployed to: 0x...

🔍 Verifying deployment...
✅ YieldScout owner: 0x...
✅ Supported tokens configured: 3
✅ Mock protocol name: SubnetDEX
✅ Mock protocol supports 3 tokens

📄 Deployment Summary:
{
  "network": "fuji",
  "timestamp": "2024-01-XX...",
  "contracts": {
    "yieldScout": "0x...",
    "mockProtocol": "0x..."
  }
}

💾 Deployment info saved to: ./deployments/fuji-....json

🎉 Deployment completed successfully!
```

### Step 4: Verify Contracts on Snowtrace
```bash
npm run verify:fuji
```

### Step 5: Test Deployment
```bash
npx hardhat run scripts/interact.ts --network fuji
```

## 📊 Post-Deployment Verification

### 1. Check Contract on Snowtrace
Visit: `https://testnet.snowtrace.io/address/YOUR_CONTRACT_ADDRESS`

Verify:
- [ ] Contract is verified (green checkmark)
- [ ] Source code is visible
- [ ] Contract has correct constructor parameters

### 2. Test Contract Functions
```bash
# Run interaction script
npx hardhat run scripts/interact.ts --network fuji
```

Expected test output:
```
🧪 Testing YieldScout contract...

1️⃣ Checking contract owner...
   Owner: 0x...

2️⃣ Checking supported tokens...
   0x5425890298aed601595a70AB815c96711a31Bc65: ✅ Supported
   0xd00ae08403B9bbb9124bB305C09058E32C39A48c: ✅ Supported
   0xB6076C93701D6a07266c31066B298AeC6dd65c2d: ✅ Supported

3️⃣ Testing protocol data retrieval...
   Token: 0x5425890298aed601595a70AB815c96711a31Bc65
   APY: 780 basis points (7.80%)
   TVL: 1000000.0 tokens
   Protocol: SubnetDEX
```

## 🔧 Troubleshooting

### Common Issues

#### 1. "Insufficient funds for gas"
**Solution**: Get more AVAX from the faucet
```bash
# Check your balance
npx hardhat run --network fuji -e "console.log(await ethers.provider.getBalance('YOUR_ADDRESS'))"
```

#### 2. "Network connection failed"
**Solution**: Check RPC URL and network configuration
```bash
# Test network connection
curl -X POST https://api.avax-test.network/ext/bc/C/rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

#### 3. "Private key invalid"
**Solution**: Ensure private key is correct format (64 characters, no 0x prefix)

#### 4. "Contract verification failed"
**Solution**: 
- Wait a few minutes after deployment
- Ensure Snowtrace API key is correct
- Check constructor parameters match deployment

### Gas Optimization Tips

1. **Deploy during low network usage**
2. **Use reasonable gas price** (25 gwei default)
3. **Batch operations** when possible

## 📝 Important Contract Addresses

### Fuji Testnet
```javascript
// Core contracts (update after deployment)
const YIELD_SCOUT_ADDRESS = "0x..."; // Your deployed YieldScout
const MOCK_PROTOCOL_ADDRESS = "0x..."; // Your deployed MockDEXProtocol

// System contracts
const TELEPORTER_MESSENGER = "0x253b2784c75e510dD0fF1da844684a1aC0aa5fcf";

// Test tokens
const USDC_FUJI = "0x5425890298aed601595a70AB815c96711a31Bc65";
const WAVAX_FUJI = "0xd00ae08403B9bbb9124bB305C09058E32C39A48c";
const USDT_FUJI = "0xB6076C93701D6a07266c31066B298AeC6dd65c2d";
```

## 🎯 Next Steps After Deployment

### 1. Frontend Integration
Update your frontend with deployed contract addresses:
```typescript
// In your frontend config
export const CONTRACTS = {
  YIELD_SCOUT: "0x...", // Your deployed address
  MOCK_PROTOCOL: "0x...", // Your deployed address
};
```

### 2. Cross-Chain Testing
- Deploy corresponding C-Chain contracts
- Test AWM message flow
- Verify end-to-end functionality

### 3. Demo Preparation
- Record backup demo video
- Test all user flows
- Prepare fallback explanations

## 🚨 Security Reminders

- [ ] **Never commit private keys** to version control
- [ ] **Use testnet only** for hackathon
- [ ] **Keep deployment info secure**
- [ ] **Verify all contract addresses** before use

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Hardhat documentation
3. Check Avalanche developer docs
4. Ask team members for help

## 🎉 Success Criteria

Your deployment is successful when:
- [ ] Contracts deployed without errors
- [ ] Contracts verified on Snowtrace
- [ ] All tests pass
- [ ] Mock protocol returns realistic data
- [ ] Ready for frontend integration

---

**Good luck with your hackathon deployment! 🚀**

*Team SubnetBlank | SubnetYield Core | Avalanche Hackathon 2024*