import React, { useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Coins, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useLang } from "@/lib/gx/i18n";
import { StoreProductCard } from "@/components/gx/StoreProductCard";

export interface GameCurrencyCard {
  id: string;
  slug: string;
  cartId: string;
  nameAr: string;
  nameEn: string;
  price: number;
  oldPrice: number | null;
  imageUrl?: string;
  productType: "topup" | "code" | "link" | "account";
  platform: string;
  badgeAr?: string;
  badgeEn?: string;
  link: string;
}

export const BEST_SELLING_GAME_CURRENCIES: GameCurrencyCard[] = [
  {
    id: "fn-vb-2400",
    slug: "fortnite",
    cartId: "fn-vb-2400",
    nameAr: "2400 وحدة V-Bucks | فورت نايت",
    nameEn: "2400 V-Bucks | Fortnite",
    price: 12.0,
    oldPrice: 16.0,
    imageUrl: "/app/assets/img/vbucks.png",
    productType: "topup",
    platform: "Epic Games",
    badgeAr: "الأكثر طلباً ⭐",
    badgeEn: "Popular ⭐",
    link: "/product/fortnite?tier=fn-vb-2400",
  },
  {
    id: "pubg-660",
    slug: "pubg-mobile-uc",
    cartId: "pubg-660",
    nameAr: "660 شدة ببجي (660 UC)",
    nameEn: "660 PUBG UC",
    price: 6.95,
    oldPrice: 8.5,
    imageUrl: "/app/assets/img/catalog/pubg-mobile.webp",
    productType: "topup",
    platform: "PUBG Mobile",
    badgeAr: "الأكثر طلباً ⭐",
    badgeEn: "Popular ⭐",
    link: "/product/pubg-mobile-uc?tier=pubg-660",
  },
  {
    id: "ff-583",
    slug: "free-fire-diamonds",
    cartId: "ff-583",
    nameAr: "583 جوهرة فري فاير (530 + 53 بونص)",
    nameEn: "583 Free Fire Diamonds",
    price: 3.95,
    oldPrice: 4.8,
    imageUrl: "/app/assets/img/catalog/free-fire.png",
    productType: "code",
    platform: "Garena Free Fire",
    badgeAr: "+53 بونص مجاني",
    badgeEn: "+53 Bonus",
    link: "/product/free-fire-diamonds?tier=ff-583",
  },
  {
    id: "rbx-1200",
    slug: "roblox-robux",
    cartId: "rbx-1200",
    nameAr: "1200 روبوكس (1200 Robux)",
    nameEn: "1200 Roblox Robux",
    price: 9.0,
    oldPrice: 11.5,
    imageUrl: "/app/assets/img/catalog/roblox-robux.jpg",
    productType: "topup",
    platform: "Roblox",
    badgeAr: "الأكثر طلباً ⭐",
    badgeEn: "Popular ⭐",
    link: "/product/roblox-robux?tier=rbx-1200",
  },
  {
    id: "fn-crew",
    slug: "fortnite",
    cartId: "fn-crew",
    nameAr: "اشتراك فورت نايت كرو — شهر",
    nameEn: "Fortnite Crew — 1 Month",
    price: 4.0,
    oldPrice: 6.0,
    imageUrl: "/app/assets/img/fortnite-crew.jpg",
    productType: "topup",
    platform: "Epic Games",
    badgeAr: "يشمل 1000 V-Bucks",
    badgeEn: "Includes 1000 V-Bucks",
    link: "/product/fortnite?tier=fn-crew",
  },
  {
    id: "pubg-325",
    slug: "pubg-mobile-uc",
    cartId: "pubg-325",
    nameAr: "325 شدة ببجي (325 UC)",
    nameEn: "325 PUBG UC",
    price: 3.75,
    oldPrice: 4.5,
    imageUrl: "/app/assets/img/catalog/pubg-mobile.webp",
    productType: "topup",
    platform: "PUBG Mobile",
    badgeAr: "فوري بالـ ID",
    badgeEn: "Instant ID Top-up",
    link: "/product/pubg-mobile-uc?tier=pubg-325",
  },
  {
    id: "ff-231",
    slug: "free-fire-diamonds",
    cartId: "ff-231",
    nameAr: "231 جوهرة فري فاير (210 + 21 بونص)",
    nameEn: "231 Free Fire Diamonds",
    price: 1.6,
    oldPrice: 2.0,
    imageUrl: "/app/assets/img/catalog/free-fire.png",
    productType: "code",
    platform: "Garena Free Fire",
    badgeAr: "+21 بونص مجاني",
    badgeEn: "+21 Bonus",
    link: "/product/free-fire-diamonds?tier=ff-231",
  },
  {
    id: "rbx-600",
    slug: "roblox-robux",
    cartId: "rbx-600",
    nameAr: "600 روبوكس (600 Robux)",
    nameEn: "600 Roblox Robux",
    price: 5.0,
    oldPrice: 6.5,
    imageUrl: "/app/assets/img/catalog/roblox-robux.jpg",
    productType: "topup",
    platform: "Roblox",
    badgeAr: "شحن رسمي ومضمون",
    badgeEn: "Official Top-up",
    link: "/product/roblox-robux?tier=rbx-600",
  },
];

export function BestSellingGameCurrenciesSection() {
  const { lang } = useLang();
  const scrollRef = useRef<HTMLDivElement>(null);
  const ar = lang === "ar";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: 0, behavior: "instant" });
    }
  }, []);

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
    <section
      className="section gx-products-carousel-section"
      id="best-selling-game-currencies"
      style={{ paddingTop: 28, paddingBottom: 28 }}
    >
      <div className="wrap">
        {/* Section Head */}
        <div className="section-head" style={{ marginBottom: 18 }}>
          <div>
            <h2
              style={{
                fontSize: 24,
                fontWeight: 900,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Coins size={24} style={{ color: "var(--cyan, #00e5ff)" }} />
              <span>
                {ar ? "عملات الألعاب الأكثر مبيعاً" : "Best Selling Game Currencies"}
              </span>
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
            {ar ? (
              <ChevronRight size={22} strokeWidth={2.5} />
            ) : (
              <ChevronLeft size={22} strokeWidth={2.5} />
            )}
          </button>

          {/* Cards Track (8 items: Fortnite, PUBG, Free Fire, Roblox) */}
          <div className="gx-cards-carousel-track" ref={scrollRef}>
            {BEST_SELLING_GAME_CURRENCIES.map((card) => (
              <div key={card.id} className="gx-carousel-product-col">
                <StoreProductCard
                  slug={card.slug}
                  cartId={card.cartId}
                  name={ar ? card.nameAr : card.nameEn}
                  link={card.link}
                  price={card.price}
                  oldPrice={card.oldPrice}
                  imageUrl={card.imageUrl}
                  productType={card.productType}
                  customPlatform={card.platform}
                  badge={ar ? card.badgeAr : card.badgeEn}
                  showBadge={Boolean(card.badgeAr)}
                  region={ar ? "عالمي 🌐" : "Global 🌐"}
                  showPlatformBar={true}
                  showFromLabel={false}
                  priceLabel={ar ? "السعر" : "Price"}
                />
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
            {ar ? (
              <ChevronLeft size={22} strokeWidth={2.5} />
            ) : (
              <ChevronRight size={22} strokeWidth={2.5} />
            )}
          </button>
        </div>

        {/* View All Game Currencies Button - Exactly styled like Best Selling Games */}
        <div className="gx-view-all-games-row">
          <Link
            to={"/products?category=games&sort=popular" as never}
            className="gx-view-all-games-btn"
          >
            <Sparkles size={18} className="gx-view-all-sparkle" />
            <span>
              {ar
                ? "عرض الكل (عملات وشحن الألعاب)"
                : "View All (Game Currencies)"}
            </span>
            <span className="gx-view-all-arrow">{ar ? "‹" : "›"}</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

export { BestSellingGameCurrenciesSection as BestSellingGamepointsSection };
