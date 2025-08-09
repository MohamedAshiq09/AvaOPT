import { run } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

interface DeploymentInfo {
  network: string;
  timestamp: string;
  contracts: {
    yieldScout: string;
    mockProtocol?: string;
  };
  configuration: {
    teleporterMessenger: string;
    supportedTokens: string[];
    deployedMockProtocol: boolean;
  };
}

async function getLatestDeployment(networkName: string): Promise<DeploymentInfo> {
  const deploymentsDir = path.join(__dirname, '../deployments');
  
  if (!fs.existsSync(deploymentsDir)) {
    throw new Error("No deployments directory found. Run deployment first.");
  }
  
  const files = fs.readdirSync(deploymentsDir)
    .filter(file => file.startsWith(networkName) && file.endsWith('.json'))
    .sort()
    .reverse();
  
  if (files.length === 0) {
    throw new Error(`No deployment files found for network: ${networkName}`);
  }
  
  const latestFile = files[0];
  const filePath = path.join(deploymentsDir, latestFile);
  const deploymentData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  console.log(`📄 Using deployment file: ${latestFile}`);
  return deploymentData;
}

async function verifyContract(
  contractAddress: string,
  constructorArguments: any[],
  contractName: string
): Promise<void> {
  console.log(`🔍 Verifying ${contractName} at ${contractAddress}...`);
  
  // Check if verification should be skipped
  if (process.env.SKIP_VERIFICATION === "true") {
    console.log(`⏭️  Skipping verification for ${contractName} (SKIP_VERIFICATION=true)`);
    return;
  }
  
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: constructorArguments,
    });
    console.log(`✅ ${contractName} verified successfully`);
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log(`✅ ${contractName} already verified`);
    } else if (error.message.includes("rate limit") || error.message.includes("API key")) {
      console.log(`⚠️  ${contractName} verification failed due to API limits`);
      console.log(`💡 Manual verification option:`);
      console.log(`   1. Go to: https://testnet.snowtrace.io/address/${contractAddress}`);
      console.log(`   2. Click "Contract" tab → "Verify and Publish"`);
      console.log(`   3. Select "Solidity (Single file)" or "Solidity (Standard JSON Input)"`);
      console.log(`   4. Upload your contract source code`);
      console.log(`   5. Set compiler version: 0.8.19`);
      console.log(`   6. Set optimization: Yes (200 runs)`);
    } else {
      console.error(`❌ Failed to verify ${contractName}:`, error.message);
      console.log(`💡 You can verify manually at: https://testnet.snowtrace.io/address/${contractAddress}`);
    }
  }
}

async function main(): Promise<void> {
  console.log("🔍 Starting contract verification...\n");
  
  // Get network name
  const networkName = process.env.HARDHAT_NETWORK || "fuji";
  console.log(`🌐 Network: ${networkName}`);
  
  // Get latest deployment info
  const deployment = await getLatestDeployment(networkName);
  
  console.log("📋 Contracts to verify:");
  console.log(`   YieldScout: ${deployment.contracts.yieldScout}`);
  if (deployment.contracts.mockProtocol) {
    console.log(`   MockDEXProtocol: ${deployment.contracts.mockProtocol}`);
  }
  console.log();
  
  // Verify MockDEXProtocol first (if deployed)
  if (deployment.contracts.mockProtocol && deployment.configuration.deployedMockProtocol) {
    await verifyContract(
      deployment.contracts.mockProtocol,
      [], // MockDEXProtocol has no constructor arguments
      "MockDEXProtocol"
    );
  }
  
  // Verify YieldScout
  const yieldScoutArgs = [
    deployment.configuration.teleporterMessenger,
    deployment.contracts.mockProtocol || process.env.EXISTING_PROTOCOL_ADDRESS,
    deployment.configuration.supportedTokens
  ];
  
  await verifyContract(
    deployment.contracts.yieldScout,
    yieldScoutArgs,
    "YieldScout"
  );
  
  console.log("\n🎉 Verification completed!");
  console.log("\n🔗 View on Snowtrace:");
  
  const baseUrl = networkName === "mainnet" 
    ? "https://snowtrace.io/address/" 
    : "https://testnet.snowtrace.io/address/";
  
  console.log(`YieldScout: ${baseUrl}${deployment.contracts.yieldScout}`);
  if (deployment.contracts.mockProtocol) {
    console.log(`MockDEXProtocol: ${baseUrl}${deployment.contracts.mockProtocol}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification failed:");
    console.error(error);
    process.exit(1);
  });