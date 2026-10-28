import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useCurrency } from "@/lib/gx/currency";
import { useLang } from "@/lib/gx/i18n";
import { Flame, Sparkles, Zap, ShieldCheck } from "lucide-react";

interface DealItem {
  id: string;
  slug: string;
  titleAr: string;
  titleEn: string;
  categoryAr: string;
  categoryEn: string;
  regionAr: string;
  regionEn: string;
  badgeText: string;
  badgeType: "fire" | "hot" | "gold" | "cyan";
  price: number;
  oldPrice?: number;
  image: string;
  deliveryAr: string;
  deliveryEn: string;
}

const DEALS: DealItem[] = [
  {
    id: "deal-freefire",
    slug: "free-fire-diamonds",
    titleAr: "شحن جواهر فري فاير — عرض الدبل (الشرق الأوسط)",
    titleEn: "Free Fire Double Gems Offer — Middle East",
    categoryAr: "ألعاب جوال • Garena",
    categoryEn: "Mobile Games • Garena",
    regionAr: "الشرق الأوسط (ME)",
    regionEn: "Middle East (ME)",
    badgeText: "عرض الدبل 🔥",
    badgeType: "fire",
    price: 2.50,
    oldPrice: 5.00,
    image: "/app/assets/img/catalog/free-fire.png",
    deliveryAr: "شحن فوري بالـ ID",
    deliveryEn: "Instant ID Top-up",
  },
  {
    id: "deal-windows",
    slug: "windows",
    titleAr: "Windows 11 Professional (مفتاح رقمي رسمي)",
    titleEn: "Windows 11 Professional Official License",
    categoryAr: "برامج • مايكروسوفت",
    categoryEn: "Software • Microsoft",
    regionAr: "عالمي (Global)",
    regionEn: "Global",
    badgeText: "Up to -91%",
    badgeType: "hot",
    price: 2.00,
    oldPrice: 22.00,
    image: "/app/assets/img/windows-icon.png",
    deliveryAr: "كود رقمي فوري",
    deliveryEn: "Instant Digital Key",
  },
  {
    id: "deal-fc27",
    slug: "ea-fc-27-pc",
    titleAr: "EA SPORTS FC 27 Standard Edition (PC)",
    titleEn: "EA SPORTS FC 27 Standard Edition (PC)",
    categoryAr: "ألعاب PC • EA Sports",
    categoryEn: "PC Games • EA Sports",
    regionAr: "عالمي (Global)",
    regionEn: "Global",
    badgeText: "Up to -60%",
    badgeType: "cyan",
    price: 19.00,
    oldPrice: 48.00,
    image: "/app/assets/img/catalog/ea-fc-27-pc.png",
    deliveryAr: "حساب أو كود أصلي",
    deliveryEn: "Verified Game",
  },
  {
    id: "deal-cod",
    slug: "call-of-duty-black-ops-7",
    titleAr: "Call of Duty: Black Ops 7 (PC Steam)",
    titleEn: "Call of Duty: Black Ops 7 (PC Steam)",
    categoryAr: "ألعاب PC • ستيم",
    categoryEn: "PC Games • Steam",
    regionAr: "عالمي (Global)",
    regionEn: "Global",
    badgeText: "Up to -50%",
    badgeType: "gold",
    price: 28.00,
    oldPrice: 56.00,
    image: "/app/assets/img/catalog/call-of-duty-black-ops-7.webp",
    deliveryAr: "تسليم فوري ومضمون",
    deliveryEn: "Instant Delivery",
  },
];

export function G2ADealsHero() {
  const { lang } = useLang();
  const { format } = useCurrency();
  const ar = lang === "ar";

  const getBadgeStyle = (type: DealItem["badgeType"]) => {
    switch (type) {
      case "fire":
        return {
          background: "linear-gradient(135deg, #ff3b30 0%, #ff9500 100%)",
          color: "#ffffff",
          boxShadow: "0 4px 15px rgba(255, 59, 48, 0.45)",
        };
      case "hot":
        return {
          background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
          color: "#ffffff",
          boxShadow: "0 4px 15px rgba(225, 29, 72, 0.45)",
        };
      case "cyan":
        return {
          background: "linear-gradient(135deg, #00e5ff 0%, #0091ff 100%)",
          color: "#040914",
          boxShadow: "0 4px 15px rgba(0, 229, 255, 0.4)",
        };
      case "gold":
        return {
          background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          color: "#040914",
          boxShadow: "0 4px 15px rgba(245, 158, 11, 0.4)",
        };
    }
  };

  return (
    <section className="gx-deals-hero-section" style={{ padding: "16px 0 32px", width: "100%" }}>
      <div className="wrap">
        {/* Section Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: "linear-gradient(135deg, rgba(255, 59, 48, 0.2) 0%, rgba(255, 149, 0, 0.15) 100%)",
                border: "1px solid rgba(255, 59, 48, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ff3b30",
              }}
            >
              <Flame size={22} />
            </div>
            <div>
              <h2
                style={{
                  fontSize: 21,
                  fontWeight: 900,
                  color: "#ffffff",
                  margin: 0,
                  letterSpacing: -0.3,
                  fontFamily: "'Tajawal', sans-serif",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>{ar ? "عروض حصرية وتخفيضات كبرى" : "Featured Deals & Exclusive Offers"}</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    padding: "3px 8px",
                    borderRadius: 6,
                    background: "rgba(0, 229, 255, 0.12)",
                    color: "#00e5ff",
                    border: "1px solid rgba(0, 229, 255, 0.3)",
                  }}
                >
                  {ar ? "لفترة محدودة" : "Limited Time"}
                </span>
              </h2>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: "3px 0 0" }}>
                {ar
                  ? "أقوى الصفقات الرقمية المعتمدة بأسعار لا تُفوّت وتفعيل فوري مباشر"
                  : "Top verified digital deals with massive discounts and instant delivery"}
              </p>
            </div>
          </div>

          <Link
            to="/products"
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#00e5ff",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 12px",
              borderRadius: 8,
              background: "rgba(0, 229, 255, 0.06)",
              border: "1px solid rgba(0, 229, 255, 0.2)",
              transition: "all 0.2s ease",
            }}
          >
            <span>{ar ? "عرض كافة العروض" : "View All Deals"}</span>
            <span>{ar ? "←" : "→"}</span>
          </Link>
        </div>

        {/* 4 Deals Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          {DEALS.map((deal) => {
            const badgeStyle = getBadgeStyle(deal.badgeType);
            return (
              <Link
                key={deal.id}
                to="/product/$slug"
                params={{ slug: deal.slug }}
                className="gx-deal-card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  background: "linear-gradient(165deg, rgba(17, 24, 39, 0.9) 0%, rgba(10, 14, 26, 0.96) 100%)",
                  border: "1.5px solid rgba(255, 255, 255, 0.09)",
                  borderRadius: 18,
                  overflow: "hidden",
                  textDecoration: "none",
                  position: "relative",
                  transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                  boxShadow: "0 10px 28px rgba(0, 0, 0, 0.4)",
                }}
              >
                {/* Diagonal Top Ribbon Badge */}
                <div
                  style={{
                    position: "absolute",
                    top: 12,
                    insetInlineStart: 12,
                    zIndex: 5,
                    padding: "4px 11px",
                    borderRadius: 99,
                    fontSize: 11.5,
                    fontWeight: 900,
                    letterSpacing: 0.3,
                    ...badgeStyle,
                  }}
                >
                  {deal.badgeText}
                </div>

                {/* Cover Image */}
                <div
                  style={{
                    width: "100%",
                    height: 155,
                    background: "rgba(5, 8, 16, 0.8)",
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <img
                    src={deal.image}
                    alt={ar ? deal.titleAr : deal.titleEn}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: deal.slug === "windows" ? "contain" : "cover",
                      padding: deal.slug === "windows" ? 24 : 0,
                      transition: "transform 0.3s ease",
                    }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/app/assets/img/gx-logo.png";
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(10, 14, 26, 0.85) 100%)",
                      pointerEvents: "none",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: 8,
                      insetInlineEnd: 10,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 6,
                      background: "rgba(0, 0, 0, 0.65)",
                      color: "#cbd5e1",
                      backdropFilter: "blur(4px)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                    }}
                  >
                    {ar ? deal.regionAr : deal.regionEn}
                  </div>
                </div>

                {/* Card Body */}
                <div
                  style={{
                    padding: "14px 16px 16px",
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#94a3b8",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    {ar ? deal.categoryAr : deal.categoryEn}
                  </span>

                  <h3
                    style={{
                      fontSize: 14.5,
                      fontWeight: 800,
                      color: "#f8fafc",
                      margin: 0,
                      lineHeight: 1.4,
                      minHeight: 40,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {ar ? deal.titleAr : deal.titleEn}
                  </h3>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 11.5,
                      color: "#00e5ff",
                      fontWeight: 700,
                    }}
                  >
                    <Zap size={13} />
                    <span>{ar ? deal.deliveryAr : deal.deliveryEn}</span>
                  </div>

                  {/* Price & CTA Row */}
                  <div
                    style={{
                      marginTop: "auto",
                      paddingTop: 10,
                      borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 11, color: "#64748b", display: "block" }}>
                        {ar ? "السعر يبدأ من:" : "From:"}
                      </span>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                        <span
                          style={{
                            fontSize: 18,
                            fontWeight: 900,
                            color: "#ffffff",
                            fontFamily: "'Tajawal', sans-serif",
                          }}
                        >
                          {format(deal.price)}
                        </span>
                        {deal.oldPrice && (
                          <span
                            style={{
                              fontSize: 12,
                              color: "#64748b",
                              textDecoration: "line-through",
                            }}
                          >
                            {format(deal.oldPrice)}
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      style={{
                        padding: "7px 14px",
                        borderRadius: 10,
                        background: "linear-gradient(135deg, #00f0ff 0%, #0091ff 100%)",
                        color: "#040914",
                        fontSize: 12.5,
                        fontWeight: 900,
                        boxShadow: "0 3px 12px rgba(0, 229, 255, 0.3)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {ar ? "اطلب الآن" : "Buy Now"}
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
