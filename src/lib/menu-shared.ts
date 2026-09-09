/** Pure helpers shared by server and client code — no database import here. */
import type { Accent } from "@/generated/prisma/enums";
import type { AppLocale } from "@/i18n/config";

export const ACCENTS: Accent[] = ["rose", "melon", "curacao", "colada", "bean", "mint"];
export const ACCENT_HEX: Record<Accent, string> = {
  rose: "#E4457E",
  melon: "#E5372F",
  curacao: "#1B93C4",
  colada: "#C79A4B",
  bean: "#8B5E3C",
  mint: "#4F8A5B",
};

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function missingLocales(rows: { locale: string; name: string }[]): AppLocale[] {
  return (["en", "ar"] as AppLocale[]).filter((l) => !rows.find((r) => r.locale === l && r.name.trim()));
}

export function isSoldOut(p: { available: boolean; soldOutUntil: Date | null }, now = new Date()): boolean {
  return !p.available || (p.soldOutUntil !== null && p.soldOutUntil.getTime() > now.getTime());
}
