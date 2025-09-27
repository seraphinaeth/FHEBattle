// Contract addresses - Update these after deployment
export const CONTRACTS = {
  // Sepolia testnet addresses
  SEPOLIA: {
    GOLD_TOKEN: '0x0000000000000000000000000000000000000000', // Update after deployment
    BATTLE_GAME: '0x0000000000000000000000000000000000000000', // Update after deployment
  },
  // Local hardhat addresses
  HARDHAT: {
    GOLD_TOKEN: '0x0000000000000000000000000000000000000000', // Update after deployment
    BATTLE_GAME: '0x0000000000000000000000000000000000000000', // Update after deployment
  }
};

// Contract ABIs - these would be imported from compiled contracts
export const BATTLE_GAME_ABI = [
  "function registerPlayer() external",
  "function battleMonster(uint256 monsterId) external",
  "function getPlayerAttackPower() external view returns (uint256)",
  "function canBattle(address playerAddress) external view returns (bool)",
  "function getMonster(uint256 monsterId) external view returns (tuple(uint32 health, uint32 minAttackPower, uint32 maxAttackPower, bool isActive))",
  "function monsterCount() external view returns (uint256)",
  "function players(address) external view returns (tuple(uint256 attackPower, bool isRegistered, uint256 lastBattleTime))",
  "event PlayerRegistered(address indexed player)",
  "event BattleCompleted(address indexed player, uint256 indexed monsterId, bool victory)"
];

export const GOLD_TOKEN_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
  "function totalSupply() external view returns (uint256)"
];