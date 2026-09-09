import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/authz";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusChip } from "@/components/ui/StatusChip";
import { formatDA } from "@/lib/money";
import { fmtDateTime } from "@/lib/time";
import { displayNumber } from "@/lib/orders";
import { formatPhone } from "@/lib/customer";
import { getOrderForAdmin } from "@/lib/admin-queries";
import { OrderStatus } from "@/generated/prisma/enums";
import { localeLongNames, type AppLocale } from "@/i18n/config";
import { OverrideForm } from "./OverrideForm";
import "@/styles/admin.css";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("orders.history_all");
  const { id } = await params;
  const order = await getOrderForAdmin(id);
  if (!order) notFound();
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("adminOrders.detail");
  const tStatus = await getTranslations("status");

  return (
    <>
      <Link href="/admin/orders" className="mb-3 inline-block text-sm text-[var(--fg-muted)] underline-offset-4 hover:underline">{t("back")}</Link>
      <PageHeader
        title={t("title", { number: displayNumber(order.number) })}
        subtitle={t("placed", { date: fmtDateTime(order.createdAt, locale) })}
        actions={
          <>
            <StatusChip status={order.status} />
            <Link href={`/r/${order.token}`} className="btn btn-quiet btn-sm" target="_blank" rel="noopener">{t("receipt")}</Link>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-6">
          <section className="surface p-4" aria-labelledby="items-title">
            <h2 id="items-title" className="mb-3 font-display text-lg">{t("items")}</h2>
            <ul className="divide-y divide-[var(--hairline)]">
              {order.items.map((i) => (
                <li key={i.id} className="flex items-start gap-3 py-2">
                  <span className="tabular w-10 shrink-0 font-medium">{i.qty}×</span>
                  <span className="min-w-0 flex-1">
                    <span className="block">{i.nameSnapshot}</span>
                    {i.note ? <span className="block text-sm text-[var(--fg-muted)]">{t("itemNote")}: “{i.note}”</span> : null}
                  </span>
                  <span className="tabular shrink-0 text-sm text-[var(--fg-muted)]">{formatDA(i.unitPrice, locale)}</span>
                  <span className="tabular w-24 shrink-0 text-end font-medium">{formatDA(i.unitPrice * i.qty, locale)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 flex flex-col gap-1 border-t hairline pt-3 text-sm">
              <div className="flex justify-between"><dt className="text-[var(--fg-muted)]">{t("subtotal")}</dt><dd className="tabular">{formatDA(order.subtotal, locale)}</dd></div>
              {order.deliveryFee > 0 ? <div className="flex justify-between"><dt className="text-[var(--fg-muted)]">{t("deliveryFee")}</dt><dd className="tabular">{formatDA(order.deliveryFee, locale)}</dd></div> : null}
              <div className="flex justify-between text-base font-medium"><dt>{t("total")}</dt><dd className="tabular">{formatDA(order.total, locale)}</dd></div>
            </dl>
            {order.note ? <p className="mt-3 text-sm"><span className="text-[var(--fg-muted)]">{t("note")}: </span>“{order.note}”</p> : null}
          </section>

          <section className="surface p-4" aria-labelledby="customer-title">
            <h2 id="customer-title" className="mb-3 font-display text-lg">{t("customer")}</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              {order.type === "TABLE" ? <><dt className="text-[var(--fg-muted)]">{t("customer")}</dt><dd>{t("table", { n: order.tableNumber ?? 0 })}</dd></> : null}
              {order.customerName ? <><dt className="text-[var(--fg-muted)]">{t("customer")}</dt><dd>{order.customerName}</dd></> : null}
              {order.customerPhone ? <><dt className="text-[var(--fg-muted)]">{t("phone")}</dt><dd dir="ltr" className="tabular">{formatPhone(order.customerPhone)}</dd></> : null}
              {order.address ? <><dt className="text-[var(--fg-muted)]">{t("address")}</dt><dd>{order.address}</dd></> : null}
              {order.landmark ? <><dt className="text-[var(--fg-muted)]">{t("landmark")}</dt><dd>{order.landmark}</dd></> : null}
              <dt className="text-[var(--fg-muted)]">{t("locale")}</dt><dd>{localeLongNames[order.locale]}</dd>
              {order.handledBy ? <><dt className="text-[var(--fg-muted)]">{t("handledBy")}</dt><dd>{order.handledBy.name}</dd></> : null}
              {order.cancelReason ? <><dt className="text-[var(--color-stop)]">{t("cancelReason")}</dt><dd>{order.cancelReason}</dd></> : null}
            </dl>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="surface p-4" aria-labelledby="timeline-title">
            <h2 id="timeline-title" className="mb-2 font-display text-lg">{t("timeline")}</h2>
            <ol className="timeline">
              {order.events.map((e) => (
                <li key={e.id} data-cancelled={e.status === "CANCELLED"}>
                  <span className="block font-medium">{tStatus(e.status)}</span>
                  <span className="flex flex-wrap gap-x-3 text-sm text-[var(--fg-muted)]">
                    <span className="tabular">{fmtDateTime(e.at, locale)}</span>
                    <span>{e.byUser ? t("by", { name: e.byUser.name }) : t("system")}</span>
                  </span>
                  {e.reason ? <span className="block text-sm">“{e.reason}”</span> : null}
                </li>
              ))}
            </ol>
          </section>
          <OverrideForm orderId={order.id} current={order.status} statuses={Object.values(OrderStatus).map((s) => ({ value: s, label: tStatus(s) }))} />
        </div>
      </div>
    </>
  );
}
