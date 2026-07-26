import { type ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { CartDrawer } from "./CartDrawer";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";

// Inject store stylesheets ONCE at module load (synchronously, before first render)
// so navigating between store routes never flashes unstyled content.
// Always inject a persistent copy tagged `data-gx-store` — TanStack Router
// removes head()-managed <link>s when navigating to routes that omit them
// (e.g. /account, /admin), so we can't rely on their presence at load time.
function ensureStoreStyles() {
  if (typeof document === "undefined") return;
  for (const l of STORE_HEAD_LINKS) {
    if (document.head.querySelector(`link[data-gx-store="${l.href}"]`)) continue;
    const el = document.createElement("link");
    el.rel = l.rel;
    el.href = l.href;
    el.setAttribute("data-gx-store", l.href);
    document.head.appendChild(el);
  }
}
ensureStoreStyles();

export function StoreShell({ children }: { children: ReactNode }) {
  // Re-assert styles on every render so returning from /account or /admin restores them.
  ensureStoreStyles();
  return (
    <>
      <Navbar />
      {children}
      <Footer />
      <CartDrawer />
    </>
  );
}


