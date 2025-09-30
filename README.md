# FHEBattle — Confidential On‑Chain RPG with Zama FHE

FHEBattle is a fully on‑chain mini‑RPG demonstrating how Zama’s FHEVM enables private gameplay and confidential assets. Players register to receive an encrypted attack power, fight monsters with encrypted outcomes, and earn a confidential fungible token (GOLD) as rewards — all without exposing sensitive data on‑chain.

The core idea: keep player stats and battle results encrypted end‑to‑end, while still executing game logic and rewards on a public blockchain.

## Highlights

- Confidential gameplay: player attack power and battle outcomes remain encrypted on‑chain
- Encrypted rewards: GOLD is a confidential fungible token minted based on encrypted results
- Real mainnet‑style UX: read via `viem`, write via `ethers`, wallet connect via RainbowKit/Wagmi
- Clean separation: contracts, tasks, tests, and a standalone React + Vite frontend (`ui`)

## What This Solves

- Player privacy: stats and outcomes are never revealed on‑chain unless the player decrypts
- Front‑running and targeting: hidden information reduces MEV and griefing vectors
- Verifiable fairness: results are computed on‑chain from inputs, yet kept confidential
- Composable assets: confidential tokens interoperate with the wider ecosystem via FHEVM

## Tech Stack

- Contracts: Hardhat, TypeScript, OpenZeppelin
- FHE: Zama FHEVM (contract lib + Sepolia config) and Relayer SDK for user decryption
- Frontend: React + Vite + Wagmi + RainbowKit; `ethers` for writes, `viem` for reads
- Package manager: npm; Node.js v20+

Key files:

- contracts/FHEBattle.sol:1 — main game logic (encrypted stats, fights, rewards)
- contracts/ConfidentialGold.sol:1 — confidential fungible token (GOLD)
- deploy/deploy.ts:1 — deploys GOLD then FHEBattle and authorizes minter
- tasks/FHEBattle.ts:1 — helper tasks for register/attack/decrypt
- test/FHEBattle.ts:1 — focused unit tests on a mock FHEVM
- ui/src/components/BattleApp.tsx:1 — end‑user UI (connect, register, attack, decrypt)

## How It Works

1) Register and get encrypted attack power

- On `register()`, the contract derives a pseudo‑random attack value in [10, 100], encrypts it (`euint32`), stores it, and grants ACL to the player for decryption. See contracts/FHEBattle.sol:23.

2) Battle monsters with encrypted outcomes

- `attackMonster()` derives a pseudo‑random monster strength [10, 100], compares it homomorphically against the player’s encrypted attack, records the encrypted win/lose (`ebool`), and emits an event. See contracts/FHEBattle.sol:49.

3) Confidential GOLD rewards

- The reward is computed homomorphically: 100 GOLD for win, 10 GOLD for loss (`euint64`). A transient ACL allows the GOLD contract to consume the encrypted amount, which is then minted to the player. See contracts/FHEBattle.sol:61 and contracts/ConfidentialGold.sol:34.

4) Decrypt client‑side through Zama Relayer SDK

- The frontend never stores plaintext on‑chain. It fetches ciphertext handles, then the user decrypts locally via Zama’s Relayer SDK. Batch decryption is supported for better UX. See ui/src/components/BattleApp.tsx:71 and ui/src/hooks/useZamaInstance.ts:1.

## Architecture

- ConfidentialGold (ConfidentialFungibleToken)
  - Extends Zama’s confidential FT to represent GOLD
  - Owner‑managed minter authorization so FHEBattle can mint rewards
  - File: contracts/ConfidentialGold.sol:1

- FHEBattle (game contract)
  - Stores `euint32` attack power per player and `ebool` last battle result
  - No view uses `msg.sender`; all views accept explicit `address` per the rule
  - Grants ACL to allow the player to decrypt their own data
  - Computes rewards and mints encrypted GOLD via authorized minter path
  - File: contracts/FHEBattle.sol:1

- Deployment
  - Deploy GOLD, then FHEBattle with GOLD address, then authorize FHEBattle as GOLD minter
  - File: deploy/deploy.ts:1

- CLI tasks
  - `battle:address`, `battle:register`, `battle:attack`, `battle:decrypt`
  - File: tasks/FHEBattle.ts:1

- Frontend
  - Reads: `viem` public client
  - Writes: `ethers` signer
  - Wallets: RainbowKit + Wagmi
  - Decryption: Zama Relayer SDK, with EIP‑712 signing and batch userDecrypt
  - Files: ui/src/components/BattleApp.tsx:1, ui/src/config/contracts-battle.ts:1

## Setup

Prerequisites

- Node.js 20+
- npm
- A funded wallet on Sepolia for contract deployment and interactions
- Infura (or equivalent) API key for Sepolia RPC

Install dependencies

```bash
npm install
```

Project configuration

```bash
# Required for Hardhat
npx hardhat vars set MNEMONIC
npx hardhat vars set INFURA_API_KEY

# Optional: contract verification
npx hardhat vars set ETHERSCAN_API_KEY
```

Compile and test (local FHEVM mock)

```bash
npm run compile
npm run test
```

Deploy

1) Local (for iteration/tests)

```bash
npx hardhat node
npx hardhat deploy --network localhost
```

2) Sepolia

```bash
npx hardhat deploy --network sepolia
```

Record deployed addresses

- Run the helper to print deployed addresses:

```bash
npx hardhat battle:address --network sepolia
```

Frontend configuration (ui)

- Update `ui/src/config/contracts-battle.ts` with:
  - `CONTRACTS.FHEBattle` and `CONTRACTS.ConfidentialGold` set to the deployed Sepolia addresses
  - `CHAIN.rpcUrl` using your Sepolia RPC (e.g., Infura key)
  - `RELAYER.url` left as Zama’s testnet relayer unless you host your own
- ABIs: copy from `deployments/sepolia` and generate TS exports in `ui/src/abi/` (already included in this repo and marked as auto‑generated)
- WalletConnect: set `projectId` in `ui/src/config/wagmi.ts`

Run the frontend

```bash
cd ui
npm install
npm run dev
```

Note: the frontend is configured for Sepolia only and does not rely on localhost networks or localStorage.

## Using The App

From the UI (ui):

1) Connect wallet (Sepolia)
2) Register to mint your encrypted attack power
3) Attack monster; rewards are minted confidentially to your GOLD balance
4) Click Decrypt to locally decrypt attack, last result, and GOLD balance

From CLI tasks:

```bash
# Register (uses first signer)
npx hardhat battle:register --network sepolia

# Attack
npx hardhat battle:attack --network sepolia

# Decrypt attack/result/balance for the first signer
npx hardhat battle:decrypt --network sepolia
```

## Design Notes and Advantages

- Privacy by default: All sensitive values are `euint`/`ebool` inside the contracts and never emitted in plaintext
- Access control lists (ACL): Explicit `FHE.allow(...)` grants let only the player decrypt their own values
- Clean read/write split: reads via `viem`, writes via `ethers` keeps UX fast and safe
- Batched decryption: userDecrypt accepts multiple ciphertext handles in one flow for better UX
- Testability: a mock FHEVM environment enables deterministic unit tests

## Security and Limitations

- Pseudo‑randomness: current random derivations use block data; for production, integrate VRF or an oracle
- Confidential tokens: GOLD is a confidential FT; follow FHEVM best practices for ACL and mint controls
- Gas and latency: FHE operations and decryption flows have overheads; batch and cache where appropriate client‑side

## Roadmap

- Verifiable randomness: integrate Chainlink VRF (or FHE‑friendly randomness)
- Better game design: item NFTs, loot tables, monster tiers, energy/stamina
- Social and PvP: encrypted PvP duels, guilds, leaderboards with zk attestations
- Cross‑game composability: use GOLD across partner games; marketplace for confidential assets
- Performance: optimize on‑chain ops; relayer/CDN options for faster client decryption
- Multi‑chain: support additional FHEVM‑enabled L2s

## Scripts

- `npm run compile` — compile contracts
- `npm run test` — run tests (mock FHEVM)
- `npm run lint` — lint
- `npm run clean` — clean artifacts

Frontend (ui):

- `npm run dev` — start Vite dev server
- `npm run build` — build production bundle
- `npm run preview` — preview built app

## License

BSD‑3‑Clause‑Clear. See LICENSE.

## Acknowledgements

- Zama FHEVM and Relayer SDK — enabling confidential smart contracts and user decryption
- OpenZeppelin — battle‑tested base contracts
