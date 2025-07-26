import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Likes'
};

export default function LikesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 