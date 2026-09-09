/**
 * Board load test: fires N concurrent orders at the running app's checkout
 * action path (through `createOrder`, the same code the action uses) and
 * reports how long the daily-number allocation takes under contention.
 * Local use only. Needs at least one available product in the database.
 *   pnpm tsx scripts/load-test.ts --n 50
 */
import "dotenv/config";
import { createOrder } from "../src/lib/orders";
import { db } from "../src/lib/db";

const n = Number(process.argv[process.argv.indexOf("--n") + 1] || 50);

async function main() {
  const product = await db().product.findFirst({ where: { available: true, category: { active: true } } });
  if (!product) throw new Error("no available product — build the menu first");
  const shop = await db().shop.findUnique({ where: { id: 1 } });
  const tables = Math.max(1, shop?.tableCount ?? 1);
  const t0 = performance.now();
  const results = await Promise.allSettled(
    Array.from({ length: n }, (_, i) =>
      createOrder(
        { type: "TABLE", locale: "fr", tableNumber: (i % tables) + 1, items: [{ productId: product.id, qty: 1 + (i % 3) }] },
        { clientToken: null },
      ),
    ),
  );
  const ms = performance.now() - t0;
  const ok = results.filter((r) => r.status === "fulfilled").length;
  const numbers = results.flatMap((r) => (r.status === "fulfilled" ? [r.value.number] : []));
  const dupes = numbers.length - new Set(numbers).size;
  console.log(`${ok}/${n} orders created in ${Math.round(ms)} ms (${Math.round(ms / n)} ms/order), duplicate numbers: ${dupes}`);
  for (const r of results) if (r.status === "rejected") console.error(String(r.reason).slice(0, 120));
  await db().$disconnect();
}
main();
