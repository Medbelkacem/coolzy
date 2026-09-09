"use client";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { requestOtp, claimPhone } from "./actions";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ErrorText } from "@/components/ui/ErrorText";

/** Phone + one-time code. No password, ever. */
export function ClaimPhone({ claimedPhone }: { claimedPhone: string | null }) {
  const t = useTranslations("history");
  const [reopen, setReopen] = useState(false);
  const [sent, sendAction] = useActionState(requestOtp, null);
  const [claimed, claimAction] = useActionState(claimPhone, null);

  if (claimedPhone && !reopen && !claimed?.ok) {
    return (
      <section className="surface flex flex-col gap-2 p-5">
        <p className="text-sm text-[var(--fg-muted)]">{t("claimedAs", { phone: claimedPhone })}</p>
        <button type="button" className="btn btn-quiet btn-sm self-start" onClick={() => setReopen(true)}>{t("changePhone")}</button>
      </section>
    );
  }
  if (claimed?.ok) {
    return (
      <section className="surface p-5" role="status">
        <p>{t("claimed")}</p>
      </section>
    );
  }
  const phone = sent?.ok ? sent.data.phone : null;
  return (
    <section className="surface flex flex-col gap-4 p-5" aria-labelledby="claim-h">
      <div>
        <h2 id="claim-h" className="font-display text-xl">{t("claimTitle")}</h2>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">{t("claimBody")}</p>
      </div>
      {!phone ? (
        <form action={sendAction} className="flex flex-col gap-3">
          <Field label={t("phone")} name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder={t("phonePlaceholder")} dir="ltr" required error={sent && !sent.ok ? sent.fieldErrors?.phone : undefined} />
          {sent && !sent.ok && !sent.fieldErrors ? <ErrorText error={sent.error} /> : null}
          <SubmitButton className="btn btn-primary self-start" pendingLabel={t("sending")}>{t("sendCode")}</SubmitButton>
        </form>
      ) : (
        <form action={claimAction} className="flex flex-col gap-3">
          <p role="status" className="text-sm">{t("codeSent", { phone })}</p>
          <input type="hidden" name="phone" value={phone} />
          <Field label={t("code")} name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} dir="ltr" required error={claimed && !claimed.ok ? claimed.fieldErrors?.code : undefined} />
          {claimed && !claimed.ok && !claimed.fieldErrors ? <ErrorText error={claimed.error} /> : null}
          <SubmitButton className="btn btn-primary self-start" pendingLabel={t("verifying")}>{t("verify")}</SubmitButton>
        </form>
      )}
    </section>
  );
}
