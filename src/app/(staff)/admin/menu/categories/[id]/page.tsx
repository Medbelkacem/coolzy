import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { CategoryForm } from "@/components/admin/menu/CategoryForm";
import "@/styles/admin-menu.css";

export const dynamic = "force-dynamic";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("menu.manage");
  const { id } = await params;
  const t = await getTranslations("adminMenu");
  const c = await db().category.findUnique({ where: { id }, include: { translations: true, _count: { select: { products: true } } } });
  if (!c) notFound();
  const name = { fr: "", en: "", ar: "" };
  for (const tr of c.translations) name[tr.locale] = tr.name;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("editCategory")} subtitle={name.fr} />
      <CategoryForm initial={{ id: c.id, name, slug: c.slug, accent: c.accent, active: c.active, sortOrder: c.sortOrder, productCount: c._count.products }} />
    </div>
  );
}
