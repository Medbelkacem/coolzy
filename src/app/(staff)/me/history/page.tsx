import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";
import { displayNumber } from "@/lib/orders";
import { formatDA } from "@/lib/money";
import { fmtDateTime } from "@/lib/time";
import { StatusChip } from "@/components/ui/StatusChip";
import { EmptyState } from "@/components/ui/EmptyState";
import type { AppLocale } from "@/i18n/config";

export const dynamic = "force-dynamic";

/** Orders the signed-in worker touched in the last 7 days. Own rows only. */
export default async function MyHistoryPage() {
  const actor = await requirePermission("orders.history_7d");
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("worker");
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const orders = await db().order.findMany({
    where: {
      createdAt: { gte: since },
      OR: [{ handledById: actor.id }, { events: { some: { byUserId: actor.id } } }],
    },
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl">{t("history.title")}</h1>
        <p className="mt-1 text-[var(--fg-muted)]">{t("history.subtitle")}</p>
      </div>
      {orders.length === 0 ? (
        <EmptyState title={t("history.empty")} body={t("history.emptyBody")} compact />
      ) : (
        <ul className="surface divide-y hairline">
          {orders.map((o) => {
            const count = o.items.reduce((s, i) => s + i.qty, 0);
            return (
              <li key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                <span className="font-medium tabular">{displayNumber(o.number)}</span>
                <span className="text-sm text-[var(--fg-muted)]">{fmtDateTime(o.createdAt, locale)}</span>
                <span className="chip">{o.type === "TABLE" ? t("history.table", { n: o.tableNumber ?? 0 }) : t("history.delivery")}</span>
                <span className="text-sm text-[var(--fg-muted)]">{t("history.items", { count })}</span>
                <span className="ms-auto tabular">{formatDA(o.total, locale)}</span>
                <StatusChip status={o.status} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
