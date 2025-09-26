// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ConfidentialFungibleToken} from "@openzeppelin/confidential-contracts/token/ConfidentialFungibleToken.sol";

/// @title FHE Battle Game Contract
/// @notice A confidential battle game where players fight monsters with encrypted attack power
contract FHEBattleGame is SepoliaConfig {
    /// @notice The GOLD token contract
    ConfidentialFungibleToken public immutable goldToken;
    
    /// @notice Player data structure
    struct Player {
        euint32 attackPower;    // Encrypted attack power
        bool isRegistered;      // Registration status
        uint256 lastBattleTime; // Last battle timestamp for cooldown
    }
    
    /// @notice Monster data structure
    struct Monster {
        uint32 health;          // Monster health (public)
        uint32 minAttackPower;  // Minimum attack power needed to defeat
        uint32 maxAttackPower;  // Maximum attack power for guaranteed victory
        bool isActive;          // Monster availability
    }
    
    /// @notice Mapping from player address to player data
    mapping(address => Player) public players;
    
    /// @notice Mapping from monster ID to monster data
    mapping(uint256 => Monster) public monsters;
    
    /// @notice Total number of monsters
    uint256 public monsterCount;
    
    /// @notice Battle cooldown period (in seconds)
    uint256 public constant BATTLE_COOLDOWN = 5 minutes;
    
    /// @notice Victory reward in GOLD tokens
    uint256 public constant VICTORY_REWARD = 100;
    
    /// @notice Defeat reward in GOLD tokens
    uint256 public constant DEFEAT_REWARD = 10;
    
    /// @notice Events
    event PlayerRegistered(address indexed player);
    event BattleCompleted(address indexed player, uint256 indexed monsterId, bool victory);
    event MonsterCreated(uint256 indexed monsterId, uint32 health, uint32 minAttack, uint32 maxAttack);
    
    /// @notice Constructor
    /// @param _goldToken Address of the GOLD token contract
    constructor(address _goldToken) {
        goldToken = ConfidentialFungibleToken(_goldToken);
        
        // Initialize some default monsters
        _createMonster(100, 20, 50);  // Goblin
        _createMonster(200, 40, 80);  // Orc
        _createMonster(300, 60, 120); // Dragon
    }
    
    /// @notice Register a new player with random encrypted attack power
    function registerPlayer() external {
        require(!players[msg.sender].isRegistered, "Player already registered");
        
        // Generate random attack power between 10 and 150
        euint32 randomAttack = FHE.add(FHE.randEuint32(140), 10);
        
        players[msg.sender] = Player({
            attackPower: randomAttack,
            isRegistered: true,
            lastBattleTime: 0
        });
        
        // Grant ACL permissions
        FHE.allowThis(randomAttack);
        FHE.allow(randomAttack, msg.sender);
        
        emit PlayerRegistered(msg.sender);
    }
    
    /// @notice Battle a monster
    /// @param monsterId The ID of the monster to battle
    function battleMonster(uint256 monsterId) external {
        require(players[msg.sender].isRegistered, "Player not registered");
        require(monsterId < monsterCount, "Invalid monster ID");
        require(monsters[monsterId].isActive, "Monster not active");
        require(
            block.timestamp >= players[msg.sender].lastBattleTime + BATTLE_COOLDOWN,
            "Battle cooldown not finished"
        );
        
        Monster memory monster = monsters[monsterId];
        Player storage player = players[msg.sender];
        
        // Update last battle time
        player.lastBattleTime = block.timestamp;
        
        // Determine battle outcome using FHE operations
        // Player wins if attack power >= minAttackPower
        euint32 minAttackNeeded = FHE.asEuint32(monster.minAttackPower);
        ebool hasWon = FHE.ge(player.attackPower, minAttackNeeded);
        
        // Add some randomness for close battles
        euint32 randomBonus = FHE.randEuint32(20); // 0-19 bonus
        euint32 totalAttack = FHE.add(player.attackPower, randomBonus);
        ebool hasWonWithBonus = FHE.ge(totalAttack, minAttackNeeded);
        
        // Final victory condition (either condition can win)
        ebool victory = FHE.or(hasWon, hasWonWithBonus);
        
        // Mint rewards based on victory
        euint32 victoryRewardAmount = FHE.asEuint32(VICTORY_REWARD);
        euint32 defeatRewardAmount = FHE.asEuint32(DEFEAT_REWARD);
        euint32 rewardAmount = FHE.select(victory, victoryRewardAmount, defeatRewardAmount);
        
        // Mint GOLD tokens to player
        goldToken.mint(msg.sender, rewardAmount);
        
        // For event emission, we need to decrypt the victory status
        // In production, you might want to keep this private
        emit BattleCompleted(msg.sender, monsterId, false); // Keep result private
    }
    
    /// @notice Get player's attack power (only accessible by the player)
    /// @return The player's encrypted attack power
    function getPlayerAttackPower() external view returns (euint32) {
        require(players[msg.sender].isRegistered, "Player not registered");
        return players[msg.sender].attackPower;
    }
    
    /// @notice Check if player can battle (cooldown finished)
    /// @param playerAddress The player's address
    /// @return True if player can battle
    function canBattle(address playerAddress) external view returns (bool) {
        if (!players[playerAddress].isRegistered) return false;
        return block.timestamp >= players[playerAddress].lastBattleTime + BATTLE_COOLDOWN;
    }
    
    /// @notice Get monster information
    /// @param monsterId The monster ID
    /// @return Monster data
    function getMonster(uint256 monsterId) external view returns (Monster memory) {
        require(monsterId < monsterCount, "Invalid monster ID");
        return monsters[monsterId];
    }
    
    /// @notice Create a new monster (only callable by contract - could be extended for admin functions)
    /// @param health Monster health
    /// @param minAttackPower Minimum attack power needed
    /// @param maxAttackPower Maximum attack power for guaranteed win
    function _createMonster(uint32 health, uint32 minAttackPower, uint32 maxAttackPower) internal {
        monsters[monsterCount] = Monster({
            health: health,
            minAttackPower: minAttackPower,
            maxAttackPower: maxAttackPower,
            isActive: true
        });
        
        emit MonsterCreated(monsterCount, health, minAttackPower, maxAttackPower);
        monsterCount++;
    }
    
    /// @notice Admin function to add new monsters (could be restricted to owner)
    /// @param health Monster health
    /// @param minAttackPower Minimum attack power needed
    /// @param maxAttackPower Maximum attack power for guaranteed win
    function addMonster(uint32 health, uint32 minAttackPower, uint32 maxAttackPower) external {
        // In production, add access control here (e.g., onlyOwner modifier)
        _createMonster(health, minAttackPower, maxAttackPower);
    }
    
    /// @notice Toggle monster active status
    /// @param monsterId The monster ID
    function toggleMonsterStatus(uint256 monsterId) external {
        // In production, add access control here (e.g., onlyOwner modifier)
        require(monsterId < monsterCount, "Invalid monster ID");
        monsters[monsterId].isActive = !monsters[monsterId].isActive;
    }
}