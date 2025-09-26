# FHE Battle Game Frontend

A fully homomorphic encryption (FHE) powered battle game built with React, TypeScript, and Zama's FHE technology.

## Features

- 🔐 **Encrypted Attack Power**: Player attack values are fully encrypted on-chain
- ⚔️ **Private Battles**: Battle outcomes computed on encrypted data
- 🪙 **Confidential Rewards**: Earn encrypted GOLD tokens
- 🛡️ **Complete Privacy**: Only you can decrypt your own data

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Blockchain**: Ethereum + Hardhat
- **Wallet**: RainbowKit + Wagmi + Viem
- **Encryption**: Zama FHE SDK
- **Styling**: Custom CSS (no Tailwind)

## Getting Started

### Prerequisites

- Node.js 20+
- MetaMask or compatible wallet
- Access to Sepolia testnet

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Environment Setup

The app is configured to work with:
- **Sepolia Testnet** (Chain ID: 11155111) 
- **Local Hardhat** (Chain ID: 31337)

## Game Flow

### 1. Connect Wallet
- Click "Connect Wallet" to connect your MetaMask or compatible wallet
- Make sure you're on Sepolia testnet

### 2. Register Player
- Click "Register Player" to join the game
- Your attack power will be randomly generated and encrypted on-chain
- Only you can decrypt and view your attack power

### 3. Battle Monsters
- Choose from available monsters (Goblin, Orc, Dragon)
- Each monster has different health and attack requirements
- Battle outcomes are computed using encrypted values
- Win battles to earn 100 GOLD tokens, lose to earn 10 GOLD tokens

### 4. View Stats
- See your encrypted GOLD balance
- Decrypt your attack power using FHE
- Track your battle history

## Architecture

### Smart Contracts

Located in `../contracts/`:
- `FHEBattleGame.sol`: Main game logic with encrypted state
- `ConfidentialGold.sol`: Encrypted ERC20 token

### Frontend Components

- `FHEProvider`: Manages FHE SDK initialization
- `PlayerRegistration`: Handles new player signup
- `BattleInterface`: Monster selection and battles
- `PlayerStats`: Displays encrypted player data

### Encryption Flow

1. **Registration**: Random attack power encrypted on-chain
2. **Battles**: Encrypted comparisons determine outcomes
3. **Rewards**: Encrypted token minting based on results
4. **Decryption**: Users can decrypt their own data client-side

## Configuration

### Contract Addresses

Update addresses in `src/config/contracts.ts` after deployment:

```typescript
export const CONTRACTS = {
  SEPOLIA: {
    GOLD_TOKEN: '0x...', // ConfidentialGold contract address
    BATTLE_GAME: '0x...', // FHEBattleGame contract address
  },
  // ...
};
```

### Wallet Configuration

RainbowKit configuration in `src/config/wagmi.ts`:
- Replace `projectId` with your WalletConnect project ID
- Customize supported chains as needed

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Lint TypeScript files

### Building

```bash
npm run build
```

Built files will be in the `dist/` directory.

## Privacy Features

### Encrypted Data Types

- **Attack Power**: `euint32` - encrypted 32-bit integer
- **GOLD Balance**: `euint32` - encrypted token balance
- **Battle Results**: Computed on encrypted values

### Decryption

Users can decrypt their own data using:
1. FHE keypair generation
2. EIP-712 signature for authorization
3. Client-side decryption via Zama SDK

### Access Control

- Smart contracts use Zama's ACL system
- Only authorized addresses can access encrypted data
- Users control access to their private information

## Troubleshooting

### Common Issues

1. **"FHE Initialization Failed"**
   - Check network connection
   - Verify Zama relayer availability
   - Try refreshing the page

2. **"Transaction Failed"**
   - Ensure you have enough Sepolia ETH for gas
   - Check contract addresses are correct
   - Verify you're on the right network

3. **"Decryption Failed"**
   - Make sure you have permission to decrypt the data
   - Check that the encrypted value exists
   - Try signing the decryption request again

### Getting Help

- [Zama Documentation](https://docs.zama.ai/)
- [Discord Community](https://discord.com/invite/fhe-org)
- [GitHub Issues](https://github.com/your-repo/issues)

## Security Notes

⚠️ **This is a demonstration project for educational purposes.**

- Do not use real funds beyond testnet tokens
- Smart contracts have not been audited
- Always verify transactions before signing

## License

MIT License - see LICENSE file for details.
