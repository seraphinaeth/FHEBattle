import React, { createContext, useContext, type ReactNode } from 'react';
import { useFHE } from '../hooks/useFHE';
import type { FhevmInstance } from '../lib/mockFHE';

interface FHEContextType {
  instance: FhevmInstance | null;
  isLoading: boolean;
  error: string | null;
  encryptUint32: (value: number, contractAddress: string, userAddress: string) => Promise<{
    handle: string;
    inputProof: string;
  }>;
  decryptUint32: (
    ciphertextHandle: string,
    contractAddress: string,
    userAddress: string,
    signer: any
  ) => Promise<any>;
  publicDecrypt: (handles: string[]) => Promise<any>;
}

const FHEContext = createContext<FHEContextType | null>(null);

interface FHEProviderProps {
  children: ReactNode;
}

export const FHEProvider: React.FC<FHEProviderProps> = ({ children }) => {
  const fheHook = useFHE();

  return (
    <FHEContext.Provider value={fheHook}>
      {children}
    </FHEContext.Provider>
  );
};

export const useFHEContext = (): FHEContextType => {
  const context = useContext(FHEContext);
  if (!context) {
    throw new Error('useFHEContext must be used within FHEProvider');
  }
  return context;
};

// Loading component for FHE initialization
export const FHELoadingScreen: React.FC = () => (
  <div className="fhe-loading-screen">
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <h2>🔐 Initializing FHE Encryption</h2>
      <p>Setting up confidential computing environment...</p>
    </div>
  </div>
);

// Error component for FHE initialization failures
interface FHEErrorScreenProps {
  error: string;
  onRetry?: () => void;
}

export const FHEErrorScreen: React.FC<FHEErrorScreenProps> = ({ error, onRetry }) => (
  <div className="fhe-error-screen">
    <div className="error-container">
      <h2>❌ FHE Initialization Failed</h2>
      <p>{error}</p>
      {onRetry && (
        <button onClick={onRetry} className="retry-button">
          Try Again
        </button>
      )}
    </div>
  </div>
);