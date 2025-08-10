// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @dev Interface for contracts that receive Teleporter messages
 * @dev Must be implemented by contracts that want to receive cross-chain messages
 */
interface ITeleporterReceiver {
    /**
     * @dev Receive a Teleporter message
     * @param sourceBlockchainID The blockchain ID of the source chain
     * @param originSenderAddress The address that sent the message on the source chain
     * @param message The message payload
     */
    function receiveTeleporterMessage(
        bytes32 sourceBlockchainID,
        address originSenderAddress,
        bytes calldata message
    ) external;
}