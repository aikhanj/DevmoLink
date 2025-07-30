import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { db } from "../../../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { getSecureIdForEmail, getEmailFromSecureId } from "../../../utils/secureId";

export async function GET(request: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUserEmail = session.user.email;
  const { email: emailOrSecureId } = await params;

  try {
    let targetEmail: string;
    
    // Determine if the parameter is an email or secure ID
    if (emailOrSecureId.includes('@')) {
      // It's an email
      targetEmail = emailOrSecureId;
    } else {
      // It's a secure ID, convert to email
      const foundEmail = getEmailFromSecureId(emailOrSecureId);
      if (!foundEmail) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }
      targetEmail = foundEmail;
    }

    // SECURITY: Only allow access to matched users
    const users = [currentUserEmail, targetEmail].sort();
    const matchDoc = await getDoc(doc(db, "matches", users.join("_")));
    
    if (!matchDoc.exists()) {
      return NextResponse.json({ 
        error: "Access denied. You can only view profiles of matched users." 
      }, { status: 403 });
    }

    // Fetch the profile
    const profileDoc = await getDoc(doc(db, "profiles", targetEmail));
    if (!profileDoc.exists()) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const profileData = profileDoc.data();
    const secureId = getSecureIdForEmail(targetEmail);

    // Return safe profile data for matched users
    return NextResponse.json({
      id: secureId,
      name: profileData.name,
      email: targetEmail, // Safe to return for matched users
      age: profileData.age,
      gender: profileData.gender,
      timezone: profileData.timezone,
      description: profileData.description,
      professions: profileData.professions || [],
      skills: profileData.skills || {},
      experienceLevel: profileData.experienceLevel,
      interests: profileData.interests || [],
      tools: profileData.tools || [],
      programmingLanguages: profileData.programmingLanguages || [],
      themes: profileData.themes || [],
      photos: ((profileData.photos as string[]) || []).map((photo: string, index: number) => 
        `/api/photos/secure/${secureId}/${index}`
      ),
      avatarUrl: profileData.avatarUrl ? `/api/photos/secure/${secureId}/avatar` : null,
    });

  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
} 