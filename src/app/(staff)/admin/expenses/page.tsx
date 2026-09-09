import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDA } from "@/lib/money";
import { fmtDate } from "@/lib/time";
import { resolveRange, getExpensesByCategory } from "@/lib/stats";
import { toDateInput } from "@/lib/date-input";
import { PageHeader } from "@/components/admin/PageHeader";
import { RangePicker } from "@/components/admin/RangePicker";
import { EmptyState } from "@/components/ui/EmptyState";
import { ExpenseList } from "./ExpenseList";
import type { AppLocale } from "@/i18n/config";
import type { ExpenseCategory } from "@/generated/prisma/enums";
import "@/styles/admin-money.css";

const CATEGORIES: ExpenseCategory[] = ["SUPPLIES", "RENT", "SALARIES", "UTILITIES", "OTHER"];

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string; category?: string }> }) {
  await requirePermission("expenses.manage");
  const sp = await searchParams;
  const t = await getTranslations("expenses");
  const tc = await getTranslations("common");
  const locale = (await getLocale()) as AppLocale;
  const r = resolveRange(sp);
  const category = CATEGORIES.includes(sp.category as ExpenseCategory) ? (sp.category as ExpenseCategory) : undefined;

  const [rows, byCategory] = await Promise.all([
    db().expense.findMany({
      where: { date: { gte: r.from, lte: r.to }, ...(category ? { category } : {}) },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { salaryPayment: { include: { user: { select: { name: true } } } } },
      take: 500,
    }),
    getExpensesByCategory(r.from, r.to),
  ]);
  const total = byCategory.reduce((s, c) => s + c.amount, 0);
  const periodLabel = `${fmtDate(r.from, locale)} – ${fmtDate(r.to, locale)}`;

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <div className="mb-5 flex flex-col gap-3">
        <RangePicker basePath="/admin/expenses" current={r.key} from={toDateInput(r.from)} to={toDateInput(r.to)} extra={category ? { category } : {}} />
        <form method="get" action="/admin/expenses" className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="range" value={r.key} />
          {r.key === "custom" ? <><input type="hidden" name="from" value={toDateInput(r.from)} /><input type="hidden" name="to" value={toDateInput(r.to)} /></> : null}
          <label className="flex flex-col gap-1 text-sm text-[var(--fg-muted)]">
            {t("category")}
            <select name="category" className="select min-w-[12rem]" defaultValue={category ?? ""}>
              <option value="">{t("allCategories")}</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{t(`categories.${c}`)}</option>)}
            </select>
          </label>
          <button type="submit" className="btn btn-quiet">{t("apply")}</button>
        </form>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_2fr]">
        <div className="surface flex flex-col gap-1 p-4">
          <p className="text-sm text-[var(--fg-muted)]">{t("total")}</p>
          <p className="font-display text-2xl tabular">{formatDA(total, locale)}</p>
          <p className="text-sm text-[var(--fg-muted)]">{periodLabel}</p>
        </div>
        <div className="surface p-4">
          <p className="mb-2 text-sm text-[var(--fg-muted)]">{t("byCategory")} — {periodLabel}</p>
          {byCategory.length === 0 ? (
            <p className="text-sm text-[var(--fg-muted)]">{t("count", { count: 0 })}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {byCategory.map((c) => (
                <li key={c.category} className="cat-bar" style={{ ["--accent" as string]: "var(--color-bean)" }}>
                  <span>{t(`categories.${c.category as ExpenseCategory}`)}</span>
                  <span className="track"><span className="fill" style={{ width: `${total ? Math.max(2, Math.round((c.amount / total) * 100)) : 0}%` }} /></span>
                  <span className="tabular">{formatDA(c.amount, locale)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <ExpenseList locale={locale} rows={[]} emptyState={<EmptyState title={t("emptyTitle")} body={t("emptyBody")} />} />
      ) : (
        <ExpenseList
          locale={locale}
          rows={rows.map((e) => ({
            id: e.id,
            category: e.category,
            amount: e.amount,
            date: e.date.toISOString(),
            dateInput: toDateInput(e.date),
            note: e.note,
            salaryFor: e.salaryPayment ? e.salaryPayment.user.name : null,
          }))}
        />
      )}
      <p className="mt-3 text-sm text-[var(--fg-muted)]">{t("count", { count: rows.length })} — {tc("period")} {periodLabel}</p>
    </>
  );
}
