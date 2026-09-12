import React, { useState, useMemo, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { StoreShell } from "@/components/gx/StoreShell";
import { getAllCatalogProducts, type CatalogStoreProduct } from "@/lib/gx/catalog.functions";
import { useLang } from "@/lib/gx/i18n";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { StoreProductCard } from "@/components/gx/StoreProductCard";
import { CatSortDropdown, SORT_OPTIONS } from "@/components/gx/CatSortDropdown";
import { CatPagination } from "@/components/gx/CatPagination";
import { CatDeliveryTypeDropdown, DELIVERY_TYPE_OPTIONS } from "@/components/gx/CatDeliveryTypeDropdown";
import { CatPriceFilterDropdown, PRICE_PRESETS } from "@/components/gx/CatPriceFilterDropdown";
import { resolveStrictDeliveryType } from "@/lib/gx/delivery-types";

export const Route = createFileRoute("/products")({
  loader: async () => {
    const products = await getAllCatalogProducts();
    return { products };
  },
  head: () => ({
    meta: [
      { title: "جميع المنتجات والاشتراكات | متجر GX Store" },
      {
        name: "description",
        content:
          "تصفح جميع المنتجات الرقمية، اشتراكات الألعاب والترفيه، بطاقات الهدايا والشحن المتوفرة في متجر GX Store بتفعيل فوري وأسعار منافسة.",
      },
      { property: "og:site_name", content: "GX Store" },
      { property: "og:title", content: "جميع المنتجات والاشتراكات | متجر GX Store" },
      {
        property: "og:description",
        content:
          "تصفح جميع المنتجات الرقمية، اشتراكات الألعاب والترفيه، بطاقات الهدايا والشحن المتوفرة في متجر GX Store بتفعيل فوري وأسعار منافسة.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://gxstore.me/products" },
      { property: "og:image", content: "https://gxstore.me/app/assets/img/gx-logo-hires.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "جميع المنتجات والاشتراكات | متجر GX Store" },
      {
        name: "twitter:description",
        content:
          "تصفح جميع المنتجات الرقمية، اشتراكات الألعاب والترفيه، بطاقات الهدايا والشحن المتوفرة في متجر GX Store بتفعيل فوري وأسعار منافسة.",
      },
      { name: "twitter:image", content: "https://gxstore.me/app/assets/img/gx-logo-hires.jpg" },
      {
        name: "robots",
        content: "index, follow, max-image-preview:large, max-snippet:-1",
      },
    ],
    links: [
      ...STORE_HEAD_LINKS,
      { rel: "canonical", href: "https://gxstore.me/products" },
    ],
  }),
  component: AllProductsPage,
});

interface CategoryFilterTab {
  id: string;
  nameAr: string;
  nameEn: string;
  icon: string;
  color: string;
  match: (p: CatalogStoreProduct) => boolean;
}

const CATEGORY_TABS: CategoryFilterTab[] = [
  {
    id: "all",
    nameAr: "كل المنتجات",
    nameEn: "All Products",
    icon: "🌟",
    color: "#00f5a0",
    match: () => true,
  },
  {
    id: "subscriptions",
    nameAr: "الاشتراكات",
    nameEn: "Subscriptions",
    icon: "⚡",
    color: "#f59e0b",
    match: (p) =>
      p.parentCategorySlug === "subscriptions" ||
      p.categorySlug === "subscriptions" ||
      (p.slug || "").includes("game-pass") ||
      (p.slug || "").includes("nitro"),
  },
  {
    id: "games",
    nameAr: "الألعاب",
    nameEn: "Games",
    icon: "🎮",
    color: "#8b5cf6",
    match: (p) =>
      p.parentCategorySlug === "games" ||
      p.categorySlug === "games" ||
      p.categorySlug === "pc-games" ||
      p.categorySlug === "fortnite" ||
      (p.slug || "").includes("fortnite") ||
      (p.slug || "").includes("fifa") ||
      (p.slug || "").includes("fc-"),
  },
  {
    id: "design",
    nameAr: "البرامج والتطبيقات",
    nameEn: "Apps & Software",
    icon: "🧩",
    color: "#00c4cc",
    match: (p) =>
      p.parentCategorySlug === "design" ||
      p.categorySlug === "design" ||
      p.categorySlug === "windows-keys" ||
      ["windows", "adobe", "canva", "microsoft365", "autodesk", "linkedin"].some((k) =>
        (p.slug || "").includes(k)
      ),
  },
  {
    id: "social-media",
    nameAr: "السوشال ميديا",
    nameEn: "Social Media",
    icon: "📱",
    color: "#ec4899",
    match: (p) =>
      p.parentCategorySlug === "social-media" ||
      p.categorySlug === "social-media" ||
      (p.slug || "").includes("snapchat") ||
      (p.slug || "").includes("tiktok") ||
      (p.slug || "").includes("instagram"),
  },
  {
    id: "gift-cards",
    nameAr: "بطاقات الهدايا",
    nameEn: "Gift Cards",
    icon: "🎁",
    color: "#10b981",
    match: (p) =>
      p.parentCategorySlug === "gift-cards" ||
      p.categorySlug === "gift-cards" ||
      p.categorySlug?.startsWith("gc-") ||
      p.productType === "giftcard",
  },
  {
    id: "services",
    nameAr: "الخدمات",
    nameEn: "Services",
    icon: "🛠️",
    color: "#3b82f6",
    match: (p) =>
      p.parentCategorySlug === "services" ||
      p.categorySlug === "services",
  },
];

function formatOfferCount(count: number, lang: string): string {
  if (lang === "en") return `${count} ${count === 1 ? "offer" : "offers"}`;
  if (count === 1) return "عرض واحد";
  if (count === 2) return "عرضان";
  if (count >= 3 && count <= 10) return `${count} عروض`;
  return `${count} عرض`;
}

function AllProductsPage() {
  const { products } = Route.useLoaderData();
  const { lang } = useLang();
  const ar = lang === "ar";
  const pick = (arText?: string | null, enText?: string | null) =>
    (ar ? arText || enText : enText || arText) || "";

  // Filter & Sort State
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("popular");
  const [selectedDeliveryType, setSelectedDeliveryType] = useState<string>("all");
  const [selectedPricePreset, setSelectedPricePreset] = useState<string>("all");
  const [customMinPrice, setCustomMinPrice] = useState<string>("");
  const [customMaxPrice, setCustomMaxPrice] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Responsive Pagination State (25 on desktop, 10 on mobile)
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 640;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const itemsPerPage = isMobile ? 10 : 25;
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Sync state with URL search query params on load and navigation
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const catParam = params.get("category");
    const sortParam = params.get("sort");
    const searchParam = params.get("search");
    const maxPriceParam = params.get("max_price");
    const minPriceParam = params.get("min_price");
    const delivParam = params.get("delivery_type");

    if (catParam) setSelectedCat(catParam);
    if (sortParam) setSortBy(sortParam);
    if (searchParam) setSearchQuery(searchParam);
    if (maxPriceParam) {
      setCustomMaxPrice(maxPriceParam);
      setSelectedPricePreset("all");
    }
    if (minPriceParam) setCustomMinPrice(minPriceParam);
    if (delivParam) setSelectedDeliveryType(delivParam);
  }, []);

  // Reset pagination on filter or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCat, sortBy, selectedDeliveryType, selectedPricePreset, customMinPrice, customMaxPrice, searchQuery]);

  // Compute category counts
  const categoryTabsWithCounts = useMemo(() => {
    return CATEGORY_TABS.map((tab) => ({
      ...tab,
      count: tab.id === "all" ? products.length : products.filter(tab.match).length,
    })).filter((tab) => tab.id === "all" || tab.count > 0);
  }, [products]);

  // Top selling games slug priority for "popular" sort
  const TOP_GAME_SLUGS: string[] = [
    "ea-fc-27-pc",
    "gta-v-enhanced-pc",
    "red-dead-redemption-2",
    "helldivers-2",
    "minecraft-java-bedrock",
    "mortal-kombat-11-ultimate",
    "forza-horizon-6-pc",
    "resident-evil-4-remake",
    "arc-raiders",
    "batman-arkham-collection",
    "dark-souls-3-deluxe",
    "bioshock-the-collection",
    "fortnite",
  ];

  // Filter and sort products
  const displayedProducts = useMemo(() => {
    let list = [...products];

    // 0. Search Query Filter (e.g. from genre cards or search input)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => {
        const text = `${p.nameAr || ""} ${p.nameEn || ""} ${p.taglineAr || ""} ${p.taglineEn || ""} ${p.slug || ""} ${p.categorySlug || ""} ${p.parentCategorySlug || ""}`.toLowerCase();
        return text.includes(q);
      });
    }

    // 1. Category Filter
    if (selectedCat !== "all") {
      const activeTab = CATEGORY_TABS.find((t) => t.id === selectedCat);
      if (activeTab) {
        list = list.filter(activeTab.match);
      }
    }

    // 2. Delivery Type Filter
    if (selectedDeliveryType !== "all") {
      list = list.filter((p) => {
        const itemType = resolveStrictDeliveryType(p);
        return itemType === selectedDeliveryType;
      });
    }

    // 3. Price Range Filter
    if (customMinPrice !== "") {
      const minVal = parseFloat(customMinPrice);
      if (!isNaN(minVal)) list = list.filter((p) => (p.basePriceJod || 0) >= minVal);
    } else if (selectedPricePreset !== "all") {
      const preset = PRICE_PRESETS.find((pr) => pr.id === selectedPricePreset);
      if (preset?.min !== undefined) {
        list = list.filter((p) => (p.basePriceJod || 0) >= preset.min!);
      }
    }

    if (customMaxPrice !== "") {
      const maxVal = parseFloat(customMaxPrice);
      if (!isNaN(maxVal)) list = list.filter((p) => (p.basePriceJod || 0) <= maxVal);
    } else if (selectedPricePreset !== "all") {
      const preset = PRICE_PRESETS.find((pr) => pr.id === selectedPricePreset);
      if (preset?.max !== undefined) {
        list = list.filter((p) => (p.basePriceJod || 0) <= preset.max!);
      }
    }

    // 4. Sorting (Matching Image 3 options)
    list.sort((a, b) => {
      const priceA = typeof a.basePriceJod === "number" ? a.basePriceJod : 0;
      const priceB = typeof b.basePriceJod === "number" ? b.basePriceJod : 0;
      const nameA = (a.nameAr || a.nameEn || "").trim();
      const nameB = (b.nameAr || b.nameEn || "").trim();
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;

      if (sortBy === "price_asc") return priceA - priceB;
      if (sortBy === "price_desc") return priceB - priceA;
      if (sortBy === "date_desc") return dateB - dateA;
      if (sortBy === "date_asc") return dateA - dateB;
      if (sortBy === "alpha_asc") return nameA.localeCompare(nameB, "ar");
      if (sortBy === "alpha_desc") return nameB.localeCompare(nameA, "ar");

      // Bestseller / Popular sort
      if (sortBy === "popular") {
        const rankA = TOP_GAME_SLUGS.indexOf(a.slug);
        const rankB = TOP_GAME_SLUGS.indexOf(b.slug);
        if (rankA !== -1 && rankB !== -1) return rankA - rankB;
        if (rankA !== -1) return -1;
        if (rankB !== -1) return 1;
      }

      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });

    return list;
  }, [products, selectedCat, sortBy, selectedDeliveryType, selectedPricePreset, customMinPrice, customMaxPrice, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(displayedProducts.length / itemsPerPage));

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return displayedProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [displayedProducts, currentPage, itemsPerPage]);

  const activeCategoryObj = useMemo(() => {
    return categoryTabsWithCounts.find((t) => t.id === selectedCat) || null;
  }, [categoryTabsWithCounts, selectedCat]);

  return (
    <StoreShell>
      {/* 1. Hero Stage Section */}
      <section className="product-hero category-hero">
        <div className="wrap">
          <div className="category-stage-card">
            {/* Top Stage Header */}
            <div className="cat-stage-top">
              <div className="cat-stage-heading">
                <div className="cat-stage-badge">
                  <span style={{ fontSize: 32 }}>✨</span>
                </div>

                <div className="cat-stage-title-wrap">
                  {/* Breadcrumb */}
                  <div className="cat-stage-breadcrumb">
                    <Link to="/" className="crumb-link">
                      {ar ? "الرئيسية" : "Home"}
                    </Link>
                    <span className="crumb-sep">/</span>
                    <span className="crumb-current">
                      {ar ? "جميع المنتجات" : "All Products"}
                    </span>
                  </div>

                  <h1>{ar ? "جميع منتجات المتجر" : "All Store Products"}</h1>
                  <p className="cat-stage-desc">
                    {ar
                      ? "تصفح كافة الاشتراكات الرقمية، كروت الألعاب، البرامج ومفاتيح التفعيل الرسمية في مكان واحد بأفضل الأسعار وتفعيل فوري."
                      : "Browse all official digital subscriptions, gaming cards, software suites, and activation keys in one place."}
                  </p>
                </div>
              </div>
            </div>

            {/* Category Filter Pills Inside Stage */}
            <div className="cat-stage-platforms">
              <div className="platform-static-grid">
                {categoryTabsWithCounts.map((tab) => {
                  const isActive = selectedCat === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      className={`platform-square-card ${isActive ? "is-active" : ""}`}
                      style={{
                        borderColor: isActive ? tab.color : undefined,
                        boxShadow: isActive ? `0 0 24px ${tab.color}40` : undefined,
                      }}
                      onClick={() => setSelectedCat(tab.id)}
                      title={ar ? tab.nameAr : tab.nameEn}
                    >
                      <div className="platform-square-logo">
                        <span style={{ fontSize: 26 }}>{tab.icon}</span>
                      </div>
                      <div className="platform-square-name">
                        {ar ? tab.nameAr : tab.nameEn}
                      </div>
                      <div className="platform-square-badge">
                        {tab.id === "all"
                          ? (ar ? "الكل" : "All")
                          : formatOfferCount(tab.count, lang)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Main Products Section */}
      <section className="section" style={{ background: "var(--bg2)", paddingTop: 20, minHeight: 450 }}>
        <div className="wrap" id="all-products-section">
          {/* Products Toolbar (Product count / Filter pill on start side, Transparent Sort trigger on end side) */}
          <div className="cat-products-toolbar">
            <div className="cat-toolbar-start">
              <div className="cat-toolbar-count">
                <span className="count-num">{displayedProducts.length}</span>
                <span className="count-label">
                  {ar ? "منتج متوفر" : "Products Available"}
                </span>
              </div>

              {/* Active Category Pill */}
              {selectedCat !== "all" && activeCategoryObj && (
                <div
                  className="cat-toolbar-filter-pill"
                  style={{ borderColor: activeCategoryObj.color, background: `${activeCategoryObj.color}15` }}
                >
                  <span style={{ color: activeCategoryObj.color }}>✨ {ar ? "القسم:" : "Category:"}</span>
                  <strong className="filter-value">
                    {ar ? activeCategoryObj.nameAr : activeCategoryObj.nameEn}
                  </strong>
                  <button
                    type="button"
                    className="reset-btn"
                    onClick={() => setSelectedCat("all")}
                    title={ar ? "إلغاء فلتر القسم" : "Clear category filter"}
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Active Delivery Type Pill */}
              {selectedDeliveryType !== "all" && (
                <div
                  className="cat-toolbar-filter-pill"
                  style={{ borderColor: "#00f5a0", background: "rgba(0, 245, 160, 0.1)" }}
                >
                  <span style={{ color: "#00f5a0" }}>📦 {ar ? "النوع:" : "Type:"}</span>
                  <span style={{ fontWeight: 800 }}>
                    {DELIVERY_TYPE_OPTIONS.find((o) => o.id === selectedDeliveryType)?.shortLabelAr || selectedDeliveryType}
                  </span>
                  <button
                    type="button"
                    className="reset-btn"
                    onClick={() => setSelectedDeliveryType("all")}
                    title={ar ? "إلغاء فلتر النوع" : "Clear type filter"}
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Active Price Range Pill */}
              {(selectedPricePreset !== "all" || customMinPrice || customMaxPrice) && (
                <div
                  className="cat-toolbar-filter-pill"
                  style={{ borderColor: "#38bdf8", background: "rgba(56, 189, 248, 0.1)" }}
                >
                  <span style={{ color: "#38bdf8" }}>🏷️ {ar ? "السعر:" : "Price:"}</span>
                  <span style={{ fontWeight: 800 }}>
                    {selectedPricePreset === "custom"
                      ? `${customMinPrice || "0"} – ${customMaxPrice || "∞"} JOD`
                      : PRICE_PRESETS.find((p) => p.id === selectedPricePreset)?.labelAr || selectedPricePreset}
                  </span>
                  <button
                    type="button"
                    className="reset-btn"
                    onClick={() => {
                      setSelectedPricePreset("all");
                      setCustomMinPrice("");
                      setCustomMaxPrice("");
                    }}
                    title={ar ? "إلغاء فلتر السعر" : "Clear price filter"}
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Active Search Query Pill */}
              {searchQuery.trim() !== "" && (
                <div
                  className="cat-toolbar-filter-pill"
                  style={{ borderColor: "#00e5ff", background: "rgba(0, 229, 255, 0.1)" }}
                >
                  <span style={{ color: "#00e5ff" }}>🔍 {ar ? "البحث:" : "Search:"}</span>
                  <strong className="filter-value">{searchQuery}</strong>
                  <button
                    type="button"
                    className="reset-btn"
                    onClick={() => setSearchQuery("")}
                    title={ar ? "إلغاء البحث" : "Clear search"}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            <div className="cat-toolbar-end">
              {/* Product Delivery Type Filter Dropdown */}
              <CatDeliveryTypeDropdown
                selectedType={selectedDeliveryType}
                onTypeChange={setSelectedDeliveryType}
                lang={lang}
              />

              {/* Price Range Filter Dropdown */}
              <CatPriceFilterDropdown
                selectedPreset={selectedPricePreset}
                customMin={customMinPrice}
                customMax={customMaxPrice}
                onSelectPreset={(p) => {
                  setSelectedPricePreset(p);
                  setCustomMinPrice("");
                  setCustomMaxPrice("");
                }}
                onApplyCustom={(min, max) => {
                  setSelectedPricePreset("custom");
                  setCustomMinPrice(min);
                  setCustomMaxPrice(max);
                }}
                lang={lang}
              />

              {/* Custom Sort Dropdown */}
              <CatSortDropdown
                sortBy={sortBy}
                onSortChange={setSortBy}
                lang={lang}
              />
            </div>
          </div>

          {/* Products Grid */}
          {displayedProducts.length > 0 ? (
            <>
              <div className="cat-adaptive-grid">
                {paginatedProducts.map((p) => {
                  const name = pick(p.nameAr, p.nameEn);
                  const tagline = pick(p.taglineAr, p.taglineEn);
                  const defaultLink = p.slug
                    ? p.slug.startsWith("/")
                      ? p.slug
                      : `/product/${p.slug}${p.cartId && p.cartId !== p.slug ? `?plan=${p.cartId}` : ""}`
                    : undefined;
                  const linkTarget =
                    p.isGiftCardMaster && p.viewOfferLink
                      ? p.viewOfferLink
                      : defaultLink;

                  return (
                    <StoreProductCard
                      key={p.id}
                      slug={p.slug}
                      cartId={p.cartId || p.slug}
                      name={name}
                      link={linkTarget}
                      price={p.basePriceJod}
                      oldPrice={p.oldPriceJod}
                      tagline={tagline}
                      region={p.region}
                      productType={p.productType}
                      badge={p.badge}
                      imageUrl={p.imageUrl}
                      iconImage={p.iconImage}
                      icon={p.icon}
                      thumbBg={p.thumbBg}
                      snapDuration={p.snapDuration || undefined}
                      categoryName={p.categoryNameAr || undefined}
                      categorySlug={p.categorySlug || undefined}
                      customPlatform={p.platform || undefined}
                      showFromLabel={Boolean(p.isGiftCardMaster)}
                      isGiftCardMaster={Boolean(p.isGiftCardMaster)}
                    />
                  );
                })}
              </div>

              {/* Responsive Pagination (10 per page on mobile, 25 on desktop) */}
              <CatPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={displayedProducts.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                lang={lang}
                scrollSelector="#all-products-section"
              />
            </>
          ) : (
            <div className="text-center py-16 text-cyan-100/60">
              <div style={{ fontSize: 44, marginBottom: 12 }}>🔍</div>
              <h3 style={{ fontSize: 18, color: "#fff", marginBottom: 8 }}>
                {ar
                  ? "لم يتم العثور على منتجات مطابقة للتصفية"
                  : "No matching products found"}
              </h3>
              <p style={{ fontSize: 13, marginBottom: 16 }}>
                {ar
                  ? "جرب اختيار قسم آخر أو إعادة ضبط الفرز"
                  : "Try selecting another category or resetting sort"}
              </p>
              <button
                type="button"
                className="cat-page-btn is-active"
                onClick={() => setSelectedCat("all")}
              >
                {ar ? "عرض جميع المنتجات" : "Show All Products"}
              </button>
            </div>
          )}
        </div>
      </section>
    </StoreShell>
  );
}
