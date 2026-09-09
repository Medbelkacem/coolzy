"use client";
import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { OrderFilters as Filters } from "@/lib/admin-queries";

type Opt = { value: string; label: string };
const RANGES = ["today", "yesterday", "week", "month", "7d", "30d", "custom", "all"] as const;

export function OrderFilters({ filters, staff, statuses, types }: { filters: Filters; staff: { id: string; name: string }[]; statuses: Opt[]; types: Opt[] }) {
  const t = useTranslations("adminOrders.filters");
  const [range, setRange] = useState<string>(filters.range);
  return (
    <form method="get" action="/admin/orders" className="surface mb-4 grid grid-cols-2 gap-3 p-4 md:grid-cols-4 lg:grid-cols-6">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--fg-muted)]">{t("period")}</span>
        <select name="range" className="select" value={range} onChange={(e) => setRange(e.target.value)}>
          {RANGES.map((r) => <option key={r} value={r}>{t(`ranges.${r}`)}</option>)}
        </select>
      </label>
      {range === "custom" ? (
        <>
          <label className="flex flex-col gap-1 text-sm"><span className="text-[var(--fg-muted)]">{t("from")}</span><input type="date" name="from" className="input" defaultValue={filters.from} /></label>
          <label className="flex flex-col gap-1 text-sm"><span className="text-[var(--fg-muted)]">{t("to")}</span><input type="date" name="to" className="input" defaultValue={filters.to} /></label>
        </>
      ) : null}
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--fg-muted)]">{t("status")}</span>
        <select name="status" className="select" defaultValue={filters.status ?? ""}>
          <option value="">{t("any")}</option>
          {statuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--fg-muted)]">{t("type")}</span>
        <select name="type" className="select" defaultValue={filters.type ?? ""}>
          <option value="">{t("any")}</option>
          {types.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--fg-muted)]">{t("worker")}</span>
        <select name="worker" className="select" defaultValue={filters.worker ?? ""}>
          <option value="">{t("anyWorker")}</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--fg-muted)]">{t("table")}</span>
        <input type="number" name="table" min={1} max={999} inputMode="numeric" className="input" defaultValue={filters.table ?? ""} />
      </label>
      <label className="col-span-2 flex flex-col gap-1 text-sm">
        <span className="text-[var(--fg-muted)]">{t("search")}</span>
        <input type="search" name="q" className="input" placeholder={t("searchPlaceholder")} defaultValue={filters.q ?? ""} />
      </label>
      <div className="col-span-2 flex items-end gap-2 md:col-span-4 lg:col-span-6">
        <button type="submit" className="btn btn-primary">{t("apply")}</button>
        <Link href="/admin/orders" className="btn btn-quiet">{t("reset")}</Link>
      </div>
    </form>
  );
}
