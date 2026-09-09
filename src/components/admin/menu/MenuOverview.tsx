"use client";
import Link from "next/link";
import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Accent } from "@/generated/prisma/enums";
import type { AppLocale } from "@/i18n/config";
import { formatDA } from "@/lib/money";
import { fmtTime, fmtDate, toAlgiers, nowAlgiers } from "@/lib/time";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorText } from "@/components/ui/ErrorText";
import { IconChevron, IconImage, IconSearch } from "@/components/ui/Icons";
import { clearSoldOut, moveCategory, moveProduct, setSoldOutToday, toggleCategory, toggleProductAvailable } from "@/app/(staff)/admin/menu/actions";
import type { ErrorKey } from "@/lib/action";

export type OverviewProduct = {
  id: string;
  name: string;
  price: number;
  available: boolean;
  soldOut: boolean;
  soldOutUntil: string | null;
  photoThumbUrl: string | null;
  missing: AppLocale[];
};
export type OverviewCategory = {
  id: string;
  slug: string;
  accent: Accent;
  active: boolean;
  name: string;
  missing: AppLocale[];
  products: OverviewProduct[];
};

const localeLabel: Record<AppLocale, string> = { fr: "FR", en: "EN", ar: "AR" };

export function MenuOverview({ categories }: { categories: OverviewCategory[] }) {
  const t = useTranslations("adminMenu");
  const locale = useLocale() as AppLocale;
  const [q, setQ] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<ErrorKey | null>(null);
  const [pending, start] = useTransition();

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return categories;
    return categories
      .map((c) => ({ ...c, products: c.products.filter((p) => p.name.toLowerCase().includes(needle)) }))
      .filter((c) => c.products.length > 0);
  }, [categories, q]);

  const run = (fn: () => Promise<{ ok: boolean; error?: ErrorKey }>) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) setError(r.error ?? "generic");
    });

  const toggleSel = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const soldOutLabel = (iso: string) => {
    const d = new Date(iso);
    const sameDay = toAlgiers(d).getDate() === nowAlgiers().getDate();
    return t("soldOutUntil", { time: sameDay ? fmtTime(d, locale) : `${fmtDate(d, locale, { weekday: "short" })} ${fmtTime(d, locale)}` });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex-1 min-w-[200px]">
          <span className="sr-only">{t("search")}</span>
          <IconSearch className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" width={18} height={18} />
          <input type="search" className="input ps-10" placeholder={t("search")} value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <button type="button" className={`btn ${selecting ? "btn-primary" : "btn-quiet"}`} aria-pressed={selecting} onClick={() => { setSelecting((v) => !v); setSelected(new Set()); }}>
          {selecting ? t("selectDone") : t("selectMode")}
        </button>
      </div>
      <ErrorText error={error} />

      {filtered.length === 0 && q ? (
        <EmptyState compact title={t("searchEmpty", { q })} />
      ) : null}

      {filtered.map((c, ci) => (
        <section key={c.id} data-accent={c.accent} className="surface overflow-hidden" aria-labelledby={`cat-${c.id}`}>
          <header className="flex flex-wrap items-center gap-3 px-3 py-3 sm:px-4">
            <span className="swatch" aria-hidden="true" />
            <h2 id={`cat-${c.id}`} className="font-display text-lg leading-tight">
              <Link href={`/admin/menu/categories/${c.id}`} className="underline-offset-4 hover:underline">{c.name}</Link>
            </h2>
            <span className="text-sm text-[var(--fg-muted)]">{t("productsCount", { count: c.products.length })}</span>
            {c.missing.length > 0 ? (
              <span className="chip text-[var(--color-warn)]"><span className="lang-dot" aria-hidden="true" />{t("notTranslated", { locales: c.missing.map((l) => localeLabel[l]).join(", ") })}</span>
            ) : null}
            <div className="ms-auto flex items-center gap-1">
              {!q ? (
                <>
                  <button type="button" className="btn btn-quiet btn-icon" aria-label={t("moveUp")} disabled={pending || ci === 0} onClick={() => run(() => moveCategory(c.id, "up"))}><IconChevron className="-rotate-90 rtl:rotate-90" /></button>
                  <button type="button" className="btn btn-quiet btn-icon" aria-label={t("moveDown")} disabled={pending || ci === filtered.length - 1} onClick={() => run(() => moveCategory(c.id, "down"))}><IconChevron className="rotate-90 rtl:-rotate-90" /></button>
                </>
              ) : null}
              <label className="switch ms-2 text-sm">
                <input type="checkbox" checked={c.active} disabled={pending} onChange={(e) => run(() => toggleCategory(c.id, e.target.checked))} />
                <span>{c.active ? t("active") : t("inactive")}</span>
              </label>
            </div>
          </header>

          {c.products.length === 0 ? (
            <div className="border-t hairline p-3">
              <EmptyState compact title={t("noProductsTitle")} body={t("noProductsBody")} action={{ href: `/admin/menu/products/new?category=${c.id}`, label: t("addProductHere") }} />
            </div>
          ) : (
            <ul>
              {c.products.map((p, pi) => (
                <li key={p.id} className="product-row" data-sold-out={p.soldOut}>
                  {selecting ? (
                    <label className="thumb cursor-pointer">
                      <input type="checkbox" className="h-5 w-5" checked={selected.has(p.id)} onChange={() => toggleSel(p.id)} aria-label={p.name} />
                    </label>
                  ) : (
                    <span className="thumb">{p.photoThumbUrl ? <Image src={p.photoThumbUrl} alt="" width={56} height={56} sizes="56px" /> : <IconImage />}</span>
                  )}
                  <div className="min-w-0">
                    <Link href={`/admin/menu/products/${p.id}`} className="product-name block truncate font-medium underline-offset-4 hover:underline">{p.name}</Link>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--fg-muted)]">
                      <span className="tabular">{formatDA(p.price, locale)}</span>
                      {!p.available ? <span className="chip text-[var(--color-stop)]">{t("unavailable")}</span> : null}
                      {p.available && p.soldOutUntil && p.soldOut ? <span className="chip text-[var(--color-warn)]">{soldOutLabel(p.soldOutUntil)}</span> : null}
                      {p.missing.length > 0 ? <span className="inline-flex items-center gap-1"><span className="lang-dot" aria-hidden="true" />{t("notTranslated", { locales: p.missing.map((l) => localeLabel[l]).join(", ") })}</span> : null}
                    </div>
                  </div>
                  <div className="product-actions flex items-center gap-1">
                    {!q && !selecting ? (
                      <>
                        <button type="button" className="btn btn-quiet btn-icon hidden sm:inline-flex" aria-label={t("moveUp")} disabled={pending || pi === 0} onClick={() => run(() => moveProduct(p.id, "up"))}><IconChevron className="-rotate-90 rtl:rotate-90" /></button>
                        <button type="button" className="btn btn-quiet btn-icon hidden sm:inline-flex" aria-label={t("moveDown")} disabled={pending || pi === c.products.length - 1} onClick={() => run(() => moveProduct(p.id, "down"))}><IconChevron className="rotate-90 rtl:-rotate-90" /></button>
                      </>
                    ) : null}
                    {!selecting ? (
                      p.soldOut && p.soldOutUntil ? (
                        <button type="button" className="btn btn-quiet btn-sm" disabled={pending} onClick={() => run(() => clearSoldOut([p.id]))}>{t("backInStock")}</button>
                      ) : p.available ? (
                        <button type="button" className="btn btn-quiet btn-sm" disabled={pending} onClick={() => run(() => setSoldOutToday([p.id]))}>{t("soldOutToday")}</button>
                      ) : (
                        <button type="button" className="btn btn-quiet btn-sm" disabled={pending} onClick={() => run(() => toggleProductAvailable(p.id, true))}>{t("available")}</button>
                      )
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {selecting ? (
        <div className="bulk-bar" role="region" aria-live="polite">
          <span className="text-sm">{t("selectedCount", { count: selected.size })}</span>
          <div className="ms-auto flex flex-wrap gap-2">
            <button type="button" className="btn btn-quiet btn-sm" disabled={pending || selected.size === 0} onClick={() => run(() => clearSoldOut([...selected]))}>{t("bulkBackInStock", { count: selected.size })}</button>
            <button type="button" className="btn btn-primary btn-sm" disabled={pending || selected.size === 0} onClick={() => run(() => setSoldOutToday([...selected]))}>{t("bulkSoldOut", { count: selected.size })}</button>
          </div>
        </div>
      ) : null}

      <p className="text-sm text-[var(--fg-muted)]"><strong className="font-medium text-[var(--fg)]">{t("hint")}</strong> {t("hintBody")}</p>
    </div>
  );
}
