"use client";
import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { submitReview } from "./actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ErrorText } from "@/components/ui/ErrorText";
import { IconStar } from "@/components/ui/Icons";
import { fmtDate, fmtTime } from "@/lib/time";

export type ExistingReview = { productId: string; rating: number; comment: string; status: "PENDING" | "APPROVED" | "REJECTED"; createdAt: string; editableUntil: string };
type Item = { productId: string; name: string };

export function ReviewsSection({ token, items, existing }: { token: string; items: Item[]; existing: ExistingReview[] }) {
  const t = useTranslations("reviews");
  if (items.length === 0) return null;
  return (
    <section className="surface flex flex-col gap-4 p-5" aria-labelledby="reviews-h">
      <div>
        <h2 id="reviews-h" className="font-display text-xl">{t("title")}</h2>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">{t("body")}</p>
      </div>
      {items.map((it) => (
        <ReviewForm key={it.productId} token={token} item={it} existing={existing.find((r) => r.productId === it.productId) ?? null} />
      ))}
    </section>
  );
}

function ReviewForm({ token, item, existing }: { token: string; item: Item; existing: ExistingReview | null }) {
  const t = useTranslations("reviews");
  const locale = useLocale();
  const [state, action] = useActionState(submitReview, null);
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const closed = existing ? new Date(existing.editableUntil).getTime() < Date.now() : false;
  const statusLabel = existing ? (existing.status === "APPROVED" ? t("published") : existing.status === "REJECTED" ? t("rejected") : t("pending")) : null;

  return (
    <form action={action} className="flex flex-col gap-2 border-t hairline pt-4 first:border-t-0 first:pt-0">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="productId" value={item.productId} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{item.name}</span>
        {statusLabel ? <span className="chip">{statusLabel}</span> : null}
      </div>
      <fieldset className="flex flex-col gap-1" disabled={closed}>
        <legend className="label">{t("rating")}</legend>
        <div className="stars" role="radiogroup" aria-label={t("rating")}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} data-on={n <= rating} title={t("stars", { n })}>
              <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} required aria-label={t("stars", { n })} />
              <IconStar width={26} height={26} />
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-1">
        <span className="label">{t("comment")}</span>
        <textarea name="comment" className="textarea" maxLength={500} rows={2} defaultValue={existing?.comment ?? ""} placeholder={t("commentPlaceholder")} disabled={closed} />
      </label>
      {state && !state.ok ? <ErrorText error={state.error} /> : null}
      {state?.ok ? <p role="status" className="text-sm text-[var(--color-ok)]">{t("saved")}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {existing ? (
          <p className="text-sm text-[var(--fg-muted)]">
            {closed ? t("windowClosed") : t("editUntil", { date: fmtDate(new Date(existing.editableUntil), locale), time: fmtTime(new Date(existing.editableUntil), locale) })}
          </p>
        ) : <span />}
        {!closed ? <SubmitButton className="btn btn-primary btn-sm">{existing ? t("update") : t("submit")}</SubmitButton> : null}
      </div>
    </form>
  );
}
