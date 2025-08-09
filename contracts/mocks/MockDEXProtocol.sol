// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IDEXProtocol.sol";
import "../interfaces/IERC20.sol";

/**
 * @title MockDEXProtocol
 * @dev Mock implementation of a subnet DEX protocol for testing
 * @dev Simulates realistic APY and TVL data for demonstration
 */
contract MockDEXProtocol is IDEXProtocol {
    // Protocol configuration
    string public constant PROTOCOL_NAME = "SubnetDEX";
    address public owner;
    
    // Token data storage
    struct TokenData {
        uint256 apy;           // APY in basis points
        uint256 tvl;           // Total value locked
        uint256 lastUpdate;    // Last update timestamp
        bool supported;        // Whether token is supported
        address poolAddress;   // Mock pool address
        uint256 utilizationRate; // Utilization rate in basis points
    }
    
    mapping(address => TokenData) public tokenData;
    address[] public supportedTokensList;
    
    // Events
    event TokenAdded(address indexed token, uint256 apy, uint256 tvl);
    event APYUpdated(address indexed token, uint256 oldAPY, uint256 newAPY);
    event TVLUpdated(address indexed token, uint256 oldTVL, uint256 newTVL);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        
        // Initialize with some mock data for common testnet tokens
        // These addresses are placeholders - replace with actual testnet token addresses
        _addToken(0x5425890298aed601595a70AB815c96711a31Bc65, 780, 1000000 * 1e18); // Mock USDC
        _addToken(0xd00ae08403B9bbb9124bB305C09058E32C39A48c, 650, 500000 * 1e18);  // Mock WAVAX
        _addToken(0xB6076C93701D6a07266c31066B298AeC6dd65c2d, 920, 750000 * 1e18);  // Mock USDT
    }
    
    /**
     * @dev Get current APY for a token
     * @param token Token address
     * @return apy APY in basis points
     */
    function getAPY(address token) external view override returns (uint256 apy) {
        require(tokenData[token].supported, "Token not supported");
        
        // Simulate dynamic APY with some randomness based on block timestamp
        uint256 baseAPY = tokenData[token].apy;
        uint256 variation = (block.timestamp % 100); // 0-99 basis points variation
        
        // Add some volatility (±1% variation)
        if ((block.timestamp / 100) % 2 == 0) {
            return baseAPY + variation;
        } else {
            return baseAPY > variation ? baseAPY - variation : baseAPY;
        }
    }
    
    /**
     * @dev Get total value locked for a token
     * @param token Token address
     * @return tvl Total value locked
     */
    function getTVL(address token) external view override returns (uint256 tvl) {
        require(tokenData[token].supported, "Token not supported");
        
        // Simulate slight TVL fluctuations
        uint256 baseTVL = tokenData[token].tvl;
        uint256 fluctuation = (block.timestamp % 1000) * 1e15; // Small fluctuation
        
        return baseTVL + fluctuation;
    }
    
    /**
     * @dev Get protocol name
     * @return name Protocol name
     */
    function getProtocolName() external pure override returns (string memory name) {
        return PROTOCOL_NAME;
    }
    
    /**
     * @dev Check if token is supported
     * @param token Token address
     * @return supported Whether token is supported
     */
    function isTokenSupported(address token) external view override returns (bool supported) {
        return tokenData[token].supported;
    }
    
    /**
     * @dev Get pool information for a token
     * @param token Token address
     * @return poolAddress Mock pool address
     * @return totalLiquidity Total liquidity
     * @return utilizationRate Utilization rate
     */
    function getPoolInfo(address token) external view override returns (
        address poolAddress,
        uint256 totalLiquidity,
        uint256 utilizationRate
    ) {
        require(tokenData[token].supported, "Token not supported");
        
        TokenData memory data = tokenData[token];
        return (
            data.poolAddress,
            data.tvl,
            data.utilizationRate
        );
    }
    
    /**
     * @dev Add a new supported token (owner only)
     * @param token Token address
     * @param apy Initial APY in basis points
     * @param tvl Initial TVL
     */
    function addToken(address token, uint256 apy, uint256 tvl) external onlyOwner {
        _addToken(token, apy, tvl);
    }
    
    /**
     * @dev Internal function to add a token
     * @param token Token address
     * @param apy APY in basis points
     * @param tvl Total value locked
     */
    function _addToken(address token, uint256 apy, uint256 tvl) internal {
        require(!tokenData[token].supported, "Token already supported");
        require(apy <= 10000, "APY too high"); // Max 100%
        
        tokenData[token] = TokenData({
            apy: apy,
            tvl: tvl,
            lastUpdate: block.timestamp,
            supported: true,
            poolAddress: address(uint160(uint256(keccak256(abi.encodePacked(token, block.timestamp))))),
            utilizationRate: 7500 // 75% default utilization
        });
        
        supportedTokensList.push(token);
        emit TokenAdded(token, apy, tvl);
    }
    
    /**
     * @dev Update APY for a token (owner only)
     * @param token Token address
     * @param newAPY New APY in basis points
     */
    function updateAPY(address token, uint256 newAPY) external onlyOwner {
        require(tokenData[token].supported, "Token not supported");
        require(newAPY <= 10000, "APY too high");
        
        uint256 oldAPY = tokenData[token].apy;
        tokenData[token].apy = newAPY;
        tokenData[token].lastUpdate = block.timestamp;
        
        emit APYUpdated(token, oldAPY, newAPY);
    }
    
    /**
     * @dev Update TVL for a token (owner only)
     * @param token Token address
     * @param newTVL New TVL
     */
    function updateTVL(address token, uint256 newTVL) external onlyOwner {
        require(tokenData[token].supported, "Token not supported");
        
        uint256 oldTVL = tokenData[token].tvl;
        tokenData[token].tvl = newTVL;
        tokenData[token].lastUpdate = block.timestamp;
        
        emit TVLUpdated(token, oldTVL, newTVL);
    }
    
    /**
     * @dev Get all supported tokens
     * @return tokens Array of supported token addresses
     */
    function getSupportedTokens() external view returns (address[] memory tokens) {
        return supportedTokensList;
    }
    
    /**
     * @dev Get detailed token information
     * @param token Token address
     * @return data Complete token data struct
     */
    function getTokenData(address token) external view returns (TokenData memory data) {
        return tokenData[token];
    }
    
    /**
     * @dev Simulate protocol activity (for demo purposes)
     * @dev Updates APY and TVL with realistic fluctuations
     */
    function simulateActivity() external {
        for (uint i = 0; i < supportedTokensList.length; i++) {
            address token = supportedTokensList[i];
            TokenData storage data = tokenData[token];
            
            // Simulate APY changes (±50 basis points)
            uint256 apyChange = (block.timestamp % 100);
            if ((block.timestamp / 100) % 2 == 0) {
                data.apy = data.apy + apyChange > 10000 ? 10000 : data.apy + apyChange;
            } else {
                data.apy = data.apy > apyChange ? data.apy - apyChange : data.apy;
            }
            
            // Simulate TVL changes (±5%)
            uint256 tvlChange = data.tvl / 20; // 5% of current TVL
            if ((block.timestamp / 200) % 2 == 0) {
                data.tvl += tvlChange;
            } else {
                data.tvl = data.tvl > tvlChange ? data.tvl - tvlChange : data.tvl;
            }
            
            data.lastUpdate = block.timestamp;
        }
    }
}