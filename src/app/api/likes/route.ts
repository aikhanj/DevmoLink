import { NextResponse } from "next/server";
import { db } from "../../../firebase";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUser = session.user.email;
  // Get all swipes where OTHER USERS swiped right on the CURRENT USER
  const swipesQ = query(collection(db, "swipes"), where("to", "==", currentUser), where("direction", "==", "right"));
  const swipesSnap = await getDocs(swipesQ);
  const likedByEmails = swipesSnap.docs.map(doc => doc.data().from);

  // Fetch profiles for each person who liked you
  const profiles = [];
  for (const email of likedByEmails) {
    const profileSnap = await getDoc(doc(db, "profiles", email));
    if (profileSnap.exists()) {
      profiles.push({ id: email, ...profileSnap.data() });
    } else {
      // Fallback when profile doc does not exist (mock data or user not onboarded)
      profiles.push({ id: email, email });
    }
  }

  return NextResponse.json(profiles);
} 