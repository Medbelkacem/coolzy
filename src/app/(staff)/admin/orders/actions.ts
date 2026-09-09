"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/authz";
import { guarded, ok, fail, type ActionResult } from "@/lib/action";
import { transitionOrder } from "@/lib/orders";
import { OrderStatus } from "@/generated/prisma/enums";

const schema = z.object({
  orderId: z.string().min(1).max(64),
  status: z.enum(OrderStatus),
  reason: z.string().trim().max(300).optional(),
});

/** Admin-only: force any status. Recorded as an OrderEvent and an audit entry. */
export async function overrideStatus(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const actor = await requirePermission("orders.override");
    const parsed = schema.safeParse(Object.fromEntries(form));
    if (!parsed.success) return fail("invalid");
    const { orderId, status, reason } = parsed.data;
    if (status === "CANCELLED" && !reason) return fail("reasonRequired", { reason: "reasonRequired" });
    await transitionOrder({ orderId, to: status, actorId: actor.id, reason, override: true });
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    return ok();
  });
}
