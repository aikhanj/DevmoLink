import { createHash } from 'crypto';

/**
 * Generate a secure, non-reversible ID from an email address
 * This allows us to identify profiles publicly without exposing emails
 */
export function generateSecureId(email: string): string {
  // Use SHA-256 hash with a salt to create a secure ID
  const hash = createHash('sha256');
  const secret = process.env.NEXTAUTH_SECRET

  hash.update(email + secret); // Use app secret as salt
  const result = hash.digest('hex').substring(0, 16); // Use first 16 characters for shorter IDs
  
  return result;
}

/**
 * In-memory cache to avoid repeated database lookups
 * In production, this should be a Redis cache or similar
 */
const emailToSecureIdCache = new Map<string, string>();
const secureIdToEmailCache = new Map<string, string>();

/**
 * Get secure ID for an email, with caching
 */
export function getSecureIdForEmail(email: string): string {
  if (emailToSecureIdCache.has(email)) {
    return emailToSecureIdCache.get(email)!;
  }
  
  const secureId = generateSecureId(email);
  emailToSecureIdCache.set(email, secureId);
  secureIdToEmailCache.set(secureId, email);
  return secureId;
}

/**
 * Get email from secure ID, with caching
 * Note: This requires the email to have been processed before
 */
export function getEmailFromSecureId(secureId: string): string | null {
  return secureIdToEmailCache.get(secureId) || null;
}

/**
 * Clear the cache (useful for testing)
 */
export function clearSecureIdCache(): void {
  emailToSecureIdCache.clear();
  secureIdToEmailCache.clear();
}