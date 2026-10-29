import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "./mongodb";
import User from "@/models/User";

export const authOptions: NextAuthOptions = {
  providers: [
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
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],

  callbacks: {
    /**
     * signIn: For Google, upsert the user in MongoDB.
     * Store the MongoDB _id on the user object so jwt callback can use it
     * without needing a second DB lookup.
     */
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          await connectToDatabase();
          let dbUser = await User.findOne({ email: user.email!.toLowerCase() });
          if (!dbUser) {
            dbUser = await User.create({
              name: user.name ?? "Google User",
              email: user.email!.toLowerCase(),
              password: await bcrypt.hash(Math.random().toString(36), 10),
            });
          }
          // Attach MongoDB _id directly to the user object so jwt can read it
          user.id = dbUser._id.toString();
          return true;
        } catch (err) {
          console.error("Google signIn error:", err);
          return false;
        }
      }
      return true;
    },

    /**
     * jwt: user.id is already the MongoDB _id (set in signIn for Google,
     * returned from authorize for credentials). Just copy it to the token.
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;          // MongoDB _id
        token.name = user.name;
        token.email = user.email;
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
    maxAge: 30 * 24 * 60 * 60,  // 30 days
    updateAge: 24 * 60 * 60,
  },

  // Do NOT override cookie names — let NextAuth auto-apply __Secure- prefix on HTTPS
  // Custom cookie config was preventing the secure cookie from being set in production

  secret: process.env.NEXTAUTH_SECRET,
};
