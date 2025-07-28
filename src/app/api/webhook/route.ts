import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@farcaster/frame-node';
import { 
  FarcasterWebhookEvent, 
  FarcasterEventType,
  createFarcasterError 
} from '@/types/farcaster';

// Rate limiting storage (in production, use Redis or database)
const rateLimitStore = new Map<number, { count: number; resetTime: number }>();

function checkRateLimit(fid: number): boolean {
  const now = Date.now();
  const limit = rateLimitStore.get(fid);
  
  if (!limit || now > limit.resetTime) {
    // Reset or create new limit window (1 minute)
    rateLimitStore.set(fid, { count: 1, resetTime: now + 60000 });
    return true;
  }
  
  if (limit.count >= 60) { // 60 requests per minute
    return false;
  }
  
  limit.count++;
  return true;
}

async function handleFrameAdded(event: FarcasterWebhookEvent): Promise<void> {
  console.log('Frame added by user:', event.data.fid);
  
  // Store user's frame installation in your database
  // await database.frames.create({
  //   fid: event.data.fid,
  //   installedAt: new Date(event.timestamp),
  //   context: event.data.context
  // });
  
  // Send welcome notification if notifications are enabled
  if (event.data.notificationToken) {
    await sendWelcomeNotification(event.data.fid, event.data.notificationToken);
  }
}

async function handleFrameRemoved(event: FarcasterWebhookEvent): Promise<void> {
  console.log('Frame removed by user:', event.data.fid);
  
  // Remove user's frame installation from your database
  // await database.frames.delete({
  //   where: { fid: event.data.fid }
  // });
  
  // Clean up any user-specific data
  // await cleanupUserData(event.data.fid);
}

async function handleNotificationsEnabled(event: FarcasterWebhookEvent): Promise<void> {
  console.log('Notifications enabled by user:', event.data.fid);
  
  if (!event.data.notificationToken) {
    throw new Error('Notification token missing');
  }
  
  // Store notification token in your database
  // await database.notificationTokens.upsert({
  //   where: { fid: event.data.fid },
  //   update: { 
  //     token: event.data.notificationToken,
  //     enabled: true,
  //     updatedAt: new Date()
  //   },
  //   create: {
  //     fid: event.data.fid,
  //     token: event.data.notificationToken,
  //     enabled: true,
  //     createdAt: new Date()
  //   }
  // });
}

async function handleNotificationsDisabled(event: FarcasterWebhookEvent): Promise<void> {
  console.log('Notifications disabled by user:', event.data.fid);
  
  // Disable notifications for user in your database
  // await database.notificationTokens.update({
  //   where: { fid: event.data.fid },
  //   data: { enabled: false, updatedAt: new Date() }
  // });
}

async function handlePrimaryButtonClicked(event: FarcasterWebhookEvent): Promise<void> {
  console.log('Primary button clicked by user:', event.data.fid);
  
  // Track button clicks for analytics
  // await database.analytics.create({
  //   fid: event.data.fid,
  //   eventType: 'button_click',
  //   buttonIndex: event.data.buttonIndex,
  //   context: event.data.context,
  //   timestamp: new Date(event.timestamp)
  // });
  
  // Handle specific button actions based on context
  if (event.data.context?.type === 'cast_embed') {
    // Handle cast embed button click
    console.log('Button clicked in cast embed context');
  }
}

async function sendWelcomeNotification(fid: number, token: string): Promise<void> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_DOMAIN}/api/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTERNAL_API_SECRET}`
      },
      body: JSON.stringify({
        notificationId: `welcome-${fid}-${Date.now()}`,
        title: 'Welcome to DevmoLink!',
        body: 'Start connecting with developers in your area.',
        targetUrl: `${process.env.NEXT_PUBLIC_DOMAIN}/onboarding`,
        tokens: [token]
      })
    });
    
    if (!response.ok) {
      console.error('Failed to send welcome notification:', await response.text());
    }
  } catch (error) {
    console.error('Error sending welcome notification:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('x-farcaster-signature');
    
    if (!signature) {
      return NextResponse.json(
        createFarcasterError('MISSING_SIGNATURE', 'Missing webhook signature'),
        { status: 401 }
      );
    }
    
    // Verify webhook signature
    const webhookSecret = process.env.FARCASTER_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('FARCASTER_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        createFarcasterError('SERVER_ERROR', 'Webhook secret not configured'),
        { status: 500 }
      );
    }
    
    try {
      const isValid = await verifyWebhookSignature(body, signature, webhookSecret);
      if (!isValid) {
        return NextResponse.json(
          createFarcasterError('INVALID_SIGNATURE', 'Invalid webhook signature'),
          { status: 401 }
        );
      }
    } catch (verificationError) {
      console.error('Signature verification failed:', verificationError);
      return NextResponse.json(
        createFarcasterError('VERIFICATION_FAILED', 'Signature verification failed'),
        { status: 401 }
      );
    }
    
    // Parse the event
    let event: FarcasterWebhookEvent;
    try {
      event = JSON.parse(body);
    } catch (parseError) {
      return NextResponse.json(
        createFarcasterError('INVALID_JSON', 'Invalid JSON in webhook body'),
        { status: 400 }
      );
    }
    
    // Validate required fields
    if (!event.type || !event.data?.fid) {
      return NextResponse.json(
        createFarcasterError('INVALID_EVENT', 'Missing required event fields'),
        { status: 400 }
      );
    }
    
    // Rate limiting
    if (!checkRateLimit(event.data.fid)) {
      return NextResponse.json(
        createFarcasterError('RATE_LIMITED', 'Rate limit exceeded'),
        { status: 429 }
      );
    }
    
    // Process the event based on type
    try {
      switch (event.type) {
        case 'frame_added':
          await handleFrameAdded(event);
          break;
        case 'frame_removed':
          await handleFrameRemoved(event);
          break;
        case 'notifications_enabled':
          await handleNotificationsEnabled(event);
          break;
        case 'notifications_disabled':
          await handleNotificationsDisabled(event);
          break;
        case 'primary_button_clicked':
          await handlePrimaryButtonClicked(event);
          break;
        default:
          console.log('Unknown event type:', event.type);
          return NextResponse.json(
            createFarcasterError('UNKNOWN_EVENT', `Unknown event type: ${event.type}`),
            { status: 400 }
          );
      }
      
      return NextResponse.json({ success: true });
      
    } catch (processingError) {
      console.error('Error processing webhook event:', processingError);
      return NextResponse.json(
        createFarcasterError('PROCESSING_ERROR', 'Failed to process webhook event'),
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      createFarcasterError('WEBHOOK_ERROR', 'Internal webhook error'),
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'farcaster-webhook'
  });
} 