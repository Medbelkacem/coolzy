"use client";
import { useTranslations } from "next-intl";
import type { OrderDTO } from "@/lib/orders";
import { IconDownload, IconPrint, IconShare, IconWhatsApp } from "@/components/ui/Icons";
import { ReorderButton } from "./ReorderButton";

export function ReceiptActions({ order, shopName, totalLabel, appUrl }: { order: OrderDTO; shopName: string; totalLabel: string; appUrl: string }) {
  const t = useTranslations("receipt");
  const url = `${appUrl}/r/${order.token}`;
  const text = t("shareText", { shop: shopName, n: order.display, total: totalLabel, url });
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  return (
    <div className="flex flex-wrap gap-2">
      <a href={`/r/${order.token}/pdf`} className="btn btn-quiet" download>
        <IconDownload width={18} height={18} />
        {t("download")}
      </a>
      <a href={`/r/${order.token}/print?auto=1`} target="_blank" rel="noopener" className="btn btn-quiet">
        <IconPrint width={18} height={18} />
        {t("print")}
      </a>
      <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className="btn btn-quiet">
        <IconWhatsApp width={18} height={18} />
        {t("whatsapp")}
      </a>
      {canShare ? (
        <button type="button" className="btn btn-quiet" onClick={() => navigator.share({ title: `${shopName} ${order.display}`, text, url }).catch(() => {})}>
          <IconShare width={18} height={18} />
          {t("share")}
        </button>
      ) : null}
      <ReorderButton token={order.token} />
    </div>
  );
}
