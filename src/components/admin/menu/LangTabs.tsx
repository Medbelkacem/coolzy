"use client";
import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { locales, type AppLocale } from "@/i18n/config";

/**
 * Three language tabs. Every panel stays mounted (hidden) so all inputs
 * submit with the form; French is required, the others show a marker when empty.
 */
export function LangTabs({ filled, children }: { filled: Record<AppLocale, boolean>; children: (locale: AppLocale) => ReactNode }) {
  const t = useTranslations("adminMenu");
  const [active, setActive] = useState<AppLocale>("fr");
  return (
    <div>
      <div role="tablist" className="lang-tabs" aria-label={t("fields.name")}>
        {locales.map((l) => (
          <button key={l} type="button" role="tab" id={`tab-${l}`} aria-selected={active === l} aria-controls={`panel-${l}`} className="lang-tab" onClick={() => setActive(l)} lang={l}>
            {t(`langTab.${l}`)}
            {l !== "fr" && !filled[l] ? <span className="lang-dot" aria-hidden="true" /> : null}
          </button>
        ))}
      </div>
      {locales.map((l) => (
        <div key={l} role="tabpanel" id={`panel-${l}`} aria-labelledby={`tab-${l}`} hidden={active !== l} dir={l === "ar" ? "rtl" : "ltr"} lang={l}>
          {children(l)}
        </div>
      ))}
      <p className="mt-2 text-sm text-[var(--fg-muted)]">{t("fields.frRequired")}</p>
    </div>
  );
}
