"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/authz";
import { guarded, ok, type ActionResult } from "@/lib/action";
import { db } from "@/lib/db";
import { getShop } from "@/lib/shop";
import { nextOpening } from "@/lib/time";

const idSchema = z.string().min(1).max(64);

function revalidate() {
  revalidatePath("/");
  revalidatePath("/board/menu");
  revalidatePath("/admin/menu");
}

/** Worker-level "sold out for today": clears itself at the next opening. */
export async function markSoldOutToday(productId: string): Promise<ActionResult<{ until: string }>> {
  return guarded(async () => {
    await requirePermission("menu.mark_sold_out");
    const id = idSchema.parse(productId);
    const shop = await getShop();
    const until = nextOpening(shop.hours);
    const product = await db().product.findUnique({ where: { id } });
    if (!product) return { ok: false, error: "notFound" };
    await db().product.update({ where: { id }, data: { soldOutUntil: until } });
    revalidate();
    return ok({ until: until.toISOString() });
  });
}

export async function clearSoldOut(productId: string): Promise<ActionResult> {
  return guarded(async () => {
    await requirePermission("menu.mark_sold_out");
    const id = idSchema.parse(productId);
    const product = await db().product.findUnique({ where: { id } });
    if (!product) return { ok: false, error: "notFound" };
    await db().product.update({ where: { id }, data: { soldOutUntil: null } });
    revalidate();
    return ok();
  });
}
