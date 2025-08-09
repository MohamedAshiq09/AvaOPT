// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/IERC20.sol";
import "./interfaces/IDEXProtocol.sol";
import "./interfaces/ITeleporterMessenger.sol";
import "./interfaces/ITeleporterReceiver.sol";

/**
 * @title YieldScout
 * @dev Subnet contract for SubnetYield Core - handles native protocol integration
 * @dev Receives AWM requests from C-Chain and responds with local yield data
 */
contract YieldScout is ITeleporterReceiver {
    // State Variables
    ITeleporterMessenger public immutable teleporterMessenger;
    IDEXProtocol public immutable localProtocol;
    
    // Supported tokens and their yield data
    mapping(address => uint256) public localAPY;
    mapping(address => uint256) public lastUpdated;
    mapping(address => bool) public supportedTokens;
    mapping(bytes32 => bool) public processedRequests;
    
    // Protocol data caching
    struct ProtocolData {
        uint256 apy;
        uint256 tvl;
        uint256 timestamp;
        string protocolName;
    }
    
    mapping(address => ProtocolData) public protocolCache;
    
    // Configuration
    address public owner;
    uint256 public constant DATA_FRESHNESS_THRESHOLD = 300; // 5 minutes
    uint256 public constant MAX_APY = 10000; // 100% in basis points
    
    // Events
    event YieldDataRequested(bytes32 indexed requestId, address indexed token, address requester);
    event YieldDataSent(bytes32 indexed requestId, address indexed token, uint256 apy);
    event ProtocolDataUpdated(address indexed token, uint256 apy, uint256 tvl);
    event TokenSupportUpdated(address indexed token, bool supported);
    
    // Errors
    error UnauthorizedTeleporterMessage();
    error UnsupportedToken(address token);
    error StaleData(address token);
    error InvalidAPY(uint256 apy);
    error RequestAlreadyProcessed(bytes32 requestId);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyTeleporter() {
        require(msg.sender == address(teleporterMessenger), "Not teleporter");
        _;
    }
    
    constructor(
        address _teleporterMessenger,
        address _localProtocol,
        address[] memory _supportedTokens
    ) {
        teleporterMessenger = ITeleporterMessenger(_teleporterMessenger);
        localProtocol = IDEXProtocol(_localProtocol);
        owner = msg.sender;
        
        // Initialize supported tokens
        for (uint i = 0; i < _supportedTokens.length; i++) {
            supportedTokens[_supportedTokens[i]] = true;
            emit TokenSupportUpdated(_supportedTokens[i], true);
        }
    }
    
    /**
     * @dev Receives and processes yield data requests from C-Chain via AWM
     * @param sourceBlockchainID The blockchain ID of the source chain
     * @param originSenderAddress The address that sent the message on the source chain
     * @param message The encoded message containing the yield request
     */
    function receiveTeleporterMessage(
        bytes32 sourceBlockchainID,
        address originSenderAddress,
        bytes calldata message
    ) external onlyTeleporter {
        // Decode the yield request message
        (bytes32 requestId, address token, address responseContract) = abi.decode(
            message,
            (bytes32, address, address)
        );
        
        // Prevent replay attacks
        if (processedRequests[requestId]) {
            revert RequestAlreadyProcessed(requestId);
        }
        processedRequests[requestId] = true;
        
        emit YieldDataRequested(requestId, token, originSenderAddress);
        
        // Process the yield request
        _processYieldRequest(requestId, token, sourceBlockchainID, responseContract);
    }
    
    /**
     * @dev Internal function to process yield requests
     * @param requestId Unique identifier for the request
     * @param token Token address to get yield data for
     * @param sourceChainId Chain ID to send response back to
     * @param responseContract Contract address to send response to
     */
    function _processYieldRequest(
        bytes32 requestId,
        address token,
        bytes32 sourceChainId,
        address responseContract
    ) internal {
        // Check if token is supported
        if (!supportedTokens[token]) {
            revert UnsupportedToken(token);
        }
        
        // Get fresh yield data
        uint256 currentAPY = _getLocalAPY(token);
        
        // Update cache
        protocolCache[token] = ProtocolData({
            apy: currentAPY,
            tvl: _getProtocolTVL(token),
            timestamp: block.timestamp,
            protocolName: "SubnetDEX"
        });
        
        // Send response back to C-Chain
        _sendResponse(requestId, token, currentAPY, sourceChainId, responseContract);
    }
    
    /**
     * @dev Gets current APY from local protocol
     * @param token Token address to get APY for
     * @return apy Current APY in basis points
     */
    function _getLocalAPY(address token) internal view returns (uint256 apy) {
        try localProtocol.getAPY(token) returns (uint256 protocolAPY) {
            // Validate APY is reasonable
            if (protocolAPY > MAX_APY) {
                revert InvalidAPY(protocolAPY);
            }
            return protocolAPY;
        } catch {
            // Fallback to cached data if available and fresh
            ProtocolData memory cached = protocolCache[token];
            if (cached.timestamp > 0 && 
                block.timestamp - cached.timestamp < DATA_FRESHNESS_THRESHOLD) {
                return cached.apy;
            }
            
            // Return 0 if no data available
            return 0;
        }
    }
    
    /**
     * @dev Gets protocol TVL for a token
     * @param token Token address
     * @return tvl Total value locked
     */
    function _getProtocolTVL(address token) internal view returns (uint256 tvl) {
        try localProtocol.getTVL(token) returns (uint256 protocolTVL) {
            return protocolTVL;
        } catch {
            return 0;
        }
    }
    
    /**
     * @dev Sends yield data response back to C-Chain
     * @param requestId Original request ID
     * @param token Token address
     * @param apy Current APY
     * @param destinationChainId Chain ID to send to
     * @param responseContract Contract to send response to
     */
    function _sendResponse(
        bytes32 requestId,
        address token,
        uint256 apy,
        bytes32 destinationChainId,
        address responseContract
    ) internal {
        // Encode response payload
        bytes memory responsePayload = abi.encode(
            requestId,
            token,
            apy,
            protocolCache[token].tvl,
            protocolCache[token].protocolName,
            block.timestamp
        );
        
        // Send via Teleporter
        teleporterMessenger.sendCrossChainMessage(
            TeleporterMessageInput({
                destinationBlockchainID: destinationChainId,
                destinationAddress: responseContract,
                feeInfo: TeleporterFeeInfo({
                    feeTokenAddress: address(0),
                    amount: 0
                }),
                requiredGasLimit: 200000,
                allowedRelayerAddresses: new address[](0),
                message: responsePayload
            })
        );
        
        emit YieldDataSent(requestId, token, apy);
    }
    
    /**
     * @dev Manual function to update protocol data (for testing/maintenance)
     * @param token Token address
     */
    function updateProtocolData(address token) external {
        if (!supportedTokens[token]) {
            revert UnsupportedToken(token);
        }
        
        uint256 currentAPY = _getLocalAPY(token);
        uint256 currentTVL = _getProtocolTVL(token);
        
        protocolCache[token] = ProtocolData({
            apy: currentAPY,
            tvl: currentTVL,
            timestamp: block.timestamp,
            protocolName: "SubnetDEX"
        });
        
        localAPY[token] = currentAPY;
        lastUpdated[token] = block.timestamp;
        
        emit ProtocolDataUpdated(token, currentAPY, currentTVL);
    }
    
    /**
     * @dev Add or remove token support
     * @param token Token address
     * @param supported Whether token should be supported
     */
    function setTokenSupport(address token, bool supported) external onlyOwner {
        supportedTokens[token] = supported;
        emit TokenSupportUpdated(token, supported);
    }
    
    /**
     * @dev Get cached protocol data for a token
     * @param token Token address
     * @return data Cached protocol data
     */
    function getProtocolData(address token) external view returns (ProtocolData memory data) {
        return protocolCache[token];
    }
    
    /**
     * @dev Check if data is fresh for a token
     * @param token Token address
     * @return fresh Whether data is within freshness threshold
     */
    function isDataFresh(address token) external view returns (bool fresh) {
        return block.timestamp - protocolCache[token].timestamp < DATA_FRESHNESS_THRESHOLD;
    }
    
    /**
     * @dev Get current local APY (public view function)
     * @param token Token address
     * @return apy Current APY in basis points
     */
    function getLocalProtocolAPY(address token) external view returns (uint256 apy) {
        return _getLocalAPY(token);
    }
    
    /**
     * @dev Emergency function to update owner
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}