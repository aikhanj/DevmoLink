import { NextResponse } from "next/server";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, listAll, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../../../firebase";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Get the current profile
    const profileRef = doc(db, "profiles", email);
    const profileSnap = await getDoc(profileRef);
    
    if (!profileSnap.exists()) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const profileData = profileSnap.data();
    const currentPhotos = profileData.photos || [];

    // List all photos in storage for this user
    const photosRef = ref(storage, "photos");
    const photosList = await listAll(photosRef);
    
    // Filter files that belong to this user
    const userPhotoFiles = photosList.items.filter(item => 
      item.name.startsWith(email + "_")
    );

    // Get download URLs for all user photos
    const photoUrls = [];
    for (const file of userPhotoFiles) {
      try {
        const url = await getDownloadURL(file);
        photoUrls.push(url);
      } catch (error) {
        console.error(`Failed to get URL for ${file.name}:`, error);
      }
    }

    // Combine existing URLs with newly found ones (remove duplicates)
    const allPhotoUrls = [...new Set([...currentPhotos, ...photoUrls])];

    // Update the profile with the photos
    await updateDoc(profileRef, {
      photos: allPhotoUrls
    });

    return NextResponse.json({
      success: true,
      email,
      foundPhotos: userPhotoFiles.length,
      currentPhotos: currentPhotos.length,
      totalPhotos: allPhotoUrls.length,
      newPhotos: photoUrls,
      allPhotos: allPhotoUrls
    });

  } catch (error) {
    console.error("Error fixing photos:", error);
    return NextResponse.json({ 
      error: "Failed to fix photos", 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 