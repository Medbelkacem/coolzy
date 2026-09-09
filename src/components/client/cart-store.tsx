"use client";
import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";

export type CartItem = { productId: string; name: string; unitPrice: number; qty: number; note: string; soldOut?: boolean };
type State = { items: CartItem[]; note: string; hydrated: boolean };
type Action =
  | { type: "hydrate"; state: Pick<State, "items" | "note"> }
  | { type: "add"; item: Omit<CartItem, "qty" | "note"> }
  | { type: "qty"; productId: string; qty: number }
  | { type: "remove"; productId: string }
  | { type: "note"; productId: string; note: string }
  | { type: "orderNote"; note: string }
  | { type: "sync"; products: { id: string; name: string; price: number; soldOut: boolean }[] }
  | { type: "clear" };

const KEY = "coolzy-cart";
const MAX_QTY = 50;

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "hydrate":
      return { ...s, items: a.state.items ?? [], note: a.state.note ?? "", hydrated: true };
    case "add": {
      const existing = s.items.find((i) => i.productId === a.item.productId);
      if (existing) return { ...s, items: s.items.map((i) => (i.productId === a.item.productId ? { ...i, qty: Math.min(MAX_QTY, i.qty + 1) } : i)) };
      return { ...s, items: [...s.items, { ...a.item, qty: 1, note: "" }] };
    }
    case "qty":
      if (a.qty <= 0) return { ...s, items: s.items.filter((i) => i.productId !== a.productId) };
      return { ...s, items: s.items.map((i) => (i.productId === a.productId ? { ...i, qty: Math.min(MAX_QTY, a.qty) } : i)) };
    case "remove":
      return { ...s, items: s.items.filter((i) => i.productId !== a.productId) };
    case "note":
      return { ...s, items: s.items.map((i) => (i.productId === a.productId ? { ...i, note: a.note.slice(0, 140) } : i)) };
    case "orderNote":
      return { ...s, note: a.note.slice(0, 300) };
    case "sync": {
      const map = new Map(a.products.map((p) => [p.id, p]));
      return {
        ...s,
        items: s.items.map((i) => {
          const p = map.get(i.productId);
          if (!p) return { ...i, soldOut: true };
          return { ...i, name: p.name, unitPrice: p.price, soldOut: p.soldOut };
        }),
      };
    }
    case "clear":
      return { ...s, items: [], note: "" };
  }
}

type Ctx = {
  state: State;
  count: number;
  subtotal: number;
  add: (item: Omit<CartItem, "qty" | "note">) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  setNote: (productId: string, note: string) => void;
  setOrderNote: (note: string) => void;
  sync: (products: { id: string; name: string; price: number; soldOut: boolean }[]) => void;
  clear: () => void;
  qtyOf: (productId: string) => number;
};
const CartContext = createContext<Ctx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { items: [], note: "", hydrated: false });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? (JSON.parse(raw) as Pick<State, "items" | "note">) : { items: [], note: "" };
      dispatch({ type: "hydrate", state: { items: Array.isArray(parsed.items) ? parsed.items : [], note: typeof parsed.note === "string" ? parsed.note : "" } });
    } catch {
      dispatch({ type: "hydrate", state: { items: [], note: "" } });
    }
  }, []);
  useEffect(() => {
    if (!state.hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ items: state.items, note: state.note }));
    } catch {
      /* storage unavailable */
    }
  }, [state]);

  const value = useMemo<Ctx>(() => {
    const count = state.items.reduce((n, i) => n + i.qty, 0);
    const subtotal = state.items.reduce((n, i) => n + i.qty * i.unitPrice, 0);
    return {
      state,
      count,
      subtotal,
      add: (item) => dispatch({ type: "add", item }),
      setQty: (productId, qty) => dispatch({ type: "qty", productId, qty }),
      remove: (productId) => dispatch({ type: "remove", productId }),
      setNote: (productId, note) => dispatch({ type: "note", productId, note }),
      setOrderNote: (note) => dispatch({ type: "orderNote", note }),
      sync: (products) => dispatch({ type: "sync", products }),
      clear: () => dispatch({ type: "clear" }),
      qtyOf: (productId) => state.items.find((i) => i.productId === productId)?.qty ?? 0,
    };
  }, [state]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): Ctx {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart outside CartProvider");
  return ctx;
}
