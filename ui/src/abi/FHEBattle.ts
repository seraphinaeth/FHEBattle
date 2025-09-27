// Auto-replaced by scripts/copy-abi.ts after deployment
export const FHEBattleABI = [
  { inputs: [{ internalType: 'address', name: 'goldToken', type: 'address' }], stateMutability: 'nonpayable', type: 'constructor' },
  { inputs: [], name: 'register', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  {
    inputs: [
      { internalType: 'bytes32', name: 'encMonster', type: 'bytes32' },
      { internalType: 'bytes', name: 'inputProof', type: 'bytes' },
    ],
    name: 'attackMonster',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  { inputs: [{ internalType: 'address', name: 'player', type: 'address' }], name: 'getAttack', outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ internalType: 'address', name: 'player', type: 'address' }], name: 'getLastBattleWin', outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ internalType: 'address', name: 'player', type: 'address' }], name: 'isRegistered', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'gold', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'owner', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'renounceOwnership', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ internalType: 'address', name: 'newOwner', type: 'address' }], name: 'transferOwnership', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { anonymous: false, inputs: [{ indexed: true, internalType: 'address', name: 'player', type: 'address' }], name: 'PlayerRegistered', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, internalType: 'address', name: 'player', type: 'address' }], name: 'MonsterAttacked', type: 'event' },
] as const;

