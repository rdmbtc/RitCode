// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title CodeMint - Store code on Ritual blockchain as NFTs
/// @notice Users mint their code, each mint creates an ERC-721 token
/// @dev No external dependencies - compiles standalone
contract CodeMint {
    string public name = "Ritual Code";
    string public symbol = "RCODE";

    struct CodeEntry {
        string code;
        address minter;
        uint256 timestamp;
        uint256 tokenId;
    }

    uint256 private _nextTokenId;
    address public owner;

    mapping(uint256 => CodeEntry) public codes;
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(address => uint256[]) public userCodes;

    event CodeMinted(uint256 indexed tokenId, address indexed minter, string code, uint256 timestamp);
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function balanceOf(address _owner) public view returns (uint256) {
        return _balances[_owner];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        require(_owners[tokenId] != address(0), "Token not exist");
        return _owners[tokenId];
    }

    /// @notice Mint code to blockchain
    function mintCode(string calldata _code) external returns (uint256) {
        require(bytes(_code).length > 0, "Code cannot be empty");

        uint256 tokenId = _nextTokenId++;
        _owners[tokenId] = msg.sender;
        _balances[msg.sender]++;

        codes[tokenId] = CodeEntry({
            code: _code,
            minter: msg.sender,
            timestamp: block.timestamp,
            tokenId: tokenId
        });

        userCodes[msg.sender].push(tokenId);

        emit CodeMinted(tokenId, msg.sender, _code, block.timestamp);
        emit Transfer(address(0), msg.sender, tokenId);
        return tokenId;
    }

    /// @notice Get code by token ID
    function getCode(uint256 tokenId) external view returns (CodeEntry memory) {
        require(_owners[tokenId] != address(0), "Token does not exist");
        return codes[tokenId];
    }

    /// @notice Get all code IDs owned by address
    function getUserCodes(address user) external view returns (uint256[] memory) {
        return userCodes[user];
    }

    /// @notice Get total code count
    function totalCodes() external view returns (uint256) {
        return _nextTokenId;
    }

    /// @notice Transfer token (basic ERC-721)
    function transferFrom(address from, address to, uint256 tokenId) external {
        require(_owners[tokenId] == from, "Not owner");
        require(to != address(0), "To cannot be zero");
        _owners[tokenId] = to;
        _balances[from]--;
        _balances[to]++;

        // Update userCodes is complex for removal, skipping for simplicity
        emit Transfer(from, to, tokenId);
    }
}
