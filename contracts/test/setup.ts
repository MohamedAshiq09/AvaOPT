// Test setup file
import { ethers } from "hardhat";

// Global test configuration
export const TEST_CONFIG = {
  // Test token addresses (mock addresses for testing)
  TOKENS: {
    USDC: "0x5425890298aed601595a70AB815c96711a31Bc65",
    WAVAX: "0xd00ae08403B9bbb9124bB305C09058E32C39A48c",
    USDT: "0xB6076C93701D6a07266c31066B298AeC6dd65c2d"
  },
  
  // Test APY values (in basis points)
  APY: {
    MIN: 100,  // 1%
    MAX: 2000, // 20%
    DEFAULT: 750 // 7.5%
  },
  
  // Test TVL values
  TVL: {
    DEFAULT: ethers.parseEther("1000000"), // 1M tokens
    LARGE: ethers.parseEther("10000000"),  // 10M tokens
    SMALL: ethers.parseEther("100000")     // 100K tokens
  },
  
  // Gas limits for testing
  GAS: {
    DEPLOY: 8000000,
    TRANSACTION: 500000
  }
};

// Helper functions for tests
export class TestHelpers {
  static async mineBlocks(count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
      await ethers.provider.send("evm_mine", []);
    }
  }
  
  static async increaseTime(seconds: number): Promise<void> {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine", []);
  }
  
  static generateRandomAddress(): string {
    return ethers.Wallet.createRandom().address;
  }
  
  static generateRequestId(prefix: string = "test"): string {
    return ethers.keccak256(ethers.toUtf8Bytes(`${prefix}-${Date.now()}-${Math.random()}`));
  }
  
  static formatAPY(basisPoints: bigint): string {
    return `${(Number(basisPoints) / 100).toFixed(2)}%`;
  }
  
  static formatTVL(wei: bigint): string {
    return `${ethers.formatEther(wei)} tokens`;
  }
}

// Mock data for consistent testing
export const MOCK_DATA = {
  tokens: [
    {
      address: TEST_CONFIG.TOKENS.USDC,
      symbol: "USDC",
      apy: 780,
      tvl: TEST_CONFIG.TVL.DEFAULT
    },
    {
      address: TEST_CONFIG.TOKENS.WAVAX,
      symbol: "WAVAX", 
      apy: 650,
      tvl: ethers.parseEther("500000")
    },
    {
      address: TEST_CONFIG.TOKENS.USDT,
      symbol: "USDT",
      apy: 920,
      tvl: ethers.parseEther("750000")
    }
  ]
};

export default {
  TEST_CONFIG,
  TestHelpers,
  MOCK_DATA
};