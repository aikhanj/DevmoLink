import { NextResponse } from "next/server";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../firebase";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/authOptions";

export async function GET() {
  try {
    // Get the current user's session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUserEmail = session.user.email;

    // Get all profiles except the current user
    const profilesRef = collection(db, "profiles");
    const profilesQuery = query(
      profilesRef,
      where("email", "!=", currentUserEmail)
    );
    
    const snapshot = await getDocs(profilesQuery);
    const profiles = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));

  return NextResponse.json(profiles);
  } catch (error) {
    console.error("Error fetching profiles:", error);
    return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 });
  }
} 