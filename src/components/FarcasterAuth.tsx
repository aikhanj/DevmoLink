'use client';

import React, { useState, useEffect } from 'react';
import { useFarcaster } from './FarcasterProvider';
import { AuthSession, FarcasterUser } from '@/types/farcaster';

interface FarcasterAuthProps {
  onAuthSuccess?: (session: AuthSession) => void;
  onAuthError?: (error: string) => void;
  redirectUrl?: string;
}

export function FarcasterAuth({ 
  onAuthSuccess, 
  onAuthError, 
  redirectUrl 
}: FarcasterAuthProps) {
  const { user, isReady, isInFrame, openUrl } = useFarcaster();
  const [authState, setAuthState] = useState<'idle' | 'signing' | 'verifying' | 'success' | 'error'>('idle');
  const [session, setSession] = useState<AuthSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing session
    const existingSession = getStoredSession();
    if (existingSession && isValidSession(existingSession)) {
      setSession(existingSession);
      setAuthState('success');
      if (onAuthSuccess) {
        onAuthSuccess(existingSession);
      }
    }
  }, []);

  useEffect(() => {
    // Auto-authenticate if user is available from Farcaster context
    if (isReady && user && authState === 'idle') {
      handleAutoAuth();
    }
  }, [isReady, user, authState]);

  const handleAutoAuth = async () => {
    if (!user) return;
    
    setAuthState('verifying');
    
    try {
      // In a Mini App context, we can trust the user from the SDK
      const session: AuthSession = {
        user,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };
      
      storeSession(session);
      setSession(session);
      setAuthState('success');
      
      if (onAuthSuccess) {
        onAuthSuccess(session);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Auto-authentication failed';
      setError(errorMessage);
      setAuthState('error');
      if (onAuthError) {
        onAuthError(errorMessage);
      }
    }
  };

  const handleSignIn = async () => {
    setAuthState('signing');
    setError(null);
    
    try {
      // Generate sign-in URL for Farcaster
      const authUrl = generateFarcasterAuthUrl();
      
      // Open auth URL
      if (isInFrame) {
        // In Mini App context, use SDK
        await openUrl(authUrl);
      } else {
        // Regular web context
        window.location.href = authUrl;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign-in failed';
      setError(errorMessage);
      setAuthState('error');
      if (onAuthError) {
        onAuthError(errorMessage);
      }
    }
  };

  const handleSignOut = () => {
    clearStoredSession();
    setSession(null);
    setAuthState('idle');
    setError(null);
  };

  const generateFarcasterAuthUrl = (): string => {
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_FARCASTER_CLIENT_ID || 'devmolink',
      redirect_uri: redirectUrl || `${window.location.origin}/auth/callback`,
      response_type: 'code',
      scope: 'read write',
      state: generateState()
    });
    
    return `https://warpcast.com/~/oauth/authorize?${params.toString()}`;
  };

  const generateState = (): string => {
    const state = Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('farcaster_auth_state', state);
    return state;
  };

  if (authState === 'success' && session) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {session.user.pfpUrl && (
              <img
                src={session.user.pfpUrl}
                alt={session.user.displayName || session.user.username}
                className="h-10 w-10 rounded-full"
              />
            )}
            <div>
              <p className="font-medium text-green-900">
                {session.user.displayName || session.user.username || `User ${session.user.fid}`}
              </p>
              <p className="text-sm text-green-700">Signed in with Farcaster</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="text-sm text-green-700 hover:text-green-800 font-medium"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (authState === 'error') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-red-800">Authentication Error</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
        <div className="mt-3">
          <button
            onClick={handleSignIn}
            className="text-sm bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
          <svg className="h-6 w-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        
        <h3 className="text-lg font-medium text-gray-900 mb-2">Sign In with Farcaster</h3>
        <p className="text-sm text-gray-600 mb-6">
          Connect your Farcaster account to access all features of DevmoLink.
        </p>
        
        <button
          onClick={handleSignIn}
          disabled={authState === 'signing' || authState === 'verifying'}
          className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {authState === 'signing' && 'Connecting...'}
          {authState === 'verifying' && 'Verifying...'}
          {authState === 'idle' && 'Continue with Farcaster'}
        </button>
        
        <p className="text-xs text-gray-500 mt-4">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

// Session management utilities
function storeSession(session: AuthSession): void {
  // Use sessionStorage for security (clears on tab close)
  sessionStorage.setItem('farcaster_session', JSON.stringify(session));
}

function getStoredSession(): AuthSession | null {
  try {
    const stored = sessionStorage.getItem('farcaster_session');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function clearStoredSession(): void {
  sessionStorage.removeItem('farcaster_session');
  sessionStorage.removeItem('farcaster_auth_state');
}

function isValidSession(session: AuthSession): boolean {
  if (!session.user || !session.user.fid) return false;
  if (session.expiresAt && Date.now() > session.expiresAt) return false;
  return true;
}

// Hook for accessing auth state
export function useFarcasterAuth() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const storedSession = getStoredSession();
    if (storedSession && isValidSession(storedSession)) {
      setSession(storedSession);
      setIsAuthenticated(true);
    }

    // Listen for session changes
    const handleStorageChange = () => {
      const updatedSession = getStoredSession();
      if (updatedSession && isValidSession(updatedSession)) {
        setSession(updatedSession);
        setIsAuthenticated(true);
      } else {
        setSession(null);
        setIsAuthenticated(false);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const signOut = () => {
    clearStoredSession();
    setSession(null);
    setIsAuthenticated(false);
  };

  return {
    session,
    isAuthenticated,
    user: session?.user || null,
    signOut
  };
} 