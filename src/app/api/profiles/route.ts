import { NextResponse } from "next/server";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../firebase";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/authOptions";
import { generateSecureId } from "../../utils/secureId";

// Filter sensitive data from profiles for public swiping
const filterProfileForPublic = (profile: Record<string, unknown>, secureId: string) => ({
  id: secureId, // Use secure hashed ID instead of email
  name: profile.name,
  age: profile.age,
  gender: profile.gender,
  timezone: profile.timezone,
  description: profile.description,
  professions: profile.professions || [],
  skills: profile.skills || {},
  experienceLevel: profile.experienceLevel,
  interests: profile.interests || [],
  tools: profile.tools || [],
  programmingLanguages: profile.programmingLanguages || [],
  themes: profile.themes || [],
  // Replace direct photo URLs with secure proxy URLs using secure ID
  photos: ((profile.photos as string[]) || []).map((photo: string, index: number) => 
    `/api/photos/secure/${secureId}/${index}`
  ),
  avatarUrl: profile.avatarUrl ? `/api/photos/secure/${secureId}/avatar` : null,
  // Explicitly exclude email and other sensitive fields
  // email: profile.email, // REMOVED - this was the security issue
  // Any other sensitive fields should be excluded here
});

export async function GET(request: Request) {
  try {
    // Get the current user's session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUserEmail = session.user.email;
    const url = new URL(request.url);
    
    // Get pagination parameters
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '3'), 10); // Max 10 profiles
    const excludeIds = url.searchParams.get('exclude')?.split(',').filter(Boolean) || [];

    // Get all profiles except the current user
    const profilesRef = collection(db, "profiles");
    const profilesQuery = query(
      profilesRef,
      where("email", "!=", currentUserEmail)
    );
    
    const snapshot = await getDocs(profilesQuery);
    
    // Convert to filtered profiles and exclude already seen ones
    const allProfiles = snapshot.docs
      .map(doc => {
        const profileData = doc.data();
        const email = doc.id; // Document ID is the email
        const secureId = generateSecureId(email); // Generate secure ID
        
        return {
          secureId,
          profile: filterProfileForPublic({ 
            id: doc.id, 
            ...profileData 
          }, secureId)
        };
      })
      .filter(({ secureId }) => !excludeIds.includes(secureId)); // Exclude already seen profiles

    // Return only the requested number of profiles
    const limitedProfiles = allProfiles.slice(0, limit).map(({ profile }) => profile);

    return NextResponse.json({
      profiles: limitedProfiles,
      hasMore: allProfiles.length > limit,
      total: allProfiles.length
    });
    
  } catch (error) {
    console.error("Error fetching profiles:", error);
    return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 });
  }
} 