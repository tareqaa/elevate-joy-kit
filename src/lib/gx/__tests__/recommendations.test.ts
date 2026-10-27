import { describe, it, expect } from "vitest";
import {
  normalizeText,
  tokenize,
  extractBrand,
  determineDomain,
  scoreCandidate,
  rankRelatedProducts,
  type RecommendationCandidate,
} from "../recommendations";

describe("GXStore Related Products Recommendation Engine", () => {
  // Test 1: Product with multiple variants / package relationships (Tier 1)
  it("prioritizes different packages or variants of the same product family in Tier 1", () => {
    const current: RecommendationCandidate = {
      slug: "linkedin-career-3m",
      nameAr: "لينكد إن بريميوم كاريير (3 أشهر)",
      nameEn: "LinkedIn Career (3 Months)",
      categorySlug: "subscriptions",
      deliveryType: "subscription",
      basePriceJod: 24,
    };

    const candidates: RecommendationCandidate[] = [
      {
        slug: "linkedin-career-12m",
        nameAr: "لينكد إن بريميوم كاريير (سنة)",
        nameEn: "LinkedIn Career (12 Months)",
        categorySlug: "subscriptions",
        deliveryType: "subscription",
        basePriceJod: 75,
      },
      {
        slug: "spotify-1m",
        nameAr: "سبوتيفاي بريميوم (شهر)",
        nameEn: "Spotify Premium (1 Month)",
        categorySlug: "subscriptions",
        deliveryType: "subscription",
        basePriceJod: 4,
      },
    ];

    const results = rankRelatedProducts(current, candidates, 8);
    expect(results[0].slug).toBe("linkedin-career-12m");
    const score = scoreCandidate(current, candidates[0]);
    expect(score.tier).toBe(1);
    expect(score.score).toBeGreaterThanOrEqual(1000);
  });

  // Test 2: Product with several alternatives from the same brand (Tier 2)
  it("ranks other eligible products from the same brand in Tier 2", () => {
    const current: RecommendationCandidate = {
      slug: "gemini",
      nameAr: "جوجل جيميني أدفانسد (سنة)",
      nameEn: "Google Gemini Advanced (12 Months)",
      categorySlug: "design",
      deliveryType: "subscription",
    };

    const sameBrand: RecommendationCandidate = {
      slug: "google-play",
      nameAr: "بطاقات جوجل بلاي",
      nameEn: "Google Play Gift Cards",
      categorySlug: "gift-cards",
      deliveryType: "key",
    };

    const unrelated: RecommendationCandidate = {
      slug: "duolingo-super-12-months",
      nameAr: "دولينجو سوبر (سنة)",
      nameEn: "Duolingo Super (12 Months)",
      categorySlug: "subscriptions",
      deliveryType: "subscription",
    };

    const scoredBrand = scoreCandidate(current, sameBrand);
    const scoredUnrelated = scoreCandidate(current, unrelated);

    expect(scoredBrand.tier).toBe(2);
    expect(scoredBrand.score).toBeGreaterThan(scoredUnrelated.score);

    const ranked = rankRelatedProducts(current, [unrelated, sameBrand], 8);
    expect(ranked[0].slug).toBe("google-play");
  });

  // Test 3: Product with alternatives on the same platform and type (Tier 3)
  it("ranks products sharing the same product type and platform in Tier 3", () => {
    const current: RecommendationCandidate = {
      slug: "helldivers-2",
      nameAr: "هيل دايفرز 2 (PC)",
      nameEn: "Helldivers 2",
      platform: "Steam / PC",
      deliveryType: "code",
      categorySlug: "games",
    };

    const samePlatAndType: RecommendationCandidate = {
      slug: "resident-evil-4-remake",
      nameAr: "ريزدنت إيفل 4 ريميك (PC)",
      nameEn: "Resident Evil 4 Remake",
      platform: "Steam / PC",
      deliveryType: "code",
      categorySlug: "games",
    };

    const scored = scoreCandidate(current, samePlatAndType);
    expect(scored.tier).toBeLessThanOrEqual(3);
  });

  // Test 4: Product with few close matches requires progressive broader fallback (Tier 4, 5, 6)
  it("progressively broadens to domain, category, and catalog fallback when few matches exist", () => {
    const current: RecommendationCandidate = {
      slug: "unique-meditation-app",
      nameAr: "تطبيق استرخاء نادر",
      nameEn: "Unique Meditation App",
      categorySlug: "health",
      deliveryType: "subscription",
    };

    const generalCandidate1: RecommendationCandidate = {
      slug: "windows",
      nameAr: "تفعيل ويندوز 11",
      nameEn: "Windows 11 Pro",
      categorySlug: "design",
      deliveryType: "key",
    };

    const generalCandidate2: RecommendationCandidate = {
      slug: "ea-fc-27-pc",
      nameAr: "لعبة إي إيه إف سي 27",
      nameEn: "EA Sports FC 27",
      categorySlug: "games",
      deliveryType: "account",
    };

    const results = rankRelatedProducts(current, [generalCandidate1, generalCandidate2], 8);
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.slug)).toContain("windows");
    expect(results.map((r) => r.slug)).toContain("ea-fc-27-pc");
  });

  // Test 5: A newly added product automatically becomes eligible without manual maintenance
  it("automatically identifies relations for newly added products based on attributes", () => {
    const current: RecommendationCandidate = {
      slug: "cursor-ultra",
      nameAr: "اشتراك كيرسور ألترا للذكاء الاصطناعي",
      nameEn: "Cursor Ultra AI Subscription",
      categorySlug: "design",
      deliveryType: "subscription",
    };

    const existingCatalog: RecommendationCandidate[] = [
      {
        slug: "gemini",
        nameAr: "جوجل جيميني أدفانسد",
        nameEn: "Google Gemini Advanced",
        categorySlug: "design",
        deliveryType: "subscription",
      },
      {
        slug: "lovable-lite-12m",
        nameAr: "لوفابل لايت",
        nameEn: "Lovable Lite",
        categorySlug: "design",
        deliveryType: "subscription",
      },
      {
        slug: "minecraft-java-bedrock",
        nameAr: "ماينكرافت",
        nameEn: "Minecraft",
        categorySlug: "games",
        deliveryType: "code",
      },
    ];

    const results = rankRelatedProducts(current, existingCatalog, 8);
    expect(results[0].slug).toBe("gemini");
    expect(results[1].slug).toBe("lovable-lite-12m");
  });

  // Test 6: Unpublished or ineligible products are excluded
  it("strictly excludes unpublished or inactive products", () => {
    const current: RecommendationCandidate = {
      slug: "fortnite",
      nameAr: "فورت نايت",
      nameEn: "Fortnite",
      categorySlug: "games",
    };

    const candidates: RecommendationCandidate[] = [
      {
        slug: "active-game",
        nameAr: "لعبة نشطة",
        nameEn: "Active Game",
        isActive: true,
      },
      {
        slug: "draft-game",
        nameAr: "لعبة مسودة",
        nameEn: "Draft Game",
        isActive: false,
      },
      {
        slug: "hidden-game",
        nameAr: "لعبة مخفية",
        nameEn: "Hidden Game",
        is_active: false,
      },
    ];

    const results = rankRelatedProducts(current, candidates, 8);
    expect(results).toHaveLength(1);
    expect(results[0].slug).toBe("active-game");
  });

  // Test 7: Catalog with fewer than 8 eligible alternatives returns all without duplication
  it("returns all eligible alternatives when catalog has fewer than 8 products without error", () => {
    const current: RecommendationCandidate = {
      slug: "test-product",
      nameAr: "منتج تجريبي",
      nameEn: "Test Product",
    };

    const smallCatalog: RecommendationCandidate[] = [
      { slug: "p1", nameAr: "منتج 1", nameEn: "Product 1" },
      { slug: "p2", nameAr: "منتج 2", nameEn: "Product 2" },
      { slug: "p3", nameAr: "منتج 3", nameEn: "Product 3" },
    ];

    const results = rankRelatedProducts(current, smallCatalog, 8);
    expect(results).toHaveLength(3);
    const uniqueSlugs = new Set(results.map((r) => r.slug));
    expect(uniqueSlugs.size).toBe(3);
  });

  // Test 8: Catalog with more than 8 eligible alternatives returns exactly 8 distinct products
  it("returns exactly 8 distinct products when at least 8 eligible candidates exist", () => {
    const current: RecommendationCandidate = {
      slug: "target-item",
      nameAr: "عنصر مستهدف",
      nameEn: "Target Item",
    };

    const largeCatalog: RecommendationCandidate[] = Array.from({ length: 20 }, (_, i) => ({
      slug: `item-${i + 1}`,
      nameAr: `عنصر ${i + 1}`,
      nameEn: `Item ${i + 1}`,
      basePriceJod: 10 + i,
    }));

    const results = rankRelatedProducts(current, largeCatalog, 8);
    expect(results).toHaveLength(8);
    const uniqueSlugs = new Set(results.map((r) => r.slug));
    expect(uniqueSlugs.size).toBe(8);
  });

  // Test 9: Current product must never appear in its own recommendations
  it("never includes the current product in recommendations", () => {
    const current: RecommendationCandidate = {
      slug: "fortnite",
      id: "prod-fortnite-123",
      nameAr: "فورت نايت",
      nameEn: "Fortnite",
      categorySlug: "games",
    };

    const candidates: RecommendationCandidate[] = [
      {
        slug: "fortnite",
        id: "prod-fortnite-123",
        nameAr: "فورت نايت",
        nameEn: "Fortnite",
        categorySlug: "games",
      },
      {
        slug: "valorant",
        nameAr: "فالورانت",
        nameEn: "Valorant",
        categorySlug: "games",
      },
    ];

    const results = rankRelatedProducts(current, candidates, 8);
    expect(results.some((r) => r.slug === "fortnite")).toBe(false);
    expect(results[0].slug).toBe("valorant");
  });

  // Test 10: Incomplete or inconsistent metadata handled gracefully without crashing
  it("handles missing or inconsistent metadata without errors", () => {
    const current: RecommendationCandidate = {
      slug: "broken-meta",
      nameAr: "",
      nameEn: null,
      taglineAr: null,
      descriptionAr: undefined,
      platform: null,
      deliveryType: null,
      categorySlug: null,
      basePriceJod: null,
    };

    const messyCandidates: RecommendationCandidate[] = [
      {
        slug: "c1",
        nameAr: "منتج سليم",
        nameEn: "Valid Product",
        platform: null,
        deliveryType: undefined,
      },
      {
        slug: "c2",
        nameAr: "منتج 2",
        nameEn: null,
      },
    ];

    expect(() => {
      const results = rankRelatedProducts(current, messyCandidates, 8);
      expect(results).toHaveLength(2);
    }).not.toThrow();
  });

  // Test 11: NordVPN must surface all other VPN products at the very top of recommendations
  it("ranks all other VPN products at the top for NordVPN above unrelated products", () => {
    const currentNordVpn: RecommendationCandidate = {
      slug: "nordvpn",
      nameAr: "NordVPN | اشتراك 3 أشهر (10 أجهزة)",
      nameEn: "NordVPN | 3 Months for 10 Devices (No Card Required)",
      categorySlug: "design",
      deliveryType: "link",
      platform: "PC / Mac / iOS / Android",
      descriptionAr: "اشتراك NordVPN الرسمي لحماية خصوصيتك وتأمين اتصالك وتشفير بياناتك بأعلى معايير الأمان وتخطي الحجب.",
    };

    const catalog: RecommendationCandidate[] = [
      {
        slug: "surfshark-vpn",
        nameAr: "Surfshark VPN | شهرين تجريبي للأجهزة غير المحدودة",
        nameEn: "Surfshark VPN (2 Months Trial)",
        categorySlug: "design",
        deliveryType: "code",
        platform: "Surfshark",
        descriptionAr: "اشتراك Surfshark VPN لحماية وتأمين أجهزتك وتشفير البيانات مع سيرفرات سريعة.",
      },
      {
        slug: "expressvpn",
        nameAr: "ExpressVPN | اشتراك شهر واحد",
        nameEn: "ExpressVPN (1 Month)",
        categorySlug: "design",
        deliveryType: "account",
        platform: "ExpressVPN",
        descriptionAr: "اشتراك ExpressVPN الرائد في السرعة والأمان وتشفير عالي وتخطي الحجب.",
      },
      {
        slug: "avast-secureline-vpn",
        nameAr: "Avast SecureLine VPN | اشتراك سنة كاملة",
        nameEn: "Avast SecureLine VPN (1 Year)",
        categorySlug: "design",
        deliveryType: "code",
        platform: "Avast",
        descriptionAr: "تفعيل رسمي أصلي لـ Avast SecureLine VPN لحماية الخصوصية والتصفح الآمن.",
      },
      {
        slug: "avg-secure-vpn",
        nameAr: "AVG Secure VPN | اشتراك سنة كاملة",
        nameEn: "AVG Secure VPN (1 Year)",
        categorySlug: "design",
        deliveryType: "code",
        platform: "AVG",
        descriptionAr: "تفعيل رقمي رسمي لـ AVG Secure VPN لحماية الخصوصية وتأمين الاتصال.",
      },
      {
        slug: "windows",
        nameAr: "Windows 11 Pro",
        nameEn: "Windows 11 Pro",
        categorySlug: "design",
        deliveryType: "key",
        platform: "Microsoft",
      },
      {
        slug: "adobe-express",
        nameAr: "Adobe Express Premium",
        nameEn: "Adobe Express Premium",
        categorySlug: "design",
        deliveryType: "code",
        platform: "Adobe",
      },
      {
        slug: "notion-business",
        nameAr: "Notion Business",
        nameEn: "Notion Business",
        categorySlug: "design",
        deliveryType: "key",
        platform: "Notion",
      },
      {
        slug: "itunes",
        nameAr: "بطاقات آيتونز",
        nameEn: "iTunes Gift Cards",
        categorySlug: "gift-cards",
        deliveryType: "key",
        platform: "Apple",
      },
    ];

    const results = rankRelatedProducts(currentNordVpn, catalog, 8);
    const top4Slugs = results.slice(0, 4).map((r) => r.slug);

    // All 4 VPNs must be in the top 4 slots
    expect(top4Slugs).toContain("surfshark-vpn");
    expect(top4Slugs).toContain("expressvpn");
    expect(top4Slugs).toContain("avast-secureline-vpn");
    expect(top4Slugs).toContain("avg-secure-vpn");

    // Non-VPN products must not appear in the top 4
    expect(top4Slugs).not.toContain("windows");
    expect(top4Slugs).not.toContain("itunes");
    expect(top4Slugs).not.toContain("adobe-express");
  });
});

