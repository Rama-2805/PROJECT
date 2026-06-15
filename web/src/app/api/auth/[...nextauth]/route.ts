import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Mock Microsoft SSO",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "admin@collegename.edu.in" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        const email = credentials.email.trim().toLowerCase();
        if (!email.endsWith(".edu.in")) {
          return null; // Reject and prevent session cookie
        }
        return { id: "1", name: "Test User", email };
      }
    }),
  ],
  pages: {
    signIn: '/login', // Custom login page
    error: '/login', // Error code passed in query string as ?error=
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("Microsoft SSO Attempt:", user.email);

      // ====================================================================
      // 🚨 VERIFY EMAIL AGAINST DATABASE HERE 🚨
      // In a real scenario, you would make an HTTP request to your NestJS API:
      // const res = await fetch("http://localhost:3001/api/auth/verify", { ... })
      // ====================================================================
      
      const email = (user.email || "").trim().toLowerCase();

      // MOCK DATABASE VERIFICATION:
      // Only allow emails ending with ".edu.in" (like @collegename.edu.in or @vemanait.edu.in) for this demonstration.
      // If it doesn't match, we return a custom error URL or false to reject.
      if (email.endsWith(".edu.in")) {
        console.log("✅ Email verified in database.");
        return true; 
      } else {
        console.log("❌ Email NOT found in database. Rejecting login.");
        return false; // Reject sign-in
      }
    },
    async session({ session, token }) {
      // Pass the user ID or role to the session
      if (session.user) {
        (session.user as any).id = token.sub;
        // You could fetch role from DB and attach here
        (session.user as any).role = "admin"; 
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "smart-campus-super-secret-key-12345",
  session: {
    strategy: "jwt",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
