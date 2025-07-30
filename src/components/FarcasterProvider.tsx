'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { farcasterSDK } from '@/lib/farcaster';
import { FarcasterUser, FarcasterError, type FarcasterContext } from '@/types/farcaster';

interface FarcasterContextType {
  isLoading: boolean;
  isReady: boolean;
  user: FarcasterUser | null;
  context: FarcasterContext | null;
  error: FarcasterError | null;
  sdk: typeof farcasterSDK;
  isInFrame: boolean;
  isMiniAppContext: boolean;
  openUrl: (url: string) => Promise<void>;
  close: (payload?: Record<string, unknown>) => Promise<void>;
}

const FarcasterContext = createContext<FarcasterContextType | undefined>(undefined);

interface FarcasterProviderProps {
  children: ReactNode;
}

export function FarcasterProvider({ children }: FarcasterProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<FarcasterUser | null>(null);
  const [context, setContext] = useState<FarcasterContext | null>(null);
  const [error, setError] = useState<FarcasterError | null>(null);

  useEffect(() => {
    async function initializeSDK() {
      try {
        setIsLoading(true);
        setError(null);
        
        await farcasterSDK.initialize();
        
        setIsReady(farcasterSDK.isReady());
        setUser(farcasterSDK.getUser());
        setContext(farcasterSDK.getContext());
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize SDK';
        
        // Don't treat "not in Farcaster client" as an error - it's expected behavior
        if (errorMessage.includes('Not in Farcaster client')) {
          console.log('App running outside Farcaster client - Farcaster features disabled');
          setIsReady(false);
          setUser(null);
          setContext(null);
          setError(null); // Clear any previous errors
        } else {
          // Only set error for actual initialization problems
          console.error('Failed to initialize Farcaster SDK:', err);
          setError({
            code: 'SDK_INIT_ERROR',
            message: errorMessage,
            details: { originalError: err }
          });
        }
      } finally {
        setIsLoading(false);
      }
    }

    // Only initialize if we're in a browser environment
    if (typeof window !== 'undefined') {
      initializeSDK();
    } else {
      setIsLoading(false);
    }
  }, []);

  const openUrl = async (url: string) => {
    try {
      await farcasterSDK.openUrl(url);
    } catch (err) {
      setError({
        code: 'OPEN_URL_ERROR',
        message: err instanceof Error ? err.message : 'Failed to open URL',
        details: { url, originalError: err }
      });
      throw err;
    }
  };

  const close = async (payload?: Record<string, unknown>) => {
    try {
      await farcasterSDK.close(payload);
    } catch (err) {
      setError({
        code: 'CLOSE_ERROR',
        message: err instanceof Error ? err.message : 'Failed to close frame',
        details: { payload, originalError: err }
      });
      throw err;
    }
  };

  const value: FarcasterContextType = {
    isLoading,
    isReady,
    user,
    context,
    error,
    sdk: farcasterSDK,
    isInFrame: farcasterSDK.isInFrame(),
    isMiniAppContext: farcasterSDK.isMiniAppContext(),
    openUrl,
    close
  };

  return (
    <FarcasterContext.Provider value={value}>
      {children}
    </FarcasterContext.Provider>
  );
}

export function useFarcaster() {
  const context = useContext(FarcasterContext);
  if (context === undefined) {
    throw new Error('useFarcaster must be used within a FarcasterProvider');
  }
  return context;
}

// Hook for checking if we're in a Farcaster Mini App context
export function useMiniAppContext() {
  const { context, isReady } = useFarcaster();
  return {
    isInMiniApp: isReady && context !== null,
    contextType: context?.type,
    context
  };
} 