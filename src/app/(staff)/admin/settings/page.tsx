import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/authz";
import { PageHeader } from "@/components/admin/PageHeader";
import { getShop } from "@/lib/shop";
import { SettingsForm } from "./SettingsForm";
import "@/styles/admin.css";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requirePermission("settings.manage");
  const t = await getTranslations("settings");
  const tc = await getTranslations("common");
  const shop = await getShop();
  const dayNames = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, tc(`days.${d}` as "days.0")])) as Record<number, string>;
  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <div className="max-w-3xl">
        <SettingsForm shop={shop} dayNames={dayNames} />
      </div>
    </>
  );
}
