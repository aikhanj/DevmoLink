import CryptoJS from 'crypto-js';

// Generate a unique encryption key for each chat pair
const generateChatKey = (email1: string, email2: string): string => {
  // Sort emails to ensure consistent key generation
  const sortedEmails = [email1, email2].sort();
  const baseKey = `${sortedEmails[0]}_${sortedEmails[1]}_${process.env.NEXT_PUBLIC_ENCRYPTION_SALT || 'hackmatch_salt'}`;
  
  // Create a deterministic key from the email pair
  return CryptoJS.SHA256(baseKey).toString();
};

// Encrypt a message
export const encryptMessage = (message: string, senderEmail: string, recipientEmail: string): string => {
  try {
    const chatKey = generateChatKey(senderEmail, recipientEmail);
    const encrypted = CryptoJS.AES.encrypt(message, chatKey).toString();
    return encrypted;
  } catch (error) {
    console.error('Encryption failed:', error);
    return message; // Fallback to unencrypted if encryption fails
  }
};

// Decrypt a message
export const decryptMessage = (encryptedMessage: string, senderEmail: string, recipientEmail: string): string => {
  try {
    const chatKey = generateChatKey(senderEmail, recipientEmail);
    const decrypted = CryptoJS.AES.decrypt(encryptedMessage, chatKey);
    const originalMessage = decrypted.toString(CryptoJS.enc.Utf8);
    
    // If decryption fails, return the original (might be unencrypted legacy message)
    if (!originalMessage) {
      console.log('Decryption failed for:', encryptedMessage.substring(0, 20) + '...');
      return encryptedMessage;
    }
    
    return originalMessage;
  } catch (error) {
    console.error('Decryption failed:', error);
    return encryptedMessage; // Fallback to show encrypted text if decryption fails
  }
};

// Check if a message appears to be encrypted
export const isEncrypted = (message: string): boolean => {
  // Basic check: encrypted messages are base64-like and longer than typical messages
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  return message.length > 20 && base64Regex.test(message);
}; 