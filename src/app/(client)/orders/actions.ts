"use server";
import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { fail, guarded, ok, type ActionResult } from "@/lib/action";
import { ensureClientToken, normalizePhone } from "@/lib/customer";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { issueOtp, verifyOtp } from "@/lib/otp";

export async function requestOtp(_prev: unknown, form: FormData): Promise<ActionResult<{ phone: string }>> {
  return guarded(async () => {
    const raw = String(form.get("phone") ?? "");
    const phone = normalizePhone(raw);
    if (!phone) return fail("phoneInvalid", { phone: "phoneInvalid" });
    const ip = clientIp(await headers());
    if (!(await checkRateLimit(`otp:${phone}`, 3, 600)) || !(await checkRateLimit(`otp-ip:${ip}`, 10, 600))) return fail("rateLimited");
    const t = await getTranslations("history");
    await issueOtp(phone, (code) => t("otpMessage", { code }));
    return ok({ phone });
  });
}

const claimSchema = z.object({ phone: z.string().min(8).max(30), code: z.string().regex(/^\d{6}$/) });

export async function claimPhone(_prev: unknown, form: FormData): Promise<ActionResult<{ phone: string }>> {
  return guarded(async () => {
    const parsed = claimSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) return fail("otpInvalid", { code: "otpInvalid" });
    const phone = normalizePhone(parsed.data.phone);
    if (!phone) return fail("phoneInvalid", { phone: "phoneInvalid" });
    const ip = clientIp(await headers());
    if (!(await checkRateLimit(`otp-verify:${ip}`, 20, 600))) return fail("rateLimited");
    await verifyOtp(phone, parsed.data.code);
    const token = await ensureClientToken();
    // Bind this browser to the phone. A previous binding of this token is released.
    await db().customer.updateMany({ where: { token, NOT: { phone } }, data: { token: `released-${Date.now()}-${Math.random().toString(36).slice(2, 10)}` } });
    const customer = await db().customer.upsert({
      where: { phone },
      create: { phone, token, claimedAt: new Date() },
      update: { token, claimedAt: new Date() },
    });
    await db().order.updateMany({ where: { customerPhone: phone, customerId: null }, data: { customerId: customer.id } });
    revalidatePath("/orders");
    return ok({ phone });
  });
}
