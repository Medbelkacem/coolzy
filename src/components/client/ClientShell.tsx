"use client";
import type { ReactNode } from "react";
import { CartProvider } from "./cart-store";
import { CartSheetProvider } from "./CartSheet";

/** Wraps a client page with the cart store and the cart sheet. */
export function ClientShell({ children, currencyLabel, minimumRule }: { children: ReactNode; currencyLabel: string; minimumRule: string }) {
  return (
    <CartProvider>
      <CartSheetProvider currencyLabel={currencyLabel} minimumRule={minimumRule}>{children}</CartSheetProvider>
    </CartProvider>
  );
}
