"use client";
import { MessageCircle } from "lucide-react";
import NextImage from "next/image";
import { useSession, signIn } from "next-auth/react";
import { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingContext } from "../MainLayout";
import { toast } from 'react-hot-toast';
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { getEmailFromSecureId, decryptMessage } from "../utils/secureIdHelpers";

// Disable static generation for this route that requires authentication
export const dynamic = 'force-dynamic';

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
    
  const isAdminMode = session?.user?.email === 'ajumashukurov@gmail.com' || 
    session?.user?.email === 'jaikh.saiful@gmail.com'; 

  const resolveEmailFromId = async (id: string): Promise<string | null> => {
    if (id.includes('@')) return id;
    const viaSecure = await getEmailFromSecureId(id);
    if (viaSecure) return viaSecure;
    try {
      const res = await fetch(`/api/profiles/${encodeURIComponent(id)}`);
      if (res.ok) {
        const data = await res.json();
        return typeof data.email === 'string' ? data.email : null;
      }
    } catch {}
    return null;
  };

  const fetchLatestMessage = async (userEmail: string, otherUserId: string): Promise<{message: string, timestamp: number} | null> => {
    const otherUserEmail = await resolveEmailFromId(otherUserId);
    if (!otherUserEmail) return null;
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
      
      let chatSalt = "";
      try {
        const matchDocRef = doc(db, "matches", chatId);
        const matchDoc = await getDoc(matchDocRef);
        if (matchDoc.exists()) {
          const matchData = matchDoc.data();
          chatSalt = matchData.salt || "devmolink_salt"; // Fallback for old chats
        } else {
          chatSalt = "devmolink_salt"; // Fallback for unmigrated chats
        }
      } catch (err) {
        console.error("Failed to fetch chat salt for latest message", err);
        chatSalt = "devmolink_salt"; // Fallback on error
      }

      let displayText = messageData.text;
      
      // Determine the actual sender and recipient for this message
      const messageSender = messageData.from;
      const messageRecipient = messageData.from === userEmail ? otherUserEmail : userEmail;
      
      if (messageData.isEncrypted && messageSender && messageRecipient) {
        displayText = await decryptMessage(messageData.text, messageSender, messageRecipient, chatSalt);
      } else if (messageData.text.length > 50 && /^[A-Za-z0-9+/]+=*$/.test(messageData.text) && messageSender && messageRecipient) {
        const decrypted = await decryptMessage(messageData.text, messageSender, messageRecipient, chatSalt);
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
    
    if (typeof window !== "undefined") {
      localStorage.removeItem("likedEmails");
    }
         Promise.all([
      fetch("/api/matches").then((res) => {
        if (!res.ok) {
          console.error("Failed to fetch matches:", res.status, res.statusText);
          return [];
        }
        return res.json();
      }).catch(() => []),
      fetch("/api/profiles/matches").then((res) => {
        if (!res.ok) {
          console.error("Failed to fetch matched profiles:", res.status, res.statusText);
          return [];
        }
        return res.json();
      }).catch(() => []),
    ]).then(async ([matchedProfiles, matchedUserProfiles]) => {
      const profiles = Array.isArray(matchedProfiles) ? matchedProfiles : [];
      const userProfiles = Array.isArray(matchedUserProfiles) ? matchedUserProfiles : [];
      
      const currentUserEmail = session?.user?.email;
      const filteredMatchedProfiles = profiles.filter((profile: ChatProfile) => 
        profile.email !== currentUserEmail && profile.id !== currentUserEmail
      );

      const enrichedMatchedProfiles = await Promise.all(
        filteredMatchedProfiles.map(async (match: ChatProfile) => {
          const profile = userProfiles.find((p: ChatProfile) => p.email === match.id || p.id === match.id);
          
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

      enrichedMatchedProfiles.sort((a, b) => (b.latestTimestamp || 0) - (a.latestTimestamp || 0));

      setChats(enrichedMatchedProfiles);
      
      const preloadPromises = enrichedMatchedProfiles.map((chat: ChatProfile) => {
        return new Promise<void>((resolve) => {
          if (chat.avatarUrl) {
            const img = new window.Image();
            img.onload = () => resolve();
            img.onerror = () => resolve(); 
            img.src = chat.avatarUrl;
          } else {
            resolve(); 
          }
        });
      });
      
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
    return <div className="min-h-screen flex items-center justify-center bg-black font-sans">Loading...</div>;
  }
  if (!session) {
    return null;
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center w-full bg-black font-sans transition-colors duration-500 min-h-screen">
        <button
          onClick={() => signIn("google")}
          className="px-6 py-3 bg-[var(--accent)] text-black rounded-full font-semibold shadow hover:scale-105 transition-transform text-lg mb-28 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          Sign in with Google to continue
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col px-4 pt-4 bg-black min-h-screen font-sans">
      <h2 className="text-2xl font-bold text-[var(--accent)] mb-6 tracking-tight">Chats</h2>
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
              <div className="text-lg text-white mb-2">You&apos;re all caught up!</div>
              <div className="text-[var(--accent)] mb-4">We&apos;ll ping you when new hackers join.</div>
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
              onClick={() => {
                // Keep URL using secure ID to avoid exposing emails
                router.push(`/chats/${encodeURIComponent(chat.id)}`);
              }}
              className="w-full flex items-center gap-4 bg-[#18181b] rounded-xl shadow-lg shadow-black/20 p-4 transition-all duration-150 hover:scale-[1.02] hover:shadow-xl"
            >
              <div className="w-12 h-12 rounded-full overflow-hidden bg-[#0f1115] flex items-center justify-center text-white font-bold text-lg">
                {chat.avatarUrl ? (
                  <NextImage src={chat.avatarUrl} alt="avatar" width={48} height={48} className="object-cover" unoptimized />
                ) : (
                  <span>{(chat.name ?? "").slice(0, 1)}</span>
                )}
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-white text-[1.125rem]">{chat.name ?? "Chat"}</div>
                <div className="text-[var(--accent)] text-sm truncate">{chat.latestMessage || "Say hi and start collaborating!"}</div>
              </div>
              <MessageCircle className="text-[var(--accent)] transition-all duration-150 ease-out" />
            </button>
          ))
        )}
      </div>
    </div>
  );
} 