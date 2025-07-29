import { NextResponse } from "next/server";
import { db } from "../../../../firebase";
import { collection, getDocs, deleteDoc } from "firebase/firestore";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";

// Admin emails that can access dangerous reset endpoints
const ADMIN_EMAILS = [
  "ajumashukurov@gmail.com", // Current user
  "admin@devmolink.com", // Add other admin emails here
];

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // SECURITY: Only allow admin users to perform global resets
  if (!ADMIN_EMAILS.includes(session.user.email)) {
    return NextResponse.json({ 
      error: "Forbidden - Admin access required",
      message: "This dangerous endpoint is restricted to administrators only"
    }, { status: 403 });
  }

  try {
    // Delete ALL swipes from ALL users
    const swipesSnap = await getDocs(collection(db, "swipes"));
    for (const docSnap of swipesSnap.docs) {
      await deleteDoc(docSnap.ref);
    }

    // Delete ALL matches
    const matchesSnap = await getDocs(collection(db, "matches"));
    for (const docSnap of matchesSnap.docs) {
      await deleteDoc(docSnap.ref);
    }

    console.log(`🧹 Global reset completed by ADMIN: ${session.user.email}`);
    return NextResponse.json({ 
      success: true, 
      message: "All swipes and matches have been reset globally" 
    });
  } catch (err) {
    console.error("Error performing global reset:", err);
    return NextResponse.json({ error: "Failed to reset" }, { status: 500 });
  }
} 