import CryptoJS from 'crypto-js';

// Derive a deterministic key from the two participant emails **and** a per-chat salt that
// is stored with the chat document in Firestore. Falling back to the original constant
// keeps backward-compatibility for legacy chats that were created before salts existed.
const generateChatKey = (email1: string, email2: string, salt: string): string => {
  const sortedEmails = [email1, email2].sort();
  const safeSalt = salt || "hackmatch_salt";
  const baseKey = `${sortedEmails[0]}_${sortedEmails[1]}_${safeSalt}`;

  return CryptoJS.SHA256(baseKey).toString();
};

// Encrypt a message
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
    return message; // Fallback to plain text if encryption fails
  }
};

// Decrypt a message
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
      // Likely encrypted with an old scheme — return ciphertext so UI can fall back.
      console.log("Decryption failed for:", encryptedMessage.substring(0, 20) + "...");
      return encryptedMessage;
    }

    return originalMessage;
  } catch (error) {
    console.error("Decryption failed:", error);
    return encryptedMessage;
  }
};

// Check if a message appears to be encrypted
export const isEncrypted = (message: string): boolean => {
  // Basic check: encrypted messages are base64-like and longer than typical messages
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  return message.length > 20 && base64Regex.test(message);
}; 