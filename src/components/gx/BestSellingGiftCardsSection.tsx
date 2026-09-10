import React, { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { Gift, ChevronLeft, ChevronRight, ArrowLeft, ArrowRight } from "lucide-react";
import { useCurrency } from "@/lib/gx/currency";
import { useLang } from "@/lib/gx/i18n";

export interface GiftCardItem {
  id: string;
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

export const BEST_SELLING_GIFT_CARDS: GiftCardItem[] = [
  {
    id: "playstation",
    nameAr: "بطاقات بلايستيشن (PSN)",
    nameEn: "PlayStation PSN Cards",
    descAr: "رصيد المتجر لحسابات البلايستيشن السعودية، الأمريكية، والتركية",
    descEn: "Store credit for Saudi, US, and Turkish PSN accounts",
    startingPrice: 7.0,
    iconImage: "/app/assets/img/playstation-logo.svg",
    bgGradient: "linear-gradient(135deg, rgba(0, 112, 209, 0.22), rgba(0, 60, 150, 0.12))",
    badgeAr: "كود رقمي معتمد",
    badgeEn: "Official Key",
    link: "/product/playstation",
  },
  {
    id: "xbox",
    nameAr: "بطاقات إكسبوكس وجيم باس",
    nameEn: "Xbox & Game Pass Cards",
    descAr: "شحن رصيد إكسبوكس واشتراكات Game Pass لجميع المناطق",
    descEn: "Xbox wallet balance and Game Pass subscriptions",
    startingPrice: 1.15,
    iconImage: "/app/assets/img/xbox-logo.svg",
    bgGradient: "linear-gradient(135deg, rgba(16, 124, 65, 0.22), rgba(10, 80, 40, 0.12))",
    badgeAr: "رسمي 100%",
    badgeEn: "100% Official",
    link: "/product/xbox",
  },
  {
    id: "itunes",
    nameAr: "بطاقات آبل وآيتونز",
    nameEn: "iTunes & Apple Gift Cards",
    descAr: "شحن رصيد Apple ID لشراء التطبيقات والألعاب والاشتراكات",
    descEn: "Apple ID balance for apps, games, and iCloud storage",
    startingPrice: 2.22,
    iconImage: "/app/assets/img/itunes-logo.svg",
    bgGradient: "linear-gradient(135deg, rgba(241, 7, 163, 0.22), rgba(123, 47, 247, 0.12))",
    badgeAr: "تسليم فوري",
    badgeEn: "Instant Code",
    link: "/product/itunes",
  },
  {
    id: "google-play",
    nameAr: "بطاقات جوجل بلاي",
    nameEn: "Google Play Cards",
    descAr: "شحن رصيد متجر Play للأندرويد لشراء الألعاب والخدمات",
    descEn: "Play Store digital balance for Android in-app purchases",
    startingPrice: 4.5,
    iconImage: "/app/assets/img/googleplay-logo.png",
    bgGradient: "linear-gradient(135deg, rgba(52, 168, 83, 0.22), rgba(26, 115, 232, 0.12))",
    badgeAr: "متاح الآن",
    badgeEn: "Available",
    link: "/product/google-play",
  },
  {
    id: "fortnite",
    nameAr: "فورت نايت V-Bucks",
    nameEn: "Fortnite V-Bucks",
    descAr: "شحن فيبوكس فوري لجميع الحسابات والمنصات (1000 إلى 27000 V-Bucks)",
    descEn: "Instant V-Bucks recharge for all platforms (1,000 to 27,000)",
    startingPrice: 4.0,
    iconImage: "/app/assets/img/fortnite-f-icon.jpg",
    bgGradient: "linear-gradient(135deg, rgba(168, 85, 247, 0.22), rgba(59, 130, 246, 0.12))",
    badgeAr: "⚡ شحن تلقائي",
    badgeEn: "⚡ Instant",
    link: "/category/fortnite",
  },
  {
    id: "steam-gift",
    nameAr: "بطاقات هدايا ستيم",
    nameEn: "Steam Gift Cards",
    descAr: "شحن رصيد محفظة Steam لشراء كافة الألعاب والإضافات",
    descEn: "Steam wallet recharge for PC gaming & DLCs",
    startingPrice: 5.0,
    iconImage: "/app/assets/img/catalog/batman-arkham-collection.jpg",
    bgGradient: "linear-gradient(135deg, rgba(23, 29, 37, 0.5), rgba(0, 229, 255, 0.15))",
    badgeAr: "تفعيل فوري",
    badgeEn: "Instant Key",
    link: "/category/gift-cards?cat=steam",
  },
  {
    id: "discord-nitro",
    nameAr: "ديسكورد نيترو وبوستات",
    nameEn: "Discord Nitro & Boosts",
    descAr: "اشتراكات Nitro شهرية وسنوية مع تفعيل البوستات فائق السرعة",
    descEn: "Nitro monthly/yearly codes and 14x Server Boosts",
    startingPrice: 6.5,
    iconImage: "/app/assets/img/catalog/discord-nitro-1-month.png",
    bgGradient: "linear-gradient(135deg, rgba(88, 101, 242, 0.22), rgba(147, 51, 234, 0.12))",
    badgeAr: "أقوى العروض",
    badgeEn: "Best Value",
    link: "/product/discord-nitro-1-month",
  },
];

export function BestSellingGiftCardsSection() {
  const { format } = useCurrency();
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
            {BEST_SELLING_GIFT_CARDS.map((card) => (
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
                      />
                    </div>
                    {card.badgeAr && (
                      <span className="gx-gamepoint-badge">
                        {ar ? card.badgeAr : card.badgeEn}
                      </span>
                    )}
                  </div>

                  <div className="gx-gamepoint-card-body">
                    <h3 className="gx-gamepoint-title">
                      {ar ? card.nameAr : card.nameEn}
                    </h3>
                    <p className="gx-gamepoint-desc">
                      {ar ? card.descAr : card.descEn}
                    </p>
                  </div>

                  <div className="gx-gamepoint-card-footer">
                    <div className="gx-gamepoint-price-box">
                      <span className="gx-gamepoint-price-label">
                        {ar ? "يبدأ من" : "Starts at"}
                      </span>
                      <span className="gx-gamepoint-price-val">
                        {format(card.startingPrice)}
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
