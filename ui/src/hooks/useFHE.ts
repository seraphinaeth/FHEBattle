import { useState, useEffect, useRef } from 'react';
// Temporarily using mock implementation
// import { createInstance, SepoliaConfig, type FhevmInstance } from '@zama-fhe/relayer-sdk';
import { createInstance, SepoliaConfig, type FhevmInstance } from '../lib/mockFHE';

export const useFHE = () => {
  const [instance, setInstance] = useState<FhevmInstance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initAttempted = useRef(false);

  useEffect(() => {
    const initializeFHE = async () => {
      if (initAttempted.current) return;
      initAttempted.current = true;

      try {
        setIsLoading(true);
        setError(null);

        // Initialize the FHE instance
        const fheInstance = await createInstance({
          ...SepoliaConfig,
          // You might need to customize these values based on your setup
          network: window.ethereum || 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
        });

        setInstance(fheInstance);
      } catch (err) {
        console.error('Failed to initialize FHE:', err);
        setError('Failed to initialize FHE encryption');
      } finally {
        setIsLoading(false);
      }
    };

    initializeFHE();
  }, []);

  const encryptUint32 = async (value: number, contractAddress: string, userAddress: string) => {
    if (!instance) throw new Error('FHE instance not initialized');

    try {
      // Create encrypted input buffer
      const input = instance.createEncryptedInput(contractAddress, userAddress);
      input.add32(BigInt(value));
      
      // Encrypt the input
      const encryptedInput = await input.encrypt();
      
      return {
        handle: encryptedInput.handles[0],
        inputProof: encryptedInput.inputProof,
      };
    } catch (err) {
      console.error('Encryption failed:', err);
      throw new Error('Failed to encrypt value');
    }
  };

  const decryptUint32 = async (
    ciphertextHandle: string,
    contractAddress: string,
    userAddress: string,
    signer: any // ethers Signer
  ) => {
    if (!instance) throw new Error('FHE instance not initialized');

    try {
      // Generate keypair for decryption
      const keypair = instance.generateKeypair();
      
      // Create handle-contract pairs
      const handleContractPairs = [
        {
          handle: ciphertextHandle,
          contractAddress: contractAddress,
        },
      ];
      
      // Set up EIP712 signature data
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = "10";
      const contractAddresses = [contractAddress];
      
      const eip712 = instance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTimeStamp,
        durationDays
      );
      
      // Sign the decryption request
      const signature = await signer.signTypedData(
        eip712.domain,
        {
          UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
        },
        eip712.message
      );
      
      // Perform decryption
      const result = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace("0x", ""),
        contractAddresses,
        userAddress,
        startTimeStamp,
        durationDays
      );
      
      return result[ciphertextHandle];
    } catch (err) {
      console.error('Decryption failed:', err);
      throw new Error('Failed to decrypt value');
    }
  };

  const publicDecrypt = async (handles: string[]) => {
    if (!instance) throw new Error('FHE instance not initialized');

    try {
      const decryptedValues = await instance.publicDecrypt(handles);
      return decryptedValues;
    } catch (err) {
      console.error('Public decryption failed:', err);
      throw new Error('Failed to decrypt public values');
    }
  };

  return {
    instance,
    isLoading,
    error,
    encryptUint32,
    decryptUint32,
    publicDecrypt,
  };
};