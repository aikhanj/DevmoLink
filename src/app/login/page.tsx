"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, getAuth, signOut } from "firebase/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const auth = getAuth();
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      // Prevent unverified accounts from logging in
      if (!user.emailVerified) {
        await signOut(auth);
        setError("Please verify your email before logging in.");
        return;
      }
      router.push("/");
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    signIn("google", { callbackUrl: "/" });
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#030712] px-4">
      <div className="w-full max-w-md bg-[#18181b] rounded-2xl shadow-2xl p-8 flex flex-col gap-6">
        <h1 className="text-3xl font-extrabold text-center text-[#00FFAB] mb-2">Log In</h1>
        <button
          onClick={handleGoogleLogin}
          className="w-full py-3 bg-[#00FFAB] text-[#030712] rounded-full font-bold text-lg shadow-lg hover:scale-105 transition mb-4"
          disabled={loading}
        >
          Continue with Google
        </button>
        <div className="text-center text-gray-400 font-mono mb-2">or</div>
        <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
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
            autoComplete="current-password"
          />
          {error && <div className="text-red-400 text-sm text-center font-mono">{error}</div>}
          <button
            type="submit"
            className="w-full py-3 bg-[#00FFAB] text-[#030712] rounded-full font-bold text-lg shadow-lg hover:scale-105 transition"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>
      </div>
    </div>
  );
} 