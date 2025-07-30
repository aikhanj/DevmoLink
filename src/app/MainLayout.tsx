"use client";
import React, { useState, createContext } from "react";
import { Settings, Flame, Heart, MessageCircle, User, Compass } from "lucide-react";
import Link from "next/link";
// import { Dialog } from "@headlessui/react"; // Unused
import { signOut, useSession, signIn } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import TopNav from "./components/TopNav";
import { MiniAppWrapper } from "../components/MiniAppWrapper";

const navItems = [
  { href: "/", label: "Home", icon: Flame },
  { href: "/likes", label: "Likes", icon: Heart },
  { href: "/chats", label: "Chats", icon: MessageCircle },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/explore", label: "Explore", icon: Compass },
];

// Global loading context
export const LoadingContext = createContext<{ loading: boolean; setLoading: (v: boolean) => void }>({ loading: false, setLoading: () => {} });

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const { theme: _theme = 'light', setTheme: _setTheme } = useTheme();
  const [_notifications, _setNotifications] = useState(true);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<{ name?: string; avatarUrl?: string } | null>(null);

  React.useEffect(() => {
    const fetchProfile = async () => {
      if (session?.user?.email) {
        const snap = await getDoc(doc(db, "profiles", session.user.email));
        if (snap.exists()) {
          setProfile(snap.data());
        } else {
          setProfile(null);
        }
      }
    };
    fetchProfile();
  }, [session]);

  // console.log('settingsOpen:', settingsOpen);

  // Check if current page needs special layout (chat or security audit)
  const isChatPage = pathname?.startsWith('/chats/') || pathname?.includes('/chat/'); // Only individual chat pages, not /chats list
  const isSecurityAuditPage = pathname?.startsWith('/security-audit');
  const needsFullLayout = isChatPage || isSecurityAuditPage;

  const handleGoogleLogin = () => {
    signIn("google", { callbackUrl: "/" });
  };

  // Determine if header should be hidden
  const hideHeader = (!session) || pathname === "/create-account" || pathname === "/login" || isChatPage;

  return (
    <LoadingContext.Provider value={{ loading, setLoading }}>
      <MiniAppWrapper>
        <div className={`min-h-screen ${isSecurityAuditPage ? 'flex flex-col' : 'grid grid-rows-[auto_1fr]'} bg-[#030712] dark relative overflow-x-hidden ${isSecurityAuditPage ? 'overflow-y-auto' : ''}`}>
        {/* Global SVG grid background overlay */}
        <div className="pointer-events-none fixed inset-0 z-0 opacity-10">
          <svg width="100%" height="100%" className="absolute inset-0" style={{ minHeight: '100vh' }}>
            <defs>
              <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#fff" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        {/* Global Loading Spinner Overlay with fade */}
        <div className={`fixed inset-0 z-[100] flex items-center justify-center pointer-events-none transition-opacity duration-300 ${loading ? 'opacity-100' : 'opacity-0'}`}>
          <div className="w-full max-w-md mx-auto space-y-4 px-4">
            <div className="shimmer h-8 rounded-lg mb-4"></div>
            <div className="shimmer h-32 rounded-xl mb-4"></div>
            <div className="shimmer h-32 rounded-xl mb-4"></div>
            <div className="shimmer h-32 rounded-xl"></div>
          </div>
        </div>
        
                  {/* devmolink name always at top left */}
        {hideHeader && (
          <div className="fixed top-0 left-0 w-full z-40 flex items-center justify-between px-8 h-16 bg-black/60 backdrop-blur-lg shadow-inner">
            <button
              onClick={() => router.push('/')} 
              className="font-mono text-2xl font-bold text-[#00FFAB] select-none tracking-tight"
              style={{ background: 'none', border: 'none', outline: 'none' }}
              aria-label="Go to home"
            >
              devmolink
            </button>
            {!session && (
              <button
                // onClick={() => router.push('/login')}
                onClick={handleGoogleLogin}

                className="px-6 py-2 bg-[#00FFAB] text-[#030712] rounded-2xl text-lg font-extrabold shadow-2xl transition-transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-[#00FFAB]"
                style={{ marginLeft: 'auto' }}
              >
                Login
              </button>
            )}
          </div>
        )}
        
        {/* Desktop Navigation - Header */}
        {!hideHeader && (
          <TopNav onSettingsClick={() => setSettingsOpen(v => !v)} settingsOpen={settingsOpen} />
        )}
        
        {/* Mobile Header - only logo and settings */}
        {!hideHeader && (
          <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 h-14 bg-[#030712]/90 backdrop-blur-md border-b border-[#00FFAB]/20 md:hidden">
            <button 
            onClick={() => router.push('/')} 
            className="font-bold text-xl text-[#00FFAB] select-none">
              devmolink
            </button>
            <button
              className={`z-[60] flex items-center px-2 py-1 transition duration-200 hover:scale-105 ${settingsOpen ? 'text-[#00FFAB] font-bold active-tab' : ''}`}
              onClick={() => setSettingsOpen(v => !v)}
              aria-label="Open settings"
            >
              <Settings className={`w-6 h-6 ${settingsOpen ? 'text-[#00FFAB] drop-shadow-[0_0_8px_#00FFAB]' : 'text-gray-200'}`} />
            </button>
          </header>
        )}
        
        {/* Main content with fade, flex-1 for vertical centering */}

        {needsFullLayout ? (
          /* Chat pages and security audit need full screen without constraints */
          <main className={`min-h-screen flex flex-col w-full transition-opacity duration-300 ${loading ? 'opacity-0 pointer-events-none' : 'opacity-100'} ${isSecurityAuditPage ? 'overflow-y-auto' : ''}`}>
            {children}
          </main>
        ) : (
          /* Regular pages with centering and constraints */
          <main className={`min-h-screen flex flex-col items-center justify-center w-full px-2 pb-20 pt-16 md:pb-8 md:pt-16 transition-opacity duration-300 ${loading ? 'opacity-0 pointer-events-none' : 'opacity-100'} mobile-safe`}>
            <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center">
              {children}
            </div>
          </main>
        )}

        {/* Footer nav - Mobile only */}
        {session && !isChatPage && (
          <footer
            className="fixed bottom-0 left-0 right-0 z-40 h-16 w-full flex items-center justify-around bg-[#0f0f14]/95 backdrop-blur-md border-t border-white/10 shadow-[0_-1px_3px_rgba(0,0,0,0.45)] rounded-none md:hidden pb-[calc(env(safe-area-inset-bottom)+0.5rem)]"
          >
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className="w-12 h-12 flex flex-col items-center justify-center text-gray-300 active:scale-90 transition flex-1"
                  style={{ position: 'relative' }}
                >
                  <Icon className={`w-6 h-6 mb-1 ${isActive ? 'text-emerald-400' : 'text-gray-300'}`} />
                  <span className={`text-xs font-mono ${isActive ? 'text-emerald-400 font-bold' : ''}`}>{label}</span>
                  {isActive && <span className="block h-0.5 w-6 bg-emerald-400 mt-1 rounded-sm" />}
                </Link>
              );
            })}
          </footer>
        )}

        {/* Settings Slide-Over (no Dialog, always rendered for animation) */}
        {/* Overlay */}
        <div
          className={`fixed inset-0 z-50 ${settingsOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
          aria-hidden="true"
          onClick={() => setSettingsOpen(false)}
        >
          {/* Overlay */}
          <div
            className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${settingsOpen ? 'opacity-100' : 'opacity-0'}`}
          />
          {/* Sliding panel */}
          <div className="absolute inset-y-0 right-0 max-w-full flex" onClick={e => e.stopPropagation()}>
            <div
              className={`w-80 h-full transform transition-transform duration-300 ease-in-out bg-[#18181b] p-6 shadow-xl flex flex-col focus:outline-none
                ${settingsOpen ? "translate-x-0" : "translate-x-full"}
              `}
              tabIndex={-1}
              aria-modal="true"
            >
              <div className="font-bold text-lg mb-4 text-gray-100">Settings</div>
              {/* Account Info */}
              {session && (
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-0.5 rounded-full bg-gradient-to-r from-[#00FFAB] to-[#009E6F]">
                    {profile?.avatarUrl ? (
                      <img src={profile.avatarUrl} alt="avatar" className="w-10 h-10 rounded-full object-cover bg-[#18181b]" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#18181b] flex items-center justify-center text-white text-lg">
                        <User className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-white font-semibold">{profile?.name || session.user?.name || session.user?.email}</div>
                    <div className="text-[#00FFAB] text-xs">{session.user?.email}</div>
                  </div>
                </div>
              )}
              {/* Edit Profile */}
              {session && (
                <button
                  className="mb-4 px-4 py-2 rounded-lg bg-[#00FFAB] text-[#030712] font-semibold hover:bg-[#009E6F] transition"
                  onClick={() => { setSettingsOpen(false); window.location.href = '/profile'; }}
                >
                  Edit Profile
                </button>
              )}
              {/* Beta Tester Link */}
              <div className="mt-auto flex flex-col gap-2">
                <a
                  href="https://t.me/devmolinktesters"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors block text-center"
                >
                  Wanna become a beta tester or provide feedback?
                </a>
                <button
                  className="self-end text-gray-400 hover:text-gray-200 mt-2"
                  onClick={() => setSettingsOpen(false)}
                  aria-label="Close settings"
                >
                  Close
                </button>
              </div>
              {/* Sign In/Out */}
              {session ? (
                <button
                  className="mb-4 px-4 py-2 rounded-lg bg-[#00FFAB] text-[#030712] font-semibold hover:bg-[#009E6F] transition"
                  onClick={() => signOut()}
                >
                  Logout
                </button>
              ) : (
                <button
                  className="mb-4 px-4 py-2 rounded-lg bg-[#00FFAB] text-[#030712] font-semibold hover:bg-[#009E6F] transition"
                  onClick={() => signIn("google")}
                >
                  Sign in
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      </MiniAppWrapper>
    </LoadingContext.Provider>
  );
} 