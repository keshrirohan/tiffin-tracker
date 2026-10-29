import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "./mongodb";
import User from "@/models/User";

export const authOptions: NextAuthOptions = {
  providers: [
    // ── Google OAuth ──────────────────────────────────────────────────────
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),

    // ── Email / Password ──────────────────────────────────────────────────
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required.");
        }
        await connectToDatabase();
        const user = await User.findOne({
          email: credentials.email.toLowerCase().trim(),
        });
        if (!user) throw new Error("No account found with this email.");
        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) throw new Error("Incorrect password.");
        return { id: user._id.toString(), email: user.email, name: user.name };
      },
    }),
  ],

  callbacks: {
    // Called when a user signs in via Google — auto-create account if needed
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          await connectToDatabase();
          const existing = await User.findOne({ email: user.email!.toLowerCase() });
          if (!existing) {
            await User.create({
              name: user.name ?? "Google User",
              email: user.email!.toLowerCase(),
              // Google users have no password — store empty hash
              password: await bcrypt.hash(Math.random().toString(36), 10),
            });
          }
          return true;
        } catch {
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user, account }) {
      if (user) {
        // On first sign-in: fetch the DB user to get the MongoDB _id
        try {
          await connectToDatabase();
          const dbUser = await User.findOne({ email: user.email!.toLowerCase() });
          if (dbUser) {
            token.id = dbUser._id.toString();
          } else {
            token.id = user.id;
          }
        } catch {
          token.id = user.id;
        }
        token.name = user.name;
        token.email = user.email;
        token.provider = account?.provider;
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name;
        session.user.email = token.email;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,   // 30 days — no repeated logins
    updateAge: 24 * 60 * 60,      // refresh token every 24 h silently
  },

  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60, // 30 days
      },
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};
