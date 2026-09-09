import { createHmac, randomInt } from "node:crypto";
import { db } from "./db";
import { ActionError } from "./action";

/**
 * One-time codes for claiming a phone number. Transport is pluggable:
 *   OTP_TRANSPORT=console  → printed to the server log (development)
 *   OTP_TRANSPORT=webhook  → POST {phone, code, message} to OTP_WEBHOOK_URL
 *                            (any SMS gateway the owner already pays for)
 */
function hash(phone: string, code: string): string {
  return createHmac("sha256", process.env.AUTH_SECRET ?? "dev").update(`${phone}:${code}`).digest("hex");
}

export async function issueOtp(phone: string, message: (code: string) => string): Promise<void> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db().otpCode.upsert({
    where: { phone },
    create: { phone, codeHash: hash(phone, code), expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
    update: { codeHash: hash(phone, code), expiresAt: new Date(Date.now() + 10 * 60 * 1000), attempts: 0 },
  });
  const transport = process.env.OTP_TRANSPORT ?? "console";
  if (transport === "webhook" && process.env.OTP_WEBHOOK_URL) {
    await fetch(process.env.OTP_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json", ...(process.env.OTP_WEBHOOK_SECRET ? { authorization: `Bearer ${process.env.OTP_WEBHOOK_SECRET}` } : {}) },
      body: JSON.stringify({ phone, code, message: message(code) }),
    });
  } else {
    console.info(`[otp] ${phone} → ${code}`);
  }
}

export async function verifyOtp(phone: string, code: string): Promise<void> {
  const row = await db().otpCode.findUnique({ where: { phone } });
  if (!row) throw new ActionError("otpInvalid", { code: "otpInvalid" });
  if (row.expiresAt.getTime() < Date.now()) throw new ActionError("otpExpired", { code: "otpExpired" });
  if (row.attempts >= 5) throw new ActionError("otpExpired", { code: "otpExpired" });
  if (row.codeHash !== hash(phone, code)) {
    await db().otpCode.update({ where: { phone }, data: { attempts: { increment: 1 } } });
    throw new ActionError("otpInvalid", { code: "otpInvalid" });
  }
  await db().otpCode.delete({ where: { phone } });
}
