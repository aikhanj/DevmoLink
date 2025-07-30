import { createConfig, http } from 'wagmi';
import { base, mainnet, optimism, arbitrum } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

// WalletConnect project ID - you'll need to get this from WalletConnect
const projectId = '0e15d90a6b3ba3db2273f8be658334b8';

export const wagmiConfig = createConfig({
  chains: [mainnet, base, optimism, arbitrum],
  connectors: [
    injected(),
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