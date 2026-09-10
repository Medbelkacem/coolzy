import Link from "next/link";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { getOrderByToken } from "@/lib/receipt";
import { toOrderDTO, flowFor, displayNumberBidi } from "@/lib/orders";
import { getShop } from "@/lib/shop";
import { db } from "@/lib/db";
import { formatDA } from "@/lib/money";
import { pick, type AppLocale } from "@/i18n/config";
import { REVIEW_EDIT_WINDOW_MS } from "@/lib/reviews";
import { Wordmark } from "@/components/ui/Wordmark";
import { LanguageSwitch } from "@/components/ui/LanguageSwitch";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconArrowBack, IconHistory } from "@/components/ui/Icons";
import { ReceiptLive } from "@/components/receipt/ReceiptLive";
import { ReceiptActions } from "@/components/receipt/ReceiptActions";
import { ReviewsSection, type ExistingReview } from "./reviews";
import "@/styles/receipt.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const t = await getTranslations("receipt");
  const order = await getOrderByToken(token);
  return { title: order ? t("order", { n: displayNumberBidi(order.number) }) : t("title"), robots: { index: false, follow: false } };
}

/** The receipt is the tracking page. The URL token is the only credential. */
export default async function ReceiptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [t, locale, order, shop] = await Promise.all([getTranslations("receipt"), getLocale() as Promise<AppLocale>, getOrderByToken(token), getShop()]);

  const header = (
    <header className="flex items-center justify-between gap-3 py-3">
      <Link href="/" className="btn btn-quiet btn-sm" aria-label={t("backToMenu")}>
        <IconArrowBack width={18} height={18} />
        <span className="hidden sm:inline">{t("backToMenu")}</span>
      </Link>
      <Wordmark size={22} />
      <div className="flex items-center gap-1">
        <Link href="/orders" className="btn btn-quiet btn-icon" aria-label={t("myOrders")}><IconHistory width={18} height={18} /></Link>
        <LanguageSwitch />
      </div>
    </header>
  );

  if (!order) {
    return (
      <main id="main" className="mx-auto w-full max-w-lg px-4 pb-10">
        {header}
        <EmptyState title={t("notFoundTitle")} body={t("notFoundBody")} action={{ href: "/", label: t("backToMenu") }} />
      </main>
    );
  }

  const dto = toOrderDTO(order);
  const currencyLabel = pick(shop.currencyLabel, locale);
  const shopInfo = { name: shop.name, phone: shop.phone, address: shop.address, currencyLabel };
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const reviewable = dto.items.filter((i) => i.productId).map((i) => ({ productId: i.productId as string, name: i.name }));
  const reviews = reviewable.length
    ? await db().review.findMany({ where: { orderId: order.id }, select: { productId: true, rating: true, comment: true, status: true, createdAt: true } })
    : [];
  const existing: ExistingReview[] = reviews.map((r) => ({
    productId: r.productId,
    rating: r.rating,
    comment: r.comment,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    editableUntil: new Date(r.createdAt.getTime() + REVIEW_EDIT_WINDOW_MS).toISOString(),
  }));

  return (
    <main id="main" className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pb-10 safe-bottom">
      {header}
      <ReceiptLive initial={dto} shop={shopInfo} flow={flowFor(order.type)}>
        <ReviewsSection token={dto.token} items={reviewable} existing={existing} />
      </ReceiptLive>
      <ReceiptActions order={dto} shopName={shop.name} totalLabel={formatDA(dto.total, locale, currencyLabel || undefined)} appUrl={appUrl} />
    </main>
  );
}
