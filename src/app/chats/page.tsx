"use client";
import { MessageCircle } from "lucide-react";
import { useSession, signIn } from "next-auth/react";
import { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingContext } from "../MainLayout";
import { toast } from 'react-hot-toast';
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { decryptMessage } from "../utils/encryption";
import { getEmailFromSecureId } from "../utils/secureId";

// Client-side secure ID helpers
async function getSecureIdForEmail(email: string): Promise<string> {
  const response = await fetch('/api/secure-id', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'generate', email })
  });
  const data = await response.json();
  return data.secureId;
}

interface ChatProfile {
  id: string; // email
  name?: string;
  email?: string;
  avatarUrl?: string;
  latestMessage?: string;
  latestTimestamp?: number;
}

export default function ChatsPage() {
  const { data: session, status } = useSession();
  const [chats, setChats] = useState<ChatProfile[]>([]);
  const [_localLoading, setLocalLoading] = useState(true);
  const { setLoading } = useContext(LoadingContext);
  const router = useRouter();
  // Testing mode flag – mirrors logic on the Home page
  const _isTestingMode = process.env.NEXT_PUBLIC_FORCE_MOCK_DATA === "true" ||
    (process.env.NEXT_PUBLIC_FORCE_MOCK_DATA === undefined && process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true");
  
  // 🔒 ADMIN MODE - Only show dangerous buttons to specific admin users
  const isAdminMode = session?.user?.email === 'ajumashukurov@gmail.com' || // Your Gmail account
    session?.user?.email === 'jaikh.saiful@gmail.com'; // Add other admin emails here

  // Helper function to find email from secure ID
  const findEmailBySecureId = async (secureId: string): Promise<string | null> => {
    // First check cache - this now needs to be done server-side
    // TODO: Implement server-side caching properly
    
    // If not in cache, search through profiles
    const profilesRef = collection(db, "profiles");
    const snapshot = await getDocs(profilesRef);
    
    for (const docSnap of snapshot.docs) {
      const email = docSnap.id; // Document ID is the email
      const profileSecureId = await getSecureIdForEmail(email);
      if (profileSecureId === secureId) {
        return email;
      }
    }
    
    return null;
  };

  // Function to fetch latest message for a chat
  const fetchLatestMessage = async (userEmail: string, otherUserSecureId: string): Promise<{message: string, timestamp: number} | null> => {
    // Convert secure ID to actual email
    let otherUserEmail = getEmailFromSecureId(otherUserSecureId);
    
    // If not in cache and looks like secure ID, search for it
    if (!otherUserEmail && !otherUserSecureId.includes('@')) {
      otherUserEmail = await findEmailBySecureId(otherUserSecureId);
    }
    
    // Fallback to treating as email if conversion failed
    if (!otherUserEmail) {
      otherUserEmail = otherUserSecureId;
    }
    try {
      const chatId = [userEmail, otherUserEmail].sort().join("_");
      const messagesRef = collection(db, "matches", chatId, "messages");
      const q = query(messagesRef, orderBy("timestamp", "desc"), limit(1));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }

      const latestDoc = snapshot.docs[0];
      const messageData = latestDoc.data();
      
      // Get chat salt for decryption
      let chatSalt = "devmolink_salt";
      try {
        const matchDocRef = doc(db, "matches", chatId);
        const matchDoc = await getDoc(matchDocRef);
        if (matchDoc.exists()) {
          const matchData = matchDoc.data();
          chatSalt = matchData.salt || "devmolink_salt";
        }
      } catch (err) {
        console.error("Failed to fetch chat salt for latest message", err);
      }

      let displayText = messageData.text;
      
      // Decrypt if encrypted
      if (messageData.isEncrypted) {
        displayText = decryptMessage(messageData.text, userEmail, otherUserEmail, chatSalt);
      } else if (messageData.text.length > 50 && /^[A-Za-z0-9+/]+=*$/.test(messageData.text)) {
        // Fallback: try to decrypt if it looks encrypted
        const decrypted = decryptMessage(messageData.text, userEmail, otherUserEmail, chatSalt);
        if (decrypted !== messageData.text && decrypted.length > 0 && !decrypted.includes('U2FsdGVk')) {
          displayText = decrypted;
        }
      }

      return {
        message: displayText,
        timestamp: messageData.timestamp || 0
      };
    } catch (error) {
      console.error("Error fetching latest message:", error);
      return null;
    }
  };

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    setLocalLoading(true);
    
    // 🧹 CLEAR ANY PHANTOM LOCALSTORAGE DATA
    if (typeof window !== "undefined") {
      localStorage.removeItem("likedEmails");
    }
         Promise.all([
      // Get matches from database ONLY
      fetch("/api/matches").then((res) => {
        if (!res.ok) {
          console.error("Failed to fetch matches:", res.status, res.statusText);
          return [];
        }
        return res.json();
      }).catch(() => []),
      // Get profiles for matched users only
      fetch("/api/profiles/matches").then((res) => {
        if (!res.ok) {
          console.error("Failed to fetch matched profiles:", res.status, res.statusText);
          return [];
        }
        return res.json();
      }).catch(() => []),
    ]).then(async ([matchedProfiles, matchedUserProfiles]) => {
      // Ensure both are arrays
      const profiles = Array.isArray(matchedProfiles) ? matchedProfiles : [];
      const userProfiles = Array.isArray(matchedUserProfiles) ? matchedUserProfiles : [];
      
      // 🚨 FILTER OUT SELF AND ONLY SHOW REAL MATCHES! 🚨
      const currentUserEmail = session?.user?.email;
      const filteredMatchedProfiles = profiles.filter((profile: ChatProfile) => 
        profile.email !== currentUserEmail && profile.id !== currentUserEmail
      );

      // Merge matched profiles with their full profile data (including avatars and latest messages)
      const enrichedMatchedProfiles = await Promise.all(
        filteredMatchedProfiles.map(async (match: ChatProfile) => {
          const profile = userProfiles.find((p: ChatProfile) => p.email === match.id || p.id === match.id);
          
          // Fetch latest message for this chat
          let latestMessage = "Say hi and start collaborating!";
          let latestTimestamp = 0;
          
          if (currentUserEmail) {
            const latestMessageData = await fetchLatestMessage(currentUserEmail, match.id);
            if (latestMessageData) {
              latestMessage = latestMessageData.message;
              latestTimestamp = latestMessageData.timestamp;
            }
          }
          
          return {
            ...match,
            name: profile?.name || match.name,
            avatarUrl: profile?.avatarUrl,
            latestMessage,
            latestTimestamp
          };
        })
      );

      // Sort chats by latest message timestamp (most recent first)
      enrichedMatchedProfiles.sort((a, b) => (b.latestTimestamp || 0) - (a.latestTimestamp || 0));

      // ONLY show actual matches from the database (no localStorage phantom data)
      setChats(enrichedMatchedProfiles);
      
      // Preload all avatar images before showing the page
      const preloadPromises = enrichedMatchedProfiles.map((chat: ChatProfile) => {
        return new Promise<void>((resolve) => {
          if (chat.avatarUrl) {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve(); // Still resolve to not block the UI
            img.src = chat.avatarUrl;
          } else {
            resolve(); // No avatar to load
          }
        });
      });
      
      // Wait for all avatars to load
      await Promise.all(preloadPromises);
      
    }).finally(() => {
      setLocalLoading(false);
      setLoading(false);
    });
  }, [session, setLoading]);

  useEffect(() => {
    if (status !== "loading" && !session) {
      router.push("/");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  if (!session) {
    return null;
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center w-full bg-[#030712] font-sans transition-colors duration-500">
        <button
          onClick={() => signIn("google")}
          className="px-6 py-3 bg-[#00FFAB] text-[#030712] rounded-full font-semibold shadow hover:scale-105 transition-transform text-lg mb-28 focus:outline-none focus:ring-2 focus:ring-[#00FFAB]"
        >
          Sign in with Google to continue
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col px-4 pt-4">
      <h2 className="text-2xl font-bold text-[#00FFAB] mb-6 tracking-tight font-mono">Chats</h2>
      <div className="w-full max-w-md space-y-6 flex-1">
                 {/* Admin buttons - only show in development or to admin users */}
         {isAdminMode && (
         <>
         <div className="flex justify-end mb-4 gap-2">
           <button
             onClick={() => {
               if (typeof window !== "undefined") {
                 localStorage.removeItem("likedEmails");
               }
               // Clear only current user's data
               fetch("/api/chats/reset", { method: "POST" }).catch(() => {});
               setChats([]);
             }}
             className="px-4 py-2 bg-blue-500 text-white rounded-full font-semibold shadow hover:scale-105 transition-transform text-sm"
           >
             Reset My Data
           </button>
                       <button
              onClick={async () => {
                if (typeof window !== "undefined") {
                  localStorage.removeItem("likedEmails");
                }
                // Clear ALL users' data globally
                try {
                  const response = await fetch("/api/chats/reset-all", { method: "POST" });
                  if (response.ok) {
                    toast.success("🧹 All user data reset globally! Everyone can start fresh.");
                  }
                } catch (error) {
                  console.error("Reset error:", error);
                }
                setChats([]);
              }}
              className="px-4 py-2 bg-red-500 text-white rounded-full font-semibold shadow hover:scale-105 transition-transform text-sm"
            >
              🧹 Reset ALL Data
            </button>
            
             
           </div>
          
        </>
        )}
                 {chats.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-16">
             <div className="text-5xl mb-4">🎉</div>
             <div className="text-lg text-white mb-2 font-mono">You&apos;re all caught up!</div>
             <div className="text-[#00FFAB] mb-4 font-mono">We&apos;ll ping you when new hackers join.</div>
             {/* <button 
               onClick={() => {
                 // Clear any phantom localStorage data and refresh
                 if (typeof window !== "undefined") {
                   localStorage.removeItem("likedEmails");
                 }
                 window.location.reload();
               }}
               className="px-4 py-2 bg-[#00FFAB] text-[#030712] rounded-full font-mono hover:scale-105 transition-transform"
             >
               🧹 Clear & Refresh
             </button> */}
           </div>
        ) : (
          chats.map((chat) => (
            <button
              key={chat.id}
              onClick={async () => {
                // Convert secure ID to email for navigation
                let emailForNavigation = getEmailFromSecureId(chat.id);
                
                // If not in cache and looks like secure ID, search for it
                if (!emailForNavigation && !chat.id.includes('@')) {
                  emailForNavigation = await findEmailBySecureId(chat.id);
                }
                
                // Fallback to treating as email if conversion failed
                if (!emailForNavigation) {
                  emailForNavigation = chat.id;
                }
                
                router.push(`/chats/${encodeURIComponent(emailForNavigation)}`);
              }}
              className="w-full flex items-center gap-4 bg-[#18181b] rounded-xl shadow-lg shadow-black/20 p-4 transition-all duration-150 hover:scale-[1.02] hover:shadow-xl"
            >
                             <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-r from-[#00FFAB] to-[#009E6F] flex items-center justify-center text-white font-bold text-lg">
                 {chat.avatarUrl ? (
                   <img src={chat.avatarUrl} alt={chat.name || chat.email} className="w-full h-full object-cover" />
                 ) : (
                   <span>{(chat.name ?? chat.email ?? chat.id)[0]}</span>
                 )}
               </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-white text-[1.125rem] font-mono">{chat.name ?? chat.email ?? chat.id}</div>
                <div className="text-[#00FFAB] text-sm truncate font-mono">{chat.latestMessage || "Say hi and start collaborating!"}</div>
              </div>
              <MessageCircle className="text-[#00FFAB] transition-all duration-150 ease-out" />
            </button>
          ))
        )}
      </div>
    </div>
  );
} 