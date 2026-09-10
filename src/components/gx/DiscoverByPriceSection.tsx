import React from "react";
import { Link } from "@tanstack/react-router";
import { Tag, Sparkles } from "lucide-react";
import { useLang } from "@/lib/gx/i18n";

export interface PriceTier {
  id: string;
  maxPrice: number;
  labelTopEn: string;
  labelTopAr: string;
  amountEn: string;
  amountAr: string;
  accentColor: string;
}

export const PRICE_TIERS: PriceTier[] = [
  {
    id: "under-1",
    maxPrice: 1,
    labelTopEn: "Under",
    labelTopAr: "أقل من",
    amountEn: "JOD 1",
    amountAr: "1 د.أ",
    accentColor: "#10b981",
  },
  {
    id: "under-2",
    maxPrice: 2,
    labelTopEn: "Under",
    labelTopAr: "أقل من",
    amountEn: "JOD 2",
    amountAr: "2 د.أ",
    accentColor: "#00e5ff",
  },
  {
    id: "under-5",
    maxPrice: 5,
    labelTopEn: "Under",
    labelTopAr: "أقل من",
    amountEn: "JOD 5",
    amountAr: "5 د.أ",
    accentColor: "#6366f1",
  },
  {
    id: "under-10",
    maxPrice: 10,
    labelTopEn: "Under",
    labelTopAr: "أقل من",
    amountEn: "JOD 10",
    amountAr: "10 د.أ",
    accentColor: "#a855f7",
  },
  {
    id: "under-20",
    maxPrice: 20,
    labelTopEn: "Under",
    labelTopAr: "أقل من",
    amountEn: "JOD 20",
    amountAr: "20 د.أ",
    accentColor: "#ec4899",
  },
  {
    id: "under-50",
    maxPrice: 50,
    labelTopEn: "Under",
    labelTopAr: "أقل من",
    amountEn: "JOD 50",
    amountAr: "50 د.أ",
    accentColor: "#f59e0b",
  },
];

export function DiscoverByPriceSection() {
  const { lang } = useLang();
  const ar = lang === "ar";

  return (
    <section className="gx-section-modern gx-discover-price-wrap">
      <div className="gx-home-container">
        {/* Section Header */}
        <div className="gx-section-header-row">
          <div className="gx-section-title-group">
            <div className="gx-badge-glow">
              <Tag size={14} className="gx-badge-icon" />
              <span>{ar ? "ميزانيتك أولاً" : "Budget Friendly"}</span>
            </div>
            <h2 className="gx-section-title">
              {ar ? "اكتشف حسب السعر" : "Discover By Price"}
            </h2>
            <p className="gx-section-subtitle">
              {ar
                ? "حدد ميزانيتك وتصفح الألعاب والاشتراكات المناسبة لك ابتداءً من دينار واحد"
                : "Find games, subscriptions and keys tailored to your exact budget"}
            </p>
          </div>
        </div>

        {/* Price Cards Grid matching user image 3 */}
        <div className="gx-price-tiers-grid">
          {PRICE_TIERS.map((tier) => (
            <Link
              key={tier.id}
              to={`/products?max_price=${tier.maxPrice}` as never}
              className="gx-price-tier-card"
              style={{ ["--tier-accent" as string]: tier.accentColor } as React.CSSProperties}
            >
              <span className="gx-price-tier-top">
                {ar ? tier.labelTopAr : tier.labelTopEn}
              </span>
              <span className="gx-price-tier-amount">
                {ar ? tier.amountAr : tier.amountEn}
              </span>
              <div className="gx-price-tier-glow" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
