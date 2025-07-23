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

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    setLocalLoading(true);
    Promise.all([
      fetch("/api/likes").then((res) => res.json()).catch(() => []),
      Promise.resolve().then(() => {
        if (typeof window !== "undefined") {
          try {
            const stored = localStorage.getItem("likedEmails");
            return stored ? JSON.parse(stored) : [];
          } catch {
            return [];
          }
        }
        return [];
      }),
    ]).then(([apiData, localEmails]) => {
      const localProfiles = (localEmails as string[]).map((email) => ({ id: email, email }));
      const combined = [...apiData, ...localProfiles];
      // Deduplicate by id (email)
      const unique = combined.filter((item, idx, arr) => arr.findIndex((a) => a.id === item.id) === idx);
      setChats(unique);
    }).finally(() => {
      setLocalLoading(false);
      setLoading(false);
    });
  }, [session]);

  if (status === "loading" || localLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#030712] font-mono">
        <div className="shimmer h-8 w-32 rounded mb-4" />
        <div className="shimmer h-24 w-64 rounded" />
      </div>
    );
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

    <div id="chatsInbox" className="h-full w-full flex flex-col items-center py-8 min-h-0">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-8">
        Chats
      </h1>

      {/* Testing button to clear localStorage */}
      <button
        onClick={() => {
          localStorage.removeItem('likedEmails');
          setChats([]);
        }}
        className="mb-4 px-3 py-1 bg-blue-500 text-white rounded-md text-sm"
      >
        Reset Chats
      </button>

      {chats.length === 0 ? (
        <p className="text-white/60">No chats yet. Start swiping to find a match!</p>
      ) : (
        <div className="flex-1 !overflow-y-auto w-full max-w-md mx-auto space-y-3 px-2 min-h-0 gradient-scrollbar">
          {chats.map((chat) => (
            <div

              key={chat.id}
              onClick={() => router.push(`/chats/${encodeURIComponent(chat.id)}`)}
              className="w-full flex items-center gap-4 bg-[#18181b] rounded-xl shadow-lg shadow-black/20 p-4 transition-all duration-150 hover:scale-[1.02] hover:shadow-xl"
            >

              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 flex-shrink-0 flex items-center justify-center">
                <span className="text-white font-bold text-lg">{(chat.name ?? chat.email ?? chat.id)[0]}</span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                 <div className="font-semibold text-white text-base leading-snug font-mono truncate">{chat.name ?? chat.email ?? chat.id}</div>
                 <div className="text-[#00FFAB] text-xs truncate font-mono">Say hi and start collaborating!</div>
               </div>
               <MessageCircle className="text-[#00FFAB] transition-all duration-150 ease-out" />
             </div>
           ))}
         </div>
      )}

    </div>
  );
} 