"use client";
import { sendEmailVerification, User } from "firebase/auth";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { auth } from "../../firebase";


export default function VerifyEmailPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [resent, setResent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const emailParam = params.get("email");

  const resend = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    setError("");
    try {
      await sendEmailVerification(auth.currentUser);
      setResent(true);
    } catch (mailErr: unknown) {
      const err = mailErr as { code?: string; message?: string };
      console.error('verification-email error:', err.code, err.message, mailErr);
      setError("Failed to resend verification email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // If user comes back already verified, send them to login
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user: User | null) => {
      if (user) {
        await user.reload();
        if (user.emailVerified) {
          router.replace("/login");
        }
      }
    });
    return unsub;
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#030712] px-4 text-center">
      <div className="w-full max-w-md bg-[#18181b] rounded-2xl shadow-2xl p-8 flex flex-col gap-6 items-center">
        <h1 className="text-3xl font-extrabold text-[#00FFAB]">Verify your Email</h1>
        <p className="text-gray-300">
          We sent a verification link to
          <br />
          <span className="text-[#00FFAB] font-mono break-all">{emailParam || auth.currentUser?.email}</span>
        </p>
        {resent && <p className="text-green-400">Verification email resent ✔</p>}
        {error && <p className="text-red-400">{error}</p>}
        <button
          onClick={resend}
          disabled={loading || resent}
          className="px-6 py-3 bg-[#00FFAB] text-[#030712] rounded-full font-bold text-lg shadow-lg hover:scale-105 transition"
        >
          {loading ? "Sending..." : resent ? "Sent" : "Resend Email"}
        </button>
        <button
          onClick={() => router.replace("/login")}
          className="mt-4 underline text-gray-400 hover:text-gray-200"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
} 