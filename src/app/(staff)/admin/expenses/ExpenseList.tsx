"use client";
import { useActionState, useEffect, useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Field, SelectField } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ErrorText } from "@/components/ui/ErrorText";
import { IconPlus, IconX } from "@/components/ui/Icons";
import { formatDA } from "@/lib/money";
import { fmtDate } from "@/lib/time";
import type { AppLocale } from "@/i18n/config";
import type { ExpenseCategory } from "@/generated/prisma/enums";
import { deleteExpense, saveExpense } from "./actions";

export type ExpenseRow = { id: string; category: ExpenseCategory; amount: number; date: string; dateInput: string; note: string; salaryFor: string | null };
const CATEGORIES: ExpenseCategory[] = ["SUPPLIES", "RENT", "SALARIES", "UTILITIES", "OTHER"];

function ExpenseForm({ row, onDone }: { row: ExpenseRow | null; onDone: () => void }) {
  const t = useTranslations("expenses");
  const action = saveExpense.bind(null, row?.id ?? null);
  const [state, formAction] = useActionState(action, null);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  // Close after a successful save; the server already revalidated the list.
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  return (
    <form action={formAction} className="surface mb-4 grid gap-4 p-5 sm:grid-cols-2">
      <h2 className="font-display text-lg sm:col-span-2">{row ? t("editTitle") : t("newTitle")}</h2>
      <SelectField label={t("category")} name="category" defaultValue={row?.category ?? "SUPPLIES"} error={fe.category}>
        {CATEGORIES.map((c) => <option key={c} value={c}>{t(`categories.${c}`)}</option>)}
      </SelectField>
      <Field label={t("amount")} name="amount" type="number" inputMode="numeric" min={1} step={1} required defaultValue={row?.amount ?? ""} error={fe.amount} />
      <Field label={t("date")} name="date" type="date" required defaultValue={row?.dateInput ?? iso} error={fe.date} />
      <Field label={t("note")} name="note" maxLength={200} defaultValue={row?.note ?? ""} error={fe.note} />
      {state && !state.ok && !state.fieldErrors ? <ErrorText error={state.error} className="sm:col-span-2" /> : null}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <button type="button" className="btn btn-quiet" onClick={onDone}>{t("cancel")}</button>
        <SubmitButton className="btn btn-primary">{t("save")}</SubmitButton>
      </div>
    </form>
  );
}

export function ExpenseList({ rows, locale, emptyState }: { rows: ExpenseRow[]; locale: AppLocale; emptyState?: ReactNode }) {
  const t = useTranslations("expenses");
  const [editing, setEditing] = useState<ExpenseRow | null | "new">(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <section>
      <div className="mb-3 flex justify-end">
        <button type="button" className="btn btn-primary" onClick={() => setEditing("new")}>
          <IconPlus width={18} height={18} />
          {t("add")}
        </button>
      </div>
      {editing !== null ? <ExpenseForm key={editing === "new" ? "new" : editing.id} row={editing === "new" ? null : editing} onDone={() => setEditing(null)} /> : null}
      {rows.length === 0 ? (
        emptyState
      ) : (
        <div className="surface overflow-x-auto">
          <table className="money-table">
            <thead>
              <tr>
                <th>{t("date")}</th>
                <th>{t("category")}</th>
                <th>{t("note")}</th>
                <th className="num">{t("amount")}</th>
                <th><span className="sr-only">{t("delete")}</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap">{fmtDate(new Date(e.date), locale)}</td>
                  <td>
                    <span className="chip">{t(`categories.${e.category}`)}</span>
                  </td>
                  <td className="max-w-[22rem]">
                    <span className="block truncate">{e.note || "—"}</span>
                    {e.salaryFor ? <span className="block text-xs text-[var(--fg-muted)]">{t("fromSalaryHelp")}</span> : null}
                  </td>
                  <td className="num">{formatDA(e.amount, locale)}</td>
                  <td className="num whitespace-nowrap">
                    {e.salaryFor ? null : (
                      <>
                        <button type="button" className="btn btn-quiet btn-sm" onClick={() => setEditing(e)}>{t("editTitle")}</button>
                        <button
                          type="button"
                          className="btn btn-quiet btn-icon ms-1"
                          aria-label={t("delete")}
                          disabled={pending}
                          onClick={() => {
                            if (!window.confirm(t("deleteConfirm"))) return;
                            setError(null);
                            start(async () => {
                              const r = await deleteExpense(e.id);
                              if (!r.ok) setError(r.error);
                            });
                          }}
                        >
                          <IconX width={16} height={16} />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ErrorText error={error} className="px-3 pb-3" />
        </div>
      )}
    </section>
  );
}
