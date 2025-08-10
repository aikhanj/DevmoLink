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
  // Farcaster Mini-App Embed metadata
  other: {
    'fc:miniapp': JSON.stringify({
      version: '1',
      imageUrl: 'https://devmolink.com/screenshotDevmoLink.png',
      button: {
        title: 'Find Your Match',
        action: {
          type: 'launch_miniapp', // new name per spec (launch_frame also accepted for b-c)
          url: 'https://devmolink.com',
          name: 'DevmoLink',
          splashImageUrl: 'https://devmolink.com/icon.png',
          splashBackgroundColor: '#212122'
        }
      }
    }),
    // Backward-compatibility tag for older clients
    'fc:frame': JSON.stringify({
      version: '1',
      imageUrl: 'https://devmolink.com/screenshotDevmoLink.png',
      button: {
        title: 'Find Your Match',
        action: {
          type: 'launch_frame',
          url: 'https://devmolink.com',
          name: 'DevmoLink',
          splashImageUrl: 'https://devmolink.com/icon.png',
          splashBackgroundColor: '#212122'
        }
      }
    }),
    // Standard social tags
    'og:image': 'https://devmolink.com/screenshotDevmoLink.png',
    'twitter:card': 'summary_large_image',
    'twitter:image': 'https://devmolink.com/screenshotDevmoLink.png'
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" crossOrigin="" />
        <link rel="preconnect" href="https://storage.googleapis.com" crossOrigin="" />
      </head>
      <body suppressHydrationWarning className={inter.className + " bg-gradient-to-br from-[#23272a] via-[#5865f2] to-[#a259f7] min-h-screen"}>
        <ClientProviders>
          <MainLayout>{children}</MainLayout>
        </ClientProviders>
      </body>
    </html>
  );
}
