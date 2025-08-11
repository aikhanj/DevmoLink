// Helper functions for secure ID operations

export async function getSecureIdForEmail(email: string): Promise<string | null> {
  try {
    const response = await fetch('/api/secure-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate', email })
    });
    if (!response.ok) {
      console.log(`Failed to get secure ID for ${email}: ${response.status}`);
      return null;
    }
    const data = await response.json();
    return (data.secureId && typeof data.secureId === 'string') ? data.secureId : null;
  } catch (error) {
    console.error('Error getting secure ID:', error);
    return null;
  }
}

export async function getEmailFromSecureId(secureId: string): Promise<string | null> {
  try {
    const response = await fetch('/api/secure-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'retrieve', secureId })
    });
    if (!response.ok) {
      console.log(`Failed to get email for secure ID ${secureId}: ${response.status}`);
      return null;
    }
    const data = await response.json();
    return (data.email && typeof data.email === 'string') ? data.email : null;
  } catch (error) {
    console.error('Error getting email from secure ID:', error);
    return null;
  }
}

export async function encryptMessage(
  message: string,
  senderEmail: string,
  recipientEmail: string,
  salt: string
): Promise<string> {
  try {
    const response = await fetch('/api/messages/encrypt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'encrypt',
        message,
        senderEmail,
        recipientEmail,
        salt
      })
    });
    const data = await response.json();
    return data.encrypted || message;
  } catch (error) {
    console.error('Encryption failed:', error);
    return message;
  }
}

export async function decryptMessage(
  message: string,
  senderEmail: string,
  recipientEmail: string,
  salt: string
): Promise<string> {
  try {
    const response = await fetch('/api/messages/encrypt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'decrypt',
        message,
        senderEmail,
        recipientEmail,
        salt
      })
    });
    const data = await response.json();
    return data.decrypted || message;
  } catch (error) {
    console.error('Decryption failed:', error);
    return message;
  }
}
