import { db } from "./db";
import { range as presetRange, TZ, type RangeKey } from "./time";
import { dayStart, dayEnd } from "./date-input";
import type { Accent } from "@/generated/prisma/enums";
import type { AppLocale } from "@/i18n/config";

/* ------------------------------------------------------------------ */
/* Ranges                                                               */
/* ------------------------------------------------------------------ */

export type StatsRange = { key: RangeKey | "custom"; from: Date; to: Date; prevFrom: Date; prevTo: Date };

export function resolveRange(sp: { range?: string; from?: string; to?: string }): StatsRange {
  if (sp.range === "custom" && sp.from && sp.to) {
    const from = dayStart(sp.from);
    const to = dayEnd(sp.to);
    if (from && to && to.getTime() >= from.getTime()) {
      const span = to.getTime() - from.getTime() + 1;
      return { key: "custom", from, to, prevFrom: new Date(from.getTime() - span), prevTo: new Date(from.getTime() - 1) };
    }
  }
  const keys: RangeKey[] = ["today", "yesterday", "week", "month", "7d", "30d"];
  const key = keys.includes(sp.range as RangeKey) ? (sp.range as RangeKey) : "7d";
  return { key, ...presetRange(key) };
}

/* ------------------------------------------------------------------ */
/* Totals                                                               */
/* ------------------------------------------------------------------ */

export type Totals = {
  sales: number;
  orders: number;
  avg: number;
  deliveryOrders: number;
  tableOrders: number;
  deliveryRevenue: number;
  deliveryFees: number;
  expenses: number;
  profit: number;
  margin: number | null;
  itemsWithCost: number;
  itemsWithoutCost: number;
  cancelled: number;
};

type Row<T> = T[];

export async function getTotals(from: Date, to: Date): Promise<Totals> {
  const [o] = await db().$queryRaw<Row<{ sales: bigint | null; orders: bigint; delivery_orders: bigint; table_orders: bigint; delivery_revenue: bigint | null; delivery_fees: bigint | null; cancelled: bigint }>>`
    SELECT
      COALESCE(SUM(CASE WHEN status <> 'CANCELLED' THEN total END), 0)::bigint AS sales,
      COUNT(*) FILTER (WHERE status <> 'CANCELLED')::bigint AS orders,
      COUNT(*) FILTER (WHERE status <> 'CANCELLED' AND type = 'DELIVERY')::bigint AS delivery_orders,
      COUNT(*) FILTER (WHERE status <> 'CANCELLED' AND type = 'TABLE')::bigint AS table_orders,
      COALESCE(SUM(CASE WHEN status <> 'CANCELLED' AND type = 'DELIVERY' THEN total END), 0)::bigint AS delivery_revenue,
      COALESCE(SUM(CASE WHEN status <> 'CANCELLED' THEN "deliveryFee" END), 0)::bigint AS delivery_fees,
      COUNT(*) FILTER (WHERE status = 'CANCELLED')::bigint AS cancelled
    FROM "Order" WHERE "createdAt" BETWEEN ${from} AND ${to}`;
  const [m] = await db().$queryRaw<Row<{ margin: bigint | null; with_cost: bigint; without_cost: bigint }>>`
    SELECT
      COALESCE(SUM(CASE WHEN i."costSnapshot" IS NOT NULL THEN (i."unitPrice" - i."costSnapshot") * i.qty END), 0)::bigint AS margin,
      COUNT(*) FILTER (WHERE i."costSnapshot" IS NOT NULL)::bigint AS with_cost,
      COUNT(*) FILTER (WHERE i."costSnapshot" IS NULL)::bigint AS without_cost
    FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId"
    WHERE o.status <> 'CANCELLED' AND o."createdAt" BETWEEN ${from} AND ${to}`;
  const exp = await db().expense.aggregate({ _sum: { amount: true }, where: { date: { gte: from, lte: to } } });
  const sales = Number(o.sales ?? 0);
  const orders = Number(o.orders);
  const expenses = exp._sum.amount ?? 0;
  const itemsWithCost = Number(m.with_cost);
  return {
    sales,
    orders,
    avg: orders > 0 ? Math.round(sales / orders) : 0,
    deliveryOrders: Number(o.delivery_orders),
    tableOrders: Number(o.table_orders),
    deliveryRevenue: Number(o.delivery_revenue ?? 0),
    deliveryFees: Number(o.delivery_fees ?? 0),
    expenses,
    profit: sales - expenses,
    margin: itemsWithCost > 0 ? Number(m.margin ?? 0) : null,
    itemsWithCost,
    itemsWithoutCost: Number(m.without_cost),
    cancelled: Number(o.cancelled),
  };
}

/* ------------------------------------------------------------------ */
/* Series                                                               */
/* ------------------------------------------------------------------ */

export type Bucket = "day" | "week" | "month";
export type SeriesPoint = { bucket: string; sales: number; orders: number };

/** Revenue per Algiers-local bucket. Empty buckets are omitted — the UI fills the gaps so an empty range stays visibly empty. */
export async function getRevenueSeries(from: Date, to: Date, bucket: Bucket): Promise<SeriesPoint[]> {
  const unit = bucket === "day" ? "day" : bucket === "week" ? "week" : "month";
  const rows = await db().$queryRaw<Row<{ bucket: Date; sales: bigint; orders: bigint }>>`
    SELECT date_trunc(${unit}, "createdAt" AT TIME ZONE ${TZ}) AS bucket,
           COALESCE(SUM(total), 0)::bigint AS sales, COUNT(*)::bigint AS orders
    FROM "Order"
    WHERE status <> 'CANCELLED' AND "createdAt" BETWEEN ${from} AND ${to}
    GROUP BY 1 ORDER BY 1`;
  // date_trunc on a timestamp-without-tz returns a local wall time; format it as YYYY-MM-DD.
  return rows.map((r) => ({ bucket: r.bucket.toISOString().slice(0, 10), sales: Number(r.sales), orders: Number(r.orders) }));
}

export type TopProduct = { productId: string | null; name: string; qty: number; revenue: number };

export async function getTopProducts(from: Date, to: Date, limit = 10): Promise<TopProduct[]> {
  const rows = await db().$queryRaw<Row<{ productId: string | null; name: string; qty: bigint; revenue: bigint }>>`
    SELECT i."productId", MAX(i."nameSnapshot") AS name, SUM(i.qty)::bigint AS qty, SUM(i.qty * i."unitPrice")::bigint AS revenue
    FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId"
    WHERE o.status <> 'CANCELLED' AND o."createdAt" BETWEEN ${from} AND ${to}
    GROUP BY COALESCE(i."productId", i."nameSnapshot"), i."productId"
    ORDER BY qty DESC LIMIT ${limit}`;
  return rows.map((r) => ({ productId: r.productId, name: r.name, qty: Number(r.qty), revenue: Number(r.revenue) }));
}

export type CategoryRevenue = { categoryId: string | null; name: string | null; accent: Accent | null; revenue: number; qty: number };

export async function getRevenueByCategory(from: Date, to: Date, locale: AppLocale): Promise<CategoryRevenue[]> {
  const rows = await db().$queryRaw<Row<{ categoryId: string | null; accent: Accent | null; name: string | null; revenue: bigint; qty: bigint }>>`
    SELECT c.id AS "categoryId", c.accent,
           COALESCE(
             (SELECT name FROM "CategoryTranslation" ct WHERE ct."categoryId" = c.id AND ct.locale::text = ${locale} AND ct.name <> ''),
             (SELECT name FROM "CategoryTranslation" ct WHERE ct."categoryId" = c.id AND ct.locale = 'fr')
           ) AS name,
           SUM(i.qty * i."unitPrice")::bigint AS revenue, SUM(i.qty)::bigint AS qty
    FROM "OrderItem" i
    JOIN "Order" o ON o.id = i."orderId"
    LEFT JOIN "Product" p ON p.id = i."productId"
    LEFT JOIN "Category" c ON c.id = p."categoryId"
    WHERE o.status <> 'CANCELLED' AND o."createdAt" BETWEEN ${from} AND ${to}
    GROUP BY c.id, c.accent
    ORDER BY revenue DESC`;
  return rows.map((r) => ({ categoryId: r.categoryId, name: r.name, accent: r.accent, revenue: Number(r.revenue), qty: Number(r.qty) }));
}

export type WorkerSalary = { userId: string; name: string; amount: number; payments: number };

export async function getSalariesByWorker(from: Date, to: Date): Promise<WorkerSalary[]> {
  const grouped = await db().salaryPayment.groupBy({
    by: ["userId"],
    where: { paidAt: { gte: from, lte: to } },
    _sum: { amount: true },
    _count: { _all: true },
  });
  if (grouped.length === 0) return [];
  const users = await db().user.findMany({ where: { id: { in: grouped.map((g) => g.userId) } }, select: { id: true, name: true } });
  const nameOf = new Map(users.map((u) => [u.id, u.name]));
  return grouped
    .map((g) => ({ userId: g.userId, name: nameOf.get(g.userId) ?? g.userId, amount: g._sum.amount ?? 0, payments: g._count._all }))
    .sort((a, b) => b.amount - a.amount);
}

/** 7 weekdays (0 = Sunday) × hours 7..23, non-cancelled order counts in Algiers time. */
export type HeatCell = { day: number; hour: number; count: number };

export async function getHeatmap(from: Date, to: Date): Promise<HeatCell[]> {
  const rows = await db().$queryRaw<Row<{ day: number; hour: number; count: bigint }>>`
    SELECT EXTRACT(DOW FROM ("createdAt" AT TIME ZONE ${TZ}))::int AS day,
           EXTRACT(HOUR FROM ("createdAt" AT TIME ZONE ${TZ}))::int AS hour,
           COUNT(*)::bigint AS count
    FROM "Order"
    WHERE status <> 'CANCELLED' AND "createdAt" BETWEEN ${from} AND ${to}
    GROUP BY 1, 2`;
  return rows.map((r) => ({ day: r.day, hour: r.hour, count: Number(r.count) }));
}

export type ExpenseByCategory = { category: string; amount: number; count: number };

export async function getExpensesByCategory(from: Date, to: Date): Promise<ExpenseByCategory[]> {
  const g = await db().expense.groupBy({ by: ["category"], where: { date: { gte: from, lte: to } }, _sum: { amount: true }, _count: { _all: true } });
  return g.map((r) => ({ category: r.category, amount: r._sum.amount ?? 0, count: r._count._all })).sort((a, b) => b.amount - a.amount);
}
