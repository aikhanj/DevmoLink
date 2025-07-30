'use client';

import React, { ReactNode } from 'react';
import { useFarcaster, useMiniAppContext } from './FarcasterProvider';
import { FarcasterError } from '@/types/farcaster';

interface MiniAppWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  errorFallback?: (error: FarcasterError) => ReactNode;
  loadingFallback?: ReactNode;
}

export function MiniAppWrapper({ 
  children, 
  fallback,
  errorFallback,
  loadingFallback 
}: MiniAppWrapperProps) {
  const { isLoading, isReady: _isReady, error, isInFrame } = useFarcaster();
  const { isInMiniApp, contextType } = useMiniAppContext();

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        {loadingFallback || <DefaultLoadingState />}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        {errorFallback ? errorFallback(error) : <DefaultErrorState error={error} />}
      </div>
    );
  }

  // Not in Mini App context - render regular app
  if (!isInMiniApp && !isInFrame) {
    return (
      <div className="min-h-screen">
        {fallback || children}
      </div>
    );
  }

  // Mini App context - apply safe area insets and appropriate styling
  return (
    <div 
      className={`
        min-h-screen
        ${isInMiniApp ? 'safe-area-inset' : ''}
        ${contextType === 'notification' ? 'notification-context' : ''}
        ${contextType === 'cast_embed' ? 'embed-context' : ''}
      `}
      style={{
        paddingTop: isInMiniApp ? 'env(safe-area-inset-top)' : undefined,
        paddingBottom: isInMiniApp ? 'env(safe-area-inset-bottom)' : undefined,
        paddingLeft: isInMiniApp ? 'env(safe-area-inset-left)' : undefined,
        paddingRight: isInMiniApp ? 'env(safe-area-inset-right)' : undefined,
      }}
    >
      {children}
    </div>
  );
}

function DefaultLoadingState() {
  return (
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading DevmoLink</h2>
      <p className="text-gray-600">Initializing Mini App...</p>
    </div>
  );
}

function DefaultErrorState({ error }: { error: FarcasterError }) {
  return (
    <div className="text-center max-w-md mx-auto p-6">
      <div className="bg-red-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
        <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
      <p className="text-gray-600 mb-4">{error.message}</p>
      <button 
        onClick={() => window.location.reload()}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}

function _DefaultFallbackState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="bg-blue-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
          <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Open in Farcaster</h2>
        <p className="text-gray-600 mb-4">
          This is a Farcaster Mini App. For the best experience, open this in the Farcaster app.
        </p>
        <a 
          href="https://warpcast.com"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors inline-block"
        >
          Open Farcaster
        </a>
      </div>
    </div>
  );
} 