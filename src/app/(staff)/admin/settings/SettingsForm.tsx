"use client";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { saveSettings } from "./actions";
import { Field, TextareaField } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ErrorText } from "@/components/ui/ErrorText";
import { locales, type AppLocale } from "@/i18n/config";
import type { ShopSettings } from "@/lib/shop";
import type { DayHours } from "@/lib/time";
import { formatPhone } from "@/lib/phone";

type L = Partial<Record<AppLocale, string>>;

export function SettingsForm({ shop, dayNames }: { shop: ShopSettings; dayNames: Record<number, string> }) {
  const t = useTranslations("settings");
  const [state, action] = useActionState(saveSettings, null);
  const [same, setSame] = useState(shop.deliveryHours === null);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  const DAYS = [6, 0, 1, 2, 3, 4, 5]; // Saturday first: the Algerian week

  return (
    <form action={action} className="flex flex-col gap-6">
      <Section title={t("sections.identity")}>
        <Field label={t("name")} name="name" defaultValue={shop.name} required maxLength={80} error={fe.name} />
        <Field label={t("address")} name="address" defaultValue={shop.address} maxLength={200} error={fe.address} />
        <Field label={t("phone")} name="phone" type="tel" dir="ltr" defaultValue={formatPhone(shop.phone)} help={t("phoneHelp")} error={fe.phone} />
        <Field label={t("instagram")} name="instagram" type="url" dir="ltr" defaultValue={shop.instagram} error={fe.instagram} />
        <Field label={t("mapsUrl")} name="mapsUrl" type="url" dir="ltr" defaultValue={shop.mapsUrl} error={fe.mapsUrl} />
        <L10nFields name="tagline" label={t("tagline")} value={shop.tagline} maxLength={120} />
      </Section>

      <Section title={t("sections.hours")}>
        <HoursGrid prefix="hours" hours={shop.hours} days={DAYS} dayNames={dayNames} errors={fe} />
      </Section>

      <Section title={t("sections.delivery")}>
        <Field label={t("deliveryFee")} name="deliveryFee" type="number" inputMode="numeric" min={0} step={1} defaultValue={shop.deliveryFee} help={t("deliveryFeeHelp")} error={fe.deliveryFee} className="max-w-xs" />
        <label className="flex min-h-[44px] items-center gap-3">
          <input type="checkbox" name="deliverySame" className="h-5 w-5" checked={same} onChange={(e) => setSame(e.target.checked)} />
          <span>{t("sameHours")}</span>
        </label>
        <div hidden={same}>
          <p className="label">{t("deliveryHours")}</p>
          <HoursGrid prefix="dhours" hours={shop.deliveryHours ?? shop.hours} days={DAYS} dayNames={dayNames} errors={fe} />
        </div>
        <L10nFields name="deliveryZoneNote" label={t("deliveryZone")} help={t("deliveryZoneHelp")} value={shop.deliveryZoneNote} maxLength={300} textarea />
      </Section>

      <Section title={t("sections.tables")}>
        <Field label={t("tableCount")} name="tableCount" type="number" inputMode="numeric" min={0} max={999} step={1} defaultValue={shop.tableCount} help={t("tableCountHelp")} error={fe.tableCount} className="max-w-xs" />
      </Section>

      <Section title={t("sections.rules")}>
        <L10nFields name="houseRules" label={t("houseRules")} help={t("houseRulesHelp")} value={shop.houseRules} maxLength={2000} textarea rows={5} />
      </Section>

      <Section title={t("sections.currency")}>
        <L10nFields name="currencyLabel" label={t("currencyLabel")} help={t("currencyHelp")} value={shop.currencyLabel} maxLength={8} />
      </Section>

      <div className="sticky-save flex items-center gap-3">
        <SubmitButton className="btn btn-primary btn-lg">{t("save")}</SubmitButton>
        {state?.ok ? <p role="status" className="text-sm text-[var(--color-ok)]">{t("saved")}</p> : null}
        {state && !state.ok ? <ErrorText error={state.error} /> : null}
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="surface flex flex-col gap-4 p-5">
      <h2 className="font-display text-lg">{title}</h2>
      {children}
    </section>
  );
}

function HoursGrid({ prefix, hours, days, dayNames, errors }: { prefix: string; hours: DayHours[]; days: number[]; dayNames: Record<number, string>; errors: Record<string, string> }) {
  const t = useTranslations("settings");
  const [closed, setClosed] = useState<Record<number, boolean>>(Object.fromEntries(hours.map((h) => [h.day, h.closed])));
  return (
    <div className="hours-grid">
      {days.map((day) => {
        const h = hours.find((x) => x.day === day)!;
        const isClosed = closed[day];
        const err = errors[`${prefix}.${day}`];
        return (
          <div key={day} className="contents">
            <span className="day-name">{dayNames[day]}</span>
            <label className="flex flex-col text-sm">
              <span className="sr-only">{t("open")}</span>
              <input type="time" name={`${prefix}.${day}.open`} className="input" defaultValue={h.open} disabled={isClosed} aria-invalid={err ? true : undefined} />
            </label>
            <label className="flex flex-col text-sm">
              <span className="sr-only">{t("close")}</span>
              <input type="time" name={`${prefix}.${day}.close`} className="input" defaultValue={h.close} disabled={isClosed} aria-invalid={err ? true : undefined} />
            </label>
            <label className="flex min-h-[44px] items-center gap-2 text-sm">
              <input type="checkbox" name={`${prefix}.${day}.closed`} className="h-5 w-5" checked={isClosed} onChange={(e) => setClosed((c) => ({ ...c, [day]: e.target.checked }))} />
              <span>{t("closed")}</span>
            </label>
            {err ? <p className="field-error col-span-full">{t("closeBeforeOpen")}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

/** Three-tab translatable field. All inputs stay mounted so the form submits every locale. */
function L10nFields({ name, label, help, value, maxLength, textarea = false, rows = 3 }: { name: string; label: string; help?: string; value: L; maxLength: number; textarea?: boolean; rows?: number }) {
  const t = useTranslations("settings");
  const [tab, setTab] = useState<AppLocale>("fr");
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="label mb-0">{label}</span>
        <div className="lang-tabs" role="tablist" aria-label={label}>
          {locales.map((l) => (
            <button key={l} type="button" role="tab" aria-selected={tab === l} onClick={() => setTab(l)} lang={l}>
              {t(`langTabs.${l}`)}
              {!value[l]?.trim() && l !== "fr" ? <span className="sr-only"> ({t("notTranslated")})</span> : null}
            </button>
          ))}
        </div>
      </div>
      {locales.map((l) => (
        <div key={l} hidden={tab !== l} lang={l} dir={l === "ar" ? "rtl" : "ltr"}>
          {textarea ? (
            <TextareaField label={`${label} (${t(`langTabs.${l}`)})`} name={`${name}.${l}`} defaultValue={value[l] ?? ""} maxLength={maxLength} rows={rows} help={help} className="[&>label]:sr-only" />
          ) : (
            <Field label={`${label} (${t(`langTabs.${l}`)})`} name={`${name}.${l}`} defaultValue={value[l] ?? ""} maxLength={maxLength} help={help} className="[&>label]:sr-only" />
          )}
          {l !== "fr" && !value[l]?.trim() ? <p className="mt-1 text-sm text-[var(--color-warn)]">{t("notTranslated")}</p> : null}
        </div>
      ))}
    </div>
  );
}
