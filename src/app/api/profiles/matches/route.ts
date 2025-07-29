import { NextResponse } from "next/server";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../../firebase";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { getSecureIdForEmail } from "../../../utils/secureId";

export async function GET() {
  try {
    // Get the current user's session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUserEmail = session.user.email;

    // Get all matches for the current user
    const matchesRef = collection(db, "matches");
    const matchesQuery = query(
      matchesRef,
      where("participants", "array-contains", currentUserEmail)
    );
    
    const matchesSnapshot = await getDocs(matchesQuery);
    const matchIds = matchesSnapshot.docs.map(doc => doc.id);

    if (matchIds.length === 0) {
      return NextResponse.json([]);
    }

    // Get profiles for matched users only - but return secure data
    const profilesRef = collection(db, "profiles");
    const profilesQuery = query(
      profilesRef,
      where("email", "in", matchIds)
    );
    
    const profilesSnapshot = await getDocs(profilesQuery);
    const profiles = profilesSnapshot.docs.map(doc => {
      const email = doc.id;
      const secureId = getSecureIdForEmail(email);
      const profileData = doc.data();
      
      // Return only safe profile data with secure IDs
      return {
        id: secureId, // Use secure ID instead of email
        name: profileData.name,
        age: profileData.age,
        avatarUrl: profileData.avatarUrl ? `/api/photos/secure/${secureId}/avatar` : null,
        // Remove email and other sensitive data
      };
    });

    return NextResponse.json(profiles);
    
  } catch (error) {
    console.error("Error fetching matched profiles:", error);
    return NextResponse.json({ error: "Failed to fetch matched profiles" }, { status: 500 });
  }
} 