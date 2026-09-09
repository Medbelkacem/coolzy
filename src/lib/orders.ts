import { randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "./db";
import { getShop } from "./shop";
import { dayKey, openState } from "./time";
import { ActionError } from "./action";
import { audit } from "./audit";
import { normalizePhone } from "./customer";
import { OrderStatus, type Locale } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { locales } from "@/i18n/config";

/* State machine lives in order-flow.ts (pure, client-safe); re-exported here. */
import { TERMINAL_STATUSES, ACTIVE_STATUSES, canTransition, displayNumber } from "./order-flow";
export { flowFor, isTerminal, nextStatus, canTransition, displayNumber } from "./order-flow";
export const TERMINAL = TERMINAL_STATUSES;
export const ACTIVE = ACTIVE_STATUSES;

/* ------------------------------------------------------------------ */
/* Creation — the server recomputes every number.                       */
/* ------------------------------------------------------------------ */

export const orderInputSchema = z
  .object({
    type: z.enum(["TABLE", "DELIVERY"]),
    locale: z.enum(locales),
    tableNumber: z.number().int().min(1).max(999).optional(),
    items: z
      .array(
        z.object({
          productId: z.string().min(1).max(64),
          qty: z.number().int().min(1).max(50),
          note: z.string().trim().max(140).optional(),
        }),
      )
      .min(1)
      .max(40),
    note: z.string().trim().max(300).optional(),
    customerName: z.string().trim().max(80).optional(),
    customerPhone: z.string().trim().max(30).optional(),
    address: z.string().trim().max(240).optional(),
    landmark: z.string().trim().max(160).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.type === "TABLE" && !v.tableNumber) ctx.addIssue({ code: "custom", path: ["tableNumber"], message: "tableInvalid" });
    if (v.type === "DELIVERY") {
      if (!v.customerName) ctx.addIssue({ code: "custom", path: ["customerName"], message: "invalid" });
      if (!v.customerPhone) ctx.addIssue({ code: "custom", path: ["customerPhone"], message: "phoneInvalid" });
      if (!v.address) ctx.addIssue({ code: "custom", path: ["address"], message: "invalid" });
    }
  });
export type OrderInput = z.infer<typeof orderInputSchema>;

export const orderWithItems = {
  items: { orderBy: { id: "asc" as const } },
  events: { orderBy: { at: "asc" as const }, include: { byUser: { select: { id: true, name: true } } } },
  handledBy: { select: { id: true, name: true } },
} satisfies Prisma.OrderInclude;
export type OrderFull = Prisma.OrderGetPayload<{ include: typeof orderWithItems }>;

/** Quote an order without persisting it: validates and returns the totals the client must see. */
export async function quoteOrder(input: OrderInput) {
  const shop = await getShop();
  const now = new Date();
  const open = openState(shop.hours, now);
  if (!open.open) throw new ActionError("shopClosed");
  if (input.type === "DELIVERY") {
    const dOpen = openState(shop.deliveryHours ?? shop.hours, now);
    if (!dOpen.open) throw new ActionError("deliveryClosed");
  }
  if (input.type === "TABLE") {
    if (shop.tableCount < 1) throw new ActionError("tableCountUnset");
    if (!input.tableNumber || input.tableNumber > shop.tableCount) throw new ActionError("tableInvalid", { tableNumber: "tableInvalid" });
  }
  const ids = [...new Set(input.items.map((i) => i.productId))];
  const products = await db().product.findMany({
    where: { id: { in: ids }, category: { active: true } },
    include: { translations: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines = input.items.map((it) => {
    const p = byId.get(it.productId);
    if (!p) throw new ActionError("productUnavailable");
    const soldOut = !p.available || (p.soldOutUntil !== null && p.soldOutUntil.getTime() > now.getTime());
    if (soldOut) throw new ActionError("productUnavailable");
    const tr = p.translations.find((t) => t.locale === input.locale) ?? p.translations.find((t) => t.locale === "fr");
    return {
      productId: p.id,
      nameSnapshot: tr?.name ?? p.id,
      unitPrice: p.price,
      costSnapshot: p.costPrice,
      qty: it.qty,
      note: it.note || null,
    };
  });
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const deliveryFee = input.type === "DELIVERY" ? shop.deliveryFee : 0;
  return { shop, lines, subtotal, deliveryFee, total: subtotal + deliveryFee };
}

export async function createOrder(input: OrderInput, ctx: { clientToken: string | null; actorId?: string | null }) {
  const { lines, subtotal, deliveryFee, total } = await quoteOrder(input);
  const phone = input.customerPhone ? normalizePhone(input.customerPhone) : null;
  if (input.type === "DELIVERY" && !phone) throw new ActionError("phoneInvalid", { customerPhone: "phoneInvalid" });

  // Link to a claimed customer if this browser token was bound to one.
  const customer = ctx.clientToken ? await db().customer.findUnique({ where: { token: ctx.clientToken } }) : null;
  const key = dayKey();
  const token = randomBytes(18).toString("base64url");

  // Daily-sequential numbers: serialise allocation per day with an advisory
  // lock so 50 concurrent orders never collide, plus a retry as a backstop.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db().$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"order-number:" + key}))`;
        const last = await tx.order.findFirst({ where: { dayKey: key }, orderBy: { number: "desc" }, select: { number: true } });
        const number = (last?.number ?? 0) + 1;
        return tx.order.create({
          data: {
            token,
            dayKey: key,
            number,
            type: input.type,
            tableNumber: input.type === "TABLE" ? input.tableNumber : null,
            subtotal,
            deliveryFee,
            total,
            note: input.note || null,
            clientToken: ctx.clientToken,
            customerId: customer?.id ?? null,
            customerPhone: phone,
            customerName: input.customerName || customer?.name || null,
            address: input.type === "DELIVERY" ? input.address : null,
            landmark: input.type === "DELIVERY" ? input.landmark || null : null,
            locale: input.locale as Locale,
            items: { create: lines },
            events: { create: { status: "RECEIVED", byUserId: ctx.actorId ?? null } },
          },
          include: orderWithItems,
        });
      }, { timeout: 15_000 });
    } catch (err) {
      if ((err as { code?: string }).code === "P2002" && attempt < 2) continue;
      throw err;
    }
  }
  throw new ActionError("conflict");
}

/* ------------------------------------------------------------------ */
/* Transitions — append-only events, worker attribution.                */
/* ------------------------------------------------------------------ */

export async function transitionOrder(opts: {
  orderId: string;
  to: OrderStatus;
  actorId: string;
  reason?: string;
  override?: boolean;
}): Promise<OrderFull> {
  const order = await db().order.findUnique({ where: { id: opts.orderId } });
  if (!order) throw new ActionError("notFound");
  if (!canTransition(order.type, order.status, opts.to, opts.override)) throw new ActionError("transitionInvalid");
  const reason = opts.reason?.trim() || null;
  if (opts.to === "CANCELLED" && !reason) throw new ActionError("reasonRequired", { reason: "reasonRequired" });

  const updated = await db().order.update({
    where: { id: order.id },
    data: {
      status: opts.to,
      handledById: order.handledById ?? opts.actorId,
      cancelReason: opts.to === "CANCELLED" ? reason : order.cancelReason,
      events: { create: { status: opts.to, byUserId: opts.actorId, reason } },
    },
    include: orderWithItems,
  });
  if (opts.override) await audit(opts.actorId, "order.override", "Order", order.id, { from: order.status, to: opts.to, reason });
  return updated;
}

/** A plain, serialisable order for client components and SSE payloads. */
export function toOrderDTO(o: OrderFull) {
  return {
    id: o.id,
    token: o.token,
    number: o.number,
    display: displayNumber(o.number),
    dayKey: o.dayKey,
    type: o.type,
    status: o.status,
    tableNumber: o.tableNumber,
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee,
    total: o.total,
    note: o.note,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    address: o.address,
    landmark: o.landmark,
    locale: o.locale,
    cancelReason: o.cancelReason,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    handledBy: o.handledBy ? { id: o.handledBy.id, name: o.handledBy.name } : null,
    items: o.items.map((i) => ({ id: i.id, productId: i.productId, name: i.nameSnapshot, unitPrice: i.unitPrice, qty: i.qty, note: i.note })),
    events: o.events.map((e) => ({ id: e.id, status: e.status, at: e.at.toISOString(), by: e.byUser ? { id: e.byUser.id, name: e.byUser.name } : null, reason: e.reason })),
  };
}
export type OrderDTO = ReturnType<typeof toOrderDTO>;
