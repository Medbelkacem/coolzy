"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { RangeKey } from "@/lib/time";

const PRESETS: RangeKey[] = ["today", "yesterday", "week", "month", "7d", "30d"];
const LABEL: Record<RangeKey, "today" | "yesterday" | "thisWeek" | "thisMonth" | "last7d" | "last30d"> = {
  today: "today", yesterday: "yesterday", week: "thisWeek", month: "thisMonth", "7d": "last7d", "30d": "last30d",
};

/** Range chips as links (GET) plus a custom from–to form. Extra params are kept. */
export function RangePicker({ basePath, current, from, to, extra = {} }: { basePath: string; current: RangeKey | "custom"; from: string; to: string; extra?: Record<string, string> }) {
  const tc = useTranslations("common");
  const href = (key: string) => {
    const q = new URLSearchParams({ ...extra, range: key });
    return `${basePath}?${q.toString()}`;
  };
  return (
    <div className="flex flex-col gap-3">
      <nav className="range-chips" aria-label={tc("period")}>
        {PRESETS.map((k) => (
          <Link key={k} href={href(k)} className="range-chip" aria-current={current === k ? "true" : undefined}>{tc(LABEL[k])}</Link>
        ))}
      </nav>
      <form method="get" action={basePath} className="flex flex-wrap items-end gap-2">
        {Object.entries(extra).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <input type="hidden" name="range" value="custom" />
        <label className="flex flex-col gap-1 text-sm text-[var(--fg-muted)]">
          {tc("from")}
          <input type="date" name="from" defaultValue={from} className="input" required />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[var(--fg-muted)]">
          {tc("to")}
          <input type="date" name="to" defaultValue={to} className="input" required />
        </label>
        <button type="submit" className={`btn ${current === "custom" ? "btn-primary" : "btn-quiet"}`}>{tc("apply")}</button>
      </form>
    </div>
  );
}
