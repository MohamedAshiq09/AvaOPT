#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up SubnetYield Core contracts...\n');

try {
  // Ensure we're in the contracts directory
  process.chdir(__dirname);
  
  console.log('📦 Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  
  console.log('\n🔧 Installing additional TypeScript dependencies...');
  execSync('npm install --save-dev tsconfig-paths@^4.2.0', { stdio: 'inherit' });
  
  console.log('\n🔨 Compiling contracts...');
  execSync('npx hardhat compile', { stdio: 'inherit' });
  
  console.log('\n✅ Setup completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Copy .env.example to .env and add your private key');
  console.log('2. Get testnet AVAX from https://faucet.avax.network/');
  console.log('3. Run: npm run deploy:fuji');
  
} catch (error) {
  console.error('\n❌ Setup failed:');
  console.error(error.message);
  
  console.log('\n🔧 Manual setup steps:');
  console.log('1. npm install');
  console.log('2. npm install --save-dev tsconfig-paths@^4.2.0');
  console.log('3. npx hardhat compile');
  
  process.exit(1);
}