import { NextResponse } from "next/server";
import { db } from "../../../../firebase";
import { collection, getDocs } from "firebase/firestore";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";

// Admin emails that can perform backups
const ADMIN_EMAILS = [
  "ajumashukurov@gmail.com",
  "admin@devmolink.com",
];

// Collections to backup
const COLLECTIONS_TO_BACKUP = [
  "profiles",
  "matches", 
  "swipes",
  "messages",
  "chats",
  "likes",
  "users",
  "notifications"
];

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // SECURITY: Only allow admin users to create backups
  if (!ADMIN_EMAILS.includes(session.user.email)) {
    return NextResponse.json({ 
      error: "Forbidden - Admin access required",
      message: "This backup endpoint is restricted to administrators only"
    }, { status: 403 });
  }

  try {
    console.log(`🛡️ Backup initiated by ADMIN: ${session.user.email}`);
    
    const backup: Record<string, unknown[] | object> = {};
    const stats = {
      collections: 0,
      totalDocuments: 0,
      timestamp: new Date().toISOString(),
      adminUser: session.user.email
    };

    // Backup each collection
    for (const collectionName of COLLECTIONS_TO_BACKUP) {
      try {
        console.log(`📦 Backing up collection: ${collectionName}`);
        
        const collectionRef = collection(db, collectionName);
        const snapshot = await getDocs(collectionRef);
        
        const documents: unknown[] = [];
        snapshot.forEach((doc) => {
          documents.push({
            id: doc.id,
            data: doc.data()
          });
        });
        
        backup[collectionName] = documents;
        stats.collections++;
        stats.totalDocuments += documents.length;
        
        console.log(`✅ Backed up ${documents.length} documents from ${collectionName}`);
      } catch (error) {
        console.error(`❌ Failed to backup collection ${collectionName}:`, error);
        backup[collectionName] = [];
      }
    }

    // Add metadata
    backup._metadata = stats;

    console.log(`🎉 Backup complete! ${stats.totalDocuments} documents from ${stats.collections} collections`);

    // Return backup as downloadable JSON
    const response = new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="firestore-backup-${new Date().toISOString().split('T')[0]}.json"`,
        'Cache-Control': 'no-cache'
      }
    });

    return response;
  } catch (err) {
    console.error("Error creating backup:", err);
    return NextResponse.json({ error: "Failed to create backup" }, { status: 500 });
  }
}

// Health check endpoint
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Count documents in each collection
    const collectionSizes: Record<string, number> = {};
    let totalDocs = 0;

    for (const collectionName of COLLECTIONS_TO_BACKUP) {
      try {
        const snapshot = await getDocs(collection(db, collectionName));
        const size = snapshot.size;
        collectionSizes[collectionName] = size;
        totalDocs += size;
      } catch {
        collectionSizes[collectionName] = 0;
      }
    }

    return NextResponse.json({
      status: "ready",
      collections: collectionSizes,
      totalDocuments: totalDocs,
      lastChecked: new Date().toISOString()
    });
  } catch (err) {
    return NextResponse.json({ error: "Health check failed" }, { status: 500 });
  }
}