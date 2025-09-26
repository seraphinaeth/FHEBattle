import { useState, useEffect } from 'react';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, ConnectButton } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAccount, useReadContract } from 'wagmi';
import { config } from './config/wagmi';
import { CONTRACTS, BATTLE_GAME_ABI } from './config/contracts';
import { FHEProvider, FHELoadingScreen, FHEErrorScreen, useFHEContext } from './components/FHEProvider';
import PlayerRegistration from './components/PlayerRegistration';
import BattleInterface from './components/BattleInterface';
import PlayerStats from './components/PlayerStats';
import './App.css';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

function GameAppContent() {
  const { address, chain, isConnected } = useAccount();
  const { isLoading: fheLoading, error: fheError } = useFHEContext();
  const [isRegistered, setIsRegistered] = useState<boolean>(false);

  // Show FHE loading screen
  if (fheLoading) {
    return <FHELoadingScreen />;
  }

  // Show FHE error screen
  if (fheError) {
    return <FHEErrorScreen error={fheError} />;
  }

  const contractAddress = chain?.id === 11155111 
    ? CONTRACTS.SEPOLIA.BATTLE_GAME 
    : CONTRACTS.HARDHAT.BATTLE_GAME;

  // Check if player is registered
  const { data: playerData } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: BATTLE_GAME_ABI,
    functionName: 'players',
    args: [address],
    query: {
      enabled: !!address && !!contractAddress,
    }
  });

  useEffect(() => {
    if (playerData) {
      // playerData is a tuple: [attackPower, isRegistered, lastBattleTime]
      const [, registered] = playerData as [bigint, boolean, bigint];
      setIsRegistered(registered);
    }
  }, [playerData]);

  const handleRegistrationSuccess = () => {
    setIsRegistered(true);
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>🛡️ FHE Battle Game</h1>
        <p>A confidential battle game powered by Fully Homomorphic Encryption</p>
        <ConnectButton />
      </header>

      <main className="app-main">
        {!isConnected ? (
          <div className="welcome-screen">
            <h2>Welcome to FHE Battle!</h2>
            <p>Connect your wallet to start playing</p>
            <div className="features">
              <div className="feature">
                <span className="feature-icon">🔐</span>
                <h3>Encrypted Attack Power</h3>
                <p>Your attack power is encrypted on-chain using Zama's FHE</p>
              </div>
              <div className="feature">
                <span className="feature-icon">⚔️</span>
                <h3>Private Battles</h3>
                <p>Battle outcomes are computed on encrypted data</p>
              </div>
              <div className="feature">
                <span className="feature-icon">🪙</span>
                <h3>Earn GOLD Tokens</h3>
                <p>Win battles to earn confidential GOLD tokens</p>
              </div>
            </div>
          </div>
        ) : !isRegistered ? (
          <PlayerRegistration onRegistrationSuccess={handleRegistrationSuccess} />
        ) : (
          <div className="game-interface">
            <div className="game-layout">
              <div className="left-panel">
                <PlayerStats isRegistered={isRegistered} />
              </div>
              <div className="right-panel">
                <BattleInterface />
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>Built with ❤️ using Zama's FHE technology</p>
        <div className="footer-links">
          <a href="https://docs.zama.ai" target="_blank" rel="noopener noreferrer">
            📚 Zama Docs
          </a>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer">
            💻 GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <FHEProvider>
            <GameAppContent />
          </FHEProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;