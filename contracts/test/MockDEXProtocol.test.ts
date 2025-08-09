import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { MockDEXProtocol } from "../typechain-types";

describe("MockDEXProtocol", function () {
    async function deployMockDEXProtocolFixture() {
        const [owner, otherAccount] = await ethers.getSigners();

        const MockDEXProtocol = await ethers.getContractFactory("MockDEXProtocol");
        const mockProtocol = await MockDEXProtocol.deploy() as MockDEXProtocol;
        await mockProtocol.waitForDeployment();

        return { mockProtocol, owner, otherAccount };
    }

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            const { mockProtocol, owner } = await loadFixture(deployMockDEXProtocolFixture);
            expect(await mockProtocol.owner()).to.equal(owner.address);
        });

        it("Should have correct protocol name", async function () {
            const { mockProtocol } = await loadFixture(deployMockDEXProtocolFixture);
            expect(await mockProtocol.getProtocolName()).to.equal("SubnetDEX");
        });

        it("Should initialize with supported tokens", async function () {
            const { mockProtocol } = await loadFixture(deployMockDEXProtocolFixture);

            const supportedTokens = await mockProtocol.getSupportedTokens();
            expect(supportedTokens.length).to.be.greaterThan(0);

            // Check that tokens are marked as supported
            for (const token of supportedTokens) {
                expect(await mockProtocol.isTokenSupported(token)).to.be.true;
            }
        });
    });

    describe("Token Management", function () {
        it("Should allow owner to add new tokens", async function () {
            const { mockProtocol, owner } = await loadFixture(deployMockDEXProtocolFixture);

            const newToken = "0x1234567890123456789012345678901234567890";
            const apy = 500; // 5%
            const tvl = ethers.parseEther("1000000");

            await expect(mockProtocol.connect(owner).addToken(newToken, apy, tvl))
                .to.emit(mockProtocol, "TokenAdded")
                .withArgs(newToken, apy, tvl);

            expect(await mockProtocol.isTokenSupported(newToken)).to.be.true;
        });

        it("Should not allow non-owner to add tokens", async function () {
            const { mockProtocol, otherAccount } = await loadFixture(deployMockDEXProtocolFixture);

            const newToken = "0x1234567890123456789012345678901234567890";
            const apy = 500;
            const tvl = ethers.parseEther("1000000");

            await expect(
                mockProtocol.connect(otherAccount).addToken(newToken, apy, tvl)
            ).to.be.revertedWith("Not owner");
        });

        it("Should not allow adding duplicate tokens", async function () {
            const { mockProtocol, owner } = await loadFixture(deployMockDEXProtocolFixture);

            const supportedTokens = await mockProtocol.getSupportedTokens();
            const existingToken = supportedTokens[0];

            await expect(
                mockProtocol.connect(owner).addToken(existingToken, 500, ethers.parseEther("1000"))
            ).to.be.revertedWith("Token already supported");
        });

        it("Should not allow APY over 100%", async function () {
            const { mockProtocol, owner } = await loadFixture(deployMockDEXProtocolFixture);

            const newToken = "0x1234567890123456789012345678901234567890";
            const invalidAPY = 15000; // 150%
            const tvl = ethers.parseEther("1000000");

            await expect(
                mockProtocol.connect(owner).addToken(newToken, invalidAPY, tvl)
            ).to.be.revertedWith("APY too high");
        });
    });

    describe("APY and TVL", function () {
        it("Should return APY for supported tokens", async function () {
            const { mockProtocol } = await loadFixture(deployMockDEXProtocolFixture);

            const supportedTokens = await mockProtocol.getSupportedTokens();
            const token = supportedTokens[0];

            const apy = await mockProtocol.getAPY(token);
            expect(apy).to.be.greaterThan(0);
            expect(apy).to.be.lessThanOrEqual(10000); // Max 100%
        });

        it("Should return TVL for supported tokens", async function () {
            const { mockProtocol } = await loadFixture(deployMockDEXProtocolFixture);

            const supportedTokens = await mockProtocol.getSupportedTokens();
            const token = supportedTokens[0];

            const tvl = await mockProtocol.getTVL(token);
            expect(tvl).to.be.greaterThan(0);
        });

        it("Should revert for unsupported tokens", async function () {
            const { mockProtocol } = await loadFixture(deployMockDEXProtocolFixture);

            const unsupportedToken = "0x1234567890123456789012345678901234567890";

            await expect(mockProtocol.getAPY(unsupportedToken))
                .to.be.revertedWith("Token not supported");

            await expect(mockProtocol.getTVL(unsupportedToken))
                .to.be.revertedWith("Token not supported");
        });

        it("Should allow owner to update APY", async function () {
            const { mockProtocol, owner } = await loadFixture(deployMockDEXProtocolFixture);

            const supportedTokens = await mockProtocol.getSupportedTokens();
            const token = supportedTokens[0];
            const newAPY = 1000; // 10%

            await expect(mockProtocol.connect(owner).updateAPY(token, newAPY))
                .to.emit(mockProtocol, "APYUpdated");

            // Note: getAPY includes dynamic variations, so we check the base value
            const tokenData = await mockProtocol.getTokenData(token);
            expect(tokenData.apy).to.equal(newAPY);
        });

        it("Should allow owner to update TVL", async function () {
            const { mockProtocol, owner } = await loadFixture(deployMockDEXProtocolFixture);

            const supportedTokens = await mockProtocol.getSupportedTokens();
            const token = supportedTokens[0];
            const newTVL = ethers.parseEther("2000000");

            await expect(mockProtocol.connect(owner).updateTVL(token, newTVL))
                .to.emit(mockProtocol, "TVLUpdated");

            // Note: getTVL includes fluctuations, so we check the base value
            const tokenData = await mockProtocol.getTokenData(token);
            expect(tokenData.tvl).to.equal(newTVL);
        });
    });

    describe("Pool Information", function () {
        it("Should return pool info for supported tokens", async function () {
            const { mockProtocol } = await loadFixture(deployMockDEXProtocolFixture);

            const supportedTokens = await mockProtocol.getSupportedTokens();
            const token = supportedTokens[0];

            const poolInfo = await mockProtocol.getPoolInfo(token);

            expect(poolInfo.poolAddress).to.not.equal(ethers.ZeroAddress);
            expect(poolInfo.totalLiquidity).to.be.greaterThan(0);
            expect(poolInfo.utilizationRate).to.be.greaterThan(0);
            expect(poolInfo.utilizationRate).to.be.lessThanOrEqual(10000); // Max 100%
        });

        it("Should revert pool info for unsupported tokens", async function () {
            const { mockProtocol } = await loadFixture(deployMockDEXProtocolFixture);

            const unsupportedToken = "0x1234567890123456789012345678901234567890";

            await expect(mockProtocol.getPoolInfo(unsupportedToken))
                .to.be.revertedWith("Token not supported");
        });
    });

    describe("Activity Simulation", function () {
        it("Should simulate protocol activity", async function () {
            const { mockProtocol } = await loadFixture(deployMockDEXProtocolFixture);

            const supportedTokens = await mockProtocol.getSupportedTokens();
            const token = supportedTokens[0];

            // Get initial data
            const initialData = await mockProtocol.getTokenData(token);

            // Simulate activity
            await mockProtocol.simulateActivity();

            // Get updated data
            const updatedData = await mockProtocol.getTokenData(token);

            // Data should be updated (timestamp should change)
            expect(updatedData.lastUpdate).to.be.greaterThan(initialData.lastUpdate);
        });

        it("Should maintain reasonable APY bounds during simulation", async function () {
            const { mockProtocol } = await loadFixture(deployMockDEXProtocolFixture);

            // Run simulation multiple times
            for (let i = 0; i < 5; i++) {
                await mockProtocol.simulateActivity();

                const supportedTokens = await mockProtocol.getSupportedTokens();

                for (const token of supportedTokens) {
                    const tokenData = await mockProtocol.getTokenData(token);
                    expect(tokenData.apy).to.be.lessThanOrEqual(10000); // Max 100%
                    expect(tokenData.apy).to.be.greaterThan(0); // Should be positive
                }
            }
        });
    });

    describe("Dynamic Variations", function () {
        it("Should show APY variations over time", async function () {
            const { mockProtocol } = await loadFixture(deployMockDEXProtocolFixture);

            const supportedTokens = await mockProtocol.getSupportedTokens();
            const token = supportedTokens[0];

            // Get APY multiple times (should vary due to block.timestamp)
            const apy1 = await mockProtocol.getAPY(token);

            // Mine a block to change timestamp
            await ethers.provider.send("evm_mine", []);

            const apy2 = await mockProtocol.getAPY(token);

            // APYs might be different due to timestamp-based variation
            // Both should be valid values
            expect(apy1).to.be.greaterThan(0);
            expect(apy2).to.be.greaterThan(0);
            expect(apy1).to.be.lessThanOrEqual(10000);
            expect(apy2).to.be.lessThanOrEqual(10000);
        });

        it("Should show TVL fluctuations", async function () {
            const { mockProtocol } = await loadFixture(deployMockDEXProtocolFixture);

            const supportedTokens = await mockProtocol.getSupportedTokens();
            const token = supportedTokens[0];

            const tvl1 = await mockProtocol.getTVL(token);

            // Mine a block to change timestamp
            await ethers.provider.send("evm_mine", []);

            const tvl2 = await mockProtocol.getTVL(token);

            // Both should be positive
            expect(tvl1).to.be.greaterThan(0);
            expect(tvl2).to.be.greaterThan(0);
        });
    });
});