// Shared <link> tags for the legacy store CSS bundle.
export const STORE_HEAD_LINKS = [
  { rel: "stylesheet", href: "/app/assets/css/theme.css", "data-gx-store": "/app/assets/css/theme.css" },
  { rel: "stylesheet", href: "/app/assets/css/home.css", "data-gx-store": "/app/assets/css/home.css" },
  { rel: "stylesheet", href: "/app/assets/css/cart.css", "data-gx-store": "/app/assets/css/cart.css" },
  { rel: "stylesheet", href: "/app/assets/css/faq.css", "data-gx-store": "/app/assets/css/faq.css" },
  { rel: "stylesheet", href: "/app/assets/css/policy.css", "data-gx-store": "/app/assets/css/policy.css" },
  { rel: "stylesheet", href: "/app/assets/css/product.css", "data-gx-store": "/app/assets/css/product.css" },
  { rel: "stylesheet", href: "/app/assets/css/category.css", "data-gx-store": "/app/assets/css/category.css" },
  { rel: "stylesheet", href: "/app/assets/css/snapchat.css", "data-gx-store": "/app/assets/css/snapchat.css" },
  { rel: "stylesheet", href: "/app/assets/css/fortnite.css", "data-gx-store": "/app/assets/css/fortnite.css" },
  { rel: "stylesheet", href: "/app/assets/css/giftcard.css", "data-gx-store": "/app/assets/css/giftcard.css" },
  { rel: "stylesheet", href: "/app/assets/css/coming-soon.css", "data-gx-store": "/app/assets/css/coming-soon.css" },
  { rel: "stylesheet", href: "/app/assets/css/gx-animations.css", "data-gx-store": "/app/assets/css/gx-animations.css" },
  { rel: "stylesheet", href: "/app/assets/css/games.css", "data-gx-store": "/app/assets/css/games.css" },
];

export const CORE_CSS = STORE_HEAD_LINKS;
export const PAGE_CSS = {} as any;

/**
 * Helper to generate head links.
 * Reverted to return the full list unconditionally.
 */
export function getStoreHeadLinks(_keys?: any) {
  return STORE_HEAD_LINKS;
}


