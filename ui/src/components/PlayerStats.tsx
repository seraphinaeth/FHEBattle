import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { useFHEContext } from './FHEProvider';
import { CONTRACTS, BATTLE_GAME_ABI, GOLD_TOKEN_ABI } from '../config/contracts';

interface PlayerStatsProps {
  isRegistered: boolean;
}

const PlayerStats: React.FC<PlayerStatsProps> = ({ isRegistered }) => {
  const { address, chain } = useAccount();
  const { decryptUint32: _decryptUint32 } = useFHEContext();
  const [goldBalance, setGoldBalance] = useState<string>('0');
  const [attackPower, setAttackPower] = useState<string>('Hidden');
  const [lastBattleTime, setLastBattleTime] = useState<string>('Never');
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);

  const contractAddress = chain?.id === 11155111 
    ? CONTRACTS.SEPOLIA.BATTLE_GAME 
    : CONTRACTS.HARDHAT.BATTLE_GAME;

  const goldTokenAddress = chain?.id === 11155111 
    ? CONTRACTS.SEPOLIA.GOLD_TOKEN 
    : CONTRACTS.HARDHAT.GOLD_TOKEN;

  // Get encrypted attack power handle
  const { data: playerData } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: BATTLE_GAME_ABI,
    functionName: 'getPlayerAttackPower',
    query: {
      enabled: isRegistered && !!address && !!contractAddress,
    }
  });

  // Get encrypted GOLD balance handle
  const { data: goldBalanceData } = useReadContract({
    address: goldTokenAddress as `0x${string}`,
    abi: GOLD_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address],
    query: {
      enabled: isRegistered && !!address && !!goldTokenAddress,
    }
  });

  useEffect(() => {
    if (isRegistered && address) {
      // In a real implementation, you would decrypt the GOLD balance here
      // For now, we'll show it as encrypted
      setGoldBalance('🔐 Encrypted');
      setLastBattleTime(new Date(Date.now() - 300000).toLocaleString());
    }
  }, [isRegistered, address, goldBalanceData]);

  const handleDecryptAttackPower = async () => {
    if (!address || !contractAddress || !playerData) return;
    
    setIsDecrypting(true);
    
    try {
      // Get signer from wagmi (you'll need to implement this)
      // const signer = await getWalletClient();
      
      // For now, we'll simulate decryption
      // const decryptedValue = await decryptUint32(
      //   playerData as string,
      //   contractAddress,
      //   address,
      //   signer
      // );
      
      // Mock decrypted value for demo
      const mockDecryptedValue = Math.floor(Math.random() * 100) + 20;
      setAttackPower(`🔓 ${mockDecryptedValue}`);
    } catch (error) {
      console.error('Decryption failed:', error);
      setAttackPower('❌ Decryption failed');
    } finally {
      setIsDecrypting(false);
    }
  };

  if (!isRegistered) {
    return null;
  }

  return (
    <div className="player-stats">
      <h3>📊 Player Stats</h3>
      
      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-label">🪙 GOLD Balance:</span>
          <span className="stat-value">{goldBalance}</span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">⚔️ Attack Power:</span>
          <span className="stat-value">
            {attackPower}
            {attackPower === 'Hidden' && (
              <button 
                onClick={handleDecryptAttackPower}
                disabled={isDecrypting}
                className="decrypt-button"
                title="Decrypt your attack power using FHE"
              >
                {isDecrypting ? '🔄 Decrypting...' : '🔐 Decrypt'}
              </button>
            )}
          </span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">🕐 Last Battle:</span>
          <span className="stat-value">{lastBattleTime}</span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">📍 Address:</span>
          <span className="stat-value address">
            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'N/A'}
          </span>
        </div>
      </div>
      
      <div className="privacy-note">
        <p>🔒 Your attack power is encrypted on-chain. Only you can decrypt it!</p>
      </div>
    </div>
  );
};

export default PlayerStats;