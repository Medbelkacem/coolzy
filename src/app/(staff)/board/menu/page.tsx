import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/authz";
import { db } from "@/lib/db";
import { EmptyState } from "@/components/ui/EmptyState";
import { SoldOutList, type SoldOutProduct } from "@/components/board/SoldOutList";
import type { AppLocale } from "@/i18n/config";

export const dynamic = "force-dynamic";

export default async function BoardMenuPage() {
  await requirePermission("menu.mark_sold_out");
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("worker");
  const categories = await db().category.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: { translations: true, products: { orderBy: { sortOrder: "asc" }, include: { translations: true } } },
  });
  const now = Date.now();
  const pick = <T extends { locale: string; name: string }>(rows: T[]) => (rows.find((r) => r.locale === locale) ?? rows.find((r) => r.locale === "fr"))?.name ?? "";
  const groups = categories
    .map((c) => ({
      id: c.id,
      name: pick(c.translations),
      accent: c.accent,
      products: c.products.map<SoldOutProduct>((p) => ({
        id: p.id,
        name: pick(p.translations),
        available: p.available,
        soldOutUntil: p.soldOutUntil && p.soldOutUntil.getTime() > now ? p.soldOutUntil.toISOString() : null,
      })),
    }))
    .filter((g) => g.products.length > 0);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl">{t("soldOut.title")}</h1>
        <p className="mt-1 max-w-[60ch] text-[var(--fg-muted)]">{t("soldOut.intro")}</p>
      </div>
      {groups.length === 0 ? <EmptyState title={t("soldOut.emptyTitle")} body={t("soldOut.emptyBody")} /> : <SoldOutList groups={groups} />}
    </div>
  );
}
