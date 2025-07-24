import { NextResponse } from "next/server";
import { db } from "../../../../firebase";
import { collection, getDocs, deleteDoc } from "firebase/firestore";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("☢️ NUCLEAR RESET INITIATED...");
    console.log(`🚨 LAUNCHED BY: ${session.user.email}`);
    
    // List of all collections to DESTROY
    const collectionsToNuke = [
      "profiles",
      "swipes", 
      "matches",
      "messages",
      "chats",
      "likes",
      "users",
      "notifications",
      // Add any other collections you might have
    ];
    
    let totalDestroyed = 0;
    const destroyedCollections: string[] = [];
    
    for (const collectionName of collectionsToNuke) {
      try {
        const collectionRef = collection(db, collectionName);
        const snapshot = await getDocs(collectionRef);
        
        if (!snapshot.empty) {
          console.log(`💥 NUKING COLLECTION: ${collectionName} (${snapshot.docs.length} documents)`);
          
          for (const docSnap of snapshot.docs) {
            await deleteDoc(docSnap.ref);
            totalDestroyed++;
          }
          
          destroyedCollections.push(`${collectionName} (${snapshot.docs.length} docs)`);
        }
      } catch (error) {
        console.log(`⚠️ Collection ${collectionName} doesn't exist or already empty`);
      }
    }
    
    console.log(`☢️ NUCLEAR DEVASTATION COMPLETE! ${totalDestroyed} documents VAPORIZED!`);
    
    return NextResponse.json({ 
      success: true, 
      message: `☢️ NUCLEAR RESET COMPLETE! Destroyed ${totalDestroyed} documents across ${destroyedCollections.length} collections!`,
      totalDestroyed,
      destroyedCollections
    });
    
  } catch (err) {
    console.error("Nuclear reset failed:", err);
    return NextResponse.json({ error: "Nuclear launch failed" }, { status: 500 });
  }
} 