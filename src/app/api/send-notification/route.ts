import { NextRequest, NextResponse } from 'next/server';
import { 
  NotificationPayload, 
  RateLimitConfig
} from '@/types/farcaster';
import { createFarcasterError } from '@/lib/farcaster';

// Rate limiting configuration per Farcaster specs:
// - 1 notification per 30 seconds per token
// - 100 notifications per day per token
const RATE_LIMITS: RateLimitConfig = {
  maxRequests: 1,
  windowMs: 30 * 1000, // 30 seconds
};

const DAILY_LIMITS: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
};

// In-memory rate limiting (use Redis in production)
const tokenLimits = new Map<string, { count: number; resetTime: number }>();
const dailyLimits = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(token: string): { allowed: boolean; error?: string } {
  const now = Date.now();
  
  // Check 30-second rate limit
  const currentLimit = tokenLimits.get(token);
  if (currentLimit && now < currentLimit.resetTime) {
    return { 
      allowed: false, 
      error: 'Rate limit exceeded: 1 notification per 30 seconds' 
    };
  }
  
  // Check daily limit
  const dailyLimit = dailyLimits.get(token);
  if (dailyLimit) {
    if (now < dailyLimit.resetTime) {
      if (dailyLimit.count >= DAILY_LIMITS.maxRequests) {
        return { 
          allowed: false, 
          error: 'Daily limit exceeded: 100 notifications per day' 
        };
      }
      dailyLimit.count++;
    } else {
      // Reset daily counter
      dailyLimits.set(token, { count: 1, resetTime: now + DAILY_LIMITS.windowMs });
    }
  } else {
    // First notification for this token
    dailyLimits.set(token, { count: 1, resetTime: now + DAILY_LIMITS.windowMs });
  }
  
  // Set/update 30-second limit
  tokenLimits.set(token, { count: 1, resetTime: now + RATE_LIMITS.windowMs });
  
  return { allowed: true };
}

async function sendFarcasterNotification(payload: NotificationPayload): Promise<{
  success: boolean;
  results: Array<{ token: string; success: boolean; error?: string }>;
}> {
  const results: Array<{ token: string; success: boolean; error?: string }> = [];
  
  for (const token of payload.tokens) {
    try {
      // Check rate limits for this token
      const rateLimitCheck = checkRateLimit(token);
      if (!rateLimitCheck.allowed) {
        results.push({
          token,
          success: false,
          error: rateLimitCheck.error
        });
        continue;
      }
      
      // Send notification via Farcaster API
      const response = await fetch('https://api.farcaster.xyz/v2/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.FARCASTER_API_KEY}`,
        },
        body: JSON.stringify({
          notificationId: payload.notificationId,
          title: payload.title,
          body: payload.body,
          targetUrl: payload.targetUrl,
          token: token
        })
      });
      
      if (response.ok) {
        results.push({ token, success: true });
      } else {
        const errorText = await response.text();
        console.error(`Failed to send notification to token ${token}:`, errorText);
        results.push({
          token,
          success: false,
          error: `API error: ${response.status}`
        });
      }
      
    } catch (error) {
      console.error(`Error sending notification to token ${token}:`, error);
      results.push({
        token,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  return {
    success: successCount > 0,
    results
  };
}

function validateNotificationPayload(data: unknown): NotificationPayload | null {
  // Type guard to ensure data is an object
  if (!data || typeof data !== 'object') {
    return null;
  }
  
  const payload = data as Record<string, unknown>;
  
  // Validate required fields
  if (!payload.notificationId || typeof payload.notificationId !== 'string') {
    return null;
  }
  
  if (!payload.title || typeof payload.title !== 'string' || payload.title.length > 100) {
    return null;
  }
  
  if (!payload.body || typeof payload.body !== 'string' || payload.body.length > 200) {
    return null;
  }
  
  if (!Array.isArray(payload.tokens) || payload.tokens.length === 0 || payload.tokens.length > 100) {
    return null;
  }
  
  // Validate token format
  for (const token of payload.tokens) {
    if (typeof token !== 'string' || token.length < 10) {
      return null;
    }
  }
  
  // Validate target URL if provided
  if (payload.targetUrl) {
    try {
      new URL(payload.targetUrl as string);
    } catch {
      return null;
    }
  }
  
  return {
    notificationId: payload.notificationId as string,
    title: payload.title as string,
    body: payload.body as string,
    targetUrl: payload.targetUrl as string | undefined,
    tokens: payload.tokens as string[]
  };
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.INTERNAL_API_SECRET;
    
    if (!expectedToken) {
      console.error('INTERNAL_API_SECRET not configured');
      return NextResponse.json(
        createFarcasterError('SERVER_ERROR', 'API secret not configured'),
        { status: 500 }
      );
    }
    
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        createFarcasterError('UNAUTHORIZED', 'Invalid or missing API key'),
        { status: 401 }
      );
    }
    
    // Parse and validate request body
    let requestData;
    try {
      requestData = await request.json();
    } catch {
      return NextResponse.json(
        createFarcasterError('INVALID_JSON', 'Invalid JSON in request body'),
        { status: 400 }
      );
    }
    
    const payload = validateNotificationPayload(requestData);
    if (!payload) {
      return NextResponse.json(
        createFarcasterError('INVALID_PAYLOAD', 'Invalid notification payload'),
        { status: 400 }
      );
    }
    
    // Check if Farcaster API key is configured
    if (!process.env.FARCASTER_API_KEY) {
      console.error('FARCASTER_API_KEY not configured');
      return NextResponse.json(
        createFarcasterError('SERVER_ERROR', 'Farcaster API key not configured'),
        { status: 500 }
      );
    }
    
    // Send notifications
    const result = await sendFarcasterNotification(payload);
    
    // Log the results
    console.log(`Notification ${payload.notificationId} sent:`, {
      totalTokens: payload.tokens.length,
      successful: result.results.filter(r => r.success).length,
      failed: result.results.filter(r => !r.success).length
    });
    
    // Return results
    return NextResponse.json({
      success: result.success,
      notificationId: payload.notificationId,
      results: result.results,
      summary: {
        totalTokens: payload.tokens.length,
        successful: result.results.filter(r => r.success).length,
        failed: result.results.filter(r => !r.success).length
      }
    });
    
  } catch (error) {
    console.error('Notification API error:', error);
    return NextResponse.json(
      createFarcasterError('NOTIFICATION_ERROR', 'Failed to send notification'),
      { status: 500 }
    );
  }
}

// Health check and rate limit info
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  
  if (!token) {
    return NextResponse.json({
      status: 'ok',
      service: 'farcaster-notifications',
      timestamp: new Date().toISOString()
    });
  }
  
  // Return rate limit info for a specific token
  const now = Date.now();
  const currentLimit = tokenLimits.get(token);
  const dailyLimit = dailyLimits.get(token);
  
  return NextResponse.json({
    token: token.substring(0, 8) + '...',
    rateLimits: {
      thirtySecond: {
        blocked: currentLimit ? now < currentLimit.resetTime : false,
        resetsAt: currentLimit?.resetTime,
        resetsIn: currentLimit ? Math.max(0, currentLimit.resetTime - now) : 0
      },
      daily: {
        count: dailyLimit?.count || 0,
        limit: DAILY_LIMITS.maxRequests,
        resetsAt: dailyLimit?.resetTime,
        resetsIn: dailyLimit ? Math.max(0, dailyLimit.resetTime - now) : 0
      }
    }
  });
} 