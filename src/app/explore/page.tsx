"use client";
import { useSession, signIn } from "next-auth/react";
import { useContext, useEffect } from "react";
import { LoadingContext } from "../MainLayout";

export default function ExplorePage() {
  const { data: session, status } = useSession();
  const { setLoading } = useContext(LoadingContext);
  useEffect(() => {
    setLoading(status === "loading");
    return () => setLoading(false);
  }, [status, setLoading]);
  if (status === "loading") return null;
  if (!session) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#030712] px-4">
        <button
          onClick={() => signIn("google")}
          className="px-6 py-3 bg-[#34B6FF] text-[#030712] rounded-full font-semibold shadow hover:scale-105 transition-transform text-lg mb-28 focus:outline-none focus:ring-2 focus:ring-[#00FFAB] font-mono"
        >
          Sign in with Google to continue
        </button>
      </div>
    );
  }
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#030712] px-4">
      <div className="w-full max-w-md mb-28 mx-auto flex flex-col items-center gap-8 py-16">
        <span className="text-2xl font-bold text-[#00FFAB] mb-2 tracking-tight font-mono">Coming soon</span>
        <span className="text-[#00FFAB] text-lg text-center font-mono">New ways to discover teams and projects are on the way!</span>
        <div className="text-5xl">🚀</div>
      </div>
    </div>
  );
} 