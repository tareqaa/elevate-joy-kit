import { auth, defineMcp } from "@lovable.dev/mcp-js";

import getStoreInfo from "./tools/get-store-info";
import listCategories from "./tools/list-categories";
import searchProducts from "./tools/search-products";

// SECURITY: the MCP server is not public. Callers must present a valid
// Supabase (GoTrue) access token for this project.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? "https://pvwsktauvvxvmdpdzqrb.supabase.co";

export default defineMcp({
  name: "gx-store-mcp",
  title: "GX Store MCP",
  version: "0.1.0",
  auth: auth.oauth.issuer({
    issuer: `${SUPABASE_URL}/auth/v1`,
    acceptedAudiences: ["authenticated"],
    resourceName: "GX Store MCP",
  }),
  instructions:
    "Read-only tools for the GX Store storefront (digital subscriptions, gift cards, and game top-ups). Use `get_store_info` for contact/currency info, `list_categories` for top-level sections, and `search_products` to look up a product by keyword.",
  tools: [getStoreInfo, listCategories, searchProducts],
});
