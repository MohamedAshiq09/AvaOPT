// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
           
import "./libraries/DataTypes.sol";
import "./libraries/MessageEncoding.sol";
import "./libraries/YieldMath.sol";

import "./interfaces/IAaveAddressesProvider.sol";
import "./interfaces/IAaveProtocolDataProvider.sol";
import "./interfaces/IAavePool.sol";
import "../interfaces/ITeleporterMessenger.sol";
import "../interfaces/ITeleporterReceiver.sol";


contract YieldHub is Ownable, ReentrancyGuard, Pausable, ITeleporterReceiver {
    using MessageEncoding for bytes;
    using YieldMath for uint256;

    
    uint256 private constant MAX_APY_BPS = 50000; 
    uint256 private constant MIN_FRESHNESS = 30; 
    uint256 private constant MAX_FRESHNESS = 3600;
    uint256 private constant AAVE_RISK_SCORE = 10;
    uint256 private constant SUBNET_RISK_SCORE = 30; 
    
    bytes32 private constant AAVE_PROTOCOL = keccak256("AAVE_V3");

    
    IAaveAddressesProvider public aaveProvider;
    IAavePool public aavePool;
    IAaveProtocolDataProvider public aaveDataProvider;
    
    ITeleporterMessenger public teleporterMessenger;
    bytes32 public destChainId;
    address public destReceiver;

    mapping(address => DataTypes.YieldData) public aaveData;
    mapping(address => DataTypes.YieldData) public subnetData;
    mapping(bytes32 => DataTypes.RequestInfo) public requests;
    mapping(address => bytes32) public latestRequest;
    
    // Configuration
    uint256 public dataFreshness = 120; // 2 minutes default
    mapping(address => bool) public supportedTokens;
    mapping(address => uint256) public tokenDecimals;
    address[] public tokenList;
    
    // Emergency and Maintenance
    bool public emergencyMode = false;
    mapping(address => bool) public authorizedCallers;

    // ============ EVENTS ============
    
    event AaveProviderSet(address indexed provider);
    event AaveDataProviderSet(address indexed dataProvider);
    event TeleporterSet(address indexed messenger);
    event DestSubnetSet(bytes32 indexed chainId, address indexed receiver);
    
    event AaveUpdated(
        address indexed token, 
        uint256 apyBps, 
        uint256 tvl, 
        uint256 liquidityIndex,
        uint256 timestamp
    );
    
    event SubnetRequest(
        bytes32 indexed requestId, 
        address indexed token, 
        address indexed requester,
        bytes32 destChainId,
        address destReceiver,
        uint256 timestamp
    );
    
    event SubnetResponse(
        bytes32 indexed requestId, 
        address indexed token, 
        uint256 apyBps, 
        uint256 tvl,
        bytes32 protocol,
        uint256 timestamp
    );
    
    event TokenAdded(address indexed token, uint256 decimals);
    event TokenRemoved(address indexed token);
    event DataFreshnessUpdated(uint256 newFreshness);
    event EmergencyModeToggled(bool enabled);
    event AuthorizedCallerUpdated(address indexed caller, bool authorized);

    // ============ ERRORS ============
    
    error ZeroAddress();
    error TokenNotSupported();
    error StaleData();
    error InvalidWeights();
    error InvalidAPY();
    error EmergencyModeActive();
    error UnauthorizedCaller();
    error InvalidDataProvider();

    // ============ CONSTRUCTOR ============
    
    constructor(
        address _aaveProvider,
        address _aaveDataProvider,
        address _teleporter
    ) {
        if (_aaveProvider == address(0)) revert ZeroAddress();
        if (_aaveDataProvider == address(0)) revert ZeroAddress();
        if (_teleporter == address(0)) revert ZeroAddress();

        aaveProvider = IAaveAddressesProvider(_aaveProvider);
        aaveDataProvider = IAaveProtocolDataProvider(_aaveDataProvider);
        teleporterMessenger = ITeleporterMessenger(_teleporter);
        
        // Cache the pool address from provider
        address poolAddress = aaveProvider.getPool();
        if (poolAddress == address(0)) revert InvalidDataProvider();
        aavePool = IAavePool(poolAddress);
        
        // Set deployer as authorized caller
        authorizedCallers[msg.sender] = true;
        
        emit AaveProviderSet(_aaveProvider);
        emit AaveDataProviderSet(_aaveDataProvider);
        emit TeleporterSet(_teleporter);
        emit AuthorizedCallerUpdated(msg.sender, true);
    }

    // ============ MODIFIERS ============
    
    modifier onlyAuthorized() {
        if (!authorizedCallers[msg.sender] && msg.sender != owner()) {
            revert UnauthorizedCaller();
        }
        _;
    }

    modifier notEmergencyMode() {
        if (emergencyMode) revert EmergencyModeActive();
        _;
    }

    modifier validToken(address _token) {
        if (!supportedTokens[_token]) revert TokenNotSupported();
        _;
    }

    // ============ ADMIN FUNCTIONS ============
    
    function setAaveAddressesProvider(address _provider) external onlyOwner {
        if (_provider == address(0)) revert ZeroAddress();
        
        aaveProvider = IAaveAddressesProvider(_provider);
        address poolAddress = aaveProvider.getPool();
        if (poolAddress == address(0)) revert InvalidDataProvider();
        aavePool = IAavePool(poolAddress);
        
        emit AaveProviderSet(_provider);
    }

    function setAaveDataProvider(address _dataProvider) external onlyOwner {
        if (_dataProvider == address(0)) revert ZeroAddress();
        aaveDataProvider = IAaveProtocolDataProvider(_dataProvider);
        emit AaveDataProviderSet(_dataProvider);
    }

    function setTeleporterMessenger(address _messenger) external onlyOwner {
        if (_messenger == address(0)) revert ZeroAddress();
        teleporterMessenger = ITeleporterMessenger(_messenger);
        emit TeleporterSet(_messenger);
    }

    function setDestSubnet(bytes32 _chainId, address _receiver) external onlyOwner {
        if (_chainId == bytes32(0)) revert ZeroAddress();
        if (_receiver == address(0)) revert ZeroAddress();
        
        destChainId = _chainId;
        destReceiver = _receiver;
        emit DestSubnetSet(_chainId, _receiver);
    }

    function setDataFreshness(uint256 _seconds) external onlyOwner {
        require(_seconds >= MIN_FRESHNESS && _seconds <= MAX_FRESHNESS, "Invalid freshness");
        dataFreshness = _seconds;
        emit DataFreshnessUpdated(_seconds);
    }

    function addSupportedToken(address _token, uint256 _decimals) external onlyOwner {
        if (_token == address(0)) revert ZeroAddress();
        require(!supportedTokens[_token], "Already supported");
        require(_decimals <= 18, "Invalid decimals");
        
        // Verify token exists in Aave (this will revert if not supported)
        try aaveDataProvider.getReserveConfigurationData(_token) returns (
            uint256,uint256,uint256,uint256,uint256,bool,bool,bool,bool isActive,bool
        ) {
            require(isActive, "Token not active in Aave");
        } catch {
            revert("Token not supported by Aave");
        }
        
        supportedTokens[_token] = true;
        tokenDecimals[_token] = _decimals;
        tokenList.push(_token);
        
        emit TokenAdded(_token, _decimals);
    }

    function removeSupportedToken(address _token) external onlyOwner validToken(_token) {
        supportedTokens[_token] = false;
        delete tokenDecimals[_token];
        
        // Remove from array
        for (uint256 i = 0; i < tokenList.length; i++) {
            if (tokenList[i] == _token) {
                tokenList[i] = tokenList[tokenList.length - 1];
                tokenList.pop();
                break;
            }
        }
        
        emit TokenRemoved(_token);
    }

    function setAuthorizedCaller(address _caller, bool _authorized) external onlyOwner {
        if (_caller == address(0)) revert ZeroAddress();
        authorizedCallers[_caller] = _authorized;
        emit AuthorizedCallerUpdated(_caller, _authorized);
    }

    function toggleEmergencyMode() external onlyOwner {
        emergencyMode = !emergencyMode;
        emit EmergencyModeToggled(emergencyMode);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ AAVE INTEGRATION FUNCTIONS ============

    /**
     * @notice Updates Aave yield data for a given token using real Aave V3 data
     * @param _token Token address to update
     */
    function updateAaveData(address _token) 
        public 
        whenNotPaused 
        notEmergencyMode 
        validToken(_token) 
    {
        // Get real Aave data
        (uint256 apyBps, uint256 tvl, uint256 liquidityIndex) = _getAaveYieldData(_token);
        
        // Validate APY is reasonable
        if (!YieldMath.isValidAPY(apyBps)) {
            apyBps = YieldMath.sanityClampBps(apyBps, 0, MAX_APY_BPS);
        }
        
        // Store the data
        aaveData[_token] = DataTypes.YieldData({
            apyBps: apyBps,
            tvl: tvl,
            timestamp: block.timestamp,
            protocol: AAVE_PROTOCOL,
            isActive: true
        });
        
        emit AaveUpdated(_token, apyBps, tvl, liquidityIndex, block.timestamp);
    }

    /**
     * @notice Gets real Aave yield data from protocol contracts
     * @param _token Token address
     * @return apyBps APY in basis points
     * @return tvl Total value locked
     * @return liquidityIndex Current liquidity index
     */
    function _getAaveYieldData(address _token) 
        internal 
        view 
        returns (uint256 apyBps, uint256 tvl, uint256 liquidityIndex) 
    {
        try aaveDataProvider.getReserveData(_token) returns (
            uint256, // unbacked
            uint256, // accruedToTreasuryScaled  
            uint256 totalAToken,
            uint256, // totalStableDebt
            uint256, // totalVariableDebt
            uint256 liquidityRate,
            uint256, // variableBorrowRate
            uint256, // stableBorrowRate
            uint256, // averageStableBorrowRate
            uint256 _liquidityIndex,
            uint256, // variableBorrowIndex
            uint40 // lastUpdateTimestamp
        ) {
            // Convert Aave's ray-based liquidity rate to basis points APY
            apyBps = YieldMath.aaveRayToBps(liquidityRate);
            
            // Calculate TVL from total aToken supply
            tvl = totalAToken;
            liquidityIndex = _liquidityIndex;
            
        } catch {
            // Fallback to safe defaults if Aave call fails
            apyBps = 0;
            tvl = 0;
            liquidityIndex = 1e27; // 1 in ray format
        }
        
        return (apyBps, tvl, liquidityIndex);
    }

    /**
     * @notice Gets current Aave APY for a token (external view function)
     * @param _token Token address
     * @return apyBps APY in basis points
     */
    function getAaveAPY(address _token) public view validToken(_token) returns (uint256 apyBps) {
        (apyBps,,) = _getAaveYieldData(_token);
        return apyBps;
    }

    /**
     * @notice Gets current Aave TVL for a token
     * @param _token Token address
     * @return tvl Total value locked
     */
    function getAaveTVL(address _token) public view validToken(_token) returns (uint256 tvl) {
        (,tvl,) = _getAaveYieldData(_token);
        return tvl;
    }

    /**
     * @notice Gets comprehensive Aave data including liquidity index
     * @param _token Token address
     * @return apyBps APY in basis points
     * @return tvl Total value locked
     * @return liquidityIndex Current liquidity index
     * @return lastUpdate Last update timestamp from stored data
     */
    function getAaveDetails(address _token) 
        external 
        view 
        validToken(_token) 
        returns (uint256 apyBps, uint256 tvl, uint256 liquidityIndex, uint256 lastUpdate) 
    {
        DataTypes.YieldData memory data = aaveData[_token];
        
        if (isDataFresh(data.timestamp)) {
            // Return stored data if fresh
            return (data.apyBps, data.tvl, 0, data.timestamp);
        } else {
            // Get fresh data from Aave
            (apyBps, tvl, liquidityIndex) = _getAaveYieldData(_token);
            return (apyBps, tvl, liquidityIndex, block.timestamp);
        }
    }

    /**
     * @notice Checks if data is fresh enough based on configured freshness
     * @param _timestamp Data timestamp to check
     * @return bool True if data is fresh
     */
    function isDataFresh(uint256 _timestamp) public view returns (bool) {
        return (block.timestamp - _timestamp) <= dataFreshness;
    }

    // ============ CROSS-CHAIN AWM FUNCTIONS ============

    /**
     * @notice Requests subnet yield data via Avalanche Warp Messaging
     * @param _token Token to get subnet yield for
     * @return requestId Unique request identifier
     */
    function requestSubnetYield(address _token) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
        notEmergencyMode
        validToken(_token)
        returns (bytes32 requestId) 
    {
        require(destChainId != bytes32(0), "Dest chain not set");
        require(destReceiver != address(0), "Dest receiver not set");
        require(msg.value > 0, "Teleporter fee required");
        
        // Generate unique request ID
        requestId = keccak256(abi.encodePacked(
            _token,
            msg.sender,
            block.timestamp,
            block.number,
            block.chainid
        ));
        
        // Ensure request ID is unique
        require(requests[requestId].timestamp == 0, "Request ID collision");
        
        // Store request info
        requests[requestId] = DataTypes.RequestInfo({
            token: _token,
            requester: msg.sender,
            timestamp: block.timestamp,
            status: DataTypes.RequestStatus.Pending
        });
        
        latestRequest[_token] = requestId;
        
        // Create request message with token decimals for proper handling
        DataTypes.YieldRequest memory request = DataTypes.YieldRequest({
            token: _token,
            requester: msg.sender,
            timestamp: block.timestamp,
            requestId: requestId
        });
        
        bytes memory payload = MessageEncoding.encodeYieldRequest(request);
        
        // Send AWM message with proper error handling
        try teleporterMessenger.sendCrossChainMessage{value: msg.value}(
            destChainId,
            destReceiver,
            payload
        ) returns (bytes32 messageId) {
            // Message sent successfully
            emit SubnetRequest(
                requestId, 
                _token, 
                msg.sender, 
                destChainId, 
                destReceiver,
                block.timestamp
            );
            
            return requestId;
        } catch Error(string memory reason) {
            revert(string(abi.encodePacked("AWM send failed: ", reason)));
        } catch {
            revert("AWM send failed");
        }
    }

    /**
     * @notice Receives cross-chain message responses from subnets
     * @param sourceChainId Chain ID of the message source
     * @param originSenderAddress Address that sent the original message
     * @param message Encoded message payload
     */
    function receiveTeleporterMessage(
        bytes32 sourceChainId,
        address originSenderAddress,
        bytes calldata message
    ) external override whenNotPaused notEmergencyMode {
        // Validate the message source
        require(msg.sender == address(teleporterMessenger), "Invalid messenger");
        require(sourceChainId == destChainId, "Invalid source chain");
        require(originSenderAddress == destReceiver, "Invalid origin sender");
        
        // Decode the response with error handling
        DataTypes.YieldResponse memory response;
        try MessageEncoding.decodeYieldResponse(message) returns (DataTypes.YieldResponse memory _response) {
            response = _response;
        } catch {
            revert("Invalid message format");
        }
        
        // Validate the request exists and is pending
        DataTypes.RequestInfo storage requestInfo = requests[response.requestId];
        require(requestInfo.timestamp != 0, "Request not found");
        require(requestInfo.status == DataTypes.RequestStatus.Pending, "Request not pending");
        
        address token = requestInfo.token;
        
        // Validate and clamp the APY data
        uint256 clampedAPY = YieldMath.sanityClampBps(response.apyBps, 0, MAX_APY_BPS);
        
        // Additional validation for reasonable values
        require(response.tvl <= type(uint128).max, "TVL too large");
        require(response.timestamp <= block.timestamp + 300, "Future timestamp"); // Allow 5min clock skew
        require(response.timestamp > block.timestamp - 3600, "Too old timestamp"); // Max 1 hour old
        
        // Store subnet yield data
        subnetData[token] = DataTypes.YieldData({
            apyBps: clampedAPY,
            tvl: response.tvl,
            timestamp: response.timestamp,
            protocol: response.protocol,
            isActive: true
        });
        
        // Mark request as completed
        requestInfo.status = DataTypes.RequestStatus.Completed;
        
        emit SubnetResponse(
            response.requestId,
            token,
            clampedAPY,
            response.tvl,
            response.protocol,
            response.timestamp
        );
    }

    // ============ YIELD CALCULATION FUNCTIONS ============

    /**
     * @notice Calculates optimized APY combining Aave and subnet yields with risk adjustment
     * @param _token Token address
     * @return optimizedAPY Risk-adjusted optimized APY in basis points
     */
    function calculateOptimizedAPY(address _token) 
        public 
        view 
        validToken(_token)
        returns (uint256 optimizedAPY) 
    {
        DataTypes.YieldData memory aave = aaveData[_token];
        DataTypes.YieldData memory subnet = subnetData[_token];
        
        // Ensure we have fresh data from both sources
        require(aave.isActive && isDataFresh(aave.timestamp), "Stale Aave data");
        require(subnet.isActive && isDataFresh(subnet.timestamp), "Stale subnet data");
        
        // Calculate risk-adjusted yields
        uint256 aaveRiskAdjusted = YieldMath.calculateRiskAdjustedYield(
            aave.apyBps, 
            AAVE_RISK_SCORE
        );
        
        uint256 subnetRiskAdjusted = YieldMath.calculateRiskAdjustedYield(
            subnet.apyBps, 
            SUBNET_RISK_SCORE
        );
        
        // Use the enhanced optimization algorithm
        return YieldMath.calculateOptimizedAPY(aaveRiskAdjusted, subnetRiskAdjusted);
    }

    /**
     * @notice Gets comprehensive yield data for a token including risk metrics
     * @param _token Token address
     * @return aave Aave yield data
     * @return subnet Subnet yield data  
     * @return optimizedBps Optimized APY in basis points
     * @return riskScore Combined risk score (0-100)
     */
    function getComprehensiveYield(address _token)
        external
        view
        validToken(_token)
        returns (
            DataTypes.YieldData memory aave,
            DataTypes.YieldData memory subnet,
            uint256 optimizedBps,
            uint256 riskScore
        )
    {
        aave = aaveData[_token];
        subnet = subnetData[_token];
        
        if (aave.isActive && subnet.isActive && 
            isDataFresh(aave.timestamp) && isDataFresh(subnet.timestamp)) {
            
            optimizedBps = calculateOptimizedAPY(_token);
            
            // Calculate weighted risk score based on allocation
            // Using the same weights as optimization: 60% Aave, 40% Subnet
            riskScore = (AAVE_RISK_SCORE * 60 + SUBNET_RISK_SCORE * 40) / 100;
        } else {
            optimizedBps = 0;
            riskScore = 100; // Maximum risk when data unavailable
        }
    }

    /**
     * @notice Updates all yield data for a token (Aave + triggers subnet request)
     * @param _token Token address
     * @return requestId The subnet request ID if successful
     */
    function refreshAllData(address _token) 
        external 
        payable 
        whenNotPaused 
        notEmergencyMode
        validToken(_token)
        returns (bytes32 requestId)
    {
        // Update Aave data immediately
        updateAaveData(_token);
        
        // Request subnet data via AWM
        return requestSubnetYield{value: msg.value}(_token);
    }

    /**
     * @notice Batch update multiple tokens (Aave data only)
     * @param _tokens Array of token addresses to update
     */
    function batchUpdateAaveData(address[] calldata _tokens) 
        external 
        whenNotPaused 
        notEmergencyMode 
        onlyAuthorized 
    {
        require(_tokens.length <= 20, "Too many tokens"); // Gas limit protection
        
        for (uint256 i = 0; i < _tokens.length; i++) {
            if (supportedTokens[_tokens[i]]) {
                updateAaveData(_tokens[i]);
            }
        }
    }

    // ============ VIEW FUNCTIONS ============

    function getSupportedTokens() external view returns (address[] memory) {
        return tokenList;
    }

    function getRequestStatus(bytes32 _requestId) 
        external 
        view 
        returns (DataTypes.RequestInfo memory) 
    {
        return requests[_requestId];
    }

    function getLatestRequestId(address _token) external view returns (bytes32) {
        return latestRequest[_token];
    }

    function isTokenSupported(address _token) external view returns (bool) {
        return supportedTokens[_token];
    }

    function getTokenDecimals(address _token) external view returns (uint256) {
        return tokenDecimals[_token];
    }

    /**
     * @notice Gets yield comparison data for analysis
     * @param _token Token address
     * @return aaveAPY Current Aave APY
     * @return subnetAPY Current subnet APY
     * @return optimizedAPY Calculated optimized APY
     * @return aaveWeight Weight allocated to Aave in optimization
     * @return subnetWeight Weight allocated to subnet in optimization
     */
    function getYieldComparison(address _token)
        external
        view
        validToken(_token)
        returns (
            uint256 aaveAPY,
            uint256 subnetAPY,
            uint256 optimizedAPY,
            uint256 aaveWeight,
            uint256 subnetWeight
        )
    {
        DataTypes.YieldData memory aave = aaveData[_token];
        DataTypes.YieldData memory subnet = subnetData[_token];
        
        aaveAPY = aave.apyBps;
        subnetAPY = subnet.apyBps;
        
        if (aave.isActive && subnet.isActive && 
            isDataFresh(aave.timestamp) && isDataFresh(subnet.timestamp)) {
            
            optimizedAPY = calculateOptimizedAPY(_token);
            
            // Return the weights used in optimization (simplified version)
            if (subnet.apyBps > aave.apyBps * 15 / 10) {
                aaveWeight = 7000; // 70%
                subnetWeight = 3000; // 30%
            } else if (aave.apyBps > subnet.apyBps * 12 / 10) {
                aaveWeight = 8000; // 80%
                subnetWeight = 2000; // 20%
            } else {
                aaveWeight = 6000; // 60%
                subnetWeight = 4000; // 40%
            }
        }
    }

    // ============ EMERGENCY FUNCTIONS ============

    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function emergencyPauseToken(address _token) external onlyOwner {
        if (supportedTokens[_token]) {
            aaveData[_token].isActive = false;
            subnetData[_token].isActive = false;
        }
    }

    function emergencyReactivateToken(address _token) external onlyOwner validToken(_token) {
        aaveData[_token].isActive = true;
        subnetData[_token].isActive = true;
    }

    // ============ RECEIVE FUNCTION ============

    receive() external payable {
        // Accept ETH for Teleporter fees
    }
}