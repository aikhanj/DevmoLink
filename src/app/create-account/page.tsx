"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
// import { db } from "../firebase";

export default function CreateAccountPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const auth = getAuth();
      await createUserWithEmailAndPassword(auth, email, password);
      router.push("/onboarding"); // redirect to onboarding
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Failed to create account");
      } else {
        setError("Failed to create account");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    try {
      await signIn("google", { callbackUrl: "/onboarding" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#030712] px-4">
      <div className="w-full max-w-md bg-[#18181b] rounded-2xl shadow-2xl p-8 flex flex-col gap-6">
        <h1 className="text-3xl font-extrabold text-center text-[#00FFAB] mb-2">Create Account</h1>
        <button
          onClick={handleGoogleSignup}
          className="w-full py-3 bg-[#00FFAB] text-[#030712] rounded-full font-bold text-lg shadow-lg hover:scale-105 transition mb-4"
          disabled={loading}
        >
          Continue with Google
        </button>
        <div className="text-center text-gray-400 font-mono mb-2">or</div>
        <form onSubmit={handleEmailSignup} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            className="px-4 py-3 rounded-lg bg-[#23272a] text-white focus:outline-none focus:ring-2 focus:ring-[#00FFAB]"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Password"
            className="px-4 py-3 rounded-lg bg-[#23272a] text-white focus:outline-none focus:ring-2 focus:ring-[#00FFAB]"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <input
            type="password"
            placeholder="Confirm Password"
            className="px-4 py-3 rounded-lg bg-[#23272a] text-white focus:outline-none focus:ring-2 focus:ring-[#00FFAB]"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          {error && <div className="text-red-400 text-sm text-center font-mono">{error}</div>}
          <button
            type="submit"
            className="w-full py-3 bg-[#00FFAB] text-[#030712] rounded-full font-bold text-lg shadow-lg hover:scale-105 transition"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>
        {/* Placeholder for more options */}
        <div className="text-center text-gray-400 font-mono mt-4">More sign up options coming soon...</div>
      </div>
    </div>
  );
} 