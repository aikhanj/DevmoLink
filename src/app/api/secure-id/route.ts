import { NextRequest, NextResponse } from 'next/server';
import { getSecureIdForEmail, getEmailFromSecureId } from '../../utils/secureId';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, secureId } = body;

    switch (action) {
      case 'generate':
        if (!email) {
          return NextResponse.json({ error: 'Email required' }, { status: 400 });
        }
        const generatedId = getSecureIdForEmail(email);
        return NextResponse.json({ secureId: generatedId });

      case 'getEmail':
        if (!secureId) {
          return NextResponse.json({ error: 'SecureId required' }, { status: 400 });
        }
        const foundEmail = getEmailFromSecureId(secureId);
        return NextResponse.json({ email: foundEmail });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Secure ID API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}