import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/authOptions";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../../../firebase";
import { getSecureIdForEmail, getEmailFromSecureId } from "../../../../utils/secureId";

// Helper function to find email from secure ID
async function findEmailBySecureId(secureId: string): Promise<string | null> {
  // First check cache
  const cachedEmail = getEmailFromSecureId(secureId);
  if (cachedEmail) {
    return cachedEmail;
  }
  
  // If not in cache, search through profiles
  const profilesRef = collection(db, "profiles");
  const snapshot = await getDocs(profilesRef);
  
  for (const docSnap of snapshot.docs) {
    const email = docSnap.id; // Document ID is the email
    const profileSecureId = getSecureIdForEmail(email);
    if (profileSecureId === secureId) {
      return email;
    }
  }
  
  return null;
}

// Check if user has permission to view this profile's photos
async function hasPhotoAccess(viewerEmail: string, targetEmail: string): Promise<boolean> {
  // Users can always view their own photos
  if (viewerEmail === targetEmail) {
    return true;
  }
  
  // Check if users have matched (mutual right swipes)
  const users = [viewerEmail, targetEmail].sort();
  const matchDoc = await getDoc(doc(db, "matches", users.join("_")));
  if (matchDoc.exists()) {
    return true; // Matched users can see each other's photos
  }
  
  // Allow viewing photos during swiping - be more permissive for the swiping experience
  // Check if this profile would be available to the current user through the profiles API
  const swipesQuery = query(
    collection(db, "swipes"), 
    where("from", "==", viewerEmail),
    where("to", "==", targetEmail)
  );
  const swipesSnapshot = await getDocs(swipesQuery);
  
  // Also check if the target user has swiped right on the viewer (for likes page)
  const reverseSwipesQuery = query(
    collection(db, "swipes"), 
    where("from", "==", targetEmail),
    where("to", "==", viewerEmail)
  );
  const reverseSwipesSnapshot = await getDocs(reverseSwipesQuery);
  
  // Allow access if:
  // 1. No swipe recorded (user can view during swiping decision)
  // 2. Current user has swiped right on target (user has shown interest)
  // 3. Target user has swiped right on current user (shown on likes page)
  if (swipesSnapshot.empty) {
    return true; // No swipe recorded = user can view during swiping decision
  }
  
  // Check if current user has right-swiped this person
  const hasRightSwipe = swipesSnapshot.docs.some(doc => doc.data().direction === 'right');
  if (hasRightSwipe) {
    return true; // User has swiped right = can still view photos
  }
  
  // Check if target user has right-swiped the current user (likes page scenario)
  const hasReverseRightSwipe = reverseSwipesSnapshot.docs.some(doc => doc.data().direction === 'right');
  if (hasReverseRightSwipe) {
    return true; // Target user has liked current user = current user can view photos
  }
  

  // ADDITIONAL: Allow viewing photos if the target user has liked the current user
  // This enables photo viewing in the "likes" page before current user responds
  const likesQuery = query(
    collection(db, "swipes"),
    where("from", "==", targetEmail),
    where("to", "==", viewerEmail),
    where("direction", "==", "right")
  );
  const likesSnapshot = await getDocs(likesQuery);
  
  if (!likesSnapshot.empty) {
    // Target user has liked viewer = viewer can see their photos to decide
    return true;
  }
  
  return false; // Default: no access (already swiped or other restriction)

}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ params: string[] }> }
) {
  try {
    // Await params to fix Next.js warning
    const routeParams = await params;
    const [secureId, photoIdentifier] = routeParams.params;
    
    // Require authentication to view any photos
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUserEmail = session.user.email;
    
    if (!secureId || !photoIdentifier) {
      return NextResponse.json({ error: "Invalid photo request" }, { status: 400 });
    }

    // Convert secure ID to email to fetch profile
    let targetEmail: string;
    if (secureId.includes('@')) {
      // Backwards compatibility for direct email access
      targetEmail = secureId;
    } else {
      // Find email from secure ID
      const foundEmail = await findEmailBySecureId(secureId);
      if (!foundEmail) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }
      targetEmail = foundEmail;
    }

    // SECURITY: Check if current user has permission to view this profile's photos
    const hasAccess = await hasPhotoAccess(currentUserEmail, targetEmail);
    if (!hasAccess) {
      return NextResponse.json({ 
        error: "Forbidden - You don't have permission to view these photos",
        message: "Photos are only visible to matched users. If you find a workaround, message me on telegram @whitebloodcell65"
      }, { status: 403 });
    }

    // Fetch the profile to get the actual photo URLs
    const profileDoc = await getDoc(doc(db, "profiles", targetEmail));
    if (!profileDoc.exists()) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    
    const profileData = profileDoc.data();
    let photoUrl: string | null = null;
    
    // Handle avatar vs regular photos
    if (photoIdentifier === 'avatar') {
      photoUrl = profileData.avatarUrl;
    } else {
      const photoIndex = parseInt(photoIdentifier);
      const photos = profileData.photos || [];
      photoUrl = photos[photoIndex];
    }
    
    if (!photoUrl) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Log photo access for security monitoring
    console.log(`📸 PHOTO ACCESS: ${currentUserEmail} → ${targetEmail} (${photoIdentifier})`);

    // Redirect to the actual photo URL
    return NextResponse.redirect(photoUrl);
    
  } catch (error) {
    console.error("Error serving secure photo:", error);
    return NextResponse.json({ error: "Failed to serve photo" }, { status: 500 });
  }
}