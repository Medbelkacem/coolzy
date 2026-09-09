"use client";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { overrideStatus } from "../actions";
import { SelectField, TextareaField } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ErrorText } from "@/components/ui/ErrorText";
import type { OrderStatus } from "@/generated/prisma/enums";

export function OverrideForm({ orderId, current, statuses }: { orderId: string; current: OrderStatus; statuses: { value: OrderStatus; label: string }[] }) {
  const t = useTranslations("adminOrders.override");
  const [state, action] = useActionState(overrideStatus, null);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form action={action} className="surface flex flex-col gap-3 p-4">
      <input type="hidden" name="orderId" value={orderId} />
      <h2 className="font-display text-lg">{t("title")}</h2>
      <p className="text-sm text-[var(--fg-muted)]">{t("body")}</p>
      <SelectField label={t("status")} name="status" defaultValue={current} required>
        {statuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </SelectField>
      <TextareaField label={t("reason")} name="reason" maxLength={300} help={t("reasonHelp")} error={fe.reason} />
      {state && !state.ok && !state.fieldErrors ? <ErrorText error={state.error} /> : null}
      {state?.ok ? <p role="status" className="text-sm text-[var(--color-ok)]">{t("done")}</p> : null}
      <SubmitButton className="btn btn-primary self-start">{t("submit")}</SubmitButton>
    </form>
  );
}
