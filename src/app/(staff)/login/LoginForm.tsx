"use client";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { loginAction } from "./actions";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function LoginForm({ next, expired }: { next: string; expired: boolean }) {
  const t = useTranslations("auth");
  const [state, action] = useActionState(loginAction, null);
  return (
    <form action={action} className="surface flex flex-col gap-4 p-6">
      <input type="hidden" name="next" value={next} />
      {expired ? <p className="text-sm text-[var(--color-warn)]" role="status">{t("sessionEnded")}</p> : null}
      <Field label={t("login")} name="login" required autoComplete="username" autoCapitalize="none" spellCheck={false} />
      <Field label={t("password")} name="password" type="password" required autoComplete="current-password" />
      {state?.error ? <p role="alert" className="field-error">{t("invalid")}</p> : null}
      <SubmitButton className="btn btn-primary btn-lg mt-2" pendingLabel={t("signingIn")}>{t("signIn")}</SubmitButton>
    </form>
  );
}
