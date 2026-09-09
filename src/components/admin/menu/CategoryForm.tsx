"use client";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Accent } from "@/generated/prisma/enums";
import type { AppLocale } from "@/i18n/config";
import { ACCENTS, ACCENT_HEX, slugify } from "@/lib/menu-shared";
import { deleteCategory, saveCategory } from "@/app/(staff)/admin/menu/actions";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ErrorText } from "@/components/ui/ErrorText";
import { LangTabs } from "./LangTabs";
import type { ErrorKey } from "@/lib/action";

export type CategoryFormValues = {
  id: string | null;
  name: Record<AppLocale, string>;
  slug: string;
  accent: Accent;
  active: boolean;
  sortOrder: number;
  productCount: number;
};

export function CategoryForm({ initial }: { initial: CategoryFormValues }) {
  const t = useTranslations("adminMenu");
  const router = useRouter();
  const [state, action] = useActionState(saveCategory.bind(null, initial.id), null);
  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const [accent, setAccent] = useState<Accent>(initial.accent);
  const [delError, setDelError] = useState<ErrorKey | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (state?.ok) router.push("/admin/menu");
  }, [state, router]);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};

  const onFr = (v: string) => {
    setName((n) => ({ ...n, fr: v }));
    if (!slugTouched) setSlug(slugify(v));
  };

  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="surface p-4 sm:p-6">
        <LangTabs filled={{ fr: Boolean(name.fr), en: Boolean(name.en), ar: Boolean(name.ar) }}>
          {(l) => (
            <Field label={t("fields.name")} name={`name.${l}`} required={l === "fr"} value={name[l]} onChange={(e) => (l === "fr" ? onFr(e.target.value) : setName((n) => ({ ...n, [l]: e.target.value })))} error={fe[`name.${l}`]} maxLength={60} />
          )}
        </LangTabs>
      </div>

      <div className="surface flex flex-col gap-5 p-4 sm:p-6">
        <Field label={t("fields.slug")} name="slug" value={slug} onChange={(e) => { setSlugTouched(true); setSlug(e.target.value); }} help={t("fields.slugHelp")} error={fe.slug} pattern="[a-z0-9-]{2,48}" required dir="ltr" />
        <fieldset>
          <legend className="label">{t("fields.accent")}</legend>
          <div className="accent-grid">
            {ACCENTS.map((a) => (
              <label key={a} className="accent-option" data-accent={a}>
                <input type="radio" name="accent" value={a} checked={accent === a} onChange={() => setAccent(a)} />
                <span className="swatch" style={{ background: ACCENT_HEX[a] }} aria-hidden="true" />
                <span className="flex flex-col leading-tight"><span className="font-medium capitalize">{a}</span><span className="text-sm text-[var(--fg-muted)]">{t(`accents.${a}`)}</span></span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("fields.sortOrder")} name="sortOrder" type="number" inputMode="numeric" min={0} max={9999} defaultValue={initial.sortOrder} help={t("fields.sortOrderHelp")} error={fe.sortOrder} />
          <label className="switch self-end">
            <input type="checkbox" name="active" defaultChecked={initial.active} />
            <span>{t("fields.activeCategory")}</span>
          </label>
        </div>
      </div>

      {state && !state.ok && !state.fieldErrors ? <ErrorText error={state.error} /> : null}
      <ErrorText error={delError} />

      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton className="btn btn-primary btn-lg" pendingLabel={t("saving")}>{t("save")}</SubmitButton>
        <Link href="/admin/menu" className="btn btn-quiet btn-lg">{t("cancel")}</Link>
        {initial.id && initial.productCount === 0 ? (
          <button type="button" className="btn btn-danger ms-auto" disabled={pending} onClick={() => {
            if (!confirm(t("deleteCategoryConfirm"))) return;
            start(async () => {
              const r = await deleteCategory(initial.id!);
              if (r.ok) router.push("/admin/menu");
              else setDelError(r.error);
            });
          }}>{t("delete")}</button>
        ) : null}
      </div>
    </form>
  );
}
