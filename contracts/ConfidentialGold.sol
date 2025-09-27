// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {ConfidentialFungibleToken} from "new-confidential-contracts/token/ConfidentialFungibleToken.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {euint64} from "@fhevm/solidity/lib/FHE.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Confidential GOLD Token
/// @notice A confidential ERC20 token for the FHE Battle Game
contract ConfidentialGold is ConfidentialFungibleToken, SepoliaConfig, Ownable {
    /// @notice Mapping of authorized minters
    mapping(address => bool) public authorizedMinters;

    /// @notice Event emitted when a minter is authorized
    event MinterAuthorized(address indexed minter);

    /// @notice Event emitted when a minter is deauthorized
    event MinterDeauthorized(address indexed minter);

    constructor() ConfidentialFungibleToken("GOLD", "GOLD", "") Ownable(msg.sender) {}

    /// @notice Authorize an address to mint tokens
    /// @param minter The address to authorize
    function authorizeMinter(address minter) external onlyOwner {
        authorizedMinters[minter] = true;
        emit MinterAuthorized(minter);
    }

    /// @notice Deauthorize a minter
    /// @param minter The address to deauthorize
    function deauthorizeMinter(address minter) external onlyOwner {
        authorizedMinters[minter] = false;
        emit MinterDeauthorized(minter);
    }

    /// @notice Mint tokens to a user (only authorized minters)
    /// @param to The recipient address
    /// @param amount The encrypted amount to mint
    function mint(address to, euint64 amount) external {
        require(authorizedMinters[msg.sender], "Not authorized to mint");
        _mint(to, amount);
    }

    /// @notice Mint initial supply for testing (only owner, one-time use)
    /// @param to The recipient address
    /// @param amount The encrypted amount to mint
    function mintInitial(address to, euint64 amount) external onlyOwner {
        _mint(to, amount);
    }
}
