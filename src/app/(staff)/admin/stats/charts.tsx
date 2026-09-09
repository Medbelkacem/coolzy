"use client";
import { useLocale, useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDA } from "@/lib/money";
import type { AppLocale } from "@/i18n/config";

function shortDA(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 10_000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

export type RevenuePoint = { label: string; sales: number; orders: number };

/** One accent, no gridline noise, direct tooltip. Mirrors in RTL. */
export function RevenueBars({ data }: { data: RevenuePoint[] }) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("stats");
  const rtl = locale === "ar";
  return (
    <div className="h-64 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} strokeDasharray="2 6" stroke="rgba(14,12,11,.12)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} reversed={rtl} tick={{ fontSize: 12, fill: "#8A7F76" }} interval="preserveStartEnd" />
          <YAxis tickLine={false} axisLine={false} width={44} orientation={rtl ? "right" : "left"} tick={{ fontSize: 12, fill: "#8A7F76" }} tickFormatter={shortDA} />
          <Tooltip
            cursor={{ fill: "rgba(14,12,11,.05)" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as RevenuePoint;
              return (
                <div className="chart-tip" dir={rtl ? "rtl" : "ltr"}>
                  <div className="text-[var(--fg-muted)]">{label}</div>
                  <div className="font-medium tabular">{formatDA(p.sales, locale)}</div>
                  <div className="text-[var(--fg-muted)]">{t("split.ordersCount", { count: p.orders })}</div>
                </div>
              );
            }}
          />
          <Bar dataKey="sales" fill="#8B5E3C" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
