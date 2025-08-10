import { ethers } from "hardhat";

const CONFIG = {
  yieldHub: "0x15855D3E2fbC21694e65469Cc824eC61c2B62b27",
  wethToken: "0x28A8E6e41F84e62284970E4bc0867cEe2AAd0DA4",
};

async function debugTeleporter() {
  console.log("🔍 DEBUGGING TELEPORTER CONFIGURATION");
  console.log("====================================");

  const [deployer] = await ethers.getSigners();
  console.log(`👤 Account: ${deployer.address}`);

  try {
    const yieldHub = await ethers.getContractAt("YieldHub", CONFIG.yieldHub);
    console.log(`✅ Connected to YieldHub: ${CONFIG.yieldHub}`);

    // Check current configuration
    console.log("\n📋 Current Configuration:");
    const destChainId = await yieldHub.destChainId();
    const destReceiver = await yieldHub.destReceiver();
    const teleporterAddress = await yieldHub.teleporterMessenger();
    
    console.log(`  Destination Chain ID: ${destChainId}`);
    console.log(`  Destination Receiver: ${destReceiver}`);
    console.log(`  Teleporter Messenger: ${teleporterAddress}`);

    // Check if addresses are zero
    if (destChainId === "0x0000000000000000000000000000000000000000000000000000000000000000") {
      console.log("❌ Destination chain ID is zero!");
    }
    if (destReceiver === "0x0000000000000000000000000000000000000000") {
      console.log("❌ Destination receiver is zero!");  
    }
    if (teleporterAddress === "0x0000000000000000000000000000000000000000") {
      console.log("❌ Teleporter messenger is zero!");
    }

    // Check token support
    console.log("\n📋 Token Configuration:");
    const isWETHSupported = await yieldHub.isTokenSupported(CONFIG.wethToken);
    console.log(`  WETH supported: ${isWETHSupported}`);
    
    if (isWETHSupported) {
      const tokenDecimals = await yieldHub.getTokenDecimals(CONFIG.wethToken);
      console.log(`  WETH decimals: ${tokenDecimals}`);
    }

    // Test a simple call that should work
    console.log("\n🧪 Testing Contract State:");
    try {
      const paused = await yieldHub.paused();
      const emergencyMode = await yieldHub.emergencyMode();
      const dataFreshness = await yieldHub.dataFreshness();
      
      console.log(`  Contract paused: ${paused}`);
      console.log(`  Emergency mode: ${emergencyMode}`);
      console.log(`  Data freshness: ${dataFreshness} seconds`);
      
      if (paused) {
        console.log("❌ Contract is paused!");
      }
      if (emergencyMode) {
        console.log("❌ Contract is in emergency mode!");
      }
    } catch (stateError: any) {
      console.log(`⚠️  State check failed: ${stateError.message}`);
    }

    // Check owner and authorization
    console.log("\n📋 Authorization:");
    try {
      const owner = await yieldHub.owner();
      const isAuthorized = await yieldHub.authorizedCallers(deployer.address);
      
      console.log(`  Contract owner: ${owner}`);
      console.log(`  Deployer authorized: ${isAuthorized}`);
      console.log(`  Deployer is owner: ${owner.toLowerCase() === deployer.address.toLowerCase()}`);
      
      if (!isAuthorized && owner.toLowerCase() !== deployer.address.toLowerCase()) {
        console.log("⚠️  Deployer may not have permission to call functions");
      }
    } catch (authError: any) {
      console.log(`⚠️  Authorization check failed: ${authError.message}`);
    }

    // Test the specific function that's failing
    console.log("\n🧪 Testing requestSubnetYield Function:");
    try {
      // Try to call the function with callStatic to see what would happen
      console.log("  🔄 Testing with callStatic...");
      
      await yieldHub.requestSubnetYield.staticCall(CONFIG.wethToken, {
        value: ethers.parseEther("0.01"),
      });
      
      console.log("  ✅ Static call succeeded - function should work");
    } catch (staticError: any) {
      console.log(`  ❌ Static call failed: ${staticError.message}`);
      
      // Try to decode the error
      if (staticError.data) {
        try {
          const decodedError = yieldHub.interface.parseError(staticError.data);
          console.log(`  📋 Decoded error: ${decodedError?.name}`);
          if (decodedError?.args) {
            console.log(`  📋 Error args:`, decodedError.args);
          }
        } catch (decodeError) {
          console.log(`  📋 Raw error data: ${staticError.data}`);
        }
      }
      
      // Check specific conditions
      if (staticError.message.includes("Token not supported")) {
        console.log("  💡 Solution: Add token support first");
      } else if (staticError.message.includes("Dest chain not set")) {
        console.log("  💡 Solution: Set destination chain configuration");
      } else if (staticError.message.includes("Teleporter fee required")) {
        console.log("  💡 Solution: Ensure msg.value > 0");
      }
    }

    console.log("\n✅ Debug analysis complete!");

  } catch (error: any) {
    console.log(`❌ Debug failed: ${error.message}`);
    console.log("Full error:", error);
  }
}

async function main() {
  await debugTeleporter();
}

main().catch(console.error);