// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/ITeleporterMessenger.sol";
import "./interfaces/ITeleporterReceiver.sol";
import "./interfaces/IERC20.sol";
import "./libraries/MessageEncoding.sol";
import "./libraries/DataTypes.sol";

/**
 * @title YieldHub
 * @dev Main hub contract for cross-chain DeFi yield farming protocol
 * @dev Runs on C-Chain and coordinates yield farming across multiple subnets
 * @dev Receives yield data from subnet scouts and manages user positions
 */
contract YieldHub is ITeleporterReceiver {
    using MessageEncoding for bytes;
    
    // Core protocol components
    ITeleporterMessenger public immutable teleporterMessenger;
    
    // Protocol state
    address public owner;
    mapping(bytes32 => bool) public supportedChains;
    mapping(bytes32 => address) public chainScouts; // chainId => YieldScout address
    mapping(address => bool) public supportedTokens;
    
    // Yield data aggregation
    struct YieldData {
        uint256 apy;
        uint256 tvl;
        string protocolName;
        bytes32 sourceChain;
        uint256 lastUpdate;
        bool isActive;
    }
    
    // token => chainId => YieldData
    mapping(address => mapping(bytes32 => YieldData)) public yieldData;
    
    // User positions and requests
    struct UserPosition {
        address user;
        address token;
        uint256 amount;
        bytes32 targetChain;
        address targetProtocol;
        uint256 timestamp;
        bool isActive;
    }
    
    mapping(bytes32 => UserPosition) public userPositions; // requestId => position
    mapping(address => bytes32[]) public userRequestIds; // user => requestId[]
    mapping(bytes32 => bool) public processedRequests;
    
    // Request tracking
    uint256 private _requestCounter;
    mapping(bytes32 => uint256) public pendingRequests; // requestId => timestamp
    
    // Configuration
    uint256 public constant YIELD_DATA_STALENESS = 600; // 10 minutes
    uint256 public constant REQUEST_TIMEOUT = 1800; // 30 minutes
    uint256 public constant MIN_STAKE_AMOUNT = 1e6; // Minimum 1 USDC worth
    
    // Events
    event ChainAdded(bytes32 indexed chainId, address scout);
    event ChainRemoved(bytes32 indexed chainId);
    event YieldDataReceived(address indexed token, bytes32 indexed chainId, uint256 apy, uint256 tvl);
    event YieldRequestSent(bytes32 indexed requestId, address indexed token, bytes32 indexed chainId);
    event UserStakeInitiated(bytes32 indexed requestId, address indexed user, address token, uint256 amount);
    event UserStakeCompleted(bytes32 indexed requestId, bool success);
    event TokenSupportUpdated(address indexed token, bool supported);
    
    // Errors
    error OnlyOwner();
    error OnlyTeleporter();
    error UnsupportedChain(bytes32 chainId);
    error UnsupportedToken(address token);
    error InvalidAmount(uint256 amount);
    error RequestAlreadyProcessed(bytes32 requestId);
    error StaleYieldData(address token, bytes32 chainId);
    error RequestTimeout(bytes32 requestId);
    error InvalidMessageType(uint8 messageType);
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }
    
    modifier onlyTeleporter() {
        if (msg.sender != address(teleporterMessenger)) revert OnlyTeleporter();
        _;
    }
    
    modifier supportedToken(address token) {
        if (!supportedTokens[token]) revert UnsupportedToken(token);
        _;
    }
    
    modifier supportedChain(bytes32 chainId) {
        if (!supportedChains[chainId]) revert UnsupportedChain(chainId);
        _;
    }
    
    constructor(
        address _teleporterMessenger,
        bytes32[] memory _chainIds,
        address[] memory _scouts,
        address[] memory _supportedTokens
    ) {
        teleporterMessenger = ITeleporterMessenger(_teleporterMessenger);
        owner = msg.sender;
        
        // Initialize supported chains and scouts
        require(_chainIds.length == _scouts.length, "Mismatched arrays");
        for (uint i = 0; i < _chainIds.length; i++) {
            supportedChains[_chainIds[i]] = true;
            chainScouts[_chainIds[i]] = _scouts[i];
            emit ChainAdded(_chainIds[i], _scouts[i]);
        }
        
        // Initialize supported tokens
        for (uint i = 0; i < _supportedTokens.length; i++) {
            supportedTokens[_supportedTokens[i]] = true;
            emit TokenSupportUpdated(_supportedTokens[i], true);
        }
    }
    
    /**
     * @dev Receives cross-chain messages from subnet scouts
     * @param sourceBlockchainID The blockchain ID of the source chain
     * @param originSenderAddress The address that sent the message (should be a YieldScout)
     * @param message The encoded message containing yield or stake response data
     */
    function receiveTeleporterMessage(
        bytes32 sourceBlockchainID,
        address originSenderAddress,
        bytes calldata message
    ) external onlyTeleporter {
        // Verify the sender is an authorized scout
        require(
            chainScouts[sourceBlockchainID] == originSenderAddress,
            "Unauthorized scout"
        );
        
        // Get message type and route accordingly
        uint8 messageType = MessageEncoding.getMessageType(message);
        
        if (messageType == MessageEncoding.YIELD_RESPONSE) {
            _handleYieldResponse(sourceBlockchainID, message);
        } else if (messageType == MessageEncoding.STAKE_RESPONSE) {
            _handleStakeResponse(sourceBlockchainID, message);
        } else {
            revert InvalidMessageType(messageType);
        }
    }
    
    /**
     * @dev Request yield data from a specific chain
     * @param token Token address to get yield data for
     * @param chainId Target chain ID
     * @return requestId Unique identifier for the request
     */
    function requestYieldData(address token, bytes32 chainId) 
        external 
        supportedToken(token) 
        supportedChain(chainId) 
        returns (bytes32 requestId) 
    {
        requestId = _generateRequestId();
        
        // Create yield request message
        MessageEncoding.YieldRequest memory request = MessageEncoding.YieldRequest({
            requestId: requestId,
            token: token,
            responseContract: address(this),
            timestamp: block.timestamp
        });
        
        // Encode and send message
        bytes memory encodedMessage = MessageEncoding.encodeYieldRequest(request);
        
        _sendCrossChainMessage(chainId, chainScouts[chainId], encodedMessage);
        
        // Track pending request
        pendingRequests[requestId] = block.timestamp;
        
        emit YieldRequestSent(requestId, token, chainId);
    }
    
    /**
     * @dev Initiate staking on a target chain
     * @param token Token to stake
     * @param amount Amount to stake
     * @param chainId Target chain ID
     * @param targetProtocol Target protocol address on the subnet
     * @return requestId Unique identifier for the stake request
     */
    function initiateStake(
        address token,
        uint256 amount,
        bytes32 chainId,
        address targetProtocol
    ) 
        external 
        supportedToken(token) 
        supportedChain(chainId) 
        returns (bytes32 requestId) 
    {
        if (amount < MIN_STAKE_AMOUNT) revert InvalidAmount(amount);
        
        // Transfer tokens from user to this contract
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        
        requestId = _generateRequestId();
        
        // Create user position record
        userPositions[requestId] = UserPosition({
            user: msg.sender,
            token: token,
            amount: amount,
            targetChain: chainId,
            targetProtocol: targetProtocol,
            timestamp: block.timestamp,
            isActive: true
        });
        
        userRequestIds[msg.sender].push(requestId);
        
        // Create stake request message
        MessageEncoding.StakeRequest memory request = MessageEncoding.StakeRequest({
            requestId: requestId,
            user: msg.sender,
            token: token,
            amount: amount,
            targetProtocol: targetProtocol,
            timestamp: block.timestamp
        });
        
        // Note: In a real implementation, you'd need to bridge the tokens to the target chain
        // This is simplified for the skeletal implementation
        
        emit UserStakeInitiated(requestId, msg.sender, token, amount);
    }
    
    /**
     * @dev Get the best yield opportunity for a token across all supported chains
     * @param token Token address
     * @return bestChain Chain with highest yield
     * @return bestAPY Highest APY found
     * @return bestProtocol Protocol offering the best yield
     */
    function getBestYield(address token) 
        external 
        view 
        supportedToken(token) 
        returns (bytes32 bestChain, uint256 bestAPY, string memory bestProtocol) 
    {
        uint256 highestAPY = 0;
        
        // Iterate through all supported chains to find best yield
        // Note: In production, you'd maintain a more efficient data structure
        bytes32[] memory chains = _getSupportedChains();
        
        for (uint i = 0; i < chains.length; i++) {
            YieldData memory data = yieldData[token][chains[i]];
            
            if (data.isActive && 
                data.apy > highestAPY && 
                block.timestamp - data.lastUpdate < YIELD_DATA_STALENESS) {
                
                highestAPY = data.apy;
                bestChain = chains[i];
                bestAPY = data.apy;
                bestProtocol = data.protocolName;
            }
        }
    }
    
    /**
     * @dev Handle yield response messages from scouts
     * @param sourceChain Chain that sent the response
     * @param message Encoded yield response message
     */
    function _handleYieldResponse(bytes32 sourceChain, bytes memory message) internal {
        MessageEncoding.YieldResponse memory response = MessageEncoding.decodeYieldResponse(message);
        
        // Verify this is a response to a pending request
        require(pendingRequests[response.requestId] != 0, "Unknown request");
        
        // Update yield data
        yieldData[response.token][sourceChain] = YieldData({
            apy: response.apy,
            tvl: response.tvl,
            protocolName: response.protocolName,
            sourceChain: sourceChain,
            lastUpdate: block.timestamp,
            isActive: true
        });
        
        // Clean up pending request
        delete pendingRequests[response.requestId];
        
        emit YieldDataReceived(response.token, sourceChain, response.apy, response.tvl);
    }
    
    /**
     * @dev Handle stake response messages from scouts
     * @param sourceChain Chain that sent the response
     * @param message Encoded stake response message
     */
    function _handleStakeResponse(bytes32 sourceChain, bytes memory message) internal {
        MessageEncoding.StakeResponse memory response = MessageEncoding.decodeStakeResponse(message);
        
        // Verify position exists
        UserPosition storage position = userPositions[response.requestId];
        require(position.isActive, "Invalid position");
        
        // Update position status
        position.isActive = response.success;
        
        emit UserStakeCompleted(response.requestId, response.success);
    }
    
    /**
     * @dev Send a cross-chain message via Teleporter
     * @param destinationChain Target chain ID
     * @param destinationAddress Target contract address
     * @param message Encoded message payload
     */
    function _sendCrossChainMessage(
        bytes32 destinationChain,
        address destinationAddress,
        bytes memory message
    ) internal {
        teleporterMessenger.sendCrossChainMessage(
            TeleporterMessageInput({
                destinationBlockchainID: destinationChain,
                destinationAddress: destinationAddress,
                feeInfo: TeleporterFeeInfo({
                    feeTokenAddress: address(0),
                    amount: 0
                }),
                requiredGasLimit: 300000,
                allowedRelayerAddresses: new address[](0),
                message: message
            })
        );
    }
    
    /**
     * @dev Generate a unique request ID
     * @return requestId Unique identifier
     */
    function _generateRequestId() internal returns (bytes32 requestId) {
        requestId = keccak256(
            abi.encodePacked(
                block.timestamp,
                block.prevrandao,
                msg.sender,
                _requestCounter++
            )
        );
    }
    
    /**
     * @dev Get array of supported chain IDs (helper function)
     * @return chains Array of supported chain IDs
     */
    function _getSupportedChains() internal view returns (bytes32[] memory chains) {
        // Simplified implementation - in production you'd maintain this list
        // For now, return empty array to avoid compilation issues
        chains = new bytes32[](0);
    }
    
    // Owner functions
    
    /**
     * @dev Add support for a new chain
     * @param chainId Chain ID to add
     * @param scout YieldScout contract address on the chain
     */
    function addChain(bytes32 chainId, address scout) external onlyOwner {
        supportedChains[chainId] = true;
        chainScouts[chainId] = scout;
        emit ChainAdded(chainId, scout);
    }
    
    /**
     * @dev Remove support for a chain
     * @param chainId Chain ID to remove
     */
    function removeChain(bytes32 chainId) external onlyOwner {
        supportedChains[chainId] = false;
        delete chainScouts[chainId];
        emit ChainRemoved(chainId);
    }
    
    /**
     * @dev Update token support
     * @param token Token address
     * @param supported Whether to support the token
     */
    function setTokenSupport(address token, bool supported) external onlyOwner {
        supportedTokens[token] = supported;
        emit TokenSupportUpdated(token, supported);
    }
    
    /**
     * @dev Get user's request IDs
     * @param user User address
     * @return requestIds Array of request IDs for the user
     */
    function getUserRequests(address user) external view returns (bytes32[] memory requestIds) {
        return userRequestIds[user];
    }
    
    /**
     * @dev Check if yield data is fresh for a token on a specific chain
     * @param token Token address
     * @param chainId Chain ID
     * @return isFresh Whether the data is within staleness threshold
     */
    function isYieldDataFresh(address token, bytes32 chainId) external view returns (bool isFresh) {
        YieldData memory data = yieldData[token][chainId];
        return data.lastUpdate > 0 && 
               block.timestamp - data.lastUpdate < YIELD_DATA_STALENESS;
    }
    
    /**
     * @dev Emergency function to transfer ownership
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}