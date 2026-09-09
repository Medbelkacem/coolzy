import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { TZ, toAlgiers } from "./time";

/** "YYYY-MM-DD" (an HTML date input) → start of that day in Algiers, as a UTC Date. */
export function dayStart(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new TZDate(+m[1], +m[2] - 1, +m[3], 0, 0, 0, TZ);
  return Number.isNaN(d.getTime()) ? null : new Date(d.getTime());
}
/** "YYYY-MM-DD" → end of that day in Algiers (23:59:59.999). */
export function dayEnd(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new TZDate(+m[1], +m[2] - 1, +m[3], 23, 59, 59, 999, TZ);
  return Number.isNaN(d.getTime()) ? null : new Date(d.getTime());
}
/** "YYYY-MM-DD" → noon Algiers; safe for "a date" fields (expenses, payments, hire date). */
export function dayNoon(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new TZDate(+m[1], +m[2] - 1, +m[3], 12, 0, 0, TZ);
  return Number.isNaN(d.getTime()) ? null : new Date(d.getTime());
}
export function toDateInput(d: Date | null | undefined): string {
  return d ? format(toAlgiers(d), "yyyy-MM-dd") : "";
}
