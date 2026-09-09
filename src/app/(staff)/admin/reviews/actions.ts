"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/authz";
import { guarded, ok, fail, type ActionResult } from "@/lib/action";
import { db } from "@/lib/db";
import { ReviewStatus } from "@/generated/prisma/enums";

const idSchema = z.string().min(1).max(64);

export async function setReviewStatus(id: string, status: ReviewStatus): Promise<ActionResult> {
  return guarded(async () => {
    await requirePermission("reviews.moderate");
    const parsed = z.object({ id: idSchema, status: z.enum(ReviewStatus) }).safeParse({ id, status });
    if (!parsed.success) return fail("invalid");
    await db().review.update({ where: { id: parsed.data.id }, data: { status: parsed.data.status } });
    revalidatePath("/admin/reviews");
    revalidatePath("/");
    return ok();
  });
}

export async function deleteReview(id: string): Promise<ActionResult> {
  return guarded(async () => {
    await requirePermission("reviews.moderate");
    const parsed = idSchema.safeParse(id);
    if (!parsed.success) return fail("invalid");
    await db().review.delete({ where: { id: parsed.data } });
    revalidatePath("/admin/reviews");
    revalidatePath("/");
    return ok();
  });
}
