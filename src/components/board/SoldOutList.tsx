"use client";
import { useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { markSoldOutToday, clearSoldOut } from "@/app/(staff)/board/menu/actions";
import { fmtTime, fmtDate } from "@/lib/time";
import { IconSearch } from "@/components/ui/Icons";

export type SoldOutProduct = { id: string; name: string; available: boolean; soldOutUntil: string | null };
type Group = { id: string; name: string; accent: string; products: SoldOutProduct[] };

export function SoldOutList({ groups }: { groups: Group[] }) {
  const t = useTranslations("worker");
  const tErr = useTranslations("errors");
  const locale = useLocale();
  const [q, setQ] = useState("");
  const [state, setState] = useState<Record<string, string | null>>(() => Object.fromEntries(groups.flatMap((g) => g.products.map((p) => [p.id, p.soldOutUntil]))));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return groups;
    return groups.map((g) => ({ ...g, products: g.products.filter((p) => p.name.toLowerCase().includes(needle)) })).filter((g) => g.products.length > 0);
  }, [groups, q]);

  const toggle = (p: SoldOutProduct) => {
    const wasSoldOut = !!state[p.id];
    setBusy(p.id);
    setError(null);
    start(async () => {
      const res = wasSoldOut ? await clearSoldOut(p.id) : await markSoldOutToday(p.id);
      if (res.ok) {
        setState((s) => ({ ...s, [p.id]: wasSoldOut ? null : (res.data as { until: string } | undefined)?.until ?? null }));
      } else {
        setError(res.error);
      }
      setBusy(null);
    });
  };

  const untilLabel = (iso: string) => {
    const d = new Date(iso);
    const sameDay = fmtDate(d, locale) === fmtDate(new Date(), locale);
    return t("soldOut.until", { time: sameDay ? fmtTime(d, locale) : `${fmtDate(d, locale)} ${fmtTime(d, locale)}` });
  };

  return (
    <div className="flex flex-col gap-4">
      <label className="relative block">
        <span className="sr-only">{t("soldOut.search")}</span>
        <IconSearch className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
        <input className="input" style={{ paddingInlineStart: 40 }} type="search" placeholder={t("soldOut.search")} value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      {error ? <p role="alert" className="field-error">{(tErr as unknown as (k: string) => string)(error)}</p> : null}
      {filtered.map((g) => (
        <section key={g.id} data-accent={g.accent} className="surface overflow-hidden">
          <h2 className="border-b hairline px-4 py-3 font-display text-lg" style={{ boxShadow: "inset 4px 0 0 var(--accent)" }}>{g.name}</h2>
          <ul>
            {g.products.map((p) => {
              const soldOut = state[p.id];
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 border-b hairline px-4 py-3 last:border-b-0">
                  <div className="min-w-0">
                    <p className={`truncate text-base ${!p.available ? "text-[var(--fg-muted)] line-through" : ""}`}>{p.name}</p>
                    {!p.available ? (
                      <p className="text-sm text-[var(--fg-muted)]">{t("soldOut.unavailable")}</p>
                    ) : soldOut ? (
                      <p className="text-sm text-[var(--color-warn)]">{untilLabel(soldOut)}</p>
                    ) : null}
                  </div>
                  {p.available ? (
                    <button type="button" className={`btn btn-sm shrink-0 ${soldOut ? "btn-primary" : "btn-quiet"}`} disabled={busy === p.id} aria-pressed={!!soldOut} onClick={() => toggle(p)}>
                      {soldOut ? t("soldOut.backInStock") : t("soldOut.markSoldOut")}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
