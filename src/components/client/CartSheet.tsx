"use client";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";

type SheetCtx = { isOpen: boolean; open: () => void; close: () => void };
const Ctx = createContext<SheetCtx | null>(null);

export function CartSheetProvider({ children, currencyLabel, minimumRule }: { children: ReactNode; currencyLabel: string; minimumRule: string }) {
  const [isOpen, setOpen] = useState(false);
  const value = useMemo(() => ({ isOpen, open: () => setOpen(true), close: () => setOpen(false) }), [isOpen]);
  return (
    <Ctx.Provider value={value}>
      {children}
      {isOpen ? <CartSheetLazy currencyLabel={currencyLabel} minimumRule={minimumRule} /> : null}
    </Ctx.Provider>
  );
}

export function useCartSheet(): SheetCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCartSheet outside provider");
  return ctx;
}

/**
 * The sheet's code is fetched the first time a customer opens the cart, so the
 * menu itself stays light on a mid-range Android.
 */
const CartSheetLazy = dynamic(() => import("./CartSheetBody").then((m) => m.CartSheet), { ssr: false });
