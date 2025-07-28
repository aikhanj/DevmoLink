import { sdk } from '@farcaster/frame-sdk';
import { 
  FarcasterUser, 
  FarcasterContext, 
  FarcasterError, 
  VerificationResult,
  MiniAppConfig 
} from '@/types/farcaster';

export class FarcasterSDK {
  private static instance: FarcasterSDK;
  private initialized = false;
  private context: FarcasterContext | null = null;
  private user: FarcasterUser | null = null;

  static getInstance(): FarcasterSDK {
    if (!FarcasterSDK.instance) {
      FarcasterSDK.instance = new FarcasterSDK();
    }
    return FarcasterSDK.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // `ready` does not return a value (typed as void) – it throws on failure.
      await sdk.actions.ready();

      // Mark SDK as ready. Context/user information may be fetched via other
      // SDK calls once those APIs become available.
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize Farcaster SDK:', error);
      throw error;
    }
  }

  isReady(): boolean {
    return this.initialized;
  }

  getContext(): FarcasterContext | null {
    return this.context;
  }

  getUser(): FarcasterUser | null {
    return this.user;
  }

  async openUrl(url: string): Promise<void> {
    if (!this.initialized) {
      throw new Error('SDK not initialized');
    }

    try {
      // `openUrl`'s TypeScript signature currently expects no arguments, but the
      // runtime accepts a URL string. Cast to `any` to satisfy the compiler until
      // the upstream types are updated.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (sdk.actions as any).openUrl(url);
    } catch (error) {
      console.error('Failed to open URL:', error);
      throw error;
    }
  }

  async close(payload?: Record<string, unknown>): Promise<void> {
    if (!this.initialized) {
      throw new Error('SDK not initialized');
    }

    try {
      // Similar to `openUrl`, the type signature for `close` does not currently
      // accept an argument even though the runtime does. Use `any` cast.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (sdk.actions as any).close(payload);
    } catch (error) {
      console.error('Failed to close frame:', error);
      throw error;
    }
  }

  isInFrame(): boolean {
    return typeof window !== 'undefined' && window.parent !== window;
  }

  isMiniAppContext(): boolean {
    return this.context?.type !== undefined;
  }
}

export const farcasterSDK = FarcasterSDK.getInstance();

// Verification utilities
export async function verifyFrameMessage(
  messageBytes: string
): Promise<VerificationResult> {
  try {
    // This would typically use @farcaster/frame-node for verification
    // Implementation depends on your backend setup
    return {
      isValid: true, // Placeholder
      fid: 12345 // Placeholder
    };
  } catch (error) {
    console.error('Frame message verification failed:', error);
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Context detection utilities
export function detectMiniAppContext(): FarcasterContext['type'] | null {
  if (typeof window === 'undefined') return null;
  
  const urlParams = new URLSearchParams(window.location.search);
  
  if (urlParams.has('fc_context')) {
    const context = urlParams.get('fc_context');
    if (['cast_embed', 'notification', 'launcher', 'composer_action'].includes(context!)) {
      return context as FarcasterContext['type'];
    }
  }
  
  return null;
}

// Environment configuration
export const farcasterConfig: MiniAppConfig = {
  domain: process.env.NEXT_PUBLIC_DOMAIN || 'devmolink.com',
  manifestUrl: `${process.env.NEXT_PUBLIC_DOMAIN || 'https://devmolink.com'}/.well-known/farcaster.json`,
  webhookUrl: `${process.env.NEXT_PUBLIC_DOMAIN || 'https://devmolink.com'}/api/webhook`,
  notificationUrl: `${process.env.NEXT_PUBLIC_DOMAIN || 'https://devmolink.com'}/api/send-notification`,
  debug: process.env.NODE_ENV === 'development'
};

// Error handling utilities
export function createFarcasterError(
  code: string,
  message: string,
  details?: Record<string, unknown>
): FarcasterError {
  return { code, message, details };
}

export function isFarcasterError(error: unknown): error is FarcasterError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in (error as Record<string, unknown>) &&
    'message' in (error as Record<string, unknown>)
  );
} 