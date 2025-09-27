// Mock implementation for development when Zama SDK is not available
export interface FhevmInstance {
  createEncryptedInput(contractAddress: string, userAddress: string): EncryptedInputBuffer;
  generateKeypair(): { publicKey: string; privateKey: string };
  createEIP712(
    publicKey: string,
    contractAddresses: string[],
    startTimeStamp: string,
    durationDays: string
  ): {
    domain: any;
    types: { UserDecryptRequestVerification: any };
    message: any;
  };
  userDecrypt(
    handleContractPairs: Array<{ handle: string; contractAddress: string }>,
    privateKey: string,
    publicKey: string,
    signature: string,
    contractAddresses: string[],
    userAddress: string,
    startTimeStamp: string,
    durationDays: string
  ): Promise<any>;
  publicDecrypt(handles: string[]): Promise<any>;
}

export interface EncryptedInputBuffer {
  add32(value: bigint): void;
  encrypt(): Promise<{
    handles: string[];
    inputProof: string;
  }>;
}

class MockEncryptedInputBuffer implements EncryptedInputBuffer {
  private values: bigint[] = [];

  add32(value: bigint): void {
    this.values.push(value);
  }

  async encrypt(): Promise<{ handles: string[]; inputProof: string }> {
    // Mock encryption - in production this would use real FHE
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
    
    return {
      handles: this.values.map((_, i) => `0x${Math.random().toString(16).substr(2, 8)}...${i}`),
      inputProof: `0x${Math.random().toString(16).substr(2, 64)}`
    };
  }
}

class MockFhevmInstance implements FhevmInstance {
  createEncryptedInput(_contractAddress: string, _userAddress: string): EncryptedInputBuffer {
    return new MockEncryptedInputBuffer();
  }

  generateKeypair(): { publicKey: string; privateKey: string } {
    return {
      publicKey: `0x${Math.random().toString(16).substr(2, 64)}`,
      privateKey: `0x${Math.random().toString(16).substr(2, 64)}`
    };
  }

  createEIP712(
    _publicKey: string,
    _contractAddresses: string[],
    _startTimeStamp: string,
    _durationDays: string
  ): { domain: any; types: { UserDecryptRequestVerification: any }; message: any } {
    return {
      domain: {
        name: "FHE Battle Game",
        version: "1.0.0",
        chainId: 11155111,
        verifyingContract: "0x0000000000000000000000000000000000000000"
      },
      types: {
        UserDecryptRequestVerification: [
          { name: "publicKey", type: "string" },
          { name: "contractAddress", type: "address" },
          { name: "startTimeStamp", type: "uint256" },
          { name: "durationDays", type: "uint256" }
        ]
      },
      message: {
        publicKey: _publicKey,
        contractAddress: _contractAddresses[0],
        startTimeStamp: _startTimeStamp,
        durationDays: _durationDays
      }
    };
  }

  async userDecrypt(
    handleContractPairs: Array<{ handle: string; contractAddress: string }>,
    _privateKey: string,
    _publicKey: string,
    _signature: string,
    _contractAddresses: string[],
    _userAddress: string,
    _startTimeStamp: string,
    _durationDays: string
  ): Promise<any> {
    // Mock decryption
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const result: any = {};
    for (const pair of handleContractPairs) {
      // Mock decrypted value - random number between 20-120
      result[pair.handle] = Math.floor(Math.random() * 100) + 20;
    }
    
    return result;
  }

  async publicDecrypt(handles: string[]): Promise<any> {
    // Mock public decryption
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const result: any = {};
    for (const handle of handles) {
      result[handle] = Math.floor(Math.random() * 1000);
    }
    
    return result;
  }
}

export const SepoliaConfig = {
  aclContractAddress: "0x687820221192C5B662b25367F70076A37bc79b6c",
  kmsContractAddress: "0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC",
  inputVerifierContractAddress: "0xbc91f3daD1A5F19F8390c400196e58073B6a0BC4",
  verifyingContractAddressDecryption: "0xb6E160B1ff80D67Bfe90A85eE06Ce0A2613607D1",
  verifyingContractAddressInputVerification: "0x7048C39f048125eDa9d678AEbaDfB22F7900a29F",
  chainId: 11155111,
  gatewayChainId: 55815,
  relayerUrl: "https://relayer.testnet.zama.cloud",
};

export async function createInstance(_config: any): Promise<FhevmInstance> {
  // Simulate initialization delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  return new MockFhevmInstance();
}