import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },

  // Override providers with full implementations (bcrypt, DB lookups)
  providers: [
    ...authConfig.providers.filter((p) => p.id !== "credentials"),

    Credentials({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;

        await prisma.user.update({
          where: { id: user.id },
          data:  { lastActiveAt: new Date() },
        });

        return { id: user.id, email: user.email, name: user.name, plan: user.plan };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id   = user.id;
        token.plan = (user as { plan?: string }).plan ?? "free";
      }
      if (trigger === "update" && token.id) {
        const fresh = await prisma.user.findUnique({ where: { id: token.id as string } });
        if (fresh) token.plan = fresh.plan;
      }
      // #12 — enforce trial expiry: downgrade trialing users whose trial has ended
      if (
        token.plan === "trialing" &&
        token.id &&
        trigger !== "update" // avoid infinite refresh loop
      ) {
        const user = await prisma.user.findUnique({
          where:  { id: token.id as string },
          select: { trialEndsAt: true, plan: true },
        });
        if (user?.trialEndsAt && user.trialEndsAt < new Date()) {
          await prisma.user.update({
            where: { id: token.id as string },
            data:  { plan: "free" },
          });
          token.plan = "free";
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id   = token.id as string;
      session.user.plan = token.plan as string;
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider !== "credentials") {
        const existing = await prisma.user.findUnique({
          where:  { id: user.id! },
          select: { areas: { take: 1 } },
        });
        if (existing && existing.areas.length === 0) {
          await prisma.user.update({
            where: { id: user.id! },
            data: {
              plan:        "trialing",
              trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            },
          });
        }
      }
      return true;
    },
  },
});
