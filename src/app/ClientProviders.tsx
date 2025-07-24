"use client";
import React from "react";
import { SessionProvider } from "next-auth/react";
import { getAuth, onAuthStateChanged } from "firebase/auth";

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

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <EmailVerificationWatcher />
      {children}
    </SessionProvider>
  );
} 