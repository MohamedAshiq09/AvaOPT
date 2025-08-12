// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IAaveAddressesProvider.sol";
import "../interfaces/IAaveProtocolDataProvider.sol";
import "../interfaces/IAavePool.sol";
import "../interfaces/IERC20.sol";
import "../libraries/YieldMath.sol";

/**
 * @title AaveV3Adapter
 * @dev Enhanced adapter for Aave V3 protocol integration
 * @dev Provides comprehensive yield data, health factors, and risk metrics
 */
contract AaveV3Adapter {
    using YieldMath for uint256;

    // ============ CONSTANTS ============
    uint256 private constant RAY = 1e27;
    uint256 private constant SECONDS_PER_YEAR = 365 days;
    uint256 private constant MAX_HEALTH_FACTOR = 1e18 * 100; // 100.0
    
    // ============ STATE VARIABLES ============
    IAaveAddressesProvider public immutable addressesProvider;
    IAaveProtocolDataProvider public immutable dataProvider;
    IAavePool public immutable pool;
    
    // Enhanced token data
    struct TokenReserveData {
        uint256 liquidityRate;
        uint256 variableBorrowRate;
        uint256 stableBorrowRate;
        uint256 totalAToken;
        uint256 totalStableDebt;
        uint256 totalVariableDebt;
        uint256 liquidityIndex;
        uint256 variableBorrowIndex;
        uint256 lastUpdateTimestamp;
        bool isActive;
        bool isFrozen;
        bool borrowingEnabled;
        bool stableBorrowRateEnabled;
        uint256 reserveFactor;
        uint256 ltv;
        uint256 liquidationThreshold;
        uint256 liquidationBonus;
    }
    
    struct UserAccountData {
        uint256 totalCollateralETH;
        uint256 totalDebtETH;
        uint256 availableBorrowsETH;
        uint256 currentLiquidationThreshold;
        uint256 ltv;
        uint256 healthFactor;
    }
    
    // Events
    event ReserveDataUpdated(address indexed token, uint256 liquidityRate, uint256 totalSupply);
    event UserDataQueried(address indexed user, uint256 healthFactor, uint256 totalCollateral);
    
    // Errors
    error InvalidAddressesProvider();
    error InvalidDataProvider();
    error InvalidPool();
    error TokenNotSupported(address token);
    error DataRetrievalFailed(address token);
    
    // ============ CONSTRUCTOR ============
    constructor(
        address _addressesProvider,
        address _dataProvider
    ) {
        if (_addressesProvider == address(0)) revert InvalidAddressesProvider();
        if (_dataProvider == address(0)) revert InvalidDataProvider();
        
        addressesProvider = IAaveAddressesProvider(_addressesProvider);
        dataProvider = IAaveProtocolDataProvider(_dataProvider);
        
        address poolAddress = addressesProvider.getPool();
        if (poolAddress == address(0)) revert InvalidPool();
        pool = IAavePool(poolAddress);
    }
    
    // ============ ENHANCED YIELD DATA FUNCTIONS ============
    
    /**
     * @notice Gets comprehensive reserve data for a token
     * @param token Token address
     * @return reserveData Complete reserve information
     */
    function getTokenReserveData(address token) 
        external 
        returns (TokenReserveData memory reserveData) 
    {
        try dataProvider.getReserveData(token) returns (
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
        ) {
            // Get configuration data
            (
                uint256 ltv,
                uint256 liquidationThreshold,
                uint256 liquidationBonus,
                uint256 decimals,
                uint256 reserveFactor,
                bool usageAsCollateralEnabled,
                bool borrowingEnabled,
                bool stableBorrowRateEnabled,
                bool isActive,
                bool isFrozen
            ) = dataProvider.getReserveConfigurationData(token);
            
            reserveData = TokenReserveData({
                liquidityRate: liquidityRate,
                variableBorrowRate: variableBorrowRate,
                stableBorrowRate: stableBorrowRate,
                totalAToken: totalAToken,
                totalStableDebt: totalStableDebt,
                totalVariableDebt: totalVariableDebt,
                liquidityIndex: liquidityIndex,
                variableBorrowIndex: variableBorrowIndex,
                lastUpdateTimestamp: lastUpdateTimestamp,
                isActive: isActive,
                isFrozen: isFrozen,
                borrowingEnabled: borrowingEnabled,
                stableBorrowRateEnabled: stableBorrowRateEnabled,
                reserveFactor: reserveFactor,
                ltv: ltv,
                liquidationThreshold: liquidationThreshold,
                liquidationBonus: liquidationBonus
            });
            
            emit ReserveDataUpdated(token, liquidityRate, totalAToken);
            
        } catch {
            revert DataRetrievalFailed(token);
        }
    }
    
    /**
     * @notice Gets enhanced APY data with historical context
     * @param token Token address
     * @return currentAPY Current supply APY in basis points
     * @return borrowAPY Current variable borrow APY in basis points
     * @return utilizationRate Current utilization rate in basis points
     * @return totalSupply Total supplied amount
     * @return totalBorrow Total borrowed amount
     */
    function getEnhancedAPYData(address token)
        external
        returns (
            uint256 currentAPY,
            uint256 borrowAPY,
            uint256 utilizationRate,
            uint256 totalSupply,
            uint256 totalBorrow
        )
    {
        TokenReserveData memory data = this.getTokenReserveData(token);
        
        // Convert ray-based rates to basis points
        currentAPY = YieldMath.aaveRayToBps(data.liquidityRate);
        borrowAPY = YieldMath.aaveRayToBps(data.variableBorrowRate);
        
        // Calculate utilization rate
        totalSupply = data.totalAToken;
        totalBorrow = data.totalVariableDebt + data.totalStableDebt;
        
        if (totalSupply > 0) {
            utilizationRate = (totalBorrow * 10000) / totalSupply; // In basis points
        }
    }
    
    /**
     * @notice Gets user account data for risk assessment
     * @param user User address
     * @return accountData Complete user account information
     */
    function getUserAccountData(address user)
        external
        returns (UserAccountData memory accountData)
    {
        try pool.getUserAccountData(user) returns (
            uint256 totalCollateralETH,
            uint256 totalDebtETH,
            uint256 availableBorrowsETH,
            uint256 currentLiquidationThreshold,
            uint256 ltv,
            uint256 healthFactor
        ) {
            accountData = UserAccountData({
                totalCollateralETH: totalCollateralETH,
                totalDebtETH: totalDebtETH,
                availableBorrowsETH: availableBorrowsETH,
                currentLiquidationThreshold: currentLiquidationThreshold,
                ltv: ltv,
                healthFactor: healthFactor > MAX_HEALTH_FACTOR ? MAX_HEALTH_FACTOR : healthFactor
            });
            
            emit UserDataQueried(user, healthFactor, totalCollateralETH);
            
        } catch {
            // Return empty data if user has no positions
            accountData = UserAccountData({
                totalCollateralETH: 0,
                totalDebtETH: 0,
                availableBorrowsETH: 0,
                currentLiquidationThreshold: 0,
                ltv: 0,
                healthFactor: type(uint256).max
            });
        }
    }
    
    /**
     * @notice Gets user token balance data
     * @param user User address
     * @param token Token address
     * @return aTokenBalance User's aToken balance
     * @return stableDebt User's stable debt
     * @return variableDebt User's variable debt
     * @return principalStableDebt Principal stable debt
     * @return scaledVariableDebt Scaled variable debt
     * @return stableBorrowRate User's stable borrow rate
     * @return liquidityRate Current liquidity rate
     * @return stableRateLastUpdated Last stable rate update
     * @return usageAsCollateralEnabled Whether used as collateral
     */
    function getUserReserveData(address user, address token)
        external
        view
        returns (
            uint256 aTokenBalance,
            uint256 stableDebt,
            uint256 variableDebt,
            uint256 principalStableDebt,
            uint256 scaledVariableDebt,
            uint256 stableBorrowRate,
            uint256 liquidityRate,
            uint40 stableRateLastUpdated,
            bool usageAsCollateralEnabled
        )
    {
        try dataProvider.getUserReserveData(token, user) returns (
            uint256 currentATokenBalance,
            uint256 currentStableDebt,
            uint256 currentVariableDebt,
            uint256 principalStableDebtAmount,
            uint256 scaledVariableDebtAmount,
            uint256 stableBorrowRateAmount,
            uint256 liquidityRateAmount,
            uint40 stableRateLastUpdatedTimestamp,
            bool usageAsCollateral
        ) {
            return (
                currentATokenBalance,
                currentStableDebt,
                currentVariableDebt,
                principalStableDebtAmount,
                scaledVariableDebtAmount,
                stableBorrowRateAmount,
                liquidityRateAmount,
                stableRateLastUpdatedTimestamp,
                usageAsCollateral
            );
        } catch {
            revert DataRetrievalFailed(token);
        }
    }
    
    /**
     * @notice Calculates projected earnings for a deposit amount
     * @param token Token address
     * @param amount Deposit amount
     * @param timeHorizon Time horizon in seconds
     * @return projectedEarnings Projected earnings in token units
     * @return effectiveAPY Effective APY considering compounding
     */
    function calculateProjectedEarnings(
        address token,
        uint256 amount,
        uint256 timeHorizon
    )
        external
        returns (uint256 projectedEarnings, uint256 effectiveAPY)
    {
        TokenReserveData memory data = this.getTokenReserveData(token);
        
        if (!data.isActive || data.isFrozen) {
            return (0, 0);
        }
        
        // Convert ray rate to per-second rate
        uint256 ratePerSecond = data.liquidityRate / SECONDS_PER_YEAR;
        
        // Calculate compound interest: A = P * (1 + r)^t
        // Simplified for gas efficiency: A ≈ P * (1 + r*t) for small rates
        uint256 interestFactor = RAY + (ratePerSecond * timeHorizon);
        uint256 finalAmount = (amount * interestFactor) / RAY;
        
        projectedEarnings = finalAmount > amount ? finalAmount - amount : 0;
        effectiveAPY = YieldMath.aaveRayToBps(data.liquidityRate);
    }
    
    /**
     * @notice Gets risk metrics for a token
     * @param token Token address
     * @return riskScore Risk score (0-100, lower is safer)
     * @return liquidityRisk Liquidity risk assessment
     * @return volatilityRisk Volatility risk assessment
     * @return utilizationRisk Utilization risk assessment
     */
    function getRiskMetrics(address token)
        external
        returns (
            uint256 riskScore,
            uint256 liquidityRisk,
            uint256 volatilityRisk,
            uint256 utilizationRisk
        )
    {
        TokenReserveData memory data = this.getTokenReserveData(token);
        
        // Calculate utilization rate
        uint256 totalBorrow = data.totalStableDebt + data.totalVariableDebt;
        uint256 utilization = data.totalAToken > 0 ? 
            (totalBorrow * 10000) / data.totalAToken : 0;
        
        // Liquidity risk based on total supply
        if (data.totalAToken > 1000000 * 1e18) { // > 1M tokens
            liquidityRisk = 10; // Low risk
        } else if (data.totalAToken > 100000 * 1e18) { // > 100K tokens
            liquidityRisk = 25; // Medium risk
        } else {
            liquidityRisk = 50; // High risk
        }
        
        // Utilization risk
        if (utilization > 9000) { // > 90%
            utilizationRisk = 60;
        } else if (utilization > 8000) { // > 80%
            utilizationRisk = 40;
        } else if (utilization > 6000) { // > 60%
            utilizationRisk = 20;
        } else {
            utilizationRisk = 10;
        }
        
        // Volatility risk based on LTV (lower LTV = higher volatility)
        if (data.ltv < 5000) { // < 50%
            volatilityRisk = 50;
        } else if (data.ltv < 7000) { // < 70%
            volatilityRisk = 30;
        } else {
            volatilityRisk = 15;
        }
        
        // Combined risk score (weighted average)
        riskScore = (liquidityRisk * 30 + utilizationRisk * 40 + volatilityRisk * 30) / 100;
    }
    
    /**
     * @notice Checks if a token is supported and active in Aave
     * @param token Token address
     * @return isSupported Whether token is supported
     * @return isActive Whether token is active
     * @return isFrozen Whether token is frozen
     */
    function getTokenStatus(address token)
        external
        view
        returns (bool isSupported, bool isActive, bool isFrozen)
    {
        try dataProvider.getReserveConfigurationData(token) returns (
            uint256, uint256, uint256, uint256, uint256,
            bool, bool, bool, bool active, bool frozen
        ) {
            return (true, active, frozen);
        } catch {
            return (false, false, false);
        }
    }
    
    /**
     * @notice Gets all supported tokens in Aave
     * @return tokens Array of supported token addresses
     */
    function getAllReserveTokens() external view returns (address[] memory tokens) {
        try dataProvider.getAllReservesTokens() returns (
            IAaveProtocolDataProvider.TokenData[] memory reserveTokens
        ) {
            tokens = new address[](reserveTokens.length);
            for (uint256 i = 0; i < reserveTokens.length; i++) {
                tokens[i] = reserveTokens[i].tokenAddress;
            }
        } catch {
            // Return empty array if call fails
            tokens = new address[](0);
        }
    }
    
    /**
     * @notice Gets aToken address for a reserve token
     * @param token Reserve token address
     * @return aToken aToken address
     * @return stableDebtToken Stable debt token address
     * @return variableDebtToken Variable debt token address
     */
    function getReserveTokensAddresses(address token)
        external
        view
        returns (address aToken, address stableDebtToken, address variableDebtToken)
    {
        try dataProvider.getReserveTokensAddresses(token) returns (
            address aTokenAddress,
            address stableDebtTokenAddress,
            address variableDebtTokenAddress
        ) {
            return (aTokenAddress, stableDebtTokenAddress, variableDebtTokenAddress);
        } catch {
            revert TokenNotSupported(token);
        }
    }
}