#!/usr/bin/env node

const https = require('https');
const http = require('http');

// List of Avalanche Fuji RPC endpoints to test
const rpcEndpoints = [
  'https://avalanche-fuji-c-chain-rpc.publicnode.com',
  'https://rpc.ankr.com/avalanche_fuji',
  'https://api.avax-test.network/ext/bc/C/rpc',
  'https://avalanche-fuji.blockpi.network/v1/rpc/public',
  'https://ava-testnet.public.blastapi.io/ext/bc/C/rpc'
];

console.log('🌐 Testing Avalanche Fuji RPC connectivity...\n');

async function testRPC(url) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_chainId',
      params: [],
      id: 1
    });

    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 10000
    };

    const req = (urlObj.protocol === 'https:' ? https : http).request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.result === '0xa869') { // 43113 in hex
            resolve({ success: true, latency: Date.now() - startTime });
          } else {
            resolve({ success: false, error: 'Wrong chain ID' });
          }
        } catch (e) {
          resolve({ success: false, error: 'Invalid JSON response' });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ success: false, error: e.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });

    const startTime = Date.now();
    req.write(postData);
    req.end();
  });
}

async function testAllEndpoints() {
  const results = [];
  
  for (const url of rpcEndpoints) {
    process.stdout.write(`Testing ${url}... `);
    const result = await testRPC(url);
    
    if (result.success) {
      console.log(`✅ OK (${result.latency}ms)`);
      results.push({ url, ...result });
    } else {
      console.log(`❌ Failed: ${result.error}`);
    }
  }
  
  console.log('\n📊 Results Summary:');
  
  if (results.length === 0) {
    console.log('❌ No working RPC endpoints found!');
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Check your internet connection');
    console.log('2. Try using a VPN if you\'re behind a firewall');
    console.log('3. Check if your antivirus/firewall is blocking connections');
    console.log('4. Try running from a different network');
    return;
  }
  
  // Sort by latency
  results.sort((a, b) => a.latency - b.latency);
  
  console.log(`✅ Found ${results.length} working endpoints:`);
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.url} (${result.latency}ms)`);
  });
  
  const fastest = results[0];
  console.log(`\n🚀 Fastest endpoint: ${fastest.url}`);
  console.log('\n💡 To use the fastest endpoint, update your .env file:');
  console.log(`FUJI_RPC_URL=${fastest.url}`);
  
  // Update .env file automatically
  try {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '.env');
    
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      envContent = envContent.replace(
        /FUJI_RPC_URL=.*/,
        `FUJI_RPC_URL=${fastest.url}`
      );
      fs.writeFileSync(envPath, envContent);
      console.log('✅ .env file updated with fastest endpoint!');
    }
  } catch (e) {
    console.log('⚠️  Could not update .env file automatically');
  }
}

testAllEndpoints().catch(console.error);