import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDA } from "@/lib/money";
import { fmtDate } from "@/lib/time";
import { formatPhone } from "@/lib/customer";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconPlus } from "@/components/ui/Icons";
import "@/styles/admin-money.css";

export default async function StaffPage() {
  const actor = await requirePermission("staff.manage");
  const t = await getTranslations("staff");
  const locale = await getLocale();
  const users = await db().user.findMany({
    orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }],
    include: { salaryPayments: { orderBy: { paidAt: "desc" }, take: 1 } },
  });

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <Link href="/admin/staff/new" className="btn btn-primary">
            <IconPlus width={18} height={18} />
            {t("add")}
          </Link>
        }
      />
      {users.length === 0 ? (
        <EmptyState title={t("emptyTitle")} body={t("emptyBody")} action={{ href: "/admin/staff/new", label: t("add") }} />
      ) : (
        <div className="surface overflow-x-auto">
          <table className="money-table">
            <thead>
              <tr>
                <th>{t("name")}</th>
                <th>{t("role")}</th>
                <th>{t("phone")}</th>
                <th>{t("hireDate")}</th>
                <th>{t("lastPayment")}</th>
                <th>{t("active")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const last = u.salaryPayments[0];
                return (
                  <tr key={u.id} className={u.active ? "" : "opacity-60"}>
                    <td>
                      <Link href={`/admin/staff/${u.id}`} className="row-link font-medium">
                        {u.name}
                        {u.id === actor.id ? <span className="text-[var(--fg-muted)]"> ({t("you")})</span> : null}
                      </Link>
                      <div className="text-[var(--fg-muted)]">{u.username}</div>
                    </td>
                    <td><span className="chip">{t(`roles.${u.role}`)}</span></td>
                    <td dir="ltr" className="tabular">{formatPhone(u.phone) || "—"}</td>
                    <td>{u.hireDate ? fmtDate(u.hireDate, locale) : "—"}</td>
                    <td>{last ? <span className="tabular">{formatDA(last.amount, locale as "fr")} <span className="text-[var(--fg-muted)]">{fmtDate(last.paidAt, locale)}</span></span> : <span className="text-[var(--fg-muted)]">{t("noPayment")}</span>}</td>
                    <td>{u.active ? <span className="chip border-transparent bg-[color-mix(in_srgb,var(--color-ok)_18%,transparent)]">{t("active")}</span> : <span className="chip">{t("inactive")}</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
