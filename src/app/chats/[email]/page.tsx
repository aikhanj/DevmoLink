"use client";
import { useEffect, useState, useContext } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useSession } from "next-auth/react";
import { LoadingContext } from "../../MainLayout";

interface Profile {
  id: string;
  name?: string;
  email?: string;
  photos?: string[];
}

export default function ChatThreadPage({ params }: { params: { email: string } }) {
  const { data: session, status } = useSession();
  const { setLoading } = useContext(LoadingContext);
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const decodedEmail = decodeURIComponent(params.email);

  useEffect(() => {
    if (!decodedEmail) return;
    setLoading(true);
    fetch("/api/profiles")
      .then((res) => res.json())
      .then((data: Profile[]) => {
        const p = data.find((d) => d.email === decodedEmail || d.id === decodedEmail);
        setProfile(p || null);
      })
      .finally(() => setLoading(false));
  }, [decodedEmail]);

  if (status === "loading") return null;
  if (!session) {
    router.push("/");
    return null;
  }

  return (
    <div className="min-h-screen w-full bg-[#030712] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 bg-[#18181b] shadow">
        <button onClick={() => router.back()} aria-label="Back" className="text-[#00FFAB]">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#00FFAB] to-[#009E6F] flex items-center justify-center text-white font-bold text-lg">
            {profile?.name ? profile.name[0] : "?"}
          </div>
          <span className="font-semibold text-white text-lg font-mono">
            {profile?.name || decodedEmail}
          </span>
        </div>
      </div>
      {/* Chat body placeholder */}
      <div className="flex-1 flex items-center justify-center text-[#00FFAB] font-mono px-4">
        <span className="text-center">Chat with {profile?.name || decodedEmail} coming soon!</span>
      </div>
    </div>
  );
} 