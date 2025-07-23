"use client";
import { useRouter } from "next/navigation";
import ProfileForm from "../ProfileForm";

export default function OnboardingPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#030712]">
      <ProfileForm onClose={() => router.push("/")} hideClose={true}/>
    </div>
  );
} 