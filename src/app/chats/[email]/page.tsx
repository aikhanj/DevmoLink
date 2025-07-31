"use client";
import { useEffect, useState, useContext, useRef, KeyboardEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useSession } from "next-auth/react";
import { LoadingContext } from "../../MainLayout";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  DocumentData,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { encryptMessage, decryptMessage } from "../../utils/encryption";

// Client-side secure ID helpers
async function getSecureIdForEmail(email: string): Promise<string> {
  const response = await fetch('/api/secure-id', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'generate', email })
  });
  const data = await response.json();
  return data.secureId;
}

async function getEmailFromSecureId(secureId: string): Promise<string | null> {
  const response = await fetch('/api/secure-id', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'getEmail', secureId })
  });
  const data = await response.json();
  return data.email;
}

interface Profile {
  id: string;
  name?: string;
  email?: string;
  photos?: string[];
  avatarUrl?: string;
}

interface ChatMessage extends DocumentData {
  id?: string;
  from: string;
  text: string;
  timestamp: number;
  isEncrypted?: boolean;
}

// Helper function to find email from secure ID
async function findEmailBySecureId(secureId: string): Promise<string | null> {
  // First check cache
  const cachedEmail = getEmailFromSecureId(secureId);
  if (cachedEmail) {
    console.log("Found email in cache:", cachedEmail);
    return cachedEmail;
  }
  
  console.log("Cache miss, searching through profiles for secure ID:", secureId);
  
  // If not in cache, search through profiles
  const profilesRef = collection(db, "profiles");
  const snapshot = await getDocs(profilesRef);
  
  console.log("Found", snapshot.docs.length, "profiles to search through");
  
  for (const docSnap of snapshot.docs) {
    const email = docSnap.id; // Document ID is the email
    const profileSecureId = await getSecureIdForEmail(email);
    console.log("Checking profile:", email, "→ secure ID:", profileSecureId);
    if (profileSecureId === secureId) {
      console.log("MATCH FOUND! Email:", email, "for secure ID:", secureId);
      return email;
    }
  }
  
  console.log("No matching email found for secure ID:", secureId);
  return null;
}

export default function ChatThreadPage() {
  const { data: session, status } = useSession();
  const { setLoading } = useContext(LoadingContext);
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [actualEmail, setActualEmail] = useState<string>("");

  // Get dynamic segment from router params
  const { email: paramEmail } = useParams<{ email: string }>();
  const rawParam = paramEmail ?? "";
  const decodedParam = decodeURIComponent(rawParam);
  
  // Resolve secure ID to email
  useEffect(() => {
    async function resolveEmail() {
      console.log("Resolving email for param:", decodedParam);
      
      // First try cache
      const cachedEmail = await getEmailFromSecureId(decodedParam);
      if (cachedEmail) {
        console.log("Found cached email:", cachedEmail);
        setActualEmail(cachedEmail);
        return;
      }
      
      // If it looks like an email, use it directly
      if (decodedParam.includes('@')) {
        console.log("Using param as email directly:", decodedParam);
        setActualEmail(decodedParam);
        return;
      }
      
      // Otherwise, search for the email by secure ID
      console.log("Searching for email by secure ID:", decodedParam);
      
      // Debug: Let's see what secure ID would be generated for current user
      if (session?.user?.email) {
        const currentUserSecureId = await getSecureIdForEmail(session.user.email);
        console.log("Current user secure ID would be:", currentUserSecureId, "for email:", session.user.email);
      }
      
      const foundEmail = await findEmailBySecureId(decodedParam);
      if (foundEmail) {
        console.log("Found email by secure ID:", foundEmail);
        setActualEmail(foundEmail);
      } else {
        console.log("No email found, using param as fallback:", decodedParam);
        // Fallback to treating it as email (backward compatibility)
        setActualEmail(decodedParam);
      }
    }
    
    if (decodedParam) {
      resolveEmail();
    }
  }, [decodedParam, session?.user?.email]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatSalt, setChatSalt] = useState<string>("");
  const [newMessage, setNewMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Scroll to latest message when list updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Fetch recipient profile
  useEffect(() => {
    if (!actualEmail) return;
    setLoading(true);
    fetch(`/api/profiles/${encodeURIComponent(actualEmail)}`)
      .then((res) => {
        if (res.status === 404) {
          return null;
        }
        return res.json();
      })
      .then((data: Profile | null) => {
        setProfile(data);
      })
      .catch((error) => {
        console.error("Failed to fetch profile:", error);
        setProfile(null);
      })
      .finally(() => setLoading(false));
  }, [actualEmail, setLoading]);

  // Subscribe to Firestore messages in real-time
  useEffect(() => {
    if (!session?.user?.email || !actualEmail) {
      console.log("Waiting for session or actualEmail:", { 
        hasSession: !!session?.user?.email, 
        actualEmail,
        decodedParam 
      });
      return;
    }
    
    console.log("Setting up chat subscription for:", { 
      sessionEmail: session.user.email, 
      actualEmail,
      decodedParam 
    });
    
    const chatId = [session.user.email, actualEmail].sort().join("_");
    console.log("Chat ID:", chatId);
    
    // Fetch the chat-level salt once
    (async () => {
      try {
        const matchDocRef = doc(db, "matches", chatId);
        const snap = await getDoc(matchDocRef);
        if (snap.exists()) {
          const data = snap.data() as { salt?: string } | undefined;
          if (data?.salt) {
            setChatSalt(data.salt);
          } else {
            setChatSalt("devmolink_salt"); // Fallback to default salt
          }
        } else {
          console.log("No match document found for chatId:", chatId);
          setChatSalt("devmolink_salt"); // Fallback to default salt
        }
      } catch (err) {
        console.error("Failed to fetch chat salt", err);
        setChatSalt("devmolink_salt"); // Fallback to default salt
      }
    })();

    const msgsRef = collection(db, "matches", chatId, "messages");
    const q = query(msgsRef, orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const list: ChatMessage[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as ChatMessage) }));
      setMessages(list);
    });
    return unsub;
  }, [session?.user?.email, actualEmail, decodedParam]);

  async function handleSend() {
    if (!newMessage.trim() || !session?.user?.email || !actualEmail) {
      console.log("Cannot send message:", { 
        hasMessage: !!newMessage.trim(), 
        hasSession: !!session?.user?.email, 
        actualEmail 
      });
      return;
    }
    
    // Ensure we have a salt before encrypting
    const currentSalt = chatSalt || "devmolink_salt";
    
    // Encrypt the message before sending
    const encryptedText = encryptMessage(newMessage.trim(), session.user.email, actualEmail, currentSalt);
    
    const chatId = [session.user.email, actualEmail].sort().join("_");
    
    
    const msgsRef = collection(db, "matches", chatId, "messages");
    await addDoc(msgsRef, {
      from: session.user.email,
      text: encryptedText,
      timestamp: Date.now(),
      createdAt: serverTimestamp(),
      isEncrypted: true, // Mark as encrypted for future reference
    });
    setNewMessage("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (status === "loading") return null;
  if (!session) {
    router.push("/");
    return null;
  }

  return (
    <div className="min-h-screen w-full bg-[#030712] flex flex-col"> 
      {/* Header - Normal flow positioning */}
      <div className="bg-[#030712] border-b-2 border-[#00FFAB] py-6 px-4" style={{ paddingTop: 'max(24px, calc(24px + env(safe-area-inset-top)))' }}>
        <div className="flex items-center gap-4">
        <button onClick={() => router.back()} aria-label="Back" className="text-[#00FFAB]">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-3">
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile?.name || actualEmail}
              className="w-10 h-10 rounded-full object-cover bg-gradient-to-r from-[#00FFAB] to-[#009E6F]"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#00FFAB] to-[#009E6F] flex items-center justify-center text-white font-bold text-lg">
              {profile?.name ? profile.name[0] : "?"}
            </div>
          )}
          <span className="font-semibold text-white text-lg font-mono">
            {profile?.name || actualEmail}
          </span>
        </div>
        {/* Encryption indicator */}
        <div className="ml-auto">
          <div className="text-xs text-[#00FFAB] flex items-center gap-1">
            🔒 <span>Encrypted</span>
          </div>
        </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 mobile-scroll">
        {messages.map((msg) => {
          const isMe = msg.from === session.user?.email;
          
          // Decrypt message for display
          let displayText = msg.text;
          
          // Ensure we have a salt before attempting decryption
          const currentSalt = chatSalt || "devmolink_salt";
          
          // Only try to decrypt if message is marked as encrypted OR looks encrypted
          if (msg.isEncrypted && session.user?.email) {
            displayText = decryptMessage(msg.text, session.user.email, actualEmail, currentSalt);
            if (displayText === msg.text) {
            }
          } else if (msg.text.length > 50 && /^[A-Za-z0-9+/]+=*$/.test(msg.text) && session.user?.email) {
            // Fallback: try to decrypt if it looks like encrypted text (base64-like)
            const decrypted = decryptMessage(msg.text, session.user.email, actualEmail, currentSalt);
            // Only use decrypted version if it's different and looks like real text
            if (decrypted !== msg.text && decrypted.length > 0 && !decrypted.includes('U2FsdGVk')) {
              displayText = decrypted;
            } else {
            }
          }
          // Otherwise, show original text (unencrypted legacy messages)
          
          return (
            <div
              key={msg.id}
              className={`max-w-xs md:max-w-sm break-words rounded-xl px-4 py-2 text-sm font-mono shadow-lg ${isMe ? "ml-auto bg-[#00FFAB] text-[#030712]" : "mr-auto bg-[#18181b] text-white"}`}
            >
              {displayText}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-4 bg-[#18181b] border-t border-[#00FFAB]/20 flex items-center gap-2" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
        <input
          type="text"
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={onKeyDown}
          className="flex-1 bg-[#030712] border border-[#00FFAB]/30 rounded-full px-4 py-2 text-white placeholder-[#00FFAB]/60 focus:outline-none focus:ring-2 focus:ring-[#00FFAB] font-mono"
        />
        <button
          onClick={handleSend}
          disabled={!newMessage.trim()}
          className={`px-4 py-2 rounded-full font-semibold text-sm transition-transform ${newMessage.trim() ? "bg-[#00FFAB] text-[#030712] hover:scale-105" : "bg-[#00FFAB]/40 text-[#030712]/40 cursor-not-allowed"}`}
        >
          Send
        </button>
      </div>
    </div>
  );
} 