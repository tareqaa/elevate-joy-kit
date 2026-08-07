// Shared <link> tags for the legacy store CSS bundle.
// Only store-facing routes should include these — /account and /admin must
// stay isolated from these global stylesheets to keep the shadcn theme intact.
export const STORE_HEAD_LINKS = [
  { rel: "stylesheet", href: "/app/assets/css/theme.css" },
  { rel: "stylesheet", href: "/app/assets/css/home.css" },
  { rel: "stylesheet", href: "/app/assets/css/cart.css" },
  { rel: "stylesheet", href: "/app/assets/css/faq.css" },
  { rel: "stylesheet", href: "/app/assets/css/policy.css" },
  { rel: "stylesheet", href: "/app/assets/css/product.css" },
  { rel: "stylesheet", href: "/app/assets/css/category.css" },
  { rel: "stylesheet", href: "/app/assets/css/snapchat.css" },
  { rel: "stylesheet", href: "/app/assets/css/fortnite.css" },
  { rel: "stylesheet", href: "/app/assets/css/giftcard.css" },
  { rel: "stylesheet", href: "/app/assets/css/coming-soon.css" },
  { rel: "stylesheet", href: "/app/assets/css/games.css" },
];

/**
 * Injects STORE_HEAD_LINKS into <head> if they aren't already there.
 * Safe to call repeatedly (e.g. once at module load and again on mount) —
 * each link is tagged so duplicates are skipped.
 */
export function ensureStoreStyles(): void {
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
