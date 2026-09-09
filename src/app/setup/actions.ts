"use server";
import { z } from "zod";
import argon2 from "argon2";
import { timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { adminExists } from "@/lib/bootstrap";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { fail, ok, type ActionResult } from "@/lib/action";

const schema = z.object({
  token: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,32}$/),
  email: z.string().trim().toLowerCase().email().max(120).optional().or(z.literal("")),
  password: z.string().min(12).max(200),
});

function tokenMatches(given: string): boolean {
  const expected = process.env.SETUP_TOKEN ?? "";
  if (!expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** One-time bootstrap: creates the first admin, then this action refuses forever. */
export async function createFirstAdmin(_prev: unknown, form: FormData): Promise<ActionResult<{ username: string }>> {
  if (await adminExists()) return fail("forbidden");
  const ip = clientIp(await headers());
  if (!(await checkRateLimit(`setup:${ip}`, 5, 15 * 60))) return fail("rateLimited");
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const fieldErrors: Record<string, "invalid" | "passwordWeak"> = {};
    for (const issue of parsed.error.issues) {
      const f = String(issue.path[0]);
      fieldErrors[f] = f === "password" ? "passwordWeak" : "invalid";
    }
    return fail("invalid", fieldErrors);
  }
  const { token, name, username, email, password } = parsed.data;
  if (!tokenMatches(token)) return fail("forbidden", { token: "forbidden" });
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  try {
    await db().user.create({ data: { role: "ADMIN", name, username, email: email || null, passwordHash, hireDate: new Date() } });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") return fail("usernameTaken", { username: "usernameTaken" });
    throw err;
  }
  return ok({ username });
}
