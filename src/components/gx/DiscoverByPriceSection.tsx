import React from "react";
import { Link } from "@tanstack/react-router";
import { Tag } from "lucide-react";
import { useCurrency } from "@/lib/gx/currency";
import { useLang } from "@/lib/gx/i18n";

export interface PriceTier {
  id: string;
  jodPrice: number;
  accentColor: string;
}

export const BASE_PRICE_TIERS: PriceTier[] = [
  { id: "tier-1", jodPrice: 1, accentColor: "#10b981" },
  { id: "tier-2", jodPrice: 2, accentColor: "#00e5ff" },
  { id: "tier-5", jodPrice: 5, accentColor: "#6366f1" },
  { id: "tier-10", jodPrice: 10, accentColor: "#a855f7" },
  { id: "tier-20", jodPrice: 20, accentColor: "#ec4899" },
  { id: "tier-50", jodPrice: 50, accentColor: "#f59e0b" },
];

export function DiscoverByPriceSection() {
  const { format, currency } = useCurrency();
  const { lang } = useLang();
  const ar = lang === "ar";

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
          {BASE_PRICE_TIERS.map((tier) => {
            const formattedAmount = format(tier.jodPrice);

            return (
              <Link
                key={tier.id}
                to={`/products?max_price=${tier.jodPrice}` as never}
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
