'use client';
import { Virtuoso } from 'react-virtuoso';
import { decryptMessage } from '@/app/utils/encryption';

interface ChatMessage {
  id: string;
  from: string;
  text: string;
  timestamp: number;
}

interface MessageBubbleProps {
  message: ChatMessage;
  isMe: boolean;
  currentUserEmail: string;
  recipientEmail: string;
  chatSalt: string;
}

function MessageBubble({ message, isMe, currentUserEmail, recipientEmail, chatSalt }: MessageBubbleProps) {
  // Decrypt message for display
  let displayText = message.text;
  
  try {
    const decrypted = decryptMessage(message.text, currentUserEmail, recipientEmail, chatSalt);
    if (decrypted !== message.text && decrypted.length > 0 && !decrypted.includes('U2FsdGVk')) {
      displayText = decrypted;
    }
  } catch (error) {
    // Keep original text if decryption fails
  }

  return (
    <div
      className={`max-w-xs md:max-w-sm break-words rounded-xl px-4 py-2 text-sm font-mono shadow-lg ${
        isMe 
          ? "ml-auto bg-[#00FFAB] text-[#030712]" 
          : "mr-auto bg-[#18181b] text-white"
      }`}
    >
      {displayText}
    </div>
  );
}

interface ThreadProps {
  messages: ChatMessage[];
  currentUserEmail: string;
  recipientEmail: string;
  chatSalt: string;
}

export function Thread({ messages, currentUserEmail, recipientEmail, chatSalt }: ThreadProps) {
  return (
    <div className="flex-1 overflow-hidden">
      <Virtuoso
        style={{ height: '100%' }}
        data={messages}
        followOutput="smooth"
        itemContent={(index, message) => (
          <div className="px-4 py-2">
            <MessageBubble
              key={message.id}
              message={message}
              isMe={message.from === currentUserEmail}
              currentUserEmail={currentUserEmail}
              recipientEmail={recipientEmail}
              chatSalt={chatSalt}
            />
          </div>
        )}
      />
    </div>
  );
}