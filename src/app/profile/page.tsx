"use client";
import { User } from "lucide-react";
import { useSession, signIn } from "next-auth/react";
import { useEffect, useState, useContext, useCallback } from "react";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import ProfileForm from "../ProfileForm";
import { LoadingContext } from "../MainLayout";
import { useRouter } from "next/navigation";

interface Profile {
  name: string;
  birthday: string;
  gender: string;
  programmingLanguages: string[];
  lookingFor: string[];
  skills: string[];
  timeCommitment: string;
  timezone: string;
  projectVibe: string;
  isBoosted: boolean;
  avatarUrl?: string;
  email?: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLocalLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const { setLoading } = useContext(LoadingContext);

  // Centralized profile fetching function
  const fetchProfile = useCallback(async (email: string) => {
    try {
      const snap = await getDoc(doc(db, "profiles", email));
      if (snap.exists()) {
        const data = snap.data();
        return {
          name: data.name || "",
          birthday: data.birthday || "",
          gender: data.gender || "",
          programmingLanguages: data.programmingLanguages || [],
          lookingFor: data.lookingFor || [],
          skills: Array.isArray(data.skills) 
            ? data.skills 
            : (typeof data.skills === "string" 
                ? data.skills.split(",").map((s: string) => s.trim()) 
                : []
              ),
          timeCommitment: data.timeCommitment || "",
          timezone: data.timezone || "",
          projectVibe: data.projectVibe || "",
          isBoosted: data.isBoosted || false,
          avatarUrl: data.avatarUrl || "",
          email: data.email || email,
        };
      }
      return null;
    } catch (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
  }, []);

  useEffect(() => {
    if (status !== "loading" && !session) {
      router.push("/");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (!user?.email || status === "loading") return;
    
    setLoading(true);
    setLocalLoading(true);
    
    fetchProfile(user.email).then((profileData) => {
      setProfile(profileData);
      setLocalLoading(false);
      setLoading(false);
    });
  }, [user?.email, status, fetchProfile, setLoading]);

  const handleEditProfile = useCallback(async () => {
    if (!user?.email) return;
    
    setLoading(true);
    const profileData = await fetchProfile(user.email);
    setProfile(profileData);
    setLoading(false);
    setShowEdit(true);
  }, [user?.email, fetchProfile, setLoading]);

  if (status === "loading" || loading) return null;
  if (!session) return null;

  return (
    <div className="min-h-screen w-full bg-[#030712] flex flex-col items-center py-8 px-4">
      <h2 className="text-2xl font-bold text-[#00FFAB] mb-8 tracking-tight font-mono">My Profile</h2>
      <div className="flex flex-col items-center gap-6 mb-8">
        {profile?.avatarUrl ? (
          <img src={profile.avatarUrl} alt="Avatar" className="w-28 h-28 rounded-full object-cover border-4 border-[#00FFAB] shadow-lg" />
        ) : (
          <div className="w-28 h-28 rounded-full bg-gradient-to-r from-[#00FFAB] to-[#009E6F] flex items-center justify-center text-5xl text-white border-4 border-[#00FFAB] shadow-lg">
            <User className="w-14 h-14" />
          </div>
        )}
        <button
          onClick={handleEditProfile}
          className="px-4 py-2 bg-[#00FFAB] text-[#030712] rounded-full font-semibold shadow hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-[#00FFAB] font-mono"
        >
          Edit Profile
        </button>
      </div>
      
      <div className="w-full max-w-md mx-auto bg-[#18181b] rounded-xl shadow-lg shadow-black/20 p-6">
        <div className="font-semibold text-white text-lg mb-1 font-mono">{profile?.name || user?.name || ""}</div>
        <div className="text-[#00FFAB] text-sm mb-2 font-mono">{profile?.email || user?.email || ""}</div>
        <div className="flex flex-wrap gap-2 justify-center">
          {Array.isArray(profile?.skills)
            ? profile.skills.map((skill: string) => (
                <span key={skill} className="bg-[#00FFAB]/20 text-[#00FFAB] px-3 py-1 rounded-full text-xs font-medium shadow border border-[#00FFAB]/30">
                  {skill}
                </span>
              ))
            : null}
        </div>
      </div>
      {showEdit && !loading && <ProfileForm onClose={() => setShowEdit(false)} mode="edit" />}
    </div>
  );
} 