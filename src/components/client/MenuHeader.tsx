"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Wordmark } from "@/components/ui/Wordmark";
import { LanguageSwitch } from "@/components/ui/LanguageSwitch";
import { IconCup, IconHistory } from "@/components/ui/Icons";
import { useCart } from "./cart-store";
import { CountUp } from "./CountUp";
import { useCartSheet } from "./CartSheet";

export function MenuHeader({ open }: { open: boolean }) {
  const t = useTranslations("menu");
  const { count } = useCart();
  const sheet = useCartSheet();
  return (
    <header className="menu-header">
      <Link href="/" aria-label={t("home")} className="flex items-center gap-2">
        <Wordmark size={24} />
        <span className="open-dot" data-open={open} aria-hidden="true" />
      </Link>
      <div className="flex items-center gap-1">
        <LanguageSwitch />
        <Link href="/orders" className="btn btn-quiet btn-icon" aria-label={t("myOrders")}>
          <IconHistory />
        </Link>
        <button type="button" className="btn btn-quiet btn-icon relative" aria-label={t("cartWithCount", { count })} onClick={sheet.open}>
          <IconCup />
          {count > 0 ? <span className="cart-badge" aria-hidden="true"><CountUp value={count} /></span> : null}
        </button>
      </div>
    </header>
  );
}
