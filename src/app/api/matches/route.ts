import { NextResponse } from "next/server";
import { db } from "../../../firebase";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/authOptions";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userEmail = session.user.email;
  // Get all matches where the user is one of the matched users
  const matchesQ = query(collection(db, "matches"), where("users", "array-contains", userEmail));
  const matchesSnap = await getDocs(matchesQ);
  const matchedUsers = matchesSnap.docs
    .map(doc => doc.data().users)
    .flat()
    .filter((email: string) => email !== userEmail);

  // Fetch profiles for each matched user
  const profiles = [];
  for (const email of matchedUsers) {
    const profileSnap = await getDoc(doc(db, "profiles", email));
    if (profileSnap.exists()) {
      profiles.push({ id: email, ...profileSnap.data() });
    }
  }

  return NextResponse.json(profiles);
} 