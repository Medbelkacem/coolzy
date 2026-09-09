import { db } from "./db";
import { ACTIVE, TERMINAL, orderWithItems, toOrderDTO, type OrderDTO } from "./orders";

const RECENT_MS = 30 * 60 * 1000;

/** Everything the board shows: active orders plus those finished in the last 30 minutes. */
export async function boardSnapshot(): Promise<OrderDTO[]> {
  const rows = await db().order.findMany({
    where: {
      OR: [{ status: { in: ACTIVE } }, { status: { in: TERMINAL }, updatedAt: { gte: new Date(Date.now() - RECENT_MS) } }],
    },
    include: orderWithItems,
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toOrderDTO);
}

/** Orders touched since `since` (inclusive — the client dedupes by id + updatedAt). */
export async function boardChangesSince(since: Date): Promise<OrderDTO[]> {
  const rows = await db().order.findMany({
    where: { updatedAt: { gte: since } },
    include: orderWithItems,
    orderBy: { updatedAt: "asc" },
  });
  return rows.map(toOrderDTO);
}

export function maxUpdatedAt(orders: OrderDTO[], fallback: Date): Date {
  let max = fallback.getTime();
  for (const o of orders) {
    const t = Date.parse(o.updatedAt);
    if (t > max) max = t;
  }
  return new Date(max);
}
