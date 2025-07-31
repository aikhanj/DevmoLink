import { NextResponse } from "next/server";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../../../firebase";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { generateSecureId } from "../../../utils/secureId";

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
      where("users", "array-contains", currentUserEmail)
    );
    
    const matchesSnapshot = await getDocs(matchesQuery);
    
    // Extract all matched user emails (excluding current user)
    const matchedEmails: string[] = [];
    matchesSnapshot.docs.forEach(doc => {
      const users = doc.data().users || [];
      const otherUsers = users.filter((email: string) => email !== currentUserEmail);
      matchedEmails.push(...otherUsers);
    });

    if (matchedEmails.length === 0) {
      return NextResponse.json([]);
    }

    // Get profiles for matched users only - but return secure data
    const profiles = [];
    for (const email of matchedEmails) {
      try {
        const profileDoc = await getDoc(doc(db, "profiles", email));
        if (profileDoc.exists()) {
          const secureId = generateSecureId(email);
          const profileData = profileDoc.data();
          
          // Return only safe profile data with secure IDs
          profiles.push({
            id: secureId, // Use secure ID instead of email
            name: profileData.name,
            age: profileData.age,
            avatarUrl: profileData.avatarUrl ? `/api/photos/secure/${secureId}/avatar` : null,
            // Remove email and other sensitive data
          });
        }
      } catch (error) {
        console.error(`Error fetching profile for ${email}:`, error);
      }
    }

    return NextResponse.json(profiles);
    
  } catch (error) {
    console.error("Error fetching matched profiles:", error);
    return NextResponse.json({ error: "Failed to fetch matched profiles" }, { status: 500 });
  }
} 