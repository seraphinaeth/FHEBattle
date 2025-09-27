// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint32, ebool, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IConfidentialGold {
    function mint(address to, euint32 amount) external;
    function balanceOf(address account) external view returns (euint32);
}

/// @title FHE Battle Game
/// @notice Players register to receive an encrypted attack power. They can battle monsters and receive confidential GOLD rewards.
contract FHEBattle is SepoliaConfig, Ownable {
    IConfidentialGold public immutable gold;

    mapping(address => euint32) private _attackPower;
    mapping(address => ebool) private _lastBattleWin;
    mapping(address => bool) private _registered;

    event PlayerRegistered(address indexed player);
    event MonsterAttacked(address indexed player);

    constructor(address goldToken) Ownable(msg.sender) {
        require(goldToken != address(0), "Invalid GOLD token");
        gold = IConfidentialGold(goldToken);
    }

    /// @notice Register and receive an encrypted attack power in [10, 100]
    function register() external {
        require(!_registered[msg.sender], "Already registered");

        // random in [0, 90], then add 10 => [10,100]
        euint32 base = FHE.randEuint32(91);
        euint32 atk = FHE.add(base, 10);

        _attackPower[msg.sender] = atk;

        // Grant ACL for user and contract to work with the ciphertext
        FHE.allowThis(_attackPower[msg.sender]);
        FHE.allow(_attackPower[msg.sender], msg.sender);

        _registered[msg.sender] = true;
        emit PlayerRegistered(msg.sender);
    }

    /// @notice Attack a monster using an encrypted monster power provided by the user
    /// @param encMonster external encrypted monster power
    /// @param inputProof input verification proof
    function attackMonster(externalEuint32 encMonster, bytes calldata inputProof) external {
        require(_registered[msg.sender], "Not registered");

        euint32 monster = FHE.fromExternal(encMonster, inputProof);
        euint32 myAtk = _attackPower[msg.sender];

        // Win if player's attack >= monster power
        ebool win = FHE.ge(myAtk, monster);
        _lastBattleWin[msg.sender] = win;

        // ACL for result decryption by the player
        FHE.allowThis(_lastBattleWin[msg.sender]);
        FHE.allow(_lastBattleWin[msg.sender], msg.sender);

        // Rewards: win => 100 GOLD, lose => 10 GOLD
        euint32 rWin = FHE.asEuint32(100);
        euint32 rLose = FHE.asEuint32(10);
        euint32 reward = FHE.select(win, rWin, rLose);

        // Mint rewards to player; this contract must be authorized minter in GOLD
        gold.mint(msg.sender, reward);

        emit MonsterAttacked(msg.sender);
    }

    /// @notice Get whether an address is registered
    function isRegistered(address player) external view returns (bool) {
        return _registered[player];
    }

    /// @notice Get the encrypted attack power for an address
    /// @dev Do not use msg.sender in views per repo requirements
    function getAttack(address player) external view returns (euint32) {
        return _attackPower[player];
    }

    /// @notice Get the last battle result (encrypted) for an address
    /// @dev true if last battle was a win
    function getLastBattleWin(address player) external view returns (ebool) {
        return _lastBattleWin[player];
    }
}

