"use client";
import { useLocale, useTranslations } from "next-intl";
import type { OrderDTO } from "@/lib/orders";
import { formatDA } from "@/lib/money";
import { fmtDate, fmtTime } from "@/lib/time";
import { formatPhone } from "@/lib/phone";
import type { AppLocale } from "@/i18n/config";

export type ShopInfo = { name: string; phone: string; address: string; currencyLabel: string };

/**
 * The receipt itself — items, totals, where it goes, notes, shop. Pure:
 * used on the dark tracking page and on the paper print view.
 */
export function ReceiptBody({ order, shop, variant }: { order: OrderDTO; shop: ShopInfo; variant: "screen" | "print" }) {
  const t = useTranslations("receipt");
  const locale = useLocale() as AppLocale;
  const money = (n: number) => formatDA(n, locale, shop.currencyLabel || undefined);
  const created = new Date(order.createdAt);
  const rule = variant === "print" ? <hr /> : <hr className="receipt-rule" />;

  return (
    <div className={variant === "print" ? "thermal" : "flex flex-col gap-4"}>
      {variant === "print" ? (
        <>
          <h1>{shop.name}</h1>
          {shop.address ? <p>{shop.address}</p> : null}
          {shop.phone ? <p><span dir="ltr">{formatPhone(shop.phone)}</span></p> : null}
          <hr />
          <p><strong>{t("order", { n: order.display })}</strong></p>
          <p>{t("placedAt", { date: fmtDate(created, locale), time: fmtTime(created, locale) })}</p>
          <p>{order.type === "TABLE" ? t("table", { n: order.tableNumber ?? "" }) : t("delivery")}</p>
          <hr />
        </>
      ) : null}

      <table className={variant === "print" ? "" : "w-full"}>
        <tbody>
          {order.items.map((it) => (
            <tr key={it.id} className={variant === "print" ? "" : "align-top"}>
              <td className={variant === "print" ? "" : "py-1.5 pe-3"}>
                <span className={variant === "print" ? "" : "block"}>{it.name}</span>
                <span className={`block ${variant === "print" ? "" : "text-sm text-[var(--fg-muted)]"} tabular`}>{t("qtyPrice", { qty: it.qty, price: money(it.unitPrice) })}</span>
                {it.note ? <span className={`block ${variant === "print" ? "" : "text-sm text-[var(--fg-muted)]"}`}>{t("itemNote")}: {it.note}</span> : null}
              </td>
              <td className={`num ${variant === "print" ? "" : "py-1.5 text-end tabular whitespace-nowrap"}`}>{money(it.unitPrice * it.qty)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {rule}

      <table className={variant === "print" ? "" : "w-full"}>
        <tbody>
          {order.deliveryFee > 0 ? (
            <>
              <tr><td className={variant === "print" ? "" : "py-0.5 text-[var(--fg-muted)]"}>{t("subtotal")}</td><td className={`num ${variant === "print" ? "" : "text-end tabular"}`}>{money(order.subtotal)}</td></tr>
              <tr><td className={variant === "print" ? "" : "py-0.5 text-[var(--fg-muted)]"}>{t("deliveryFee")}</td><td className={`num ${variant === "print" ? "" : "text-end tabular"}`}>{money(order.deliveryFee)}</td></tr>
            </>
          ) : null}
          <tr>
            <td className={variant === "print" ? "" : "pt-1 text-lg"}><strong>{t("total")}</strong></td>
            <td className={`num ${variant === "print" ? "" : "pt-1 text-end font-display text-xl tabular"}`}><strong>{money(order.total)}</strong></td>
          </tr>
        </tbody>
      </table>

      {rule}

      <div className={variant === "print" ? "" : "flex flex-col gap-1 text-sm"}>
        {order.type === "TABLE" ? (
          <p>{t("table", { n: order.tableNumber ?? "" })}</p>
        ) : (
          <>
            <p><span className={variant === "print" ? "" : "text-[var(--fg-muted)]"}>{t("deliveryTo")}</span> {order.customerName}</p>
            {order.customerPhone ? <p><span className={variant === "print" ? "" : "text-[var(--fg-muted)]"}>{t("phone")}</span> <span dir="ltr" className="tabular">{formatPhone(order.customerPhone)}</span></p> : null}
            <p><span className={variant === "print" ? "" : "text-[var(--fg-muted)]"}>{t("address")}</span> {order.address}</p>
            {order.landmark ? <p><span className={variant === "print" ? "" : "text-[var(--fg-muted)]"}>{t("landmark")}</span> {order.landmark}</p> : null}
          </>
        )}
        {order.note ? <p><span className={variant === "print" ? "" : "text-[var(--fg-muted)]"}>{t("orderNote")}</span> {order.note}</p> : null}
      </div>

      {variant === "print" ? (
        <>
          <hr />
          <p>{t("status")}: {t(`steps.${order.status}`)}</p>
          <p>{t("thanks")}</p>
        </>
      ) : (
        <>
          {rule}
          <div className="text-sm text-[var(--fg-muted)]">
            <p>{shop.name}{shop.address ? `, ${shop.address}` : ""}</p>
            {shop.phone ? <p>{t("shopPhone")}: <a href={`tel:${shop.phone}`} dir="ltr" className="tabular underline-offset-4 hover:underline">{formatPhone(shop.phone)}</a></p> : null}
          </div>
        </>
      )}
    </div>
  );
}
