// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ITeleporterMessenger {
    function sendCrossChainMessage(
        bytes32 destinationChainId,
        address destinationAddress,
        bytes calldata message
    ) external payable returns (bytes32 messageId);
}
