import { z } from "zod";
import { locales, type AppLocale } from "@/i18n/config";

export type L10nText = Record<AppLocale, string>;

/** Zod: {fr required, en/ar optional} for translatable fields. */
export const l10nSchema = (max: number, required = true) =>
  z.object({
    fr: required ? z.string().trim().min(1).max(max) : z.string().trim().max(max),
    en: z.string().trim().max(max).default(""),
    ar: z.string().trim().max(max).default(""),
  });

export function emptyL10n(): L10nText {
  return { fr: "", en: "", ar: "" };
}

/** Rows of {locale, ...fields} → {fr:{...}, en:{...}, ar:{...}} */
export function rowsToL10n<T extends { locale: AppLocale }>(rows: T[]): Record<AppLocale, T | undefined> {
  const out = {} as Record<AppLocale, T | undefined>;
  for (const l of locales) out[l] = rows.find((r) => r.locale === l);
  return out;
}

/** Pick a field for a locale, falling back to French; `translated` says whether it was a real translation. */
export function pickRow<T extends { locale: AppLocale }>(rows: T[], locale: AppLocale): { row: T | undefined; translated: boolean } {
  const exact = rows.find((r) => r.locale === locale);
  if (exact) return { row: exact, translated: true };
  return { row: rows.find((r) => r.locale === "fr"), translated: false };
}

export function localeToIntl(locale: AppLocale): string {
  return locale === "ar" ? "ar-DZ-u-nu-latn" : locale === "en" ? "en-GB" : "fr-DZ";
}
