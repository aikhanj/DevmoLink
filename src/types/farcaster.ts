export interface FarcasterManifest {
  accountAssociation: {
    header: string;
    payload: string;
    signature: string;
  };
  frame: {
    name: string;
    version: string;
    iconUrl: string;
    splashImageUrl?: string;
    splashBackgroundColor?: string;
    homeUrl: string;
    imageUrl?: string;
    buttonTitle?: string;
    webhookUrl?: string;
    subtitle?: string;
    description?: string;
    primaryCategory?: string;
    tags?: string[];
    tagline?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImageUrl?: string;
    castShareUrl?: string;
    screenshotUrls?: string[];
    heroImageUrl?: string;
  };
}

export interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  bio?: string;
  verifications?: string[];
  followerCount?: number;
  followingCount?: number;
}

export interface FarcasterContext {
  type: 'cast_embed' | 'notification' | 'launcher' | 'composer_action';
  cast?: {
    hash: string;
    fid: number;
    text?: string;
    author: FarcasterUser;
    timestamp: number;
  };
  notification?: {
    type: string;
    title: string;
    body: string;
  };
}

export type FarcasterEventType = 
  | 'frame_added'
  | 'frame_removed'
  | 'notifications_enabled'
  | 'notifications_disabled'
  | 'primary_button_clicked';

export interface FarcasterWebhookEvent {
  type: FarcasterEventType;
  timestamp: number;
  data: {
    fid: number;
    notificationToken?: string;
    context?: FarcasterContext;
    buttonIndex?: number;
    inputText?: string;
    state?: string;
    url?: string;
  };
}

export interface NotificationPayload {
  notificationId: string;
  title: string;
  body: string;
  targetUrl?: string;
  tokens: string[];
}

export interface FarcasterError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface FrameMetadata {
  title: string;
  description: string;
  image: string;
  imageAspectRatio?: '1.91:1' | '1:1';
  input?: string;
  buttons?: Array<{
    label: string;
    action?: 'post' | 'post_redirect' | 'link' | 'mint';
    target?: string;
  }>;
  postUrl?: string;
  refreshPeriod?: number;
  state?: string;
}

export interface WalletConfig {
  address?: string;
  chainId?: number;
  isConnected: boolean;
  connector?: unknown;
}

export interface AuthSession {
  user: FarcasterUser;
  token?: string;
  expiresAt?: number;
}

export interface EmbedConfig {
  title: string;
  description: string;
  image: string;
  url: string;
  aspectRatio?: '3:2' | '1:1';
}

export interface NotificationSettings {
  enabled: boolean;
  types: string[];
  frequency: 'immediate' | 'digest' | 'disabled';
}

export interface MiniAppConfig {
  domain: string;
  manifestUrl: string;
  webhookUrl: string;
  notificationUrl: string;
  debug?: boolean;
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface VerificationResult {
  isValid: boolean;
  fid?: number;
  error?: string;
} 