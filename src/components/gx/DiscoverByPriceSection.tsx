import React from "react";
import { Link } from "@tanstack/react-router";
import { Tag } from "lucide-react";
import { useCurrency } from "@/lib/gx/currency";
import { useLang } from "@/lib/gx/i18n";

export interface PriceTierConfig {
  amount: number;
  jodMaxPrice: number;
  accentColor: string;
}

const TIER_COLORS = [
  "#10b981", // green / emerald
  "#00e5ff", // cyan
  "#6366f1", // indigo
  "#a855f7", // purple
  "#ec4899", // pink
  "#f59e0b", // amber
];

const CURRENCY_TIER_AMOUNTS: Record<string, number[]> = {
  JOD: [1, 2, 5, 10, 20, 50],
  SAR: [5, 10, 20, 50, 100, 300],
  AED: [5, 10, 20, 50, 100, 300],
  QAR: [5, 10, 20, 50, 100, 300],
  USD: [2, 5, 10, 20, 30, 50],
  EUR: [2, 5, 10, 20, 30, 50],
  KWD: [1, 2, 5, 10, 15, 25],
  BHD: [1, 2, 5, 10, 15, 25],
  OMR: [1, 2, 5, 10, 15, 25],
  EGP: [50, 100, 250, 500, 1000, 2000],
  IQD: [2000, 5000, 10000, 25000, 50000, 100000],
  MAD: [10, 25, 50, 100, 200, 500],
  DZD: [200, 500, 1000, 2500, 5000, 10000],
  TND: [5, 10, 20, 50, 100, 150],
};

export function DiscoverByPriceSection() {
  const { currency, rate } = useCurrency();
  const { lang } = useLang();
  const ar = lang === "ar";

  const effectiveRate = Number(rate) > 0 ? Number(rate) : 1;
  const amounts = CURRENCY_TIER_AMOUNTS[currency] || [
    Math.round(1 * effectiveRate),
    Math.round(2 * effectiveRate),
    Math.round(5 * effectiveRate),
    Math.round(10 * effectiveRate),
    Math.round(20 * effectiveRate),
    Math.round(50 * effectiveRate),
  ];

  const tiers: PriceTierConfig[] = amounts.map((amount, idx) => ({
    amount,
    jodMaxPrice: currency === "JOD" ? amount : Math.round((amount / effectiveRate) * 100) / 100,
    accentColor: TIER_COLORS[idx % TIER_COLORS.length],
  }));

  return (
    <section className="section gx-discover-price-wrap" style={{ paddingTop: 28, paddingBottom: 36 }}>
      <div className="wrap">
        {/* Section Header */}
        <div className="section-head" style={{ marginBottom: 18 }}>
          <div>
            <span className="k" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Tag size={14} style={{ color: "var(--cyan, #00e5ff)" }} />
              {ar ? "ميزانيتك أولاً" : "Budget Friendly"}
            </span>
            <h2 style={{ fontSize: 24, fontWeight: 900 }}>
              {ar ? "اكتشف حسب السعر" : "Discover By Price"}
            </h2>
          </div>
        </div>

        {/* Price Cards Grid matching user reference Image */}
        <div className="gx-price-tiers-grid">
          {tiers.map((tier) => {
            const formattedAmount = `${tier.amount.toLocaleString("en-US")} ${currency}`;

            return (
              <Link
                key={tier.amount}
                to={`/products?max_price=${tier.jodMaxPrice}` as never}
                className="gx-price-tier-card"
                style={{ ["--tier-accent" as string]: tier.accentColor } as React.CSSProperties}
              >
                <span className="gx-price-tier-top">
                  {ar ? "أقل من" : "Under"}
                </span>
                <span className="gx-price-tier-amount">
                  {formattedAmount}
                </span>
                <div className="gx-price-tier-glow" />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
