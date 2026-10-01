// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract IoTDataSharing {

    string public projectName =
        "Blockchain Based Secure IoT Data Sharing";

    address public admin;

    mapping(address => bool) public authorizedUsers;

    struct IoTData {
        string deviceId;
        uint256 timestamp;
        address sender;
        bytes32 dataHash;
        string encryptedData;
    }

    IoTData[] private sensorData;

    event UserAuthorized(address user);
    event UserRevoked(address user);

    event IoTDataStored(
        string deviceId,
        uint256 timestamp,
        address sender,
        bytes32 dataHash
    );

    modifier onlyAdmin() {
        require(
            msg.sender == admin,
            "Only admin can perform this action"
        );
        _;
    }

    modifier onlyAuthorized() {
        require(
            msg.sender == admin || authorizedUsers[msg.sender],
            "User is not authorized"
        );
        _;
    }

    constructor() {
        admin = msg.sender;
        authorizedUsers[msg.sender] = true;
    }

    function getProjectName()
        public
        view
        returns (string memory)
    {
        return projectName;
    }

    function authorizeUser(address _user)
        public
        onlyAdmin
    {
        authorizedUsers[_user] = true;
        emit UserAuthorized(_user);
    }

    function revokeUser(address _user)
        public
        onlyAdmin
    {
        authorizedUsers[_user] = false;
        emit UserRevoked(_user);
    }

    function storeIoTData(
        string memory _deviceId,
        bytes32 _dataHash,
        string memory _encryptedData
    )
        public
        onlyAuthorized
    {
        sensorData.push(
            IoTData({
                deviceId: _deviceId,
                timestamp: block.timestamp,
                sender: msg.sender,
                dataHash: _dataHash,
                encryptedData: _encryptedData
            })
        );

        emit IoTDataStored(
            _deviceId,
            block.timestamp,
            msg.sender,
            _dataHash
        );
    }

    function getIoTDataCount()
        public
        view
        returns (uint256)
    {
        return sensorData.length;
    }

    function getIoTData(uint256 _index)
        public
        view
        returns (
            string memory deviceId,
            uint256 timestamp,
            address sender,
            bytes32 dataHash,
            string memory encryptedData
        )
    {
        IoTData memory data = sensorData[_index];

        return (
            data.deviceId,
            data.timestamp,
            data.sender,
            data.dataHash,
            data.encryptedData
        );
    }
}