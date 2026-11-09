import { describe, it, expect } from "vitest";
import { getEffectiveStockLimit } from "../site-settings";
import { resolveProductImage } from "../product-images";

describe("per-package stock limits", () => {
  it("marking one TOD package sold out leaves its sibling packages open", () => {
    const limits = { "tod-4k-1y": 0 };
    expect(getEffectiveStockLimit(limits, "tod-4k-1y", "tod")).toBe(0);
    expect(getEffectiveStockLimit(limits, "tod-total-1m", "tod")).toBeNull();
    expect(getEffectiveStockLimit(limits, "tod-mobile-1y", "tod")).toBeNull();
  });

  it("a cap on one package does not cap its siblings", () => {
    const limits = { "tod-4k-1y": 1 };
    expect(getEffectiveStockLimit(limits, "tod-4k-1y", "tod")).toBe(1);
    expect(getEffectiveStockLimit(limits, "tod-total-1m", "tod")).toBeNull();
  });

  it("a product-level limit still applies to packages without their own limit", () => {
    const limits = { tod: 0, "tod-total-1m": 3 };
    expect(getEffectiveStockLimit(limits, "tod-4k-1y", "tod")).toBe(0);
    expect(getEffectiveStockLimit(limits, "tod-total-1m", "tod")).toBe(3);
  });
});

describe("product images", () => {
  it("Autodesk never shows a TOD picture", () => {
    const img = resolveProductImage({ cartId: "autodesk", slug: "autodesk", name: "Autodesk All Apps 1 Year" });
    expect(img).not.toMatch(/tod/i);
  });
});
