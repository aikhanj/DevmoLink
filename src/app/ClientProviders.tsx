"use client";
import React from "react";
import { SessionProvider } from "next-auth/react";
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { Toaster } from 'react-hot-toast';
import { FarcasterProvider } from '@/components/FarcasterProvider';
import { wagmiConfig } from '@/lib/wagmi';

function EmailVerificationWatcher() {
  React.useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user && !user.emailVerified) {
        await user.reload();
      }
    });
    return unsub;
  }, []);
  return null;
}

const queryClient = new QueryClient();

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <FarcasterProvider>
            <EmailVerificationWatcher />
            <Toaster />
            {children}
          </FarcasterProvider>
        </SessionProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
} 