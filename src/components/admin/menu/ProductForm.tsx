"use client";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Accent } from "@/generated/prisma/enums";
import type { AppLocale } from "@/i18n/config";
import { deleteProduct, saveProduct } from "@/app/(staff)/admin/menu/actions";
import { Field, SelectField, TextareaField } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ErrorText } from "@/components/ui/ErrorText";
import { LangTabs } from "./LangTabs";
import { PhotoUploader } from "./PhotoUploader";
import type { ErrorKey } from "@/lib/action";

export type ProductFormValues = {
  id: string | null;
  name: Record<AppLocale, string>;
  description: Record<AppLocale, string>;
  ingredients: Record<AppLocale, string>;
  categoryId: string;
  price: number | null;
  costPrice: number | null;
  available: boolean;
  sortOrder: number;
  photoUrl: string | null;
  blurDataURL?: string;
};
export type CategoryOption = { id: string; name: string; accent: Accent };

export function ProductForm({ initial, categories, justCreated }: { initial: ProductFormValues; categories: CategoryOption[]; justCreated: boolean }) {
  const t = useTranslations("adminMenu");
  const router = useRouter();
  const [state, action] = useActionState(saveProduct.bind(null, initial.id), null);
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [ingredients, setIngredients] = useState(initial.ingredients);
  const [delError, setDelError] = useState<ErrorKey | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (state?.ok) router.push(initial.id ? "/admin/menu" : `/admin/menu/products/${state.data.id}?created=1`);
  }, [state, router, initial.id]);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};

  return (
    <form action={action} className="flex flex-col gap-6">
      {justCreated ? <p role="status" className="surface px-4 py-3 text-sm">{t("saved")} {t("photo.none")}</p> : null}

      <div className="surface p-4 sm:p-6">
        <LangTabs filled={{ fr: Boolean(name.fr), en: Boolean(name.en), ar: Boolean(name.ar) }}>
          {(l) => (
            <div className="flex flex-col gap-4">
              <Field label={t("fields.name")} name={`name.${l}`} required={l === "fr"} value={name[l]} onChange={(e) => setName((n) => ({ ...n, [l]: e.target.value }))} error={fe[`name.${l}`]} maxLength={80} />
              <TextareaField label={t("fields.description")} name={`description.${l}`} value={description[l]} onChange={(e) => setDescription((n) => ({ ...n, [l]: e.target.value }))} error={fe[`description.${l}`]} maxLength={300} rows={2} />
              <TextareaField label={t("fields.ingredients")} name={`ingredients.${l}`} value={ingredients[l]} onChange={(e) => setIngredients((n) => ({ ...n, [l]: e.target.value }))} error={fe[`ingredients.${l}`]} help={t("fields.ingredientsHelp")} maxLength={300} rows={2} />
            </div>
          )}
        </LangTabs>
      </div>

      <div className="surface grid gap-5 p-4 sm:grid-cols-2 sm:p-6">
        <SelectField label={t("fields.category")} name="categoryId" defaultValue={initial.categoryId} required error={fe.categoryId} className="sm:col-span-2">
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name} — {c.accent}</option>
          ))}
        </SelectField>
        <Field label={t("fields.price")} name="price" type="number" inputMode="numeric" min={0} step={1} required defaultValue={initial.price ?? ""} error={fe.price} dir="ltr" />
        <Field label={t("fields.costPrice")} name="costPrice" type="number" inputMode="numeric" min={0} step={1} defaultValue={initial.costPrice ?? ""} help={t("fields.costPriceHelp")} error={fe.costPrice} dir="ltr" />
        <Field label={t("fields.sortOrder")} name="sortOrder" type="number" inputMode="numeric" min={0} max={9999} defaultValue={initial.sortOrder} help={t("fields.sortOrderHelp")} error={fe.sortOrder} dir="ltr" />
        <label className="switch self-end">
          <input type="checkbox" name="available" defaultChecked={initial.available} />
          <span>{t("fields.availableProduct")}</span>
        </label>
      </div>

      {initial.id ? (
        <div className="surface p-4 sm:p-6">
          <PhotoUploader productId={initial.id} photoUrl={initial.photoUrl} blurDataURL={initial.blurDataURL} name={name.fr} />
        </div>
      ) : (
        <p className="text-sm text-[var(--fg-muted)]">{t("photo.help")}</p>
      )}

      {state && !state.ok && !state.fieldErrors ? <ErrorText error={state.error} /> : null}
      {state && !state.ok && state.fieldErrors ? <ErrorText error="invalid" /> : null}
      <ErrorText error={delError} />

      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton className="btn btn-primary btn-lg" pendingLabel={t("saving")}>{t("save")}</SubmitButton>
        <Link href="/admin/menu" className="btn btn-quiet btn-lg">{t("cancel")}</Link>
        {initial.id ? (
          <button type="button" className="btn btn-danger ms-auto" disabled={pending} onClick={() => {
            if (!confirm(t("deleteProductConfirm"))) return;
            start(async () => {
              const r = await deleteProduct(initial.id!);
              if (r.ok) router.push("/admin/menu");
              else setDelError(r.error);
            });
          }}>{t("delete")}</button>
        ) : null}
      </div>
    </form>
  );
}
