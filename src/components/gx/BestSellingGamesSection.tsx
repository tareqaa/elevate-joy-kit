import React, { useRef, useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Sparkles, Gamepad2 } from "lucide-react";
import { useLang } from "@/lib/gx/i18n";
import { StoreProductCard } from "@/components/gx/StoreProductCard";
import { supabase } from "@/integrations/supabase/client";

export interface RealGameProduct {
  id?: string;
  slug: string;
  name_ar: string;
  name_en?: string | null;
  base_price_jod: number;
  old_price_jod?: number | null;
  delivery_type: string;
  platform: string;
  image_url: string;
  purchases_count?: number;
}

// Initial fallback with real data from database
export const INITIAL_REAL_GAMES: RealGameProduct[] = [
  {
    slug: "ea-fc-27-pc",
    name_ar: "EA Sports FC 27 | حساب ستيم خاص بك (PC)",
    name_en: "EA Sports FC 27 (Steam Account)",
    base_price_jod: 26.0,
    delivery_type: "account",
    platform: "Steam / PC",
    image_url: "/app/assets/img/catalog/ea-fc-27-pc.png",
  },
  {
    slug: "gta-v-enhanced-pc",
    name_ar: "Grand Theft Auto V (GTA V) Enhanced | كود روكستار (PC)",
    name_en: "Grand Theft Auto V Enhanced",
    base_price_jod: 11.0,
    delivery_type: "code",
    platform: "Rockstar Launcher",
    image_url: "/app/assets/img/catalog/gta-v-enhanced-pc.jpg",
  },
  {
    slug: "red-dead-redemption-2",
    name_ar: "Red Dead Redemption 2 (RDR2) | كود روكستار (PC)",
    name_en: "Red Dead Redemption 2",
    base_price_jod: 18.5,
    delivery_type: "code",
    platform: "Rockstar Launcher",
    image_url: "/app/assets/img/catalog/red-dead-redemption-2.jpg",
  },
  {
    slug: "helldivers-2",
    name_ar: "Helldivers 2 | كود ستيم (PC)",
    name_en: "Helldivers 2",
    base_price_jod: 27.0,
    delivery_type: "code",
    platform: "Steam / PC",
    image_url: "/app/assets/img/catalog/helldivers-2.webp",
  },
  {
    slug: "forza-horizon-6-pc",
    name_ar: "Forza Horizon 6 | حساب ستيم خاص بك (PC)",
    name_en: "Forza Horizon 6 (Steam Account)",
    base_price_jod: 30.0,
    delivery_type: "account",
    platform: "Steam / PC",
    image_url: "/app/assets/img/catalog/forza-horizon-6-pc.png",
  },
  {
    slug: "resident-evil-4-remake",
    name_ar: "Resident Evil 4 Remake | كود ستيم (PC)",
    name_en: "Resident Evil 4 Remake",
    base_price_jod: 15.0,
    delivery_type: "code",
    platform: "Steam / PC",
    image_url: "/app/assets/img/catalog/resident-evil-4-remake.png",
  },
  {
    slug: "minecraft-java-bedrock",
    name_ar: "Minecraft: Java & Bedrock Edition | كود ويندوز ستور (PC)",
    name_en: "Minecraft: Java & Bedrock",
    base_price_jod: 17.0,
    delivery_type: "code",
    platform: "Windows Store / PC",
    image_url: "/app/assets/img/catalog/minecraft-java-bedrock.png",
  },
  {
    slug: "mortal-kombat-11-ultimate",
    name_ar: "Mortal Kombat 11: Ultimate | كود ستيم (PC)",
    name_en: "Mortal Kombat 11: Ultimate",
    base_price_jod: 5.5,
    delivery_type: "code",
    platform: "Steam / PC",
    image_url: "/app/assets/img/catalog/mortal-kombat-11-ultimate.jpg",
  },
  {
    slug: "control-ultimate-edition",
    name_ar: "Control: Ultimate Edition | كود ستيم (PC)",
    name_en: "Control: Ultimate Edition",
    base_price_jod: 5.5,
    delivery_type: "code",
    platform: "Steam / PC",
    image_url: "/app/assets/img/catalog/control-ultimate-edition.webp",
  },
  {
    slug: "batman-arkham-origins",
    name_ar: "Batman: Arkham Origins | كود ستيم (PC)",
    name_en: "Batman: Arkham Origins",
    base_price_jod: 5.0,
    delivery_type: "code",
    platform: "Steam / PC",
    image_url: "/app/assets/img/catalog/batman-arkham-origins.jpg",
  },
  {
    slug: "bioshock-the-collection",
    name_ar: "BioShock: The Collection | ثلاثية بايوشوك (Steam)",
    name_en: "BioShock: The Collection",
    base_price_jod: 10.0,
    delivery_type: "code",
    platform: "Steam / PC",
    image_url: "/app/assets/img/catalog/bioshock-the-collection.jpg",
  },
  {
    slug: "ea-fc-26-pc",
    name_ar: "EA Sports FC 26 | حساب ستيم خاص بك (PC)",
    name_en: "EA Sports FC 26",
    base_price_jod: 4.5,
    delivery_type: "account",
    platform: "Steam / PC",
    image_url: "/app/assets/img/catalog/ea-fc-26-pc.png",
  },
  {
    slug: "euro-truck-simulator-2",
    name_ar: "Euro Truck Simulator 2 | كود ستيم (PC)",
    name_en: "Euro Truck Simulator 2",
    base_price_jod: 12.0,
    delivery_type: "code",
    platform: "Steam / PC",
    image_url: "/app/assets/img/catalog/euro-truck-simulator-2.jpg",
  },
  {
    slug: "hollow-knight-silksong-pc",
    name_ar: "Hollow Knight: Silksong | كود ستيم (PC)",
    name_en: "Hollow Knight: Silksong",
    base_price_jod: 12.0,
    delivery_type: "code",
    platform: "Steam / PC",
    image_url: "/app/assets/img/catalog/hollow-knight-silksong-pc.webp",
  },
  {
    slug: "ratchet-and-clank-rift-apart",
    name_ar: "Ratchet & Clank: Rift Apart | كود ستيم (PC)",
    name_en: "Ratchet & Clank: Rift Apart",
    base_price_jod: 21.0,
    delivery_type: "code",
    platform: "Steam / PC",
    image_url: "/app/assets/img/catalog/ratchet-and-clank-rift-apart.jpg",
  },
];

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
  "ea-fc-27-xbox",
  "gta-v-xbox",
  "forza-horizon-6-xbox",
  "minecraft-xbox",
  "hollow-knight-silksong-pc",
  "hollow-knight-silksong-xbox",
  "human-fall-flat",
  "jusant",
  "mafia-2-definitive-edition",
  "batman-arkham-origins",
  "gta-iv-complete-edition",
  "control-ultimate-edition",
  "euro-truck-simulator-2",
  "ea-fc-26-pc",
  "ratchet-and-clank-rift-apart",
];

export function BestSellingGamesSection() {
  const { lang } = useLang();
  const scrollRef = useRef<HTMLDivElement>(null);
  const ar = lang === "ar";
  const [games, setGames] = useState<RealGameProduct[]>(INITIAL_REAL_GAMES);

  // Fetch real games dynamically from database and order by popular priority matching /products
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data, error } = await (supabase.from("products") as any)
          .select("id, slug, name_ar, name_en, base_price_jod, delivery_type, platform, purchases_count, image_url, category_id, is_active")
          .in("category_id", [
            "d18e98da-50b3-4740-9ac6-2619146f62b7", // PC games
            "007a8ee0-7a10-4ea8-9002-56c0d2b92429", // Xbox games
            "e244ef6f-d748-43da-a2f2-39c4d9bc83be", // PS games
          ])
          .eq("is_active", true)
          .limit(60);

        if (!error && data && data.length > 0 && alive) {
          const mapped: RealGameProduct[] = data.map((p: any) => ({
            id: p.id,
            slug: p.slug,
            name_ar: p.name_ar,
            name_en: p.name_en,
            base_price_jod: Number(p.base_price_jod) || 0,
            delivery_type: p.delivery_type || "code",
            platform: p.platform || "Steam / PC",
            image_url: p.image_url || "/app/assets/img/catalog/helldivers-2.webp",
            purchases_count: p.purchases_count || 0,
          }));

          // Sort by exact popular order matching all products (/products)
          mapped.sort((a, b) => {
            const rankA = TOP_GAME_SLUGS.indexOf(a.slug);
            const rankB = TOP_GAME_SLUGS.indexOf(b.slug);
            if (rankA !== -1 && rankB !== -1) return rankA - rankB;
            if (rankA !== -1) return -1;
            if (rankB !== -1) return 1;
            return (b.purchases_count || 0) - (a.purchases_count || 0);
          });

          setGames(mapped);
        }
      } catch (err) {
        console.error("Failed to load real games from Supabase", err);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Ensure carousel starts at the beginning (right side in RTL, left side in LTR)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: 0, behavior: "instant" });
    }
  }, [games]);

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

          {/* Cards Track using standard unified StoreProductCard with 100% REAL data (Limited to 8 games) */}
          <div className="gx-cards-carousel-track" ref={scrollRef}>
            {games.slice(0, 8).map((game) => (
              <div key={game.slug} className="gx-carousel-product-col">
                <StoreProductCard
                  slug={game.slug}
                  cartId={game.slug}
                  name={ar ? game.name_ar : (game.name_en || game.name_ar)}
                  link={`/category/games?product=${game.slug}`}
                  price={game.base_price_jod}
                  imageUrl={game.image_url}
                  productType={game.delivery_type}
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
            to={"/products?category=games&sort=popular" as never}
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
