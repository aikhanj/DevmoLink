import { NextResponse } from "next/server";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../../firebase";

export async function GET(
  request: Request,
  { params }: { params: { email: string } }
) {
  try {
    const email = decodeURIComponent(params.email);
    
    if (!email) {
      return NextResponse.json({ error: "Email parameter is required" }, { status: 400 });
    }

    // Query for the specific profile by email
    const profilesRef = collection(db, "profiles");
    const q = query(profilesRef, where("email", "==", email));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // If not found by email, try by ID
      const idQuery = query(profilesRef, where("__name__", "==", email));
      const idSnapshot = await getDocs(idQuery);
      
      if (idSnapshot.empty) {
        return NextResponse.json(null, { status: 404 });
      }
      
      const profile = { id: idSnapshot.docs[0].id, ...idSnapshot.docs[0].data() };
      return NextResponse.json(profile);
    }
    
    const profile = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    return NextResponse.json(profile);
    
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
} 