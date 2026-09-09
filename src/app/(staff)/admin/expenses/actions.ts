"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/authz";
import { audit } from "@/lib/audit";
import { fail, guarded, ok, type ActionResult, type ErrorKey } from "@/lib/action";
import { dayNoon } from "@/lib/date-input";

const schema = z.object({
  category: z.enum(["SUPPLIES", "RENT", "SALARIES", "UTILITIES", "OTHER"]),
  amount: z.coerce.number().int().min(1).max(100_000_000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().max(200).default(""),
});

function fieldErrors(issues: z.ZodIssue[]): Record<string, ErrorKey> {
  const out: Record<string, ErrorKey> = {};
  for (const i of issues) out[String(i.path[0] ?? "")] = "invalid";
  return out;
}

export async function saveExpense(id: string | null, _prev: unknown, form: FormData): Promise<ActionResult<{ id: string }>> {
  return guarded(async () => {
    const actor = await requirePermission("expenses.manage");
    const parsed = schema.safeParse(Object.fromEntries(form));
    if (!parsed.success) return fail("invalid", fieldErrors(parsed.error.issues));
    const d = parsed.data;
    const date = dayNoon(d.date);
    if (!date) return fail("invalid", { date: "invalid" });
    if (id) {
      const existing = await db().expense.findUnique({ where: { id } });
      if (!existing) return fail("notFound");
      if (existing.salaryPaymentId) return fail("invalid");
      await db().expense.update({ where: { id }, data: { category: d.category, amount: d.amount, date, note: d.note } });
      await audit(actor.id, "expense.update", "Expense", id, { category: d.category, amount: d.amount });
      revalidatePath("/admin/expenses");
      return ok({ id });
    }
    const created = await db().expense.create({ data: { category: d.category, amount: d.amount, date, note: d.note } });
    await audit(actor.id, "expense.create", "Expense", created.id, { category: d.category, amount: d.amount });
    revalidatePath("/admin/expenses");
    return ok({ id: created.id });
  });
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  return guarded(async () => {
    const actor = await requirePermission("expenses.manage");
    const existing = await db().expense.findUnique({ where: { id } });
    if (!existing) return fail("notFound");
    if (existing.salaryPaymentId) return fail("invalid");
    await db().expense.delete({ where: { id } });
    await audit(actor.id, "expense.delete", "Expense", id, { category: existing.category, amount: existing.amount });
    revalidatePath("/admin/expenses");
    return ok();
  });
}
