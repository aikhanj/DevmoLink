import { NextResponse } from 'next/server';
import { encryptMessage, decryptMessage, generateSalt } from '../../../utils/encryption';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, message, senderEmail, recipientEmail, salt } = body;

    if (!action || !senderEmail || !recipientEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (action === 'encrypt') {
      if (!message || !salt) {
        return NextResponse.json(
          { error: 'Missing message or salt for encryption' },
          { status: 400 }
        );
      }
      const encrypted = encryptMessage(message, senderEmail, recipientEmail, salt);
      return NextResponse.json({ encrypted });
    } 
    
    if (action === 'decrypt') {
      if (!message || !salt) {
        return NextResponse.json(
          { error: 'Missing message or salt for decryption' },
          { status: 400 }
        );
      }
      const decrypted = decryptMessage(message, senderEmail, recipientEmail, salt);
      return NextResponse.json({ decrypted });
    }
    
    if (action === 'generateSalt') {
      const newSalt = generateSalt();
      return NextResponse.json({ salt: newSalt });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Encryption API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
