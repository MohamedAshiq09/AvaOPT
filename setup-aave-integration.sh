#!/bin/bash

# SubnetYield Core - Enhanced Aave Integration Setup Script
# This script helps deploy and configure the enhanced Aave integration

echo "🚀 SubnetYield Core - Enhanced Aave Integration Setup"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Please run this script from the project root directory${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Step 1: Installing dependencies...${NC}"
npm install

echo -e "${BLUE}📋 Step 2: Compiling contracts...${NC}"
cd contracts
npm run compile

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Contract compilation failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Contracts compiled successfully${NC}"

echo -e "${BLUE}📋 Step 3: Deploying AaveV3Adapter...${NC}"
echo -e "${YELLOW}⚠️  Make sure you have:${NC}"
echo "   - Sufficient AVAX in your wallet for deployment"
echo "   - MetaMask connected to Fuji testnet"
echo "   - Private key configured in .env file"

read -p "Press Enter to continue with deployment, or Ctrl+C to cancel..."

npm run deploy:aave-adapter

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Deployment failed${NC}"
    echo -e "${YELLOW}💡 Troubleshooting tips:${NC}"
    echo "   - Check your .env file has PRIVATE_KEY set"
    echo "   - Ensure you have AVAX for gas fees"
    echo "   - Verify you're connected to Fuji testnet"
    exit 1
fi

echo -e "${GREEN}✅ AaveV3Adapter deployed successfully${NC}"

cd ..

echo -e "${BLUE}📋 Step 4: Configuration reminder...${NC}"
echo -e "${YELLOW}⚠️  Don't forget to:${NC}"
echo "   1. Update AAVE_ADAPTER_ADDRESS in app/lib/web3-config.ts"
echo "   2. Update AAVE_ADAPTER_ADDRESS in app/lib/aave-service.ts"
echo "   3. Test the integration on Fuji testnet"

echo -e "${BLUE}📋 Step 5: Starting development server...${NC}"
echo "Starting Next.js development server..."

npm run dev &
DEV_PID=$!

echo -e "${GREEN}✅ Setup completed!${NC}"
echo -e "${BLUE}🌐 Your enhanced Aave integration is ready at: http://localhost:3000${NC}"
echo ""
echo -e "${YELLOW}📖 Next steps:${NC}"
echo "   1. Open http://localhost:3000 in your browser"
echo "   2. Connect your wallet to Fuji testnet"
echo "   3. Navigate to the 'Aave Details' tab"
echo "   4. Test the real-time data integration"
echo ""
echo -e "${BLUE}📚 Documentation: See AAVE_INTEGRATION.md for detailed usage${NC}"
echo ""
echo "Press Ctrl+C to stop the development server"

# Wait for user to stop the server
wait $DEV_PID