import { describe, expect, it } from "vitest";
import { can, PERMISSIONS, type Actor } from "@/lib/permissions";

const client: Actor = null;
const worker: Actor = { id: "w", role: "WORKER", username: "w", name: "W" };
const admin: Actor = { id: "a", role: "ADMIN", username: "a", name: "A" };

/** One row per line of the permission table in §4 of the brief. */
const table: [keyof typeof PERMISSIONS, boolean, boolean, boolean][] = [
  //              permission              client  worker  admin
  ["menu.read", true, true, true],
  ["order.create", true, true, true], // PUBLIC covers everyone who can browse
  ["order.track_own", true, true, true],
  ["review.create_own", true, true, true],
  ["board.read", false, true, true],
  ["board.advance", false, true, true],
  ["order.details", false, true, true],
  ["orders.history_own", true, true, true],
  ["orders.history_7d", false, true, true],
  ["orders.history_all", false, false, true],
  ["orders.override", false, false, true],
  ["orders.export", false, false, true],
  ["menu.manage", false, false, true],
  ["menu.mark_sold_out", false, true, true],
  ["staff.manage", false, false, true],
  ["salary.read_own", false, true, true],
  ["salary.manage", false, false, true],
  ["finance.read", false, false, true],
  ["expenses.manage", false, false, true],
  ["reviews.moderate", false, false, true],
  ["settings.manage", false, false, true],
];

describe("permission table (§4)", () => {
  it.each(table)("%s → client=%s worker=%s admin=%s", (perm, c, w, a) => {
    expect(can(client, perm)).toBe(c);
    expect(can(worker, perm)).toBe(w);
    expect(can(admin, perm)).toBe(a);
  });
  it("covers every permission exactly once", () => {
    expect(new Set(table.map((r) => r[0])).size).toBe(Object.keys(PERMISSIONS).length);
  });
  it("worker never gets any finance or staff permission", () => {
    for (const p of ["finance.read", "expenses.manage", "salary.manage", "staff.manage", "orders.history_all", "settings.manage"] as const) {
      expect(can(worker, p)).toBe(false);
    }
  });
});
