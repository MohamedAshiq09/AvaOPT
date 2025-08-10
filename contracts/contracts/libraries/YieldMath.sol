// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title YieldMath
 * @notice Mathematical operations and conversions for yield calculations
 * @dev Handles Aave ray math, APY calculations, and yield optimizations
 */
library YieldMath {
    // Aave uses ray (27 decimals) for rates
    uint256 private constant RAY = 1e27;
    uint256 private constant HALF_RAY = RAY / 2;
    
    // Basis points (10000 = 100%)
    uint256 private constant BPS_PRECISION = 10000;
    
    // Seconds in a year for APY calculations
    uint256 private constant SECONDS_PER_YEAR = 365 days;
    
    // Maximum reasonable APY in basis points (500% = 50000 bps)
    uint256 private constant MAX_REASONABLE_APY_BPS = 50000;

    /**
     * @dev Converts Aave ray rate to basis points APY
     * @param rayRate The rate in ray format (27 decimals)
     * @return apyBps The APY in basis points
     */
    function aaveRayToBps(uint256 rayRate) internal pure returns (uint256 apyBps) {
        if (rayRate == 0) return 0;
        
        // Convert ray to percentage (rayRate / RAY * 100)
        // Then convert to basis points (* 100)
        // Combined: rayRate * 10000 / RAY
        apyBps = (rayRate * BPS_PRECISION) / RAY;
        
        // Ensure reasonable bounds
        if (apyBps > MAX_REASONABLE_APY_BPS) {
            apyBps = MAX_REASONABLE_APY_BPS;
        }
        
        return apyBps;
    }

    /**
     * @dev Converts basis points to ray format
     * @param bps The value in basis points
     * @return ray The value in ray format
     */
    function bpsToRay(uint256 bps) internal pure returns (uint256 ray) {
        return (bps * RAY) / BPS_PRECISION;
    }

    /**
     * @dev Calculates weighted average APY between two sources
     * @param apy1Bps First APY in basis points
     * @param apy2Bps Second APY in basis points
     * @param weight1 Weight for first APY (in basis points, max 10000)
     * @param weight2 Weight for second APY (in basis points, max 10000)
     * @return weightedAPY The weighted average APY in basis points
     */
    function weightedAPYBps(
        uint256 apy1Bps,
        uint256 apy2Bps,
        uint256 weight1,
        uint256 weight2
    ) internal pure returns (uint256 weightedAPY) {
        require(weight1 + weight2 <= BPS_PRECISION, "YieldMath: weights exceed 100%");
        
        if (weight1 + weight2 == 0) return 0;
        
        weightedAPY = (apy1Bps * weight1 + apy2Bps * weight2) / (weight1 + weight2);
        return weightedAPY;
    }

    /**
     * @dev Clamps a value between min and max bounds
     * @param value The value to clamp
     * @param min Minimum allowed value
     * @param max Maximum allowed value
     * @return clampedValue The clamped value
     */
    function sanityClampBps(
        uint256 value,
        uint256 min,
        uint256 max
    ) internal pure returns (uint256 clampedValue) {
        if (value < min) return min;
        if (value > max) return max;
        return value;
    }

    /**
     * @dev Calculates optimized APY using risk-weighted allocation
     * @param aaveAPYBps Aave APY in basis points
     * @param subnetAPYBps Subnet protocol APY in basis points
     * @return optimizedAPY The optimized APY in basis points
     */
    function calculateOptimizedAPY(
        uint256 aaveAPYBps,
        uint256 subnetAPYBps
    ) internal pure returns (uint256 optimizedAPY) {
        // Risk-based allocation weights
        // Aave (safer): 60% weight, Subnet (riskier but higher yield): 40% weight
        uint256 aaveWeight = 6000; // 60%
        uint256 subnetWeight = 4000; // 40%
        
        // If one source has significantly higher APY, adjust weights
        if (subnetAPYBps > aaveAPYBps * 15 / 10) { // Subnet APY > 150% of Aave APY
            // Reduce subnet weight due to higher risk
            aaveWeight = 7000; // 70%
            subnetWeight = 3000; // 30%
        } else if (aaveAPYBps > subnetAPYBps * 12 / 10) { // Aave APY > 120% of Subnet APY
            // Increase Aave weight (unusual but safer)
            aaveWeight = 8000; // 80%
            subnetWeight = 2000; // 20%
        }
        
        return weightedAPYBps(aaveAPYBps, subnetAPYBps, aaveWeight, subnetWeight);
    }

    /**
     * @dev Calculates compound interest over time
     * @param principal Principal amount
     * @param apyBps APY in basis points
     * @param timeSeconds Time period in seconds
     * @return finalAmount The final amount after compound interest
     */
    function calculateCompoundInterest(
        uint256 principal,
        uint256 apyBps,
        uint256 timeSeconds
    ) internal pure returns (uint256 finalAmount) {
        if (principal == 0 || apyBps == 0 || timeSeconds == 0) {
            return principal;
        }
        
        // Convert APY to rate per second
        // rate = (1 + APY)^(1/seconds_per_year) - 1
        // Simplified for small rates: rate ≈ APY / seconds_per_year
        uint256 ratePerSecond = (apyBps * RAY) / (BPS_PRECISION * SECONDS_PER_YEAR);
        
        // Calculate compound interest: principal * (1 + rate)^time
        // For small rates and reasonable time periods, use approximation
        uint256 totalRate = (ratePerSecond * timeSeconds) / RAY;
        finalAmount = principal + (principal * totalRate) / RAY;
        
        return finalAmount;
    }

    /**
     * @dev Calculates the time needed to reach a target amount
     * @param principal Starting principal
     * @param targetAmount Target amount to reach
     * @param apyBps APY in basis points
     * @return timeSeconds Time needed in seconds
     */
    function calculateTimeToTarget(
        uint256 principal,
        uint256 targetAmount,
        uint256 apyBps
    ) internal pure returns (uint256 timeSeconds) {
        if (principal >= targetAmount || apyBps == 0) {
            return 0;
        }
        
        // Simplified calculation: time = (target/principal - 1) / (APY/year)
        uint256 growthNeeded = ((targetAmount - principal) * BPS_PRECISION) / principal;
        timeSeconds = (growthNeeded * SECONDS_PER_YEAR) / apyBps;
        
        return timeSeconds;
    }

    /**
     * @dev Validates that APY values are reasonable
     * @param apyBps APY in basis points to validate
     * @return isValid True if APY is within reasonable bounds
     */
    function isValidAPY(uint256 apyBps) internal pure returns (bool isValid) {
        return apyBps <= MAX_REASONABLE_APY_BPS;
    }

    /**
     * @dev Calculates risk-adjusted yield score
     * @param apyBps APY in basis points
     * @param riskScore Risk score (0-100, where 0 is safest)
     * @return adjustedScore Risk-adjusted yield score
     */
    function calculateRiskAdjustedYield(
        uint256 apyBps,
        uint256 riskScore
    ) internal pure returns (uint256 adjustedScore) {
        require(riskScore <= 100, "YieldMath: risk score must be <= 100");
        
        // Reduce yield score based on risk
        // adjustedScore = APY * (100 - riskScore) / 100
        adjustedScore = (apyBps * (100 - riskScore)) / 100;
        
        return adjustedScore;
    }
}