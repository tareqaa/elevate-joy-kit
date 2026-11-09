import { describe, it, expect } from "vitest";
import { matchSearchQuery, buildSearchHaystack, type SearchableItem } from "../search";

describe("GX Store Search Engine — Bilingual Matching", () => {
  const items: SearchableItem[] = [
    {
      id: "prod-minecraft",
      slug: "minecraft-java-bedrock",
      type: "product",
      nameAr: "Minecraft: Java & Bedrock Edition | كود ويندوز ستور (PC)",
      nameEn: "Minecraft: Java & Bedrock Edition | Windows Store Code (PC)",
      categorySlug: "games",
      link: "/product/minecraft-java-bedrock",
    },
    {
      id: "prod-gemini",
      slug: "gemini",
      type: "product",
      nameAr: "Google Gemini Plus | اشتراك 6 أشهر",
      nameEn: "Google Gemini Plus — 6 Months",
      categorySlug: "design",
      link: "/product/gemini",
    },
    {
      id: "prod-lovable",
      slug: "lovable-lite-12m",
      type: "product",
      nameAr: "Lovable Lite — 12 شهر (300 رصيد شهرياً)",
      nameEn: "Lovable Lite — 12 Months",
      categorySlug: "design",
      link: "/product/lovable-lite-12m",
    },
    {
      id: "prod-notion",
      slug: "notion-business",
      type: "product",
      nameAr: "Notion Business — اشتراك 3 أشهر",
      nameEn: "Notion Business — 3 Months",
      categorySlug: "design",
      link: "/product/notion-business",
    },
    {
      id: "prod-roblox",
      slug: "roblox",
      type: "product",
      nameAr: "روبلوكس — 1000 روبوكس (Robux)",
      nameEn: "Roblox — 1000 Robux",
      categorySlug: "games",
      link: "/product/roblox",
    },
    {
      id: "prod-windows-retail",
      slug: "windows-11-pro-retail",
      type: "product",
      nameAr: "Windows 11 Pro Retail",
      nameEn: "Windows 11 Pro Retail",
      categorySlug: "design",
      link: "/product/windows-11-pro-retail",
    },
  ];

  // Pre-compute haystacks
  for (const it of items) {
    it.normalizedHaystack = buildSearchHaystack(it);
  }

  it("finds Minecraft when searching 'ماين كرافت' in Arabic", () => {
    const res = matchSearchQuery(items, "ماين كرافت", "ar");
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].item.slug).toBe("minecraft-java-bedrock");
  });

  it("finds Minecraft when searching 'ماين' in Arabic", () => {
    const res = matchSearchQuery(items, "ماين", "ar");
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].item.slug).toBe("minecraft-java-bedrock");
  });

  it("finds Minecraft when searching 'minecraft' in English", () => {
    const res = matchSearchQuery(items, "minecraft", "en");
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].item.slug).toBe("minecraft-java-bedrock");
  });

  it("finds Gemini when searching 'جيمناي' in Arabic", () => {
    const res = matchSearchQuery(items, "جيمناي", "ar");
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].item.slug).toBe("gemini");
  });

  it("finds Gemini when searching 'gemini' in English", () => {
    const res = matchSearchQuery(items, "gemini", "en");
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].item.slug).toBe("gemini");
  });

  it("finds Lovable when searching 'لوفابل' in Arabic", () => {
    const res = matchSearchQuery(items, "لوفابل", "ar");
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].item.slug).toBe("lovable-lite-12m");
  });

  it("finds Notion when searching 'نوشن' in Arabic", () => {
    const res = matchSearchQuery(items, "نوشن", "ar");
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].item.slug).toBe("notion-business");
  });

  it("finds Roblox when searching 'روبوكس' in Arabic and 'robux' in English", () => {
    const resAr = matchSearchQuery(items, "روبوكس", "ar");
    expect(resAr.length).toBeGreaterThan(0);
    expect(resAr[0].item.slug).toBe("roblox");

    const resEn = matchSearchQuery(items, "robux", "en");
    expect(resEn.length).toBeGreaterThan(0);
    expect(resEn[0].item.slug).toBe("roblox");
  });
});

