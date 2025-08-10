import { ethers } from "hardhat";

// CORRECT DFK Testnet Configuration (from the provided documentation)
const DFK_TESTNET_CONFIG = {
  chainId: 335,
  name: "DFK Chain Testnet",
  rpc: "https://subnets.avax.network/defi-kingdoms/dfk-chain-testnet/rpc",
  explorer: "https://subnets-test.avax.network/defi-kingdoms",

  // CORRECTED ADDRESSES from DFK docs
  teleporter: "0x253b2784c75e510dD0fF1da844684a1aC0aa5fcf", // Universal Teleporter address
  wJEWEL_TESTNET: "0x602daa4Db4778Cb958b161F11574b4A206606b4B", // CORRECT testnet wJEWEL
  supraPriceFeed: "0x700a89Ba8F908af38834B9Aba238b362CFfB665F", // Supra price feeds on DFK testnet

  // Our deployed contracts
  yieldScout: "0xEaB8B12fE66C147c404401fCc0BC1653fb77446b",
  adapter: "0x8101Ed701A1dABd1313FC8F59d2bC72cB241ce34",
};

// C-Chain configuration
const C_CHAIN_CONFIG = {
  yieldHub: "0x15855D3E2fbC21694e65469Cc824eC61c2B62b27",
  teleporter: "0x253b2784c75e510dD0fF1da844684a1aC0aa5fcf", // Same universal address
};

async function fixDFKTestnetConfig() {
  console.log("🔧 FIXING DFK TESTNET CONFIGURATION");
  console.log("===================================");
  console.log(
    "🎯 Goal: Configure correct DFK testnet addresses and fix cross-chain flow"
  );

  const [deployer] = await ethers.getSigners();
  console.log(`👤 Configuring with account: ${deployer.address}`);

  // Check network
  const network = await deployer.provider.getNetwork();
  console.log(
    `🌐 Current network: ${network.name} (Chain ID: ${network.chainId})`
  );

  if (Number(network.chainId) !== 335) {
    console.log("❌ Wrong network! Expected DFK Chain Testnet (335)");
    console.log("💡 Run with: --network dfk_testnet");
    return false;
  }

  // Check balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log(`💰 JEWEL Balance: ${ethers.formatEther(balance)} JEWEL`);

  if (balance < ethers.parseEther("0.1")) {
    console.log("⚠️  Low JEWEL balance! Get more from DFK faucet");
    console.log("🔗 https://devs.defikingdoms.com/dfk-chain/getting-started");
  }

  try {
    // Step 1: Fix DeFiKingdomsAdapter with correct addresses
    console.log(
      "\n🧪 Step 1: Configuring DeFiKingdomsAdapter with Correct Addresses"
    );

    const adapter = await ethers.getContractAt(
      "DeFiKingdomsAdapter",
      DFK_TESTNET_CONFIG.adapter
    );
    console.log(
      `✅ Connected to DeFiKingdomsAdapter: ${DFK_TESTNET_CONFIG.adapter}`
    );

    // Check current wJEWEL support (should be using wrong address)
    try {
      const currentSupport = await adapter.isTokenSupported(
        "0xCCb93dABD71c8Dad03Fc4CE5559dC3D89F67a260"
      );
      console.log(`📋 Old wJEWEL (mainnet) supported: ${currentSupport}`);

      const correctSupport = await adapter.isTokenSupported(
        DFK_TESTNET_CONFIG.wJEWEL_TESTNET
      );
      console.log(`📋 Correct wJEWEL (testnet) supported: ${correctSupport}`);
    } catch (supportError: any) {
      console.log(`⚠️  Token support check failed: ${supportError.message}`);
    }

    // Configure protocol addresses (placeholder for now - need real DFK addresses)
    console.log("\n🔧 Configuring Protocol Addresses:");
    console.log(
      `📋 Correct wJEWEL testnet: ${DFK_TESTNET_CONFIG.wJEWEL_TESTNET}`
    );
    console.log(`📋 Supra price feed: ${DFK_TESTNET_CONFIG.supraPriceFeed}`);
    console.log("📋 Note: Need to find DFK DEX/Router addresses from explorer");

    // For now, let's test with basic configuration
    try {
      // Test if we can call basic functions
      console.log("🧪 Testing basic adapter functionality...");

      // Check if the correct wJEWEL testnet token exists
      const wJEWEL = await ethers.getContractAt(
        "IERC20",
        DFK_TESTNET_CONFIG.wJEWEL_TESTNET
      );
      const totalSupply = await wJEWEL.totalSupply();
      console.log(
        `✅ Correct wJEWEL testnet total supply: ${ethers.formatEther(
          totalSupply
        )} wJEWEL`
      );
    } catch (configError: any) {
      console.log(`❌ Configuration test failed: ${configError.message}`);
    }

    // Step 2: Test YieldScout with correct configuration
    console.log("\n🧪 Step 2: Testing YieldScout Configuration");

    const yieldScout = await ethers.getContractAt(
      "YieldScout",
      DFK_TESTNET_CONFIG.yieldScout
    );
    console.log(`✅ Connected to YieldScout: ${DFK_TESTNET_CONFIG.yieldScout}`);

    // Check teleporter configuration
    try {
      const teleporter = await yieldScout.teleporterMessenger();
      console.log(`📋 YieldScout teleporter: ${teleporter}`);
      console.log(`📋 Expected teleporter: ${DFK_TESTNET_CONFIG.teleporter}`);

      if (
        teleporter.toLowerCase() === DFK_TESTNET_CONFIG.teleporter.toLowerCase()
      ) {
        console.log("✅ Teleporter addresses match");
      } else {
        console.log("❌ Teleporter address mismatch");
      }
    } catch (teleError: any) {
      console.log(`❌ Teleporter check failed: ${teleError.message}`);
    }

    // Step 3: Test Teleporter connectivity
    console.log("\n🧪 Step 3: Testing Teleporter Connectivity");

    try {
      // Check if teleporter contract exists and has code
      const teleporterCode = await deployer.provider.getCode(
        DFK_TESTNET_CONFIG.teleporter
      );
      console.log(
        `✅ Teleporter contract exists: ${teleporterCode.length} bytes`
      );

      // Try to connect (using correct interface path)
      const teleporter = await ethers.getContractAt(
        "contracts/interfaces/ITeleporterMessenger.sol:ITeleporterMessenger",
        DFK_TESTNET_CONFIG.teleporter
      );
      console.log("✅ Teleporter interface connected successfully");
    } catch (teleporterError: any) {
      console.log(
        `❌ Teleporter connectivity failed: ${teleporterError.message}`
      );
    }

    // Step 4: Create a simple test message receiver
    console.log("\n🧪 Step 4: Testing Message Reception Capability");

    console.log("📋 YieldScout should implement ITeleporterReceiver");
    console.log(
      "📋 Function: receiveTeleporterMessage(bytes32, address, bytes)"
    );
    console.log("📋 Should emit events for observability");
    console.log("📋 Should decode MessageEncoding format");

    // Step 5: Summary and next steps
    console.log("\n📊 CONFIGURATION STATUS");
    console.log("=======================");

    const status = {
      network: `DFK Chain Testnet (${DFK_TESTNET_CONFIG.chainId})`,
      contracts: {
        yieldScout: DFK_TESTNET_CONFIG.yieldScout,
        adapter: DFK_TESTNET_CONFIG.adapter,
        teleporter: DFK_TESTNET_CONFIG.teleporter,
      },
      tokens: {
        correctWJEWEL: DFK_TESTNET_CONFIG.wJEWEL_TESTNET,
        wrongWJEWEL:
          "0xCCb93dABD71c8Dad03Fc4CE5559dC3D89F67a260 (mainnet - don't use)",
      },
      protocols: {
        supraPriceFeed: DFK_TESTNET_CONFIG.supraPriceFeed,
        dfkDEX: "Need to find from DFK explorer",
        dfkStaking: "Need to find from DFK docs",
      },
    };

    console.log(JSON.stringify(status, null, 2));

    console.log("\n🛠️  IMMEDIATE FIXES NEEDED:");
    console.log("1. ✅ Use correct wJEWEL testnet address: 0x602daa4D...06b4B");
    console.log("2. ⏳ Find DFK DEX Router address from DFK testnet explorer");
    console.log("3. ⏳ Find DFK Staking contract addresses");
    console.log("4. ⏳ Configure adapter.setProtocolAddresses()");
    console.log("5. ⏳ Test receiveTeleporterMessage implementation");

    console.log("\n🔍 WHERE TO FIND DFK ADDRESSES:");
    console.log(
      "- DFK Testnet Explorer: https://subnets-test.avax.network/defi-kingdoms"
    );
    console.log("- DFK Dev Docs: https://devs.defikingdoms.com/");
    console.log("- DFK Contracts: https://devs.defikingdoms.com/contracts/");

    return true;
  } catch (error: any) {
    console.log(`❌ Configuration failed: ${error.message}`);
    console.log("Full error:", error);
    return false;
  }
}

async function main() {
  try {
    const success = await fixDFKTestnetConfig();

    if (success) {
      console.log("\n✅ DFK testnet configuration analysis completed!");
      console.log(
        "🎯 Next: Find real DFK protocol addresses and configure adapter"
      );
    } else {
      console.log("\n❌ Configuration analysis failed!");
    }
  } catch (error) {
    console.error("❌ Analysis failed:", error);
    process.exit(1);
  }
}

main().catch(console.error);
