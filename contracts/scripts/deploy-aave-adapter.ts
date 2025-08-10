import { ethers } from "hardhat";
import { CONTRACT_CONFIG } from "../hardhat.config";

async function main() {
  console.log("🚀 Deploying AaveV3Adapter...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)));

  // Aave V3 addresses on Fuji testnet
  const AAVE_ADDRESSES_PROVIDER = "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb";
  const AAVE_DATA_PROVIDER = "0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654";

  try {
    // Deploy AaveV3Adapter
    console.log("\n📋 Deploying AaveV3Adapter...");
    const AaveV3Adapter = await ethers.getContractFactory("AaveV3Adapter");
    const aaveAdapter = await AaveV3Adapter.deploy(
      AAVE_ADDRESSES_PROVIDER,
      AAVE_DATA_PROVIDER
    );

    await aaveAdapter.waitForDeployment();
    const aaveAdapterAddress = await aaveAdapter.getAddress();

    console.log("✅ AaveV3Adapter deployed to:", aaveAdapterAddress);

    // Verify deployment by calling a view function
    console.log("\n🔍 Verifying deployment...");
    try {
      const allTokens = await aaveAdapter.getAllReserveTokens();
      console.log("✅ Deployment verified! Found", allTokens.length, "reserve tokens");
      
      if (allTokens.length > 0) {
        console.log("Sample tokens:", allTokens.slice(0, 3));
      }
    } catch (error) {
      console.log("⚠️  Verification failed, but contract deployed:", error);
    }

    // Save deployment info
    const deploymentInfo = {
      network: "fuji",
      timestamp: new Date().toISOString(),
      deployer: deployer.address,
      contracts: {
        AaveV3Adapter: {
          address: aaveAdapterAddress,
          constructorArgs: [AAVE_ADDRESSES_PROVIDER, AAVE_DATA_PROVIDER],
        },
      },
      aaveConfig: {
        addressesProvider: AAVE_ADDRESSES_PROVIDER,
        dataProvider: AAVE_DATA_PROVIDER,
      },
    };

    console.log("\n📄 Deployment Summary:");
    console.log("=".repeat(50));
    console.log("Network:", deploymentInfo.network);
    console.log("Deployer:", deploymentInfo.deployer);
    console.log("AaveV3Adapter:", aaveAdapterAddress);
    console.log("Aave Addresses Provider:", AAVE_ADDRESSES_PROVIDER);
    console.log("Aave Data Provider:", AAVE_DATA_PROVIDER);
    console.log("=".repeat(50));

    // Instructions for frontend integration
    console.log("\n🔧 Frontend Integration:");
    console.log("Update app/lib/web3-config.ts:");
    console.log(`AAVE_ADAPTER_ADDRESS: '${aaveAdapterAddress}',`);
    
    console.log("\n🔧 Update app/lib/aave-service.ts:");
    console.log(`const AAVE_ADAPTER_ADDRESS = '${aaveAdapterAddress}';`);

    return {
      aaveAdapter: aaveAdapterAddress,
    };

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

// Execute deployment
main()
  .then((addresses) => {
    console.log("\n🎉 Deployment completed successfully!");
    console.log("Contract addresses:", addresses);
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Deployment script failed:", error);
    process.exit(1);
  });