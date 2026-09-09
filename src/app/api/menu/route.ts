import { cookies } from "next/headers";
import { getCatalogueForClient } from "@/lib/menu";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "@/i18n/config";

/** Public JSON catalogue in the visitor's locale. Used by the cart to refresh prices and availability. */
export async function GET() {
  const raw = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(raw) ? raw : defaultLocale;
  const cats = await getCatalogueForClient(locale);
  return Response.json(cats, { headers: { "Cache-Control": "no-store" } });
}
