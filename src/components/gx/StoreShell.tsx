import { type ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { CartDrawer } from "./CartDrawer";
import { AddedToCartModal } from "./AddedToCartModal";
import { AdminFab } from "./AdminFab";
import { InlineTextEditor } from "@/lib/gx/copy-overrides";
import { getStoreHeadLinks, CORE_CSS } from "@/lib/gx/store-head";
import { useSiteSettings } from "@/lib/gx/site-settings";

// Inject store stylesheets ONCE at module load (synchronously, before first render)
// so navigating between store routes never flashes unstyled content.
function ensureStoreStyles() {
  if (typeof document === "undefined") return;
  const links = getStoreHeadLinks(); // Only CORE_CSS by default
  for (const l of links) {
    if (document.head.querySelector(`link[data-gx-store="${l.href}"]`)) continue;
    const el = document.createElement("link");
    el.rel = l.rel;
    el.href = l.href;
    el.setAttribute("data-gx-store", l.href);
    document.head.appendChild(el);
  }
}
ensureStoreStyles();

function MaintenanceBanner() {
  const s = useSiteSettings();
  if (!s.maintenance_mode) return null;
  return (
    <div style={{
      background: "linear-gradient(90deg,#3a1a05,#2a0f08)",
      borderBottom: "1px solid rgba(255,180,60,.35)",
      color: "#ffcf8a",
      padding: "10px 16px",
      textAlign: "center",
      fontSize: 14,
      fontWeight: 700,
      position: "relative",
      zIndex: 60,
    }}>
      <span style={{ marginInlineEnd: 8 }}>🛠️</span>
      {s.maintenance_message}
    </div>
  );
}

export function StoreShell({ children, bare = false }: { children: ReactNode; bare?: boolean }) {
  ensureStoreStyles();
  // `bare` = immersive full-screen mode (mini games): no header, no footer,
  // no overlays competing for the vertical space.
  if (bare) return <>{children}</>;
  return (
    <>
      <MaintenanceBanner />
      <Navbar />
      {children}
      <Footer />
      <CartDrawer />
      <AddedToCartModal />
      <AdminFab />
      <InlineTextEditor />
    </>

  );
}



