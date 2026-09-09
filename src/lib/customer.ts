import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";

/**
 * Clients never have passwords. Identity is a random browser token stored in
 * a cookie; orders carry it as `clientToken`. Claiming a phone with an OTP
 * binds that token to the Customer row so history follows the person.
 */
export const CLIENT_COOKIE = "coolzy-ct";

export async function getClientToken(): Promise<string | null> {
  const store = await cookies();
  const v = store.get(CLIENT_COOKIE)?.value;
  return v && /^[a-f0-9]{48}$/.test(v) ? v : null;
}

/** Only callable from a server action or route handler (sets a cookie). */
export async function ensureClientToken(): Promise<string> {
  const existing = await getClientToken();
  if (existing) return existing;
  const token = randomBytes(24).toString("hex");
  const store = await cookies();
  store.set(CLIENT_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365 * 2,
  });
  return token;
}

export async function setClientToken(token: string): Promise<void> {
  const store = await cookies();
  store.set(CLIENT_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365 * 2,
  });
}

/** Algerian mobile/landline: accepts +213XXXXXXXXX or 0XXXXXXXXX; returns +213 form. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[\s.\-()]/g, "");
  let m = digits.match(/^(?:\+213|00213)([5-7]\d{8})$/) ?? digits.match(/^0([5-7]\d{8})$/);
  if (m) return `+213${m[1]}`;
  m = digits.match(/^(?:\+213|00213)([2-4]\d{7})$/) ?? digits.match(/^0([2-4]\d{7})$/);
  if (m) return `+213${m[1]}`;
  return null;
}

/** +213XXXXXXXXX → 0X XX XX XX XX for display. */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  const m = e164.match(/^\+213(\d{8,9})$/);
  if (!m) return e164;
  const local = "0" + m[1];
  return local.length === 10 ? local.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4 $5") : local.replace(/(\d{3})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4");
}
