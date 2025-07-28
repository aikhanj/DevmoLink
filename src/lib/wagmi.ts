import { createConfig, http } from 'wagmi';
import { base, mainnet, optimism, arbitrum } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

// WalletConnect project ID - you'll need to get this from WalletConnect
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'your-project-id';

export const wagmiConfig = createConfig({
  chains: [mainnet, base, optimism, arbitrum],
  connectors: [
    injected(),
    coinbaseWallet({
      appName: 'DevmoLink',
      appLogoUrl: 'https://devmolink.com/icon.png',
    }),
    walletConnect({
      projectId,
      metadata: {
        name: 'DevmoLink',
        description: 'The Tinder for Developers',
        url: 'https://devmolink.com',
        icons: ['https://devmolink.com/icon.png'],
      },
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [optimism.id]: http(),
    [arbitrum.id]: http(),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
} 