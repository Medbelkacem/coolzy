import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe part of the Auth.js config (no Prisma, no argon2). Used by the
 * middleware; the full config in auth.ts spreads this and adds the provider.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  trustHost: true,
  providers: [],
  callbacks: {
    jwt({ token }) {
      // Worker sessions end with the shift.
      if (token.role === "WORKER" && typeof token.shiftEnd === "number" && Date.now() > token.shiftEnd) {
        return null;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub ?? "";
      session.user.role = token.role ?? "WORKER";
      session.user.username = token.username ?? "";
      session.user.name = token.name ?? null;
      return session;
    },
  },
} satisfies NextAuthConfig;
