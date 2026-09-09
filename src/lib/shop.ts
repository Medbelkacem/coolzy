import { cache } from "react";
import { db } from "./db";
import { DEFAULT_HOURS, normalizeHours, type DayHours } from "./time";
import type { AppLocale } from "@/i18n/config";

export type L10n = Partial<Record<AppLocale, string>>;

export type ShopSettings = {
  id: number;
  name: string;
  tagline: L10n;
  address: string;
  phone: string;
  instagram: string;
  mapsUrl: string;
  tableCount: number;
  deliveryFee: number;
  deliveryZoneNote: L10n;
  houseRules: L10n;
  currencyLabel: L10n;
  hours: DayHours[];
  deliveryHours: DayHours[] | null;
};

/**
 * The single settings row. Created on first read with the shop's real facts
 * from the brief (hours, socials, fee). Not demo data: it is the client's
 * configuration, and every field is editable by the admin.
 */
export const getShop = cache(async (): Promise<ShopSettings> => {
  const row =
    (await db().shop.findUnique({ where: { id: 1 } })) ??
    (await db().shop.create({
      data: {
        id: 1,
        name: "Coolzy",
        tagline: { fr: "your safe place", en: "your safe place", ar: "your safe place" },
        instagram: "https://www.instagram.com/coolzy05",
        mapsUrl: "https://maps.app.goo.gl/ZpjJ4PffuTBA9ajJ7",
        deliveryFee: 300,
        hours: DEFAULT_HOURS,
        currencyLabel: { fr: "DA", en: "DA", ar: "دج" },
        houseRules: { fr: "", en: "", ar: "" },
        deliveryZoneNote: { fr: "", en: "", ar: "" },
      },
    }));
  return {
    id: row.id,
    name: row.name,
    tagline: (row.tagline as L10n) ?? {},
    address: row.address,
    phone: row.phone,
    instagram: row.instagram,
    mapsUrl: row.mapsUrl,
    tableCount: row.tableCount,
    deliveryFee: row.deliveryFee,
    deliveryZoneNote: (row.deliveryZoneNote as L10n) ?? {},
    houseRules: (row.houseRules as L10n) ?? {},
    currencyLabel: (row.currencyLabel as L10n) ?? {},
    hours: normalizeHours(row.hours),
    deliveryHours: row.deliveryHours ? normalizeHours(row.deliveryHours) : null,
  };
});
