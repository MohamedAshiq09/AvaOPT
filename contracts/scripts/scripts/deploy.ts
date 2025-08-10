import { ethers } from "hardhat";
import { Contract } from "ethers";

// Network configurations
interface NetworkConfig {
  chainId: number;
  name: string;
  rpc: string;
  aaveAddressesProvider: string;
  aaveDataProvider: string;
  teleporterMessenger: string;
  supportedTokens: {
    [symbol: string]: {
      address: string;
      decimals: number;
    };
  };
}

const NETWORK_CONFIG: { [key: string]: NetworkConfig } = {
  fuji: {
    chainId: 43113,
    name: "Avalanche Fuji C-Chain",
    rpc: "https://api.avax-test.network/ext/bc/C/rpc",
    
    aaveAddressesProvider: "0x1775ECC8362dB6CaB0c7A9C0957cF656A5276c29",
    aaveDataProvider: "0x0668EDE013c1c475724523409b8B6bE633469585", // 
    teleporterMessenger: "0x253b2784c75e510dD0fF1da844684a1aC0aa5fcf",
    
    supportedTokens: {
      USDC: {
        address: "0x5425890298aed601595a70AB815c96711a31Bc65", 
        decimals: 6
      },
      WAVAX: {
        address: "0xd00ae08403B9bbb9124bB305C09058E32C39A48c",
        decimals: 18
      }
    }
  },
  
  localhost: {
    chainId: 31337,
    name: "Hardhat Network", 
    rpc: "http://127.0.0.1:8545",
    aaveAddressesProvider: "0x0000000000000000000000000000000000000001",
    aaveDataProvider: "0x0000000000000000000000000000000000000002", 
    teleporterMessenger: "0x0000000000000000000000000000000000000003",
    supportedTokens: {
      MOCK_USDC: {
        address: "0x0000000000000000000000000000000000000004",
        decimals: 6
      }
    }
  }
};

const DEPLOYMENT_CONFIG = {
  INITIAL_DATA_FRESHNESS: 120,
  INITIAL_TOKENS: ["USDC", "WAVAX"],
  VERIFICATION_DELAY: 30000,
};

function getNetworkConfig(networkName: string): NetworkConfig {
  const config = NETWORK_CONFIG[networkName];
  if (!config) {
    throw new Error(`Network configuration not found for: ${networkName}`);
  }
  return config;
}

async function validateAddresses(config: NetworkConfig): Promise<boolean> {
  const requiredAddresses = [
    { name: "aaveAddressesProvider", address: config.aaveAddressesProvider },
    { name: "aaveDataProvider", address: config.aaveDataProvider },
    { name: "teleporterMessenger", address: config.teleporterMessenger }
  ];
  
  for (const { name, address } of requiredAddresses) {
    if (!address || address === "0x0000000000000000000000000000000000000000") {
      console.warn(`Warning: Invalid or missing address for ${name}`);
      return false;
    }
    
    // Check if contract exists on-chain
    try {
      const code = await ethers.provider.getCode(address);
      if (code === "0x") {
        console.warn(`Warning: No contract found at ${name}: ${address}`);
        return false;
      }
      console.log(`✅ Validated ${name}: ${address}`);
    } catch (error) {
      console.warn(`Warning: Could not validate ${name}: ${address}`);
      return false;
    }
  }
  
  return true;
}

async function main() {
  console.log("🚀 Starting YieldHub deployment...");
  
  // Get network information
  const network = await ethers.provider.getNetwork();
  const networkName = Number(network.chainId) === 43113 ? "fuji" : 
                     Number(network.chainId) === 31337 ? "localhost" : "unknown";
  
  console.log(`📡 Deploying to network: ${networkName} (Chain ID: ${network.chainId})`);
  
  if (networkName === "unknown") {
    throw new Error(`Unsupported network with chain ID: ${network.chainId}`);
  }
  
  const config = getNetworkConfig(networkName);
  
  // Validate configuration
  console.log("\n🔍 Validating contract addresses...");
  const addressesValid = await validateAddresses(config);
  if (!addressesValid && networkName !== "localhost") {
    throw new Error("❌ Invalid network configuration. Please check addresses in config");
  }
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(`👤 Deploying with account: ${deployerAddress}`);
  
  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployerAddress);
  console.log(`💰 Deployer balance: ${ethers.formatEther(balance)} AVAX`);
  
  if (balance < ethers.parseEther("0.1")) {
    console.warn("⚠️  Warning: Low balance. Make sure you have enough AVAX for deployment and gas fees.");
  }
  
  console.log("\n📋 Configuration:");
  console.log(`  - Aave Addresses Provider: ${config.aaveAddressesProvider}`);
  console.log(`  - Aave Data Provider: ${config.aaveDataProvider}`);
  console.log(`  - Teleporter Messenger: ${config.teleporterMessenger}`);
  console.log(`  - Supported Tokens: ${Object.keys(config.supportedTokens).join(", ")}`);
  
  try {
    // Deploy YieldHub contract
    console.log("\n🔨 Deploying YieldHub contract...");
    
    const YieldHub = await ethers.getContractFactory("YieldHub");
    
    // Estimate gas for deployment
    const deploymentTx = await YieldHub.getDeployTransaction(
      config.aaveAddressesProvider,
      config.aaveDataProvider,
      config.teleporterMessenger
    );
    
    const estimatedGas = await ethers.provider.estimateGas(deploymentTx);
    console.log(`⛽ Estimated gas: ${estimatedGas.toString()}`);
    
    const yieldHub = await YieldHub.deploy(
      config.aaveAddressesProvider,
      config.aaveDataProvider,
      config.teleporterMessenger,
      {
        gasLimit: estimatedGas * 120n / 100n, // Add 20% buffer
      }
    );
    
    const deployTx = yieldHub.deploymentTransaction();
    console.log(`⏳ Transaction hash: ${deployTx?.hash}`);
    console.log("⏳ Waiting for deployment confirmation...");
    
    await yieldHub.waitForDeployment();
    
    // ✅ FIXED: Safe address retrieval for Ethers.js v6
    const contractAddress = yieldHub.target as string;
    console.log(`✅ YieldHub deployed to: ${contractAddress}`);
    
    // Wait for additional confirmations
    console.log("⏳ Waiting for additional confirmations...");
    if (deployTx) {
      await deployTx.wait(3);
    }
    
    // Configure the contract
    console.log("\n⚙️  Configuring YieldHub...");
    
    // Set initial data freshness
    console.log("Setting data freshness...");
    const setFreshnessTx = await yieldHub.setDataFreshness(DEPLOYMENT_CONFIG.INITIAL_DATA_FRESHNESS);
    await setFreshnessTx.wait();
    console.log(`✅ Data freshness set to ${DEPLOYMENT_CONFIG.INITIAL_DATA_FRESHNESS} seconds`);
    
    // Add supported tokens
    console.log("Adding supported tokens...");
    for (const tokenSymbol of DEPLOYMENT_CONFIG.INITIAL_TOKENS) {
      const tokenConfig = config.supportedTokens[tokenSymbol];
      if (tokenConfig) {
        try {
          console.log(`  Adding ${tokenSymbol} (${tokenConfig.address})...`);
          const addTokenTx = await yieldHub.addSupportedToken(
            tokenConfig.address, 
            tokenConfig.decimals
          );
          await addTokenTx.wait();
          console.log(`  ✅ ${tokenSymbol} added successfully`);
        } catch (error: any) {
          console.error(`  ❌ Failed to add ${tokenSymbol}:`, error.message);
          // Continue with other tokens
        }
      }
    }
    
    console.log("\n🧪 Testing basic functionality...");
    
    try {
      // Test getting supported tokens
      const supportedTokens = await yieldHub.getSupportedTokens();
      console.log(`✅ Contract reports ${supportedTokens.length} supported tokens`);
      
      // Test Aave integration with first supported token
      if (supportedTokens.length > 0) {
        const firstToken = supportedTokens[0];
        console.log(`Testing Aave integration with token: ${firstToken}`);
        
        try {
          const aaveAPY = await yieldHub.getAaveAPY(firstToken);
          console.log(`✅ Aave APY for token: ${aaveAPY.toString()} basis points (${Number(aaveAPY) / 100}%)`);
          
          // Test updating Aave data
          console.log("Testing Aave data update...");
          const updateTx = await yieldHub.updateAaveData(firstToken);
          await updateTx.wait();
          console.log("✅ Aave data updated successfully");
          
        } catch (error: any) {
          console.error(`❌ Aave integration test failed:`, error.message);
        }
      }
      
      // Test contract configuration
      const dataFreshness = await yieldHub.dataFreshness();
      console.log(`✅ Data freshness: ${dataFreshness.toString()} seconds`);
      
      const isEmergencyMode = await yieldHub.emergencyMode();
      console.log(`✅ Emergency mode: ${isEmergencyMode ? "ON" : "OFF"}`);
      
    } catch (error: any) {
      console.error(`❌ Basic functionality test failed:`, error.message);
    }
    
    // Get gas usage information
    let gasUsedInfo = "Unknown";
    if (deployTx) {
      try {
        const receipt = await deployTx.wait();
        if (receipt && receipt.gasUsed) {
          gasUsedInfo = receipt.gasUsed.toString();
        }
      } catch (error) {
        console.warn("Could not retrieve gas usage information");
      }
    }
    
    // Display deployment summary
    console.log("\n🎉 Deployment Summary:");
    console.log("=".repeat(50));
    console.log(`📋 Contract Address: ${contractAddress}`);
    console.log(`🌐 Network: ${networkName} (${config.chainId})`);
    console.log(`💰 Deployer: ${deployerAddress}`);
    console.log(`⛽ Gas Used: ${gasUsedInfo}`);
    console.log(`🏦 Aave Provider: ${config.aaveAddressesProvider}`);
    console.log(`📊 Data Provider: ${config.aaveDataProvider}`);
    console.log(`📡 Teleporter: ${config.teleporterMessenger}`);
    console.log(`🪙 Supported Tokens: ${(await yieldHub.getSupportedTokens()).length}`);
    
    // Next steps
    console.log("\n📝 Next Steps:");
    console.log("1. Set destination subnet with setDestSubnet(chainId, receiverAddress)");
    console.log("2. Test cross-chain message sending with requestSubnetYield()");
    console.log("3. Configure frontend with contract address and ABI");
    console.log("4. Verify contract on explorer if needed");
    
    // Contract interaction examples
    console.log("\n🔧 Contract Interaction Examples:");
    console.log(`// Get Aave APY`);
    console.log(`await yieldHub.getAaveAPY("${config.supportedTokens.USDC?.address || 'TOKEN_ADDRESS'}")`);
    console.log(`// Update Aave data`);
    console.log(`await yieldHub.updateAaveData("${config.supportedTokens.USDC?.address || 'TOKEN_ADDRESS'}")`);
    console.log(`// Request subnet yield (requires ETH for fees)`);
    console.log(`await yieldHub.requestSubnetYield("${config.supportedTokens.USDC?.address || 'TOKEN_ADDRESS'}", { value: ethers.parseEther("0.01") })`);
    
    // Verification command
    if (networkName !== "localhost") {
      console.log("\n🔍 To verify contract on Snowtrace:");
      console.log(`npx hardhat verify --network ${networkName} ${contractAddress} "${config.aaveAddressesProvider}" "${config.aaveDataProvider}" "${config.teleporterMessenger}"`);
    }
    
    // Save deployment info
    const deploymentInfo = {
      network: networkName,
      chainId: config.chainId,
      contractAddress: contractAddress,
      deployer: deployerAddress,
      deploymentHash: deployTx?.hash,
      timestamp: new Date().toISOString(),
      configuration: config
    };
    
    console.log("\n💾 Deployment info (save this for your records):");
    console.log(JSON.stringify(deploymentInfo, null, 2));
    
  } catch (error: any) {
    console.error("\n❌ Deployment failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  main()
    .then(() => {
      console.log("\n✅ Deployment completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Deployment script failed:", error);
      process.exit(1);
    });
}

export { main as deployYieldHub, NETWORK_CONFIG, DEPLOYMENT_CONFIG };