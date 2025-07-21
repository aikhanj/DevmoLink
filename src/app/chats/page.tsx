"use client";
import { MessageCircle } from "lucide-react";
import { useSession, signIn } from "next-auth/react";
import { useContext, useEffect } from "react";
import { LoadingContext } from "../MainLayout";

const MOCK_CHATS = [
  { id: 1, name: "Alex Kim", last: "Hey! Ready for the hackathon?" },
  { id: 2, name: "Priya Singh", last: "Let’s sync up tomorrow." },
  { id: 3, name: "Sam Lee", last: "Sent you the Figma link!" },
];

export default function ChatsPage() {
  const { data: session, status } = useSession();
  const { setLoading } = useContext(LoadingContext);
  useEffect(() => {
    setLoading(status === "loading");
    return () => setLoading(false);
  }, [status, setLoading]);
  if (status === "loading") return null;
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#282a36] via-[#5865f2] to-[#0f172a] font-sans transition-colors duration-500">
        <button
          onClick={() => signIn("google")}
          className="px-6 py-3 bg-indigo-600 text-white rounded-full font-semibold shadow hover:scale-105 transition-transform text-lg mb-28 focus:outline-none focus:ring-2 focus:ring-indigo-400"
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
        {MOCK_CHATS.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-5xl mb-4">🎉</div>
            <div className="text-lg text-white mb-2 font-mono">You&apos;re all caught up!</div>
            <div className="text-[#00FFAB] mb-4 font-mono">We&apos;ll ping you when new hackers join.</div>
            <button className="px-4 py-2 bg-[#00FFAB] text-[#030712] rounded-full opacity-50 cursor-not-allowed font-mono" disabled>
              Refresh
            </button>
          </div>
        ) : (
          MOCK_CHATS.map((chat) => (
            <div
              key={chat.id}
              className="flex items-center gap-4 bg-[#18181b] rounded-xl shadow-lg shadow-black/20 p-4 transition-all duration-150 hover:scale-[1.02] hover:shadow-xl"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#00FFAB] to-[#009E6F] flex items-center justify-center text-white font-bold text-lg">
                {chat.name[0]}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-white text-[1.125rem] font-mono">{chat.name}</div>
                <div className="text-[#00FFAB] text-sm truncate font-mono">{chat.last}</div>
              </div>
              <MessageCircle className="text-[#00FFAB] transition-all duration-150 ease-out" />
            </div>
          ))
        )}
      </div>
    </div>
  );
} 