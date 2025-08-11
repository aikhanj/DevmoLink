import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { getSecureIdForEmail, generateSecureId } from '../../utils/secureId';
import { db } from '../../../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { action, email, secureId } = await request.json().catch(() => ({}));

  if (action === 'generate') {
    if (!email) return NextResponse.json({ error: 'Email required for generate action' }, { status: 400 });
    if (email !== session.user.email) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ secureId: getSecureIdForEmail(email) });
  }

  if (action === 'retrieve') {
    if (!secureId) return NextResponse.json({ error: 'SecureId required for retrieve action' }, { status: 400 });
    // Only allow resolving secure IDs within the current user's matched contacts
    const currentUserEmail = session.user.email as string;
    try {
      const matchesRef = collection(db, 'matches');
      const q = query(matchesRef, where('users', 'array-contains', currentUserEmail));
      const snapshot = await getDocs(q);

      for (const docSnap of snapshot.docs) {
        const users: string[] = (docSnap.data()?.users as string[]) || [];
        const others = users.filter((u) => u !== currentUserEmail);
        for (const otherEmail of others) {
          const otherId = generateSecureId(otherEmail);
          if (otherId === secureId) {
            return NextResponse.json({ email: otherEmail });
          }
        }
      }

      return NextResponse.json({ email: null }, { status: 404 });
    } catch (error) {
      console.error('Failed to resolve secure ID:', error);
      return NextResponse.json({ error: 'Failed to resolve' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}