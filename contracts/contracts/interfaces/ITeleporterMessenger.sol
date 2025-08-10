// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @dev Teleporter fee information
 */
struct TeleporterFeeInfo {
    address feeTokenAddress;
    uint256 amount;
}

/**
 * @dev Teleporter message input structure
 */
struct TeleporterMessageInput {
    bytes32 destinationBlockchainID;
    address destinationAddress;
    TeleporterFeeInfo feeInfo;
    uint256 requiredGasLimit;
    address[] allowedRelayerAddresses;
    bytes message;
}

/**
 * @dev Interface for Avalanche Teleporter Messenger
 * @dev Used for cross-subnet communication via AWM
 */
interface ITeleporterMessenger {
    /**
     * @dev Send a cross-chain message (compatibility with different versions)
     * @param destinationBlockchainID Target blockchain ID
     * @param destinationAddress Target contract address
     * @param message Encoded message payload
     * @return messageID Unique identifier for the sent message
     */
    function sendCrossChainMessage(
        bytes32 destinationBlockchainID,
        address destinationAddress,
        bytes calldata message
    ) external payable returns (bytes32 messageID);
    
    /**
     * @dev Send a cross-chain message with full parameters
     * @param messageInput Message input parameters
     * @return messageID Unique identifier for the sent message
     */
    function sendCrossChainMessage(
        TeleporterMessageInput calldata messageInput
    ) external payable returns (bytes32 messageID);
    
    /**
     * @dev Get the current message ID
     * @return messageID Current message ID
     */
    function getNextMessageID(bytes32 destinationBlockchainID) external view returns (uint256 messageID);
    
    /**
     * @dev Check if a message has been received
     * @param sourceBlockchainID Source blockchain ID
     * @param messageID Message ID to check
     * @return received Whether message has been received
     */
    function messageReceived(
        bytes32 sourceBlockchainID,
        uint256 messageID
    ) external view returns (bool received);
}