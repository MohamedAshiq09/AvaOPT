#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 SubnetYield Core Test Runner\n');

// Change to contracts directory
process.chdir(__dirname);

try {
  console.log('📦 Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  
  console.log('\n🔨 Compiling contracts...');
  execSync('npx hardhat compile', { stdio: 'inherit' });
  
  console.log('\n🧪 Running MockDEXProtocol tests...');
  execSync('npx hardhat test test/MockDEXProtocol.test.ts', { stdio: 'inherit' });
  
  console.log('\n🧪 Running YieldScout tests...');
  execSync('npx hardhat test test/YieldScout.test.ts', { stdio: 'inherit' });
  
  console.log('\n✅ All tests completed successfully!');
  
} catch (error) {
  console.error('\n❌ Test execution failed:');
  console.error(error.message);
  process.exit(1);
}