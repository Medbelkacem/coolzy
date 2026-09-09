import type { AppLocale } from "@/i18n/config";

/** Whole dinars, thin thousands separator, currency label per locale. */
export function formatDA(amount: number, locale: AppLocale, label?: string): string {
  const n = Math.round(amount);
  const grouped = Math.abs(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const sign = n < 0 ? "−" : "";
  const unit = label ?? (locale === "ar" ? "دج" : "DA");
  return `${sign}${grouped} ${unit}`;
}

export function parseDA(input: string): number | null {
  const cleaned = input.replace(/[^\d-]/g, "");
  if (!cleaned) return null;
  const n = Number.parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : null;
}
