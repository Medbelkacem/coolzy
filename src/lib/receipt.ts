import { db } from "./db";
import { orderWithItems, type OrderFull } from "./orders";

const TOKEN_RE = /^[A-Za-z0-9_-]{20,32}$/;

/** The receipt token is the capability: anyone holding it may read the order. */
export async function getOrderByToken(token: string): Promise<OrderFull | null> {
  if (!TOKEN_RE.test(token)) return null;
  return db().order.findUnique({ where: { token }, include: orderWithItems });
}

/**
 * Orders visible to a browser: those carrying its client token, plus — when
 * the token has been bound to a claimed Customer — every order on that phone.
 */
export async function getHistoryForClient(clientToken: string | null) {
  if (!clientToken) return { orders: [] as OrderFull[], customer: null };
  const customer = await db().customer.findUnique({ where: { token: clientToken } });
  const orders = await db().order.findMany({
    where: customer
      ? { OR: [{ clientToken }, { customerId: customer.id }, { customerPhone: customer.phone }] }
      : { clientToken },
    include: orderWithItems,
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  return { orders, customer };
}
