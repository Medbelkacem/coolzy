import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { createOrder, orderInputSchema, quoteOrder } from "@/lib/orders";
import { ActionError } from "@/lib/action";
import { nextOpening, DEFAULT_HOURS } from "@/lib/time";

/**
 * The money invariants, exercised against a real database.
 *
 * The client sends a product id and a quantity. It never sends a price, a line
 * total or an order total — and if it tries, none of it survives. These tests
 * are the proof, not the intention.
 */

const ALWAYS_OPEN = [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: "00:00", close: "23:59", closed: false }));

let categoryId: string;
let productId: string;
let soldOutId: string;
const made: string[] = [];

beforeAll(async () => {
  await db().shop.upsert({
    where: { id: 1 },
    create: { id: 1, tableCount: 10, deliveryFee: 300, hours: ALWAYS_OPEN },
    update: { tableCount: 10, deliveryFee: 300, hours: ALWAYS_OPEN, deliveryHours: Prisma.JsonNull },
  });
  const category = await db().category.create({
    data: { slug: `integrity-${Date.now()}`, accent: "rose", translations: { create: { locale: "fr", name: "Intégrité" } } },
  });
  categoryId = category.id;
  const product = await db().product.create({
    data: { categoryId, price: 650, costPrice: 200, translations: { create: { locale: "fr", name: "Pink Lady" } } },
  });
  productId = product.id;
  const sold = await db().product.create({
    data: { categoryId, price: 500, available: false, translations: { create: { locale: "fr", name: "Épuisé" } } },
  });
  soldOutId = sold.id;
});

afterAll(async () => {
  if (made.length) await db().order.deleteMany({ where: { id: { in: made } } });
  await db().product.deleteMany({ where: { categoryId } });
  await db().category.delete({ where: { id: categoryId } }).catch(() => {});
  await db().$disconnect();
});

async function place(input: Parameters<typeof createOrder>[0]) {
  const order = await createOrder(input, { clientToken: null });
  made.push(order.id);
  return order;
}

describe("a client-sent total is never trusted", () => {
  it("strips forged prices and totals before they reach the server logic", () => {
    const forged = {
      type: "TABLE",
      locale: "fr",
      tableNumber: 3,
      total: 1,
      subtotal: 1,
      deliveryFee: 0,
      items: [{ productId, qty: 2, unitPrice: 1, price: 1, total: 2 }],
    };
    const parsed = orderInputSchema.parse(forged);
    expect(parsed).not.toHaveProperty("total");
    expect(parsed).not.toHaveProperty("subtotal");
    expect(parsed.items[0]).not.toHaveProperty("unitPrice");
    expect(parsed.items[0]).not.toHaveProperty("price");
    expect(parsed.items[0]).toEqual({ productId, qty: 2 });
  });

  it("stores the catalogue price, not the one the client claimed", async () => {
    const order = await place({ type: "TABLE", locale: "fr", tableNumber: 3, items: [{ productId, qty: 2 }] });
    expect(order.items[0].unitPrice).toBe(650);
    expect(order.subtotal).toBe(1300);
    expect(order.deliveryFee).toBe(0);
    expect(order.total).toBe(1300);
  });

  it("adds the shop's delivery fee, whatever the client says", async () => {
    const order = await place({
      type: "DELIVERY",
      locale: "fr",
      items: [{ productId, qty: 1 }],
      customerName: "Test",
      customerPhone: "0555123456",
      address: "Rue de la Liberté",
    });
    expect(order.deliveryFee).toBe(300);
    expect(order.total).toBe(order.subtotal + 300);
    expect(order.total).toBe(950);
  });

  it("never lets a table order carry a delivery fee", async () => {
    const order = await place({ type: "TABLE", locale: "fr", tableNumber: 1, items: [{ productId, qty: 1 }] });
    expect(order.deliveryFee).toBe(0);
    expect(order.total).toBe(650);
  });

  it("snapshots the price so a later price change never rewrites a past order", async () => {
    const order = await place({ type: "TABLE", locale: "fr", tableNumber: 2, items: [{ productId, qty: 1 }] });
    await db().product.update({ where: { id: productId }, data: { price: 900 } });
    const reread = await db().order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true } });
    expect(reread.items[0].unitPrice).toBe(650);
    expect(reread.total).toBe(650);
    // and a new order picks up the new price
    const after = await place({ type: "TABLE", locale: "fr", tableNumber: 2, items: [{ productId, qty: 1 }] });
    expect(after.total).toBe(900);
    await db().product.update({ where: { id: productId }, data: { price: 650 } });
  });
});

describe("quantities and tables are validated on the server", () => {
  it.each([
    ["zero", 0],
    ["negative", -5],
    ["fractional", 1.5],
    ["absurd", 9999],
  ])("rejects a %s quantity", (_label, qty) => {
    const r = orderInputSchema.safeParse({ type: "TABLE", locale: "fr", tableNumber: 1, items: [{ productId, qty }] });
    expect(r.success).toBe(false);
  });

  it("rejects a table number the shop does not have", async () => {
    await expect(
      createOrder({ type: "TABLE", locale: "fr", tableNumber: 99, items: [{ productId, qty: 1 }] }, { clientToken: null }),
    ).rejects.toBeInstanceOf(ActionError);
  });

  it("rejects an empty cart", () => {
    expect(orderInputSchema.safeParse({ type: "TABLE", locale: "fr", tableNumber: 1, items: [] }).success).toBe(false);
  });

  it("refuses a sold-out product even if it is still in the cart", async () => {
    await expect(
      createOrder({ type: "TABLE", locale: "fr", tableNumber: 1, items: [{ productId: soldOutId, qty: 1 }] }, { clientToken: null }),
    ).rejects.toMatchObject({ key: "productUnavailable" });
  });

  it("refuses a product marked sold out for the day", async () => {
    await db().product.update({ where: { id: productId }, data: { soldOutUntil: nextOpening(DEFAULT_HOURS) } });
    await expect(
      createOrder({ type: "TABLE", locale: "fr", tableNumber: 1, items: [{ productId, qty: 1 }] }, { clientToken: null }),
    ).rejects.toMatchObject({ key: "productUnavailable" });
    await db().product.update({ where: { id: productId }, data: { soldOutUntil: null } });
  });

  it("refuses an id that is not on the menu at all", async () => {
    await expect(
      createOrder({ type: "TABLE", locale: "fr", tableNumber: 1, items: [{ productId: "does-not-exist", qty: 1 }] }, { clientToken: null }),
    ).rejects.toMatchObject({ key: "productUnavailable" });
  });
});

describe("the shop's own rules bound every order", () => {
  it("refuses orders while the shop is closed", async () => {
    await db().shop.update({ where: { id: 1 }, data: { hours: ALWAYS_OPEN.map((h) => ({ ...h, closed: true })) } });
    await expect(
      createOrder({ type: "TABLE", locale: "fr", tableNumber: 1, items: [{ productId, qty: 1 }] }, { clientToken: null }),
    ).rejects.toMatchObject({ key: "shopClosed" });
    await db().shop.update({ where: { id: 1 }, data: { hours: ALWAYS_OPEN } });
  });

  it("refuses delivery outside the delivery window while table orders still work", async () => {
    await db().shop.update({ where: { id: 1 }, data: { deliveryHours: ALWAYS_OPEN.map((h) => ({ ...h, closed: true })) } });
    await expect(
      createOrder(
        { type: "DELIVERY", locale: "fr", items: [{ productId, qty: 1 }], customerName: "T", customerPhone: "0555123456", address: "Rue" },
        { clientToken: null },
      ),
    ).rejects.toMatchObject({ key: "deliveryClosed" });
    const table = await place({ type: "TABLE", locale: "fr", tableNumber: 1, items: [{ productId, qty: 1 }] });
    expect(table.total).toBe(650);
    await db().shop.update({ where: { id: 1 }, data: { deliveryHours: Prisma.JsonNull } });
  });

  it("quotes the same numbers it would charge", async () => {
    const input = { type: "DELIVERY" as const, locale: "fr" as const, items: [{ productId, qty: 3 }], customerName: "T", customerPhone: "0555123456", address: "Rue" };
    const quote = await quoteOrder(input);
    const order = await place(input);
    expect(order.subtotal).toBe(quote.subtotal);
    expect(order.deliveryFee).toBe(quote.deliveryFee);
    expect(order.total).toBe(quote.total);
  });

  it("normalises the phone number rather than storing what was typed", async () => {
    const order = await place({
      type: "DELIVERY",
      locale: "fr",
      items: [{ productId, qty: 1 }],
      customerName: "T",
      customerPhone: "05 55 12 34 56",
      address: "Rue",
    });
    expect(order.customerPhone).toBe("+213555123456");
  });
});
