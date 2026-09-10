"use client";
import { useCallback, useEffect } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { formatDA } from "@/lib/money";
import type { AppLocale } from "@/i18n/config";
import { IconMinus, IconPlus, IconX } from "@/components/ui/Icons";
import { useCart } from "./cart-store";
import { useCartSheet } from "./CartSheet";

const QUICK = ["noSugar", "lessIce", "extraShot", "noIce"] as const;

export function CartSheet({ currencyLabel, minimumRule }: { currencyLabel: string; minimumRule: string }) {
  const t = useTranslations("cart");
  const locale = useLocale() as AppLocale;
  const cart = useCart();
  const { close } = useCartSheet();
  const money = (n: number) => formatDA(n, locale, currencyLabel);

  // Refresh prices/availability from the server when the sheet opens.
  const sync = cart.sync;
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/menu", { cache: "no-store" });
      if (!res.ok) return;
      const cats = (await res.json()) as { products: { id: string; name: string; price: number; soldOut: boolean }[] }[];
      sync(cats.flatMap((c) => c.products));
    } catch {
      /* offline: keep local copy */
    }
  }, [sync]);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [close]);

  const hasSoldOut = cart.state.items.some((i) => i.soldOut);

  return (
    <>
      <button type="button" className="sheet-backdrop" aria-label={t("close")} onClick={close} />
      <div className="sheet sheet-up" role="dialog" aria-modal="true" aria-labelledby="cart-title">
        <div className="sheet-head">
          <h2 id="cart-title" className="font-display text-xl">{t("title")}</h2>
          <button type="button" className="btn btn-quiet btn-icon" aria-label={t("close")} onClick={close}><IconX /></button>
        </div>
        <div className="sheet-body">
          {cart.state.items.length === 0 ? (
            <p className="py-10 text-center text-[var(--fg-muted)]">{t("empty")}</p>
          ) : (
            <ul className="m-0 list-none p-0">
              {cart.state.items.map((item) => (
                <li key={item.productId} className="cart-line">
                  <div className="min-w-0">
                    <p className="font-display text-lg leading-tight">{item.name}</p>
                    <p className="text-sm text-[var(--fg-muted)] tabular">{money(item.unitPrice)}</p>
                    {item.soldOut ? <p className="soldout-tag">{t("soldOut")}</p> : null}
                    <label className="mt-2 block">
                      <span className="sr-only">{t("itemNote")}</span>
                      <input
                        className="input"
                        style={{ minHeight: 40 }}
                        maxLength={140}
                        placeholder={t("itemNotePlaceholder")}
                        value={item.note}
                        onChange={(e) => cart.setNote(item.productId, e.target.value)}
                      />
                    </label>
                    <div className="note-chips">
                      {QUICK.map((k) => {
                        const label = t(`quick.${k}`);
                        const on = item.note.split(",").map((s) => s.trim()).includes(label);
                        return (
                          <button
                            key={k}
                            type="button"
                            className="note-chip"
                            aria-pressed={on}
                            onClick={() => {
                              const parts = item.note.split(",").map((s) => s.trim()).filter(Boolean);
                              const next = on ? parts.filter((p) => p !== label) : [...parts, label];
                              cart.setNote(item.productId, next.join(", "));
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="qty" role="group" aria-label={t("quantity")}>
                      <button type="button" aria-label={t("decrease")} onClick={() => cart.setQty(item.productId, item.qty - 1)}><IconMinus width={16} height={16} /></button>
                      <span className="tabular" aria-live="polite">{item.qty}</span>
                      <button type="button" aria-label={t("increase")} onClick={() => cart.setQty(item.productId, item.qty + 1)}><IconPlus width={16} height={16} /></button>
                    </div>
                    <p className="tabular text-sm">{money(item.unitPrice * item.qty)}</p>
                    <button type="button" className="text-xs text-[var(--fg-muted)] underline underline-offset-4" onClick={() => cart.remove(item.productId)}>{t("remove")}</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {cart.state.items.length > 0 ? (
            <label className="mt-4 block">
              <span className="label">{t("orderNote")}</span>
              <textarea className="textarea" maxLength={300} value={cart.state.note} onChange={(e) => cart.setOrderNote(e.target.value)} placeholder={t("orderNotePlaceholder")} />
            </label>
          ) : null}
          <p className="rule mt-4">{minimumRule}</p>
        </div>
        <div className="sheet-foot safe-bottom">
          <div className="total-row">
            <span className="text-[var(--fg-muted)]">{t("subtotal")}</span>
            <strong className="tabular">{money(cart.subtotal)}</strong>
          </div>
          {hasSoldOut ? <p className="field-error">{t("removeSoldOut")}</p> : null}
          <Link
            href="/checkout"
            className="btn btn-primary btn-lg"
            aria-disabled={cart.state.items.length === 0 || hasSoldOut}
            onClick={(e) => {
              if (cart.state.items.length === 0 || hasSoldOut) e.preventDefault();
              else close();
            }}
          >
            {t("checkout")}
          </Link>
        </div>
      </div>
    </>
  );
}
