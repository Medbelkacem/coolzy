"use client";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { locales, localeNames, localeLongNames } from "@/i18n/config";
import { setLocale } from "@/i18n/actions";

export function LanguageSwitch({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("common");
  const [pending, start] = useTransition();
  return (
    <div role="group" aria-label={t("language")} className={`inline-flex items-center gap-0.5 ${className}`}>
      {locales.map((l) => {
        const active = l === locale;
        return (
          <button
            key={l}
            type="button"
            lang={l}
            aria-pressed={active}
            aria-label={localeLongNames[l]}
            disabled={pending}
            onClick={() => start(() => setLocale(l))}
            className={`min-h-[44px] min-w-[44px] rounded-[var(--radius-pill)] px-2 text-sm font-medium xfade ${
              active ? "bg-[var(--fg)] text-[var(--bg)]" : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
            }`}
          >
            {localeNames[l]}
          </button>
        );
      })}
    </div>
  );
}
