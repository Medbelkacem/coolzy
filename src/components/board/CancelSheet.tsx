"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { OrderDTO } from "@/lib/orders";
import { IconX } from "@/components/ui/Icons";

const QUICK = ["outOfStock", "customerLeft", "noAnswer", "mistake"] as const;

export function CancelSheet({ order, onClose, onConfirm }: { order: OrderDTO; onClose: () => void; onConfirm: (reason: string) => void }) {
  const t = useTranslations("board");
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const valid = reason.trim().length >= 2;
  return (
    <>
      <button type="button" className="board-sheet-backdrop" aria-label={t("keepOrder")} onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="cancel-title" className="board-sheet sheet-up">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="cancel-title" className="font-display text-xl">{t("cancel")} {order.display}</h2>
          <button type="button" className="btn btn-quiet btn-icon" aria-label={t("keepOrder")} onClick={onClose}><IconX /></button>
        </div>
        <label htmlFor="cancel-reason" className="label">{t("cancelReason")}</label>
        <div className="mb-2 flex flex-wrap gap-2">
          {QUICK.map((k) => (
            <button key={k} type="button" className="chip min-h-[40px]" onClick={() => { setReason(t(`quickReasons.${k}`)); setTouched(true); }}>
              {t(`quickReasons.${k}`)}
            </button>
          ))}
        </div>
        <textarea
          id="cancel-reason"
          ref={ref}
          className="textarea"
          value={reason}
          maxLength={200}
          required
          aria-invalid={touched && !valid ? true : undefined}
          placeholder={t("reasonPlaceholder")}
          onChange={(e) => { setReason(e.target.value); setTouched(true); }}
        />
        <div className="mt-4 flex flex-col gap-2 sm:flex-row-reverse">
          <button type="button" className="btn btn-danger btn-lg flex-1" disabled={!valid} onClick={() => onConfirm(reason.trim())}>
            {t("cancelConfirm")}
          </button>
          <button type="button" className="btn btn-quiet btn-lg flex-1" onClick={onClose}>{t("keepOrder")}</button>
        </div>
      </div>
    </>
  );
}
