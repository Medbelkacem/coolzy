import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { getShop } from "@/lib/shop";
import { openState } from "@/lib/time";
import { pick, type AppLocale } from "@/i18n/config";
import { ClientShell } from "@/components/client/ClientShell";
import { CheckoutForm } from "@/components/client/CheckoutForm";
import { houseRules } from "@/components/client/rules";
import { Wordmark } from "@/components/ui/Wordmark";
import { LanguageSwitch } from "@/components/ui/LanguageSwitch";
import { IconArrowBack } from "@/components/ui/Icons";
import "@/styles/client.css";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("checkout");
  const shop = await getShop();
  const now = new Date();
  const shopOpen = openState(shop.hours, now);
  const deliveryOpen = openState(shop.deliveryHours ?? shop.hours, now);
  const rules = await houseRules(shop, locale);
  const currency = pick(shop.currencyLabel, locale) || (locale === "ar" ? "دج" : "DA");
  const dh = (shop.deliveryHours ?? shop.hours)[now.getDay()];

  return (
    <ClientShell currencyLabel={currency} minimumRule={rules[1] ?? ""}>
      <header className="menu-header">
        <Link href="/" className="btn btn-quiet btn-sm"><IconArrowBack width={18} height={18} /><span>{t("backToMenu")}</span></Link>
        <Wordmark size={22} />
        <LanguageSwitch />
      </header>
      <main id="main" className="mx-auto w-full max-w-lg px-4 pb-16 pt-2">
        <h1 className="font-display text-2xl">{t("title")}</h1>
        <CheckoutForm
          currencyLabel={currency}
          tableCount={shop.tableCount}
          deliveryFee={shop.deliveryFee}
          shopOpen={shopOpen.open}
          deliveryOpen={deliveryOpen.open}
          deliveryWindow={dh.closed ? null : `${dh.open} – ${dh.close}`}
          deliveryZoneNote={pick(shop.deliveryZoneNote, locale)}
          birthdayRule={rules[2] ?? ""}
        />
      </main>
    </ClientShell>
  );
}
