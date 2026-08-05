// Shared <link> tags for the legacy store CSS bundle.
// Now optimized to split core styles from page-specific ones.

export const CORE_CSS = [
  { rel: "stylesheet", href: "/app/assets/css/theme.css", "data-gx-store": "/app/assets/css/theme.css" },
];

export const PAGE_CSS = {
  home: { rel: "stylesheet", href: "/app/assets/css/home.css", "data-gx-store": "/app/assets/css/home.css" },
  cart: { rel: "stylesheet", href: "/app/assets/css/cart.css", "data-gx-store": "/app/assets/css/cart.css" },
  faq: { rel: "stylesheet", href: "/app/assets/css/faq.css", "data-gx-store": "/app/assets/css/faq.css" },
  policy: { rel: "stylesheet", href: "/app/assets/css/policy.css", "data-gx-store": "/app/assets/css/policy.css" },
  product: { rel: "stylesheet", href: "/app/assets/css/product.css", "data-gx-store": "/app/assets/css/product.css" },
  category: { rel: "stylesheet", href: "/app/assets/css/category.css", "data-gx-store": "/app/assets/css/category.css" },
  snapchat: { rel: "stylesheet", href: "/app/assets/css/snapchat.css", "data-gx-store": "/app/assets/css/snapchat.css" },
  fortnite: { rel: "stylesheet", href: "/app/assets/css/fortnite.css", "data-gx-store": "/app/assets/css/fortnite.css" },
  giftcard: { rel: "stylesheet", href: "/app/assets/css/giftcard.css", "data-gx-store": "/app/assets/css/giftcard.css" },
  coming_soon: { rel: "stylesheet", href: "/app/assets/css/coming-soon.css", "data-gx-store": "/app/assets/css/coming-soon.css" },
  games: { rel: "stylesheet", href: "/app/assets/css/games.css", "data-gx-store": "/app/assets/css/games.css" },
} as const;

/**
 * Helper to generate head links with core CSS + specific pages
 */
export function getStoreHeadLinks(keys: (keyof typeof PAGE_CSS)[] = []) {
  const specific = keys.map(k => PAGE_CSS[k]);
  return [...CORE_CSS, ...specific];
}
