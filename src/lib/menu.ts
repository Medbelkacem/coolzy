import { db } from "./db";
import type { AppLocale } from "@/i18n/config";
import type { Accent } from "@/generated/prisma/enums";
import { isSoldOut, missingLocales } from "./menu-shared";

export { ACCENTS, ACCENT_HEX, slugify, missingLocales, isSoldOut } from "./menu-shared";

/* ------------------------------------------------------------------ */
/* Client-facing catalogue — resolved for one locale, French fallback.  */
/* ------------------------------------------------------------------ */

export type ClientProduct = {
  id: string;
  name: string;
  description: string;
  ingredients: string;
  price: number;
  soldOut: boolean;
  photoUrl: string | null;
  photoThumbUrl: string | null;
  photoBlurhash: string | null;
  photoWidth: number | null;
  photoHeight: number | null;
};

export type ClientCategory = {
  id: string;
  slug: string;
  accent: Accent;
  name: string;
  products: ClientProduct[];
};

type Tr = { locale: string; name: string; description?: string; ingredients?: string };

function resolve<T extends Tr>(rows: T[], locale: AppLocale): T | undefined {
  return rows.find((r) => r.locale === locale && r.name.trim()) ?? rows.find((r) => r.locale === "fr");
}

export async function getCatalogueForClient(locale: AppLocale): Promise<ClientCategory[]> {
  const now = new Date();
  const cats = await db().category.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      translations: true,
      products: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], include: { translations: true } },
    },
  });
  return cats.map((c) => ({
    id: c.id,
    slug: c.slug,
    accent: c.accent,
    name: resolve(c.translations, locale)?.name ?? c.slug,
    products: c.products.map((p) => {
      const t = resolve(p.translations, locale);
      return {
        id: p.id,
        name: t?.name ?? "",
        description: t?.description ?? "",
        ingredients: t?.ingredients ?? "",
        price: p.price,
        soldOut: isSoldOut(p, now),
        photoUrl: p.photoUrl,
        photoThumbUrl: p.photoThumbUrl,
        photoBlurhash: p.photoBlurhash,
        photoWidth: p.photoWidth,
        photoHeight: p.photoHeight,
      };
    }),
  }));
}

export async function getProductForClient(id: string, locale: AppLocale): Promise<(ClientProduct & { category: { id: string; slug: string; accent: Accent; name: string } }) | null> {
  const p = await db().product.findUnique({ where: { id }, include: { translations: true, category: { include: { translations: true } } } });
  if (!p || !p.category.active) return null;
  const t = resolve(p.translations, locale);
  return {
    id: p.id,
    name: t?.name ?? "",
    description: t?.description ?? "",
    ingredients: t?.ingredients ?? "",
    price: p.price,
    soldOut: isSoldOut(p),
    photoUrl: p.photoUrl,
    photoThumbUrl: p.photoThumbUrl,
    photoBlurhash: p.photoBlurhash,
    photoWidth: p.photoWidth,
    photoHeight: p.photoHeight,
    category: { id: p.category.id, slug: p.category.slug, accent: p.category.accent, name: resolve(p.category.translations, locale)?.name ?? p.category.slug },
  };
}

/* ------------------------------------------------------------------ */
/* Admin catalogue — every locale, translation completeness flags.      */
/* ------------------------------------------------------------------ */

export async function getCatalogueForAdmin() {
  const now = new Date();
  const cats = await db().category.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      translations: true,
      products: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], include: { translations: true } },
    },
  });
  return cats.map((c) => ({
    ...c,
    missing: missingLocales(c.translations),
    products: c.products.map((p) => ({ ...p, soldOut: isSoldOut(p, now), missing: missingLocales(p.translations) })),
  }));
}
export type AdminCatalogue = Awaited<ReturnType<typeof getCatalogueForAdmin>>;
