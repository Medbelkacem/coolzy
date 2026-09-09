"use client";
import { useLocale, useTranslations } from "next-intl";
import { formatDA } from "@/lib/money";
import type { AppLocale } from "@/i18n/config";
import { useCart } from "./cart-store";
import { useCartSheet } from "./CartSheet";
import { CountUp } from "./CountUp";

export function CartBar({ currencyLabel }: { currencyLabel: string }) {
  const t = useTranslations("cart");
  const locale = useLocale() as AppLocale;
  const { count, subtotal, state } = useCart();
  const sheet = useCartSheet();
  if (!state.hydrated || count === 0) return null;
  return (
    <button type="button" className="cart-bar" onClick={sheet.open} aria-label={t("openCart")}>
      <span>
        <CountUp value={count} /> {t("itemsWord", { count })}
      </span>
      <span className="tabular">{formatDA(subtotal, locale, currencyLabel)}</span>
    </button>
  );
}
