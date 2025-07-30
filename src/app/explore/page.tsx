"use client";
import { useSession } from "next-auth/react";
import { useContext, useEffect } from "react";
import { LoadingContext } from "../MainLayout";
import { useRouter } from "next/navigation";

export default function ExplorePage() {
  const { data: session, status } = useSession();
  const { setLoading } = useContext(LoadingContext);
  const router = useRouter();
  useEffect(() => {
    setLoading(status === "loading");
    if (status !== "loading" && !session) {
      router.push("/");
    }
    return () => setLoading(false);
  }, [status, session, setLoading, router]);
  if (status === "loading") return null;
  if (!session) return null;
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