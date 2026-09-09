import { NextIntlClientProvider, createTranslator } from "next-intl";
import { getTranslations } from "next-intl/server";
import { getOrderByToken } from "@/lib/receipt";
import { toOrderDTO } from "@/lib/orders";
import { getShop } from "@/lib/shop";
import { pick, dirOf, type AppLocale } from "@/i18n/config";
import { fmtDate, fmtTime } from "@/lib/time";
import { ReceiptBody } from "@/components/receipt/ReceiptBody";
import { AutoPrint } from "./AutoPrint";
import "@/styles/receipt.css";

export const dynamic = "force-dynamic";

/**
 * 80 mm paper view in the ORDER's locale (the customer's choice at checkout),
 * not the viewer's cookie. `?auto=1` prints on load; `?pdf=1` is used by the
 * PDF renderer.
 */
export default async function PrintPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ auto?: string; pdf?: string }> }) {
  const { token } = await params;
  const { auto, pdf } = await searchParams;
  const order = await getOrderByToken(token);
  if (!order) {
    const t = await getTranslations("receipt");
    return <main className="print-page"><p>{t("notFoundTitle")}</p></main>;
  }
  const locale = order.locale as AppLocale;
  const messages = (await import(`@/generated/messages/${locale}.json`)).default;
  const t = createTranslator({ locale, messages, namespace: "receipt" });
  const shop = await getShop();
  const now = new Date();
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Africa/Algiers">
      <main className="print-page" lang={locale} dir={dirOf(locale)} data-pdf={pdf === "1" ? "1" : undefined}>
        <ReceiptBody order={toOrderDTO(order)} shop={{ name: shop.name, phone: shop.phone, address: shop.address, currencyLabel: pick(shop.currencyLabel, locale) }} variant="print" />
        <p className="thermal" style={{ marginTop: 8 }}>{t("printedAt", { date: fmtDate(now, locale), time: fmtTime(now, locale) })}</p>
        {auto === "1" ? <AutoPrint /> : null}
      </main>
    </NextIntlClientProvider>
  );
}
