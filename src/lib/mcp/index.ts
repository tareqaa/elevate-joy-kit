import { defineMcp } from "@lovable.dev/mcp-js";

import getStoreInfo from "./tools/get-store-info";
import listCategories from "./tools/list-categories";
import searchProducts from "./tools/search-products";

export default defineMcp({
  name: "gx-store-mcp",
  title: "GX Store MCP",
  version: "0.1.0",
  instructions:
    "Read-only tools for the GX Store storefront (digital subscriptions, gift cards, and game top-ups). Use `get_store_info` for contact/currency info, `list_categories` for top-level sections, and `search_products` to look up a product by keyword.",
  tools: [getStoreInfo, listCategories, searchProducts],
});
