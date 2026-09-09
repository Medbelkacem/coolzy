import { db } from "@/lib/db";
import type { AppLocale } from "@/i18n/config";
import type { CategoryOption } from "@/components/admin/menu/ProductForm";

export async function categoryOptions(locale: AppLocale): Promise<CategoryOption[]> {
  const cats = await db().category.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], include: { translations: true } });
  return cats.map((c) => ({
    id: c.id,
    accent: c.accent,
    name: c.translations.find((t) => t.locale === locale && t.name.trim())?.name ?? c.translations.find((t) => t.locale === "fr")?.name ?? c.slug,
  }));
}
