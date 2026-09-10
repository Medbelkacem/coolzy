import { db } from "./db";

/**
 * Fixed-window rate limiter backed by Postgres so it holds across serverless
 * instances. Returns true when the call is allowed.
 */
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  const row = await db().rateLimit.findUnique({ where: { key } });
  if (!row || row.windowStart.getTime() !== windowStart.getTime()) {
    await db().rateLimit.upsert({
      where: { key },
      create: { key, windowStart, count: 1 },
      update: { windowStart, count: 1 },
    });
    return true;
  }
  const updated = await db().rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
  return updated.count <= limit;
}

/**
 * Reads the current window without consuming an attempt. Used to tell a locked
 * out user why, after the attempt has already been counted elsewhere.
 */
export async function isRateLimited(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  const row = await db().rateLimit.findUnique({ where: { key } });
  if (!row || row.windowStart.getTime() !== windowStart.getTime()) return false;
  return row.count >= limit;
}

/** Best-effort client IP for rate-limit keys. */
export function clientIp(headers: Headers): string {
  return (
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}
