import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/authz";
import { PageHeader } from "@/components/admin/PageHeader";
import { ProductForm } from "@/components/admin/menu/ProductForm";
import { categoryOptions } from "../_shared";
import type { AppLocale } from "@/i18n/config";
import "@/styles/admin-menu.css";

export const dynamic = "force-dynamic";

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  await requirePermission("menu.manage");
  const { category } = await searchParams;
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("adminMenu");
  const categories = await categoryOptions(locale);
  if (categories.length === 0) redirect("/admin/menu/categories/new");
  const empty = { fr: "", en: "", ar: "" };
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("newProduct")} />
      <ProductForm
        categories={categories}
        justCreated={false}
        initial={{ id: null, name: empty, description: empty, ingredients: empty, categoryId: category && categories.some((c) => c.id === category) ? category : categories[0].id, price: null, costPrice: null, available: true, sortOrder: 0, photoUrl: null }}
      />
    </div>
  );
}
