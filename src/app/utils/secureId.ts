import { createHash } from 'crypto';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

export function generateSecureId(email: string): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET missing');
  return createHash('sha256')
    .update(email + secret)
    .digest('hex')
    .substring(0, 32);
}

const emailToSecureIdCache = new Map<string, string>();
const secureIdToEmailCache = new Map<string, string>();

export function getSecureIdForEmail(email: string): string {
  const cached = emailToSecureIdCache.get(email);
  if (cached) return cached;
  const id = generateSecureId(email);
  emailToSecureIdCache.set(email, id);
  secureIdToEmailCache.set(id, email);
  return id;
}

export async function getEmailFromSecureId(secureId: string): Promise<string | null> {
  // Check cache first
  const cached = secureIdToEmailCache.get(secureId);
  if (cached) return cached;

  try {
    // Search through profiles
    const profilesRef = collection(db, "profiles");
    const snapshot = await getDocs(profilesRef);
    
    for (const docSnap of snapshot.docs) {
      const email = docSnap.id;
      const profileSecureId = getSecureIdForEmail(email);
      if (profileSecureId === secureId) {
        secureIdToEmailCache.set(secureId, email);
        return email;
      }
    }
  } catch (error) {
    console.error('Error searching for email by secure ID:', error);
  }
  
  return null;
}

export function clearSecureIdCache(): void {
  emailToSecureIdCache.clear();
  secureIdToEmailCache.clear();
}