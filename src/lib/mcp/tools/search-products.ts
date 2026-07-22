import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

// Compact server-side snapshot of the storefront catalog. Prices are in JOD.
// Mirrors public/app/assets/js/products-data.js — keep in sync when the
// catalog changes materially.
const PRODUCTS = [
  {
    slug: "snapchat",
    name: "سناب بلس",
    category: "اشتراك سناب بلس",
    url: "/app/snapchat/index.html",
    plans: [
      { id: "snap-1", label: "شهر واحد", price_jod: 5 },
      { id: "snap-4", label: "4 أشهر", price_jod: 13 },
    ],
  },
  {
    slug: "adobe",
    name: "Adobe Creative Cloud",
    category: "البرامج والتطبيقات",
    url: "/app/design/adobe/index.html",
    plans: [],
  },
  {
    slug: "fortnite",
    name: "Fortnite V-Bucks",
    category: "شحن الألعاب",
    url: "/app/games/fortnite/index.html",
    plans: [],
  },
  {
    slug: "playstation",
    name: "PlayStation Gift Card",
    category: "بطاقات الهدايا",
    url: "/app/gift-cards/playstation/index.html",
    plans: [],
  },
  {
    slug: "xbox",
    name: "Xbox Gift Card",
    category: "بطاقات الهدايا",
    url: "/app/gift-cards/xbox/index.html",
    plans: [],
  },
  {
    slug: "itunes",
    name: "iTunes Gift Card",
    category: "بطاقات الهدايا",
    url: "/app/gift-cards/itunes/index.html",
    plans: [],
  },
  {
    slug: "google-play",
    name: "Google Play Gift Card",
    category: "بطاقات الهدايا",
    url: "/app/gift-cards/google-play/index.html",
    plans: [],
  },
];

export default defineTool({
  name: "search_products",
  title: "Search products",
  description:
    "Search the GX Store catalog by keyword. Matches product name, slug, or category. Returns product URLs and pricing plans when available.",
  inputSchema: {
    query: z
      .string()
      .trim()
      .min(1)
      .describe("Keyword to match against product name, slug, or category (Arabic or English)."),
    limit: z.number().int().min(1).max(20).default(10).describe("Max results (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ query, limit }) => {
    const q = query.toLowerCase();
    const matches = PRODUCTS.filter(
      (p) =>
        p.slug.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    ).slice(0, limit);

    return {
      content: [
        {
          type: "text",
          text:
            matches.length === 0
              ? `No products matched "${query}".`
              : JSON.stringify({ matches }, null, 2),
        },
      ],
      structuredContent: { matches },
    };
  },
});
