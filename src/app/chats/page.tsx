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
    <div className="min-h-screen w-full bg-[#030712] flex flex-col items-center py-8 px-4">
      <h2 className="text-2xl font-bold text-[#00FFAB] mb-8 tracking-tight font-mono">Chats</h2>
      <div className="w-full max-w-md mx-auto space-y-8">
        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-5xl mb-4">🎉</div>
            <div className="text-lg text-white mb-2 font-mono">You&apos;re all caught up!</div>
            <div className="text-[#00FFAB] mb-4 font-mono">We&apos;ll ping you when new hackers join.</div>
            <button className="px-4 py-2 bg-[#00FFAB] text-[#030712] rounded-full opacity-50 cursor-not-allowed font-mono" disabled>
              Refresh
            </button>
          </div>
        ) : (
          chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => router.push(`/chats/${encodeURIComponent(chat.id)}`)}
              className="w-full flex items-center gap-4 bg-[#18181b] rounded-xl shadow-lg shadow-black/20 p-4 transition-all duration-150 hover:scale-[1.02] hover:shadow-xl"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#00FFAB] to-[#009E6F] flex items-center justify-center text-white font-bold text-lg">
                {(chat.name ?? chat.email ?? chat.id)[0]}
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