import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { CONTRACTS, BATTLE_GAME_ABI } from '../config/contracts';

interface Monster {
  health: number;
  minAttackPower: number;
  maxAttackPower: number;
  isActive: boolean;
}

const BattleInterface: React.FC = () => {
  const { address, chain } = useAccount();
  // const [selectedMonsterId, setSelectedMonsterId] = useState<number>(0);
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [canBattleNow, setCanBattleNow] = useState<boolean>(false);

  const contractAddress = chain?.id === 11155111 
    ? CONTRACTS.SEPOLIA.BATTLE_GAME 
    : CONTRACTS.HARDHAT.BATTLE_GAME;

  const { writeContract } = useWriteContract();

  // Read monster count
  const { data: monsterCount } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: BATTLE_GAME_ABI,
    functionName: 'monsterCount',
  });

  // Check if player can battle
  const { data: canBattle } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: BATTLE_GAME_ABI,
    functionName: 'canBattle',
    args: [address],
  });

  useEffect(() => {
    if (canBattle !== undefined) {
      setCanBattleNow(canBattle as boolean);
    }
  }, [canBattle]);

  // Load monsters
  useEffect(() => {
    const loadMonsters = async () => {
      if (!monsterCount || !contractAddress) return;
      
      const loadedMonsters: Monster[] = [];
      const count = Number(monsterCount);
      
      for (let i = 0; i < count; i++) {
        // In a real app, you'd use useReadContract for each monster
        // For now, we'll mock the data
        loadedMonsters.push({
          health: 100 + i * 100,
          minAttackPower: 20 + i * 20,
          maxAttackPower: 50 + i * 30,
          isActive: true
        });
      }
      
      setMonsters(loadedMonsters);
    };
    
    loadMonsters();
  }, [monsterCount, contractAddress]);

  const handleBattle = async (monsterId: number) => {
    if (!address || !chain) return;

    try {
      writeContract({
        address: contractAddress as `0x${string}`,
        abi: BATTLE_GAME_ABI,
        functionName: 'battleMonster',
        args: [BigInt(monsterId)],
      });
    } catch (error) {
      console.error('Battle failed:', error);
    }
  };

  const getMonsterName = (index: number) => {
    const names = ['Goblin', 'Orc', 'Dragon'];
    return names[index] || `Monster ${index + 1}`;
  };

  const getMonsterEmoji = (index: number) => {
    const emojis = ['👺', '🧌', '🐉'];
    return emojis[index] || '👾';
  };

  return (
    <div className="battle-interface">
      <h2>⚔️ Battle Arena</h2>
      
      {!canBattleNow && (
        <div className="cooldown-notice">
          <p>⏳ Battle cooldown active. Please wait before your next battle.</p>
        </div>
      )}
      
      <div className="monsters-grid">
        {monsters.map((monster, index) => (
          <div key={index} className="monster-card">
            <div className="monster-emoji">{getMonsterEmoji(index)}</div>
            <h3>{getMonsterName(index)}</h3>
            <div className="monster-stats">
              <p>❤️ Health: {monster.health}</p>
              <p>⚔️ Min Attack Needed: {monster.minAttackPower}</p>
              <p>🛡️ Max Attack for Victory: {monster.maxAttackPower}</p>
            </div>
            <button
              onClick={() => handleBattle(index)}
              disabled={!canBattleNow || !monster.isActive}
              className={`battle-button ${!canBattleNow ? 'disabled' : ''}`}
            >
              {canBattleNow ? 'Fight!' : 'Cooldown'}
            </button>
          </div>
        ))}
      </div>
      
      {monsters.length === 0 && (
        <p>Loading monsters...</p>
      )}
    </div>
  );
};

export default BattleInterface;