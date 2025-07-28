import React from "react";
import "./globals.css";
import { Inter } from "next/font/google";
import MainLayout from "./MainLayout";
import ClientProviders from "./ClientProviders";
import { Metadata } from "next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: '%s - Devmolink',
    default: 'Home - Devmolink'
  },
  description: 'Connect with other developers. Whether for a job, a project, a relationship, devmolink is the place to be. Stop calling us the Tinder for developers.',
  icons: {
    icon: '/devmolinkGreenLogo.svg'
  },
  // Farcaster Frame metadata
  other: {
    'fc:frame': JSON.stringify({
      version: 'next',
      image: 'https://devmolink.com/icon.png',
      buttons: [
        {
          label: 'Open DevmoLink',
          action: 'link',
          target: 'https://devmolink.com'
        }
      ]
    }),
    'fc:frame:image': 'https://devmolink.com/icon.png',
    'fc:frame:image:aspect_ratio': '1.91:1',
    'fc:frame:button:1': 'Open DevmoLink',
    'fc:frame:button:1:action': 'link',
    'fc:frame:button:1:target': 'https://devmolink.com',
    'og:image': 'https://devmolink.com/icon.png',
    'twitter:card': 'summary_large_image',
    'twitter:image': 'https://devmolink.com/icon.png'
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
