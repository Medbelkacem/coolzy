import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/authz";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusChip } from "@/components/ui/StatusChip";
import { formatDA } from "@/lib/money";
import { fmtDateTime } from "@/lib/time";
import { displayNumber } from "@/lib/orders";
import { formatPhone } from "@/lib/customer";
import { listOrders, listStaffForFilter, parseOrderFilters, PAGE_SIZE } from "@/lib/admin-queries";
import { OrderStatus, OrderType } from "@/generated/prisma/enums";
import type { AppLocale } from "@/i18n/config";
import { OrderFilters } from "./OrderFilters";
import "@/styles/admin.css";
import { OrderNumber } from "@/components/ui/OrderNumber";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("orders.history_all");
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("adminOrders");
  const tStatus = await getTranslations("status");
  const filters = parseOrderFilters(await searchParams);
  const [{ orders, total, pages }, staff] = await Promise.all([listOrders(filters), listStaffForFilter()]);

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v !== undefined && k !== "page") qs.set(k, String(v));
  const exportHref = `/api/admin/orders/export?${qs.toString()}`;
  const pageHref = (p: number) => `/admin/orders?${new URLSearchParams({ ...Object.fromEntries(qs), page: String(p) }).toString()}`;

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle", { count: total })} actions={<a href={exportHref} className="btn btn-quiet" download>{t("filters.export")}</a>} />
      <OrderFilters
        filters={filters}
        staff={staff.map((s) => ({ id: s.id, name: s.name }))}
        statuses={Object.values(OrderStatus).map((s) => ({ value: s, label: tStatus(s) }))}
        types={Object.values(OrderType).map((v) => ({ value: v, label: t(`types.${v}`) }))}
      />
      {orders.length === 0 ? (
        <EmptyState title={t("emptyTitle")} body={t("emptyBody")} />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">{t("columns.number")}</th>
                <th scope="col">{t("columns.customer")}</th>
                <th scope="col">{t("columns.products")}</th>
                <th scope="col">{t("columns.total")}</th>
                <th scope="col">{t("columns.where")}</th>
                <th scope="col">{t("columns.when")}</th>
                <th scope="col">{t("columns.worker")}</th>
                <th scope="col">{t("columns.status")}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="num"><Link href={`/admin/orders/${o.id}`} className="admin-row-link"><OrderNumber n={o.number} /></Link></td>
                  <td>{o.customerName ?? (o.customerPhone ? formatPhone(o.customerPhone) : o.type === "TABLE" ? t("anonymous") : "—")}</td>
                  <td className="max-w-[320px]"><span className="truncate-2">{o.items.map((i) => `${i.qty}× ${i.nameSnapshot}`).join(", ")}</span></td>
                  <td className="num font-medium">{formatDA(o.total, locale)}</td>
                  <td>{o.type === "TABLE" ? t("tableN", { n: o.tableNumber ?? 0 }) : t("delivery")}</td>
                  <td className="num">{fmtDateTime(o.createdAt, locale)}</td>
                  <td>{o.handledBy?.name ?? t("noWorker")}</td>
                  <td><StatusChip status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 ? (
        <nav className="mt-4 flex items-center justify-between gap-3" aria-label={t("page", { page: filters.page, pages })}>
          {filters.page > 1 ? <Link href={pageHref(filters.page - 1)} className="btn btn-quiet btn-sm">{t("prev")}</Link> : <span />}
          <span className="text-sm text-[var(--fg-muted)]">{t("page", { page: filters.page, pages })}</span>
          {filters.page < pages ? <Link href={pageHref(filters.page + 1)} className="btn btn-quiet btn-sm">{t("next")}</Link> : <span />}
        </nav>
      ) : null}
      {total > PAGE_SIZE * pages ? null : null}
    </>
  );
}
