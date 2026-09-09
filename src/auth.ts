import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import argon2 from "argon2";
import { authConfig } from "./auth.config";
import { db } from "./lib/db";
import { shiftEnd, normalizeHours } from "./lib/time";
import { checkRateLimit } from "./lib/rate-limit";

const credentialsSchema = z.object({
  login: z.string().trim().min(1).max(120),
  password: z.string().min(1).max(200),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { login: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { login, password } = parsed.data;
        const ok = await checkRateLimit(`login:${login.toLowerCase()}`, 10, 15 * 60);
        if (!ok) return null;
        const user = await db().user.findFirst({
          where: { OR: [{ username: login.toLowerCase() }, { email: login.toLowerCase() }], active: true },
        });
        if (!user) return null;
        const valid = await argon2.verify(user.passwordHash, password);
        if (!valid) return null;
        let shift: number | undefined;
        if (user.role === "WORKER") {
          const shop = await db().shop.findUnique({ where: { id: 1 } });
          shift = shiftEnd(normalizeHours(shop?.hours)).getTime();
        }
        return { id: user.id, name: user.name, role: user.role, username: user.username, shiftEnd: shift };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.username = user.username;
        token.shiftEnd = user.shiftEnd;
      }
      return authConfig.callbacks.jwt({ token } as never);
    },
  },
});
