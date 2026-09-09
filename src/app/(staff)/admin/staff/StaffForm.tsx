"use client";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Field, SelectField } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ErrorText } from "@/components/ui/ErrorText";
import type { ActionResult } from "@/lib/action";

export type StaffFormValues = { name: string; username: string; email: string; phone: string; role: "ADMIN" | "WORKER"; hireDate: string };

export function StaffForm({
  action,
  initial,
  mode,
}: {
  action: (prev: unknown, form: FormData) => Promise<ActionResult<unknown>>;
  initial?: StaffFormValues;
  mode: "create" | "edit";
}) {
  const t = useTranslations("staff");
  const [state, formAction] = useActionState(action, null as ActionResult<unknown> | null);
  const [saved, setSaved] = useState(false);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  const v = initial ?? { name: "", username: "", email: "", phone: "", role: "WORKER" as const, hireDate: "" };

  return (
    <form
      action={(fd) => {
        setSaved(false);
        return formAction(fd);
      }}
      className="surface flex flex-col gap-4 p-5"
      onSubmit={() => setSaved(true)}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("name")} name="name" required autoComplete="off" defaultValue={v.name} error={fe.name} />
        <Field label={t("username")} name="username" required autoCapitalize="none" spellCheck={false} pattern="[a-z0-9._-]{3,32}" defaultValue={v.username} help={t("usernameHelp")} error={fe.username} />
        <Field label={t("email")} name="email" type="email" autoComplete="off" defaultValue={v.email} error={fe.email} />
        <Field label={t("phone")} name="phone" type="tel" inputMode="tel" placeholder="0X XX XX XX XX" autoComplete="off" defaultValue={v.phone} error={fe.phone} dir="ltr" />
        <SelectField label={t("role")} name="role" defaultValue={v.role} error={fe.role}>
          <option value="WORKER">{t("roles.WORKER")}</option>
          <option value="ADMIN">{t("roles.ADMIN")}</option>
        </SelectField>
        <Field label={t("hireDate")} name="hireDate" type="date" defaultValue={v.hireDate} error={fe.hireDate} />
        <Field
          label={mode === "create" ? t("password") : t("passwordNew")}
          name="password"
          type="password"
          autoComplete="new-password"
          required={mode === "create"}
          minLength={mode === "create" ? 12 : undefined}
          help={mode === "create" ? t("passwordHelp") : t("passwordKeep")}
          error={fe.password}
          className="sm:col-span-2"
        />
      </div>
      {state && !state.ok && !state.fieldErrors ? <ErrorText error={state.error} /> : null}
      {state?.ok && mode === "edit" && saved ? <p role="status" className="text-sm text-[var(--color-ok)]">{t("saved")}</p> : null}
      <div className="flex justify-end">
        <SubmitButton className="btn btn-primary">{mode === "create" ? t("create") : t("save")}</SubmitButton>
      </div>
    </form>
  );
}
