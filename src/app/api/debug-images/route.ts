import { NextResponse } from "next/server";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/authOptions";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const targetEmail = url.searchParams.get('email');
  
  try {
    if (targetEmail) {
      // Check specific user's profile
      const profileSnap = await getDoc(doc(db, "profiles", targetEmail));
      if (!profileSnap.exists()) {
        return NextResponse.json({ 
          error: "Profile not found", 
          email: targetEmail 
        });
      }
      
      const data = profileSnap.data();
      
      // Test image URL accessibility
      const imageTests = [];
      
      if (data.avatarUrl) {
        try {
          const response = await fetch(data.avatarUrl, { method: 'HEAD' });
          imageTests.push({
            type: 'avatar',
            url: data.avatarUrl,
            status: response.status,
            accessible: response.ok,
            contentType: response.headers.get('content-type'),
            contentLength: response.headers.get('content-length')
          });
        } catch (error) {
          imageTests.push({
            type: 'avatar',
            url: data.avatarUrl,
            error: error instanceof Error ? error.message : 'Unknown error',
            accessible: false
          });
        }
      }
      
      if (data.photos && Array.isArray(data.photos)) {
        for (let i = 0; i < data.photos.length; i++) {
          const photoUrl = data.photos[i];
          try {
            const response = await fetch(photoUrl, { method: 'HEAD' });
            imageTests.push({
              type: 'photo',
              index: i,
              url: photoUrl,
              status: response.status,
              accessible: response.ok,
              contentType: response.headers.get('content-type'),
              contentLength: response.headers.get('content-length')
            });
          } catch (error) {
            imageTests.push({
              type: 'photo',
              index: i,
              url: photoUrl,
              error: error instanceof Error ? error.message : 'Unknown error',
              accessible: false
            });
          }
        }
      }
      
      return NextResponse.json({
        email: targetEmail,
        profile: {
          name: data.name,
          avatarUrl: data.avatarUrl,
          photos: data.photos,
          photoCount: data.photos ? data.photos.length : 0
        },
        imageTests,
        summary: {
          totalImages: imageTests.length,
          accessibleImages: imageTests.filter(test => test.accessible).length,
          failedImages: imageTests.filter(test => !test.accessible).length
        }
      });
    } else {
      // Get all profiles with image data
      const snapshot = await getDocs(collection(db, "profiles"));
      const profiles = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          email: doc.id,
          name: data.name,
          hasAvatar: !!data.avatarUrl,
          avatarUrl: data.avatarUrl,
          photoCount: data.photos ? data.photos.length : 0,
          photos: data.photos || []
        };
      }).filter(profile => profile.hasAvatar || profile.photoCount > 0);
      
      return NextResponse.json({
        totalProfiles: profiles.length,
        profiles
      });
    }
  } catch (error) {
    return NextResponse.json({ 
      error: "Failed to debug images", 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 