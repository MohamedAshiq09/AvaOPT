// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IAaveProtocolDataProvider
 * @notice Interface for Aave V3 Protocol Data Provider
 * @dev This interface provides access to Aave's reserve data and configuration
 */
interface IAaveProtocolDataProvider {
    struct TokenData {
        string symbol;
        address tokenAddress;
    }

    /**
     * @notice Returns the reserve data for a given asset
     * @param asset The address of the underlying asset
     * @return unbacked The amount of unbacked tokens
     * @return accruedToTreasuryScaled The scaled amount of tokens accrued to treasury
     * @return totalAToken The total supply of aTokens
     * @return totalStableDebt The total stable debt
     * @return totalVariableDebt The total variable debt
     * @return liquidityRate The liquidity rate (in ray)
     * @return variableBorrowRate The variable borrow rate (in ray)
     * @return stableBorrowRate The stable borrow rate (in ray)
     * @return averageStableBorrowRate The average stable borrow rate
     * @return liquidityIndex The liquidity index
     * @return variableBorrowIndex The variable borrow index
     * @return lastUpdateTimestamp The timestamp of the last update
     */
    function getReserveData(address asset)
        external
        view
        returns (
            uint256 unbacked,
            uint256 accruedToTreasuryScaled,
            uint256 totalAToken,
            uint256 totalStableDebt,
            uint256 totalVariableDebt,
            uint256 liquidityRate,
            uint256 variableBorrowRate,
            uint256 stableBorrowRate,
            uint256 averageStableBorrowRate,
            uint256 liquidityIndex,
            uint256 variableBorrowIndex,
            uint40 lastUpdateTimestamp
        );

    /**
     * @notice Returns the configuration data for a given asset
     * @param asset The address of the underlying asset
     * @return decimals The decimals of the asset
     * @return ltv The loan to value
     * @return liquidationThreshold The liquidation threshold
     * @return liquidationBonus The liquidation bonus
     * @return reserveFactor The reserve factor
     * @return usageAsCollateralEnabled True if the asset can be used as collateral
     * @return borrowingEnabled True if borrowing is enabled
     * @return stableBorrowRateEnabled True if stable borrowing is enabled
     * @return isActive True if the asset is active
     * @return isFrozen True if the asset is frozen
     */
    function getReserveConfigurationData(address asset)
        external
        view
        returns (
            uint256 decimals,
            uint256 ltv,
            uint256 liquidationThreshold,
            uint256 liquidationBonus,
            uint256 reserveFactor,
            bool usageAsCollateralEnabled,
            bool borrowingEnabled,
            bool stableBorrowRateEnabled,
            bool isActive,
            bool isFrozen
        );

    /**
     * @notice Returns the aToken, stable debt token, and variable debt token addresses for an asset
     * @param asset The address of the underlying asset
     * @return aTokenAddress The address of the aToken
     * @return stableDebtTokenAddress The address of the stable debt token
     * @return variableDebtTokenAddress The address of the variable debt token
     */
    function getReserveTokensAddresses(address asset)
        external
        view
        returns (
            address aTokenAddress,
            address stableDebtTokenAddress,
            address variableDebtTokenAddress
        );

    /**
     * @notice Returns all aTokens and their underlying assets
     */
    function getAllATokens() external view returns (TokenData[] memory);

    /**
     * @notice Returns all reserve tokens and their underlying assets
     */
    function getAllReservesTokens() external view returns (TokenData[] memory);

    /**
     * @notice Returns the user data for a given asset and user
     * @param asset The address of the underlying asset
     * @param user The address of the user
     * @return currentATokenBalance The current aToken balance of the user
     * @return currentStableDebt The current stable debt of the user
     * @return currentVariableDebt The current variable debt of the user
     * @return principalStableDebt The principal stable debt of the user
     * @return scaledVariableDebt The scaled variable debt of the user
     * @return stableBorrowRate The stable borrow rate of the user
     * @return liquidityRate The liquidity rate of the user
     * @return stableRateLastUpdated The timestamp of the last stable rate update
     * @return usageAsCollateralEnabled True if the user is using the asset as collateral
     */
    function getUserReserveData(address asset, address user)
        external
        view
        returns (
            uint256 currentATokenBalance,
            uint256 currentStableDebt,
            uint256 currentVariableDebt,
            uint256 principalStableDebt,
            uint256 scaledVariableDebt,
            uint256 stableBorrowRate,
            uint256 liquidityRate,
            uint40 stableRateLastUpdated,
            bool usageAsCollateralEnabled
        );
}