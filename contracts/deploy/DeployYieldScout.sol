// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../YieldScout.sol";
import "../mocks/MockDEXProtocol.sol";

/**
 * @title DeployYieldScout
 * @dev Deployment script for YieldScout contract on subnet
 */
contract DeployYieldScout {
    // Deployment configuration
    struct DeploymentConfig {
        address teleporterMessenger;
        address localProtocol;
        address[] supportedTokens;
        string networkName;
    }
    
    // Events
    event YieldScoutDeployed(address indexed yieldScout, address indexed localProtocol);
    event MockProtocolDeployed(address indexed mockProtocol);
    
    /**
     * @dev Deploy YieldScout with mock protocol for testing
     * @param teleporterAddress Teleporter messenger address on subnet
     * @param supportedTokens Array of supported token addresses
     * @return yieldScout Deployed YieldScout contract address
     * @return mockProtocol Deployed MockDEXProtocol contract address
     */
    function deployWithMockProtocol(
        address teleporterAddress,
        address[] memory supportedTokens
    ) external returns (address yieldScout, address mockProtocol) {
        // Deploy mock protocol first
        MockDEXProtocol protocol = new MockDEXProtocol();
        mockProtocol = address(protocol);
        
        emit MockProtocolDeployed(mockProtocol);
        
        // Deploy YieldScout
        YieldScout scout = new YieldScout(
            teleporterAddress,
            mockProtocol,
            supportedTokens
        );
        yieldScout = address(scout);
        
        emit YieldScoutDeployed(yieldScout, mockProtocol);
        
        return (yieldScout, mockProtocol);
    }
    
    /**
     * @dev Deploy YieldScout with existing protocol
     * @param config Deployment configuration
     * @return yieldScout Deployed YieldScout contract address
     */
    function deployWithExistingProtocol(
        DeploymentConfig memory config
    ) external returns (address yieldScout) {
        YieldScout scout = new YieldScout(
            config.teleporterMessenger,
            config.localProtocol,
            config.supportedTokens
        );
        yieldScout = address(scout);
        
        emit YieldScoutDeployed(yieldScout, config.localProtocol);
        
        return yieldScout;
    }
    
    /**
     * @dev Get deployment configuration for different networks
     * @param networkName Name of the network ("echo", "dispatch", "local")
     * @return config Deployment configuration for the network
     */
    function getNetworkConfig(string memory networkName) 
        external 
        pure 
        returns (DeploymentConfig memory config) 
    {
        if (keccak256(bytes(networkName)) == keccak256(bytes("echo"))) {
            // Echo Test L1 configuration
            config = DeploymentConfig({
                teleporterMessenger: 0x253b2784c75e510dD0fF1da844684a1aC0aa5fcf, // Echo testnet
                localProtocol: address(0), // Will be deployed
                supportedTokens: new address[](0), // Will be set after deployment
                networkName: "echo"
            });
        } else if (keccak256(bytes(networkName)) == keccak256(bytes("dispatch"))) {
            // Dispatch Test L1 configuration
            config = DeploymentConfig({
                teleporterMessenger: 0x253b2784c75e510dD0fF1da844684a1aC0aa5fcf, // Dispatch testnet
                localProtocol: address(0), // Will be deployed
                supportedTokens: new address[](0), // Will be set after deployment
                networkName: "dispatch"
            });
        } else {
            // Local/custom configuration
            config = DeploymentConfig({
                teleporterMessenger: address(0), // Must be provided
                localProtocol: address(0), // Will be deployed
                supportedTokens: new address[](0), // Will be set after deployment
                networkName: "local"
            });
        }
    }
}