"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { deleteReview, setReviewStatus } from "./actions";
import { ErrorText } from "@/components/ui/ErrorText";
import type { ReviewStatus } from "@/generated/prisma/enums";

export function ReviewActions({ id, status }: { id: string; status: ReviewStatus }) {
  const t = useTranslations("adminReviews");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) setError(r.error ?? "generic");
      else router.refresh();
    });
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== "APPROVED" ? <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => run(() => setReviewStatus(id, "APPROVED"))}>{t("approve")}</button> : null}
      {status !== "REJECTED" ? <button type="button" className="btn btn-quiet btn-sm" disabled={pending} onClick={() => run(() => setReviewStatus(id, "REJECTED"))}>{t("reject")}</button> : null}
      <button type="button" className="btn btn-danger btn-sm" disabled={pending} onClick={() => { if (confirm(t("deleteConfirm"))) run(() => deleteReview(id)); }}>{t("delete")}</button>
      <ErrorText error={error} />
    </div>
  );
}
