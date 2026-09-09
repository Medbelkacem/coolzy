import { getLocale, getTranslations } from "next-intl/server";
import { getShop } from "@/lib/shop";
import { getCatalogueForClient } from "@/lib/menu";
import { blurhashToDataURL } from "@/lib/blurhash";
import { openState, hourOf } from "@/lib/time";
import { pick, type AppLocale } from "@/i18n/config";
import { ClientShell } from "@/components/client/ClientShell";
import { MenuHeader } from "@/components/client/MenuHeader";
import { MenuList, type MenuCategory } from "@/components/client/MenuList";
import { CartBar } from "@/components/client/CartBar";
import { LaptopNotice } from "@/components/client/LaptopNotice";
import { ClientFooter } from "@/components/client/Footer";
import { houseRules } from "@/components/client/rules";
import "@/styles/client.css";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("menu");
  const [shop, catalogue] = await Promise.all([getShop(), getCatalogueForClient(locale)]);
  const now = new Date();
  const open = openState(shop.hours, now);
  const hour = hourOf(now);
  const rules = await houseRules(shop, locale);
  const currency = pick(shop.currencyLabel, locale) || (locale === "ar" ? "دج" : "DA");

  const categories: MenuCategory[] = await Promise.all(
    catalogue.map(async (c) => ({
      ...c,
      products: await Promise.all(c.products.map(async (p) => ({ ...p, blurDataURL: await blurhashToDataURL(p.photoBlurhash) }))),
    })),
  );
  const hasProducts = categories.some((c) => c.products.length > 0);

  let openLabel: string;
  if (open.open) openLabel = t("openUntil", { time: open.closeLabel });
  else if (!open.openLabel) openLabel = t("closed");
  else if (open.openDayOffset === 0) openLabel = t("opensAt", { time: open.openLabel });
  else if (open.openDayOffset === 1) openLabel = t("opensTomorrow", { time: open.openLabel });
  else openLabel = t("opensOn", { day: t(`days.${open.opensAt!.getDay()}` as never), time: open.openLabel });

  return (
    <ClientShell currencyLabel={currency} minimumRule={rules[1] ?? ""}>
      <MenuHeader open={open.open} />
      <main id="main" className="has-cart-bar">
        <div className="tagline">
          <h1 className="font-display font-display-italic">{pick(shop.tagline, locale) || t("tagline")}</h1>
          <p className="mt-1 text-[var(--fg-muted)]" aria-live="polite">{openLabel}</p>
        </div>
        {hour >= 16 && hour < 20 ? <LaptopNotice text={rules[0] ?? ""} /> : null}
        {hasProducts ? (
          <MenuList categories={categories} currencyLabel={currency} />
        ) : (
          <div className="px-4 py-16 text-center">
            <p className="font-display text-xl">{t("emptyTitle")}</p>
            <p className="mt-2 text-[var(--fg-muted)]">{t("emptyBody")}</p>
          </div>
        )}
        <ClientFooter />
      </main>
      <CartBar currencyLabel={currency} />
    </ClientShell>
  );
}
