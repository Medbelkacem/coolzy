import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/admin/PageHeader";
import { Stat } from "@/components/admin/Stat";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusChip } from "@/components/ui/StatusChip";
import { IconCheck } from "@/components/ui/Icons";
import { formatDA } from "@/lib/money";
import { fmtDate, fmtTime } from "@/lib/time";
import { displayNumber } from "@/lib/orders";
import { getLatestOrders, getSetupState, getTodayStats, getTopProductsToday } from "@/lib/admin-queries";
import type { AppLocale } from "@/i18n/config";
import "@/styles/admin.css";
import { OrderNumber } from "@/components/ui/OrderNumber";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("admin.overview");
  const [stats, latest, top, setup] = await Promise.all([getTodayStats(), getLatestOrders(8), getTopProductsToday(5, locale), getSetupState()]);
  const period = t("periodToday", { date: fmtDate(new Date(), locale, { weekday: "long", day: "numeric", month: "long" }) });

  return (
    <>
      <PageHeader title={t("title")} subtitle={period} actions={<Link href="/board" className="btn btn-quiet">{t("boardLink")}</Link>} />

      {!setup.complete ? (
        <section className="surface mb-6 p-5" aria-labelledby="setup-title">
          <h2 id="setup-title" className="font-display text-lg">{t("setupTitle")}</h2>
          <p className="mt-1 text-[var(--fg-muted)]">{t("setupBody")}</p>
          <ol className="mt-4 flex flex-col gap-3">
            <SetupStep done={setup.settingsDone} label={t("step1")} href="/admin/settings" cta={t("goSettings")} doneLabel={t("stepDone")} />
            <SetupStep done={setup.products > 0} label={t("step2")} href="/admin/menu" cta={t("goMenu")} doneLabel={t("stepDone")} />
            <SetupStep done={setup.workers > 0} label={t("step3")} href="/admin/staff" cta={t("goStaff")} doneLabel={t("stepDone")} />
          </ol>
        </section>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t("sales")} value={formatDA(stats.sales, locale)} hint={t("salesHint")} />
        <Stat label={t("orders")} value={stats.count} hint={period} />
        <Stat label={t("avg")} value={stats.avg === null ? t("noAvg") : formatDA(stats.avg, locale)} hint={t("avgHint")} />
        <Stat label={t("open")} value={stats.open} hint={t("openHint")} tone={stats.open > 0 ? "warn" : "neutral"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section aria-labelledby="recent-title">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="recent-title" className="font-display text-lg">{t("recent")}</h2>
            <Link href="/admin/orders" className="text-sm underline-offset-4 hover:underline">{t("viewAll")}</Link>
          </div>
          {latest.length === 0 ? (
            <EmptyState compact title={t("emptyTitle")} body={t("emptyBody")} />
          ) : (
            <ul className="surface divide-y divide-[var(--hairline)]">
              {latest.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex min-h-[56px] items-center gap-3 px-4 py-3 hover:bg-[color-mix(in_srgb,var(--fg)_3%,transparent)]">
                    <OrderNumber n={o.number} className="w-16 shrink-0 font-medium" />
                    <span className="tabular w-12 shrink-0 text-sm text-[var(--fg-muted)]">{fmtTime(o.createdAt, locale)}</span>
                    <span className="min-w-0 flex-1 truncate text-sm">{o.items.map((i) => `${i.qty}× ${i.nameSnapshot}`).join(", ")}</span>
                    <span className="tabular shrink-0 font-medium">{formatDA(o.total, locale)}</span>
                    <StatusChip status={o.status} className="shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="top-title">
          <h2 id="top-title" className="mb-3 font-display text-lg">{t("topToday")}</h2>
          {top.length === 0 ? (
            <EmptyState compact title={t("emptyTitle")} />
          ) : (
            <ol className="surface divide-y divide-[var(--hairline)]">
              {top.map((p, i) => (
                <li key={`${p.productId ?? p.name}-${i}`} className="flex items-center gap-3 px-4 py-3">
                  <span className="tabular w-5 text-sm text-[var(--fg-muted)]">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  <span className="tabular text-sm text-[var(--fg-muted)]">{t("qtySold", { qty: p.qty })}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}

function SetupStep({ done, label, href, cta, doneLabel }: { done: boolean; label: string; href: string; cta: string; doneLabel: string }) {
  return (
    <li className="flex flex-wrap items-center gap-3">
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${done ? "bg-[var(--color-ok)] text-white" : "border hairline text-[var(--fg-muted)]"}`} aria-hidden="true">
        {done ? <IconCheck width={16} height={16} /> : null}
      </span>
      <span className={`flex-1 ${done ? "text-[var(--fg-muted)] line-through" : ""}`}>{label}</span>
      {done ? <span className="text-sm text-[var(--color-ok)]">{doneLabel}</span> : <Link href={href} className="btn btn-quiet btn-sm">{cta}</Link>}
    </li>
  );
}
