import React, { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Clock, Trash2, ArrowLeft, ArrowRight } from "lucide-react";
import { useRecentlyViewed } from "@/lib/gx/recently-viewed";
import { useCurrency } from "@/lib/gx/currency";
import { useLang } from "@/lib/gx/i18n";
import { CartThumb } from "@/components/gx/CartThumb";
import { useCart } from "@/lib/gx/cart";
import { toast } from "sonner";

export function RecentlyViewedSection() {
  const { items, hasRealHistory, clearHistory } = useRecentlyViewed();
  const { format } = useCurrency();
  const { lang } = useLang();
  const { addItem } = useCart();
  const scrollRef = useRef<HTMLDivElement>(null);
  const ar = lang === "ar";

  if (!items || items.length === 0) return null;

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    // In RTL, scroll directions can be inverted depending on browser,
    // so we handle smooth delta appropriately
    const scrollAmount = 340;
    const mult = direction === "left" ? -1 : 1;
    scrollRef.current.scrollBy({
      left: mult * scrollAmount,
      behavior: "smooth",
    });
  };

  const handleQuickAdd = (item: (typeof items)[0], e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      cartId: item.slug,
      slug: item.slug,
      name: ar ? item.nameAr : item.nameEn,
      price: item.price,
      quantity: 1,
      image: item.imageUrl || undefined,
      icon: item.icon || undefined,
    });
    toast.success(
      ar ? `تمت إضافة "${item.nameAr}" إلى السلة` : `Added "${item.nameEn}" to cart`
    );
  };

  return (
    <section className="gx-section-modern gx-recently-viewed-wrap">
      <div className="gx-home-container">
        {/* Section Header */}
        <div className="gx-section-header-row">
          <div className="gx-section-title-group">
            <div className="gx-badge-glow">
              <Clock size={14} className="gx-badge-icon" />
              <span>{ar ? (hasRealHistory ? "شوهدت مؤخراً" : "منتجات مقترحة لك") : (hasRealHistory ? "Recently Viewed" : "Recommended For You")}</span>
            </div>
            <h2 className="gx-section-title">
              {ar ? (hasRealHistory ? "شاهدتها مؤخراً في المتجر" : "منتجات يفضلها زوار GX Store") : (hasRealHistory ? "Recently Viewed Products" : "Trending on GX Store")}
            </h2>
            <p className="gx-section-subtitle">
              {ar
                ? "تابع المنتجات التي استعرضتها لسهولة العودة إليها وإكمال طلبك بضغطة زر"
                : "Quickly access products you've explored to complete your purchase instantly"}
            </p>
          </div>

          {/* Navigation Controls: Circular buttons with Chevron as requested */}
          <div className="gx-section-controls">
            {hasRealHistory && (
              <button
                type="button"
                onClick={clearHistory}
                className="gx-clear-history-btn"
                title={ar ? "مسح سجل المشاهدة" : "Clear history"}
              >
                <Trash2 size={15} />
                <span className="gx-hide-mobile">{ar ? "مسح السجل" : "Clear"}</span>
              </button>
            )}

            <div className="gx-circular-arrow-group">
              <button
                type="button"
                onClick={() => scroll(ar ? "right" : "left")}
                className="gx-circular-nav-btn"
                aria-label={ar ? "السابق" : "Previous"}
              >
                {ar ? <ChevronRight size={20} strokeWidth={2.4} /> : <ChevronLeft size={20} strokeWidth={2.4} />}
              </button>
              <button
                type="button"
                onClick={() => scroll(ar ? "left" : "right")}
                className="gx-circular-nav-btn"
                aria-label={ar ? "التالي" : "Next"}
              >
                {ar ? <ChevronLeft size={20} strokeWidth={2.4} /> : <ChevronRight size={20} strokeWidth={2.4} />}
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal Carousel */}
        <div className="gx-carousel-scroll-container" ref={scrollRef}>
          {items.map((item) => {
            const productLink = item.categorySlug === "games"
              ? `/category/games?product=${item.slug}`
              : `/category/${item.categorySlug || item.slug}`;
            const discountPct = item.oldPrice && item.oldPrice > item.price
              ? Math.round(((item.oldPrice - item.price) / item.oldPrice) * 100)
              : 0;

            return (
              <Link
                key={item.slug}
                to={productLink as never}
                className="gx-recent-card"
              >
                {/* Poster / Thumbnail with Glass Overlay */}
                <div className="gx-recent-card-thumb">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={ar ? item.nameAr : item.nameEn}
                      className="gx-recent-card-img"
                      loading="lazy"
                    />
                  ) : (
                    <div className="gx-recent-card-fallback">
                      <CartThumb
                        image={item.imageUrl || undefined}
                        icon={item.icon || undefined}
                        name={ar ? item.nameAr : item.nameEn}
                        slug={item.slug}
                        size={64}
                      />
                    </div>
                  )}

                  {discountPct > 0 && (
                    <span className="gx-recent-discount-badge">
                      -{discountPct}%
                    </span>
                  )}

                  <div className="gx-recent-card-overlay">
                    <button
                      type="button"
                      onClick={(e) => handleQuickAdd(item, e)}
                      className="gx-recent-quick-add-btn"
                    >
                      {ar ? "أضف للسلة" : "Quick Add"}
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="gx-recent-card-body">
                  <h3 className="gx-recent-card-title" title={ar ? item.nameAr : item.nameEn}>
                    {ar ? item.nameAr : item.nameEn}
                  </h3>

                  {(item.taglineAr || item.taglineEn) && (
                    <p className="gx-recent-card-tagline">
                      {ar ? item.taglineAr || item.taglineEn : item.taglineEn || item.taglineAr}
                    </p>
                  )}

                  <div className="gx-recent-card-footer">
                    <div className="gx-recent-price-wrap">
                      <span className="gx-recent-price-current">
                        {format(item.price)}
                      </span>
                      {item.oldPrice && item.oldPrice > item.price && (
                        <span className="gx-recent-price-old">
                          {format(item.oldPrice)}
                        </span>
                      )}
                    </div>

                    <span className="gx-recent-action-icon">
                      {ar ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
