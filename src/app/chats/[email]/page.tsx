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
import { getSecureIdForEmail, getEmailFromSecureId, encryptMessage, decryptMessage } from "../../utils/secureIdHelpers";

// Disable static generation for this dynamic route that requires authentication
export const dynamic = 'force-dynamic';

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

async function findEmailBySecureId(secureId: string): Promise<string | null> {
  try {
    const email = await getEmailFromSecureId(secureId);
    if (email && typeof email === 'string') {
      console.log("Resolved secure ID to email via API:", email);
      return email;
    }
  } catch (error) {
    console.error("Failed to resolve secure ID via API:", error);
  }
  console.log("Secure ID not resolvable to a matched email:", secureId);
  return null;
}

export default function ChatThreadPage() {
  const { data: session, status } = useSession();
  const { setLoading } = useContext(LoadingContext);
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState<boolean>(false);
  const [actualEmail, setActualEmail] = useState<string>("");

  // Get dynamic segment from router params
  const { email: paramEmail } = useParams<{ email: string }>();
  const rawParam = paramEmail ?? "";
  const decodedParam = decodeURIComponent(rawParam);
  
  // Show global loader immediately on mount; it will be turned off when ready
  useEffect(() => {
    setLoading(true);
    return () => setLoading(false);
  }, [setLoading]);

  // Resolve secure ID to email
  useEffect(() => {
    async function resolveEmail() {
      try {
        console.log("Resolving email for param:", decodedParam);
        
        // First try cache
        const cachedEmail = await getEmailFromSecureId(decodedParam);
        if (cachedEmail && typeof cachedEmail === 'string') {
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
          try {
            const currentUserSecureId = await getSecureIdForEmail(session.user.email);
            console.log("Current user secure ID would be:", currentUserSecureId, "for email:", session.user.email);
          } catch (error) {
            console.error("Error getting secure ID for current user:", error);
          }
        }
        
        const foundEmail = await findEmailBySecureId(decodedParam);
        if (foundEmail && typeof foundEmail === 'string') {
          console.log("Found email by secure ID:", foundEmail);
          setActualEmail(foundEmail);
        } else {
          console.log("No matched email found for secure ID; staying unresolved");
          return;
        }
      } catch (error) {
        console.error("Error in resolveEmail:", error);
        return;
      }
    }
    
    if (decodedParam) {
      resolveEmail();
    }
  }, [decodedParam, session?.user?.email]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoaded, setMessagesLoaded] = useState<boolean>(false);
  const [chatSalt, setChatSalt] = useState<string>("");
  const [saltLoaded, setSaltLoaded] = useState<boolean>(false);
  const [newMessage, setNewMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Scroll to latest message when list updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Fetch recipient profile
  useEffect(() => {
    if (!actualEmail) return;
    setProfileLoaded(false);
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
      .finally(() => { setProfileLoaded(true); });
  }, [actualEmail, setLoading]);

  // Fetch the chat salt first
  useEffect(() => {
    if (!session?.user?.email || !actualEmail) {
      console.log("Waiting for session or actualEmail:", { 
        hasSession: !!session?.user?.email, 
        actualEmail,
        decodedParam 
      });
      return;
    }
    
    const chatId = [session.user.email, actualEmail].sort().join("_");
    console.log("Fetching salt for chatId:", chatId);
    
    (async () => {
      try {
        const matchDocRef = doc(db, "matches", chatId);
        const snap = await getDoc(matchDocRef);
        if (snap.exists()) {
          const data = snap.data() as { salt?: string } | undefined;
          if (data?.salt) {
                  setChatSalt(data.salt);
                  setSaltLoaded(true);
          } else {
                  setChatSalt("devmolink_salt"); // Fallback for old chats
                  setSaltLoaded(true);
          }
        } else {
          console.log("No match document found for chatId:", chatId);
          setChatSalt("devmolink_salt");
          setSaltLoaded(true);
        }
      } catch (err) {
        console.error("Failed to fetch chat salt", err);
        setChatSalt("devmolink_salt");
        setSaltLoaded(true);
      }
    })();
  }, [session?.user?.email, actualEmail, decodedParam]);

  // Subscribe to Firestore messages after salt is loaded
  useEffect(() => {
    if (!session?.user?.email || !actualEmail || !chatSalt) {
      console.log("Waiting for dependencies:", { 
        hasSession: !!session?.user?.email, 
        actualEmail,
        hasSalt: !!chatSalt 
      });
      return;
    }
    

    
    const chatId = [session.user.email, actualEmail].sort().join("_");
    const msgsRef = collection(db, "matches", chatId, "messages");
    const q = query(msgsRef, orderBy("timestamp", "asc"));
    setMessagesLoaded(false);
    const unsub = onSnapshot(q, async (snap) => {
      const encryptedList: ChatMessage[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as ChatMessage) }));
      

      
      // Decrypt messages before setting state
      const decryptedList = await Promise.all(encryptedList.map(async (msg) => {
        let displayText = msg.text;
        
        // Determine the actual sender and recipient for this message
        const messageSender = msg.from;
        const messageRecipient = msg.from === session.user?.email ? actualEmail : session.user?.email;
        
        // Only try to decrypt if message is marked as encrypted OR looks encrypted
        if (msg.isEncrypted && messageSender && messageRecipient) {

          displayText = await decryptMessage(msg.text, messageSender, messageRecipient, chatSalt);
        } else if (msg.text.length > 50 && /^[A-Za-z0-9+/]+=*$/.test(msg.text) && messageSender && messageRecipient) {
          // Fallback: try to decrypt if it looks like encrypted text (base64-like)
          const decrypted = await decryptMessage(msg.text, messageSender, messageRecipient, chatSalt);
          // Only use decrypted version if it's different and looks like real text
          if (decrypted !== msg.text && decrypted.length > 0 && !decrypted.includes('U2FsdGVk')) {
            displayText = decrypted;
          }
        }
        
        return { ...msg, text: displayText };
      }));
      
      setMessages(decryptedList);
      setMessagesLoaded(true);
    });
    return unsub;
  }, [session?.user?.email, actualEmail, chatSalt]);

  async function handleSend() {
    if (!newMessage.trim() || !session?.user?.email || !actualEmail || !chatSalt) {
      console.log("Cannot send message:", { 
        hasMessage: !!newMessage.trim(), 
        hasSession: !!session?.user?.email, 
        actualEmail,
        hasSalt: !!chatSalt
      });
      return;
    }
    

    
    // Encrypt the message before sending
    const encryptedText = await encryptMessage(newMessage.trim(), session.user.email, actualEmail, chatSalt);
    
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

  const isReady = Boolean(actualEmail) && profileLoaded && saltLoaded && messagesLoaded;

  // Turn off global loader only when everything is ready
  useEffect(() => {
    if (isReady) {
      setLoading(false);
    }
  }, [isReady, setLoading]);

  if (status === "loading") return null;
  if (!session) {
    router.push("/");
    return null;
  }
  if (!isReady) return null;

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
              alt="avatar"
              className="w-10 h-10 rounded-full object-cover bg-[#18181b]"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#18181b] flex items-center justify-center text-white font-bold text-lg">
              {profile?.name ? profile.name[0] : ""}
            </div>
          )}
          <span className="font-semibold text-white text-lg font-mono">
            {profile?.name || "Chat"}
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
          
          // Message is already decrypted in the onSnapshot handler
          const displayText = msg.text;
          
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
          disabled={!newMessage.trim() || !chatSalt}
          className={`px-4 py-2 rounded-full font-semibold text-sm transition-transform ${newMessage.trim() && chatSalt ? "bg-[#00FFAB] text-[#030712] hover:scale-105" : "bg-[#00FFAB]/40 text-[#030712]/40 cursor-not-allowed"}`}
        >
          Send
        </button>
      </div>
    </div>
  );
} 