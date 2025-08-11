import 'server-only';
import CryptoJS from 'crypto-js';

const SERVER_SECRET = process.env.ENCRYPTION_SECRET;

const generateChatKey = (email1: string, email2: string, salt: string): string => {
  if (!SERVER_SECRET) throw new Error('ENCRYPTION_SECRET missing');
  if (!salt) throw new Error('chat salt missing');
  const sorted = [email1, email2].sort();
  const base = `${sorted[0]}_${sorted[1]}_${salt}_${SERVER_SECRET}`;
  return CryptoJS.PBKDF2(base, salt, { keySize: 256/32, iterations: 10000 }).toString();
};

export const generateSalt = (): string =>
  CryptoJS.lib.WordArray.random(16).toString();

export const encryptMessage = (
  message: string,
  senderEmail: string,
  recipientEmail: string,
  salt: string
): string => {
  try {
    const chatKey = generateChatKey(senderEmail, recipientEmail, salt);
    return CryptoJS.AES.encrypt(message, chatKey).toString();
  } catch (error) {
    console.error("Encryption failed:", error);
    return message;
  }
};

export const decryptMessage = (
  encryptedMessage: string,
  senderEmail: string,
  recipientEmail: string,
  salt: string
): string => {
  try {
    const chatKey = generateChatKey(senderEmail, recipientEmail, salt);
    const decrypted = CryptoJS.AES.decrypt(encryptedMessage, chatKey);
    const originalMessage = decrypted.toString(CryptoJS.enc.Utf8);

    if (!originalMessage) {
      return encryptedMessage;
    }

    return originalMessage;
  } catch (error) {
    console.error("Decryption failed:", error);
    return encryptedMessage;
  }
};

export const isEncrypted = (message: string): boolean => {
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  return message.length > 20 && base64Regex.test(message);
}; 