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
