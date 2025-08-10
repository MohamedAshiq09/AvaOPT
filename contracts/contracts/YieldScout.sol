// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/IDEXProtocol.sol";
import "./interfaces/ITeleporterMessenger.sol";
import "./interfaces/ITeleporterReceiver.sol";
import "./libraries/DataTypes.sol";
import "./libraries/MessageEncoding.sol";

/**
 * @title YieldScout
 * @dev Subnet contract for SubnetYield Core - handles native protocol integration
 * @dev Receives AWM requests from C-Chain and responds with local yield data
 */
contract YieldScout is ITeleporterReceiver {
    // State Variables
    ITeleporterMessenger public immutable teleporterMessenger;
    IDEXProtocol public immutable localProtocol;
    
    // Security: Only accept messages from authorized C-Chain YieldHub
    bytes32 public immutable AUTHORIZED_SOURCE_CHAIN; // C-Chain blockchain ID
    address public immutable AUTHORIZED_HUB_ADDRESS;  // YieldHub address
    
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
        address[] memory _supportedTokens,
        bytes32 _authorizedSourceChain,  // C-Chain blockchain ID
        address _authorizedHubAddress    // YieldHub contract address
    ) {
        teleporterMessenger = ITeleporterMessenger(_teleporterMessenger);
        localProtocol = IDEXProtocol(_localProtocol);
        owner = msg.sender;
        
        // Set authorized source chain and hub address
        AUTHORIZED_SOURCE_CHAIN = _authorizedSourceChain;
        AUTHORIZED_HUB_ADDRESS = _authorizedHubAddress;
        
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
        // ✅ SECURITY: Validate message source
        require(sourceBlockchainID == AUTHORIZED_SOURCE_CHAIN, "Unauthorized source chain");
        require(originSenderAddress == AUTHORIZED_HUB_ADDRESS, "Unauthorized hub address");
        // Decode the yield request message using MessageEncoding library with error handling
        try this.decodeYieldRequestSafe(message) returns (DataTypes.YieldRequest memory request) {
            // Prevent replay attacks
            if (processedRequests[request.requestId]) {
                revert RequestAlreadyProcessed(request.requestId);
            }
            processedRequests[request.requestId] = true;
            
            // Validate request is from expected sender
            require(request.requester == originSenderAddress, "Invalid request sender");
            
            emit YieldDataRequested(request.requestId, request.token, request.requester);
            
            // Process the yield request
            _processYieldRequest(request.requestId, request.token, sourceBlockchainID, originSenderAddress);
            
        } catch {
            // Handle malformed messages by sending error response
            bytes32 errorRequestId = keccak256(abi.encodePacked(block.timestamp, originSenderAddress));
            _sendErrorResponse(errorRequestId, sourceBlockchainID, originSenderAddress, "Malformed message format");
        }
    }
    
    /**
     * @dev Safe wrapper for decoding yield requests with proper error handling
     * @param message Encoded message to decode
     * @return request Decoded yield request
     */
    function decodeYieldRequestSafe(bytes calldata message) external view returns (DataTypes.YieldRequest memory request) {
        return MessageEncoding.decodeYieldRequest(message);
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
        // Create properly formatted YieldResponse
        DataTypes.YieldResponse memory response = DataTypes.YieldResponse({
            requestId: requestId,
            apyBps: apy,
            tvl: protocolCache[token].tvl,
            protocol: keccak256(abi.encodePacked(protocolCache[token].protocolName)),
            timestamp: block.timestamp,
            success: true,
            errorMessage: ""
        });
        
        // Encode response using MessageEncoding library
        bytes memory responsePayload = MessageEncoding.encodeYieldResponse(response);
        
        // Send via Teleporter with proper error handling
        try teleporterMessenger.sendCrossChainMessage(
            TeleporterMessageInput({
                destinationBlockchainID: destinationChainId,
                destinationAddress: responseContract,
                feeInfo: TeleporterFeeInfo({
                    feeTokenAddress: address(0),
                    amount: 0
                }),
                requiredGasLimit: 500000, // Sufficient for complex operations and response handling
                allowedRelayerAddresses: new address[](0),
                message: responsePayload
            })
        ) returns (bytes32 messageId) {
            emit YieldDataSent(requestId, token, apy);
        } catch {
            // Send error response if main response fails
            _sendErrorResponse(requestId, destinationChainId, responseContract, "Failed to get protocol data");
        }
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
     * @dev Sends error response back to C-Chain when protocol data fails
     * @param requestId Original request ID
     * @param destinationChainId Chain ID to send to
     * @param responseContract Contract to send response to
     * @param errorMessage Error description
     */
    function _sendErrorResponse(
        bytes32 requestId,
        bytes32 destinationChainId,
        address responseContract,
        string memory errorMessage
    ) internal {
        // Create error response
        DataTypes.YieldResponse memory errorResponse = DataTypes.YieldResponse({
            requestId: requestId,
            apyBps: 0,
            tvl: 0,
            protocol: bytes32(0),
            timestamp: block.timestamp,
            success: false,
            errorMessage: errorMessage
        });
        
        // Encode error response
        bytes memory errorPayload = MessageEncoding.encodeYieldResponse(errorResponse);
        
        // Send error response (no try-catch to avoid infinite loops)
        teleporterMessenger.sendCrossChainMessage(
            TeleporterMessageInput({
                destinationBlockchainID: destinationChainId,
                destinationAddress: responseContract,
                feeInfo: TeleporterFeeInfo({
                    feeTokenAddress: address(0),
                    amount: 0
                }),
                requiredGasLimit: 300000, // Sufficient for error response handling
                allowedRelayerAddresses: new address[](0),
                message: errorPayload
            })
        );
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