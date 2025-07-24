"use client";
import { Heart } from "lucide-react";
import { useSession, signIn } from "next-auth/react";
import { useEffect, useState, useContext } from "react";
import { LoadingContext } from "../MainLayout";

interface Profile {
  id: string;
  name: string;
  email: string;
  // Add other fields as needed
}

export default function LikesPage() {
  const { data: session, status } = useSession();
  const [whoLikesMe, setWhoLikesMe] = useState<Profile[]>([]);
  const [localLoading, setLocalLoading] = useState(true);
  const { setLoading } = useContext(LoadingContext);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    setLocalLoading(true);
    fetch("/api/likes")
      .then(res => res.json())
      .then(data => {
        setWhoLikesMe(data);
        setLocalLoading(false);
        setLoading(false);
      });
  }, [session]);
  
  if (status === "loading" || localLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#030712] font-mono">
        <div className="shimmer h-8 w-32 rounded mb-4"></div>
        <div className="shimmer h-24 w-64 rounded"></div>
      </div>
    );
  }
  if (!session) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#030712] font-mono transition-colors duration-500 mb-14">
        <button
          onClick={() => signIn("google")}
          className="px-6 py-3 bg-[#00FFAB] text-[#030712] rounded-full font-semibold shadow hover:scale-105 transition-transform text-lg mb-28 focus:outline-none focus:ring-2 focus:ring-[#00FFAB] font-mono"
        >
          Sign in with Google to continue
        </button>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen w-full bg-[#030712] flex flex-col items-center py-8 px-4">
      <h2 className="text-2xl font-bold text-[#00FFAB] mb-8 tracking-tight font-mono">Who Likes You</h2>
      <div className="w-full max-w-md mx-auto space-y-4">
        {whoLikesMe.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-5xl mb-4">💔</div>
            <div className="text-lg text-white mb-2 font-mono">Nobody has liked you yet!</div>
            <div className="text-[#00FFAB] mb-4 font-mono">Keep swiping - someone will notice you soon!</div>
            <button className="px-4 py-2 bg-[#00FFAB] text-[#030712] rounded-full opacity-50 cursor-not-allowed font-mono" disabled>
              Refresh
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-[#00FFAB]/30 rounded-xl p-4">
            {whoLikesMe.map((profile) => (
              <div
                key={profile.id}
                className="bg-[#18181b] rounded-xl shadow-lg shadow-black/20 p-4 mb-4 transition-all duration-150 hover:scale-[1.02] hover:shadow-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#00FFAB] to-[#009E6F] flex items-center justify-center text-white font-bold text-lg">
                    <Heart className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-white text-[1.125rem] font-mono">{profile.name}</div>
                    <div className="text-[#00FFAB] text-sm font-mono">{profile.email}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 