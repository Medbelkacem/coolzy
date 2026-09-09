import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDA } from "@/lib/money";
import { fmtDate } from "@/lib/time";
import { EmptyState } from "@/components/ui/EmptyState";
import type { AppLocale } from "@/i18n/config";

export const dynamic = "force-dynamic";

/** The signed-in user's own salary payments, newest first, with a running total. */
export default async function MyPayslipsPage() {
  const actor = await requirePermission("salary.read_own");
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("worker");
  const rows = await db().salaryPayment.findMany({ where: { userId: actor.id }, orderBy: { paidAt: "desc" } });
  const total = rows.reduce((s, r) => s + r.amount, 0);
  // running total counts from the oldest payment upward
  let acc = 0;
  const running = new Map<string, number>();
  for (const r of [...rows].reverse()) {
    acc += r.amount;
    running.set(r.id, acc);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl">{t("payslips.title")}</h1>
        <p className="mt-1 text-[var(--fg-muted)]">{t("payslips.subtitle")}</p>
      </div>
      {rows.length === 0 ? (
        <EmptyState title={t("payslips.empty")} body={t("payslips.emptyBody")} compact />
      ) : (
        <>
          <div className="surface flex items-baseline justify-between px-4 py-3">
            <span className="text-sm text-[var(--fg-muted)]">{t("payslips.runningTotal")}</span>
            <span className="font-display text-xl tabular">{formatDA(total, locale)}</span>
          </div>
          <div className="surface overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-start text-[var(--fg-muted)]">
                <tr className="border-b hairline">
                  <th className="px-4 py-2 text-start font-normal">{t("payslips.period")}</th>
                  <th className="px-4 py-2 text-start font-normal">{t("payslips.paidAt")}</th>
                  <th className="px-4 py-2 text-start font-normal">{t("payslips.method")}</th>
                  <th className="px-4 py-2 text-end font-normal">{t("payslips.amount")}</th>
                  <th className="px-4 py-2 text-end font-normal">{t("payslips.runningTotal")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b hairline last:border-b-0 align-top">
                    <td className="px-4 py-3">
                      {fmtDate(r.periodStart, locale)} – {fmtDate(r.periodEnd, locale)}
                      {r.note ? <div className="text-[var(--fg-muted)]">{r.note}</div> : null}
                    </td>
                    <td className="px-4 py-3">{fmtDate(r.paidAt, locale)}</td>
                    <td className="px-4 py-3">{t(`payslips.methods.${r.method}`)}</td>
                    <td className="px-4 py-3 text-end tabular">{formatDA(r.amount, locale)}</td>
                    <td className="px-4 py-3 text-end tabular text-[var(--fg-muted)]">{formatDA(running.get(r.id) ?? 0, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
