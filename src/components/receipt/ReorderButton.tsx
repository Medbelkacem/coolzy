"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { reorderLines, type ReorderLine } from "@/app/(client)/r/[token]/actions";

const CART_KEY = "coolzy-cart";
type CartItem = { productId: string; name: string; unitPrice: number; qty: number; note: string };
type Cart = { items: CartItem[]; note: string };

function readCart(): Cart {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Cart>;
      if (Array.isArray(parsed.items)) return { items: parsed.items as CartItem[], note: typeof parsed.note === "string" ? parsed.note : "" };
    }
  } catch {
    /* fresh cart */
  }
  return { items: [], note: "" };
}

function mergeLines(cart: Cart, lines: ReorderLine[]): Cart {
  const items = [...cart.items];
  for (const l of lines) {
    const note = l.note ?? "";
    const existing = items.find((i) => i.productId === l.productId && (i.note ?? "") === note);
    if (existing) {
      existing.qty = Math.min(50, existing.qty + l.qty);
      existing.unitPrice = l.unitPrice;
      existing.name = l.name;
    } else items.push({ productId: l.productId, name: l.name, unitPrice: l.unitPrice, qty: l.qty, note });
  }
  return { ...cart, items };
}

/** Puts the order's items back in the cart at today's prices and opens the menu. */
export function ReorderButton({ token, className = "btn btn-quiet" }: { token: string; className?: string }) {
  const t = useTranslations("receipt");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        className={className}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await reorderLines(token);
            if (!r.ok) return setMsg(t("orderAgainNothing"));
            if (r.data.lines.length === 0) return setMsg(t("orderAgainNothing"));
            try {
              localStorage.setItem(CART_KEY, JSON.stringify(mergeLines(readCart(), r.data.lines)));
              window.dispatchEvent(new StorageEvent("storage", { key: CART_KEY }));
            } catch {
              /* storage blocked: nothing to do */
            }
            if (r.data.skipped > 0) {
              setMsg(t("orderAgainSkipped", { count: r.data.skipped }));
              setTimeout(() => router.push("/"), 1800);
            } else router.push("/");
          })
        }
      >
        {pending ? t("orderAgainAdding") : t("orderAgain")}
      </button>
      {msg ? <p role="status" className="text-sm text-[var(--color-warn)]">{msg}</p> : null}
    </div>
  );
}
