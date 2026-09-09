import { describe, expect, it } from "vitest";
import { formatDA, parseDA } from "@/lib/money";
import { normalizePhone, formatPhone } from "@/lib/phone";
import { openState, DEFAULT_HOURS, dayKey, nextOpening } from "@/lib/time";

describe("money", () => {
  it("formats whole dinars with thin grouping and locale label", () => {
    expect(formatDA(450, "fr")).toBe("450\u00A0DA");
    expect(formatDA(1950, "en")).toBe("1\u202F950\u00A0DA");
    expect(formatDA(1950, "ar")).toBe("1\u202F950\u00A0دج");
    expect(parseDA("1 950 DA")).toBe(1950);
  });
});

describe("phone", () => {
  it("normalises Algerian numbers to +213", () => {
    expect(normalizePhone("05 55 12 34 56")).toBe("+213555123456");
    expect(normalizePhone("+213 555 12 34 56")).toBe("+213555123456");
    expect(normalizePhone("033 12 34 56")).toBe("+21333123456");
    expect(normalizePhone("12345")).toBeNull();
    expect(formatPhone("+213555123456")).toBe("05 55 12 34 56");
  });
});

describe("opening hours in Africa/Algiers", () => {
  it("is open at 10:00 on a Monday and closed at 10:00 on a Friday", () => {
    // 2026-09-07 is a Monday; Algiers is UTC+1 all year.
    const mon = new Date("2026-09-07T09:00:00Z");
    expect(openState(DEFAULT_HOURS, mon).open).toBe(true);
    const fri = new Date("2026-09-11T09:00:00Z");
    const s = openState(DEFAULT_HOURS, fri);
    expect(s.open).toBe(false);
    if (!s.open) expect(s.openLabel).toBe("16:00");
  });
  it("closes at 23:00 local and buckets the day key in Algiers", () => {
    const late = new Date("2026-09-07T22:30:00Z"); // 23:30 Algiers
    expect(openState(DEFAULT_HOURS, late).open).toBe(false);
    expect(dayKey(new Date("2026-09-07T23:30:00Z"))).toBe("2026-09-08");
  });
  it("sold-out-for-today clears at the next opening", () => {
    const at = new Date("2026-09-07T15:00:00Z");
    const next = nextOpening(DEFAULT_HOURS, at);
    expect(next.toISOString()).toBe("2026-09-08T06:30:00.000Z");
  });
});
