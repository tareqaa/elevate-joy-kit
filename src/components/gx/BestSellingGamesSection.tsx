import React, { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { Gamepad2, ChevronLeft, ChevronRight, Sparkles, ArrowLeft, ArrowRight } from "lucide-react";
import { useCurrency } from "@/lib/gx/currency";
import { useLang } from "@/lib/gx/i18n";
import { useCart } from "@/lib/gx/cart";
import { toast } from "sonner";
import { trackRecentlyViewed } from "@/lib/gx/recently-viewed";

export interface GameItem {
  slug: string;
  nameAr: string;
  nameEn: string;
  taglineAr: string;
  taglineEn: string;
  price: number;
  oldPrice?: number;
  imageUrl: string;
  platform: string; // "Steam (PC)" | "Rockstar (PC)" | "Xbox" | "Windows Store"
  badgeAr?: string;
  badgeEn?: string;
}

export const TOP_SELLING_GAMES: GameItem[] = [
  {
    slug: "ea-fc-27-pc",
    nameAr: "EA Sports FC 27",
    nameEn: "EA Sports FC 27",
    taglineAr: "حساب ستيم خاص بك — تفعيل فوري",
    taglineEn: "Own Steam Account — Instant",
    price: 26.0,
    oldPrice: 35.0,
    imageUrl: "/app/assets/img/catalog/ea-fc-27-pc.png",
    platform: "Steam (PC)",
    badgeAr: "🔥 الأكثر طلباً",
    badgeEn: "🔥 Bestseller",
  },
  {
    slug: "gta-v-enhanced-pc",
    nameAr: "Grand Theft Auto V Enhanced",
    nameEn: "GTA V Enhanced",
    taglineAr: "كود روكستار الرسمي للكمبيوتر",
    taglineEn: "Official Rockstar Digital Key",
    price: 11.0,
    oldPrice: 19.0,
    imageUrl: "/app/assets/img/catalog/gta-v-enhanced-pc.jpg",
    platform: "Rockstar (PC)",
    badgeAr: "⚡ تسليم فوري",
    badgeEn: "⚡ Instant Key",
  },
  {
    slug: "red-dead-redemption-2",
    nameAr: "Red Dead Redemption 2 (RDR2)",
    nameEn: "Red Dead Redemption 2",
    taglineAr: "كود روكستار الأصلي — عالم مفتوح أسطوري",
    taglineEn: "Rockstar Key — Epic Open World",
    price: 18.5,
    oldPrice: 28.0,
    imageUrl: "/app/assets/img/catalog/red-dead-redemption-2.jpg",
    platform: "Rockstar (PC)",
    badgeAr: "🏆 تقييم 10/10",
    badgeEn: "🏆 Top Rated",
  },
  {
    slug: "helldivers-2",
    nameAr: "Helldivers 2",
    nameEn: "Helldivers 2",
    taglineAr: "كود ستيم الأصلي للكمبيوتر",
    taglineEn: "Official Steam Key for PC",
    price: 27.0,
    oldPrice: 35.0,
    imageUrl: "/app/assets/img/catalog/helldivers-2.webp",
    platform: "Steam (PC)",
    badgeAr: "💥 حماس جماعي",
    badgeEn: "💥 Co-Op Hit",
  },
  {
    slug: "minecraft-java-bedrock",
    nameAr: "Minecraft: Java & Bedrock Edition",
    nameEn: "Minecraft: Java & Bedrock",
    taglineAr: "النسختين معاً — كود ويندوز ستور أصلي",
    taglineEn: "Both Editions — Windows Store Key",
    price: 17.0,
    oldPrice: 24.0,
    imageUrl: "/app/assets/img/catalog/minecraft-java-bedrock.png",
    platform: "Windows (PC)",
    badgeAr: "🌟 الأكثر شعبية",
    badgeEn: "🌟 All-Time Hit",
  },
  {
    slug: "mortal-kombat-11-ultimate",
    nameAr: "Mortal Kombat 11: Ultimate",
    nameEn: "Mortal Kombat 11: Ultimate",
    taglineAr: "النسخة الكاملة مع جميع الشخصيات والإضافات",
    taglineEn: "Ultimate Edition With All DLCs",
    price: 5.5,
    oldPrice: 12.0,
    imageUrl: "/app/assets/img/catalog/mortal-kombat-11-ultimate.jpg",
    platform: "Steam (PC)",
    badgeAr: "خصم 55%",
    badgeEn: "55% OFF",
  },
  {
    slug: "forza-horizon-6-pc",
    nameAr: "Forza Horizon 6",
    nameEn: "Forza Horizon 6",
    taglineAr: "حساب ستيم خاص بك — سباقات خيالية",
    taglineEn: "Steam Account — Next-Gen Racing",
    price: 30.0,
    oldPrice: 40.0,
    imageUrl: "/app/assets/img/catalog/forza-horizon-6-pc.png",
    platform: "Steam (PC)",
    badgeAr: "🏎️ سرعة وإثارة",
    badgeEn: "🏎️ High Speed",
  },
  {
    slug: "resident-evil-4-remake",
    nameAr: "Resident Evil 4 Remake",
    nameEn: "Resident Evil 4 Remake",
    taglineAr: "كود ستيم الأصلي للكمبيوتر",
    taglineEn: "Official Steam Key for PC",
    price: 15.0,
    oldPrice: 24.0,
    imageUrl: "/app/assets/img/catalog/resident-evil-4-remake.png",
    platform: "Steam (PC)",
    badgeAr: "🧟 رعب وبقاء",
    badgeEn: "🧟 Horror Hit",
  },
  {
    slug: "arc-raiders",
    nameAr: "ARC Raiders",
    nameEn: "ARC Raiders",
    taglineAr: "كود ستيم الأصلي — تجربة تصويب مستقبلية",
    taglineEn: "Official Steam Key for PC",
    price: 23.0,
    oldPrice: 30.0,
    imageUrl: "/app/assets/img/catalog/arc-raiders.jpg",
    platform: "Steam (PC)",
    badgeAr: "🎯 إطلاق جديد",
    badgeEn: "🎯 New Release",
  },
  {
    slug: "batman-arkham-collection",
    nameAr: "Batman: Arkham Collection",
    nameEn: "Batman: Arkham Collection",
    taglineAr: "ثلاثية باتمان الأسطورية كاملة (Steam)",
    taglineEn: "Full 3-Game Legendary Trilogy",
    price: 6.0,
    oldPrice: 15.0,
    imageUrl: "/app/assets/img/catalog/batman-arkham-collection.jpg",
    platform: "Steam (PC)",
    badgeAr: "3 ألعاب بكود واحد",
    badgeEn: "3 Games in 1",
  },
  {
    slug: "dark-souls-remastered-xbox",
    nameAr: "Dark Souls: Remastered",
    nameEn: "Dark Souls: Remastered",
    taglineAr: "كود تفعيل إكسبوكس رقمي أصلي",
    taglineEn: "Official Xbox Digital Key",
    price: 5.0,
    oldPrice: 12.0,
    imageUrl: "/app/assets/img/catalog/dark-souls-remastered-xbox.jpg",
    platform: "Xbox",
    badgeAr: "⚔️ تحدي حقيقي",
    badgeEn: "⚔️ Souls Classic",
  },
  {
    slug: "bioshock-the-collection",
    nameAr: "BioShock: The Collection",
    nameEn: "BioShock: The Collection",
    taglineAr: "ثلاثية بايوشوك المحسنة مع كامل الإضافات",
    taglineEn: "Remastered Trilogy with all DLCs",
    price: 10.0,
    oldPrice: 20.0,
    imageUrl: "/app/assets/img/catalog/bioshock-the-collection.jpg",
    platform: "Steam (PC)",
    badgeAr: "تحفة كلاسيكية",
    badgeEn: "Masterpiece",
  },
];

export function BestSellingGamesSection() {
  const { format } = useCurrency();
  const { lang } = useLang();
  const { addItem } = useCart();
  const scrollRef = useRef<HTMLDivElement>(null);
  const ar = lang === "ar";

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = 340;
    const mult = direction === "left" ? -1 : 1;
    scrollRef.current.scrollBy({
      left: mult * scrollAmount,
      behavior: "smooth",
    });
  };

  const handleQuickAdd = (game: GameItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      cartId: game.slug,
      slug: game.slug,
      name: ar ? game.nameAr : game.nameEn,
      price: game.price,
      quantity: 1,
      image: game.imageUrl,
    });
    toast.success(
      ar ? `تمت إضافة "${game.nameAr}" إلى السلة` : `Added "${game.nameEn}" to cart`
    );
  };

  const handleClickGame = (game: GameItem) => {
    trackRecentlyViewed({
      slug: game.slug,
      nameAr: game.nameAr,
      nameEn: game.nameEn,
      taglineAr: game.taglineAr,
      taglineEn: game.taglineEn,
      price: game.price,
      oldPrice: game.oldPrice,
      imageUrl: game.imageUrl,
      icon: "🎮",
      categorySlug: "games",
    });
  };

  return (
    <section className="gx-section-modern gx-bestselling-games-wrap">
      <div className="gx-home-container">
        {/* Section Header */}
        <div className="gx-section-header-row">
          <div className="gx-section-title-group">
            <div className="gx-badge-glow">
              <Gamepad2 size={14} className="gx-badge-icon" />
              <span>{ar ? "ألعاب الكمبيوتر والإكسبوكس" : "PC & Console Games"}</span>
            </div>
            <h2 className="gx-section-title">
              {ar ? "Best Selling Games — الألعاب الأكثر مبيعاً" : "Best Selling Games"}
            </h2>
            <p className="gx-section-subtitle">
              {ar
                ? "أكثر الألعاب طلباً ومبيعاً بأسعار منافسة وتسليم فوري معتمد 100%"
                : "Top requested gaming titles with instant delivery and guaranteed official activation"}
            </p>
          </div>

          {/* Navigation Controls */}
          <div className="gx-section-controls">
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

        {/* Horizontal Game Cards Carousel */}
        <div className="gx-carousel-scroll-container" ref={scrollRef}>
          {TOP_SELLING_GAMES.map((game) => {
            const discountPct = game.oldPrice && game.oldPrice > game.price
              ? Math.round(((game.oldPrice - game.price) / game.oldPrice) * 100)
              : 0;

            return (
              <Link
                key={game.slug}
                to={`/category/games?product=${game.slug}` as never}
                onClick={() => handleClickGame(game)}
                className="gx-game-poster-card"
              >
                {/* Poster Cover */}
                <div className="gx-game-card-cover">
                  <img
                    src={game.imageUrl}
                    alt={ar ? game.nameAr : game.nameEn}
                    className="gx-game-card-img"
                    loading="lazy"
                  />

                  {/* Badges */}
                  <div className="gx-game-badges-layer">
                    {(game.badgeAr || game.badgeEn) && (
                      <span className="gx-game-feature-badge">
                        {ar ? game.badgeAr : game.badgeEn}
                      </span>
                    )}
                    {discountPct > 0 && (
                      <span className="gx-game-discount-badge">
                        -{discountPct}%
                      </span>
                    )}
                  </div>

                  {/* Platform Badge */}
                  <span className="gx-game-platform-pill">
                    {game.platform}
                  </span>

                  {/* Hover Quick Action */}
                  <div className="gx-game-card-hover-overlay">
                    <button
                      type="button"
                      onClick={(e) => handleQuickAdd(game, e)}
                      className="gx-game-quick-add-btn"
                    >
                      {ar ? "شراء سريع 🛒" : "Quick Add 🛒"}
                    </button>
                  </div>
                </div>

                {/* Info Body */}
                <div className="gx-game-card-body">
                  <h3 className="gx-game-card-title" title={ar ? game.nameAr : game.nameEn}>
                    {ar ? game.nameAr : game.nameEn}
                  </h3>

                  <p className="gx-game-card-desc">
                    {ar ? game.taglineAr : game.taglineEn}
                  </p>

                  <div className="gx-game-card-pricing">
                    <div className="gx-game-price-stack">
                      <span className="gx-game-price-current">
                        {format(game.price)}
                      </span>
                      {game.oldPrice && game.oldPrice > game.price && (
                        <span className="gx-game-price-old">
                          {format(game.oldPrice)}
                        </span>
                      )}
                    </div>

                    <span className="gx-game-view-icon">
                      {ar ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* View All Games Button — Exactly as requested! */}
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
