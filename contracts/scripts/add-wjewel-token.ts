import { ethers } from "hardhat";

const CONFIG = {
  yieldHub: "0x15855D3E2fbC21694e65469Cc824eC61c2B62b27",
  wjewelToken: "0xCCb93dABD71c8Dad03Fc4CE5559dC3D89F67a260", // wJEWEL on DFK Chain
  tokenDecimals: 18,
};

async function addWJEWELToken() {
  console.log("🏰 ADDING wJEWEL TOKEN SUPPORT");
  console.log("==============================");

  const [deployer] = await ethers.getSigners();
  console.log(`👤 Account: ${deployer.address}`);

  try {
    const yieldHub = await ethers.getContractAt("YieldHub", CONFIG.yieldHub);
    console.log(`✅ Connected to YieldHub: ${CONFIG.yieldHub}`);

    // Check if token is already supported
    console.log("\n🔍 Checking current token support...");
    const isSupported = await yieldHub.isTokenSupported(CONFIG.wjewelToken);
    console.log(`📋 wJEWEL currently supported: ${isSupported}`);

    if (!isSupported) {
      console.log("\n🔄 Adding wJEWEL token support...");
      const addTokenTx = await yieldHub.addSupportedToken(
        CONFIG.wjewelToken,
        CONFIG.tokenDecimals
      );
      await addTokenTx.wait();
      console.log("✅ wJEWEL token added successfully");
    }

    // Test Aave data retrieval
    console.log("\n🧪 Testing Aave data for wJEWEL...");
    try {
      await yieldHub.updateAaveData(CONFIG.wjewelToken);
      console.log("✅ Aave data updated successfully");
      
      const aaveAPY = await yieldHub.getAaveAPY(CONFIG.wjewelToken);
      console.log(`📊 Aave APY: ${aaveAPY} bps (${Number(aaveAPY) / 100}%)`);
    } catch (aaveError: any) {
      console.log(`⚠️  Aave integration not available: ${aaveError.message}`);
    }

    // Check configuration
    console.log("\n🔍 Checking cross-chain configuration...");
    const destChainId = await yieldHub.destChainId();
    const destReceiver = await yieldHub.destReceiver();
    
    console.log(`📋 Destination Chain ID: ${destChainId}`);
    console.log(`📋 Destination Receiver: ${destReceiver}`);

    if (destChainId === "0x049d555e169b2f9b14d891b35999cdefb993fb59ab35b82099a98b4b4b5a1254") {
      console.log("✅ Correct DFK Teleporter blockchain ID configured");
    } else {
      console.log("⚠️  Incorrect blockchain ID - needs update");
    }

    console.log("\n✅ wJEWEL token setup complete!");

  } catch (error: any) {
    console.log(`❌ Setup failed: ${error.message}`);
    console.log("Full error:", error);
  }
}

async function main() {
  await addWJEWELToken();
}

main().catch(console.error);