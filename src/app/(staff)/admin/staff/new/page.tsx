import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/authz";
import { PageHeader } from "@/components/admin/PageHeader";
import { StaffForm } from "../StaffForm";
import { createStaff } from "../actions";
import "@/styles/admin-money.css";

export default async function NewStaffPage() {
  await requirePermission("staff.manage");
  const t = await getTranslations("staff");
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/staff" className="mb-4 inline-block text-sm text-[var(--fg-muted)] underline-offset-4 hover:underline">{t("backToList")}</Link>
      <PageHeader title={t("newTitle")} />
      <StaffForm action={createStaff} mode="create" />
    </div>
  );
}
