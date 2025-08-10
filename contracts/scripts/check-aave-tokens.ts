import { ethers } from "hardhat";

const CONFIG = {
  yieldHub: "0x15855D3E2fbC21694e65469Cc824eC61c2B62b27",
  // Common testnet tokens that might be in Aave V3 Fuji
  testTokens: [
    { name: "WETH", address: "0x28A8E6e41F84e62284970E4bc0867cEe2AAd0DA4", decimals: 18 },
    { name: "USDC", address: "0x5425890298aed601595a70AB815c96711a31Bc65", decimals: 6 },
    { name: "WAVAX", address: "0xd00ae08403B9bbb9124bB305C09058E32C39A48c", decimals: 18 },
    { name: "USDT", address: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", decimals: 6 },
    { name: "WBTC", address: "0x50b7545627a5162F82A992c33b87aDc75187B218", decimals: 8 },
  ]
};

async function checkAaveTokens() {
  console.log("🔍 CHECKING AAVE V3 TOKEN AVAILABILITY");
  console.log("=====================================");

  const [deployer] = await ethers.getSigners();
  console.log(`👤 Account: ${deployer.address}`);

  try {
    const yieldHub = await ethers.getContractAt("YieldHub", CONFIG.yieldHub);
    console.log(`✅ Connected to YieldHub: ${CONFIG.yieldHub}`);

    console.log("\n🧪 Testing Aave token support...");

    for (const token of CONFIG.testTokens) {
      console.log(`\n📋 Testing ${token.name} (${token.address}):`);
      
      try {
        // Try to add the token and see if it works
        console.log(`  🔄 Adding ${token.name} token...`);
        const addTokenTx = await yieldHub.addSupportedToken(
          token.address,
          token.decimals
        );
        await addTokenTx.wait();
        console.log(`  ✅ ${token.name} added successfully`);

        // Test Aave data retrieval
        console.log(`  🔄 Testing Aave data for ${token.name}...`);
        const updateTx = await yieldHub.updateAaveData(token.address);
        await updateTx.wait();
        console.log(`  ✅ Aave data updated for ${token.name}`);
        
        const aaveAPY = await yieldHub.getAaveAPY(token.address);
        const aaveTVL = await yieldHub.getAaveTVL(token.address);
        console.log(`  📊 ${token.name} Aave APY: ${aaveAPY} bps (${Number(aaveAPY) / 100}%)`);
        console.log(`  📊 ${token.name} Aave TVL: ${aaveTVL}`);

        // Test cross-chain request
        console.log(`  🔄 Testing cross-chain request for ${token.name}...`);
        try {
          const requestTx = await yieldHub.requestSubnetYield(token.address, {
            value: ethers.parseEther("0.01"),
            gasLimit: 800000,
          });
          const receipt = await requestTx.wait();
          console.log(`  ✅ Cross-chain request sent! Block: ${receipt?.blockNumber}`);
          console.log(`  🎯 ${token.name} is fully working for cross-chain!`);
          
          // This token works, let's use it
          console.log(`\n🎉 WORKING TOKEN FOUND: ${token.name}`);
          console.log(`📋 Address: ${token.address}`);
          console.log(`📋 Use this for testing cross-chain functionality`);
          break;

        } catch (requestError: any) {
          console.log(`  ⚠️  Cross-chain request failed: ${requestError.message}`);
        }

      } catch (tokenError: any) {
        console.log(`  ❌ ${token.name} failed: ${tokenError.message}`);
      }
    }

  } catch (error: any) {
    console.log(`❌ Check failed: ${error.message}`);
    console.log("Full error:", error);
  }
}

async function main() {
  await checkAaveTokens();
}

main().catch(console.error);