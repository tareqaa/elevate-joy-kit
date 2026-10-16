import React, { useRef, useMemo, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Gift, ChevronLeft, ChevronRight, ArrowLeft, ArrowRight } from "lucide-react";
import { useCurrency } from "@/lib/gx/currency";
import { useLang } from "@/lib/gx/i18n";
import { useSiteSettings } from "@/lib/gx/site-settings";
import { GIFT_CARDS_CATALOG } from "@/data/products";

export interface GiftCardItem {
  id: string;
  nameAr: string;
  nameEn: string;
  descAr?: string;
  descEn?: string;
  startingPrice: number;
  iconImage: string;
  bgGradient: string;
  badgeAr?: string;
  badgeEn?: string;
  link: string;
}

export function getGiftCardLiveStartingPrice(
  slug: string,
  fallbackPrice = 0,
  overrides?: Record<string, { price?: number; oldPrice?: number | null }> | null,
): number {
  const gc = GIFT_CARDS_CATALOG[slug];
  let minPrice = Infinity;
  if (gc && Array.isArray(gc.regions)) {
    for (const r of gc.regions) {
      for (const d of r.denominations) {
        const overridePrice = overrides?.[d.id]?.price;
        const p = typeof overridePrice === "number" && overridePrice > 0 ? overridePrice : d.price;
        if (typeof p === "number" && p > 0 && p < minPrice) {
          minPrice = p;
        }
      }
    }
  }
  return minPrice !== Infinity ? minPrice : fallbackPrice;
}

export const BEST_SELLING_GIFT_CARDS: GiftCardItem[] = [
  {
    id: "playstation",
    nameAr: "بطاقات بلايستيشن (PSN)",
    nameEn: "PlayStation PSN Cards",
    startingPrice: 8.0,
    iconImage: "/app/assets/img/playstation-logo.svg",
    bgGradient: "linear-gradient(135deg, rgba(0, 112, 209, 0.22), rgba(0, 60, 150, 0.12))",
    badgeAr: "كود تفعيل",
    badgeEn: "Digital Code",
    link: "/product/playstation",
  },
  {
    id: "xbox",
    nameAr: "بطاقات إكسبوكس",
    nameEn: "Xbox Gift Cards",
    startingPrice: 1.15,
    iconImage: "/app/assets/img/xbox-logo.svg",
    bgGradient: "linear-gradient(135deg, rgba(16, 124, 65, 0.22), rgba(10, 80, 40, 0.12))",
    badgeAr: "كود تفعيل",
    badgeEn: "Digital Code",
    link: "/product/xbox",
  },
  {
    id: "itunes",
    nameAr: "بطاقات آبل وآيتونز",
    nameEn: "iTunes & Apple Gift Cards",
    startingPrice: 2.22,
    iconImage: "/app/assets/img/itunes-logo.svg",
    bgGradient: "linear-gradient(135deg, rgba(241, 7, 163, 0.22), rgba(123, 47, 247, 0.12))",
    badgeAr: "كود تفعيل",
    badgeEn: "Digital Code",
    link: "/product/itunes",
  },
  {
    id: "google-play",
    nameAr: "بطاقات جوجل بلاي",
    nameEn: "Google Play Cards",
    startingPrice: 4.5,
    iconImage: "/app/assets/img/googleplay-logo.png",
    bgGradient: "linear-gradient(135deg, rgba(52, 168, 83, 0.22), rgba(26, 115, 232, 0.12))",
    badgeAr: "كود تفعيل",
    badgeEn: "Digital Code",
    link: "/product/google-play",
  },
];

export function BestSellingGiftCardsSection() {
  const { format } = useCurrency();
  const { lang } = useLang();
  const siteSettings = useSiteSettings();
  const [, setPriceTick] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const ar = lang === "ar";

  useEffect(() => {
    const onPricesUpdated = () => setPriceTick((t) => t + 1);
    if (typeof window !== "undefined") {
      window.addEventListener("gx:prices-updated", onPricesUpdated);
      return () => window.removeEventListener("gx:prices-updated", onPricesUpdated);
    }
  }, []);

  const cardsWithLivePrices = useMemo(() => {
    return BEST_SELLING_GIFT_CARDS.map((card) => {
      const livePrice = getGiftCardLiveStartingPrice(
        card.id,
        card.startingPrice,
        siteSettings?.catalog_prices,
      );
      return { ...card, livePrice };
    });
  }, [siteSettings?.catalog_prices]);

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
    <section className="section gx-products-carousel-section" id="gift-cards-section" style={{ paddingTop: 28, paddingBottom: 28 }}>
      <div className="wrap">
        {/* Section Header */}
        <div className="section-head" style={{ marginBottom: 18 }}>
          <div>
            <span className="k" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Gift size={14} style={{ color: "var(--cyan, #00e5ff)" }} />
              {ar ? "بطاقات الهدايا الرقمية" : "Digital Gift Cards"}
            </span>
            <h2 style={{ fontSize: 24, fontWeight: 900 }}>
              {ar ? "بطاقات الهدايا الإلكترونية الأكثر مبيعاً" : "Best Selling Digital Gift Cards"}
            </h2>
          </div>
        </div>

        {/* Carousel with Side Floating Navigation Arrows */}
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

          {/* Cards Track */}
          <div className="gx-cards-carousel-track" ref={scrollRef}>
            {cardsWithLivePrices.map((card) => (
              <div key={card.id} className="gx-carousel-giftcard-col">
                <Link
                  to={card.link as never}
                  className="gx-gamepoint-card"
                  style={{ background: card.bgGradient }}
                >
                  <div className="gx-gamepoint-card-top">
                    <div className="gx-gamepoint-icon-box">
                      <img
                        src={card.iconImage}
                        alt={ar ? card.nameAr : card.nameEn}
                        className="gx-gamepoint-icon-img"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    {card.badgeAr && (
                      <span className="gx-gamepoint-badge">
                        {ar ? card.badgeAr : card.badgeEn}
                      </span>
                    )}
                  </div>

                  <div className="gx-gamepoint-card-body" style={{ minHeight: "auto", margin: "14px 0 18px" }}>
                    <h3 className="gx-gamepoint-title" style={{ minHeight: "auto", margin: 0, fontSize: 18 }}>
                      {ar ? card.nameAr : card.nameEn}
                    </h3>
                  </div>

                  <div className="gx-gamepoint-card-footer">
                    <div className="gx-gamepoint-price-box">
                      <span className="gx-gamepoint-price-label">
                        {ar ? "يبدأ من" : "Starts at"}
                      </span>
                      <span className="gx-gamepoint-price-val">
                        {format(card.livePrice)}
                      </span>
                    </div>

                    <div className="gx-gamepoint-arrow-btn">
                      {ar ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                    </div>
                  </div>
                </Link>
              </div>
            ))}
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

// Keep backwards-compatible export name
export { BestSellingGiftCardsSection as BestSellingGamepointsSection };
