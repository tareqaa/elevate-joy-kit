import React, { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { Zap, ChevronLeft, ChevronRight, ArrowLeft, ArrowRight } from "lucide-react";
import { useCurrency } from "@/lib/gx/currency";
import { useLang } from "@/lib/gx/i18n";

export interface GamepointCardItem {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
  startingPrice: number;
  iconImage: string;
  bgGradient: string;
  badgeAr?: string;
  badgeEn?: string;
  link: string;
}

export const GAMEPOINT_CARDS: GamepointCardItem[] = [
  {
    id: "fortnite-points",
    slug: "fortnite",
    nameAr: "فورت نايت V-Bucks",
    nameEn: "Fortnite V-Bucks",
    descAr: "شحن فيبوكس فوري لجميع الحسابات والمنصات (1000 إلى 27000 V-Bucks)",
    descEn: "Instant V-Bucks recharge for all platforms (1,000 to 27,000)",
    startingPrice: 4.0,
    iconImage: "/app/assets/img/fortnite-f-icon.jpg",
    bgGradient: "linear-gradient(135deg, rgba(168, 85, 247, 0.25), rgba(59, 130, 246, 0.15))",
    badgeAr: "⚡ شحن تلقائي",
    badgeEn: "⚡ Instant",
    link: "/category/fortnite",
  },
  {
    id: "playstation-cards",
    slug: "playstation",
    nameAr: "بطاقات بلايستيشن (PSN)",
    nameEn: "PlayStation PSN Cards",
    descAr: "رصيد المتجر لحسابات البلايستيشن السعودية، الأمريكية، والتركية",
    descEn: "Store credit for Saudi, US, and Turkish PSN accounts",
    startingPrice: 5.0,
    iconImage: "/app/assets/img/playstation-logo.svg",
    bgGradient: "linear-gradient(135deg, rgba(0, 112, 209, 0.25), rgba(0, 60, 150, 0.15))",
    badgeAr: "كود رقمي معتمد",
    badgeEn: "Official Key",
    link: "/category/gift-cards",
  },
  {
    id: "xbox-cards",
    slug: "xbox",
    nameAr: "بطاقات إكسبوكس وجيم باس",
    nameEn: "Xbox & Game Pass Cards",
    descAr: "شحن رصيد إكسبوكس واشتراكات Game Pass لجميع المناطق",
    descEn: "Xbox wallet balance and Game Pass subscriptions",
    startingPrice: 5.0,
    iconImage: "/app/assets/img/xbox-logo.svg",
    bgGradient: "linear-gradient(135deg, rgba(16, 124, 65, 0.25), rgba(10, 80, 40, 0.15))",
    badgeAr: "رسمي 100%",
    badgeEn: "100% Official",
    link: "/category/gift-cards",
  },
  {
    id: "itunes-cards",
    slug: "itunes",
    nameAr: "بطاقات آبل وآيتونز",
    nameEn: "iTunes & Apple Gift Cards",
    descAr: "شحن رصيد Apple ID لشراء التطبيقات والألعاب والاشتراكات",
    descEn: "Apple ID balance for apps, games, and iCloud storage",
    startingPrice: 5.0,
    iconImage: "/app/assets/img/itunes-logo.svg",
    bgGradient: "linear-gradient(135deg, rgba(241, 7, 163, 0.25), rgba(123, 47, 247, 0.15))",
    badgeAr: "تسليم فوري",
    badgeEn: "Instant Code",
    link: "/category/gift-cards",
  },
  {
    id: "google-play-cards",
    slug: "google-play",
    nameAr: "بطاقات جوجل بلاي",
    nameEn: "Google Play Cards",
    descAr: "شحن رصيد متجر Play للأندرويد لشراء الألعاب والخدمات",
    descEn: "Play Store digital balance for Android in-app purchases",
    startingPrice: 5.0,
    iconImage: "/app/assets/img/googleplay-logo.png",
    bgGradient: "linear-gradient(135deg, rgba(52, 168, 83, 0.25), rgba(26, 115, 232, 0.15))",
    badgeAr: "متاح الآن",
    badgeEn: "Available",
    link: "/category/gift-cards",
  },
  {
    id: "discord-nitro",
    slug: "discord-nitro-1-year",
    nameAr: "ديسكورد نيترو وبوستات",
    nameEn: "Discord Nitro & Boosts",
    descAr: "اشتراكات Nitro شهرية وسنوية مع تفعيل البوستات فائق السرعة",
    descEn: "Nitro monthly/yearly codes and 14x Server Boosts",
    startingPrice: 6.0,
    iconImage: "/app/assets/img/catalog/discord-nitro-1-month.png",
    bgGradient: "linear-gradient(135deg, rgba(88, 101, 242, 0.25), rgba(147, 51, 234, 0.15))",
    badgeAr: "أقوى العروض",
    badgeEn: "Best Value",
    link: "/category/subscriptions",
  },
];

export function BestSellingGamepointsSection() {
  const { format } = useCurrency();
  const { lang } = useLang();
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

  return (
    <section className="gx-section-modern gx-gamepoints-wrap">
      <div className="gx-home-container">
        {/* Section Header */}
        <div className="gx-section-header-row">
          <div className="gx-section-title-group">
            <div className="gx-badge-glow">
              <Zap size={14} className="gx-badge-icon" />
              <span>{ar ? "نقاط وشحن الألعاب" : "Game Credits & Cards"}</span>
            </div>
            <h2 className="gx-section-title">
              {ar ? "Best Selling Gamepoints — بطاقات ونقاط الألعاب" : "Best Selling Gamepoints"}
            </h2>
            <p className="gx-section-subtitle">
              {ar
                ? "اشحن بطاقات ألعابك المفضلة ورصيد المتاجر الرقمية بأرخص الأسعار والتسليم الآلي"
                : "Top digital store gift cards and game credits with automated delivery"}
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

        {/* Horizontal Cards Row */}
        <div className="gx-carousel-scroll-container" ref={scrollRef}>
          {GAMEPOINT_CARDS.map((item) => (
            <Link
              key={item.id}
              to={item.link as never}
              className="gx-gamepoint-card"
              style={{ background: item.bgGradient }}
            >
              <div className="gx-gamepoint-card-top">
                <div className="gx-gamepoint-icon-box">
                  <img
                    src={item.iconImage}
                    alt={ar ? item.nameAr : item.nameEn}
                    className="gx-gamepoint-icon-img"
                    loading="lazy"
                  />
                </div>

                {(item.badgeAr || item.badgeEn) && (
                  <span className="gx-gamepoint-badge">
                    {ar ? item.badgeAr : item.badgeEn}
                  </span>
                )}
              </div>

              <div className="gx-gamepoint-card-body">
                <h3 className="gx-gamepoint-title">
                  {ar ? item.nameAr : item.nameEn}
                </h3>
                <p className="gx-gamepoint-desc">
                  {ar ? item.descAr : item.descEn}
                </p>
              </div>

              <div className="gx-gamepoint-card-footer">
                <div className="gx-gamepoint-price-box">
                  <span className="gx-gamepoint-price-label">
                    {ar ? "يبدأ من" : "From"}
                  </span>
                  <span className="gx-gamepoint-price-val">
                    {format(item.startingPrice)}
                  </span>
                </div>

                <span className="gx-gamepoint-arrow-btn">
                  {ar ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
