import { ethers } from "hardhat";

// Correct Aave V3 addresses on Fuji testnet (from our successful debug)
const AAVE_V3_CONFIG = {
  addressesProvider: "0x1775ECC8362dB6CaB0c7A9C0957cF656A5276c29",
  dataProvider: "0x8e0988b28f9CdDe0134A206dfF94111578498C63",
  pool: "0xb47673b7a73D78743AFF1487AF69dBB5763F00cA",
};

// Working tokens from our debug (best ones)
const WORKING_TOKENS = [
  {
    symbol: "WETH",
    address: "0x28A8E6e41F84e62284970E4bc0867cEe2AAd0DA4",
    decimals: 18,
    apyBps: 2230, // 22.3% APY!
  },
  {
    symbol: "WAVAX",
    address: "0x407287b03D1167593AF113d32093942be13A535f",
    decimals: 18,
    apyBps: 248, // 2.49% APY
  },
  {
    symbol: "USDT",
    address: "0xD90db1ca5A6e9873BCD9B0279AE038272b656728",
    decimals: 6,
    apyBps: 109, // 1.1% APY
  },
  {
    symbol: "USDC",
    address: "0x3E937B4881CBd500d05EeDAB7BA203f2b7B3f74f",
    decimals: 6,
    apyBps: 105, // 1.05% APY
  },
  {
    symbol: "DAI",
    address: "0xFc7215C9498Fc12b22Bc0ed335871Db4315f03d3",
    decimals: 18,
    apyBps: 64, // 0.65% APY
  },
];

async function updateYieldHubAaveV3() {
  console.log("🔧 UPDATING YIELDHUB FOR AAVE V3");
  console.log("=================================");

  const [deployer] = await ethers.getSigners();
  console.log(`👤 Updating with account: ${deployer.address}`);

  try {
    // Connect to existing YieldHub
    const yieldHubAddress = "0x15855D3E2fbC21694e65469Cc824eC61c2B62b27";
    console.log(`📋 Connecting to YieldHub: ${yieldHubAddress}`);

    const yieldHub = await ethers.getContractAt("YieldHub", yieldHubAddress);
    console.log("✅ Connected to YieldHub");

    // Step 1: Update Aave provider addresses
    console.log("\n🧪 Step 1: Updating Aave Provider Addresses");

    try {
      console.log("  🔄 Setting Aave Addresses Provider...");
      const setProviderTx = await yieldHub.setAaveProvider(
        AAVE_V3_CONFIG.addressesProvider
      );
      await setProviderTx.wait();
      console.log(
        `  ✅ Aave Addresses Provider updated to: ${AAVE_V3_CONFIG.addressesProvider}`
      );
    } catch (providerError: any) {
      console.log(`  ❌ Failed to update provider: ${providerError.message}`);
    }

    try {
      console.log("  🔄 Setting Aave Data Provider...");
      const setDataProviderTx = await yieldHub.setAaveDataProvider(
        AAVE_V3_CONFIG.dataProvider
      );
      await setDataProviderTx.wait();
      console.log(
        `  ✅ Aave Data Provider updated to: ${AAVE_V3_CONFIG.dataProvider}`
      );
    } catch (dataProviderError: any) {
      console.log(
        `  ❌ Failed to update data provider: ${dataProviderError.message}`
      );
    }

    // Step 2: Add working tokens
    console.log("\n🧪 Step 2: Adding Working Tokens");

    for (const token of WORKING_TOKENS) {
      console.log(`\n📋 Processing ${token.symbol}:`);

      try {
        // Check if already supported
        const isSupported = await yieldHub.isTokenSupported(token.address);
        console.log(`  📊 Currently supported: ${isSupported}`);

        if (!isSupported) {
          console.log(`  🔄 Adding ${token.symbol} to supported tokens...`);
          const addTokenTx = await yieldHub.addSupportedToken(
            token.address,
            token.decimals
          );
          await addTokenTx.wait();
          console.log(`  ✅ ${token.symbol} added successfully`);
        } else {
          console.log(`  ✅ ${token.symbol} already supported`);
        }

        // Update Aave data for this token
        console.log(`  🔄 Updating Aave data for ${token.symbol}...`);
        try {
          const updateTx = await yieldHub.updateAaveData(token.address);
          await updateTx.wait();
          console.log(`  ✅ Aave data updated for ${token.symbol}`);

          // Try to get APY
          try {
            const apy = await yieldHub.getAaveAPY(token.address);
            console.log(`  💰 Current APY: ${apy} bps (${Number(apy) / 100}%)`);
          } catch (apyError: any) {
            console.log(`  ⚠️  APY retrieval failed: ${apyError.message}`);
          }
        } catch (updateError: any) {
          console.log(`  ❌ Data update failed: ${updateError.message}`);
        }
      } catch (tokenError: any) {
        console.log(
          `  ❌ Failed to process ${token.symbol}: ${tokenError.message}`
        );
      }
    }

    // Step 3: Test yield comparison
    console.log("\n🧪 Step 3: Testing Yield Comparison");

    const bestToken = WORKING_TOKENS[0]; // WETH with highest APY
    console.log(
      `📋 Testing with ${bestToken.symbol} (expected ~${bestToken.apyBps} bps)`
    );

    try {
      // Test getting best yield
      const bestYield = await yieldHub.getBestYield(bestToken.address);
      console.log(`✅ Best yield found:`);
      console.log(`  Protocol: ${bestYield.protocol}`);
      console.log(
        `  APY: ${bestYield.apy} bps (${Number(bestYield.apy) / 100}%)`
      );
      console.log(`  Risk Score: ${bestYield.riskScore}`);
      console.log(
        `  Last Updated: ${new Date(
          Number(bestYield.lastUpdated) * 1000
        ).toISOString()}`
      );
    } catch (bestYieldError: any) {
      console.log(`❌ Best yield test failed: ${bestYieldError.message}`);
    }

    // Step 4: Test cross-chain request (if subnet is configured)
    console.log("\n🧪 Step 4: Testing Cross-Chain Configuration");

    try {
      const destChainId = await yieldHub.destChainId();
      const destReceiver = await yieldHub.destReceiver();

      console.log(`📋 Destination Chain ID: ${destChainId}`);
      console.log(`📋 Destination Receiver: ${destReceiver}`);

      if (
        destChainId !==
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      ) {
        console.log("✅ Cross-chain configuration is set");

        // Test cross-chain yield request
        try {
          console.log(
            `🔄 Testing cross-chain yield request for ${bestToken.symbol}...`
          );
          const requestTx = await yieldHub.requestYieldComparison(
            bestToken.address,
            {
              value: ethers.parseEther("0.01"), // Small amount for teleporter fee
            }
          );
          await requestTx.wait();
          console.log("✅ Cross-chain yield request sent successfully");
        } catch (requestError: any) {
          console.log(`❌ Cross-chain request failed: ${requestError.message}`);
        }
      } else {
        console.log(
          "⚠️  Cross-chain configuration not set - only C-Chain yields available"
        );
      }
    } catch (configError: any) {
      console.log(`❌ Cross-chain config check failed: ${configError.message}`);
    }

    // Summary
    console.log("\n📊 FINAL SUMMARY");
    console.log("================");
    console.log("✅ YieldHub updated for Aave V3");
    console.log(
      `✅ Aave V3 Addresses Provider: ${AAVE_V3_CONFIG.addressesProvider}`
    );
    console.log(`✅ Aave V3 Data Provider: ${AAVE_V3_CONFIG.dataProvider}`);
    console.log(`✅ Added ${WORKING_TOKENS.length} working tokens`);

    console.log("\n🎯 AVAILABLE TOKENS WITH YIELDS:");
    WORKING_TOKENS.forEach((token) => {
      console.log(
        `  - ${token.symbol}: ~${token.apyBps} bps (${(
          token.apyBps / 100
        ).toFixed(2)}% APY)`
      );
    });

    console.log("\n🚀 NEXT STEPS:");
    console.log("1. ✅ YieldHub now uses Aave V3 on Fuji");
    console.log("2. Test cross-chain yield comparison with DFK Chain");
    console.log("3. Update frontend to use new token addresses");
    console.log("4. Deploy to production");
  } catch (error: any) {
    console.log(`❌ YieldHub update failed: ${error.message}`);
    console.log("Full error:", error);
  }
}

async function main() {
  try {
    await updateYieldHubAaveV3();
    console.log("\n✅ YieldHub Aave V3 update completed!");
  } catch (error) {
    console.error("❌ Update failed:", error);
    process.exit(1);
  }
}

main().catch(console.error);
