import { z } from "zod";
import { db } from "./db";
import { ACTIVE, orderWithItems } from "./orders";
import { range, dayKey, toAlgiers, type RangeKey } from "./time";
import { TZDate } from "@date-fns/tz";
import { endOfDay, startOfDay, parseISO, isValid } from "date-fns";
import { OrderStatus, OrderType, ReviewStatus } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import type { AppLocale } from "@/i18n/config";

/* ------------------------------------------------------------------ */
/* Overview — today in Africa/Algiers                                   */
/* ------------------------------------------------------------------ */

export async function getTodayStats() {
  const { from, to } = range("today");
  const [agg, open] = await Promise.all([
    db().order.aggregate({
      where: { createdAt: { gte: from, lte: to }, status: { not: "CANCELLED" } },
      _sum: { total: true },
      _count: { _all: true },
    }),
    db().order.count({ where: { status: { in: ACTIVE } } }),
  ]);
  const count = agg._count._all;
  const sales = agg._sum.total ?? 0;
  return { sales, count, avg: count > 0 ? Math.round(sales / count) : null, open, from, to };
}

export async function getLatestOrders(limit = 8) {
  const { from, to } = range("today");
  return db().order.findMany({
    where: { createdAt: { gte: from, lte: to } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { items: { select: { nameSnapshot: true, qty: true } }, handledBy: { select: { name: true } } },
  });
}

export async function getTopProductsToday(limit = 5, locale: AppLocale = "fr") {
  const { from, to } = range("today");
  const rows = await db().orderItem.groupBy({
    by: ["productId"],
    where: { order: { createdAt: { gte: from, lte: to }, status: { not: "CANCELLED" } }, productId: { not: null } },
    _sum: { qty: true },
    orderBy: { _sum: { qty: "desc" } },
    take: limit,
  });
  const ids = rows.map((r) => r.productId).filter((x): x is string => Boolean(x));
  const products = await db().product.findMany({ where: { id: { in: ids } }, include: { translations: true } });
  const nameOf = new Map(products.map((p) => [p.id, (p.translations.find((t) => t.locale === locale) ?? p.translations.find((t) => t.locale === "fr"))?.name ?? ""]));
  return rows.map((r) => ({ productId: r.productId, name: nameOf.get(r.productId ?? "") ?? "", qty: r._sum.qty ?? 0 }));
}

/** What the admin still has to do before the shop can take orders. */
export async function getSetupState() {
  const [categories, products, workers, shop] = await Promise.all([
    db().category.count(),
    db().product.count(),
    db().user.count({ where: { role: "WORKER", active: true } }),
    db().shop.findUnique({ where: { id: 1 }, select: { tableCount: true, phone: true } }),
  ]);
  const settingsDone = Boolean(shop && shop.tableCount > 0 && shop.phone);
  return { categories, products, workers, settingsDone, complete: settingsDone && products > 0 };
}

/* ------------------------------------------------------------------ */
/* Orders list                                                          */
/* ------------------------------------------------------------------ */

export const orderFiltersSchema = z.object({
  range: z.enum(["today", "yesterday", "week", "month", "7d", "30d", "custom", "all"]).default("today"),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(OrderStatus).optional(),
  type: z.enum(OrderType).optional(),
  worker: z.string().max(64).optional(),
  table: z.coerce.number().int().min(1).max(999).optional(),
  q: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
});
export type OrderFilters = z.infer<typeof orderFiltersSchema>;

export function parseOrderFilters(sp: Record<string, string | string[] | undefined>): OrderFilters {
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    const s = Array.isArray(v) ? v[0] : v;
    if (s !== undefined && s !== "") flat[k] = s;
  }
  const parsed = orderFiltersSchema.safeParse(flat);
  return parsed.success ? parsed.data : orderFiltersSchema.parse({});
}

function algiersDay(iso: string, end: boolean): Date | null {
  const d = parseISO(iso);
  if (!isValid(d)) return null;
  const tz = new TZDate(d.getFullYear(), d.getMonth(), d.getDate(), "Africa/Algiers");
  return new Date((end ? endOfDay(tz) : startOfDay(tz)).getTime());
}

export function filtersToWhere(f: OrderFilters): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};
  if (f.range === "custom") {
    const from = f.from ? algiersDay(f.from, false) : null;
    const to = f.to ? algiersDay(f.to, true) : null;
    if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
  } else if (f.range !== "all") {
    const r = range(f.range as RangeKey);
    where.createdAt = { gte: r.from, lte: r.to };
  }
  if (f.status) where.status = f.status;
  if (f.type) where.type = f.type;
  if (f.worker) where.handledById = f.worker;
  if (f.table) where.tableNumber = f.table;
  if (f.q) {
    const q = f.q;
    const n = Number.parseInt(q.replace(/^#/, ""), 10);
    const digits = q.replace(/\D/g, "");
    where.OR = [
      { customerName: { contains: q, mode: "insensitive" } },
      ...(digits.length >= 4 ? [{ customerPhone: { contains: digits.replace(/^0/, "") } }] : []),
      ...(Number.isFinite(n) ? [{ number: n }] : []),
    ];
  }
  return where;
}

export const PAGE_SIZE = 50;

export async function listOrders(f: OrderFilters) {
  const where = filtersToWhere(f);
  const [total, orders] = await Promise.all([
    db().order.count({ where }),
    db().order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (f.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { items: { select: { nameSnapshot: true, qty: true } }, handledBy: { select: { id: true, name: true } } },
    }),
  ]);
  return { total, orders, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getOrderForAdmin(id: string) {
  return db().order.findUnique({ where: { id }, include: orderWithItems });
}

export async function listStaffForFilter() {
  return db().user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, active: true } });
}

/** One CSV row per order item; order columns repeated. */
export async function* iterateOrdersForExport(f: OrderFilters) {
  const where = filtersToWhere(f);
  let cursor: string | undefined;
  for (;;) {
    const batch = await db().order.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: 200,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: { items: true, handledBy: { select: { name: true } } },
    });
    if (batch.length === 0) return;
    for (const o of batch) yield o;
    cursor = batch[batch.length - 1].id;
    if (batch.length < 200) return;
  }
}

/* ------------------------------------------------------------------ */
/* Reviews                                                              */
/* ------------------------------------------------------------------ */

export async function listReviews(status: ReviewStatus, locale: AppLocale) {
  const rows = await db().review.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      product: { include: { translations: true } },
      order: { select: { number: true, dayKey: true, customerPhone: true, customerName: true } },
      customer: { select: { phone: true, name: true } },
    },
  });
  return rows.map((r) => {
    const tr = r.product.translations.find((t) => t.locale === locale) ?? r.product.translations.find((t) => t.locale === "fr");
    return {
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      status: r.status,
      createdAt: r.createdAt,
      productName: tr?.name ?? "",
      orderNumber: r.order.number,
      orderDay: r.order.dayKey,
      phone: r.customer?.phone ?? r.order.customerPhone,
      customerName: r.customer?.name ?? r.order.customerName,
    };
  });
}

export async function countReviews() {
  const rows = await db().review.groupBy({ by: ["status"], _count: { _all: true } });
  const out: Record<ReviewStatus, number> = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
  for (const r of rows) out[r.status] = r._count._all;
  return out;
}

export { dayKey, toAlgiers };
