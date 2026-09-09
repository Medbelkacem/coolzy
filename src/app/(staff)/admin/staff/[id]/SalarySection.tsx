"use client";
import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Field, SelectField } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ErrorText } from "@/components/ui/ErrorText";
import { formatDA } from "@/lib/money";
import { fmtDate } from "@/lib/time";
import type { AppLocale } from "@/i18n/config";
import { deleteSalaryPayment, recordSalaryPayment } from "../actions";
import { IconPlus, IconX } from "@/components/ui/Icons";

type Payment = { id: string; amount: number; periodStart: string; periodEnd: string; paidAt: string; method: "CASH" | "BANK" | "CCP" | "OTHER"; note: string };

export function SalarySection({ userId, payments, locale }: { userId: string; payments: Payment[]; locale: string }) {
  const t = useTranslations("staff.salaries");
  const [open, setOpen] = useState(false);
  const record = recordSalaryPayment.bind(null, userId);
  const [state, action] = useActionState(record, null);
  const [pending, start] = useTransition();
  const [delError, setDelError] = useState<string | null>(null);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  const total = payments.reduce((s, p) => s + p.amount, 0);
  const loc = locale as AppLocale;
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  // Running totals from oldest to newest, displayed newest first.
  const running = new Map<string, number>();
  let acc = 0;
  for (const p of [...payments].reverse()) {
    acc += p.amount;
    running.set(p.id, acc);
  }

  return (
    <section className="mt-8" aria-labelledby="salaries-h">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="salaries-h" className="font-display text-xl">{t("title")}</h2>
          <p className="text-sm text-[var(--fg-muted)]">{t("subtitle")}</p>
        </div>
        <button type="button" className="btn btn-primary" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <IconPlus width={18} height={18} />
          {t("record")}
        </button>
      </div>

      {open ? (
        <form action={action} className="surface mb-4 grid gap-4 p-5 sm:grid-cols-2">
          <Field label={t("amount")} name="amount" type="number" inputMode="numeric" min={1} step={1} required error={fe.amount} />
          <SelectField label={t("method")} name="method" defaultValue="CASH" error={fe.method}>
            <option value="CASH">{t("methods.CASH")}</option>
            <option value="BANK">{t("methods.BANK")}</option>
            <option value="CCP">{t("methods.CCP")}</option>
            <option value="OTHER">{t("methods.OTHER")}</option>
          </SelectField>
          <Field label={t("periodStart")} name="periodStart" type="date" required defaultValue={iso(monthStart)} error={fe.periodStart} />
          <Field label={t("periodEnd")} name="periodEnd" type="date" required defaultValue={iso(today)} error={fe.periodEnd} />
          <Field label={t("paidAt")} name="paidAt" type="date" required defaultValue={iso(today)} error={fe.paidAt} />
          <Field label={t("note")} name="note" maxLength={200} error={fe.note} />
          {state && !state.ok && !state.fieldErrors ? <ErrorText error={state.error} className="sm:col-span-2" /> : null}
          {state?.ok ? <p role="status" className="text-sm text-[var(--color-ok)] sm:col-span-2">{t("recorded")}</p> : null}
          <div className="flex justify-end sm:col-span-2">
            <SubmitButton className="btn btn-primary">{t("record")}</SubmitButton>
          </div>
        </form>
      ) : null}

      {payments.length === 0 ? (
        <p className="surface p-5 text-[var(--fg-muted)]">{t("empty")}</p>
      ) : (
        <div className="surface overflow-x-auto">
          <table className="money-table">
            <thead>
              <tr>
                <th>{t("paidAt")}</th>
                <th>{t("period")}</th>
                <th>{t("method")}</th>
                <th>{t("note")}</th>
                <th className="num">{t("amount")}</th>
                <th className="num">{t("runningTotal")}</th>
                <th><span className="sr-only">{t("delete")}</span></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="whitespace-nowrap">{fmtDate(new Date(p.paidAt), locale)}</td>
                  <td className="whitespace-nowrap">{fmtDate(new Date(p.periodStart), locale)} – {fmtDate(new Date(p.periodEnd), locale)}</td>
                  <td>{t(`methods.${p.method}`)}</td>
                  <td className="max-w-[16rem] truncate">{p.note || "—"}</td>
                  <td className="num">{formatDA(p.amount, loc)}</td>
                  <td className="num text-[var(--fg-muted)]">{formatDA(running.get(p.id) ?? 0, loc)}</td>
                  <td className="num">
                    <button
                      type="button"
                      className="btn btn-quiet btn-icon"
                      aria-label={t("delete")}
                      disabled={pending}
                      onClick={() => {
                        if (!window.confirm(t("deleteConfirm"))) return;
                        setDelError(null);
                        start(async () => {
                          const r = await deleteSalaryPayment(p.id);
                          if (!r.ok) setDelError(r.error);
                        });
                      }}
                    >
                      <IconX width={16} height={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="font-medium">{t("total")} <span className="text-[var(--fg-muted)]">({t("count", { count: payments.length })})</span></td>
                <td className="num font-medium">{formatDA(total, loc)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
          <ErrorText error={delError} className="px-3 pb-3" />
        </div>
      )}
    </section>
  );
}
