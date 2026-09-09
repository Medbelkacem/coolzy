import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/authz";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconStar } from "@/components/ui/Icons";
import { fmtDate } from "@/lib/time";
import { formatPhone } from "@/lib/customer";
import { displayNumber } from "@/lib/orders";
import { countReviews, listReviews } from "@/lib/admin-queries";
import { ReviewStatus } from "@/generated/prisma/enums";
import type { AppLocale } from "@/i18n/config";
import { ReviewActions } from "./ReviewActions";
import "@/styles/admin.css";

export const dynamic = "force-dynamic";
const TABS: ReviewStatus[] = ["PENDING", "APPROVED", "REJECTED"];

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requirePermission("reviews.moderate");
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("adminReviews");
  const sp = await searchParams;
  const tab: ReviewStatus = TABS.includes(sp.tab as ReviewStatus) ? (sp.tab as ReviewStatus) : "PENDING";
  const [reviews, counts] = await Promise.all([listReviews(tab, locale), countReviews()]);

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <nav className="mb-4 flex gap-1 overflow-x-auto no-scrollbar" aria-label={t("title")}>
        {TABS.map((s) => (
          <Link key={s} href={`/admin/reviews?tab=${s}`} aria-current={s === tab ? "page" : undefined} className={`min-h-[44px] whitespace-nowrap rounded-[var(--radius-pill)] px-4 leading-[44px] text-sm xfade ${s === tab ? "bg-[var(--fg)] text-[var(--bg)]" : "text-[var(--fg-muted)] hover:text-[var(--fg)]"}`}>
            {t(`tabs.${s}`)} <span className="tabular">({counts[s]})</span>
          </Link>
        ))}
      </nav>
      {reviews.length === 0 ? (
        <EmptyState title={t(`empty.${tab}`)} body={t("emptyBody")} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {reviews.map((r) => (
            <li key={r.id} className="surface flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-lg leading-tight">{r.productName}</p>
                  <p className="text-sm text-[var(--fg-muted)]">
                    <span>{r.customerName ?? (r.phone ? formatPhone(r.phone) : t("anonymous"))}</span>
                    <span className="mx-2">{t("order", { number: displayNumber(r.orderNumber) })}</span>
                    <span className="tabular">{fmtDate(r.createdAt, locale)}</span>
                  </p>
                </div>
                <span className="review-stars shrink-0" role="img" aria-label={t("rating", { rating: r.rating })}>
                  {[1, 2, 3, 4, 5].map((n) => <IconStar key={n} width={16} height={16} data-empty={n > r.rating} fill={n <= r.rating ? "currentColor" : "none"} />)}
                </span>
              </div>
              <p className={r.comment ? "" : "text-[var(--fg-muted)]"}>{r.comment || t("noComment")}</p>
              <ReviewActions id={r.id} status={r.status} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
