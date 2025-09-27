// Fill with Sepolia addresses after deployment
export const CONTRACTS = {
  FHEBattle: '0xF1cc9cb8fF054140eAf98e52B829A2447514fED7',
  ConfidentialGold: '0x2b424dD864B72D1d50D82045b1A4428C4f612a62',
} as const;

export const RELAYER = {
  url: 'https://relayer.testnet.zama.cloud',
} as const;

export const CHAIN = {
  id: 11155111,
  name: 'Sepolia',
  rpcUrl: 'https://sepolia.infura.io/v3/REPLACE_WITH_KEY',
} as const;
