"use client";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { formatDA } from "@/lib/money";
import type { AppLocale } from "@/i18n/config";
import { IconCup, IconPlus, IconCheck } from "@/components/ui/Icons";
import { useCart } from "./cart-store";
import type { MenuProduct } from "./MenuList";

export function ProductRow({ p, currencyLabel }: { p: MenuProduct; currencyLabel: string }) {
  const t = useTranslations("menu");
  const locale = useLocale() as AppLocale;
  const cart = useCart();
  const inCart = cart.qtyOf(p.id);
  const src = p.photoThumbUrl ?? p.photoUrl;
  return (
    <li className="product-row" data-soldout={p.soldOut}>
      <div className="photo">
        {src ? (
          <Image src={src} alt="" width={96} height={96} sizes="96px" placeholder={p.blurDataURL ? "blur" : "empty"} blurDataURL={p.blurDataURL} />
        ) : (
          <div className="photo-empty h-full w-full"><IconCup width={28} height={28} /></div>
        )}
      </div>
      <div className="min-w-0">
        <h3 className="font-display product-name">{p.name}</h3>
        {p.description ? <p className="product-desc truncate-2">{p.description}</p> : null}
        {p.ingredients ? <p className="product-ings">{p.ingredients}</p> : null}
        {p.soldOut ? <p className="soldout-tag">{t("soldOut")}</p> : <p className="product-price tabular">{formatDA(p.price, locale, currencyLabel)}</p>}
      </div>
      <button
        type="button"
        className="add-btn"
        data-in={inCart > 0}
        disabled={p.soldOut}
        aria-label={p.soldOut ? t("soldOut") : inCart > 0 ? t("addAgain", { name: p.name, count: inCart }) : t("add", { name: p.name })}
        onClick={() => cart.add({ productId: p.id, name: p.name, unitPrice: p.price })}
      >
        {inCart > 0 ? <IconCheck /> : <IconPlus />}
      </button>
    </li>
  );
}
