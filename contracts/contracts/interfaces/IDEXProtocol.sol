// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @dev Interface for native subnet DEX/lending protocols
 * @dev This interface should be implemented by the actual protocol contracts
 */
interface IDEXProtocol {
    /**
     * @dev Get current APY for a token
     * @param token Token address
     * @return apy APY in basis points (e.g., 750 = 7.50%)
     */
    function getAPY(address token) external view returns (uint256 apy);
    
    /**
     * @dev Get total value locked for a token
     * @param token Token address
     * @return tvl Total value locked in wei
     */
    function getTVL(address token) external view returns (uint256 tvl);
    
    /**
     * @dev Get protocol name
     * @return name Protocol name string
     */
    function getProtocolName() external view returns (string memory name);
    
    /**
     * @dev Check if token is supported by the protocol
     * @param token Token address
     * @return supported Whether token is supported
     */
    function isTokenSupported(address token) external view returns (bool supported);
    
    /**
     * @dev Get liquidity pool information for a token
     * @param token Token address
     * @return poolAddress Address of the liquidity pool
     * @return totalLiquidity Total liquidity in the pool
     * @return utilizationRate Current utilization rate in basis points
     */
    function getPoolInfo(address token) external view returns (
        address poolAddress,
        uint256 totalLiquidity,
        uint256 utilizationRate
    );
}