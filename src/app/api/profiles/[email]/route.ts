import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";

export async function GET(_request: NextRequest) {
  // SECURITY FIX: This endpoint was a critical security vulnerability
  // It allowed unauthenticated access to ANY profile by email
  
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Endpoint disabled for security - force users to use the secure paginated /api/profiles
  return NextResponse.json({ 
    error: "This endpoint has been disabled for security reasons. Use /api/profiles with pagination instead.",
    suggestion: "Use GET /api/profiles?limit=3 for secure profile access"
  }, { status: 403 });
} 