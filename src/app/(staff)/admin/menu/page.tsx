import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/authz";
import { getCatalogueForAdmin } from "@/lib/menu";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconPlus } from "@/components/ui/Icons";
import { MenuOverview, type OverviewCategory } from "@/components/admin/menu/MenuOverview";
import type { AppLocale } from "@/i18n/config";
import "@/styles/admin-menu.css";

export const dynamic = "force-dynamic";

export default async function AdminMenuPage() {
  await requirePermission("menu.manage");
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("adminMenu");
  const cats = await getCatalogueForAdmin();

  const pick = (rows: { locale: string; name: string }[]) => rows.find((r) => r.locale === locale && r.name.trim())?.name ?? rows.find((r) => r.locale === "fr")?.name ?? "";

  const data: OverviewCategory[] = cats.map((c) => ({
    id: c.id,
    slug: c.slug,
    accent: c.accent,
    active: c.active,
    name: pick(c.translations),
    missing: c.missing,
    products: c.products.map((p) => ({
      id: p.id,
      name: pick(p.translations),
      price: p.price,
      available: p.available,
      soldOut: p.soldOut,
      soldOutUntil: p.soldOutUntil ? p.soldOutUntil.toISOString() : null,
      photoThumbUrl: p.photoThumbUrl,
      missing: p.missing,
    })),
  }));

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          cats.length > 0 ? (
            <>
              <Link href="/admin/menu/categories/new" className="btn btn-quiet">{t("newCategory")}</Link>
              <Link href="/admin/menu/products/new" className="btn btn-primary"><IconPlus width={18} height={18} />{t("newProduct")}</Link>
            </>
          ) : null
        }
      />
      {cats.length === 0 ? (
        <EmptyState title={t("emptyTitle")} body={t("emptyBody")} action={{ href: "/admin/menu/categories/new", label: t("emptyAction") }} />
      ) : (
        <MenuOverview categories={data} />
      )}
    </>
  );
}
