import { NotificationPayload, NotificationSettings } from '@/types/farcaster';

// Notification token storage interface
interface NotificationToken {
  fid: number;
  token: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory storage for demo (replace with database in production)
const notificationTokens = new Map<number, NotificationToken>();
const userSettings = new Map<number, NotificationSettings>();

export class NotificationManager {
  // Store notification token for a user
  static async storeNotificationToken(fid: number, token: string): Promise<void> {
    const now = new Date();
    notificationTokens.set(fid, {
      fid,
      token,
      enabled: true,
      createdAt: notificationTokens.get(fid)?.createdAt || now,
      updatedAt: now
    });
    
    // Initialize default settings if not exists
    if (!userSettings.has(fid)) {
      userSettings.set(fid, {
        enabled: true,
        types: ['welcome', 'match', 'message', 'like'],
        frequency: 'immediate'
      });
    }
  }

  // Remove notification token for a user
  static async removeNotificationToken(fid: number): Promise<void> {
    const token = notificationTokens.get(fid);
    if (token) {
      token.enabled = false;
      token.updatedAt = new Date();
      notificationTokens.set(fid, token);
    }
  }

  // Get notification token for a user
  static async getNotificationToken(fid: number): Promise<string | null> {
    const token = notificationTokens.get(fid);
    return token?.enabled ? token.token : null;
  }

  // Get all enabled notification tokens
  static async getAllEnabledTokens(): Promise<Array<{ fid: number; token: string }>> {
    const enabled: Array<{ fid: number; token: string }> = [];
    for (const [fid, tokenData] of notificationTokens) {
      if (tokenData.enabled) {
        enabled.push({ fid, token: tokenData.token });
      }
    }
    return enabled;
  }

  // Update user notification settings
  static async updateSettings(fid: number, settings: Partial<NotificationSettings>): Promise<void> {
    const currentSettings = userSettings.get(fid) || {
      enabled: true,
      types: ['welcome', 'match', 'message', 'like'],
      frequency: 'immediate'
    };
    
    userSettings.set(fid, { ...currentSettings, ...settings });
  }

  // Get user notification settings
  static async getSettings(fid: number): Promise<NotificationSettings> {
    return userSettings.get(fid) || {
      enabled: true,
      types: ['welcome', 'match', 'message', 'like'],
      frequency: 'immediate'
    };
  }

  // Send notification with retry logic
  static async sendNotification(
    payload: NotificationPayload,
    retries: number = 3
  ): Promise<{ success: boolean; errors?: string[] }> {
    let lastError: string | undefined;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_DOMAIN}/api/send-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.INTERNAL_API_SECRET}`
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const result = await response.json();
          return { success: result.success };
        } else {
          const errorText = await response.text();
          lastError = `HTTP ${response.status}: ${errorText}`;
          
          // Don't retry on client errors (400-499)
          if (response.status >= 400 && response.status < 500) {
            break;
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Network error';
      }
      
      if (attempt < retries) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    
    return { success: false, errors: [lastError || 'Unknown error'] };
  }

  // Send welcome notification
  static async sendWelcomeNotification(fid: number): Promise<void> {
    const token = await this.getNotificationToken(fid);
    if (!token) return;

    const settings = await this.getSettings(fid);
    if (!settings.enabled || !settings.types.includes('welcome')) return;

    const payload: NotificationPayload = {
      notificationId: `welcome-${fid}-${Date.now()}`,
      title: 'Welcome to DevmoLink! 🚀',
      body: 'Start connecting with developers in your area.',
      targetUrl: `${process.env.NEXT_PUBLIC_DOMAIN}/onboarding`,
      tokens: [token]
    };

    await this.sendNotification(payload);
  }

  // Send match notification
  static async sendMatchNotification(fid: number, matchedWithName: string): Promise<void> {
    const token = await this.getNotificationToken(fid);
    if (!token) return;

    const settings = await this.getSettings(fid);
    if (!settings.enabled || !settings.types.includes('match')) return;

    const payload: NotificationPayload = {
      notificationId: `match-${fid}-${Date.now()}`,
      title: 'It\'s a match! 💖',
      body: `You and ${matchedWithName} liked each other!`,
      targetUrl: `${process.env.NEXT_PUBLIC_DOMAIN}/chats`,
      tokens: [token]
    };

    await this.sendNotification(payload);
  }

  // Send message notification
  static async sendMessageNotification(
    fid: number, 
    senderName: string, 
    messagePreview: string
  ): Promise<void> {
    const token = await this.getNotificationToken(fid);
    if (!token) return;

    const settings = await this.getSettings(fid);
    if (!settings.enabled || !settings.types.includes('message')) return;

    const payload: NotificationPayload = {
      notificationId: `message-${fid}-${Date.now()}`,
      title: `New message from ${senderName}`,
      body: messagePreview.length > 50 ? messagePreview.substring(0, 47) + '...' : messagePreview,
      targetUrl: `${process.env.NEXT_PUBLIC_DOMAIN}/chats`,
      tokens: [token]
    };

    await this.sendNotification(payload);
  }

  // Send like notification
  static async sendLikeNotification(fid: number, likerName: string): Promise<void> {
    const token = await this.getNotificationToken(fid);
    if (!token) return;

    const settings = await this.getSettings(fid);
    if (!settings.enabled || !settings.types.includes('like')) return;

    const payload: NotificationPayload = {
      notificationId: `like-${fid}-${Date.now()}`,
      title: 'Someone likes you! ⭐',
      body: `${likerName} liked your profile`,
      targetUrl: `${process.env.NEXT_PUBLIC_DOMAIN}/likes`,
      tokens: [token]
    };

    await this.sendNotification(payload);
  }

  // Broadcast notification to multiple users
  static async broadcastNotification(
    fids: number[],
    title: string,
    body: string,
    targetUrl?: string
  ): Promise<{ success: boolean; totalSent: number; errors: string[] }> {
    const tokens: string[] = [];
    const errors: string[] = [];

    // Collect valid tokens
    for (const fid of fids) {
      try {
        const token = await this.getNotificationToken(fid);
        if (token) {
          tokens.push(token);
        }
      } catch (error) {
        errors.push(`Failed to get token for FID ${fid}: ${error}`);
      }
    }

    if (tokens.length === 0) {
      return { success: false, totalSent: 0, errors: ['No valid notification tokens found'] };
    }

    const payload: NotificationPayload = {
      notificationId: `broadcast-${Date.now()}`,
      title,
      body,
      targetUrl,
      tokens
    };

    const result = await this.sendNotification(payload);
    return {
      success: result.success,
      totalSent: tokens.length,
      errors: result.errors || []
    };
  }

  // Clean up expired tokens (run periodically)
  static async cleanupExpiredTokens(): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    for (const [fid, token] of notificationTokens) {
      if (token.updatedAt < thirtyDaysAgo && !token.enabled) {
        notificationTokens.delete(fid);
      }
    }
  }
} 