import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/authz";
import { formatDA } from "@/lib/money";
import { fmtDate } from "@/lib/time";
import { toDateInput } from "@/lib/date-input";
import { resolveRange, getTotals, getRevenueSeries, getTopProducts, getRevenueByCategory, getSalariesByWorker, getHeatmap, type Bucket } from "@/lib/stats";
import { PageHeader } from "@/components/admin/PageHeader";
import { Stat } from "@/components/admin/Stat";
import { RangePicker } from "@/components/admin/RangePicker";
import { EmptyState } from "@/components/ui/EmptyState";
import { RevenueBars } from "./charts";
import type { AppLocale } from "@/i18n/config";
import "@/styles/admin-money.css";

const HOURS = Array.from({ length: 17 }, (_, i) => i + 7); // 7 → 23
const DAY_ORDER = [6, 0, 1, 2, 3, 4, 5]; // Saturday first: the Algerian week

function delta(cur: number, prev: number): string | null {
  if (prev === 0) return null;
  const pct = Math.round(((cur - prev) / prev) * 100);
  return `${pct > 0 ? "+" : ""}${pct} %`;
}
function tone(cur: number, prev: number, invert = false): "ok" | "stop" | "neutral" {
  if (prev === 0 || cur === prev) return "neutral";
  const up = cur > prev;
  return up !== invert ? "ok" : "stop";
}

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string; bucket?: string }> }) {
  await requirePermission("finance.read");
  const sp = await searchParams;
  const t = await getTranslations("stats");
  const locale = (await getLocale()) as AppLocale;
  const r = resolveRange(sp);
  const bucket: Bucket = sp.bucket === "week" || sp.bucket === "month" ? sp.bucket : "day";

  const [cur, prev, series, top, byCat, salaries, heat] = await Promise.all([
    getTotals(r.from, r.to),
    getTotals(r.prevFrom, r.prevTo),
    getRevenueSeries(r.from, r.to, bucket),
    getTopProducts(r.from, r.to, 10),
    getRevenueByCategory(r.from, r.to, locale),
    getSalariesByWorker(r.from, r.to),
    getHeatmap(r.from, r.to),
  ]);

  const period = t("period", { from: fmtDate(r.from, locale), to: fmtDate(r.to, locale) });
  const previous = t("previous", { from: fmtDate(r.prevFrom, locale), to: fmtDate(r.prevTo, locale) });
  const hint = (c: number, p: number) => {
    const d = delta(c, p);
    return d ? t("vsPrevious", { delta: d }) : t("noPrevious");
  };
  const fmtBucket = (iso: string) => {
    const d = new Date(`${iso}T12:00:00`);
    if (bucket === "month") return fmtDate(d, locale, { month: "short", year: "2-digit" });
    return fmtDate(d, locale, { day: "numeric", month: "short" });
  };
  const empty = cur.orders === 0 && cur.cancelled === 0;
  const bucketHref = (b: Bucket) => {
    const q = new URLSearchParams({ range: r.key, ...(r.key === "custom" ? { from: toDateInput(r.from), to: toDateInput(r.to) } : {}), ...(b !== "day" ? { bucket: b } : {}) });
    return `/admin/stats?${q}`;
  };

  // Heatmap
  const counts = new Map<string, number>();
  let peak = { day: -1, hour: -1, count: 0 };
  for (const c of heat) {
    counts.set(`${c.day}-${c.hour}`, c.count);
    if (c.count > peak.count) peak = c;
  }
  const splitTotal = cur.tableOrders + cur.deliveryOrders;

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <div className="mb-5">
        <RangePicker basePath="/admin/stats" current={r.key} from={toDateInput(r.from)} to={toDateInput(r.to)} extra={bucket !== "day" ? { bucket } : {}} />
      </div>
      <p className="mb-4 text-sm text-[var(--fg-muted)]">{period}. {previous}.</p>

      {empty ? (
        <EmptyState title={t("emptyTitle")} body={t("emptyBody")} />
      ) : (
        <div className="flex flex-col gap-8">
          {/* 1. Totals */}
          <section aria-label={t("totals.sales")} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label={t("totals.sales")} value={formatDA(cur.sales, locale)} hint={hint(cur.sales, prev.sales)} tone={tone(cur.sales, prev.sales)} />
            <Stat label={t("totals.expenses")} value={formatDA(cur.expenses, locale)} hint={hint(cur.expenses, prev.expenses)} tone={tone(cur.expenses, prev.expenses, true)} />
            <Stat label={t("totals.profit")} value={formatDA(cur.profit, locale)} hint={hint(cur.profit, prev.profit)} tone={cur.profit < 0 ? "stop" : tone(cur.profit, prev.profit)} />
            <Stat
              label={t("totals.margin")}
              value={cur.margin === null ? "—" : formatDA(cur.margin, locale)}
              hint={cur.margin === null ? t("totals.marginNone") : cur.itemsWithoutCost > 0 ? t("totals.marginPartial", { count: cur.itemsWithoutCost }) : hint(cur.margin, prev.margin ?? 0)}
              tone={cur.margin !== null && cur.itemsWithoutCost === 0 ? tone(cur.margin, prev.margin ?? 0) : "neutral"}
            />
          </section>

          {/* 3. Orders & average (kept next to totals — they read together) */}
          <section className="grid gap-3 sm:grid-cols-2">
            <Stat label={t("totals.orders")} value={cur.orders} hint={hint(cur.orders, prev.orders)} tone={tone(cur.orders, prev.orders)} />
            <Stat label={t("totals.avg")} value={formatDA(cur.avg, locale)} hint={hint(cur.avg, prev.avg)} tone={tone(cur.avg, prev.avg)} />
          </section>

          {/* 2. Revenue series */}
          <section className="surface p-4" aria-labelledby="rev-h">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 id="rev-h" className="font-display text-xl">{t("revenue.title")}</h2>
                <p className="text-sm text-[var(--fg-muted)]">{period}</p>
              </div>
              <nav className="range-chips" aria-label={t("revenue.title")}>
                {(["day", "week", "month"] as Bucket[]).map((b) => (
                  <Link key={b} href={bucketHref(b)} className="range-chip" aria-current={bucket === b ? "true" : undefined}>{t(`revenue.${b}`)}</Link>
                ))}
              </nav>
            </div>
            {series.length === 0 ? (
              <p className="py-8 text-center text-[var(--fg-muted)]">{t("revenue.empty")}</p>
            ) : (
              <RevenueBars data={series.map((s) => ({ label: fmtBucket(s.bucket), sales: s.sales, orders: s.orders }))} />
            )}
          </section>

          {/* 4. Products & categories */}
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="surface p-4">
              <h2 className="font-display text-xl">{t("products.title")}</h2>
              <p className="mb-3 text-sm text-[var(--fg-muted)]">{period}</p>
              {top.length === 0 ? (
                <p className="text-[var(--fg-muted)]">{t("products.empty")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="money-table">
                    <thead><tr><th>{t("products.product")}</th><th className="num">{t("products.qty")}</th><th className="num">{t("products.revenue")}</th></tr></thead>
                    <tbody>
                      {top.map((p, i) => (
                        <tr key={`${p.productId ?? p.name}-${i}`}>
                          <td>{p.name}{p.productId ? null : <span className="ms-2 text-xs text-[var(--fg-muted)]">{t("products.deleted")}</span>}</td>
                          <td className="num">{p.qty}</td>
                          <td className="num">{formatDA(p.revenue, locale)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="surface p-4">
              <h2 className="font-display text-xl">{t("categories.title")}</h2>
              <p className="mb-3 text-sm text-[var(--fg-muted)]">{period}</p>
              {byCat.length === 0 ? (
                <p className="text-[var(--fg-muted)]">{t("categories.empty")}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {byCat.map((c) => {
                    const max = byCat[0].revenue || 1;
                    return (
                      <li key={c.categoryId ?? "none"} className="cat-bar" data-accent={c.accent ?? undefined} style={c.accent ? undefined : { ["--accent" as string]: "var(--color-stone)" }}>
                        <span className="truncate">{c.name ?? t("categories.uncategorized")}</span>
                        <span className="track"><span className="fill" style={{ width: `${Math.max(2, Math.round((c.revenue / max) * 100))}%` }} /></span>
                        <span className="tabular">{formatDA(c.revenue, locale)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* 5. Table vs delivery */}
          <section className="surface p-4" aria-labelledby="split-h">
            <h2 id="split-h" className="font-display text-xl">{t("split.title")}</h2>
            <p className="mb-3 text-sm text-[var(--fg-muted)]">{period}</p>
            <div className="split-bar mb-3" role="img" aria-label={`${t("split.table")} ${t("split.ordersCount", { count: cur.tableOrders })}, ${t("split.delivery")} ${t("split.ordersCount", { count: cur.deliveryOrders })}`}>
              <span style={{ width: `${splitTotal ? (cur.tableOrders / splitTotal) * 100 : 0}%`, background: "var(--color-bean)" }} />
              <span style={{ width: `${splitTotal ? (cur.deliveryOrders / splitTotal) * 100 : 0}%`, background: "var(--color-curacao)" }} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label={t("split.table")} value={cur.tableOrders} hint={t("split.ordersCount", { count: cur.tableOrders })} />
              <Stat label={t("split.delivery")} value={cur.deliveryOrders} hint={t("split.ordersCount", { count: cur.deliveryOrders })} />
              <Stat label={t("split.deliveryRevenue")} value={formatDA(cur.deliveryRevenue, locale)} hint={hint(cur.deliveryRevenue, prev.deliveryRevenue)} tone={tone(cur.deliveryRevenue, prev.deliveryRevenue)} />
              <Stat label={t("split.deliveryFees")} value={formatDA(cur.deliveryFees, locale)} hint={hint(cur.deliveryFees, prev.deliveryFees)} tone={tone(cur.deliveryFees, prev.deliveryFees)} />
            </div>
          </section>

          {/* 6. Staff expenses */}
          <section className="surface p-4" aria-labelledby="sal-h">
            <h2 id="sal-h" className="font-display text-xl">{t("salaries.title")}</h2>
            <p className="mb-3 text-sm text-[var(--fg-muted)]">{t("salaries.subtitle")} {period}</p>
            {salaries.length === 0 ? (
              <p className="text-[var(--fg-muted)]">{t("salaries.empty")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="money-table">
                  <tbody>
                    {salaries.map((s) => (
                      <tr key={s.userId}>
                        <td><Link href={`/admin/staff/${s.userId}`} className="row-link">{s.name}</Link> <span className="text-[var(--fg-muted)]">{t("salaries.payments", { count: s.payments })}</span></td>
                        <td className="num">{formatDA(s.amount, locale)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr><td className="font-medium">{t("salaries.total")}</td><td className="num font-medium">{formatDA(salaries.reduce((a, s) => a + s.amount, 0), locale)}</td></tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>

          {/* 7. Busiest hours */}
          <section className="surface p-4" aria-labelledby="heat-h">
            <h2 id="heat-h" className="font-display text-xl">{t("heatmap.title")}</h2>
            <p className="mb-3 text-sm text-[var(--fg-muted)]">{t("heatmap.subtitle")} {period}</p>
            {peak.count === 0 ? (
              <p className="text-[var(--fg-muted)]">{t("heatmap.empty")}</p>
            ) : (
              <>
                <p className="mb-3 text-sm">{t("heatmap.peak", { day: t(`days.${peak.day as 0}`), hour: peak.hour, count: peak.count })}</p>
                <div className="overflow-x-auto">
                  <div className="heat" role="table" aria-label={t("heatmap.title")}>
                    <span />
                    {HOURS.map((h) => <span key={h} className="h-label">{h}</span>)}
                    {DAY_ORDER.map((d) => (
                      <HeatRow key={d} day={d} label={t(`days.${d as 0}`)} counts={counts} max={peak.count} peakKey={`${peak.day}-${peak.hour}`} cellLabel={(hour, count) => t("heatmap.cell", { day: t(`days.${d as 0}`), hour, count })} />
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>

          <p className="text-sm text-[var(--fg-muted)]">{t("cancelledNote", { count: cur.cancelled })} {t("footnote")}</p>
        </div>
      )}
    </>
  );
}

function HeatRow({ day, label, counts, max, peakKey, cellLabel }: { day: number; label: string; counts: Map<string, number>; max: number; peakKey: string; cellLabel: (hour: number, count: number) => string }) {
  return (
    <>
      <span className="d-label">{label}</span>
      {HOURS.map((h) => {
        const key = `${day}-${h}`;
        const c = counts.get(key) ?? 0;
        return (
          <span
            key={h}
            className={`cell ${key === peakKey ? "peak" : ""}`}
            style={{ ["--heat" as string]: max ? (c / max).toFixed(2) : "0" }}
            data-count={c}
            role="cell"
            aria-label={cellLabel(h, c)}
            title={cellLabel(h, c)}
          />
        );
      })}
    </>
  );
}
