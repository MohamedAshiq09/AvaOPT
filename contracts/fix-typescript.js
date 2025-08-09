#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔧 Fixing TypeScript configuration issues...\n');

try {
  console.log('📦 Installing missing TypeScript dependencies...');
  execSync('npm install --save-dev tsconfig-paths@^4.2.0', { stdio: 'inherit' });
  
  console.log('\n🧹 Cleaning previous builds...');
  execSync('npx hardhat clean', { stdio: 'inherit' });
  
  console.log('\n🔨 Recompiling contracts...');
  execSync('npx hardhat compile', { stdio: 'inherit' });
  
  console.log('\n✅ TypeScript issues fixed!');
  console.log('\n🚀 You can now run:');
  console.log('   npm run deploy:fuji');
  
} catch (error) {
  console.error('\n❌ Fix failed:');
  console.error(error.message);
  
  console.log('\n🔧 Try manual steps:');
  console.log('1. Delete node_modules and package-lock.json');
  console.log('2. npm install');
  console.log('3. npm install --save-dev tsconfig-paths@^4.2.0');
  console.log('4. npx hardhat clean');
  console.log('5. npx hardhat compile');
  
  process.exit(1);
}