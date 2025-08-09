# Sending a Message

URL: /academy/interchain-messaging/04-icm-basics/03-sending-a-message

Learn to send messages with Avalanche Interchain Messaging.
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

Sending a message is nothing more than a simple contract call to the Interchain Messaging messenger contract.

<img src="/common-images/teleporter/teleporter-source.png" width="400" class="mx-auto" />

The dApp on the Source L1 has to call the `sendCrossChainMessage` function of the Interchain Messaging contract. The Interchain Messaging contract implements the `ITeleporterMessenger` interface below. Note that the dApp itself does not have to implement the interface.

```solidity title="/lib/icm-contracts/contracts/teleporter/ITeleporterMessenger.sol"
pragma solidity 0.8.18;

struct TeleporterMessageInput {
    bytes32 destinationBlockchainID;
    address destinationAddress;
    TeleporterFeeInfo feeInfo;
    uint256 requiredGasLimit;
    address[] allowedRelayerAddresses;
    bytes message;
}

struct TeleporterFeeInfo {
    address feeTokenAddress;
    uint256 amount;
}

/**
 * @dev Interface that describes functionalities for a cross chain messenger.
 */
interface ITeleporterMessenger {
    /**
     * @dev Emitted when sending a interchain message cross chain.
     */
 	event SendCrossChainMessage(
        uint256 indexed messageID,
        bytes32 indexed destinationBlockchainID,
        TeleporterMessage message,
        TeleporterFeeInfo feeInfo
    );

    /**
     * @dev Called by transactions to initiate the sending of a cross L1 message.
     */
	function sendCrossChainMessage(TeleporterMessageInput calldata messageInput)
        external
        returns (uint256);

}
```

The `sendCrossChainMessage` function takes `TeleporterMessageInput` struct as an input. In that multiple values are contained: This data will then be included in the payload of the Warp message:

- **`destinationChainID`:** The blockchainID in hex where the contract that should receive the message is deployed. This is not the EVM chain ID you may know from adding a network to a wallet, but the blockchain ID on the P-Chain. The P-Chain uses the transaction ID of the transaction that created those blockchain on the P-Chain for the chain ID, e.g.: 0xd7cdc6f08b167595d1577e24838113a88b1005b471a6c430d79c48b4c89cfc53
- **`destinationAddress`:** The address of the contract that should receive the message
- **`feeInfo`:** A struct consisting of a contract address of an ERC20 which the fee is paid in as well as the amount of tokens to be paid as an incentive for the relayer. We will look at this later in more detail.
- **`requiredGasLimit`:** The amount of gas the delivery of the message requires. If the relayer provides the required gas, the message will be considered delivered whether or not its execution succeeds, such that the relayer can claim their fee reward.
- **`allowedRelayerAddresses`:** An array of addresses of allowed relayers. An empty allowed relayers list means anyone is allowed to deliver the message. We will look at this later in more detail.
- **`message`:** The message to be sent as bytes. The message can contain multiple encoded values. DApps using Interchain Messaging are responsible for defining the exact format of this payload in a way that can be decoded on the receiving end. The message can hold multiple values that be encoded in a single bytes object. For example, applications may encode multiple method parameters on the sending side, then decode this data in the contract implementing the receiveTeleporterMessage function and call another contract with the parameters from there.

<Quiz quizId="304" />

# Sender Contract

URL: /academy/interchain-messaging/04-icm-basics/04-create-sender-contract

Create a contract to send messages with Teleporter.

import { Step, Steps } from 'fumadocs-ui/components/steps';

Lets start by deploying our sender contract on C-Chain. It will be responsible for calling the the TeleporterMessenger contract, encoding our message and sending it to the destination chain.

<Steps>
  <Step>
    ### Read the Sender Contract

    The following contract is located inside `contracts/interchain-messaging/send-receive` directory. Read through the contract below and and understand what is happening:

    ```solidity title="contracts/interchain-messaging/send-receive/senderOnCChain.sol"
    // (c) 2023, Ava Labs, Inc. All rights reserved.
    // See the file LICENSE for licensing terms.

    // SPDX-License-Identifier: Ecosystem

    pragma solidity ^0.8.18;

    import "@teleporter/ITeleporterMessenger.sol"; // [!code highlight]

    contract SenderOnCChain {
        ITeleporterMessenger public immutable messenger = ITeleporterMessenger(0x253b2784c75e510dD0fF1da844684a1aC0aa5fcf); // [!code highlight]

        /**
         * @dev Sends a message to another chain.
         */
        function sendMessage(address destinationAddress, string calldata message) external {
            messenger.sendCrossChainMessage( // [!code highlight]
                TeleporterMessageInput({
                    // BlockchainID of Dispatch L1
                    destinationBlockchainID: 0x9f3be606497285d0ffbb5ac9ba24aa60346a9b1812479ed66cb329f394a4b1c7, // [!code highlight]
                    destinationAddress: destinationAddress,
                    feeInfo: TeleporterFeeInfo({feeTokenAddress: address(0), amount: 0}),
                    requiredGasLimit: 100000,
                    allowedRelayerAddresses: new address[](0),
                    message: abi.encode(message)
                })
            );
        }
    }
    ```

    The key things to understand:

    * **Importing ITeleporterMessenger (Line 8):** We are importing the `ITeleporterMessenger` Interface we looked at in the previous activity.
    * **Defining teleporterMessenger contract (Line 12):** We are defining a `teleporterMessenger` contract using the imported interface. It is important to note, that our cross-chain dApp is not implementing the interface itself, but initializes a contract using that interface.
    * **Sending the message (Line 21):** We are sending the message by calling the function of our `teleporterMessenger`. As an input we are defining a `TeleporterMessageInput`. The `destinationChainId` should be set to the Dispatch test L1's blockchain ID. We will need to provide the address of the receiving contract on the Dispatch test L1 as a parameter to the function, since we have not deployed it yet and don't know the address at this time.
    * **No fees (Line 25):** In this exercise we are not providing any fees to the relayer for relaying the message. This is only possible since the relayer we are running here is configured to pick up any message even if it does not provide any rewards.
    * **Encoding the Message (Line 31):** The `TeleporterMessageInput` defines a message as an array of bytes. For now we will just simply encode the string with `abi.encode()`. In the future activities, you will see how we can encode multiple values of any type in that message.
    * **Hardcoded destinationBlockchainId:** For this course, we are using Dispatch, but normally you will have to replace the `destinationBlockchainID` with whatever chain you want to send a message to.

  </Step>

  <Step>
    ### Deploy Sender Contract

    To deploy a contract using Foundry use the following command:

    ```bash
    forge create --rpc-url fuji-c --private-key $PK contracts/interchain-messaging/send-receive/senderOnCChain.sol:SenderOnCChain --broadcast
    ```

    ```
    [⠊] Compiling...
    [⠒] Compiling 2 files with Solc 0.8.18
    [⠢] Solc 0.8.18 finished in 81.53ms
    Compiler run successful!
    Deployer: 0x8db97C7cEcE249c2b98bDC0226Cc4C2A57BF52FC // [$FUNDED_ADDRESS]
    Deployed to: 0x5DB9A7629912EBF95876228C24A848de0bfB43A9 // [$SENDER_ADDRESS]
    Transaction hash: 0xcde7873e9e3c68fb00a2ad6644dceb64a01a41941da46de5a0f559d6d70a1638
    ```

  </Step>

  <Step>
    ### Save Sender Address

    Then save the sender contract address in an environment variable:

    ```bash
    export SENDER_ADDRESS={your-sender-address}
    ```

  </Step>
</Steps>

# Receiving a Message

URL: /academy/interchain-messaging/04-icm-basics/05-receiving-a-message

Learn to receive messages with Avalanche Interchain Messaging.

To receive a message we need to enable our cross-L1 dApps to being called by the Interchain Messaging contract.

![](https://qizat5l3bwvomkny.public.blob.vercel-storage.com/builders-hub/course-images/teleporter/teleporter-source-destination-with-relayer-SvUFYGP77XxLjoyWqf7IpC85Ssxmmo.png)

The Interchain Messaging does not know our contract and what functions it has. Therefore, our dApp on the destination L1 has to implement the ITeleporterReceiver interface. It is very straight forward and only requires a single method for receiving the message that then can be called by the Interchain Messaging contract:

```solidity
pragma solidity 0.8.18;

/**
 * @dev Interface that cross-chain applications must implement to receive messages from Teleporter.
 */
interface ITeleporterReceiver {
    /**
     * @dev Called by TeleporterMessenger on the receiving chain.
     *
     * @param originChainID is provided by the TeleporterMessenger contract.
     * @param originSenderAddress is provided by the TeleporterMessenger contract.
     * @param message is the TeleporterMessage payload set by the sender.
     */
    function receiveTeleporterMessage(
        bytes32 originChainID,
        address originSenderAddress,
        bytes calldata message
    ) external;
}
```

The function receiveTeleporterMessage has three parameters:

- **`originChainID`**: The chainID where the message originates from, meaning where the user or contract called the `sendCrossChainMessage` function of the Interchain Messaging contract
- **`originSenderAddress`**: The address of the user or contract that called the `sendCrossChainMessage` function of the Interchain Messaging contract on the origin L1
- **`message`**: The message encoded in bytes

An example for a contract being able to receive Interchain Messaging messages and storing these in a mapping could look like this:

```solidity
pragma solidity 0.8.18;

import "https://github.com/ava-labs/teleporter/blob/main/contracts/src/Teleporter/ITeleporterMessenger.sol";
import "https://github.com/ava-labs/teleporter/blob/main/contracts/src/Teleporter/ITeleporterReceiver.sol";

contract MessageReceiver is ITeleporterReceiver {
    // Messages sent to this contract.
    struct Message {
        address sender;
        string message;
    }

  	mapping(bytes32 => Message) private _messages;

    ITeleporterMessenger public immutable teleporterMessenger;

    // Errors
    error Unauthorized();

    constructor(address teleporterMessengerAddress) {
        teleporterMessenger = ITeleporterMessenger(teleporterMessengerAddress);
    }

    /**
     * @dev See {ITeleporterReceiver-receiveTeleporterMessage}.
     *
     * Receives a message from another chain.
     */
    function receiveTeleporterMessage(
        bytes32 originChainID,
        address originSenderAddress,
        bytes calldata message
    ) external {
      	// Only the Interchain Messaging receiver can deliver a message.
        if (msg.sender != address(teleporterMessenger)) {
            revert Unauthorized();
        }

        string memory messageString = abi.decode(message, (string));
        _messages[originChainID] = Message(originSenderAddress, messageString);
    }

}
```

This contract stores the last `Message` and it's sender of each chain it has received. When it is instantiated, the address of the Interchain Messaging contract is supplied to the constructor. The contract implements the `ITelepoterReceiver` interface and therefore we also implement the `receiveTeleporterMessage` function.

<Quiz quizId="305" />
