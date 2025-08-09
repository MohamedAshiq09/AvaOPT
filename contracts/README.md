# YieldScout - Subnet Contracts

This directory contains the subnet-side smart contracts for the SubnetYield Core project. YieldScout handles native protocol integration and cross-subnet communication via Avalanche Warp Messaging (AWM).

## 🏗️ Architecture Overview

```
YieldScout.sol (Main Contract)
├── Receives AWM requests from C-Chain
├── Integrates with native subnet protocols
├── Sends yield data responses back to C-Chain
└── Manages protocol data caching

Supporting Contracts:
├── MockDEXProtocol.sol (Testing protocol)
├── DeployYieldScout.sol (Deployment helper)
└── Interfaces/
    ├── IDEXProtocol.sol
    ├── ITeleporterMessenger.sol
    ├── ITeleporterReceiver.sol
    └── IERC20.sol
```

## 📋 Core Features

### 1. AWM Message Processing
- Receives yield data requests from C-Chain via Teleporter
- Validates and processes requests with replay protection
- Sends structured responses back to origin chain

### 2. Native Protocol Integration
- Interfaces with subnet DEX/lending protocols
- Reads real-time APY and TVL data
- Handles protocol failures gracefully with caching

### 3. Data Management
- Caches protocol data for reliability
- Implements data freshness validation
- Supports multiple token types

### 4. Security Features
- Replay attack protection
- Owner-only administrative functions
- Input validation and error handling

## 🚀 Quick Start

### Prerequisites
- Solidity ^0.8.19
- Hardhat development environment
- Access to Avalanche subnet testnet
- Teleporter messenger deployed on subnet

### Deployment Steps

1. **Deploy Mock Protocol (for testing)**
```solidity
MockDEXProtocol protocol = new MockDEXProtocol();
```

2. **Deploy YieldScout**
```solidity
address[] memory tokens = [USDC_ADDRESS, WAVAX_ADDRESS];
YieldScout scout = new YieldScout(
    TELEPORTER_ADDRESS,
    address(protocol),
    tokens
);
```

3. **Configure Supported Tokens**
```solidity
scout.setTokenSupport(TOKEN_ADDRESS, true);
```

## 🔧 Contract Interfaces

### YieldScout Main Functions

```solidity
// Receive AWM messages (called by Teleporter)
function receiveTeleporterMessage(
    bytes32 sourceBlockchainID,
    address originSenderAddress,
    bytes calldata message
) external;

// Get current local protocol APY
function getLocalProtocolAPY(address token) external view returns (uint256);

// Update protocol data manually
function updateProtocolData(address token) external;

// Admin: Set token support
function setTokenSupport(address token, bool supported) external;
```

### IDEXProtocol Interface

```solidity
interface IDEXProtocol {
    function getAPY(address token) external view returns (uint256);
    function getTVL(address token) external view returns (uint256);
    function getProtocolName() external view returns (string memory);
    function isTokenSupported(address token) external view returns (bool);
}
```

## 📊 Message Format

### Request Message (from C-Chain)
```solidity
struct YieldRequest {
    bytes32 requestId;      // Unique request identifier
    address token;          // Token to get yield data for
    address responseContract; // Contract to send response to
}
```

### Response Message (to C-Chain)
```solidity
struct YieldResponse {
    bytes32 requestId;      // Matching request ID
    address token;          // Token address
    uint256 apy;           // APY in basis points
    uint256 tvl;           // Total value locked
    string protocolName;   // Protocol name
    uint256 timestamp;     // Response timestamp
}
```

## 🧪 Testing

### Mock Protocol Usage
The MockDEXProtocol simulates realistic yield data:

```solidity
// Get simulated APY (includes dynamic variations)
uint256 apy = mockProtocol.getAPY(tokenAddress);

// Update mock data for testing
mockProtocol.updateAPY(tokenAddress, 850); // 8.50%
mockProtocol.updateTVL(tokenAddress, 2000000 * 1e18);

// Simulate market activity
mockProtocol.simulateActivity();
```

### Test Scenarios
1. **Basic Yield Request**: Test AWM message processing
2. **Protocol Integration**: Verify native protocol data reading
3. **Error Handling**: Test unsupported tokens and stale data
4. **Caching Logic**: Verify data freshness and fallback behavior

## 🔐 Security Considerations

### Access Control
- Only Teleporter can call `receiveTeleporterMessage`
- Only owner can modify token support
- Request replay protection via processed requests mapping

### Data Validation
- APY values capped at 100% (10000 basis points)
- Token support validation before processing
- Data freshness checks with configurable thresholds

### Error Handling
- Graceful protocol failure handling
- Fallback to cached data when available
- Comprehensive error messages and events

## 📈 Performance Optimization

### Gas Efficiency
- Minimal storage operations
- Efficient data structures
- Optimized message encoding

### Caching Strategy
- 5-minute data freshness threshold
- Automatic cache updates on requests
- Manual cache refresh capability

## 🌐 Network Configuration

### Supported Networks
- **Echo Test L1**: Well-documented, reliable testnet
- **Dispatch Test L1**: Active development, good AWM support
- **Custom Subnets**: Configurable for any Avalanche subnet

### Teleporter Addresses
```solidity
// Echo/Dispatch Testnet
address constant TELEPORTER = 0x253b2784c75e510dD0fF1da844684a1aC0aa5fcf;
```

## 🚨 Important Notes

### For Hackathon Demo
1. **Use MockDEXProtocol** for reliable demo data
2. **Record backup video** in case of network issues
3. **Test end-to-end flow** before presentation
4. **Prepare fallback explanations** for technical issues

### Production Considerations
1. **Implement real protocol adapters** for mainnet
2. **Add comprehensive monitoring** and alerting
3. **Implement governance** for protocol upgrades
4. **Add fee mechanisms** for sustainability

## 📚 Additional Resources

- [Avalanche Warp Messaging Documentation](https://docs.avax.network/cross-chain)
- [Teleporter Protocol Guide](https://github.com/ava-labs/teleporter)
- [Avalanche Subnet Development](https://docs.avax.network/subnets)

## 🤝 Contributing

This is a hackathon project focused on demonstrating cross-subnet DeFi capabilities. The code prioritizes functionality and demo readiness over production optimization.

## ⚡ Quick Commands

```bash
# Compile contracts
npx hardhat compile

# Deploy to testnet
npx hardhat run scripts/deploy.js --network subnet

# Verify contracts
npx hardhat verify CONTRACT_ADDRESS --network subnet

# Run tests
npx hardhat test
```

---

**Team SubnetBlank** | **SubnetYield Core** | **Avalanche Hackathon 2024**