import { getTranslations } from "next-intl/server";
import type { ShopSettings } from "@/lib/shop";
import { pick, type AppLocale } from "@/i18n/config";

/** Admin-entered rules per locale, or the three rules from the brief. */
export async function houseRules(shop: ShopSettings, locale: AppLocale): Promise<string[]> {
  const custom = pick(shop.houseRules, locale);
  if (custom) return custom.split("\n").map((s) => s.trim()).filter(Boolean);
  const t = await getTranslations("menu");
  return [t("rules.laptops"), t("rules.minimum"), t("rules.birthday")];
}
