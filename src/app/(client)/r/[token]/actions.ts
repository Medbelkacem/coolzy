"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { fail, guarded, ok, type ActionResult } from "@/lib/action";
import { getOrderByToken } from "@/lib/receipt";
import { getClientToken } from "@/lib/customer";
import { isSoldOut } from "@/lib/menu";
import { REVIEW_EDIT_WINDOW_MS, sanitizeComment } from "@/lib/reviews";
import type { AppLocale } from "@/i18n/config";

/* ---------------- Reorder ---------------- */

export type ReorderLine = { productId: string; name: string; unitPrice: number; qty: number; note: string | null };

/** Current availability and prices for the items of an order — the cart gets today's numbers, never the old ones. */
export async function reorderLines(token: string): Promise<ActionResult<{ lines: ReorderLine[]; skipped: number }>> {
  return guarded(async () => {
    const order = await getOrderByToken(token);
    if (!order) return fail("notFound");
    const locale = (await getLocale()) as AppLocale;
    const ids = order.items.map((i) => i.productId).filter((x): x is string => !!x);
    const products = await db().product.findMany({ where: { id: { in: ids }, category: { active: true } }, include: { translations: true } });
    const byId = new Map(products.map((p) => [p.id, p]));
    const lines: ReorderLine[] = [];
    let skipped = 0;
    for (const it of order.items) {
      const p = it.productId ? byId.get(it.productId) : undefined;
      if (!p || isSoldOut(p)) {
        skipped++;
        continue;
      }
      const tr = p.translations.find((t) => t.locale === locale && t.name.trim()) ?? p.translations.find((t) => t.locale === "fr");
      lines.push({ productId: p.id, name: tr?.name ?? it.nameSnapshot, unitPrice: p.price, qty: it.qty, note: it.note });
    }
    return ok({ lines, skipped });
  });
}

/* ---------------- Reviews ---------------- */

const reviewSchema = z.object({
  token: z.string().min(20).max(32),
  productId: z.string().min(1).max(64),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(500).default(""),
});

export async function submitReview(_prev: unknown, form: FormData): Promise<ActionResult<{ productId: string }>> {
  return guarded(async () => {
    const parsed = reviewSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) return fail("invalid", { rating: "invalid" });
    const { token, productId, rating } = parsed.data;
    const comment = sanitizeComment(parsed.data.comment);
    const order = await getOrderByToken(token);
    if (!order) return fail("notFound");
    if (order.status !== "COMPLETED" && order.status !== "DELIVERED") return fail("reviewNotAllowed");
    if (!order.items.some((i) => i.productId === productId)) return fail("reviewNotAllowed");
    const clientToken = await getClientToken();
    const customer = clientToken ? await db().customer.findUnique({ where: { token: clientToken } }) : null;
    const existing = await db().review.findUnique({ where: { orderId_productId: { orderId: order.id, productId } } });
    if (existing) {
      if (Date.now() - existing.createdAt.getTime() > REVIEW_EDIT_WINDOW_MS) return fail("reviewWindowClosed");
      await db().review.update({ where: { id: existing.id }, data: { rating, comment, status: "PENDING", customerId: customer?.id ?? existing.customerId } });
    } else {
      await db().review.create({ data: { orderId: order.id, productId, rating, comment, customerId: customer?.id ?? null } });
    }
    revalidatePath(`/r/${token}`);
    return ok({ productId });
  });
}
