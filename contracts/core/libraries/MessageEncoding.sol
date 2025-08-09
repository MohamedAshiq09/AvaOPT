// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MessageEncoding
 * @dev Library for encoding and decoding cross-chain messages in the DeFi yield farming protocol
 * @dev Provides standardized message formats for communication between C-Chain and subnets
 */
library MessageEncoding {
    
    // Message Types
    uint8 public constant YIELD_REQUEST = 1;
    uint8 public constant YIELD_RESPONSE = 2;
    uint8 public constant PROTOCOL_UPDATE = 3;
    uint8 public constant STAKE_REQUEST = 4;
    uint8 public constant STAKE_RESPONSE = 5;
    
    // Errors
    error InvalidMessageType(uint8 messageType);
    error InvalidMessageLength(uint256 length);
    error DecodingFailed(bytes data);
    
    /**
     * @dev Structure for yield request messages
     */
    struct YieldRequest {
        bytes32 requestId;
        address token;
        address responseContract;
        uint256 timestamp;
    }
    
    /**
     * @dev Structure for yield response messages
     */
    struct YieldResponse {
        bytes32 requestId;
        address token;
        uint256 apy;
        uint256 tvl;
        string protocolName;
        uint256 timestamp;
    }
    
    /**
     * @dev Structure for protocol update messages
     */
    struct ProtocolUpdate {
        address protocol;
        address[] tokens;
        uint256[] apyValues;
        uint256 timestamp;
    }
    
    /**
     * @dev Structure for stake request messages
     */
    struct StakeRequest {
        bytes32 requestId;
        address user;
        address token;
        uint256 amount;
        address targetProtocol;
        uint256 timestamp;
    }
    
    /**
     * @dev Structure for stake response messages
     */
    struct StakeResponse {
        bytes32 requestId;
        bool success;
        uint256 sharesReceived;
        uint256 timestamp;
        string errorMessage;
    }
    
    /**
     * @dev Encode a yield request message
     * @param request The yield request to encode
     * @return encoded The encoded message bytes
     */
    function encodeYieldRequest(YieldRequest memory request) 
        external 
        pure 
        returns (bytes memory encoded) 
    {
        return abi.encode(
            YIELD_REQUEST,
            request.requestId,
            request.token,
            request.responseContract,
            request.timestamp
        );
    }
    
    /**
     * @dev Decode a yield request message
     * @param data The encoded message bytes
     * @return request The decoded yield request
     */
    function decodeYieldRequest(bytes memory data) 
        external 
        pure 
        returns (YieldRequest memory request) 
    {
        if (data.length == 0) {
            revert InvalidMessageLength(data.length);
        }
        
        try this._decodeYieldRequest(data) returns (YieldRequest memory decoded) {
            return decoded;
        } catch {
            revert DecodingFailed(data);
        }
    }
    
    /**
     * @dev Internal function for yield request decoding
     * @param data The encoded message bytes
     * @return request The decoded yield request
     */
    function _decodeYieldRequest(bytes memory data) 
        external 
        pure 
        returns (YieldRequest memory request) 
    {
        (
            uint8 messageType,
            bytes32 requestId,
            address token,
            address responseContract,
            uint256 timestamp
        ) = abi.decode(data, (uint8, bytes32, address, address, uint256));
        
        if (messageType != YIELD_REQUEST) {
            revert InvalidMessageType(messageType);
        }
        
        request = YieldRequest({
            requestId: requestId,
            token: token,
            responseContract: responseContract,
            timestamp: timestamp
        });
    }
    
    /**
     * @dev Encode a yield response message
     * @param response The yield response to encode
     * @return encoded The encoded message bytes
     */
    function encodeYieldResponse(YieldResponse memory response) 
        external 
        pure 
        returns (bytes memory encoded) 
    {
        return abi.encode(
            YIELD_RESPONSE,
            response.requestId,
            response.token,
            response.apy,
            response.tvl,
            response.protocolName,
            response.timestamp
        );
    }
    
    /**
     * @dev Decode a yield response message
     * @param data The encoded message bytes
     * @return response The decoded yield response
     */
    function decodeYieldResponse(bytes memory data) 
        external 
        pure 
        returns (YieldResponse memory response) 
    {
        if (data.length == 0) {
            revert InvalidMessageLength(data.length);
        }
        
        try this._decodeYieldResponse(data) returns (YieldResponse memory decoded) {
            return decoded;
        } catch {
            revert DecodingFailed(data);
        }
    }
    
    /**
     * @dev Internal function for yield response decoding
     * @param data The encoded message bytes
     * @return response The decoded yield response
     */
    function _decodeYieldResponse(bytes memory data) 
        external 
        pure 
        returns (YieldResponse memory response) 
    {
        (
            uint8 messageType,
            bytes32 requestId,
            address token,
            uint256 apy,
            uint256 tvl,
            string memory protocolName,
            uint256 timestamp
        ) = abi.decode(data, (uint8, bytes32, address, uint256, uint256, string, uint256));
        
        if (messageType != YIELD_RESPONSE) {
            revert InvalidMessageType(messageType);
        }
        
        response = YieldResponse({
            requestId: requestId,
            token: token,
            apy: apy,
            tvl: tvl,
            protocolName: protocolName,
            timestamp: timestamp
        });
    }
    
    /**
     * @dev Encode a protocol update message
     * @param update The protocol update to encode
     * @return encoded The encoded message bytes
     */
    function encodeProtocolUpdate(ProtocolUpdate memory update) 
        external 
        pure 
        returns (bytes memory encoded) 
    {
        return abi.encode(
            PROTOCOL_UPDATE,
            update.protocol,
            update.tokens,
            update.apyValues,
            update.timestamp
        );
    }
    
    /**
     * @dev Decode a protocol update message
     * @param data The encoded message bytes
     * @return update The decoded protocol update
     */
    function decodeProtocolUpdate(bytes memory data) 
        external 
        pure 
        returns (ProtocolUpdate memory update) 
    {
        if (data.length == 0) {
            revert InvalidMessageLength(data.length);
        }
        
        (
            uint8 messageType,
            address protocol,
            address[] memory tokens,
            uint256[] memory apyValues,
            uint256 timestamp
        ) = abi.decode(data, (uint8, address, address[], uint256[], uint256));
        
        if (messageType != PROTOCOL_UPDATE) {
            revert InvalidMessageType(messageType);
        }
        
        update = ProtocolUpdate({
            protocol: protocol,
            tokens: tokens,
            apyValues: apyValues,
            timestamp: timestamp
        });
    }
    
    /**
     * @dev Get message type from encoded data
     * @param data The encoded message bytes
     * @return messageType The message type
     */
    function getMessageType(bytes memory data) 
        external 
        pure 
        returns (uint8 messageType) 
    {
        if (data.length < 32) {
            revert InvalidMessageLength(data.length);
        }
        
        (messageType) = abi.decode(data, (uint8));
    }
    
    /**
     * @dev Encode a stake request message
     * @param request The stake request to encode
     * @return encoded The encoded message bytes
     */
    function encodeStakeRequest(StakeRequest memory request) 
        external 
        pure 
        returns (bytes memory encoded) 
    {
        return abi.encode(
            STAKE_REQUEST,
            request.requestId,
            request.user,
            request.token,
            request.amount,
            request.targetProtocol,
            request.timestamp
        );
    }
    
    /**
     * @dev Decode a stake request message
     * @param data The encoded message bytes
     * @return request The decoded stake request
     */
    function decodeStakeRequest(bytes memory data) 
        external 
        pure 
        returns (StakeRequest memory request) 
    {
        if (data.length == 0) {
            revert InvalidMessageLength(data.length);
        }
        
        (
            uint8 messageType,
            bytes32 requestId,
            address user,
            address token,
            uint256 amount,
            address targetProtocol,
            uint256 timestamp
        ) = abi.decode(data, (uint8, bytes32, address, address, uint256, address, uint256));
        
        if (messageType != STAKE_REQUEST) {
            revert InvalidMessageType(messageType);
        }
        
        request = StakeRequest({
            requestId: requestId,
            user: user,
            token: token,
            amount: amount,
            targetProtocol: targetProtocol,
            timestamp: timestamp
        });
    }
    
    /**
     * @dev Encode a stake response message
     * @param response The stake response to encode
     * @return encoded The encoded message bytes
     */
    function encodeStakeResponse(StakeResponse memory response) 
        external 
        pure 
        returns (bytes memory encoded) 
    {
        return abi.encode(
            STAKE_RESPONSE,
            response.requestId,
            response.success,
            response.sharesReceived,
            response.timestamp,
            response.errorMessage
        );
    }
    
    /**
     * @dev Decode a stake response message
     * @param data The encoded message bytes
     * @return response The decoded stake response
     */
    function decodeStakeResponse(bytes memory data) 
        external 
        pure 
        returns (StakeResponse memory response) 
    {
        if (data.length == 0) {
            revert InvalidMessageLength(data.length);
        }
        
        (
            uint8 messageType,
            bytes32 requestId,
            bool success,
            uint256 sharesReceived,
            uint256 timestamp,
            string memory errorMessage
        ) = abi.decode(data, (uint8, bytes32, bool, uint256, uint256, string));
        
        if (messageType != STAKE_RESPONSE) {
            revert InvalidMessageType(messageType);
        }
        
        response = StakeResponse({
            requestId: requestId,
            success: success,
            sharesReceived: sharesReceived,
            timestamp: timestamp,
            errorMessage: errorMessage
        });
    }
    
    /**
     * @dev Validate message format
     * @param data The encoded message bytes
     * @return isValid Whether the message format is valid
     */
    function validateMessage(bytes memory data) 
        external 
        pure 
        returns (bool isValid) 
    {
        if (data.length == 0) {
            return false;
        }
        
        try this.getMessageType(data) returns (uint8 messageType) {
            return messageType >= YIELD_REQUEST && messageType <= STAKE_RESPONSE;
        } catch {
            return false;
        }
    }
}