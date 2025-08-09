import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { YieldScout, MockDEXProtocol } from "../typechain-types";

describe("YieldScout", function () {
  // Test fixture for deployment
  async function deployYieldScoutFixture() {
    const [owner, otherAccount, teleporter] = await ethers.getSigners();
    
    // Deploy MockDEXProtocol
    const MockDEXProtocol = await ethers.getContractFactory("MockDEXProtocol");
    const mockProtocol = await MockDEXProtocol.deploy() as MockDEXProtocol;
    await mockProtocol.waitForDeployment();
    
    // Get supported tokens from mock protocol
    const supportedTokens = await mockProtocol.getSupportedTokens();
    
    // Deploy YieldScout
    const YieldScout = await ethers.getContractFactory("YieldScout");
    const yieldScout = await YieldScout.deploy(
      teleporter.address,
      await mockProtocol.getAddress(),
      supportedTokens
    ) as YieldScout;
    await yieldScout.waitForDeployment();
    
    return {
      yieldScout,
      mockProtocol,
      owner,
      otherAccount,
      teleporter,
      supportedTokens
    };
  }
  
  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { yieldScout, owner } = await loadFixture(deployYieldScoutFixture);
      expect(await yieldScout.owner()).to.equal(owner.address);
    });
    
    it("Should set the teleporter messenger", async function () {
      const { yieldScout, teleporter } = await loadFixture(deployYieldScoutFixture);
      expect(await yieldScout.teleporterMessenger()).to.equal(teleporter.address);
    });
    
    it("Should initialize supported tokens", async function () {
      const { yieldScout, supportedTokens } = await loadFixture(deployYieldScoutFixture);
      
      for (const token of supportedTokens) {
        expect(await yieldScout.supportedTokens(token)).to.be.true;
      }
    });
  });
  
  describe("Protocol Integration", function () {
    it("Should get local protocol APY", async function () {
      const { yieldScout, supportedTokens } = await loadFixture(deployYieldScoutFixture);
      
      const token = supportedTokens[0];
      const apy = await yieldScout.getLocalProtocolAPY(token);
      
      expect(apy).to.be.greaterThan(0);
      expect(apy).to.be.lessThanOrEqual(10000); // Max 100%
    });
    
    it("Should update protocol data", async function () {
      const { yieldScout, supportedTokens, owner } = await loadFixture(deployYieldScoutFixture);
      
      const token = supportedTokens[0];
      
      // Update protocol data
      await expect(yieldScout.connect(owner).updateProtocolData(token))
        .to.emit(yieldScout, "ProtocolDataUpdated");
      
      // Check that data was updated
      const protocolData = await yieldScout.getProtocolData(token);
      expect(protocolData.apy).to.be.greaterThan(0);
      expect(protocolData.timestamp).to.be.greaterThan(0);
    });
    
    it("Should check data freshness", async function () {
      const { yieldScout, supportedTokens, owner } = await loadFixture(deployYieldScoutFixture);
      
      const token = supportedTokens[0];
      
      // Update data first
      await yieldScout.connect(owner).updateProtocolData(token);
      
      // Check freshness
      const isFresh = await yieldScout.isDataFresh(token);
      expect(isFresh).to.be.true;
    });
  });
  
  describe("Token Management", function () {
    it("Should allow owner to set token support", async function () {
      const { yieldScout, owner } = await loadFixture(deployYieldScoutFixture);
      
      const newToken = "0x1234567890123456789012345678901234567890";
      
      // Add token support
      await expect(yieldScout.connect(owner).setTokenSupport(newToken, true))
        .to.emit(yieldScout, "TokenSupportUpdated")
        .withArgs(newToken, true);
      
      expect(await yieldScout.supportedTokens(newToken)).to.be.true;
      
      // Remove token support
      await expect(yieldScout.connect(owner).setTokenSupport(newToken, false))
        .to.emit(yieldScout, "TokenSupportUpdated")
        .withArgs(newToken, false);
      
      expect(await yieldScout.supportedTokens(newToken)).to.be.false;
    });
    
    it("Should not allow non-owner to set token support", async function () {
      const { yieldScout, otherAccount } = await loadFixture(deployYieldScoutFixture);
      
      const newToken = "0x1234567890123456789012345678901234567890";
      
      await expect(
        yieldScout.connect(otherAccount).setTokenSupport(newToken, true)
      ).to.be.revertedWith("Not owner");
    });
  });
  
  describe("AWM Message Processing", function () {
    it("Should process yield request from teleporter", async function () {
      const { yieldScout, teleporter, supportedTokens, owner } = await loadFixture(deployYieldScoutFixture);
      
      const token = supportedTokens[0];
      const requestId = ethers.keccak256(ethers.toUtf8Bytes("test-request-1"));
      const responseContract = owner.address;
      
      // Encode message
      const message = ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes32", "address", "address"],
        [requestId, token, responseContract]
      );
      
      // Mock source chain ID
      const sourceChainId = ethers.keccak256(ethers.toUtf8Bytes("source-chain"));
      
      // Should emit YieldDataRequested event
      await expect(
        yieldScout.connect(teleporter).receiveTeleporterMessage(
          sourceChainId,
          owner.address,
          message
        )
      ).to.emit(yieldScout, "YieldDataRequested")
       .withArgs(requestId, token, owner.address);
    });
    
    it("Should reject non-teleporter messages", async function () {
      const { yieldScout, owner, supportedTokens } = await loadFixture(deployYieldScoutFixture);
      
      const token = supportedTokens[0];
      const requestId = ethers.keccak256(ethers.toUtf8Bytes("test-request-1"));
      const responseContract = owner.address;
      
      const message = ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes32", "address", "address"],
        [requestId, token, responseContract]
      );
      
      const sourceChainId = ethers.keccak256(ethers.toUtf8Bytes("source-chain"));
      
      await expect(
        yieldScout.connect(owner).receiveTeleporterMessage(
          sourceChainId,
          owner.address,
          message
        )
      ).to.be.revertedWith("Not teleporter");
    });
    
    it("Should prevent replay attacks", async function () {
      const { yieldScout, teleporter, supportedTokens, owner } = await loadFixture(deployYieldScoutFixture);
      
      const token = supportedTokens[0];
      const requestId = ethers.keccak256(ethers.toUtf8Bytes("test-request-1"));
      const responseContract = owner.address;
      
      const message = ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes32", "address", "address"],
        [requestId, token, responseContract]
      );
      
      const sourceChainId = ethers.keccak256(ethers.toUtf8Bytes("source-chain"));
      
      // First call should succeed
      await yieldScout.connect(teleporter).receiveTeleporterMessage(
        sourceChainId,
        owner.address,
        message
      );
      
      // Second call with same requestId should fail
      await expect(
        yieldScout.connect(teleporter).receiveTeleporterMessage(
          sourceChainId,
          owner.address,
          message
        )
      ).to.be.revertedWithCustomError(yieldScout, "RequestAlreadyProcessed");
    });
    
    it("Should reject unsupported tokens", async function () {
      const { yieldScout, teleporter, owner } = await loadFixture(deployYieldScoutFixture);
      
      const unsupportedToken = "0x1234567890123456789012345678901234567890";
      const requestId = ethers.keccak256(ethers.toUtf8Bytes("test-request-1"));
      const responseContract = owner.address;
      
      const message = ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes32", "address", "address"],
        [requestId, unsupportedToken, responseContract]
      );
      
      const sourceChainId = ethers.keccak256(ethers.toUtf8Bytes("source-chain"));
      
      await expect(
        yieldScout.connect(teleporter).receiveTeleporterMessage(
          sourceChainId,
          owner.address,
          message
        )
      ).to.be.revertedWithCustomError(yieldScout, "UnsupportedToken");
    });
  });
  
  describe("Ownership", function () {
    it("Should allow owner to transfer ownership", async function () {
      const { yieldScout, owner, otherAccount } = await loadFixture(deployYieldScoutFixture);
      
      await yieldScout.connect(owner).transferOwnership(otherAccount.address);
      expect(await yieldScout.owner()).to.equal(otherAccount.address);
    });
    
    it("Should not allow non-owner to transfer ownership", async function () {
      const { yieldScout, otherAccount } = await loadFixture(deployYieldScoutFixture);
      
      await expect(
        yieldScout.connect(otherAccount).transferOwnership(otherAccount.address)
      ).to.be.revertedWith("Not owner");
    });
    
    it("Should not allow transfer to zero address", async function () {
      const { yieldScout, owner } = await loadFixture(deployYieldScoutFixture);
      
      await expect(
        yieldScout.connect(owner).transferOwnership(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid address");
    });
  });
});