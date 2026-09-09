export const locales = ["fr", "en", "ar"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "fr";
export const LOCALE_COOKIE = "coolzy-locale";

export function isLocale(v: unknown): v is AppLocale {
  return typeof v === "string" && (locales as readonly string[]).includes(v);
}
export function dirOf(locale: AppLocale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}
/** Pick a localized string from a {fr,en,ar} record, falling back to French. */
export function pick(rec: Partial<Record<AppLocale, string>> | null | undefined, locale: AppLocale): string {
  if (!rec) return "";
  return rec[locale]?.trim() || rec.fr?.trim() || "";
}
export const localeNames: Record<AppLocale, string> = { fr: "FR", en: "EN", ar: "ع" };
export const localeLongNames: Record<AppLocale, string> = { fr: "Français", en: "English", ar: "العربية" };
