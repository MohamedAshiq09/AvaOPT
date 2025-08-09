import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

interface DeploymentInfo {
  network: string;
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
  const files = fs.readdirSync(deploymentsDir)
    .filter(file => file.startsWith(networkName) && file.endsWith('.json'))
    .sort()
    .reverse();
  
  if (files.length === 0) {
    throw new Error(`No deployment files found for network: ${networkName}`);
  }
  
  const latestFile = files[0];
  const filePath = path.join(deploymentsDir, latestFile);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function generateVerificationData(deployment: DeploymentInfo): Promise<void> {
  console.log("📋 Manual Verification Guide for Snowtrace\n");
  
  const networkName = deployment.network;
  const baseUrl = networkName === "mainnet" 
    ? "https://snowtrace.io" 
    : "https://testnet.snowtrace.io";
  
  console.log(`🌐 Network: ${networkName}`);
  console.log(`🔗 Explorer: ${baseUrl}\n`);
  
  // YieldScout verification data
  console.log("🎯 YieldScout Contract Verification:");
  console.log(`📍 Address: ${deployment.contracts.yieldScout}`);
  console.log(`🔗 URL: ${baseUrl}/address/${deployment.contracts.yieldScout}#code`);
  console.log("⚙️  Constructor Arguments:");
  console.log(`   teleporterMessenger: ${deployment.configuration.teleporterMessenger}`);
  console.log(`   localProtocol: ${deployment.contracts.mockProtocol || "REPLACE_WITH_ACTUAL_PROTOCOL"}`);
  console.log(`   supportedTokens: [${deployment.configuration.supportedTokens.map(t => `"${t}"`).join(", ")}]`);
  
  // Generate ABI-encoded constructor arguments
  const { ethers } = require("hardhat");
  const yieldScoutArgs = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "address", "address[]"],
    [
      deployment.configuration.teleporterMessenger,
      deployment.contracts.mockProtocol || deployment.configuration.teleporterMessenger, // fallback
      deployment.configuration.supportedTokens
    ]
  );
  console.log(`📝 ABI-Encoded Constructor Arguments: ${yieldScoutArgs.slice(2)}\n`); // Remove 0x prefix
  
  // MockDEXProtocol verification data (if deployed)
  if (deployment.contracts.mockProtocol && deployment.configuration.deployedMockProtocol) {
    console.log("🎯 MockDEXProtocol Contract Verification:");
    console.log(`📍 Address: ${deployment.contracts.mockProtocol}`);
    console.log(`🔗 URL: ${baseUrl}/address/${deployment.contracts.mockProtocol}#code`);
    console.log("⚙️  Constructor Arguments: None (empty)\n");
  }
  
  // Verification steps
  console.log("📋 Manual Verification Steps:");
  console.log("1. Go to the contract address URL above");
  console.log("2. Click on the 'Contract' tab");
  console.log("3. Click 'Verify and Publish'");
  console.log("4. Select verification method:");
  console.log("   - Option 1: 'Solidity (Single file)' - Upload flattened contract");
  console.log("   - Option 2: 'Solidity (Standard JSON Input)' - Upload compilation artifacts");
  console.log("5. Set compiler configuration:");
  console.log("   - Compiler Version: 0.8.19");
  console.log("   - Optimization: Yes");
  console.log("   - Runs: 200");
  console.log("   - EVM Version: default");
  console.log("6. Paste constructor arguments (if any) from above");
  console.log("7. Click 'Verify and Publish'\n");
  
  // Generate flattened contracts for easy verification
  console.log("🔧 Generating flattened contracts for verification...");
  
  try {
    const { execSync } = require('child_process');
    
    // Flatten YieldScout
    const yieldScoutFlattened = execSync('npx hardhat flatten contracts/YieldScout.sol', { encoding: 'utf8' });
    const yieldScoutPath = path.join(__dirname, '../verification/YieldScout_flattened.sol');
    
    // Create verification directory
    const verificationDir = path.join(__dirname, '../verification');
    if (!fs.existsSync(verificationDir)) {
      fs.mkdirSync(verificationDir, { recursive: true });
    }
    
    fs.writeFileSync(yieldScoutPath, yieldScoutFlattened);
    console.log(`✅ YieldScout flattened: ${yieldScoutPath}`);
    
    // Flatten MockDEXProtocol if deployed
    if (deployment.contracts.mockProtocol) {
      const mockProtocolFlattened = execSync('npx hardhat flatten contracts/mocks/MockDEXProtocol.sol', { encoding: 'utf8' });
      const mockProtocolPath = path.join(__dirname, '../verification/MockDEXProtocol_flattened.sol');
      fs.writeFileSync(mockProtocolPath, mockProtocolFlattened);
      console.log(`✅ MockDEXProtocol flattened: ${mockProtocolPath}`);
    }
    
  } catch (error) {
    console.log("⚠️  Could not generate flattened contracts. You can do this manually:");
    console.log("   npx hardhat flatten contracts/YieldScout.sol > YieldScout_flattened.sol");
    if (deployment.contracts.mockProtocol) {
      console.log("   npx hardhat flatten contracts/mocks/MockDEXProtocol.sol > MockDEXProtocol_flattened.sol");
    }
  }
  
  // Alternative: No-API verification info
  console.log("\n💡 Alternative: Free API Verification");
  console.log("The new Snowtrace system allows up to 10,000 free API calls per day without a key.");
  console.log("If automatic verification fails, it's likely due to rate limits, not API key issues.");
  console.log("You can retry verification later or use the manual method above.");
  
  // Save verification info to file
  const verificationInfo = {
    network: deployment.network,
    timestamp: new Date().toISOString(),
    contracts: {
      yieldScout: {
        address: deployment.contracts.yieldScout,
        constructorArgs: yieldScoutArgs,
        verificationUrl: `${baseUrl}/address/${deployment.contracts.yieldScout}#code`
      },
      mockProtocol: deployment.contracts.mockProtocol ? {
        address: deployment.contracts.mockProtocol,
        constructorArgs: "0x", // No constructor args
        verificationUrl: `${baseUrl}/address/${deployment.contracts.mockProtocol}#code`
      } : undefined
    },
    compilerSettings: {
      version: "0.8.19",
      optimization: true,
      runs: 200
    }
  };
  
  const verificationPath = path.join(__dirname, '../verification/verification-info.json');
  fs.writeFileSync(verificationPath, JSON.stringify(verificationInfo, null, 2));
  console.log(`\n💾 Verification info saved: ${verificationPath}`);
}

async function main(): Promise<void> {
  console.log("🔍 Generating manual verification data...\n");
  
  const networkName = process.env.HARDHAT_NETWORK || "fuji";
  console.log(`🌐 Network: ${networkName}`);
  
  try {
    const deployment = await getLatestDeployment(networkName);
    await generateVerificationData(deployment);
    
    console.log("\n🎉 Manual verification data generated successfully!");
    console.log("\n📋 Next Steps:");
    console.log("1. Use the URLs above to manually verify contracts");
    console.log("2. Upload the flattened contract files from ./verification/");
    console.log("3. Use the constructor arguments provided above");
    console.log("4. Set compiler version to 0.8.19 with optimization enabled");
    
  } catch (error: any) {
    console.error("❌ Failed to generate verification data:");
    console.error(error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });