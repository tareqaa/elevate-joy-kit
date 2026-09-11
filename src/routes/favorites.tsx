import React, { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { StoreShell } from "@/components/gx/StoreShell";
import { useLang } from "@/lib/gx/i18n";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { StoreProductCard } from "@/components/gx/StoreProductCard";
import { useFavorites } from "@/lib/gx/favorites";
import { Search, Store, Trash2, Heart, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/favorites")({
  head: () => ({
    meta: [
      { title: "المفضلة — GX Store" },
      { name: "description", content: "المنتجات المحفوظة في المفضلة لديك في متجر GX Store." },
      { property: "og:title", content: "المفضلة — GX Store" },
      { property: "og:description", content: "قائمة المنتجات المحفوظة في المفضلة لديك." },
    ],
    links: STORE_HEAD_LINKS,
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const { favorites, count, clear } = useFavorites();
  const [filterQuery, setFilterQuery] = useState("");

  const filteredItems = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return favorites;
    return favorites.filter((item) =>
      item.name.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q)
    );
  }, [favorites, filterQuery]);

  return (
    <StoreShell>
      <main
        className="gx-favorites-page"
        style={{
          minHeight: "75vh",
          padding: "36px 0 80px",
          background: "transparent",
        }}
      >
        <div className="wrap" style={{ maxWidth: 1240, margin: "0 auto", padding: "0 24px" }}>
          {/* Top Bar: Driffle-Style Clean Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 16,
              marginBottom: 44,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <h1
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  color: "#ffffff",
                  margin: 0,
                  letterSpacing: "-0.5px",
                }}
              >
                {ar ? "المفضلة" : "Favorites"}
              </h1>
              {count > 0 && (
                <span
                  style={{
                    fontSize: 13,
                    color: "#9ca3af",
                    fontWeight: 600,
                  }}
                >
                  ({count})
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              {/* Search Box matching Driffle top-right search */}
              <div
                style={{
                  position: "relative",
                  width: 320,
                  maxWidth: "100%",
                }}
              >
                <Search
                  size={15}
                  style={{
                    position: "absolute",
                    top: "50%",
                    transform: "translateY(-50%)",
                    insetInlineStart: 12,
                    color: "#6b7280",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder={
                    ar
                      ? "ابحث عن الألعاب، البطاقات والمزيد"
                      : "Search for games, gift cards and more"
                  }
                  style={{
                    width: "100%",
                    height: 38,
                    paddingInlineStart: 36,
                    paddingInlineEnd: 12,
                    background: "#161922",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 8,
                    color: "#ffffff",
                    fontSize: 13,
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.2s ease, background 0.2s ease",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "rgba(0, 229, 255, 0.4)";
                    e.target.style.background = "#1a1e2a";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(255, 255, 255, 0.08)";
                    e.target.style.background = "#161922";
                  }}
                />
              </div>

              {count > 0 && (
                <button
                  type="button"
                  onClick={clear}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    height: 38,
                    padding: "0 14px",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: 8,
                    color: "#9ca3af",
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#ff2d78";
                    e.currentTarget.style.color = "#ff2d78";
                    e.currentTarget.style.background = "rgba(255, 45, 120, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                    e.currentTarget.style.color = "#9ca3af";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  }}
                >
                  <Trash2 size={14} />
                  <span>{ar ? "تفريغ" : "Clear"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Empty State: Clean & Minimalist */}
          {count === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: "48px 20px 80px",
              }}
            >
              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 20,
                  color: "#94a3b8",
                }}
              >
                <Heart size={30} strokeWidth={1.8} />
              </div>

              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: "#ffffff",
                  margin: "0 0 8px 0",
                  letterSpacing: "-0.3px",
                }}
              >
                {ar ? "قائمة المفضلة فارغة" : "Nothing Saved Yet"}
              </h2>

              <p
                style={{
                  fontSize: 14,
                  color: "#9ca3af",
                  maxWidth: 380,
                  margin: "0 auto 24px",
                  lineHeight: 1.6,
                }}
              >
                {ar
                  ? "استكشف أحدث الألعاب والبطاقات واضغط على رمز القلب لحفظ منتجاتك المفضلة هنا."
                  : "Discover amazing products and add them here for quick access."}
              </p>

              <Link
                to="/products"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  height: 40,
                  padding: "0 24px",
                  background: "linear-gradient(135deg, #00e5ff 0%, #00bce6 100%)",
                  borderRadius: 9999,
                  color: "#050811",
                  fontWeight: 800,
                  fontSize: 13.5,
                  textDecoration: "none",
                  boxShadow: "0 4px 16px rgba(0, 229, 255, 0.35)",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = "brightness(1.08)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <ShoppingBag size={16} strokeWidth={2.4} />
                <span>{ar ? "تصفح المنتجات" : "Browse Products"}</span>
              </Link>
            </div>
          ) : filteredItems.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                color: "#9ca3af",
              }}
            >
              <p style={{ fontSize: 16, marginBottom: 12 }}>
                {ar ? "لا توجد منتجات مطابقة لبحثك في المفضلة" : "No products match your search in favorites"}
              </p>
              <button
                type="button"
                onClick={() => setFilterQuery("")}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#00e5ff",
                  padding: "6px 16px",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                {ar ? "إلغاء التصفية" : "Reset search"}
              </button>
            </div>
          ) : (
            <div className="cat-adaptive-grid">
              {filteredItems.map((item) => (
                <StoreProductCard
                  key={item.slug}
                  slug={item.slug}
                  cartId={item.cartId || item.slug}
                  name={item.name}
                  link={item.link || `/product/${item.slug}`}
                  price={item.price}
                  oldPrice={item.oldPrice}
                  imageUrl={item.imageUrl}
                  iconImage={item.iconImage}
                  icon={item.icon}
                  categoryName={item.categoryName}
                  categorySlug={item.categorySlug}
                  customPlatform={item.customPlatform}
                  productType={item.productType}
                  showPlatformBar={true}
                  showFromLabel={false}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </StoreShell>
  );
}

