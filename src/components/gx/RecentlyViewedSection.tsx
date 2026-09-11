import React, { useRef } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useRecentlyViewed } from "@/lib/gx/recently-viewed";
import { useLang } from "@/lib/gx/i18n";
import { StoreProductCard } from "@/components/gx/StoreProductCard";

export function RecentlyViewedSection() {
  const { items, hasRealHistory } = useRecentlyViewed();
  const { lang } = useLang();
  const scrollRef = useRef<HTMLDivElement>(null);
  const ar = lang === "ar";

  if (!hasRealHistory || !items || items.length === 0) return null;

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 300;
    const mult = direction === "left" ? -1 : 1;
    scrollRef.current.scrollBy({
      left: mult * amount,
      behavior: "smooth",
    });
  };

  return (
    <section className="section gx-products-carousel-section" id="recently-viewed" style={{ paddingTop: 28, paddingBottom: 20 }}>
      <div className="wrap">
        {/* Section Header */}
        <div className="section-head" style={{ marginBottom: 18 }}>
          <div>
            <span className="k" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Clock size={14} style={{ color: "var(--cyan, #00e5ff)" }} />
              {ar ? (hasRealHistory ? "شوهدت مؤخراً" : "منتجات مقترحة لك") : (hasRealHistory ? "Recently Viewed" : "Recommended For You")}
            </span>
            <h2 style={{ fontSize: 24, fontWeight: 900 }}>
              {ar ? (hasRealHistory ? "شاهدتها مؤخراً في المتجر" : "منتجات يفضلها زوار GX Store") : (hasRealHistory ? "Recently Viewed Products" : "Trending on GX Store")}
            </h2>
          </div>
        </div>

        {/* Unified Cards Carousel with Side Floating Navigation Arrows */}
        <div className="gx-side-arrow-carousel-wrapper">
          {/* Side Arrow: Left */}
          <button
            type="button"
            className="gx-side-nav-arrow gx-side-nav-prev"
            onClick={() => scroll(ar ? "right" : "left")}
            aria-label={ar ? "السابق" : "Previous"}
          >
            {ar ? <ChevronRight size={22} strokeWidth={2.5} /> : <ChevronLeft size={22} strokeWidth={2.5} />}
          </button>

          {/* Cards Track using the standard unified StoreProductCard */}
          <div className="gx-cards-carousel-track" ref={scrollRef}>
            {items.map((item) => {
              const productLink = item.categorySlug === "games"
                ? `/category/games?product=${item.slug}`
                : `/product/${item.slug}`;

              return (
                <div key={item.slug} className="gx-carousel-product-col">
                  <StoreProductCard
                    slug={item.slug}
                    cartId={item.slug}
                    name={ar ? item.nameAr : item.nameEn}
                    link={productLink}
                    price={item.price}
                    oldPrice={item.oldPrice}
                    tagline={ar ? item.taglineAr : item.taglineEn}
                    imageUrl={item.imageUrl}
                    icon={item.icon}
                    categorySlug={item.categorySlug || undefined}
                    showPlatformBar={true}
                    showFromLabel={false}
                  />
                </div>
              );
            })}
          </div>

          {/* Side Arrow: Right */}
          <button
            type="button"
            className="gx-side-nav-arrow gx-side-nav-next"
            onClick={() => scroll(ar ? "left" : "right")}
            aria-label={ar ? "التالي" : "Next"}
          >
            {ar ? <ChevronLeft size={22} strokeWidth={2.5} /> : <ChevronRight size={22} strokeWidth={2.5} />}
          </button>
        </div>
      </div>
    </section>
  );
}
