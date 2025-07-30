import { NextResponse } from "next/server";
import { db } from "../../../firebase";
import { collection, addDoc, getDocs, query, where, doc, setDoc, getDoc } from "firebase/firestore";
import { randomBytes } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/authOptions";
import { getSecureIdForEmail, getEmailFromSecureId } from "../../utils/secureId";

// Helper function to find email from secure ID
async function findEmailBySecureId(secureId: string): Promise<string | null> {
  // First check cache
  const cachedEmail = getEmailFromSecureId(secureId);
  if (cachedEmail) {
    return cachedEmail;
  }
  
  // If not in cache, we need to search through profiles
  // This is inefficient but works without data migration
  const profilesRef = collection(db, "profiles");
  const snapshot = await getDocs(profilesRef);
  
  for (const doc of snapshot.docs) {
    const email = doc.id; // Document ID is the email
    const profileSecureId = getSecureIdForEmail(email);
    if (profileSecureId === secureId) {
      return email;
    }
  }
  
  return null;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { to, direction } = await req.json();
  const from = session.user.email;

  if (!to || !direction) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Convert secure ID to email for internal logic
  let toEmail: string;
  if (to.includes('@')) {
    // If it's already an email (backwards compatibility)
    toEmail = to;
  } else {
    // If it's a secure ID, look up the email
    const foundEmail = await findEmailBySecureId(to);
    if (!foundEmail) {
      return NextResponse.json({ error: "Target profile not found" }, { status: 400 });
    }
    toEmail = foundEmail;
  }

  // 🚨 PREVENT SELF-SWIPES! 🚨
  if (from === toEmail) {
    return NextResponse.json({ error: "Cannot swipe on yourself, narcissist!" }, { status: 400 });
  }

  // 🚨 PREVENT SWIPES IF PROFILE INCOMPLETE 🚨
  const profileSnap = await getDoc(doc(db, "profiles", from));
  if (!profileSnap.exists()) {
    return NextResponse.json({ error: "Complete your profile before swiping." }, { status: 400 });
  }
  const profile = profileSnap.data();
  // Define required fields for a complete profile
  const requiredFields = [
    "name",
    "age", 
    "avatarUrl",
    "photos",
    "timezone",
    "gender",
    "professions",
    "skills",
    "tools",
    "experienceLevel",
    "interests"
  ];
  const isProfileComplete = requiredFields.every(field => {
    if (field === "skills") {
      // Special handling for skills object - check if any skill category has content
      const skills = profile[field];
      if (!skills || typeof skills !== "object") return false;
      return Object.values(skills).some(category => 
        Array.isArray(category) && category.length > 0
      );
    }
    if (Array.isArray(profile[field])) {
      return profile[field].length > 0;
    }
    return Boolean(profile[field]);
  });
  if (!isProfileComplete) {
    // Debug: Log which fields are missing
    const missingFields = requiredFields.filter(field => {
      if (field === "skills") {
        const skills = profile[field];
        if (!skills || typeof skills !== "object") return true;
        return !Object.values(skills).some(category => 
          Array.isArray(category) && category.length > 0
        );
      }
      if (Array.isArray(profile[field])) {
        return profile[field].length === 0;
      }
      return !Boolean(profile[field]);
    });
    
    console.error("Profile incomplete for user:", from, "Missing fields:", missingFields);
    return NextResponse.json({ 
      error: "Complete your profile before swiping.", 
      missingFields 
    }, { status: 400 });
  }

  await addDoc(collection(db, "swipes"), {
    from,
    to: toEmail,
    direction,
    timestamp: Date.now(),
  });

  let matched = false;
  if (direction === "right") {
    // Check if the other user has already swiped right on this user
    const q = query(
      collection(db, "swipes"),
      where("from", "==", toEmail),
      where("to", "==", from),
      where("direction", "==", "right")
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      // Create a match document (sorted user emails for uniqueness)
      const users = [from, toEmail].sort();
      // Generate a random per-chat salt that will be stored with the match document.
      const salt = randomBytes(16).toString("hex");

      await setDoc(doc(db, "matches", users.join("_")), {
        users,
        createdAt: Date.now(),
        salt,
      });
      matched = true;
    }
  }

  return NextResponse.json({ 
    success: true, 
    matched,
    matchedUserEmail: matched ? toEmail : undefined 
  });
}

export async function GET(_req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const from = session.user.email;
  const q = query(collection(db, "swipes"), where("from", "==", from));
  const snap = await getDocs(q);
  
  // Convert emails to secure IDs for frontend
  const swipedSecureIds = snap.docs.map(doc => {
    const toEmail = doc.data().to;
    return getSecureIdForEmail(toEmail);
  });

  return NextResponse.json({ swipedIds: swipedSecureIds });
} 