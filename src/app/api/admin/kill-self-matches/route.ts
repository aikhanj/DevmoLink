import { NextResponse } from "next/server";
import { db } from "../../../../firebase";
import { collection, getDocs, deleteDoc } from "firebase/firestore";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("🔍 HUNTING FOR SELF-MATCHES AND SELF-SWIPES...");
    
    let totalDestroyed = 0;
    const destroyedItems: string[] = [];
    
    // 1. Find and destroy self-swipes
    const swipesRef = collection(db, "swipes");
    const swipesSnap = await getDocs(swipesRef);
    
    for (const docSnap of swipesSnap.docs) {
      const data = docSnap.data();
      if (data.from === data.to) {
        console.log(`💀 FOUND SELF-SWIPE: ${data.from} swiped on themselves`);
        await deleteDoc(docSnap.ref);
        destroyedItems.push(`Self-swipe: ${data.from}`);
        totalDestroyed++;
      }
    }
    
    // 2. Find and destroy self-matches
    const matchesRef = collection(db, "matches");
    const matchesSnap = await getDocs(matchesRef);
    
    for (const docSnap of matchesSnap.docs) {
      const data = docSnap.data();
      const users = data.users || [];
      
      // Check if it's a self-match (same user appears twice)
      if (users.length === 2 && users[0] === users[1]) {
        console.log(`💀 FOUND SELF-MATCH: ${users[0]} matched with themselves`);
        await deleteDoc(docSnap.ref);
        destroyedItems.push(`Self-match: ${users[0]}`);
        totalDestroyed++;
      }
      
      // Check if it's a duplicate user in the array
      const uniqueUsers = [...new Set(users)];
      if (uniqueUsers.length !== users.length) {
        console.log(`💀 FOUND DUPLICATE USER MATCH: ${JSON.stringify(users)}`);
        await deleteDoc(docSnap.ref);
        destroyedItems.push(`Duplicate match: ${JSON.stringify(users)}`);
        totalDestroyed++;
      }
    }
    
    console.log(`🧹 DESTROYED ${totalDestroyed} SELF-REFERENCES!`);
    
    return NextResponse.json({ 
      success: true, 
      message: `🧹 Destroyed ${totalDestroyed} self-references!`,
      totalDestroyed,
      destroyedItems
    });
    
  } catch (err) {
    console.error("Error destroying self-references:", err);
    return NextResponse.json({ error: "Failed to destroy self-references" }, { status: 500 });
  }
} 