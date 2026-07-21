import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

const CATEGORIES = [
  { slug: "snapchat", name: "سناب بلس", type: "direct", url: "/app/snapchat/index.html" },
  { slug: "games", name: "شحن الألعاب", type: "group", url: "/app/games/index.html" },
  { slug: "gift-cards", name: "بطاقات الهدايا", type: "group", url: "/app/gift-cards/index.html" },
  { slug: "design", name: "برامج التصميم", type: "group", url: "/app/design/index.html" },
];

export default defineTool({
  name: "list_categories",
  title: "List categories",
  description: "List the top-level shopping categories available in GX Store.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [{ type: "text", text: JSON.stringify({ categories: CATEGORIES }, null, 2) }],
    structuredContent: { categories: CATEGORIES },
  }),
});
