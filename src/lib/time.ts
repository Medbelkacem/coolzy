import { TZDate } from "@date-fns/tz";
import { addDays, format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";

export const TZ = "Africa/Algiers";

export type DayHours = { day: number; open: string; close: string; closed: boolean };

export const DEFAULT_HOURS: DayHours[] = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
  day,
  open: day === 5 ? "16:00" : "07:30",
  close: "23:00",
  closed: false,
}));

export function nowAlgiers(): TZDate {
  return new TZDate(Date.now(), TZ);
}
export function toAlgiers(d: Date | number | string): TZDate {
  return new TZDate(new Date(d).getTime(), TZ);
}
/** YYYY-MM-DD in Algiers */
export function dayKey(d: Date = new Date()): string {
  return format(toAlgiers(d), "yyyy-MM-dd");
}
export function hourOf(d: Date): number {
  return toAlgiers(d).getHours();
}
export function weekdayOf(d: Date): number {
  return toAlgiers(d).getDay();
}

function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function normalizeHours(raw: unknown): DayHours[] {
  if (!Array.isArray(raw) || raw.length !== 7) return DEFAULT_HOURS;
  return DEFAULT_HOURS.map((def) => {
    const found = (raw as DayHours[]).find((r) => r && r.day === def.day);
    if (!found) return def;
    return {
      day: def.day,
      open: /^\d{2}:\d{2}$/.test(found.open) ? found.open : def.open,
      close: /^\d{2}:\d{2}$/.test(found.close) ? found.close : def.close,
      closed: Boolean(found.closed),
    };
  });
}

export type OpenState =
  | { open: true; closesAt: Date; closeLabel: string }
  | { open: false; opensAt: Date | null; openLabel: string | null; openDayOffset: number };

/** Live open/closed state computed in Algiers time. */
export function openState(hours: DayHours[], at: Date = new Date()): OpenState {
  const now = toAlgiers(at);
  const today = hours[now.getDay()];
  const cur = now.getHours() * 60 + now.getMinutes();
  if (!today.closed && cur >= minutes(today.open) && cur < minutes(today.close)) {
    const closesAt = atTime(now, today.close);
    return { open: true, closesAt, closeLabel: today.close };
  }
  // find the next opening
  for (let offset = 0; offset < 8; offset++) {
    const d = addDays(now, offset);
    const h = hours[d.getDay()];
    if (h.closed) continue;
    if (offset === 0 && cur >= minutes(h.open)) continue;
    return { open: false, opensAt: atTime(d, h.open), openLabel: h.open, openDayOffset: offset };
  }
  return { open: false, opensAt: null, openLabel: null, openDayOffset: -1 };
}

function atTime(day: TZDate, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new TZDate(day.getFullYear(), day.getMonth(), day.getDate(), h, m || 0, 0, TZ);
  return new Date(d.getTime());
}

/** The moment today's shift ends (closing time) in Algiers, or +12h if closed. */
export function shiftEnd(hours: DayHours[], at: Date = new Date()): Date {
  const now = toAlgiers(at);
  const today = hours[now.getDay()];
  const close = atTime(now, today.closed ? "23:00" : today.close);
  if (close.getTime() <= at.getTime()) return new Date(at.getTime() + 12 * 3600 * 1000);
  return close;
}

/** Next opening moment after `at` — used to auto-clear "sold out for today". */
export function nextOpening(hours: DayHours[], at: Date = new Date()): Date {
  const now = toAlgiers(at);
  for (let offset = 1; offset < 8; offset++) {
    const d = addDays(now, offset);
    const h = hours[d.getDay()];
    if (!h.closed) return atTime(d, h.open);
  }
  return new Date(at.getTime() + 24 * 3600 * 1000);
}

export type RangeKey = "today" | "yesterday" | "week" | "month" | "7d" | "30d";
export function range(key: RangeKey, at: Date = new Date()): { from: Date; to: Date; prevFrom: Date; prevTo: Date } {
  const now = toAlgiers(at);
  let from: Date, to: Date;
  switch (key) {
    case "today":
      from = startOfDay(now); to = endOfDay(now); break;
    case "yesterday": {
      const y = subDays(now, 1); from = startOfDay(y); to = endOfDay(y); break;
    }
    case "week":
      from = startOfWeek(now, { weekStartsOn: 6 }); to = endOfWeek(now, { weekStartsOn: 6 }); break;
    case "month":
      from = startOfMonth(now); to = endOfMonth(now); break;
    case "7d":
      from = startOfDay(subDays(now, 6)); to = endOfDay(now); break;
    case "30d":
      from = startOfDay(subDays(now, 29)); to = endOfDay(now); break;
  }
  const span = to.getTime() - from.getTime() + 1;
  return {
    from: new Date(from.getTime()),
    to: new Date(to.getTime()),
    prevFrom: new Date(from.getTime() - span),
    prevTo: new Date(from.getTime() - 1),
  };
}

export function fmtTime(d: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-DZ-u-nu-latn" : locale === "en" ? "en-GB" : "fr-DZ", {
    hour: "2-digit", minute: "2-digit", timeZone: TZ, hour12: false,
  }).format(d);
}
export function fmtDate(d: Date, locale: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-DZ-u-nu-latn" : locale === "en" ? "en-GB" : "fr-DZ", { ...opts, timeZone: TZ }).format(d);
}
export function fmtDateTime(d: Date, locale: string): string {
  return `${fmtDate(d, locale)} ${fmtTime(d, locale)}`;
}
