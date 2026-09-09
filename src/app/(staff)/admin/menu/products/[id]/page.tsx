import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";
import { blurhashToDataURL } from "@/lib/blurhash";
import { PageHeader } from "@/components/admin/PageHeader";
import { ProductForm } from "@/components/admin/menu/ProductForm";
import { categoryOptions } from "../_shared";
import type { AppLocale } from "@/i18n/config";
import "@/styles/admin-menu.css";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  await requirePermission("menu.manage");
  const { id } = await params;
  const { created } = await searchParams;
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("adminMenu");
  const p = await db().product.findUnique({ where: { id }, include: { translations: true } });
  if (!p) notFound();
  const categories = await categoryOptions(locale);
  const name = { fr: "", en: "", ar: "" }, description = { fr: "", en: "", ar: "" }, ingredients = { fr: "", en: "", ar: "" };
  for (const tr of p.translations) {
    name[tr.locale] = tr.name;
    description[tr.locale] = tr.description;
    ingredients[tr.locale] = tr.ingredients;
  }
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("editProduct")} subtitle={name.fr} />
      <ProductForm
        categories={categories}
        justCreated={created === "1"}
        initial={{ id: p.id, name, description, ingredients, categoryId: p.categoryId, price: p.price, costPrice: p.costPrice, available: p.available, sortOrder: p.sortOrder, photoUrl: p.photoUrl, blurDataURL: await blurhashToDataURL(p.photoBlurhash) }}
      />
    </div>
  );
}
