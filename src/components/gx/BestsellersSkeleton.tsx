import { CarouselRow } from "@/components/gx/CarouselRow";
import { useLang } from "@/lib/gx/i18n";
import type { BestsellersData } from "@/lib/gx/sections/types";

export function BestsellersSkeleton({ data }: { data?: BestsellersData }) {
  const { t } = useLang();

  return (
    <section className="section" id="products" style={{ background: "var(--bg2)" }}>
      <div className="wrap">
        <div className="section-head">
          <div>
            <span className="k">{data?.eyebrow || t("home.featured_eyebrow")}</span>
            <h2>{data?.title || t("home.featured_title")}</h2>
          </div>
        </div>

        <CarouselRow className="featured-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="prod-card"
              style={{
                pointerEvents: "none",
                userSelect: "none",
                opacity: 0.85,
              }}
            >
              {/* Card Thumbnail Skeleton */}
              <div
                className="prod-thumb"
                style={{
                  background: "linear-gradient(145deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.07))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: "60px",
                    height: "60px",
                    borderRadius: "16px",
                    background: "rgba(255, 255, 255, 0.06)",
                    animation: "pulse 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                  }}
                />
              </div>

              {/* Card Body Skeleton */}
              <div
                className="prod-body"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  padding: "16px",
                }}
              >
                {/* Platform / Subtitle line */}
                <div
                  style={{
                    height: "12px",
                    width: "40%",
                    borderRadius: "4px",
                    background: "rgba(255, 255, 255, 0.06)",
                    animation: "pulse 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                  }}
                />
                {/* Product Title line */}
                <div
                  style={{
                    height: "18px",
                    width: "85%",
                    borderRadius: "6px",
                    background: "rgba(255, 255, 255, 0.09)",
                    animation: "pulse 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                  }}
                />
                {/* Price & Action Skeleton */}
                <div
                  style={{
                    marginTop: "10px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      height: "24px",
                      width: "75px",
                      borderRadius: "6px",
                      background: "rgba(0, 229, 255, 0.12)",
                      animation: "pulse 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                    }}
                  />
                  <div
                    style={{
                      height: "32px",
                      width: "32px",
                      borderRadius: "10px",
                      background: "rgba(255, 255, 255, 0.08)",
                      animation: "pulse 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </CarouselRow>
      </div>
    </section>
  );
}
