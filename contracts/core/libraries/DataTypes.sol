// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DataTypes
 * @notice Core data structures for SubnetYield protocol
 * @dev Defines all structs and enums used across the system
 */
library DataTypes {
    
    /**
     * @notice Enum for tracking request status
     */
    enum RequestStatus {
        Pending,    // Request sent, waiting for response
        Completed,  // Response received and processed
        Failed,     // Request failed or timed out
        Cancelled   // Request was cancelled
    }

    /**
     * @notice Core yield data structure
     * @dev Used to store yield information from different protocols
     */
    struct YieldData {
        uint256 apyBps;        // APY in basis points (e.g., 500 = 5.00%)
        uint256 tvl;           // Total Value Locked in the protocol
        uint256 timestamp;     // When this data was last updated
        bytes32 protocol;      // Protocol identifier (e.g., keccak256("AAVE_V3"))
        bool isActive;         // Whether this data is currently valid/active
    }

    /**
     * @notice Request data for cross-chain yield queries
     * @dev Sent from C-Chain to subnet via AWM
     */
    struct YieldRequest {
        address token;         // Token address to get yield data for
        address requester;     // Who initiated the request
        uint256 timestamp;     // When the request was made
        bytes32 requestId;     // Unique identifier for this request
    }

    /**
     * @notice Response data for cross-chain yield queries
     * @dev Sent from subnet back to C-Chain via AWM
     */
    struct YieldResponse {
        bytes32 requestId;     // Matching request ID
        uint256 apyBps;        // APY found on the subnet protocol
        uint256 tvl;           // TVL in the subnet protocol
        bytes32 protocol;      // Subnet protocol identifier
        uint256 timestamp;     // When the response was generated
        bool success;          // Whether the query was successful
        string errorMessage;   // Error message if success = false
    }

    /**
     * @notice Information about a cross-chain request
     * @dev Stored on C-Chain to track request lifecycle
     */
    struct RequestInfo {
        address token;         // Token that was requested
        address requester;     // Who made the request
        uint256 timestamp;     // When the request was initiated
        RequestStatus status;  // Current status of the request
    }

    /**
     * @notice Protocol configuration data
     * @dev Used to store information about different yield protocols
     */
    struct ProtocolInfo {
        string name;           // Human-readable protocol name
        bytes32 identifier;    // Unique protocol identifier
        address contractAddress; // Main contract address (if applicable)
        uint256 riskScore;     // Risk assessment (0-100, lower is safer)
        bool isActive;         // Whether the protocol is currently supported
        uint256 minTVL;        // Minimum TVL threshold for inclusion
    }

    /**
     * @notice Token configuration data
     * @dev Stores metadata about supported tokens
     */
    struct TokenInfo {
        address tokenAddress;  // Token contract address
        string symbol;         // Token symbol (e.g., "USDC")
        string name;          // Full token name
        uint8 decimals;       // Number of decimal places
        bool isSupported;     // Whether token is currently supported
        uint256 minAmount;    // Minimum amount for operations
        uint256 maxAmount;    // Maximum amount for operations
    }

    /**
     * @notice Aggregated yield information for a token
     * @dev Combines data from multiple sources for display
     */
    struct AggregatedYield {
        address token;         // Token address
        YieldData aaveData;    // Yield data from Aave
        YieldData subnetData;  // Yield data from subnet protocol
        uint256 optimizedAPY;  // Calculated optimized APY
        uint256 riskScore;     // Combined risk assessment
        uint256 confidence;    // Confidence level in the data (0-100)
        uint256 lastUpdate;    // When this aggregation was last calculated
    }

    /**
     * @notice Cross-chain message metadata
     * @dev Additional data for AWM messages
     */
    struct MessageMetadata {
        bytes32 messageId;     // Unique message identifier
        bytes32 sourceChain;   // Source chain identifier
        bytes32 destChain;     // Destination chain identifier
        address sender;        // Original message sender
        address receiver;      // Message receiver contract
        uint256 timestamp;     // Message timestamp
        uint256 gasLimit;      // Gas limit for execution
        uint256 gasPrice;      // Gas price for the message
    }

    /**
     * @notice Configuration for yield optimization
     * @dev Parameters used in yield calculation algorithms
     */
    struct OptimizationConfig {
        uint256 aaveWeight;    // Weight for Aave yield (in basis points)
        uint256 subnetWeight;  // Weight for subnet yield (in basis points)
        uint256 riskTolerance; // Risk tolerance level (0-100)
        uint256 minYieldDiff;  // Minimum yield difference to trigger rebalancing
        bool useRiskAdjustment; // Whether to apply risk adjustments
        uint256 maxAPYCap;     // Maximum allowable APY (sanity check)
    }

    /**
     * @notice Historical yield data point
     * @dev For tracking yield changes over time
     */
    struct YieldSnapshot {
        uint256 timestamp;     // When the snapshot was taken
        uint256 aaveAPY;       // Aave APY at this time
        uint256 subnetAPY;     // Subnet APY at this time
        uint256 optimizedAPY;  // Optimized APY at this time
        uint256 totalTVL;      // Combined TVL at this time
    }

    /**
     * @notice Batch operation data
     * @dev For processing multiple tokens in one transaction
     */
    struct BatchOperation {
        address[] tokens;      // Array of token addresses
        bytes[] callData;      // Array of encoded function calls
        uint256[] values;      // Array of ETH values to send (if any)
        uint256 deadline;      // Deadline for batch execution
    }

    // ============ EVENTS STRUCTS ============

    /**
     * @notice Event data for yield updates
     */
    struct YieldUpdateEvent {
        address  token;
        bytes32  protocol;
        uint256 oldAPY;
        uint256 newAPY;
        uint256 timestamp;
    }

    /**
     * @notice Event data for cross-chain requests
     */
    struct CrossChainRequestEvent {
        bytes32  requestId;
        address  token;
        address  requester;
        bytes32 destChain;
        uint256 timestamp;
    }

    /**
     * @notice Event data for protocol status changes
     */
    struct ProtocolStatusEvent {
        bytes32  protocolId;
        bool wasActive;
        bool isActive;
        string reason;
        uint256 timestamp;
    }

    // ============ CONSTANTS ============

    // Protocol identifiers
    bytes32 public constant AAVE_V3_PROTOCOL = keccak256("AAVE_V3");
    bytes32 public constant UNISWAP_V3_PROTOCOL = keccak256("UNISWAP_V3");
    bytes32 public constant COMPOUND_V3_PROTOCOL = keccak256("COMPOUND_V3");
    bytes32 public constant SUBNET_DEX_PROTOCOL = keccak256("SUBNET_DEX");

    // Risk score constants
    uint256 public constant MAX_RISK_SCORE = 100;
    uint256 public constant SAFE_RISK_THRESHOLD = 30;
    uint256 public constant HIGH_RISK_THRESHOLD = 70;

    // APY constants (in basis points)
    uint256 public constant MAX_REASONABLE_APY = 50000; // 500%
    uint256 public constant MIN_APY = 0;
    uint256 public constant BASIS_POINTS_PRECISION = 10000; // 100% = 10000 bps

    // Time constants
    uint256 public constant MIN_DATA_FRESHNESS = 30;    // 30 seconds
    uint256 public constant MAX_DATA_FRESHNESS = 3600;  // 1 hour
    uint256 public constant REQUEST_TIMEOUT = 300;      // 5 minutes

    // Amount constants
    uint256 public constant MIN_TVL_THRESHOLD = 1000e18; // $1000 minimum TVL
    uint256 public constant MAX_BATCH_SIZE = 50;         // Max tokens in batch operation

    // ============ HELPER FUNCTIONS ============

    /**
     * @notice Creates a new YieldData struct with validation
     * @param apyBps APY in basis points
     * @param tvl Total value locked
     * @param protocol Protocol identifier
     * @return yieldData The created YieldData struct
     */
    function createYieldData(
        uint256 apyBps,
        uint256 tvl,
        bytes32 protocol
    ) internal view returns (YieldData memory yieldData) {
        require(apyBps <= MAX_REASONABLE_APY, "APY too high");
        require(tvl >= MIN_TVL_THRESHOLD, "TVL too low");
        require(protocol != bytes32(0), "Invalid protocol");

        return YieldData({
            apyBps: apyBps,
            tvl: tvl,
            timestamp: block.timestamp,
            protocol: protocol,
            isActive: true
        });
    }

    /**
     * @notice Validates a YieldRequest struct
     * @param request The request to validate
     * @return isValid Whether the request is valid
     */
    function isValidRequest(YieldRequest memory request) internal view returns (bool isValid) {
        return (
            request.token != address(0) &&
            request.requester != address(0) &&
            request.requestId != bytes32(0) &&
            request.timestamp <= block.timestamp &&
            request.timestamp > block.timestamp - REQUEST_TIMEOUT
        );
    }

    /**
     * @notice Validates a YieldResponse struct
     * @param response The response to validate
     * @return isValid Whether the response is valid
     */
    function isValidResponse(YieldResponse memory response) internal view returns (bool isValid) {
        return (
            response.requestId != bytes32(0) &&
            response.apyBps <= MAX_REASONABLE_APY &&
            response.protocol != bytes32(0) &&
            response.timestamp <= block.timestamp &&
            response.timestamp > block.timestamp - REQUEST_TIMEOUT
        );
    }

    /**
     * @notice Checks if yield data is fresh
     * @param data The yield data to check
     * @param maxAge Maximum age in seconds
     * @return isFresh Whether the data is fresh enough
     */
    function isDataFresh(YieldData memory data, uint256 maxAge) internal view returns (bool isFresh) {
        return (
            data.isActive &&
            data.timestamp > 0 &&
            block.timestamp - data.timestamp <= maxAge
        );
    }
}