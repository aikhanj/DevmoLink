'use client';

import React, { useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useFarcaster } from './FarcasterProvider';
import { WalletConfig } from '@/types/farcaster';

interface ConnectWalletProps {
  onConnected?: (config: WalletConfig) => void;
  onDisconnected?: () => void;
  className?: string;
}

export function ConnectWallet({ 
  onConnected, 
  onDisconnected, 
  className = '' 
}: ConnectWalletProps) {
  const { address, isConnected, chainId, connector } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { isInFrame, isMiniAppContext } = useFarcaster();
  const [isExpanded, setIsExpanded] = useState(false);

  const walletConfig: WalletConfig = {
    address,
    chainId,
    isConnected,
    connector
  };

  React.useEffect(() => {
    if (isConnected && onConnected) {
      onConnected(walletConfig);
    }
  }, [isConnected, address, chainId, connector]);

  const handleDisconnect = () => {
    disconnect();
    if (onDisconnected) {
      onDisconnected();
    }
  };

  if (isConnected) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Connected'}
              </p>
              <p className="text-xs text-gray-500">
                {connector?.name} • Chain {chainId}
              </p>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            className="text-xs text-red-600 hover:text-red-700 font-medium"
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  // Show compact version in Mini App contexts
  if (isInFrame || isMiniAppContext) {
    return (
      <div className={className}>
        {!isExpanded ? (
          <button
            onClick={() => setIsExpanded(true)}
            disabled={isPending}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? 'Connecting...' : 'Connect Wallet'}
          </button>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">Connect Wallet</h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-2">
              {connectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => {
                    connect({ connector });
                    setIsExpanded(false);
                  }}
                  disabled={isPending}
                  className="w-full text-left p-2 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <div className="h-6 w-6 bg-gray-100 rounded flex items-center justify-center">
                      <div className="h-3 w-3 bg-gray-400 rounded"></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{connector.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full version for regular web view
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Connect Wallet</h3>
      <div className="space-y-3">
        {connectors.map((connector) => (
          <button
            key={connector.id}
            onClick={() => connect({ connector })}
            disabled={isPending}
            className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                <div className="h-4 w-4 bg-gray-400 rounded"></div>
              </div>
              <span className="font-medium text-gray-900">{connector.name}</span>
            </div>
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-4 text-center">
        Connect your wallet to interact with the blockchain
      </p>
    </div>
  );
} 