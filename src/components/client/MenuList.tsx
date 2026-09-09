"use client";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ClientCategory, ClientProduct } from "@/lib/menu";
import { formatDA } from "@/lib/money";
import type { AppLocale } from "@/i18n/config";
import { IconSearch, IconPlus, IconCheck } from "@/components/ui/Icons";
import { ProductRow } from "./ProductRow";
import { useCart } from "./cart-store";

export type MenuProduct = ClientProduct & { blurDataURL?: string };
export type MenuCategory = Omit<ClientCategory, "products"> & { products: MenuProduct[] };

export function MenuList({ categories, currencyLabel }: { categories: MenuCategory[]; currencyLabel: string }) {
  const t = useTranslations("menu");
  const locale = useLocale() as AppLocale;
  const cart = useCart();
  const [q, setQ] = useState("");
  const [current, setCurrent] = useState<string>(categories[0]?.id ?? "");
  const [firstLoad, setFirstLoad] = useState(false);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());

  // The one orchestrated moment: only the first visit of the session.
  useEffect(() => {
    try {
      if (!sessionStorage.getItem("coolzy-hero-seen")) {
        setFirstLoad(true);
        sessionStorage.setItem("coolzy-hero-seen", "1");
      }
    } catch {
      /* ignore */
    }
  }, []);

  const hero = useMemo(() => categories.flatMap((c) => c.products.map((p) => ({ p, c }))).find(({ p }) => p.photoUrl && !p.soldOut), [categories]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase();
    if (!needle) return categories;
    return categories
      .map((c) => ({ ...c, products: c.products.filter((p) => `${p.name} ${p.description} ${p.ingredients}`.toLocaleLowerCase().includes(needle)) }))
      .filter((c) => c.products.length > 0);
  }, [categories, q]);

  // Scroll-spy for the rail.
  useEffect(() => {
    if (q) return;
    const els = [...sectionRefs.current.values()];
    if (els.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setCurrent((visible[0].target as HTMLElement).dataset.cat ?? "");
      },
      { rootMargin: "-56px 0px -70% 0px", threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [filtered, q]);

  const jump = (id: string) => {
    setCurrent(id);
    const el = sectionRefs.current.get(id);
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const top = el.getBoundingClientRect().top + window.scrollY - 60;
    window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
  };

  const money = (n: number) => formatDA(n, locale, currencyLabel);
  const heroQty = hero ? cart.qtyOf(hero.p.id) : 0;

  return (
    <>
      {hero ? (
        <section className="hero" data-accent={hero.c.accent} aria-labelledby="hero-name">
          <div className={`photo ${firstLoad ? "hero-resolve" : ""}`}>
            <Image src={hero.p.photoUrl!} alt={hero.p.name} fill sizes="(min-width: 768px) 50vw, 100vw" priority placeholder={hero.p.blurDataURL ? "blur" : "empty"} blurDataURL={hero.p.blurDataURL} style={{ objectFit: "cover" }} />
          </div>
          <div>
            <p className="text-sm" style={{ color: "var(--accent-text-dark)" }}>{hero.c.name}</p>
            <h2 id="hero-name" className="font-display font-display-italic hero-name mt-1">{hero.p.name}</h2>
            {hero.p.description ? <p className="mt-2 text-[var(--fg-muted)] measure">{hero.p.description}</p> : null}
            <div className="mt-4 flex items-center gap-4">
              <span className="hero-price tabular">{money(hero.p.price)}</span>
              <button type="button" className="btn btn-primary" onClick={() => cart.add({ productId: hero.p.id, name: hero.p.name, unitPrice: hero.p.price })} aria-label={heroQty > 0 ? t("addAgain", { name: hero.p.name, count: heroQty }) : t("add", { name: hero.p.name })}>
                {heroQty > 0 ? <IconCheck width={18} height={18} /> : <IconPlus width={18} height={18} />}
                <span>{t("addToCart")}</span>
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <div className="search-wrap relative">
        <label className="relative block">
          <span className="sr-only">{t("search")}</span>
          <IconSearch className="search-icon" width={18} height={18} />
          <input type="search" className="input" placeholder={t("searchPlaceholder")} value={q} onChange={(e) => setQ(e.target.value)} enterKeyHint="search" />
        </label>
      </div>

      <nav className={`rail ${firstLoad ? "rail-settle" : ""}`} aria-label={t("categories")}>
        <div className="rail-track no-scrollbar">
          {categories.map((c) => (
            <button key={c.id} type="button" className="rail-item" data-accent={c.accent} aria-current={current === c.id && !q ? "true" : undefined} onClick={() => jump(c.id)}>
              {c.name}
            </button>
          ))}
        </div>
      </nav>

      {filtered.length === 0 ? (
        <p className="px-4 py-12 text-center text-[var(--fg-muted)]">{t("noResults", { q })}</p>
      ) : (
        filtered.map((c) => (
          <section
            key={c.id}
            id={`cat-${c.slug}`}
            data-cat={c.id}
            data-accent={c.accent}
            ref={(el) => {
              if (el) sectionRefs.current.set(c.id, el);
              else sectionRefs.current.delete(c.id);
            }}
            aria-labelledby={`cat-title-${c.id}`}
          >
            <h2 id={`cat-title-${c.id}`} className="font-display section-title"><span>{c.name}</span></h2>
            {c.products.length === 0 ? (
              <p className="px-4 pb-2 text-sm text-[var(--fg-muted)]">{t("categoryEmpty")}</p>
            ) : (
              <ul className="product-list">
                {c.products.map((p) => (
                  <ProductRow key={p.id} p={p} currencyLabel={currencyLabel} />
                ))}
              </ul>
            )}
          </section>
        ))
      )}
    </>
  );
}
