"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/authz";
import { guarded, ok, fail, type ActionResult, type ErrorKey } from "@/lib/action";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { normalizePhone } from "@/lib/customer";
import { l10nSchema } from "@/lib/l10n";
import { getShop } from "@/lib/shop";
import type { DayHours } from "@/lib/time";
import { Prisma } from "@/generated/prisma/client";

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const daySchema = z.object({ day: z.number().int().min(0).max(6), open: hhmm, close: hhmm, closed: z.boolean() });
const url = z.string().trim().max(300).url().or(z.literal(""));

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  address: z.string().trim().max(200),
  phone: z.string().trim().max(30),
  instagram: url,
  mapsUrl: url,
  tagline: l10nSchema(120, false),
  hours: z.array(daySchema).length(7),
  deliveryFee: z.coerce.number().int().min(0).max(100000),
  deliverySame: z.boolean(),
  deliveryHours: z.array(daySchema).length(7),
  deliveryZoneNote: l10nSchema(300, false),
  tableCount: z.coerce.number().int().min(0).max(999),
  houseRules: l10nSchema(2000, false),
  currencyLabel: l10nSchema(8, false),
});

function readHours(form: FormData, prefix: string): DayHours[] {
  return [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day,
    open: String(form.get(`${prefix}.${day}.open`) ?? ""),
    close: String(form.get(`${prefix}.${day}.close`) ?? ""),
    closed: form.get(`${prefix}.${day}.closed`) === "on",
  }));
}
function readL10n(form: FormData, key: string) {
  return { fr: String(form.get(`${key}.fr`) ?? ""), en: String(form.get(`${key}.en`) ?? ""), ar: String(form.get(`${key}.ar`) ?? "") };
}

export async function saveSettings(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const actor = await requirePermission("settings.manage");
    const raw = {
      name: form.get("name"),
      address: form.get("address"),
      phone: form.get("phone"),
      instagram: form.get("instagram"),
      mapsUrl: form.get("mapsUrl"),
      tagline: readL10n(form, "tagline"),
      hours: readHours(form, "hours"),
      deliveryFee: form.get("deliveryFee"),
      deliverySame: form.get("deliverySame") === "on",
      deliveryHours: readHours(form, "dhours"),
      deliveryZoneNote: readL10n(form, "deliveryZoneNote"),
      tableCount: form.get("tableCount"),
      houseRules: readL10n(form, "houseRules"),
      currencyLabel: readL10n(form, "currencyLabel"),
    };
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors: Record<string, ErrorKey> = {};
      for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] = "invalid";
      return fail("invalid", fieldErrors);
    }
    const d = parsed.data;
    const fieldErrors: Record<string, ErrorKey> = {};
    let phone = "";
    if (d.phone) {
      const n = normalizePhone(d.phone);
      if (!n) fieldErrors.phone = "phoneInvalid";
      else phone = n;
    }
    for (const [prefix, hours] of [["hours", d.hours], ["dhours", d.deliveryHours]] as const) {
      if (prefix === "dhours" && d.deliverySame) continue;
      for (const h of hours) if (!h.closed && h.close <= h.open) fieldErrors[`${prefix}.${h.day}`] = "invalid";
    }
    if (Object.keys(fieldErrors).length) return fail("invalid", fieldErrors);

    await getShop(); // guarantees the row exists with the shop defaults
    await db().shop.update({
      where: { id: 1 },
      data: {
        name: d.name,
        address: d.address,
        phone,
        instagram: d.instagram,
        mapsUrl: d.mapsUrl,
        tagline: d.tagline,
        hours: d.hours,
        deliveryFee: d.deliveryFee,
        deliveryHours: d.deliverySame ? Prisma.JsonNull : d.deliveryHours,
        deliveryZoneNote: d.deliveryZoneNote,
        tableCount: d.tableCount,
        houseRules: d.houseRules,
        currencyLabel: d.currencyLabel,
      },
    });
    await audit(actor.id, "settings.update", "Shop", "1", { tableCount: d.tableCount, deliveryFee: d.deliveryFee, phone });
    revalidatePath("/", "layout");
    return ok();
  });
}
