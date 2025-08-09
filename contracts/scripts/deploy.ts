import { ethers } from "hardhat";
import { Contract } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

interface DeploymentConfig {
  teleporterMessenger: string;
  supportedTokens: string[];
  deployMockProtocol: boolean;
  networkName: string;
}

interface DeploymentResult {
  yieldScout: Contract;
  mockProtocol?: Contract;
  addresses: {
    yieldScout: string;
    mockProtocol?: string;
  };
}

async function getDeploymentConfig(networkName: string): Promise<DeploymentConfig> {
  const supportedTokens = [
    process.env.USDC_FUJI || "0x5425890298aed601595a70AB815c96711a31Bc65",
    process.env.WAVAX_FUJI || "0xd00ae08403B9bbb9124bB305C09058E32C39A48c",
    process.env.USDT_FUJI || "0xB6076C93701D6a07266c31066B298AeC6dd65c2d"
  ];

  switch (networkName) {
    case "fuji":
      return {
        teleporterMessenger: process.env.TELEPORTER_MESSENGER_FUJI || "0x253b2784c75e510dD0fF1da844684a1aC0aa5fcf",
        supportedTokens,
        deployMockProtocol: process.env.DEPLOY_MOCK_PROTOCOL === "true",
        networkName: "fuji"
      };
    case "mainnet":
      return {
        teleporterMessenger: process.env.TELEPORTER_MESSENGER_MAINNET || "0x253b2784c75e510dD0fF1da844684a1aC0aa5fcf",
        supportedTokens,
        deployMockProtocol: false, // Never deploy mock on mainnet
        networkName: "mainnet"
      };
    case "localhost":
    case "hardhat":
      return {
        teleporterMessenger: "0x253b2784c75e510dD0fF1da844684a1aC0aa5fcf", // Mock address for local testing
        supportedTokens,
        deployMockProtocol: true,
        networkName: "local"
      };
    default:
      throw new Error(`Unsupported network: ${networkName}`);
  }
}

async function deployRealProtocol(): Promise<Contract> {
  console.log("🚀 Deploying DeFi Kingdoms Adapter...");
  
  const DeFiKingdomsAdapter = await ethers.getContractFactory("DeFiKingdomsAdapter");
  const realProtocol = await DeFiKingdomsAdapter.deploy();
  await realProtocol.waitForDeployment();
  
  const address = await realProtocol.getAddress();
  console.log(`✅ DeFi Kingdoms Adapter deployed to: ${address}`);
  
  // Initialize with real protocol data
  console.log("🔄 Initializing DeFi Kingdoms adapter...");
  const tx = await realProtocol.updateProtocolData();
  await tx.wait();
  console.log("✅ DeFi Kingdoms adapter initialized with real data");
  
  return realProtocol;
}

async function deployMockProtocol(): Promise<Contract> {
  console.log("🚀 Deploying MockDEXProtocol (fallback)...");
  
  const MockDEXProtocol = await ethers.getContractFactory("MockDEXProtocol");
  const mockProtocol = await MockDEXProtocol.deploy();
  await mockProtocol.waitForDeployment();
  
  const address = await mockProtocol.getAddress();
  console.log(`✅ MockDEXProtocol deployed to: ${address}`);
  
  // Initialize with some activity for demo
  console.log("🔄 Initializing mock protocol with demo data...");
  const tx = await mockProtocol.simulateActivity();
  await tx.wait();
  console.log("✅ Mock protocol initialized with demo data");
  
  return mockProtocol;
}

async function deployYieldScout(
  teleporterAddress: string,
  protocolAddress: string,
  supportedTokens: string[]
): Promise<Contract> {
  console.log("🚀 Deploying YieldScout...");
  console.log(`   Teleporter: ${teleporterAddress}`);
  console.log(`   Protocol: ${protocolAddress}`);
  console.log(`   Supported tokens: ${supportedTokens.length}`);
  
  const YieldScout = await ethers.getContractFactory("YieldScout");
  const yieldScout = await YieldScout.deploy(
    teleporterAddress,
    protocolAddress,
    supportedTokens
  );
  await yieldScout.waitForDeployment();
  
  const address = await yieldScout.getAddress();
  console.log(`✅ YieldScout deployed to: ${address}`);
  
  return yieldScout;
}

async function verifyDeployment(result: DeploymentResult): Promise<void> {
  console.log("\n🔍 Verifying deployment...");
  
  // Check YieldScout
  const owner = await result.yieldScout.owner();
  console.log(`✅ YieldScout owner: ${owner}`);
  
  // Check supported tokens
  const tokenCount = await result.yieldScout.supportedTokens.length;
  console.log(`✅ Supported tokens configured: ${tokenCount}`);
  
  if (result.mockProtocol) {
    const protocolName = await result.mockProtocol.getProtocolName();
    console.log(`✅ Mock protocol name: ${protocolName}`);
    
    const supportedTokens = await result.mockProtocol.getSupportedTokens();
    console.log(`✅ Mock protocol supports ${supportedTokens.length} tokens`);
  }
}

async function saveDeploymentInfo(result: DeploymentResult, config: DeploymentConfig): Promise<void> {
  const deploymentInfo = {
    network: config.networkName,
    timestamp: new Date().toISOString(),
    contracts: {
      yieldScout: result.addresses.yieldScout,
      mockProtocol: result.addresses.mockProtocol
    },
    configuration: {
      teleporterMessenger: config.teleporterMessenger,
      supportedTokens: config.supportedTokens,
      deployedMockProtocol: config.deployMockProtocol
    }
  };
  
  console.log("\n📄 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  // Save to file
  const fs = require('fs');
  const path = require('path');
  
  const deploymentsDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const filename = `${config.networkName}-${Date.now()}.json`;
  const filepath = path.join(deploymentsDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`💾 Deployment info saved to: ${filepath}`);
}

async function main(): Promise<void> {
  console.log("🌟 Starting SubnetYield Core deployment...\n");
  
  // Get network info
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "localhost" : network.name;
  
  console.log(`🌐 Network: ${networkName} (Chain ID: ${network.chainId})`);
  
  // Get deployment configuration
  const config = await getDeploymentConfig(networkName);
  console.log(`⚙️  Configuration loaded for ${config.networkName}`);
  
  // Get deployer info
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(deployerAddress);
  
  console.log(`👤 Deployer: ${deployerAddress}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} AVAX\n`);
  
  if (balance < ethers.parseEther("0.1")) {
    console.warn("⚠️  Warning: Low balance. Make sure you have enough AVAX for deployment.");
  }
  
  let realProtocol: Contract | undefined;
  let mockProtocol: Contract | undefined;
  let protocolAddress: string;
  
  // Try to deploy real DeFi Kingdoms adapter first
  try {
    console.log("🎯 Attempting to deploy real DeFi Kingdoms adapter...");
    realProtocol = await deployRealProtocol();
    protocolAddress = await realProtocol.getAddress();
    console.log("✅ Using real DeFi Kingdoms protocols!");
  } catch (error) {
    console.log("⚠️  Real protocol deployment failed, falling back to mock...");
    console.log(`Error: ${error}`);
    
    if (config.deployMockProtocol) {
      mockProtocol = await deployMockProtocol();
      protocolAddress = await mockProtocol.getAddress();
      console.log("📋 Using mock protocol as fallback");
    } else {
      // Use existing protocol address
      protocolAddress = process.env.EXISTING_PROTOCOL_ADDRESS || "";
      if (!protocolAddress) {
        throw new Error("EXISTING_PROTOCOL_ADDRESS not set and mock protocol deployment disabled");
      }
      console.log(`📋 Using existing protocol at: ${protocolAddress}`);
    }
  }
  
  // Deploy YieldScout
  const yieldScout = await deployYieldScout(
    config.teleporterMessenger,
    protocolAddress,
    config.supportedTokens
  );
  
  // Prepare result
  const result: DeploymentResult = {
    yieldScout,
    mockProtocol: realProtocol || mockProtocol,
    addresses: {
      yieldScout: await yieldScout.getAddress(),
      mockProtocol: (realProtocol || mockProtocol) ? await (realProtocol || mockProtocol)!.getAddress() : undefined
    }
  };
  
  // Verify deployment
  await verifyDeployment(result);
  
  // Save deployment info
  await saveDeploymentInfo(result, config);
  
  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n📋 Next Steps:");
  console.log("1. Verify contracts on Snowtrace (run: npm run verify:fuji)");
  console.log("2. Update frontend with contract addresses");
  console.log("3. Test cross-chain communication");
  console.log("4. Fund contracts with test tokens if needed");
  
  console.log("\n🔗 Contract Addresses:");
  console.log(`YieldScout: ${result.addresses.yieldScout}`);
  if (result.addresses.mockProtocol) {
    console.log(`MockDEXProtocol: ${result.addresses.mockProtocol}`);
  }
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });