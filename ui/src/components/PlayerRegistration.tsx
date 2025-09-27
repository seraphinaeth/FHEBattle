import React, { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS, BATTLE_GAME_ABI } from '../config/contracts';

interface PlayerRegistrationProps {
  onRegistrationSuccess: () => void;
}

const PlayerRegistration: React.FC<PlayerRegistrationProps> = ({ onRegistrationSuccess: _onRegistrationSuccess }) => {
  const { address, chain } = useAccount();
  const [isRegistering, setIsRegistering] = useState(false);

  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
  });

  const handleRegister = async () => {
    if (!address || !chain) return;
    
    setIsRegistering(true);
    
    try {
      const contractAddress = chain.id === 11155111 
        ? CONTRACTS.SEPOLIA.BATTLE_GAME 
        : CONTRACTS.HARDHAT.BATTLE_GAME;

      writeContract({
        address: contractAddress as `0x${string}`,
        abi: BATTLE_GAME_ABI,
        functionName: 'registerPlayer',
      });
      
      // Note: In a real app, you'd wait for transaction confirmation
      // and then call onRegistrationSuccess()
    } catch (error) {
      console.error('Registration failed:', error);
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="registration-container">
      <h2>Welcome to FHE Battle Game!</h2>
      <p>Register to start your adventure with encrypted attack power!</p>
      
      <button 
        onClick={handleRegister}
        disabled={!address || isRegistering || isConfirming}
        className="register-button"
      >
        {isRegistering || isConfirming ? 'Registering...' : 'Register Player'}
      </button>
      
      {!address && (
        <p className="warning">Please connect your wallet to register</p>
      )}
    </div>
  );
};

export default PlayerRegistration;