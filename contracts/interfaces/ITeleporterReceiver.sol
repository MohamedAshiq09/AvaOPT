// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ITeleporterReceiver {
    function receiveTeleporterMessage(
        bytes32 sourceChainId,
        address originSenderAddress,
        bytes calldata message
    ) external;
}
