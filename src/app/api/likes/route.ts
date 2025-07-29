import { NextResponse } from "next/server";
import { db } from "../../../firebase";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/authOptions";
import { getSecureIdForEmail } from "../../utils/secureId";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUser = session.user.email;
  // Get all swipes where OTHER USERS swiped right on the CURRENT USER
  const swipesQ = query(collection(db, "swipes"), where("to", "==", currentUser), where("direction", "==", "right"));
  const swipesSnap = await getDocs(swipesQ);
  const likedByEmails = swipesSnap.docs.map(doc => doc.data().from);

  // Exclude users who are already matched with the current user
  const profiles = [];
  for (const email of likedByEmails) {
    // Check if a match exists
    const users = [currentUser, email].sort();
    const matchDoc = await getDoc(doc(db, "matches", users.join("_")));
    if (matchDoc.exists()) continue; // skip if already matched
    
    const profileSnap = await getDoc(doc(db, "profiles", email));
    if (profileSnap.exists()) {
      const secureId = getSecureIdForEmail(email);
      const profileData = profileSnap.data();
      
      // Return only non-sensitive profile data with secure ID
      profiles.push({ 
        id: secureId, // Use secure ID instead of email
        name: profileData.name,
        age: profileData.age,
        avatarUrl: profileData.avatarUrl ? `/api/photos/secure/${secureId}/avatar` : null,
        // Remove email and other sensitive fields
      });
    } else {
      // Fallback when profile doc does not exist - still use secure ID
      const secureId = getSecureIdForEmail(email);
      profiles.push({ 
        id: secureId,
        name: "Unknown User" // Don't expose email even in fallback
      });
    }
  }

  return NextResponse.json(profiles);
} 