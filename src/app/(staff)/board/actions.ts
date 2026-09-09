"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/authz";
import { guarded, ok, type ActionResult } from "@/lib/action";
import { transitionOrder, toOrderDTO, type OrderDTO } from "@/lib/orders";

const advanceSchema = z.object({
  orderId: z.string().min(1).max(64),
  to: z.enum(["APPROVED", "PREPARING", "READY", "COMPLETED", "DELIVERED"]),
});
const cancelSchema = z.object({
  orderId: z.string().min(1).max(64),
  reason: z.string().trim().min(2).max(200),
});

/** One forward step. Workers can only move to the next status; the server checks it. */
export async function advanceOrder(input: { orderId: string; to: string }): Promise<ActionResult<OrderDTO>> {
  return guarded(async () => {
    const actor = await requirePermission("board.advance");
    const parsed = advanceSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "invalid" };
    const order = await transitionOrder({ orderId: parsed.data.orderId, to: parsed.data.to, actorId: actor.id });
    revalidatePath("/board");
    return ok(toOrderDTO(order));
  });
}

export async function cancelOrder(input: { orderId: string; reason: string }): Promise<ActionResult<OrderDTO>> {
  return guarded(async () => {
    const actor = await requirePermission("board.advance");
    const parsed = cancelSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "reasonRequired", fieldErrors: { reason: "reasonRequired" } };
    const order = await transitionOrder({ orderId: parsed.data.orderId, to: "CANCELLED", actorId: actor.id, reason: parsed.data.reason });
    revalidatePath("/board");
    return ok(toOrderDTO(order));
  });
}
