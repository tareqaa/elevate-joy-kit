/* ============================================================
   GX STORE — DYNAMIC RELATED PRODUCTS SECTION ("منتجات مشابهة")
   Displays 8 distinct, relevant product recommendations.
   Powered by the deterministic 6-tier recommendation engine.
   ============================================================ */

import React, { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useLang } from "@/lib/gx/i18n";
import { StoreProductCard } from "@/components/gx/StoreProductCard";
import type { CatalogProduct, CatalogStoreProduct } from "@/lib/gx/catalog.functions";
import { getAllCatalogProducts } from "@/lib/gx/catalog.functions";
import { rankRelatedProducts } from "@/lib/gx/recommendations";

import type { RecommendationCandidate } from "@/lib/gx/recommendations";

export interface RelatedProductsSectionProps {
  currentProduct: CatalogProduct | RecommendationCandidate;
  initialRelatedProducts?: CatalogStoreProduct[];
}

export function RelatedProductsSection({
  currentProduct,
  initialRelatedProducts,
}: RelatedProductsSectionProps) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const scrollRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<CatalogStoreProduct[]>(initialRelatedProducts || []);
  const [loading, setLoading] = useState(!initialRelatedProducts || initialRelatedProducts.length === 0);

  // If initialRelatedProducts is passed or changes, sync state
  useEffect(() => {
    if (initialRelatedProducts && initialRelatedProducts.length > 0) {
      setItems(initialRelatedProducts);
      setLoading(false);
    }
  }, [initialRelatedProducts]);

  // Fallback / client fetch if not provided in SSR
  useEffect(() => {
    if (items.length > 0) return;
    let active = true;

    (async () => {
      try {
        const all = await getAllCatalogProducts();
        if (!active) return;
        const ranked = rankRelatedProducts(currentProduct, all, 8);
        setItems(ranked);
      } catch (err) {
        console.error("Failed to load related products", err);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [currentProduct, items.length]);

  // Reset scroll to start when product changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: 0, behavior: "instant" });
    }
  }, [currentProduct.slug, items]);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = 320;
    const mult = direction === "left" ? -1 : 1;
    scrollRef.current.scrollBy({
      left: mult * scrollAmount,
      behavior: "smooth",
    });
  };

  if (!loading && items.length === 0) {
    return null;
  }

  return (
    <section
      className="section gx-related-products-section"
      id="related-products"
      style={{
        paddingTop: 36,
        paddingBottom: 48,
        borderTop: "1px solid rgba(255, 255, 255, 0.07)",
        marginTop: 32,
      }}
    >
      <div className="wrap">
        {/* Section Header: Title + Navigation Controls (Matching Design) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "linear-gradient(135deg, rgba(0, 229, 255, 0.18), rgba(0, 114, 255, 0.1))",
                border: "1px solid rgba(0, 229, 255, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#00e5ff",
              }}
            >
              <Sparkles size={18} />
            </span>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: "#ffffff",
                margin: 0,
                letterSpacing: "-0.3px",
                fontFamily: "'Tajawal', sans-serif",
              }}
            >
              {ar ? "منتجات مشابهة" : "Similar Picks"}
            </h2>
          </div>

          {/* Top-Corner Arrow Buttons for Quick Carousel Browsing */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={() => scroll(ar ? "right" : "left")}
              aria-label={ar ? "السابق" : "Previous"}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(0, 229, 255, 0.18)";
                e.currentTarget.style.borderColor = "#00e5ff";
                e.currentTarget.style.color = "#00e5ff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
                e.currentTarget.style.color = "#ffffff";
              }}
            >
              {ar ? <ChevronRight size={18} strokeWidth={2.4} /> : <ChevronLeft size={18} strokeWidth={2.4} />}
            </button>
            <button
              type="button"
              onClick={() => scroll(ar ? "left" : "right")}
              aria-label={ar ? "التالي" : "Next"}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(0, 229, 255, 0.18)";
                e.currentTarget.style.borderColor = "#00e5ff";
                e.currentTarget.style.color = "#00e5ff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
                e.currentTarget.style.color = "#ffffff";
              }}
            >
              {ar ? <ChevronLeft size={18} strokeWidth={2.4} /> : <ChevronRight size={18} strokeWidth={2.4} />}
            </button>
          </div>
        </div>

        {/* Carousel Track: Responsive, Smooth Touch-scrollable Track */}
        <div
          ref={scrollRef}
          className="gx-cards-carousel-track"
          style={{
            display: "flex",
            gap: 16,
            overflowX: "auto",
            scrollSnapType: "x mandatory",
            paddingBottom: 12,
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {items.map((item) => {
            const productLink = item.isGiftCardMaster
              ? `/product/${item.slug}`
              : item.cartId && item.cartId !== item.slug
              ? `/product/${item.slug}?variant=${encodeURIComponent(item.cartId)}`
              : `/product/${item.slug}`;

            return (
              <div
                key={item.cartId ? `${item.slug}-${item.cartId}` : item.slug}
                className="gx-carousel-product-col"
                style={{
                  flex: "0 0 215px",
                  maxWidth: 240,
                  minWidth: 195,
                  scrollSnapAlign: "start",
                }}
              >
                <StoreProductCard
                  slug={item.slug}
                  cartId={item.cartId || item.slug}
                  name={ar ? item.nameAr : (item.nameEn || item.nameAr)}
                  link={productLink}
                  price={item.basePriceJod}
                  oldPrice={item.oldPriceJod}
                  tagline={ar ? item.taglineAr : (item.taglineEn || item.taglineAr)}
                  imageUrl={item.imageUrl}
                  icon={item.icon}
                  iconImage={item.iconImage}
                  thumbBg={item.thumbBg}
                  categorySlug={item.categorySlug || undefined}
                  categoryName={ar ? item.categoryNameAr : item.categoryNameEn}
                  productType={item.productType}
                  customPlatform={item.platform}
                  region={
                    item.slug === "tod" ||
                    (item.slug || "").startsWith("tod-") ||
                    (item.cartId || "").startsWith("tod-")
                      ? "الأردن"
                      : (item.region || undefined)
                  }
                  badge={item.badge || null}
                  showPlatformBar={true}
                  showFromLabel={true}
                  priceLabel={ar ? "السعر" : "Price"}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
