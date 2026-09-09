"use client";
import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createFirstAdmin } from "./actions";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ErrorText } from "@/components/ui/ErrorText";

export function SetupForm() {
  const t = useTranslations("setup");
  const [state, action] = useActionState(createFirstAdmin, null);
  if (state?.ok) {
    return (
      <div className="surface flex flex-col gap-4 p-6" role="status">
        <p>{t("done")}</p>
        <Link href="/login" className="btn btn-primary">{t("goLogin")}</Link>
      </div>
    );
  }
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form action={action} className="surface flex flex-col gap-4 p-6">
      <Field label={t("token")} name="token" type="password" autoComplete="off" required help={t("tokenHelp")} error={fe.token === "forbidden" ? "badToken" : fe.token} errorNs={fe.token === "forbidden" ? "setup" : undefined} />
      <Field label={t("name")} name="name" required autoComplete="name" error={fe.name} />
      <Field label={t("username")} name="username" required autoComplete="username" pattern="[a-z0-9._-]{3,32}" error={fe.username} />
      <Field label={t("email")} name="email" type="email" autoComplete="email" error={fe.email} />
      <Field label={t("password")} name="password" type="password" required minLength={12} autoComplete="new-password" help={t("passwordHelp")} error={fe.password} />
      {state && !state.ok && !state.fieldErrors ? <ErrorText error={state.error} /> : null}
      <SubmitButton className="btn btn-primary btn-lg mt-2">{t("create")}</SubmitButton>
    </form>
  );
}
