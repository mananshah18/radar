// Edge-compatible auth config (no Prisma, no bcrypt)
// Used by proxy.ts (middleware) which runs in Edge Runtime.
// auth.ts uses this as a base and adds the full Prisma adapter + callbacks.

import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

export const authConfig = {
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId:     process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    // authorize() is intentionally empty here — actual credential
    // verification happens in auth.ts which runs in Node runtime.
    Credentials({
      credentials: { email: {}, password: {} },
      authorize:   () => null,
    }),
  ],
  pages: {
    signIn: "/login",
    error:  "/login",
  },
} satisfies NextAuthConfig;
