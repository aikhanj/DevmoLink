"use client";
import { useEffect, useState, useContext, useRef, KeyboardEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Paperclip,
  ArrowUp,
  Search as SearchIcon,
  Shield,
  Send,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { LoadingContext } from "../../MainLayout";
import Image from "next/image";
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
  limit,
  getDocs,
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
  age?: number;
  gender?: string;
  timezone?: string;
  description?: string;
  professions?: string[];
  skills?: Record<string, unknown>;
  experienceLevel?: string;
  interests?: string[];
  tools?: string[];
  programmingLanguages?: string[];
  themes?: string[];
}

interface ChatMessage extends DocumentData {
  id?: string;
  from: string;
  text: string;
  timestamp: number;
  isEncrypted?: boolean;
}

interface ChatProfile {
  id: string; // secure id or email
  name?: string;
  email?: string;
  avatarUrl?: string;
  latestMessage?: string;
  latestTimestamp?: number;
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
  const [chats, setChats] = useState<ChatProfile[]>([]);
  const [leftSearchQuery, setLeftSearchQuery] = useState<string>("");
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
  const [encryptionVisible, setEncryptionVisible] = useState<boolean>(false);
  const [isTyping] = useState<boolean>(false);

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
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  // Scroll to latest message when list updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Show encryption badge animation
  useEffect(() => {
    const t = setTimeout(() => setEncryptionVisible(true), 400);
    return () => clearTimeout(t);
  }, []);

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop } = messagesContainerRef.current;
    setShowScrollTop(scrollTop > 300);
  };

  const scrollToTop = () => {
    messagesContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

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

  async function handleQuickReply(emoji: string) {
    if (!session?.user?.email || !actualEmail || !chatSalt) return;
    const encryptedText = await encryptMessage(emoji, session.user.email, actualEmail, chatSalt);
    const chatId = [session.user.email, actualEmail].sort().join("_");
    const msgsRef = collection(db, "matches", chatId, "messages");
    await addDoc(msgsRef, {
      from: session.user.email,
      text: encryptedText,
      timestamp: Date.now(),
      createdAt: serverTimestamp(),
      isEncrypted: true,
    });
  }

  // Populate left sidebar chats (desktop) similar to /chats page
  useEffect(() => {
    if (!session?.user?.email) return;

    const resolveEmailFromId = async (id: string): Promise<string | null> => {
      if (id.includes("@")) return id;
      const viaSecure = await getEmailFromSecureId(id);
      if (viaSecure) return viaSecure;
      try {
        const res = await fetch(`/api/profiles/${encodeURIComponent(id)}`);
        if (res.ok) {
          const data = await res.json();
          return typeof data.email === "string" ? data.email : null;
        }
      } catch {}
      return null;
    };

    const fetchLatestMessage = async (
      userEmail: string,
      otherUserId: string
    ): Promise<{ message: string; timestamp: number } | null> => {
      const otherUserEmail = await resolveEmailFromId(otherUserId);
      if (!otherUserEmail) return null;
      try {
        const chatId = [userEmail, otherUserEmail].sort().join("_");
        const messagesRef = collection(db, "matches", chatId, "messages");
        const q = query(messagesRef, orderBy("timestamp", "desc"), limit(1));
        const snapshot = await getDocs(q);

        if (snapshot.empty) return null;

        const latestDoc = snapshot.docs[0];
        const messageData = latestDoc.data() as ChatMessage;

        let latestSalt = "";
        try {
          const matchDocRef = doc(db, "matches", chatId);
          const matchDoc = await getDoc(matchDocRef);
          if (matchDoc.exists()) {
            const data = matchDoc.data() as { salt?: string } | undefined;
            latestSalt = data?.salt || "devmolink_salt";
          } else {
            latestSalt = "devmolink_salt";
          }
        } catch {
          latestSalt = "devmolink_salt";
        }

        let displayText = messageData.text;
        const messageSender = messageData.from;
        const messageRecipient = messageSender === userEmail ? otherUserEmail : userEmail;
        if (messageData.isEncrypted && messageSender && messageRecipient) {
          displayText = await decryptMessage(messageData.text, messageSender, messageRecipient, latestSalt);
        } else if (messageData.text.length > 50 && /^[A-Za-z0-9+/]+=*$/.test(messageData.text) && messageSender && messageRecipient) {
          const decrypted = await decryptMessage(messageData.text, messageSender, messageRecipient, latestSalt);
          if (decrypted !== messageData.text && decrypted.length > 0 && !decrypted.includes("U2FsdGVk")) {
            displayText = decrypted;
          }
        }

        return { message: displayText, timestamp: messageData.timestamp || 0 };
      } catch {
        return null;
      }
    };

    (async () => {
      try {
        const [matchedProfilesRes, matchedUserProfilesRes] = await Promise.all([
          fetch("/api/matches").then((r) => (r.ok ? r.json() : [])),
          fetch("/api/profiles/matches").then((r) => (r.ok ? r.json() : [])),
        ]);

        const profiles: ChatProfile[] = Array.isArray(matchedProfilesRes) ? matchedProfilesRes : [];
        const userProfiles: ChatProfile[] = Array.isArray(matchedUserProfilesRes) ? matchedUserProfilesRes : [];

        const currentUserEmail = session.user?.email as string;
        const filtered = profiles.filter((p) => p.email !== currentUserEmail && p.id !== currentUserEmail);

        const enriched = await Promise.all(
          filtered.map(async (match) => {
            const p = userProfiles.find((up) => up.email === match.id || up.id === match.id);
            let latestMessage = "Say hi and start collaborating!";
            let latestTimestamp = 0;
            const latest = await fetchLatestMessage(currentUserEmail, match.id);
            if (latest) {
              latestMessage = latest.message;
              latestTimestamp = latest.timestamp;
            }
            return {
              ...match,
              name: p?.name || match.name,
              avatarUrl: p?.avatarUrl,
              latestMessage,
              latestTimestamp,
            } as ChatProfile;
          })
        );

        enriched.sort((a, b) => (b.latestTimestamp || 0) - (a.latestTimestamp || 0));
        setChats(enriched);
      } catch {
        setChats([]);
      }
    })();
  }, [session?.user?.email]);

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

  // Helper to format timestamp to HH:MM
  const formatTime = (ms?: number) => {
    if (!ms) return "";
    try {
      return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  // Build a small, filtered chat list for the left sidebar
  const filteredChats = chats.filter((c) => (c.name || "").toLowerCase().includes(leftSearchQuery.toLowerCase()));

  return (
    <div className="h-screen bg-black flex font-sans">
      {/* Sidebar (Desktop only) */}
      <div className="hidden lg:flex w-80 bg-black border-r border-gray-800 flex-col">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-white">devmolink</h1>
            <div className="flex gap-2" />
          </div>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={leftSearchQuery}
              onChange={(e) => setLeftSearchQuery(e.target.value)}
              className="w-full bg-[#0f1115] text-gray-200 pl-10 pr-4 py-2 rounded-lg border border-gray-800 focus:border-[var(--accent)] focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredChats.map((contact) => {
            const isActive = contact.id === decodedParam;
            return (
              <div
                key={contact.id}
                onClick={() => router.push(`/chats/${encodeURIComponent(contact.id)}`)}
                className={`p-4 border-b border-gray-800 cursor-pointer transition-all duration-200 hover:bg-gray-800/50 ${
                  isActive ? "bg-gray-800 border-l-4 border-l-[var(--accent)]" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {contact.avatarUrl ? (
                      <Image src={contact.avatarUrl} alt={contact.name || ""} width={48} height={48} className="rounded-full" unoptimized />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-white font-semibold">
                        {(contact.name || "").slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white truncate">{contact.name || "Chat"}</h3>
                      <span className="text-xs text-gray-400">{formatTime(contact.latestTimestamp)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-400 truncate">{contact.latestMessage || "Say hi and start collaborating!"}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-black p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile back */}
            <button onClick={() => router.back()} aria-label="Back" className="lg:hidden text-[var(--accent)]">
              <ArrowLeft size={22} />
            </button>
            <div className="relative">
              {profile?.avatarUrl ? (
                <Image src={profile.avatarUrl} alt={profile?.name || ""} width={40} height={40} className="rounded-full object-cover" unoptimized />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-semibold">
                  {(profile?.name || "").slice(0, 1)}
                </div>
              )}
            </div>
            <div>
              <h2 className="text-white font-semibold">{profile?.name || "Chat"}</h2>
              <p className="text-gray-400 text-sm">Encrypted chat</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div
              className={`flex items-center gap-2 transition-all duration-1000 ${
                encryptionVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
              }`}
            >
              <Shield size={16} className="text-[var(--accent)]" />
              <span className="text-[var(--accent)] text-sm font-medium">End-to-end encrypted</span>
            </div>

            
          </div>
        </div>

        {/* Messages Container */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-6 bg-black mobile-scroll"
        >
          <div className="flex justify-center my-6">
            <span className="bg-gray-700 text-gray-400 text-sm px-4 py-2 rounded-full">Today</span>
          </div>

          {messages.map((msg) => {
            const isMe = msg.from === session.user?.email;
            const time = formatTime(msg.timestamp);
            const text = msg.text;
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 mb-6 ${isMe ? "justify-end" : "justify-start"}`}
              >
                {!isMe && (
                  profile?.avatarUrl ? (
                    <Image src={profile.avatarUrl} alt={profile?.name || "Avatar"} width={40} height={40} className="rounded-full flex-shrink-0" unoptimized />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex-shrink-0 flex items-center justify-center text-white font-semibold">
                      {(profile?.name || "").slice(0, 1)}
                    </div>
                  )
                )}

                <div
                  className={`relative max-w-lg px-4 py-3 text-sm rounded-2xl transition-all duration-300 ${
                    isMe
                      ? "bg-[var(--accent)] text-black rounded-br-md before:absolute before:bottom-0 before:-right-2 before:border-[8px] before:border-t-transparent before:border-l-[var(--accent)] before:border-r-transparent before:border-b-transparent animate-[messageSlide_0.3s_ease-out]"
                      : "bg-gray-800 text-gray-100 rounded-bl-md before:absolute before:bottom-0 before:-left-2 before:border-[8px] before:border-t-transparent before:border-r-gray-800 before:border-l-transparent before:border-b-transparent"
                  }`}
                >
                  <p className="pr-16 leading-relaxed break-words">{text}</p>
                  <span
                    className={`absolute bottom-2 right-3 text-xs ${isMe ? "text-black/70" : "text-gray-500"}`}
                  >
                    {time}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator (optional) */}
          {isTyping && (
            <div className="flex items-center gap-3 p-2 animate-fade-in">
              {profile?.avatarUrl ? (
                <Image src={profile.avatarUrl} alt={profile?.name || "Avatar"} width={40} height={40} className="rounded-full" unoptimized />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-semibold">
                  {(profile?.name || "").slice(0, 1)}
                </div>
              )}
              <div className="bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="fixed top-24 right-4 lg:right-8 bg-gray-700 text-white p-3 rounded-full shadow-lg hover:bg-gray-600 transition-all duration-200 z-10"
          >
            <ArrowUp size={18} />
          </button>
        )}

        {/* Input Area */}
        <div className="p-4 lg:p-6 bg-black border-t border-gray-800">
          {/* Quick Reply Buttons */}
          <div className="hidden lg:flex gap-4 mb-4">
            {["👍", "💯", "😂", "❤️", "🔥"].map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleQuickReply(emoji)}
                className="text-2xl hover:scale-110 transition-transform duration-200 hover:bg-gray-800 rounded-full p-2"
                aria-label={`Send ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          <div className="bg-gray-800 rounded-2xl px-4 lg:px-6 py-3 flex items-center gap-3 lg:gap-4 shadow-inner focus-within:shadow-[0_0_12px_rgba(0,255,154,0.7)] transition-shadow duration-300">
            <button className="text-gray-400 hover:text-white hover:scale-110 transition-all duration-200" aria-label="Attach file">
              <Paperclip size={20} />
            </button>

            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Message..."
              className="flex-1 bg-transparent outline-none text-gray-200 placeholder-gray-500 text-base py-2"
            />

            <div className="flex items-center gap-3">
              

              <button
                onClick={handleSend}
                disabled={!newMessage.trim()}
                className="bg-[var(--accent)] text-black p-2 rounded-full font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Contact Info (Desktop only) */}
      <div className="hidden lg:block w-96 bg-black border-l border-gray-800 p-6 overflow-y-auto">
        <div className="text-center mb-6">
          {profile?.avatarUrl ? (
            <Image src={profile.avatarUrl} alt={profile?.name || ""} width={96} height={96} className="rounded-full mx-auto mb-4" unoptimized />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gray-700 mx-auto mb-4 flex items-center justify-center text-white text-2xl">
              {(profile?.name || "").slice(0, 1)}
            </div>
          )}
          <h3 className="text-xl font-bold text-white">{profile?.name || "Chat"}</h3>
          <p className="text-gray-400">Encrypted</p>
        </div>

        {profile && (
          <div className="space-y-6">
            {Array.isArray(profile.photos) && profile.photos.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-3">Photos</h4>
                <div className="grid grid-cols-3 gap-2">
                  {profile.photos.slice(0, 9).map((src: string, idx: number) => (
                    <div key={idx} className="relative w-full aspect-square bg-gray-800 rounded-lg overflow-hidden">
                      <Image src={src} alt={`Photo ${idx + 1}`} fill className="object-cover" unoptimized />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(profile.tools) && profile.tools.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-2">Tools</h4>
                <div className="flex flex-wrap gap-2">
                  {profile.tools.map((t: string) => (
                    <span key={t} className="px-2 py-1 rounded-full bg-gray-800 text-gray-200 text-xs">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(profile.programmingLanguages) && profile.programmingLanguages.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-2">Languages</h4>
                <div className="flex flex-wrap gap-2">
                  {profile.programmingLanguages.map((t: string) => (
                    <span key={t} className="px-2 py-1 rounded-full bg-gray-800 text-gray-200 text-xs">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(profile.interests) && profile.interests.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-2">Interests</h4>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((t: string) => (
                    <span key={t} className="px-2 py-1 rounded-full bg-gray-800 text-gray-200 text-xs">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold text-gray-400 mb-2">About</h4>
              <div className="space-y-1 text-sm text-gray-300">
                {profile.description && <p className="text-gray-300">{profile.description}</p>}
                {profile.professions && profile.professions.length > 0 && (
                  <p><span className="text-gray-400">Professions:</span> {profile.professions.join(", ")}</p>
                )}
                {profile.timezone && (
                  <p><span className="text-gray-400">Timezone:</span> {profile.timezone}</p>
                )}
                {profile.experienceLevel && (
                  <p><span className="text-gray-400">Experience:</span> {profile.experienceLevel}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 