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
} from "firebase/firestore";
import { db } from "../../../firebase";
import { encryptMessage, decryptMessage } from "../../utils/encryption";

interface Profile {
  id: string;
  name?: string;
  email?: string;
  photos?: string[];
}

interface ChatMessage extends DocumentData {
  id?: string;
  from: string;
  text: string;
  timestamp: number;
  isEncrypted?: boolean;
}

export default function ChatThreadPage() {
  const { data: session, status } = useSession();
  const { setLoading } = useContext(LoadingContext);
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  // Get dynamic segment from router params
  const { email: paramEmail } = useParams<{ email: string }>();
  const rawEmail = paramEmail ?? "";
  const decodedEmail = decodeURIComponent(rawEmail);

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
    if (!decodedEmail) return;
    setLoading(true);
    fetch(`/api/profiles/${encodeURIComponent(decodedEmail)}`)
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
  }, [decodedEmail]);

  // Subscribe to Firestore messages in real-time
  useEffect(() => {
    if (!session?.user?.email) return;
    const chatId = [session.user.email, decodedEmail].sort().join("_");
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
  }, [session?.user?.email, decodedEmail]);

  async function handleSend() {
    if (!newMessage.trim() || !session?.user?.email) return;
    
    // Ensure we have a salt before encrypting
    const currentSalt = chatSalt || "devmolink_salt";
    
    // Encrypt the message before sending
    const encryptedText = encryptMessage(newMessage.trim(), session.user.email, decodedEmail, currentSalt);
    
    const chatId = [session.user.email, decodedEmail].sort().join("_");
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
    <div className="h-screen w-full bg-[#030712] flex flex-col chat-container"> 
      {/* Header - Fixed positioning for better mobile experience */}
      <div className="fixed top-0 left-0 right-0 z-30 flex items-center gap-4 px-4 py-3 bg-[#18181b] shadow-lg border-b border-[#00FFAB]/20">
        <button onClick={() => router.back()} aria-label="Back" className="text-[#00FFAB]">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-3">
          {profile?.photos && profile.photos.length > 0 ? (
            <img
              src={profile.photos[0]}
              alt={profile?.name || decodedEmail}
              className="w-10 h-10 rounded-full object-cover bg-gradient-to-r from-[#00FFAB] to-[#009E6F]"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#00FFAB] to-[#009E6F] flex items-center justify-center text-white font-bold text-lg">
              {profile?.name ? profile.name[0] : "?"}
            </div>
          )}
          <span className="font-semibold text-white text-lg font-mono">
            {profile?.name || decodedEmail}
          </span>
        </div>
        {/* Encryption indicator */}
        <div className="ml-auto">
          <div className="text-xs text-[#00FFAB] flex items-center gap-1">
            🔒 <span>Encrypted</span>
          </div>
        </div>
      </div>

      {/* Messages - Add top padding to account for fixed header */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 pt-20 pb-24 mobile-scroll">
        {messages.map((msg) => {
          const isMe = msg.from === session.user?.email;
          
          // Decrypt message for display
          let displayText = msg.text;
          
          // Ensure we have a salt before attempting decryption
          const currentSalt = chatSalt || "devmolink_salt";
          
          // Only try to decrypt if message is marked as encrypted OR looks encrypted
          if (msg.isEncrypted && session.user?.email) {
            displayText = decryptMessage(msg.text, session.user.email, decodedEmail, currentSalt);
            if (displayText === msg.text) {
            }
          } else if (msg.text.length > 50 && /^[A-Za-z0-9+/]+=*$/.test(msg.text) && session.user?.email) {
            // Fallback: try to decrypt if it looks like encrypted text (base64-like)
            const decrypted = decryptMessage(msg.text, session.user.email, decodedEmail, currentSalt);
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

      {/* Input - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-30 px-4 py-3 bg-[#18181b] border-t border-[#00FFAB]/20 flex items-center gap-2">
        <input
          type="text"
          placeholder="Type your message... (encrypted)"
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