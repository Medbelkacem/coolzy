import { getLocale, getTranslations } from "next-intl/server";
import { getShop } from "@/lib/shop";
import type { AppLocale } from "@/i18n/config";
import { weekdayOf } from "@/lib/time";
import { formatPhone } from "@/lib/customer";
import { houseRules } from "./rules";

export async function ClientFooter() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("menu");
  const shop = await getShop();
  const today = weekdayOf(new Date());
  const rules = await houseRules(shop, locale);
  // Week starts Saturday in Algeria.
  const order = [6, 0, 1, 2, 3, 4, 5];
  return (
    <footer className="client-footer">
      <div>
        <h2 className="font-display">{shop.name}</h2>
        {shop.address ? <p>{shop.address}</p> : null}
        {shop.phone ? <p><a href={`tel:${shop.phone}`} dir="ltr">{formatPhone(shop.phone) || shop.phone}</a></p> : null}
        <p className="mt-2 flex flex-wrap gap-x-4">
          {shop.instagram ? <a href={shop.instagram} rel="noopener noreferrer" target="_blank">Instagram</a> : null}
          {shop.mapsUrl ? <a href={shop.mapsUrl} rel="noopener noreferrer" target="_blank">{t("directions")}</a> : null}
        </p>
      </div>
      <div>
        <h2 className="font-display">{t("hours")}</h2>
        <div className="hours">
          {order.map((d) => {
            const h = shop.hours[d];
            return (
              <div key={d} className={`contents ${d === today ? "today" : ""}`}>
                <span className={d === today ? "today" : ""}>{t(`days.${d}` as never)}</span>
                <span className={`tabular ${d === today ? "today" : ""}`} dir="ltr">{h.closed ? t("closedDay") : `${h.open} – ${h.close}`}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <h2 className="font-display">{t("houseRules")}</h2>
        <ul className="m-0 grid list-disc gap-1 ps-4">
          {rules.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
