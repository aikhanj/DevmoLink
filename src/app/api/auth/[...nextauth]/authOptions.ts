import GoogleProvider from "next-auth/providers/google";
import { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "801631771776-fia1oregjq0dqa2t4djftbgasjt7bmar.apps.googleusercontent.com",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "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",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET || "your-super-secret-nextauth-secret-key-here-change-this-in-production",
  session: {
    strategy: "jwt" as const,
  },
  debug: process.env.NODE_ENV === "development",
}; 