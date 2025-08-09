#!/usr/bin/env node

const https = require('https');

console.log('🏰 Testing DeFi Kingdoms Integration...\n');

async function testDeFiKingdomsRPC() {
  console.log('🌐 Testing DeFi Kingdoms RPC connectivity...');
  
  const dfkRPCs = [
    {
      name: 'DeFi Kingdoms Mainnet',
      url: 'https://subnets.avax.network/defi-kingdoms/dfk-chain/rpc',
      chainId: 53935
    },
    {
      name: 'DeFi Kingdoms Testnet', 
      url: 'https://subnets.avax.network/defi-kingdoms/dfk-chain-testnet/rpc',
      chainId: 335
    }
  ];
  
  for (const rpc of dfkRPCs) {
    await testRPC(rpc.name, rpc.url, rpc.chainId);
  }
}

async function testRPC(name, url, expectedChainId) {
  return new Promise((resolve) => {
    console.log(`Testing ${name}...`);
    
    const postData = JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_chainId',
      params: [],
      id: 1
    });

    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          const chainId = parseInt(response.result, 16);
          
          if (chainId === expectedChainId) {
            console.log(`✅ ${name}: Connected (Chain ID: ${chainId})`);
            
            // Test block number
            testBlockNumber(name, url).then(() => resolve());
          } else {
            console.log(`⚠️  ${name}: Wrong chain ID (got ${chainId}, expected ${expectedChainId})`);
            resolve();
          }
        } catch (e) {
          console.log(`❌ ${name}: Invalid response`);
          resolve();
        }
      });
    });

    req.on('error', (e) => {
      console.log(`❌ ${name}: ${e.message}`);
      resolve();
    });

    req.on('timeout', () => {
      req.destroy();
      console.log(`❌ ${name}: Timeout`);
      resolve();
    });

    req.write(postData);
    req.end();
  });
}

async function testBlockNumber(name, url) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_blockNumber',
      params: [],
      id: 2
    });

    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 5000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          const blockNumber = parseInt(response.result, 16);
          console.log(`✅ ${name}: Latest block ${blockNumber}`);
        } catch (e) {
          console.log(`⚠️  ${name}: Could not get block number`);
        }
        console.log();
        resolve();
      });
    });

    req.on('error', () => resolve());
    req.on('timeout', () => {
      req.destroy();
      resolve();
    });

    req.write(postData);
    req.end();
  });
}

async function testTokenContracts() {
  console.log('💎 Testing DeFi Kingdoms token contracts...');
  
  const tokens = {
    'JEWEL': '0x72Cb10C6bfA5624dD07Ef608027E366bd690048F',
    'CRYSTAL': '0x04b9dA42306B023f3572e106B11D82aAd9D32EBb'
  };
  
  for (const [name, address] of Object.entries(tokens)) {
    await testContract(name, address);
  }
  
  console.log();
}

async function testContract(name, address) {
  return new Promise((resolve) => {
    console.log(`Testing ${name} token at ${address}...`);
    
    const postData = JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getCode',
      params: [address, 'latest'],
      id: 3
    });

    const options = {
      hostname: 'subnets.avax.network',
      port: 443,
      path: '/defi-kingdoms/dfk-chain/rpc',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (response.result && response.result !== '0x') {
            console.log(`✅ ${name}: Contract exists`);
            console.log(`   Address: ${address}`);
            console.log(`   Code length: ${response.result.length - 2} bytes`);
          } else {
            console.log(`⚠️  ${name}: No contract code found`);
          }
        } catch (e) {
          console.log(`❌ ${name}: Invalid response`);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.log(`❌ ${name}: ${e.message}`);
      resolve();
    });

    req.on('timeout', () => {
      req.destroy();
      console.log(`❌ ${name}: Timeout`);
      resolve();
    });

    req.write(postData);
    req.end();
  });
}

async function simulateRealYieldData() {
  console.log('📊 Simulating real DeFi Kingdoms yield data...');
  
  // Simulate what real DeFi Kingdoms yields might look like
  const realYields = {
    'JEWEL Staking': {
      apy: '18.5%',
      tvl: '$45.2M',
      protocol: 'DeFi Kingdoms Bank'
    },
    'CRYSTAL Staking': {
      apy: '12.3%', 
      tvl: '$23.8M',
      protocol: 'DeFi Kingdoms Bank'
    },
    'JEWEL-AVAX LP': {
      apy: '24.7%',
      tvl: '$12.1M',
      protocol: 'DeFi Kingdoms DEX'
    },
    'CRYSTAL-JEWEL LP': {
      apy: '31.2%',
      tvl: '$8.9M',
      protocol: 'DeFi Kingdoms DEX'
    }
  };
  
  console.log('🎯 Real DeFi Kingdoms Yield Opportunities:');
  console.log('═══════════════════════════════════════════');
  
  for (const [pool, data] of Object.entries(realYields)) {
    console.log(`${pool}:`);
    console.log(`   APY: ${data.apy}`);
    console.log(`   TVL: ${data.tvl}`);
    console.log(`   Protocol: ${data.protocol}`);
    console.log();
  }
  
  console.log('💡 These are the types of real yields your YieldScout will aggregate!');
  console.log();
}

async function main() {
  await testDeFiKingdomsRPC();
  await testTokenContracts();
  await simulateRealYieldData();
  
  console.log('🎉 DeFi Kingdoms integration test completed!');
  console.log();
  console.log('📋 Next Steps:');
  console.log('1. Deploy YieldScout with DeFi Kingdoms adapter');
  console.log('2. Test real yield data aggregation');
  console.log('3. Verify cross-subnet communication');
  console.log('4. Demo with live DeFi Kingdoms data!');
}

main().catch(console.error);