import Link from "next/link";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { getClientToken, formatPhone } from "@/lib/customer";
import { getHistoryForClient } from "@/lib/receipt";
import { displayNumber } from "@/lib/orders";
import { formatDA } from "@/lib/money";
import { fmtDate, fmtTime } from "@/lib/time";
import { getShop } from "@/lib/shop";
import { pick, type AppLocale } from "@/i18n/config";
import { Wordmark } from "@/components/ui/Wordmark";
import { LanguageSwitch } from "@/components/ui/LanguageSwitch";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusChip } from "@/components/ui/StatusChip";
import { IconArrowBack } from "@/components/ui/Icons";
import { ReorderButton } from "@/components/receipt/ReorderButton";
import { ClaimPhone } from "./ClaimPhone";
import "@/styles/receipt.css";
import { OrderNumber } from "@/components/ui/OrderNumber";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("history");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function OrdersPage() {
  const [t, locale, shop, clientToken] = await Promise.all([getTranslations("history"), getLocale() as Promise<AppLocale>, getShop(), getClientToken()]);
  const { orders, customer } = await getHistoryForClient(clientToken);
  const currency = pick(shop.currencyLabel, locale) || undefined;

  return (
    <main id="main" className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pb-10 safe-bottom">
      <header className="flex items-center justify-between gap-3 py-3">
        <Link href="/" className="btn btn-quiet btn-sm" aria-label={t("backToMenu")}>
          <IconArrowBack width={18} height={18} />
          <span className="hidden sm:inline">{t("backToMenu")}</span>
        </Link>
        <Wordmark size={22} />
        <LanguageSwitch />
      </header>

      <div>
        <h1 className="font-display text-2xl">{t("title")}</h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">{customer ? t("claimedAs", { phone: formatPhone(customer.phone) }) : t("subtitle")}</p>
      </div>

      {orders.length === 0 ? (
        <EmptyState title={t("emptyTitle")} body={t("emptyBody")} action={{ href: "/", label: t("goMenu") }} />
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((o) => {
            const created = o.createdAt;
            const qty = o.items.reduce((s, i) => s + i.qty, 0);
            return (
              <li key={o.id} className="surface flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/r/${o.token}`} className="font-display text-xl underline-offset-4 hover:underline"><OrderNumber n={o.number} /></Link>
                    <p className="mt-0.5 text-sm text-[var(--fg-muted)]">
                      <span>{fmtDate(created, locale)}</span> <span className="tabular">{fmtTime(created, locale)}</span>
                    </p>
                  </div>
                  <StatusChip status={o.status} />
                </div>
                <p className="truncate-2 text-sm">{o.items.map((i) => `${i.qty}× ${i.nameSnapshot}`).join(", ")}</p>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-[var(--fg-muted)]">
                    <span>{t("items", { count: qty })}</span> <span aria-hidden="true">—</span> <span>{o.type === "TABLE" ? t("table", { n: o.tableNumber ?? "" }) : t("delivery")}</span>
                  </span>
                  <span className="font-medium tabular">{formatDA(o.total, locale, currency)}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/r/${o.token}`} className="btn btn-quiet btn-sm">{t("viewReceipt")}</Link>
                  <ReorderButton token={o.token} className="btn btn-primary btn-sm" />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ClaimPhone claimedPhone={customer ? formatPhone(customer.phone) : null} />
    </main>
  );
}
