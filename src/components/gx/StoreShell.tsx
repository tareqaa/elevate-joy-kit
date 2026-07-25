import type { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { CartDrawer } from "./CartDrawer";
import { CartProvider } from "@/lib/gx/cart";
import { CurrencyProvider } from "@/lib/gx/currency";

export function StoreShell({ children }: { children: ReactNode }) {
  return (
    <CurrencyProvider>
      <CartProvider>
        <Navbar />
        {children}
        <Footer />
        <CartDrawer />
      </CartProvider>
    </CurrencyProvider>
  );
}
