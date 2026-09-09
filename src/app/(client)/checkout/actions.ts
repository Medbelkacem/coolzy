"use server";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { fail, guarded, ok, type ActionResult, type ErrorKey } from "@/lib/action";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { ensureClientToken } from "@/lib/customer";
import { createOrder, orderInputSchema, quoteOrder, type OrderInput } from "@/lib/orders";
import { isSoldOut } from "@/lib/menu";

/** Server-side quote: totals and availability, before the customer confirms. Nothing is persisted. */
export async function quote(input: unknown): Promise<ActionResult<{ subtotal: number; deliveryFee: number; total: number; tableCount: number }>> {
  return guarded(async () => {
    const parsed = orderInputSchema.safeParse(input);
    if (!parsed.success) return fail("invalid", fieldErrorsOf(parsed.error));
    const unavailable = await unavailableItems(parsed.data);
    if (unavailable.length) return fail("productUnavailable", Object.fromEntries(unavailable.map((id) => [id, "productUnavailable" as ErrorKey])));
    const q = await quoteOrder(parsed.data);
    return ok({ subtotal: q.subtotal, deliveryFee: q.deliveryFee, total: q.total, tableCount: q.shop.tableCount });
  });
}

export async function placeOrder(input: unknown): Promise<ActionResult<{ token: string }>> {
  return guarded(async () => {
    const ip = clientIp(await headers());
    if (!(await checkRateLimit(`order:${ip}`, 10, 600))) return fail("rateLimited");
    const parsed = orderInputSchema.safeParse(input);
    if (!parsed.success) return fail("invalid", fieldErrorsOf(parsed.error));
    const unavailable = await unavailableItems(parsed.data);
    if (unavailable.length) return fail("productUnavailable", Object.fromEntries(unavailable.map((id) => [id, "productUnavailable" as ErrorKey])));
    const clientToken = await ensureClientToken();
    const order = await createOrder(parsed.data, { clientToken });
    return ok({ token: order.token });
  });
}

async function unavailableItems(input: OrderInput): Promise<string[]> {
  const ids = [...new Set(input.items.map((i) => i.productId))];
  const products = await db().product.findMany({ where: { id: { in: ids } }, include: { category: { select: { active: true } } } });
  const now = new Date();
  const okIds = new Set(products.filter((p) => p.category.active && !isSoldOut(p, now)).map((p) => p.id));
  return ids.filter((id) => !okIds.has(id));
}

function fieldErrorsOf(err: z.ZodError): Record<string, ErrorKey> {
  const out: Record<string, ErrorKey> = {};
  for (const issue of err.issues) {
    const f = String(issue.path[0] ?? "");
    if (!f) continue;
    out[f] = f === "customerPhone" ? "phoneInvalid" : f === "tableNumber" ? "tableInvalid" : "invalid";
  }
  return out;
}
