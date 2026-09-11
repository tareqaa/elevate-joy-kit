import React, { useState, useMemo, useEffect, useRef } from "react";
import type { CatalogStoreProduct, ProductDeliveryType } from "@/lib/gx/catalog.functions";
import { CATEGORY_LINKS } from "@/data/products";
import { useLang } from "@/lib/gx/i18n";
import { resolveStrictDeliveryType } from "@/lib/gx/delivery-types";

export type CatalogFilterBarProps = {
  products: CatalogStoreProduct[];
  onFilteredChange: (filtered: CatalogStoreProduct[]) => void;
  initialCategory?: string;
  showCategoryFilter?: boolean;
};

export function CatalogFilterBar({
  products,
  onFilteredChange,
  initialCategory = "all",
  showCategoryFilter = true,
}: CatalogFilterBarProps) {
  const { lang } = useLang();
  const ar = lang === "ar";

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState(initialCategory);
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [pricePreset, setPricePreset] = useState("all");
  const [sortBy, setSortBy] = useState("popular");

  // Popover State & Click-Outside Ref
  const [showPricePopover, setShowPricePopover] = useState(false);
  const pricePopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pricePopoverRef.current && !pricePopoverRef.current.contains(event.target as Node)) {
        setShowPricePopover(false);
      }
    }
    if (showPricePopover) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPricePopover]);

  // Sync initialCategory if prop changes
  useEffect(() => {
    setSelectedCat(initialCategory);
  }, [initialCategory]);

  // Category Options
  const categoryOptions = useMemo(() => {
    return CATEGORY_LINKS.filter((c) => c.slug !== "products");
  }, []);

  // Compute DYNAMIC platforms with product counts based on current category
  const availablePlatforms = useMemo(() => {
    const candidateProducts = products.filter((p) => {
      if (selectedCat === "all") return true;
      if (selectedCat === "snapchat") return p.slug === "snapchat";
      if (selectedCat === "gift-cards") {
        return (
          p.parentCategorySlug === "gift-cards" ||
          p.categorySlug === "gift-cards" ||
          p.categorySlug?.startsWith("gc-") ||
          ["playstation", "xbox", "itunes", "google-play"].includes(p.slug) ||
          p.productType === "giftcard"
        );
      }
      if (selectedCat === "design") {
        return (
          p.parentCategorySlug === "design" ||
          p.categorySlug === "design" ||
          p.categorySlug === "windows-keys" ||
          ["windows", "adobe", "canva", "microsoft365", "autodesk", "linkedin"].includes(p.slug)
        );
      }
      if (selectedCat === "games") {
        return (
          p.parentCategorySlug === "games" ||
          p.categorySlug === "games" ||
          p.categorySlug === "fortnite" ||
          p.categorySlug === "pc-games" ||
          ["fortnite", "fc-27"].includes(p.slug)
        );
      }
      return (
        p.categorySlug === selectedCat ||
        p.parentCategorySlug === selectedCat ||
        p.slug === selectedCat
      );
    });

    const counts: Record<string, number> = {};
    for (const p of candidateProducts) {
      if (p.platform && p.platform.trim() && p.platform !== "GX Store") {
        const plat = p.platform.trim();
        counts[plat] = (counts[plat] || 0) + 1;
      }
    }

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [products, selectedCat]);

  // Reset platform if no longer valid under new category
  useEffect(() => {
    if (selectedPlatform !== "all" && !availablePlatforms.some((p) => p.name === selectedPlatform)) {
      setSelectedPlatform("all");
    }
  }, [availablePlatforms, selectedPlatform]);

  // Product Type options (Strictly the 4 Delivery Types requested: code, account, topup, link)
  const typeOptions: { id: string; labelAr: string; labelEn: string; icon: string }[] = [
    { id: "all", labelAr: "كل الأنواع", labelEn: "All Types", icon: "✨" },
    { id: "code", labelAr: "كود تفعيل", labelEn: "Activation Code", icon: "🔑" },
    { id: "account", labelAr: "حساب جاهز", labelEn: "Ready Account", icon: "👤" },
    { id: "topup", labelAr: "شحن مباشر", labelEn: "Direct Top-up", icon: "💎" },
    { id: "link", labelAr: "رابط تفعيل", labelEn: "Activation Link", icon: "🔗" },
  ];

  // Region options
  const regionOptions = [
    { id: "all", labelAr: "كل المناطق", labelEn: "All Regions", icon: "🌐" },
    { id: "global", labelAr: "عالمي (Global)", labelEn: "Global", icon: "🌍" },
    { id: "us", labelAr: "أمريكي (USA)", labelEn: "USA", icon: "🇺🇸" },
    { id: "tr", labelAr: "تركي (Turkey)", labelEn: "Turkey", icon: "🇹🇷" },
    { id: "sa", labelAr: "سعودي (KSA)", labelEn: "Saudi Arabia", icon: "🇸🇦" },
    { id: "ae", labelAr: "إماراتي (UAE)", labelEn: "UAE", icon: "🇦🇪" },
    { id: "gb", labelAr: "بريطاني (UK)", labelEn: "UK", icon: "🇬🇧" },
  ];

  // Price Presets
  const handlePricePreset = (preset: string) => {
    setPricePreset(preset);
    if (preset === "all") {
      setMinPrice("");
      setMaxPrice("");
    } else if (preset === "under5") {
      setMinPrice("0");
      setMaxPrice("5");
    } else if (preset === "5to15") {
      setMinPrice("5");
      setMaxPrice("15");
    } else if (preset === "15to35") {
      setMinPrice("15");
      setMaxPrice("35");
    } else if (preset === "above35") {
      setMinPrice("35");
      setMaxPrice("");
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery("");
    if (showCategoryFilter) setSelectedCat("all");
    setSelectedPlatform("all");
    setSelectedType("all");
    setSelectedRegion("all");
    setMinPrice("");
    setMaxPrice("");
    setPricePreset("all");
    setSortBy("popular");
  };

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (showCategoryFilter && selectedCat !== "all") count++;
    if (selectedPlatform !== "all") count++;
    if (selectedType !== "all") count++;
    if (selectedRegion !== "all") count++;
    if (minPrice || maxPrice || pricePreset !== "all") count++;
    if (sortBy !== "popular") count++;
    return count;
  }, [searchQuery, showCategoryFilter, selectedCat, selectedPlatform, selectedType, selectedRegion, minPrice, maxPrice, pricePreset, sortBy]);

  // Main Filtering & Sorting Logic
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const minP = minPrice ? parseFloat(minPrice) : null;
    const maxP = maxPrice ? parseFloat(maxPrice) : null;

    const res = products.filter((p) => {
      // 1. Category Filter
      if (selectedCat !== "all") {
        if (selectedCat === "snapchat") {
          if (p.slug !== "snapchat") return false;
        } else if (selectedCat === "gift-cards") {
          const isGiftCard =
            p.parentCategorySlug === "gift-cards" ||
            p.categorySlug === "gift-cards" ||
            p.categorySlug?.startsWith("gc-") ||
            ["playstation", "xbox", "itunes", "google-play"].includes(p.slug) ||
            p.productType === "giftcard";
          if (!isGiftCard) return false;
        } else if (selectedCat === "design") {
          const isDesign =
            p.parentCategorySlug === "design" ||
            p.categorySlug === "design" ||
            p.categorySlug === "windows-keys" ||
            ["windows", "adobe", "canva", "microsoft365", "autodesk", "linkedin"].includes(p.slug);
          if (!isDesign) return false;
        } else if (selectedCat === "games") {
          const isGames =
            p.parentCategorySlug === "games" ||
            p.categorySlug === "games" ||
            p.categorySlug === "fortnite" ||
            p.categorySlug === "pc-games" ||
            ["fortnite", "fc-27"].includes(p.slug);
          if (!isGames) return false;
        } else {
          const match =
            p.categorySlug === selectedCat ||
            p.parentCategorySlug === selectedCat ||
            p.slug === selectedCat;
          if (!match) return false;
        }
      }

      // 2. Dynamic Platform Filter
      if (selectedPlatform !== "all") {
        const plat = (p.platform || "").toLowerCase();
        if (plat !== selectedPlatform.toLowerCase()) return false;
      }

      // 3. Product Delivery Type Filter (Strict 4 Types)
      if (selectedType !== "all") {
        const strictType = resolveStrictDeliveryType({
          slug: p.slug,
          cartId: p.cartId,
          name: p.nameAr,
          nameAr: p.nameAr,
          productType: p.productType,
          isGiftCardMaster: p.isGiftCardMaster,
        });
        if (strictType !== selectedType) return false;
      }

      // 4. Region Filter
      if (selectedRegion !== "all") {
        const reg = (p.region || "").toLowerCase();
        if (selectedRegion === "global") {
          if (!reg.includes("global") && !reg.includes("عالمي") && reg !== "") return false;
        } else if (selectedRegion === "us") {
          if (!reg.includes("us") && !reg.includes("أمريك") && !reg.includes("united states")) return false;
        } else if (selectedRegion === "tr") {
          if (!reg.includes("tr") && !reg.includes("ترك") && !reg.includes("turkey")) return false;
        } else if (selectedRegion === "sa") {
          if (!reg.includes("sa") && !reg.includes("سعود") && !reg.includes("ksa")) return false;
        } else if (selectedRegion === "ae") {
          if (!reg.includes("ae") && !reg.includes("إمارات") && !reg.includes("uae")) return false;
        } else if (selectedRegion === "gb") {
          if (!reg.includes("gb") && !reg.includes("uk") && !reg.includes("بريطان")) return false;
        }
      }

      // 5. Price Filter
      const price = typeof p.basePriceJod === "number" ? p.basePriceJod : 0;
      if (minP !== null && !isNaN(minP) && price < minP) return false;
      if (maxP !== null && !isNaN(maxP) && price > maxP) return false;

      // 6. Search Query
      if (q) {
        const nameAr = (p.nameAr || "").toLowerCase();
        const nameEn = (p.nameEn || "").toLowerCase();
        const tagAr = (p.taglineAr || "").toLowerCase();
        const tagEn = (p.taglineEn || "").toLowerCase();
        const slug = (p.slug || "").toLowerCase();
        const cartId = (p.cartId || "").toLowerCase();
        const badge = (p.badge || "").toLowerCase();
        const plat = (p.platform || "").toLowerCase();
        const pType = (p.productType || "").toLowerCase();

        return (
          nameAr.includes(q) ||
          nameEn.includes(q) ||
          tagAr.includes(q) ||
          tagEn.includes(q) ||
          slug.includes(q) ||
          cartId.includes(q) ||
          badge.includes(q) ||
          plat.includes(q) ||
          pType.includes(q)
        );
      }

      return true;
    });

    // Sorting (Exact options requested: Popularity, Price Low-High, Price High-Low, Date New-Old, Date Old-New, Alphabetical A-Z, Alphabetical Z-A)
    return res.sort((a, b) => {
      const priceA = typeof a.basePriceJod === "number" ? a.basePriceJod : 0;
      const priceB = typeof b.basePriceJod === "number" ? b.basePriceJod : 0;

      if (sortBy === "price_asc") return priceA - priceB;
      if (sortBy === "price_desc") return priceB - priceA;
      if (sortBy === "date_desc") {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      }
      if (sortBy === "date_asc") {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      }
      if (sortBy === "alpha_asc") {
        const titleA = (ar ? a.nameAr : a.nameEn) || a.nameAr || "";
        const titleB = (ar ? b.nameAr : b.nameEn) || b.nameAr || "";
        return titleA.localeCompare(titleB, ar ? "ar" : "en");
      }
      if (sortBy === "alpha_desc") {
        const titleA = (ar ? a.nameAr : a.nameEn) || a.nameAr || "";
        const titleB = (ar ? b.nameAr : b.nameEn) || b.nameAr || "";
        return titleB.localeCompare(titleA, ar ? "ar" : "en");
      }

      // "popular" (Default)
      const orderA = typeof a.sortOrder === "number" ? a.sortOrder : 9999;
      const orderB = typeof b.sortOrder === "number" ? b.sortOrder : 9999;
      return orderA - orderB;
    });
  }, [products, selectedCat, selectedPlatform, selectedType, selectedRegion, minPrice, maxPrice, searchQuery, sortBy]);

  // Propagate changes to parent
  useEffect(() => {
    onFilteredChange(filteredProducts);
  }, [filteredProducts, onFilteredChange]);

  // Active Category Name
  const currentCategoryObj = categoryOptions.find((c) => c.slug === selectedCat);

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* 1. UNIFIED COHESIVE CONTROL HUB (Everything in 1 harmonious sleek bar) */}
      <div className="gx-filter-hub">
        {/* (A) Instant Search Input */}
        <div style={{ position: "relative", flex: "1 1 200px", minWidth: 170 }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={ar ? "ابحث عن منتج، لعبة، أو برنامج..." : "Search product, game or software..."}
            className="gx-filter-search-input"
            style={{ width: "100%" }}
          />
          <span
            style={{
              position: "absolute",
              insetInlineStart: 13,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 15,
              opacity: 0.6,
              pointerEvents: "none",
            }}
          >
            🔍
          </span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                insetInlineEnd: 12,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                fontSize: 13,
                padding: 4,
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* (B) Category Selector (When showCategoryFilter is true) */}
        {showCategoryFilter && (
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className={`gx-filter-control gx-filter-select ${selectedCat !== "all" ? "active" : ""}`}
            title={ar ? "تصفية حسب القسم" : "Filter by category"}
            style={{ flex: "0 1 auto" }}
          >
            <option value="all">🌟 {ar ? "كل الأقسام" : "All Categories"}</option>
            {categoryOptions.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.icon} {ar ? c.name : c.slug}
              </option>
            ))}
          </select>
        )}

        {/* (C) Dynamic Platform Selector (Updates based on chosen category) */}
        <select
          value={selectedPlatform}
          onChange={(e) => setSelectedPlatform(e.target.value)}
          className={`gx-filter-control gx-filter-select ${selectedPlatform !== "all" ? "active" : ""}`}
          title={ar ? "تصفية حسب المنصة" : "Filter by platform"}
          style={{ flex: "0 1 auto" }}
        >
          <option value="all">
            🎮 {ar ? "كل المنصات" : "All Platforms"} {availablePlatforms.length > 0 ? `(${availablePlatforms.length})` : ""}
          </option>
          {availablePlatforms.map((plat) => (
            <option key={plat.name} value={plat.name}>
              {plat.name} ({plat.count})
            </option>
          ))}
        </select>

        {/* (D) Product Delivery Type Selector */}
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className={`gx-filter-control gx-filter-select ${selectedType !== "all" ? "active" : ""}`}
          title={ar ? "نوع التسليم والمنتج" : "Filter by delivery type"}
          style={{ flex: "0 1 auto" }}
        >
          {typeOptions.map((t) => (
            <option key={t.id} value={t.id}>
              {t.icon} {ar ? t.labelAr : t.labelEn}
            </option>
          ))}
        </select>

        {/* (E) Price Filter Popover (Floating cleanly with extreme z-index) */}
        <div style={{ position: "relative" }} ref={pricePopoverRef}>
          <button
            type="button"
            onClick={() => setShowPricePopover((v) => !v)}
            className={`gx-filter-control ${minPrice || maxPrice || pricePreset !== "all" ? "active" : ""}`}
            style={{ position: "relative" }}
          >
            <span>💰</span>
            <span>
              {minPrice || maxPrice
                ? `${minPrice || "0"} - ${maxPrice || "∞"} ${ar ? "د.أ" : "JOD"}`
                : ar
                ? "السعر"
                : "Price"}
            </span>
            <span style={{ fontSize: 10, opacity: 0.7 }}>▼</span>
          </button>

          {/* Floating Price Popover Panel */}
          {showPricePopover && (
            <div className="gx-price-popover">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>
                  {ar ? "تحديد نطاق السعر (د.أ)" : "Price Range (JOD)"}
                </span>
                {(minPrice || maxPrice || pricePreset !== "all") && (
                  <button
                    type="button"
                    onClick={() => handlePricePreset("all")}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#ef4444",
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {ar ? "تفريغ" : "Reset"}
                  </button>
                )}
              </div>

              {/* Min & Max Inputs */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 5 }}>
                    {ar ? "الحد الأدنى:" : "Min Price:"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={minPrice}
                    onChange={(e) => {
                      setMinPrice(e.target.value);
                      setPricePreset("custom");
                    }}
                    style={{
                      width: "100%",
                      height: 36,
                      padding: "0 10px",
                      borderRadius: 8,
                      background: "rgba(15, 23, 42, 0.9)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      color: "#ffffff",
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 5 }}>
                    {ar ? "الحد الأعلى:" : "Max Price:"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="∞"
                    value={maxPrice}
                    onChange={(e) => {
                      setMaxPrice(e.target.value);
                      setPricePreset("custom");
                    }}
                    style={{
                      width: "100%",
                      height: 36,
                      padding: "0 10px",
                      borderRadius: 8,
                      background: "rgba(15, 23, 42, 0.9)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      color: "#ffffff",
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 14 }}>
                {[
                  { id: "all", label: ar ? "الكل" : "All" },
                  { id: "under5", label: "< 5" },
                  { id: "5to15", label: "5 - 15" },
                  { id: "15to35", label: "15 - 35" },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePricePreset(p.id)}
                    style={{
                      padding: "6px 0",
                      borderRadius: 6,
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      border: pricePreset === p.id ? "1px solid #00F5A0" : "1px solid rgba(255, 255, 255, 0.08)",
                      background: pricePreset === p.id ? "rgba(0, 245, 160, 0.18)" : "rgba(255, 255, 255, 0.03)",
                      color: pricePreset === p.id ? "#00F5A0" : "#94a3b8",
                      textAlign: "center",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowPricePopover(false)}
                style={{
                  width: "100%",
                  height: 36,
                  borderRadius: 8,
                  background: "linear-gradient(135deg, #00F5A0, #00E5FF)",
                  border: "none",
                  color: "#0f172a",
                  fontWeight: 800,
                  fontSize: 12.5,
                  cursor: "pointer",
                }}
              >
                {ar ? "تطبيق السعر" : "Apply Price"}
              </button>
            </div>
          )}
        </div>

        {/* (F) Sort Selector (Exact 7 options requested by user) */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className={`gx-filter-control gx-filter-select ${sortBy !== "popular" ? "active" : ""}`}
          title={ar ? "ترتيب المنتجات" : "Sort products"}
          style={{ flex: "0 1 auto" }}
        >
          <option value="price_asc">{ar ? "السعر: من الأدنى إلى الأعلى" : "Price: Low to High"}</option>
          <option value="price_desc">{ar ? "السعر: من الأعلى إلى الأدنى" : "Price: High to Low"}</option>
          <option value="date_desc">{ar ? "التاريخ: الأحدث أولاً" : "Date: Newest First"}</option>
          <option value="date_asc">{ar ? "التاريخ: الأقدم أولاً" : "Date: Oldest First"}</option>
          <option value="popular">{ar ? "✓ الشعبية: الأكثر شعبية" : "✓ Popularity: Most Popular"}</option>
          <option value="alpha_asc">{ar ? "الحروف الأبجدية: أ-ي" : "Alphabetical: A-Z"}</option>
          <option value="alpha_desc">{ar ? "الحروف الأبجدية: ي-أ" : "Alphabetical: Z-A"}</option>
        </select>

        {/* (G) Reset All Button (Only visible if any filter is active) */}
        {activeFiltersCount > 0 && (
          <button
            type="button"
            onClick={resetFilters}
            className="gx-filter-control"
            style={{
              borderColor: "rgba(239, 68, 68, 0.4)",
              background: "rgba(239, 68, 68, 0.12)",
              color: "#ef4444",
            }}
            title={ar ? "مسح جميع الفلاتر" : "Reset all filters"}
          >
            <span>✕ {ar ? "مسح الكل" : "Clear All"}</span>
          </button>
        )}
      </div>

      {/* 2. SLEEK HORIZONTAL CATEGORY SCROLL TRACK (Takes only 1 thin row, never wraps!) */}
      {showCategoryFilter && (
        <div className="gx-cat-scroll-track">
          <button
            type="button"
            onClick={() => setSelectedCat("all")}
            className={`gx-cat-pill ${selectedCat === "all" ? "active" : ""}`}
          >
            <span>🌟</span>
            <span>{ar ? "الكل" : "All"} ({products.length})</span>
          </button>
          {categoryOptions.map((c) => {
            const active = selectedCat === c.slug;
            return (
              <button
                key={c.slug}
                type="button"
                onClick={() => setSelectedCat(c.slug)}
                className={`gx-cat-pill ${active ? "active" : ""}`}
                style={active && c.accent ? { borderColor: c.accent, color: c.accent, background: `${c.accent}20` } : undefined}
              >
                <span>{c.icon}</span>
                <span>{ar ? c.name : c.slug}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 3. ACTIVE FILTER CHIPS & RESULTS COUNT (Ultra Clean Status Row) */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "0 4px" }}>
        {/* Active tags badges */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          {showCategoryFilter && selectedCat !== "all" && currentCategoryObj && (
            <span
              className="gx-active-tag"
              onClick={() => setSelectedCat("all")}
              title={ar ? "إلغاء تصفية القسم" : "Remove category filter"}
            >
              {currentCategoryObj.icon} {ar ? currentCategoryObj.name : currentCategoryObj.slug} ✕
            </span>
          )}
          {selectedPlatform !== "all" && (
            <span
              className="gx-active-tag"
              onClick={() => setSelectedPlatform("all")}
              title={ar ? "إلغاء تصفية المنصة" : "Remove platform filter"}
            >
              🎮 {selectedPlatform} ✕
            </span>
          )}
          {selectedType !== "all" && (
            <span
              className="gx-active-tag"
              onClick={() => setSelectedType("all")}
              title={ar ? "إلغاء تصفية النوع" : "Remove type filter"}
            >
              {typeOptions.find((t) => t.id === selectedType)?.labelAr || selectedType} ✕
            </span>
          )}
          {(minPrice || maxPrice) && (
            <span
              className="gx-active-tag"
              onClick={() => {
                setMinPrice("");
                setMaxPrice("");
                setPricePreset("all");
              }}
              title={ar ? "إلغاء تصفية السعر" : "Remove price filter"}
            >
              💰 {minPrice || "0"} - {maxPrice || "∞"} {ar ? "د.أ" : "JOD"} ✕
            </span>
          )}
          {searchQuery && (
            <span
              className="gx-active-tag"
              onClick={() => setSearchQuery("")}
              title={ar ? "مسح كلمة البحث" : "Clear search"}
            >
              🔍 "{searchQuery}" ✕
            </span>
          )}
        </div>

        {/* Results Counter */}
        <div style={{ fontSize: 12, color: "#94a3b8", display: "inline-flex", alignItems: "center", gap: 6, marginInlineStart: "auto" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00F5A0", boxShadow: "0 0 8px #00F5A0" }} />
          <span>
            {ar
              ? `يتم عرض ${filteredProducts.length} من إجمالي ${products.length} منتج`
              : `Showing ${filteredProducts.length} of ${products.length} products`}
          </span>
        </div>
      </div>
    </div>
  );
}
