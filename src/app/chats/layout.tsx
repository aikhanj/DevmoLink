import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Chats'
};

export default function ChatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 