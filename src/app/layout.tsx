import React from "react";
import "./globals.css";
import { Inter } from "next/font/google";
import MainLayout from "./MainLayout";
import ClientProviders from "./ClientProviders";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body suppressHydrationWarning className={inter.className + " bg-gradient-to-br from-[#23272a] via-[#5865f2] to-[#a259f7] min-h-screen"}>
        <ClientProviders>
          <MainLayout>{children}</MainLayout>
        </ClientProviders>
      </body>
    </html>
  );
}
