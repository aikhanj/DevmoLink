import { NextResponse } from "next/server";
import { db } from "../../../../firebase";
import { collection, query, where, getDocs, deleteDoc } from "firebase/firestore";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/authOptions";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email;

  try {
    // Delete swipes created by this user
    const swipesQ = query(collection(db, "swipes"), where("from", "==", email));
    const swipesSnap = await getDocs(swipesQ);
    for (const docSnap of swipesSnap.docs) {
      await deleteDoc(docSnap.ref);
    }

    // Delete matches that involve this user
    const matchesQ = query(collection(db, "matches"), where("users", "array-contains", email));
    const matchesSnap = await getDocs(matchesQ);
    for (const docSnap of matchesSnap.docs) {
      await deleteDoc(docSnap.ref);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error resetting chats:", err);
    return NextResponse.json({ error: "Failed to reset" }, { status: 500 });
  }
} 