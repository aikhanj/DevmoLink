import React from "react";
import "./globals.css";
import { Inter } from "next/font/google";
import MainLayout from "./MainLayout";
import ClientProviders from "./ClientProviders";
import { Metadata } from "next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Devmolink',
  description: 'Connect with other developers. Whether for a job, a project, a relationship, devmolink is the place to be. Stop calling us the Tinder for developers.',
  icons: {
    icon: '/devmolinkGreenLogo.svg'
  }
};

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
