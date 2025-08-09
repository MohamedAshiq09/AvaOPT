// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DataTypes.sol";

/**
 * @title MessageEncoding
 * @notice Handles encoding and decoding of messages for Avalanche Warp Messaging (AWM)
 * @dev Provides secure serialization for cross-chain communication
 */
library MessageEncoding {
    
    // ============ CONSTANTS ============
    
    // Message type identifiers
    bytes32 private constant YIELD_REQUEST_TYPE = keccak256("YIELD_REQUEST_V1");
    bytes32 private constant YIELD_RESPONSE_TYPE = keccak256("YIELD_RESPONSE_V1");
    bytes32 private constant BATCH_REQUEST_TYPE = keccak256("BATCH_REQUEST_V1");
    bytes32 private constant PROTOCOL_UPDATE_TYPE = keccak256("PROTOCOL_UPDATE_V1");
    
    // Version identifiers
    uint256 private constant CURRENT_VERSION = 1;
    uint256 private constant MIN_SUPPORTED_VERSION = 1;
    uint256 private constant MAX_SUPPORTED_VERSION = 1;

    // Message size limits
    uint256 private constant MAX_MESSAGE_SIZE = 32 * 1024; // 32KB
    uint256 private constant MIN_MESSAGE_SIZE = 64; // Minimum viable message
    
    // ============ ERRORS ============
    
    error InvalidMessageType();
    error UnsupportedVersion();
    error MessageTooLarge();
    error MessageTooSmall();
    error InvalidMessageFormat();
    error DecodingError();
    error EncodingError();

    // ============ STRUCTS ============

    /**
     * @notice Message header for all AWM messages
     */
    struct MessageHeader {
        bytes32 messageType;   // Type of message
        uint256 version;       // Protocol version
        uint256 timestamp;     // Message creation timestamp
        bytes32 sender;        // Sender identifier
        bytes32 nonce;         // Unique message nonce
    }

    /**
     * @notice Complete message structure
     */
    struct Message {
        MessageHeader header;  // Message metadata
        bytes payload;         // Encoded message data
        bytes32 checksum;      // Message integrity check
    }

    // ============ ENCODING FUNCTIONS ============

    /**
     * @notice Encodes a YieldRequest for cross-chain transmission
     * @param request The yield request to encode
     * @return encodedMessage The encoded message bytes
     */
    function encodeYieldRequest(DataTypes.YieldRequest memory request) 
        internal 
        view 
        returns (bytes memory encodedMessage) 
    {
        // Validate input
        require(DataTypes.isValidRequest(request), "Invalid request");
        
        // Create message header
        MessageHeader memory header = MessageHeader({
            messageType: YIELD_REQUEST_TYPE,
            version: CURRENT_VERSION,
            timestamp: block.timestamp,
            sender: bytes32(uint256(uint160(request.requester))),
            nonce: request.requestId
        });
        
        // Encode the payload
        bytes memory payload = abi.encode(
            request.token,
            request.requester,
            request.timestamp,
            request.requestId
        );
        
        // Create complete message
        Message memory message = Message({
            header: header,
            payload: payload,
            checksum: _calculateChecksum(header, payload)
        });
        
        // Encode the complete message
        encodedMessage = abi.encode(message);
        
        // Validate size
        if (encodedMessage.length > MAX_MESSAGE_SIZE) revert MessageTooLarge();
        if (encodedMessage.length < MIN_MESSAGE_SIZE) revert MessageTooSmall();
        
        return encodedMessage;
    }

    /**
     * @notice Encodes a YieldResponse for cross-chain transmission
     * @param response The yield response to encode
     * @return encodedMessage The encoded message bytes
     */
    function encodeYieldResponse(DataTypes.YieldResponse memory response) 
        internal 
        view 
        returns (bytes memory encodedMessage) 
    {
        // Validate input
        require(DataTypes.isValidResponse(response), "Invalid response");
        
        // Create message header
        MessageHeader memory header = MessageHeader({
            messageType: YIELD_RESPONSE_TYPE,
            version: CURRENT_VERSION,
            timestamp: block.timestamp,
            sender: bytes32(0), // Will be set by sender
            nonce: response.requestId
        });
        
        // Encode the payload
        bytes memory payload = abi.encode(
            response.requestId,
            response.apyBps,
            response.tvl,
            response.protocol,
            response.timestamp,
            response.success,
            response.errorMessage
        );
        
        // Create complete message
        Message memory message = Message({
            header: header,
            payload: payload,
            checksum: _calculateChecksum(header, payload)
        });
        
        // Encode the complete message
        encodedMessage = abi.encode(message);
        
        // Validate size
        if (encodedMessage.length > MAX_MESSAGE_SIZE) revert MessageTooLarge();
        if (encodedMessage.length < MIN_MESSAGE_SIZE) revert MessageTooSmall();
        
        return encodedMessage;
    }

    /**
     * @notice Encodes a batch request for multiple tokens
     * @param tokens Array of token addresses
     * @param requester Address making the request
     * @param batchId Unique batch identifier
     * @return encodedMessage The encoded message bytes
     */
    function encodeBatchRequest(
        address[] memory tokens,
        address requester,
        bytes32 batchId
    ) internal view returns (bytes memory encodedMessage) {
        require(tokens.length > 0, "Empty token array");
        require(tokens.length <= DataTypes.MAX_BATCH_SIZE, "Batch too large");
        require(requester != address(0), "Invalid requester");
        require(batchId != bytes32(0), "Invalid batch ID");
        
        // Create message header
        MessageHeader memory header = MessageHeader({
            messageType: BATCH_REQUEST_TYPE,
            version: CURRENT_VERSION,
            timestamp: block.timestamp,
            sender: bytes32(uint256(uint160(requester))),
            nonce: batchId
        });
        
        // Encode the payload
        bytes memory payload = abi.encode(
            tokens,
            requester,
            block.timestamp,
            batchId
        );
        
        // Create complete message
        Message memory message = Message({
            header: header,
            payload: payload,
            checksum: _calculateChecksum(header, payload)
        });
        
        // Encode the complete message
        encodedMessage = abi.encode(message);
        
        // Validate size
        if (encodedMessage.length > MAX_MESSAGE_SIZE) revert MessageTooLarge();
        
        return encodedMessage;
    }

    // ============ DECODING FUNCTIONS ============

    /**
     * @notice Decodes a YieldRequest from message bytes
     * @param encodedMessage The encoded message to decode
     * @return request The decoded yield request
     */
    function decodeYieldRequest(bytes memory encodedMessage) 
        internal 
        pure 
        returns (DataTypes.YieldRequest memory request) 
    {
        // Validate input
        if (encodedMessage.length == 0) revert InvalidMessageFormat();
        
        try {
            // Decode the message
            Message memory message = abi.decode(encodedMessage, (Message));
            
            // Validate message type and version
            _validateMessageHeader(message.header, YIELD_REQUEST_TYPE);
            
            // Verify checksum
            if (!_verifyChecksum(message.header, message.payload, message.checksum)) {
                revert InvalidMessageFormat();
            }
            
            // Decode the payload
            (
                address token,
                address requester,
                uint256 timestamp,
                bytes32 requestId
            ) = abi.decode(message.payload, (address, address, uint256, bytes32));
            
            // Create and validate the request
            request = DataTypes.YieldRequest({
                token: token,
                requester: requester,
                timestamp: timestamp,
                requestId: requestId
            });
            
            // Additional validation
            if (!DataTypes.isValidRequest(request)) {
                revert InvalidMessageFormat();
            }
            
        } catch {
            revert DecodingError();
        }
        
        return request;
    }

    /**
     * @notice Decodes a YieldResponse from message bytes
     * @param encodedMessage The encoded message to decode
     * @return response The decoded yield response
     */
    function decodeYieldResponse(bytes memory encodedMessage) 
        internal 
        pure 
        returns (DataTypes.YieldResponse memory response) 
    {
        // Validate input
        if (encodedMessage.length == 0) revert InvalidMessageFormat();
        
        try {
            // Decode the message
            Message memory message = abi.decode(encodedMessage, (Message));
            
            // Validate message type and version
            _validateMessageHeader(message.header, YIELD_RESPONSE_TYPE);
            
            // Verify checksum
            if (!_verifyChecksum(message.header, message.payload, message.checksum)) {
                revert InvalidMessageFormat();
            }
            
            // Decode the payload
            (
                bytes32 requestId,
                uint256 apyBps,
                uint256 tvl,
                bytes32 protocol,
                uint256 timestamp,
                bool success,
                string memory errorMessage
            ) = abi.decode(message.payload, (bytes32, uint256, uint256, bytes32, uint256, bool, string));
            
            // Create the response
            response = DataTypes.YieldResponse({
                requestId: requestId,
                apyBps: apyBps,
                tvl: tvl,
                protocol: protocol,
                timestamp: timestamp,
                success: success,
                errorMessage: errorMessage
            });
            
            // Additional validation
            if (!DataTypes.isValidResponse(response)) {
                revert InvalidMessageFormat();
            }
            
        } catch {
            revert DecodingError();
        }
        
        return response;
    }

    /**
     * @notice Decodes a batch request from message bytes
     * @param encodedMessage The encoded message to decode
     * @return tokens Array of token addresses
     * @return requester Address that made the request
     * @return batchId Unique batch identifier
     * @return timestamp When the request was made
     */
    function decodeBatchRequest(bytes memory encodedMessage) 
        internal 
        pure 
        returns (
            address[] memory tokens,
            address requester,
            bytes32 batchId,
            uint256 timestamp
        ) 
    {
        // Validate input
        if (encodedMessage.length == 0) revert InvalidMessageFormat();
        
        try {
            // Decode the message
            Message memory message = abi.decode(encodedMessage, (Message));
            
            // Validate message type and version
            _validateMessageHeader(message.header, BATCH_REQUEST_TYPE);
            
            // Verify checksum
            if (!_verifyChecksum(message.header, message.payload, message.checksum)) {
                revert InvalidMessageFormat();
            }
            
            // Decode the payload
            (tokens, requester, timestamp, batchId) = abi.decode(
                message.payload, 
                (address[], address, uint256, bytes32)
            );
            
            // Validate decoded data
            require(tokens.length > 0 && tokens.length <= DataTypes.MAX_BATCH_SIZE, "Invalid batch size");
            require(requester != address(0), "Invalid requester");
            require(batchId != bytes32(0), "Invalid batch ID");
            
        } catch {
            revert DecodingError();
        }
    }

    // ============ UTILITY FUNCTIONS ============

    /**
     * @notice Gets the message type from encoded message
     * @param encodedMessage The encoded message
     * @return messageType The type of the message
     */
    function getMessageType(bytes memory encodedMessage) 
        internal 
        pure 
        returns (bytes32 messageType) 
    {
        if (encodedMessage.length < MIN_MESSAGE_SIZE) {
            return bytes32(0);
        }
        
        try {
            Message memory message = abi.decode(encodedMessage, (Message));
            return message.header.messageType;
        } catch {
            return bytes32(0);
        }
    }

    /**
     * @notice Gets the message version from encoded message
     * @param encodedMessage The encoded message
     * @return version The version of the message
     */
    function getMessageVersion(bytes memory encodedMessage) 
        internal 
        pure 
        returns (uint256 version) 
    {
        if (encodedMessage.length < MIN_MESSAGE_SIZE) {
            return 0;
        }
        
        try {
            Message memory message = abi.decode(encodedMessage, (Message));
            return message.header.version;
        } catch {
            return 0;
        }
    }

    /**
     * @notice Checks if a message format is supported
     * @param encodedMessage The encoded message to check
     * @return isSupported Whether the message format is supported
     */
    function isMessageSupported(bytes memory encodedMessage) 
        internal 
        pure 
        returns (bool isSupported) 
    {
        bytes32 msgType = getMessageType(encodedMessage);
        uint256 version = getMessageVersion(encodedMessage);
        
        bool validType = (
            msgType == YIELD_REQUEST_TYPE ||
            msgType == YIELD_RESPONSE_TYPE ||
            msgType == BATCH_REQUEST_TYPE ||
            msgType == PROTOCOL_UPDATE_TYPE
        );
        
        bool validVersion = (
            version >= MIN_SUPPORTED_VERSION &&
            version <= MAX_SUPPORTED_VERSION
        );
        
        return validType && validVersion;
    }

    // ============ INTERNAL HELPER FUNCTIONS ============

    /**
     * @notice Calculates checksum for message integrity
     * @param header Message header
     * @param payload Message payload
     * @return checksum The calculated checksum
     */
    function _calculateChecksum(
        MessageHeader memory header,
        bytes memory payload
    ) private pure returns (bytes32 checksum) {
        return keccak256(abi.encode(header, payload));
    }

    /**
     * @notice Verifies message checksum
     * @param header Message header
     * @param payload Message payload
     * @param checksum Expected checksum
     * @return isValid Whether the checksum is valid
     */
    function _verifyChecksum(
        MessageHeader memory header,
        bytes memory payload,
        bytes32 checksum
    ) private pure returns (bool isValid) {
        return _calculateChecksum(header, payload) == checksum;
    }

    /**
     * @notice Validates message header
     * @param header The header to validate
     * @param expectedType Expected message type
     */
    function _validateMessageHeader(
        MessageHeader memory header,
        bytes32 expectedType
    ) private pure {
        if (header.messageType != expectedType) revert InvalidMessageType();
        if (header.version < MIN_SUPPORTED_VERSION || header.version > MAX_SUPPORTED_VERSION) {
            revert UnsupportedVersion();
        }
        if (header.timestamp == 0) revert InvalidMessageFormat();
    }
}