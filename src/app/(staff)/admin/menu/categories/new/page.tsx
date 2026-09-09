import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/authz";
import { PageHeader } from "@/components/admin/PageHeader";
import { CategoryForm } from "@/components/admin/menu/CategoryForm";
import "@/styles/admin-menu.css";

export const dynamic = "force-dynamic";

export default async function NewCategoryPage() {
  await requirePermission("menu.manage");
  const t = await getTranslations("adminMenu");
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("newCategory")} />
      <CategoryForm initial={{ id: null, name: { fr: "", en: "", ar: "" }, slug: "", accent: "rose", active: true, sortOrder: 0, productCount: 0 }} />
    </div>
  );
}
