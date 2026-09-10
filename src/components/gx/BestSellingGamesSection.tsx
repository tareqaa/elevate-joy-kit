import React, { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Sparkles, Gamepad2 } from "lucide-react";
import { useLang } from "@/lib/gx/i18n";
import { StoreProductCard } from "@/components/gx/StoreProductCard";

export interface GameCatalogItem {
  slug: string;
  nameAr: string;
  nameEn: string;
  price: number;
  oldPrice?: number;
  imageUrl: string;
  platform: string;
}

export const BEST_SELLING_GAMES_LIST: GameCatalogItem[] = [
  {
    slug: "ea-fc-27-pc",
    nameAr: "EA Sports FC 27",
    nameEn: "EA Sports FC 27",
    price: 26.0,
    oldPrice: 35.0,
    imageUrl: "/app/assets/img/catalog/ea-fc-27-pc.png",
    platform: "Steam (PC)",
  },
  {
    slug: "gta-v-enhanced-pc",
    nameAr: "Grand Theft Auto V Enhanced",
    nameEn: "GTA V Enhanced",
    price: 11.0,
    oldPrice: 19.0,
    imageUrl: "/app/assets/img/catalog/gta-v-enhanced-pc.jpg",
    platform: "Rockstar (PC)",
  },
  {
    slug: "red-dead-redemption-2",
    nameAr: "Red Dead Redemption 2 (RDR2)",
    nameEn: "Red Dead Redemption 2",
    price: 18.5,
    oldPrice: 28.0,
    imageUrl: "/app/assets/img/catalog/red-dead-redemption-2.jpg",
    platform: "Rockstar (PC)",
  },
  {
    slug: "helldivers-2",
    nameAr: "Helldivers 2",
    nameEn: "Helldivers 2",
    price: 27.0,
    oldPrice: 35.0,
    imageUrl: "/app/assets/img/catalog/helldivers-2.webp",
    platform: "Steam (PC)",
  },
  {
    slug: "minecraft-java-bedrock",
    nameAr: "Minecraft: Java & Bedrock Edition",
    nameEn: "Minecraft: Java & Bedrock",
    price: 17.0,
    oldPrice: 24.0,
    imageUrl: "/app/assets/img/catalog/minecraft-java-bedrock.png",
    platform: "Windows (PC)",
  },
  {
    slug: "mortal-kombat-11-ultimate",
    nameAr: "Mortal Kombat 11: Ultimate",
    nameEn: "Mortal Kombat 11: Ultimate",
    price: 5.5,
    oldPrice: 12.0,
    imageUrl: "/app/assets/img/catalog/mortal-kombat-11-ultimate.jpg",
    platform: "Steam (PC)",
  },
  {
    slug: "forza-horizon-6-pc",
    nameAr: "Forza Horizon 6",
    nameEn: "Forza Horizon 6",
    price: 30.0,
    oldPrice: 40.0,
    imageUrl: "/app/assets/img/catalog/forza-horizon-6-pc.png",
    platform: "Steam (PC)",
  },
  {
    slug: "resident-evil-4-remake",
    nameAr: "Resident Evil 4 Remake",
    nameEn: "Resident Evil 4 Remake",
    price: 15.0,
    oldPrice: 24.0,
    imageUrl: "/app/assets/img/catalog/resident-evil-4-remake.png",
    platform: "Steam (PC)",
  },
  {
    slug: "arc-raiders",
    nameAr: "ARC Raiders",
    nameEn: "ARC Raiders",
    price: 23.0,
    oldPrice: 30.0,
    imageUrl: "/app/assets/img/catalog/arc-raiders.jpg",
    platform: "Steam (PC)",
  },
  {
    slug: "batman-arkham-collection",
    nameAr: "Batman: Arkham Collection",
    nameEn: "Batman: Arkham Collection",
    price: 6.0,
    oldPrice: 15.0,
    imageUrl: "/app/assets/img/catalog/batman-arkham-collection.jpg",
    platform: "Steam (PC)",
  },
  {
    slug: "dark-souls-3-deluxe",
    nameAr: "Dark Souls III: Deluxe Edition",
    nameEn: "Dark Souls III: Deluxe Edition",
    price: 14.0,
    oldPrice: 25.0,
    imageUrl: "/app/assets/img/catalog/dark-souls-3-deluxe.jpg",
    platform: "Steam (PC)",
  },
  {
    slug: "bioshock-the-collection",
    nameAr: "BioShock: The Collection",
    nameEn: "BioShock: The Collection",
    price: 5.0,
    oldPrice: 16.0,
    imageUrl: "/app/assets/img/catalog/bioshock-the-collection.jpg",
    platform: "Steam (PC)",
  },
];

export function BestSellingGamesSection() {
  const { lang } = useLang();
  const scrollRef = useRef<HTMLDivElement>(null);
  const ar = lang === "ar";

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
    <section className="section gx-products-carousel-section" id="best-selling-games" style={{ paddingTop: 28, paddingBottom: 28 }}>
      <div className="wrap">
        {/* Section Head - Clean title without extra labels or descriptions */}
        <div className="section-head" style={{ marginBottom: 18 }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 900, display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Gamepad2 size={24} style={{ color: "var(--cyan, #00e5ff)" }} />
              <span>{ar ? "الألعاب الأكثر مبيعاً" : "Best Selling Games"}</span>
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

          {/* Cards Track using standard unified StoreProductCard */}
          <div className="gx-cards-carousel-track" ref={scrollRef}>
            {BEST_SELLING_GAMES_LIST.map((game) => (
              <div key={game.slug} className="gx-carousel-product-col">
                <StoreProductCard
                  slug={game.slug}
                  cartId={game.slug}
                  name={ar ? game.nameAr : game.nameEn}
                  link={`/category/games?product=${game.slug}`}
                  price={game.price}
                  oldPrice={game.oldPrice}
                  imageUrl={game.imageUrl}
                  customPlatform={game.platform}
                  showPlatformBar={true}
                  showFromLabel={false}
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
            {ar ? <ChevronLeft size={22} strokeWidth={2.5} /> : <ChevronRight size={22} strokeWidth={2.5} />}
          </button>
        </div>

        {/* View All Games Button */}
        <div className="gx-view-all-games-row">
          <Link
            to="/products?category=games&sort=popular"
            className="gx-view-all-games-btn"
          >
            <Sparkles size={18} className="gx-view-all-sparkle" />
            <span>{ar ? "إظهار كل الألعاب (الأكثر مبيعاً)" : "View All Games (Best Selling)"}</span>
            <span className="gx-view-all-arrow">{ar ? "‹" : "›"}</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
