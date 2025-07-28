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
      const result = await sdk.actions.ready();
      
      // Check if result exists before accessing its properties
      if (result && result.isSuccess) {
        this.initialized = true;
        this.context = result.data.context || null;
        this.user = result.data.user || null;
      } else {
        // Handle cases where result is undefined or isSuccess is false
        const errorMessage = result?.error?.message || 'SDK initialization failed: Not in Farcaster client or unknown error.';
        throw new Error(errorMessage);
      }
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
      const result = await sdk.actions.openUrl(url);
      if (result && !result.isSuccess) {
        throw new Error(`Failed to open URL: ${result.error?.message || 'Unknown error'}`);
      }
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
      const result = await sdk.actions.close(payload);
      if (result && !result.isSuccess) {
        throw new Error(`Failed to close frame: ${result.error?.message || 'Unknown error'}`);
      }
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
  return error && typeof error === 'object' && 'code' in error && 'message' in error;
} 