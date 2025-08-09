import { ethers } from "hardhat";
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
    supportedTokens: string[];
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

async function testYieldScout(deployment: DeploymentInfo): Promise<void> {
  console.log("🧪 Testing YieldScout contract...\n");
  
  // Get contract instance
  const YieldScout = await ethers.getContractFactory("YieldScout");
  const yieldScout = YieldScout.attach(deployment.contracts.yieldScout);
  
  // Test 1: Check owner
  console.log("1️⃣ Checking contract owner...");
  const owner = await yieldScout.owner();
  console.log(`   Owner: ${owner}`);
  
  // Test 2: Check supported tokens
  console.log("\n2️⃣ Checking supported tokens...");
  for (const token of deployment.configuration.supportedTokens) {
    const isSupported = await yieldScout.supportedTokens(token);
    console.log(`   ${token}: ${isSupported ? '✅ Supported' : '❌ Not supported'}`);
  }
  
  // Test 3: Get protocol data (if mock protocol is deployed)
  if (deployment.contracts.mockProtocol) {
    console.log("\n3️⃣ Testing protocol data retrieval...");
    
    for (const token of deployment.configuration.supportedTokens) {
      try {
        const apy = await yieldScout.getLocalProtocolAPY(token);
        const protocolData = await yieldScout.getProtocolData(token);
        
        console.log(`   Token: ${token}`);
        console.log(`   APY: ${apy.toString()} basis points (${(Number(apy) / 100).toFixed(2)}%)`);
        console.log(`   TVL: ${ethers.formatEther(protocolData.tvl)} tokens`);
        console.log(`   Protocol: ${protocolData.protocolName}`);
        console.log(`   Last Updated: ${new Date(Number(protocolData.timestamp) * 1000).toLocaleString()}`);
        console.log();
      } catch (error: any) {
        console.log(`   ❌ Error getting data for ${token}: ${error.message}`);
      }
    }
  }
  
  // Test 4: Check data freshness
  console.log("4️⃣ Checking data freshness...");
  for (const token of deployment.configuration.supportedTokens) {
    try {
      const isFresh = await yieldScout.isDataFresh(token);
      console.log(`   ${token}: ${isFresh ? '🟢 Fresh' : '🟡 Stale'}`);
    } catch (error: any) {
      console.log(`   ❌ Error checking freshness for ${token}: ${error.message}`);
    }
  }
}

async function testMockProtocol(deployment: DeploymentInfo): Promise<void> {
  if (!deployment.contracts.mockProtocol) {
    console.log("⏭️  Skipping mock protocol tests (not deployed)");
    return;
  }
  
  console.log("\n🧪 Testing MockDEXProtocol contract...\n");
  
  // Get contract instance
  const MockDEXProtocol = await ethers.getContractFactory("MockDEXProtocol");
  const mockProtocol = MockDEXProtocol.attach(deployment.contracts.mockProtocol);
  
  // Test 1: Get protocol name
  console.log("1️⃣ Getting protocol info...");
  const protocolName = await mockProtocol.getProtocolName();
  console.log(`   Protocol Name: ${protocolName}`);
  
  // Test 2: Get supported tokens
  console.log("\n2️⃣ Getting supported tokens...");
  const supportedTokens = await mockProtocol.getSupportedTokens();
  console.log(`   Supported tokens: ${supportedTokens.length}`);
  
  // Test 3: Get APY and TVL for each token
  console.log("\n3️⃣ Getting yield data...");
  for (const token of supportedTokens) {
    try {
      const apy = await mockProtocol.getAPY(token);
      const tvl = await mockProtocol.getTVL(token);
      const poolInfo = await mockProtocol.getPoolInfo(token);
      
      console.log(`   Token: ${token}`);
      console.log(`   APY: ${apy.toString()} basis points (${(Number(apy) / 100).toFixed(2)}%)`);
      console.log(`   TVL: ${ethers.formatEther(tvl)} tokens`);
      console.log(`   Pool: ${poolInfo.poolAddress}`);
      console.log(`   Utilization: ${(Number(poolInfo.utilizationRate) / 100).toFixed(2)}%`);
      console.log();
    } catch (error: any) {
      console.log(`   ❌ Error getting data for ${token}: ${error.message}`);
    }
  }
  
  // Test 4: Simulate activity
  console.log("4️⃣ Simulating protocol activity...");
  try {
    const [signer] = await ethers.getSigners();
    const tx = await mockProtocol.connect(signer).simulateActivity();
    await tx.wait();
    console.log("   ✅ Activity simulation completed");
    
    // Check updated data
    console.log("\n   📊 Updated yield data:");
    for (const token of supportedTokens.slice(0, 2)) { // Just check first 2 tokens
      const apy = await mockProtocol.getAPY(token);
      console.log(`   ${token}: ${(Number(apy) / 100).toFixed(2)}% APY`);
    }
  } catch (error: any) {
    console.log(`   ❌ Error simulating activity: ${error.message}`);
  }
}

async function updateProtocolData(deployment: DeploymentInfo): Promise<void> {
  console.log("\n🔄 Updating protocol data...\n");
  
  const YieldScout = await ethers.getContractFactory("YieldScout");
  const yieldScout = YieldScout.attach(deployment.contracts.yieldScout);
  
  const [signer] = await ethers.getSigners();
  
  for (const token of deployment.configuration.supportedTokens) {
    try {
      console.log(`   Updating data for ${token}...`);
      const tx = await yieldScout.connect(signer).updateProtocolData(token);
      await tx.wait();
      console.log(`   ✅ Updated successfully`);
    } catch (error: any) {
      console.log(`   ❌ Error updating ${token}: ${error.message}`);
    }
  }
}

async function main(): Promise<void> {
  console.log("🔧 Starting contract interaction tests...\n");
  
  // Get network name
  const networkName = process.env.HARDHAT_NETWORK || "fuji";
  console.log(`🌐 Network: ${networkName}`);
  
  // Get latest deployment
  const deployment = await getLatestDeployment(networkName);
  console.log(`📄 Using deployment from: ${deployment.network}\n`);
  
  // Run tests
  await testYieldScout(deployment);
  await testMockProtocol(deployment);
  await updateProtocolData(deployment);
  
  console.log("\n🎉 All tests completed!");
  console.log("\n📋 Summary:");
  console.log(`✅ YieldScout contract: ${deployment.contracts.yieldScout}`);
  if (deployment.contracts.mockProtocol) {
    console.log(`✅ MockDEXProtocol contract: ${deployment.contracts.mockProtocol}`);
  }
  console.log(`✅ Supported tokens: ${deployment.configuration.supportedTokens.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Interaction tests failed:");
    console.error(error);
    process.exit(1);
  });