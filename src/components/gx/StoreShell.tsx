import { useEffect, type ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { CartDrawer } from "./CartDrawer";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";

export function StoreShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    const nodes: HTMLLinkElement[] = [];
    for (const l of STORE_HEAD_LINKS) {
      if (document.querySelector(`link[data-gx-store="${l.href}"]`)) continue;
      const el = document.createElement("link");
      el.rel = l.rel;
      el.href = l.href;
      el.setAttribute("data-gx-store", l.href);
      document.head.appendChild(el);
      nodes.push(el);
    }
    return () => { nodes.forEach((n) => n.remove()); };
  }, []);

  return (
    <>
      <Navbar />
      {children}
      <Footer />
      <CartDrawer />
    </>
  );
}

