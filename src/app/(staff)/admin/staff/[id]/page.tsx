import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";
import { toDateInput } from "@/lib/date-input";
import { formatPhone } from "@/lib/customer";
import { PageHeader } from "@/components/admin/PageHeader";
import { StaffForm } from "../StaffForm";
import { ActiveToggle } from "./ActiveToggle";
import { SalarySection } from "./SalarySection";
import { updateStaff } from "../actions";
import "@/styles/admin-money.css";

export default async function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission("staff.manage");
  const { id } = await params;
  const t = await getTranslations("staff");
  const locale = await getLocale();
  const user = await db().user.findUnique({ where: { id }, include: { salaryPayments: { orderBy: { paidAt: "desc" } } } });
  if (!user) notFound();
  const update = updateStaff.bind(null, user.id);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/staff" className="mb-4 inline-block text-sm text-[var(--fg-muted)] underline-offset-4 hover:underline">{t("backToList")}</Link>
      <PageHeader
        title={user.name}
        subtitle={`${t(`roles.${user.role}`)} — ${user.username}`}
        actions={<ActiveToggle id={user.id} active={user.active} isSelf={user.id === actor.id} />}
      />
      {!user.active ? <p role="status" className="mb-4 rounded-[10px] border border-[color-mix(in_srgb,var(--color-warn)_40%,transparent)] px-4 py-3 text-sm">{t("inactiveNotice")}</p> : null}
      <StaffForm
        action={update}
        mode="edit"
        initial={{ name: user.name, username: user.username, email: user.email ?? "", phone: formatPhone(user.phone), role: user.role, hireDate: toDateInput(user.hireDate) }}
      />
      <SalarySection
        userId={user.id}
        locale={locale}
        payments={user.salaryPayments.map((p) => ({
          id: p.id,
          amount: p.amount,
          periodStart: p.periodStart.toISOString(),
          periodEnd: p.periodEnd.toISOString(),
          paidAt: p.paidAt.toISOString(),
          method: p.method,
          note: p.note,
        }))}
      />
    </div>
  );
}
