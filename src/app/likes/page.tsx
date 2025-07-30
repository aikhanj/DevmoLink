"use client";
import { Heart } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState, useContext } from "react";
import { LoadingContext } from "../MainLayout";
import dynamic from 'next/dynamic';
import { useRouter } from "next/navigation";
import { toast } from 'react-hot-toast';

interface Profile {
  id: string; // This is the secure ID, not email
  name: string;
  email?: string; // Optional, not returned by API for security
  age?: number;
  gender?: string;
  timezone?: string;
  description?: string;
  professions?: string[];
  skills?: {
    languages?: string[];
    frameworks?: string[];
  };
  experienceLevel?: string;
  interests?: string[];
  tools?: string[];
  programmingLanguages?: string[];
  themes?: string[];
  avatarUrl?: string;
  photos?: string[];
}

const ProfileCard = dynamic(() => import('../components/ProfileCard'), { ssr: false });

export default function LikesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [whoLikesMe, setWhoLikesMe] = useState<Profile[]>([]);
  const [localLoading, setLocalLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { setLoading } = useContext(LoadingContext);

  useEffect(() => {
    if (status !== "loading" && !session) {
      router.push("/");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    setLocalLoading(true);
    fetch("/api/likes")
      .then(res => res.json())
      .then(async (data) => {
        setWhoLikesMe(data);
        
        // Preload all avatar images before showing the page
        const preloadPromises = data.map((profile: Profile) => {
          return new Promise<void>((resolve) => {
            const p = profile as { photos?: string[] };
            if (Array.isArray(p.photos) && p.photos.length > 0) {
              const img = new Image();
              img.onload = () => resolve();
              img.onerror = () => resolve(); // Still resolve to not block the UI
              img.src = p.photos[0]; // First photo used as avatar
            } else {
              resolve(); // No photo to load
            }
          });
        });
        
        // Wait for all avatars to load
        await Promise.all(preloadPromises);
        
        setLocalLoading(false);
        setLoading(false);
      })
      .catch(() => {
        setLocalLoading(false);
        setLoading(false);
      });
    // Listen for match events from homepage
    const handleMatch = (e: CustomEvent) => {
      const matchedEmail = e.detail?.email;
      if (matchedEmail) {
        setWhoLikesMe(prev => prev.filter(p => p.email !== matchedEmail));
      }
    };
          window.addEventListener('devmolink:match', handleMatch as EventListener);
    return () => {
              window.removeEventListener('devmolink:match', handleMatch as EventListener);
    };
  }, [session, setLoading]);
  
  if (status === "loading" || localLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#030712] font-mono">
        <div className="shimmer h-8 w-32 rounded mb-4"></div>
        <div className="shimmer h-24 w-64 rounded"></div>
      </div>
    );
  }
  if (!session) return null;
  
  return (
    <div className="w-full flex flex-col items-center py-4 px-4">
      <h2 className="text-2xl font-bold text-[#00FFAB] mb-6 tracking-tight font-mono text-center">Who Likes You</h2>
      <div className="w-full max-w-md mx-auto space-y-4 flex-1">
        {whoLikesMe.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-5xl mb-4">💔</div>
            <div className="text-lg text-white mb-2 font-mono">Nobody has liked you yet!</div>
            <div className="text-[#00FFAB] mb-4 font-mono text-center">Keep swiping - someone will notice you soon!</div>
            {/* <button className="px-4 py-2 bg-[#00FFAB] text-[#030712] rounded-full opacity-50 cursor-not-allowed font-mono" disabled>
              Refresh
            </button> */}
          </div>
        ) : (
          <div className="border-2 border-dashed border-[#00FFAB]/30 rounded-xl p-4">
            {whoLikesMe.map((profile) => (
              <button
                key={profile.id}
                className="w-full text-left bg-[#18181b] rounded-xl shadow-lg shadow-black/20 p-4 mb-4 transition-all duration-150 hover:scale-[1.02] hover:shadow-xl"
                onClick={() => setSelectedProfile(profile)}
              >
                <div className="flex items-center gap-4">
                  {(() => {
                    const p = profile as unknown as { photos?: string[] };
                    return Array.isArray(p.photos) && p.photos.length > 0 ? (
                      <img
                        src={p.photos[0]}
                        alt={profile.name}
                        className="w-20 h-20 rounded-full object-cover bg-gradient-to-r from-[#00FFAB] to-[#009E6F]"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gradient-to-r from-[#00FFAB] to-[#009E6F] flex items-center justify-center text-white font-bold text-lg">
                        <Heart className="w-8 h-8" />
                      </div>
                    );
                  })()}
                  <div className="flex-1">
                    <div className="font-semibold text-white text-[1.125rem] font-mono">{profile.name}</div>
                    <div className="text-[#00FFAB] text-sm font-mono">{profile.email}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setSelectedProfile(null)}>
          <div className="bg-[#18181b] rounded-2xl shadow-2xl p-6 max-w-md w-full relative" onClick={(e) => e.stopPropagation()}>
            <button
              className="absolute top-0 right-0 text-gray-400 hover:text-white text-3xl z-50 w-10 h-10"
              onClick={() => setSelectedProfile(null)}
              aria-label="Close"
            >
              &times;
            </button>
            <ProfileCard profile={{
              ...selectedProfile,
              photos: selectedProfile.photos || []
            }} onSwipe={() => {}} isActive={false} />
            <div className="flex gap-4 mt-6 justify-center">
              <button
                className="px-6 py-2 rounded-full bg-red-500 text-white font-bold hover:bg-red-600 transition"
                disabled={actionLoading}
                onClick={async () => {
                  setActionLoading(true);
                  try {
                    const response = await fetch('/api/swipes', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ to: selectedProfile.id, direction: 'left' })
                    });
                    const result = await response.json();
                    
                    if (response.ok) {
                      toast.success(`👋 You passed on ${selectedProfile.name}`);
                      setSelectedProfile(null);
                      setWhoLikesMe(whoLikesMe.filter(p => p.id !== selectedProfile.id));
                    } else {
                      toast.error(result.error || 'Failed to reject');
                    }
                  } catch (error) {
                    console.error('Error rejecting:', error);
                    toast.error('Something went wrong. Please try again.');
                  } finally {
                    setActionLoading(false);
                  }
                }}
              >
                Reject
              </button>
              <button
                className="px-6 py-2 rounded-full bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition"
                disabled={actionLoading}
                onClick={async () => {
                  setActionLoading(true);
                  try {
                    const response = await fetch('/api/swipes', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ to: selectedProfile.id, direction: 'right' })
                    });
                    const result = await response.json();
                    
                    if (response.ok) {
                      if (result.matched) {
                        // Show match toast and navigate to chat
                        toast.success(`🎉 It's a Match! You and ${selectedProfile.name} liked each other!`, {
                          duration: 4000,
                        });
                        
                        // Navigate to chat with this person using the email returned from API
                        if (result.matchedUserEmail) {
                          router.push(`/chats/${encodeURIComponent(result.matchedUserEmail)}`);
                        }
                      } else {
                        // Just liked them, not a match yet
                        toast.success(`💕 You liked ${selectedProfile.name}! Waiting for them to like you back.`, {
                          duration: 3000,
                        });
                      }
                      
                      setSelectedProfile(null);
                      setWhoLikesMe(whoLikesMe.filter(p => p.id !== selectedProfile.id));
                    } else {
                      toast.error(result.error || 'Failed to send like');
                    }
                  } catch (error) {
                    console.error('Error sending like:', error);
                    toast.error('Something went wrong. Please try again.');
                  } finally {
                    setActionLoading(false);
                  }
                }}
              >
                Match
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 