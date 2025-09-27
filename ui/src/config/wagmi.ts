import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia, hardhat } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'FHE Battle Game',
  projectId: 'fhe-battle-game', // Replace with your WalletConnect project ID
  chains: [sepolia, hardhat],
  ssr: false,
});