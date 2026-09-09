/** Pure phone helpers, safe to import from client components. */

/** Algerian mobile/landline: accepts +213XXXXXXXXX or 0XXXXXXXXX; returns +213 form. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[\s.\-()]/g, "");
  let m = digits.match(/^(?:\+213|00213)([5-7]\d{8})$/) ?? digits.match(/^0([5-7]\d{8})$/);
  if (m) return `+213${m[1]}`;
  m = digits.match(/^(?:\+213|00213)([2-4]\d{7})$/) ?? digits.match(/^0([2-4]\d{7})$/);
  if (m) return `+213${m[1]}`;
  return null;
}

/** +213XXXXXXXXX → 0X XX XX XX XX for display. */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  const m = e164.match(/^\+213(\d{8,9})$/);
  if (!m) return e164;
  const local = "0" + m[1];
  return local.length === 10
    ? local.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4 $5")
    : local.replace(/(\d{3})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4");
}
