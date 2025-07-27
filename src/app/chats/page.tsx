"use client";
import { MessageCircle } from "lucide-react";
import { useSession, signIn } from "next-auth/react";
import { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingContext } from "../MainLayout";

interface ChatProfile {
  id: string; // email
  name?: string;
  email?: string;
  avatarUrl?: string;
}

export default function ChatsPage() {
  const { data: session, status } = useSession();
  const [chats, setChats] = useState<ChatProfile[]>([]);
  const [localLoading, setLocalLoading] = useState(true);
  const { setLoading } = useContext(LoadingContext);
  const router = useRouter();
  // Testing mode flag – mirrors logic on the Home page
  const isTestingMode = process.env.NEXT_PUBLIC_FORCE_MOCK_DATA === "true" ||
    (process.env.NEXT_PUBLIC_FORCE_MOCK_DATA === undefined && process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true");
  
  // 🔒 ADMIN MODE - Only show dangerous buttons to specific admin users
  const isAdminMode = session?.user?.email === 'ajumashukurov@gmail.com' || // Your Gmail account
    session?.user?.email === 'jaikh.saiful@gmail.com'; // Add other admin emails here

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
      fetch("/api/matches").then((res) => res.json()).catch(() => []),
      // Get all profiles for avatars
      fetch("/api/profiles").then((res) => res.json()).catch(() => []),
    ]).then(([matchedProfiles, allProfiles]) => {
      // 🚨 FILTER OUT SELF AND ONLY SHOW REAL MATCHES! 🚨
      const currentUserEmail = session?.user?.email;
      const filteredMatchedProfiles = matchedProfiles.filter((profile: ChatProfile) => 
        profile.email !== currentUserEmail && profile.id !== currentUserEmail
      );

      // Merge matched profiles with their full profile data (including avatars)
      const enrichedMatchedProfiles = filteredMatchedProfiles.map((match: ChatProfile) => {
        const profile = allProfiles.find((p: ChatProfile) => p.email === match.id || p.id === match.id);
        return {
          ...match,
          name: profile?.name || match.name,
          avatarUrl: profile?.avatarUrl
        };
      });

      // ONLY show actual matches from the database (no localStorage phantom data)
      setChats(enrichedMatchedProfiles);
    }).finally(() => {
      setLocalLoading(false);
      setLoading(false);
    });
  }, [session]);

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
    <div className="min-h-screen w-full bg-[#030712] flex flex-col items-center py-8 px-4">
      <h2 className="text-2xl font-bold text-[#00FFAB] mb-8 tracking-tight font-mono">Chats</h2>
      <div className="w-full max-w-md mx-auto space-y-8">
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
                    alert("🧹 All user data reset globally! Everyone can start fresh.");
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
           <div className="flex justify-center mb-4">
             <button
               onClick={async () => {
                 const confirmed = confirm("☢️ NUCLEAR WARNING ☢️\n\nThis will COMPLETELY OBLITERATE your ENTIRE Firestore database!\n\nALL profiles, messages, matches, swipes - EVERYTHING will be PERMANENTLY DELETED!\n\nAre you absolutely sure you want to proceed with TOTAL ANNIHILATION?");
                 
                 if (confirmed) {
                   const doubleConfirm = confirm("🚨 FINAL WARNING 🚨\n\nLast chance to abort nuclear launch!\n\nClick OK to DESTROY EVERYTHING or Cancel to abort mission.");
                   
                   if (doubleConfirm) {
                     try {
                       const response = await fetch("/api/admin/nuclear-reset", { method: "POST" });
                       const result = await response.json();
                       if (response.ok) {
                         alert(`☢️ ${result.message}\n\nYour Firestore database has been COMPLETELY WIPED!`);
                       } else {
                         alert("Nuclear launch failed!");
                       }
                     } catch (error) {
                       console.error("Nuclear error:", error);
                       alert("Nuclear launch system malfunction!");
                     }
                     setChats([]);
                   }
                 }
               }}
               className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-full font-bold shadow-lg hover:scale-105 transition-all duration-200 text-sm border-2 border-red-400 animate-pulse"
             >
                            ☢️ NUCLEAR RESET ☢️
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
              onClick={() => router.push(`/chats/${encodeURIComponent(chat.id)}`)}
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
                <div className="text-[#00FFAB] text-sm truncate font-mono">Say hi and start collaborating!</div>
              </div>
              <MessageCircle className="text-[#00FFAB] transition-all duration-150 ease-out" />
            </button>
          ))
        )}
      </div>
    </div>
  );
} 