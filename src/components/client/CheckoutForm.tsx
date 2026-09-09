"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { formatDA } from "@/lib/money";
import type { AppLocale } from "@/i18n/config";
import type { ErrorKey } from "@/lib/action";
import { IconTable, IconBike } from "@/components/ui/Icons";
import { Field, TextareaField } from "@/components/ui/Field";
import { ErrorText } from "@/components/ui/ErrorText";
import { useCart } from "./cart-store";
import { placeOrder } from "@/app/(client)/checkout/actions";

type Props = {
  currencyLabel: string;
  tableCount: number;
  deliveryFee: number;
  shopOpen: boolean;
  deliveryOpen: boolean;
  deliveryWindow: string | null;
  deliveryZoneNote: string;
  birthdayRule: string;
};

export function CheckoutForm(props: Props) {
  const t = useTranslations("checkout");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const cart = useCart();
  const [type, setType] = useState<"TABLE" | "DELIVERY">("TABLE");
  const [tableNumber, setTableNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [error, setError] = useState<ErrorKey | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, ErrorKey>>({});
  const [pending, start] = useTransition();
  const money = (n: number) => formatDA(n, locale, props.currencyLabel);

  // Refresh prices/availability once on arrival.
  const sync = cart.sync;
  useEffect(() => {
    fetch("/api/menu", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((cats: { products: { id: string; name: string; price: number; soldOut: boolean }[] }[] | null) => cats && sync(cats.flatMap((c) => c.products)))
      .catch(() => {});
  }, [sync]);

  const items = cart.state.items;
  const fee = type === "DELIVERY" ? props.deliveryFee : 0;
  const total = cart.subtotal + fee;
  const unavailable = useMemo(() => items.filter((i) => i.soldOut || fieldErrors[i.productId]), [items, fieldErrors]);

  const canSubmit = props.shopOpen && items.length > 0 && unavailable.length === 0 && (type === "TABLE" ? props.tableCount > 0 : props.deliveryOpen);

  const submit = () => {
    setError(null);
    setFieldErrors({});
    start(async () => {
      const res = await placeOrder({
        type,
        locale,
        tableNumber: type === "TABLE" ? Number(tableNumber) || undefined : undefined,
        items: items.map((i) => ({ productId: i.productId, qty: i.qty, note: i.note || undefined })),
        note: cart.state.note || undefined,
        customerName: type === "DELIVERY" ? customerName : undefined,
        customerPhone: type === "DELIVERY" ? customerPhone : undefined,
        address: type === "DELIVERY" ? address : undefined,
        landmark: type === "DELIVERY" ? landmark || undefined : undefined,
      });
      if (res.ok) {
        cart.clear();
        router.push(`/r/${res.data.token}`);
        return;
      }
      setError(res.error);
      setFieldErrors(res.fieldErrors ?? {});
    });
  };

  if (cart.state.hydrated && items.length === 0) {
    return (
      <div className="surface mt-6 p-6 text-center">
        <p className="text-[var(--fg-muted)]">{t("emptyCart")}</p>
      </div>
    );
  }

  return (
    <form
      className="mt-4 grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) submit();
      }}
    >
      {!props.shopOpen ? <p className="notice m-0">{t("shopClosed")}</p> : null}

      <div className="seg" role="group" aria-label={t("orderType")}>
        <button type="button" aria-pressed={type === "TABLE"} onClick={() => setType("TABLE")}><IconTable width={18} height={18} /><span>{t("table")}</span></button>
        <button type="button" aria-pressed={type === "DELIVERY"} onClick={() => setType("DELIVERY")}><IconBike width={18} height={18} /><span>{t("delivery")}</span></button>
      </div>

      {type === "TABLE" ? (
        props.tableCount > 0 ? (
          <Field
            label={t("tableNumber")}
            name="tableNumber"
            type="number"
            inputMode="numeric"
            min={1}
            max={props.tableCount}
            required
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            help={t("tableHelp", { count: props.tableCount })}
            error={fieldErrors.tableNumber}
          />
        ) : (
          <p className="notice m-0">{t("noTables")}</p>
        )
      ) : (
        <div className="grid gap-4">
          {!props.deliveryOpen ? (
            <p className="notice m-0">{props.deliveryWindow ? t("deliveryClosed", { window: props.deliveryWindow }) : t("deliveryClosedToday")}</p>
          ) : null}
          {props.deliveryZoneNote ? <p className="rule">{props.deliveryZoneNote}</p> : null}
          <Field label={t("name")} name="customerName" required autoComplete="name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} error={fieldErrors.customerName} />
          <Field label={t("phone")} name="customerPhone" type="tel" inputMode="tel" dir="ltr" required autoComplete="tel" placeholder="0X XX XX XX XX" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} error={fieldErrors.customerPhone} />
          <TextareaField label={t("address")} name="address" required rows={2} autoComplete="street-address" value={address} onChange={(e) => setAddress(e.target.value)} error={fieldErrors.address} />
          <Field label={t("landmark")} name="landmark" value={landmark} onChange={(e) => setLandmark(e.target.value)} help={t("landmarkHelp")} />
        </div>
      )}

      <section className="surface p-4" aria-labelledby="sum-title">
        <h2 id="sum-title" className="font-display text-lg">{t("yourOrder")}</h2>
        <ul className="m-0 mt-2 list-none p-0">
          {items.map((i) => (
            <li key={i.productId} className="flex justify-between gap-3 py-1.5 text-sm">
              <span>
                <span className="tabular">{i.qty}×</span> {i.name}
                {i.note ? <span className="block text-xs text-[var(--fg-muted)]">{i.note}</span> : null}
                {i.soldOut || fieldErrors[i.productId] ? <span className="soldout-tag block">{t("itemUnavailable")}</span> : null}
              </span>
              <span className="tabular">{money(i.unitPrice * i.qty)}</span>
            </li>
          ))}
        </ul>
        {cart.state.note ? <p className="mt-2 text-sm text-[var(--fg-muted)]">{t("note")}: {cart.state.note}</p> : null}
        <div className="summary mt-3 text-sm">
          <div><span className="text-[var(--fg-muted)]">{t("subtotal")}</span><span className="tabular">{money(cart.subtotal)}</span></div>
          {type === "DELIVERY" ? <div><span className="text-[var(--fg-muted)]">{t("deliveryFee")}</span><span className="tabular">{money(fee)}</span></div> : null}
          <div className="grand"><span>{t("total")}</span><strong className="tabular">{money(total)}</strong></div>
        </div>
      </section>

      <p className="rule">{props.birthdayRule}</p>

      {unavailable.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          <ErrorText error="productUnavailable" className="m-0" />
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => unavailable.forEach((i) => cart.remove(i.productId))}>{t("removeUnavailable")}</button>
        </div>
      ) : (
        <ErrorText error={error} />
      )}

      <button type="submit" className="btn btn-primary btn-lg" disabled={!canSubmit || pending} aria-busy={pending}>
        {pending ? t("confirming") : t("confirm", { total: money(total) })}
      </button>
    </form>
  );
}
