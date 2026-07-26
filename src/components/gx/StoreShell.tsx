import { type ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { CartDrawer } from "./CartDrawer";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";

// Inject store stylesheets ONCE at module load (synchronously, before first render)
// so navigating between store routes never flashes unstyled content.
if (typeof document !== "undefined") {
  for (const l of STORE_HEAD_LINKS) {
    if (document.querySelector(`link[data-gx-store="${l.href}"]`)) continue;
    const el = document.createElement("link");
    el.rel = l.rel;
    el.href = l.href;
    el.setAttribute("data-gx-store", l.href);
    document.head.appendChild(el);
  }
}

export function StoreShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
      <CartDrawer />
    </>
  );
}


