// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IAavePool
 * @notice Interface for Aave V3 Pool contract
 * @dev Defines the basic interface for the Aave Pool
 */
interface IAavePool {
    struct ReserveData {
        // Stores the reserve configuration
        ReserveConfigurationMap configuration;
        // The liquidity index. Expressed in ray
        uint128 liquidityIndex;
        // The current supply rate. Expressed in ray
        uint128 currentLiquidityRate;
        // Variable borrow index. Expressed in ray
        uint128 variableBorrowIndex;
        // The current variable borrow rate. Expressed in ray
        uint128 currentVariableBorrowRate;
        // The current stable borrow rate. Expressed in ray
        uint128 currentStableBorrowRate;
        // Timestamp of last update
        uint40 lastUpdateTimestamp;
        // The id of the reserve
        uint16 id;
        // aToken address
        address aTokenAddress;
        // stableDebtToken address
        address stableDebtTokenAddress;
        // variableDebtToken address
        address variableDebtTokenAddress;
        // address of the interest rate strategy
        address interestRateStrategyAddress;
        // the current treasury balance, normalized to ray
        uint128 accruedToTreasury;
        // the outstanding unbacked aTokens minted through the bridging feature
        uint128 unbacked;
        // the outstanding debt borrowed against this asset in isolation mode
        uint128 isolationModeTotalDebt;
    }

    struct ReserveConfigurationMap {
        uint256 data;
    }

    /**
     * @notice Returns the state and configuration of the reserve
     * @param asset The address of the underlying asset of the reserve
     * @return The state and configuration data of the reserve
     */
    function getReserveData(address asset) external view returns (ReserveData memory);

    /**
     * @notice Returns the normalized income of the reserve
     * @param asset The address of the underlying asset of the reserve
     * @return The reserve normalized income
     */
    function getReserveNormalizedIncome(address asset) external view returns (uint256);

    /**
     * @notice Returns the normalized variable debt per unit of asset
     * @param asset The address of the underlying asset of the reserve
     * @return The reserve normalized variable debt
     */
    function getReserveNormalizedVariableDebt(address asset) external view returns (uint256);

    /**
     * @notice Returns the configuration of the reserve
     * @param asset The address of the underlying asset of the reserve
     * @return The configuration of the reserve
     */
    function getConfiguration(address asset) external view returns (ReserveConfigurationMap memory);

    /**
     * @notice Returns the list of initialized reserves, containing the address of the underlying asset
     * @return The list of reserves
     */
    function getReservesList() external view returns (address[] memory);

    /**
     * @notice Returns the user account data across all the reserves
     * @param user The address of the user
     * @return totalCollateralETH The total collateral in ETH of the user
     * @return totalDebtETH The total debt in ETH of the user
     * @return availableBorrowsETH The borrowing power left of the user
     * @return currentLiquidationThreshold The liquidation threshold of the user
     * @return ltv The loan to value of the user
     * @return healthFactor The current health factor of the user
     */
    function getUserAccountData(address user)
        external
        view
        returns (
            uint256 totalCollateralETH,
            uint256 totalDebtETH,
            uint256 availableBorrowsETH,
            uint256 currentLiquidationThreshold,
            uint256 ltv,
            uint256 healthFactor
        );
}