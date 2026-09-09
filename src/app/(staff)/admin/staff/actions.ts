"use server";
import { z } from "zod";
import argon2 from "argon2";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/authz";
import { audit } from "@/lib/audit";
import { fail, guarded, ok, type ActionResult, type ErrorKey } from "@/lib/action";
import { dayNoon } from "@/lib/date-input";
import { normalizePhone } from "@/lib/customer";

const baseSchema = z.object({
  name: z.string().trim().min(2).max(80),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,32}$/),
  email: z.string().trim().toLowerCase().email().max(120).or(z.literal("")).default(""),
  phone: z.string().trim().max(30).default(""),
  role: z.enum(["ADMIN", "WORKER"]),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).default(""),
});
const createSchema = baseSchema.extend({ password: z.string().min(12).max(200) });
const updateSchema = baseSchema.extend({ password: z.string().max(200).default("") });

function zodFieldErrors(issues: z.ZodIssue[]): Record<string, ErrorKey> {
  const out: Record<string, ErrorKey> = {};
  for (const i of issues) {
    const f = String(i.path[0] ?? "");
    out[f] = f === "password" ? "passwordWeak" : "invalid";
  }
  return out;
}

function parsePhone(raw: string): { ok: true; value: string | null } | { ok: false } {
  if (!raw) return { ok: true, value: null };
  const n = normalizePhone(raw);
  return n ? { ok: true, value: n } : { ok: false };
}

export async function createStaff(_prev: unknown, form: FormData): Promise<ActionResult<{ id: string }>> {
  const result = await guarded<{ id: string }>(async () => {
    const actor = await requirePermission("staff.manage");
    const parsed = createSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) return fail("invalid", zodFieldErrors(parsed.error.issues));
    const d = parsed.data;
    const phone = parsePhone(d.phone);
    if (!phone.ok) return fail("invalid", { phone: "phoneInvalid" });
    const passwordHash = await argon2.hash(d.password, { type: argon2.argon2id });
    try {
      const user = await db().user.create({
        data: {
          name: d.name,
          username: d.username,
          email: d.email || null,
          phone: phone.value,
          role: d.role,
          hireDate: d.hireDate ? dayNoon(d.hireDate) : null,
          passwordHash,
        },
      });
      await audit(actor.id, "staff.create", "User", user.id, { username: user.username, role: user.role });
      revalidatePath("/admin/staff");
      return ok({ id: user.id });
    } catch (err) {
      return uniqueError(err);
    }
  });
  if (result.ok) redirect(`/admin/staff/${result.data.id}`);
  return result;
}

export async function updateStaff(id: string, _prev: unknown, form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const actor = await requirePermission("staff.manage");
    const parsed = updateSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) return fail("invalid", zodFieldErrors(parsed.error.issues));
    const d = parsed.data;
    if (d.password && d.password.length < 12) return fail("invalid", { password: "passwordWeak" });
    const phone = parsePhone(d.phone);
    if (!phone.ok) return fail("invalid", { phone: "phoneInvalid" });
    const existing = await db().user.findUnique({ where: { id } });
    if (!existing) return fail("notFound");
    if (existing.id === actor.id && d.role !== "ADMIN") return fail("selfDeactivate", { role: "selfDeactivate" });
    try {
      await db().user.update({
        where: { id },
        data: {
          name: d.name,
          username: d.username,
          email: d.email || null,
          phone: phone.value,
          role: d.role,
          hireDate: d.hireDate ? dayNoon(d.hireDate) : null,
          ...(d.password ? { passwordHash: await argon2.hash(d.password, { type: argon2.argon2id }) } : {}),
        },
      });
    } catch (err) {
      return uniqueError(err);
    }
    await audit(actor.id, "staff.update", "User", id, { username: d.username, role: d.role, passwordChanged: Boolean(d.password) });
    revalidatePath("/admin/staff");
    revalidatePath(`/admin/staff/${id}`);
    return ok();
  });
}

export async function setStaffActive(id: string, active: boolean): Promise<ActionResult> {
  return guarded(async () => {
    const actor = await requirePermission("staff.manage");
    if (id === actor.id && !active) return fail("selfDeactivate");
    const user = await db().user.findUnique({ where: { id } });
    if (!user) return fail("notFound");
    await db().user.update({ where: { id }, data: { active } });
    await audit(actor.id, active ? "staff.reactivate" : "staff.deactivate", "User", id, { username: user.username });
    revalidatePath("/admin/staff");
    revalidatePath(`/admin/staff/${id}`);
    return ok();
  });
}

const paymentSchema = z.object({
  amount: z.coerce.number().int().min(1).max(100_000_000),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  method: z.enum(["CASH", "BANK", "CCP", "OTHER"]),
  note: z.string().trim().max(200).default(""),
});

export async function recordSalaryPayment(userId: string, _prev: unknown, form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const actor = await requirePermission("salary.manage");
    const parsed = paymentSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) return fail("invalid", zodFieldErrors(parsed.error.issues));
    const d = parsed.data;
    const periodStart = dayNoon(d.periodStart);
    const periodEnd = dayNoon(d.periodEnd);
    const paidAt = dayNoon(d.paidAt);
    if (!periodStart || !periodEnd || !paidAt) return fail("invalid");
    if (periodEnd.getTime() < periodStart.getTime()) return fail("invalid", { periodEnd: "invalid" });
    const user = await db().user.findUnique({ where: { id: userId } });
    if (!user) return fail("notFound");
    const payment = await db().$transaction(async (tx) => {
      const p = await tx.salaryPayment.create({
        data: { userId, amount: d.amount, periodStart, periodEnd, paidAt, method: d.method, note: d.note },
      });
      await tx.expense.create({
        data: { category: "SALARIES", amount: d.amount, date: paidAt, note: `Salaire — ${user.name}${d.note ? ` (${d.note})` : ""}`, salaryPaymentId: p.id },
      });
      return p;
    });
    await audit(actor.id, "salary.pay", "SalaryPayment", payment.id, { userId, amount: d.amount, method: d.method });
    revalidatePath(`/admin/staff/${userId}`);
    revalidatePath("/admin/staff");
    revalidatePath("/admin/expenses");
    revalidatePath("/me/payslips");
    return ok();
  });
}

export async function deleteSalaryPayment(id: string): Promise<ActionResult> {
  return guarded(async () => {
    const actor = await requirePermission("salary.manage");
    const p = await db().salaryPayment.findUnique({ where: { id } });
    if (!p) return fail("notFound");
    // Expense → SalaryPayment cascade is declared on the Expense side; delete the pair explicitly.
    await db().$transaction([db().expense.deleteMany({ where: { salaryPaymentId: id } }), db().salaryPayment.delete({ where: { id } })]);
    await audit(actor.id, "salary.delete", "SalaryPayment", id, { userId: p.userId, amount: p.amount });
    revalidatePath(`/admin/staff/${p.userId}`);
    revalidatePath("/admin/staff");
    revalidatePath("/admin/expenses");
    revalidatePath("/me/payslips");
    return ok();
  });
}

function uniqueError<T>(err: unknown): ActionResult<T> {
  const e = err as { code?: string; meta?: { target?: string[] | string } };
  if (e.code === "P2002") {
    const target = Array.isArray(e.meta?.target) ? e.meta?.target.join(",") : String(e.meta?.target ?? "");
    if (target.includes("email")) return fail("emailTaken", { email: "emailTaken" });
    return fail("usernameTaken", { username: "usernameTaken" });
  }
  throw err;
}
