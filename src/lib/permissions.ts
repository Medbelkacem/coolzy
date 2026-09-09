import type { Role } from "@/generated/prisma/enums";

/**
 * The single permission table. Every server action and route handler goes
 * through `can()` / `requirePermission()` (see authz.ts). Rows mirror §4 of
 * the brief. Pure module: no framework imports, so it is unit-testable.
 */
export const PERMISSIONS = {
  "menu.read": ["PUBLIC", "ADMIN", "WORKER"],
  "order.create": ["PUBLIC", "ADMIN"],
  "order.track_own": ["PUBLIC"],
  "review.create_own": ["PUBLIC"],
  "board.read": ["WORKER", "ADMIN"],
  "board.advance": ["WORKER", "ADMIN"],
  "order.details": ["WORKER", "ADMIN"],
  "orders.history_own": ["PUBLIC"],
  "orders.history_7d": ["WORKER", "ADMIN"],
  "orders.history_all": ["ADMIN"],
  "orders.override": ["ADMIN"],
  "orders.export": ["ADMIN"],
  "menu.manage": ["ADMIN"],
  "menu.mark_sold_out": ["WORKER", "ADMIN"],
  "staff.manage": ["ADMIN"],
  "salary.read_own": ["WORKER", "ADMIN"],
  "salary.manage": ["ADMIN"],
  "finance.read": ["ADMIN"],
  "expenses.manage": ["ADMIN"],
  "reviews.moderate": ["ADMIN"],
  "settings.manage": ["ADMIN"],
} as const satisfies Record<string, readonly ("PUBLIC" | Role)[]>;

export type Permission = keyof typeof PERMISSIONS;
export type Actor = { id: string; role: Role; username: string; name: string | null } | null;

export function can(actor: Actor, permission: Permission): boolean {
  const allowed = PERMISSIONS[permission] as readonly string[];
  if (allowed.includes("PUBLIC")) return true;
  if (!actor) return false;
  return allowed.includes(actor.role);
}
