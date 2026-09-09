"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/authz";
import { ActionError, fail, guarded, ok, type ActionResult, type ErrorKey } from "@/lib/action";
import { l10nSchema } from "@/lib/l10n";
import { getShop } from "@/lib/shop";
import { nextOpening } from "@/lib/time";
import { storeImage, removeImage, type StoredImage } from "@/lib/upload";
import { slugify, ACCENTS } from "@/lib/menu";
import { locales } from "@/i18n/config";

function revalidate() {
  revalidatePath("/");
  revalidatePath("/admin/menu");
}

function zodToFields(issues: z.ZodIssue[]): Record<string, ErrorKey> {
  const out: Record<string, ErrorKey> = {};
  for (const i of issues) out[i.path.join(".")] = "invalid";
  return out;
}

/* ------------------------------------------------------------------ */
/* Categories                                                           */
/* ------------------------------------------------------------------ */

const categorySchema = z.object({
  name: l10nSchema(60),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,48}$/),
  accent: z.enum(ACCENTS as [string, ...string[]]),
  active: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
});
export type CategoryInput = z.infer<typeof categorySchema>;

function parseCategory(form: FormData) {
  return categorySchema.safeParse({
    name: { fr: form.get("name.fr") ?? "", en: form.get("name.en") ?? "", ar: form.get("name.ar") ?? "" },
    slug: String(form.get("slug") ?? "") || slugify(String(form.get("name.fr") ?? "")),
    accent: form.get("accent"),
    active: form.get("active") === "on",
    sortOrder: Number(form.get("sortOrder") ?? 0),
  });
}

export async function saveCategory(id: string | null, _prev: unknown, form: FormData): Promise<ActionResult<{ id: string }>> {
  return guarded(async () => {
    await requirePermission("menu.manage");
    const parsed = parseCategory(form);
    if (!parsed.success) return fail("invalid", zodToFields(parsed.error.issues));
    const d = parsed.data;
    const translations = locales.filter((l) => l === "fr" || d.name[l]).map((l) => ({ locale: l, name: d.name[l] }));
    try {
      if (id) {
        await db().category.update({
          where: { id },
          data: {
            slug: d.slug,
            accent: d.accent as CategoryInput["accent"] as never,
            active: d.active,
            sortOrder: d.sortOrder,
            translations: { deleteMany: {}, create: translations },
          },
        });
      } else {
        const max = await db().category.aggregate({ _max: { sortOrder: true } });
        const created = await db().category.create({
          data: {
            slug: d.slug,
            accent: d.accent as never,
            active: d.active,
            sortOrder: form.get("sortOrder") === null ? (max._max.sortOrder ?? -1) + 1 : d.sortOrder,
            translations: { create: translations },
          },
        });
        id = created.id;
      }
    } catch (err) {
      if ((err as { code?: string }).code === "P2002") return fail("slugTaken", { slug: "slugTaken" });
      throw err;
    }
    revalidate();
    return ok({ id: id! });
  });
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  return guarded(async () => {
    await requirePermission("menu.manage");
    const count = await db().product.count({ where: { categoryId: id } });
    if (count > 0) return fail("hasProducts");
    await db().category.delete({ where: { id } });
    revalidate();
    return ok();
  });
}

export async function toggleCategory(id: string, active: boolean): Promise<ActionResult> {
  return guarded(async () => {
    await requirePermission("menu.manage");
    await db().category.update({ where: { id }, data: { active } });
    revalidate();
    return ok();
  });
}

/** Swap sort order with the neighbour in the given direction. */
export async function moveCategory(id: string, dir: "up" | "down"): Promise<ActionResult> {
  return guarded(async () => {
    await requirePermission("menu.manage");
    const all = await db().category.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } });
    const i = all.findIndex((c) => c.id === id);
    const j = dir === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= all.length) return ok();
    [all[i], all[j]] = [all[j], all[i]];
    await db().$transaction(all.map((c, idx) => db().category.update({ where: { id: c.id }, data: { sortOrder: idx } })));
    revalidate();
    return ok();
  });
}

/* ------------------------------------------------------------------ */
/* Products                                                             */
/* ------------------------------------------------------------------ */

const productSchema = z.object({
  name: l10nSchema(80),
  description: l10nSchema(300, false),
  ingredients: l10nSchema(300, false),
  categoryId: z.string().min(1),
  price: z.number().int().min(0).max(1_000_000),
  costPrice: z.number().int().min(0).max(1_000_000).nullable(),
  available: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
});

function num(v: FormDataEntryValue | null): number {
  const n = Number(String(v ?? "").replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function parseProduct(form: FormData) {
  const tri = (k: string) => ({ fr: form.get(`${k}.fr`) ?? "", en: form.get(`${k}.en`) ?? "", ar: form.get(`${k}.ar`) ?? "" });
  const cost = String(form.get("costPrice") ?? "").trim();
  return productSchema.safeParse({
    name: tri("name"),
    description: tri("description"),
    ingredients: tri("ingredients"),
    categoryId: form.get("categoryId"),
    price: num(form.get("price")),
    costPrice: cost === "" ? null : num(cost),
    available: form.get("available") === "on",
    sortOrder: Number(form.get("sortOrder") ?? 0),
  });
}

export async function saveProduct(id: string | null, _prev: unknown, form: FormData): Promise<ActionResult<{ id: string }>> {
  return guarded(async () => {
    await requirePermission("menu.manage");
    const parsed = parseProduct(form);
    if (!parsed.success) return fail("invalid", zodToFields(parsed.error.issues));
    const d = parsed.data;
    const cat = await db().category.findUnique({ where: { id: d.categoryId }, select: { id: true } });
    if (!cat) return fail("invalid", { categoryId: "invalid" });
    const translations = locales
      .filter((l) => l === "fr" || d.name[l] || d.description[l] || d.ingredients[l])
      .map((l) => ({ locale: l, name: d.name[l], description: d.description[l], ingredients: d.ingredients[l] }));
    const base = { categoryId: d.categoryId, price: d.price, costPrice: d.costPrice, available: d.available, sortOrder: d.sortOrder };
    if (id) {
      await db().product.update({ where: { id }, data: { ...base, translations: { deleteMany: {}, create: translations } } });
    } else {
      const created = await db().product.create({ data: { ...base, translations: { create: translations } } });
      id = created.id;
    }
    revalidate();
    return ok({ id: id! });
  });
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  return guarded(async () => {
    await requirePermission("menu.manage");
    const p = await db().product.findUnique({ where: { id }, select: { photoUrl: true, photoThumbUrl: true } });
    if (!p) return fail("notFound");
    await db().product.delete({ where: { id } });
    await removeImage(p.photoUrl);
    await removeImage(p.photoThumbUrl);
    revalidate();
    return ok();
  });
}

export async function toggleProductAvailable(id: string, available: boolean): Promise<ActionResult> {
  return guarded(async () => {
    await requirePermission("menu.manage");
    await db().product.update({ where: { id }, data: { available } });
    revalidate();
    return ok();
  });
}

export async function moveProduct(id: string, dir: "up" | "down"): Promise<ActionResult> {
  return guarded(async () => {
    await requirePermission("menu.manage");
    const p = await db().product.findUnique({ where: { id }, select: { categoryId: true } });
    if (!p) return fail("notFound");
    const all = await db().product.findMany({ where: { categoryId: p.categoryId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } });
    const i = all.findIndex((c) => c.id === id);
    const j = dir === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= all.length) return ok();
    [all[i], all[j]] = [all[j], all[i]];
    await db().$transaction(all.map((c, idx) => db().product.update({ where: { id: c.id }, data: { sortOrder: idx } })));
    revalidate();
    return ok();
  });
}

/** Photo upload: the client sends an already-cropped square image. */
export async function uploadProductPhoto(id: string, form: FormData): Promise<ActionResult<StoredImage>> {
  return guarded(async () => {
    await requirePermission("menu.manage");
    const file = form.get("photo");
    if (!(file instanceof File)) throw new ActionError("photoInvalid", { photo: "photoInvalid" });
    const prev = await db().product.findUnique({ where: { id }, select: { photoUrl: true, photoThumbUrl: true } });
    if (!prev) return fail("notFound");
    const stored = await storeImage(file, "products");
    await db().product.update({
      where: { id },
      data: { photoUrl: stored.url, photoThumbUrl: stored.thumbUrl, photoBlurhash: stored.blurhash, photoWidth: stored.width, photoHeight: stored.height },
    });
    await removeImage(prev.photoUrl);
    await removeImage(prev.photoThumbUrl);
    revalidate();
    return ok(stored);
  });
}

export async function removeProductPhoto(id: string): Promise<ActionResult> {
  return guarded(async () => {
    await requirePermission("menu.manage");
    const prev = await db().product.findUnique({ where: { id }, select: { photoUrl: true, photoThumbUrl: true } });
    if (!prev) return fail("notFound");
    await db().product.update({ where: { id }, data: { photoUrl: null, photoThumbUrl: null, photoBlurhash: null, photoWidth: null, photoHeight: null } });
    await removeImage(prev.photoUrl);
    await removeImage(prev.photoThumbUrl);
    revalidate();
    return ok();
  });
}

/* ------------------------------------------------------------------ */
/* Sold out for today — workers may do this too.                        */
/* ------------------------------------------------------------------ */

const idList = z.array(z.string().min(1).max(64)).min(1).max(200);

export async function setSoldOutToday(ids: string[]): Promise<ActionResult<{ until: string }>> {
  return guarded(async () => {
    await requirePermission("menu.mark_sold_out");
    const parsed = idList.safeParse(ids);
    if (!parsed.success) return fail("invalid");
    const shop = await getShop();
    const until = nextOpening(shop.hours);
    await db().product.updateMany({ where: { id: { in: parsed.data } }, data: { soldOutUntil: until } });
    revalidate();
    return ok({ until: until.toISOString() });
  });
}

export async function clearSoldOut(ids: string[]): Promise<ActionResult> {
  return guarded(async () => {
    await requirePermission("menu.mark_sold_out");
    const parsed = idList.safeParse(ids);
    if (!parsed.success) return fail("invalid");
    await db().product.updateMany({ where: { id: { in: parsed.data } }, data: { soldOutUntil: null } });
    revalidate();
    return ok();
  });
}
