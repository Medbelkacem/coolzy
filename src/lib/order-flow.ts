/**
 * The order state machine, pure and client-safe (no db, no headers).
 * `src/lib/orders.ts` holds the server-side logic; this file is what client
 * components import so the Prisma client never lands in a browser bundle.
 */
import type { OrderStatus, OrderType } from "@/generated/prisma/enums";

const FLOW: Record<OrderType, OrderStatus[]> = {
  TABLE: ["RECEIVED", "APPROVED", "PREPARING", "READY", "COMPLETED"],
  DELIVERY: ["RECEIVED", "APPROVED", "PREPARING", "READY", "DELIVERED"],
};

export const TERMINAL_STATUSES: OrderStatus[] = ["COMPLETED", "DELIVERED", "CANCELLED"];
export const ACTIVE_STATUSES: OrderStatus[] = ["RECEIVED", "APPROVED", "PREPARING", "READY"];

export function flowFor(type: OrderType): OrderStatus[] {
  return FLOW[type];
}
export function isTerminal(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}
/** The one forward step a worker can take from `status`, or null. */
export function nextStatus(type: OrderType, status: OrderStatus): OrderStatus | null {
  const flow = FLOW[type];
  const i = flow.indexOf(status);
  return i >= 0 && i < flow.length - 1 ? flow[i + 1] : null;
}
export function displayNumber(n: number): string {
  return `#${String(n).padStart(4, "0")}`;
}

/**
 * Same number, wrapped in Unicode isolates so the "#" stays on the left of the
 * digits inside an Arabic line. Use for order numbers interpolated into
 * translated strings; JSX should use the <OrderNumber> component instead.
 */
export function displayNumberBidi(n: number): string {
  return `\u2066${displayNumber(n)}\u2069`;
}

/** Workers move forward one step or cancel. Admins may override anything. */
export function canTransition(type: OrderType, from: OrderStatus, to: OrderStatus, override = false): boolean {
  if (from === to) return false;
  if (override) return true;
  if (to === "CANCELLED") return !isTerminal(from);
  return nextStatus(type, from) === to;
}
