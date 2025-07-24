import { NextResponse } from "next/server";
import { db } from "../../../firebase";
import { collection, addDoc, getDocs, query, where, doc, setDoc } from "firebase/firestore";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { to, direction } = await req.json();
  const from = session.user.email;

  if (!to || !direction) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // 🚨 PREVENT SELF-SWIPES! 🚨
  if (from === to) {
    return NextResponse.json({ error: "Cannot swipe on yourself, narcissist!" }, { status: 400 });
  }

  await addDoc(collection(db, "swipes"), {
    from,
    to,
    direction,
    timestamp: Date.now(),
  });

  let matched = false;
  if (direction === "right") {
    // Check if the other user has already swiped right on this user
    const q = query(
      collection(db, "swipes"),
      where("from", "==", to),
      where("to", "==", from),
      where("direction", "==", "right")
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      // Create a match document (sorted user emails for uniqueness)
      const users = [from, to].sort();
      await setDoc(doc(db, "matches", users.join("_")), {
        users,
        createdAt: Date.now(),
      });
      matched = true;
    }
  }

  return NextResponse.json({ success: true, matched });
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const from = session.user.email;
  const q = query(collection(db, "swipes"), where("from", "==", from));
  const snap = await getDocs(q);
  const swipedIds = snap.docs.map(doc => doc.data().to);

  return NextResponse.json({ swipedIds });
} 