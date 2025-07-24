import { NextResponse } from "next/server";
import { db } from "../../../../firebase";
import { collection, getDocs, deleteDoc } from "firebase/firestore";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/authOptions";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("🔫 HUNTING FOR TEST BOT...");
    
    // Search for any profile containing "Test Bot" or suspicious patterns
    const profilesRef = collection(db, "profiles");
    const profilesSnap = await getDocs(profilesRef);
    
    const killedBots: Array<{id: string, name?: string, email?: string}> = [];
    
    for (const docSnap of profilesSnap.docs) {
      const data = docSnap.data();
      const name = data.name?.toLowerCase() || "";
      const email = data.email?.toLowerCase() || "";
      
      // Kill any profile with "test", "bot", or suspicious patterns
      if (
        name.includes("test bot") ||
        name.includes("testbot") ||
        name.includes("test_bot") ||
        email.includes("test") ||
        email.includes("bot") ||
        data.university === "HackMatch University" ||
        (data.skills && Array.isArray(data.skills) && 
         data.skills.some((skill: string) => 
           ["testing", "automation"].includes(skill?.toLowerCase())
         ))
      ) {
        console.log(`💀 FOUND TEST BOT: ${docSnap.id} - ${data.name || data.email}`);
        await deleteDoc(docSnap.ref);
        killedBots.push({
          id: docSnap.id,
          name: data.name,
          email: data.email
        });
      }
    }
    
    // Also clean up any swipes involving test bots
    const swipesRef = collection(db, "swipes");
    const swipesSnap = await getDocs(swipesRef);
    
    for (const docSnap of swipesSnap.docs) {
      const data = docSnap.data();
      const from = data.from?.toLowerCase() || "";
      const to = data.to?.toLowerCase() || "";
      
      if (from.includes("test") || from.includes("bot") || 
          to.includes("test") || to.includes("bot")) {
        await deleteDoc(docSnap.ref);
      }
    }
    
    console.log(`🧹 EXTERMINATED ${killedBots.length} TEST BOTS!`);
    
    return NextResponse.json({ 
      success: true, 
      message: `💀 Successfully eliminated ${killedBots.length} test bots!`,
      killedBots
    });
    
  } catch (err) {
    console.error("Error hunting test bots:", err);
    return NextResponse.json({ error: "Failed to kill test bots" }, { status: 500 });
  }
} 