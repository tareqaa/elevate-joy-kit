import { createFileRoute, notFound } from "@tanstack/react-router";
import { StoreShell } from "@/components/gx/StoreShell";
import { CATEGORY_META, SUBCATEGORIES, getProductLink, getGiftCardLink } from "@/data/products";

export const Route = createFileRoute("/category/$slug")({
  head: ({ params }) => {
    const m = CATEGORY_META[params.slug];
    const title = m ? `${m.name} — GX Store` : "قسم — GX Store";
    return {
      meta: [
        { title },
        { name: "description", content: m?.tagline || "تصفح المنتجات في GX Store" },
        { property: "og:title", content: title },
        { property: "og:description", content: m?.tagline || "" },
      ],
    };
  },
  loader: ({ params }) => {
    if (!CATEGORY_META[params.slug]) throw notFound();
    return { slug: params.slug };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useLoaderData();
  const meta = CATEGORY_META[slug];
  const subs = SUBCATEGORIES[slug] || [];
  const isGiftCards = slug === "gift-cards";

  return (
    <StoreShell>
      <section className="category-hero">
        <div className="wrap">
          <div className="category-hero-inner fade-in">
            <div className="category-hero-icon">{meta.icon}</div>
            <div className="category-hero-text">
              <h1>{meta.name}</h1>
              <p>{meta.tagline}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="subcat-grid">
            {subs.map((s) => {
              const iconInner = s.iconImg ? (
                <img src={s.iconImg} alt={s.name} style={{ width: 44, height: 44, objectFit: "contain", filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.35))" }} />
              ) : (
                <span>{s.icon}</span>
              );
              if (s.comingSoon) {
                return (
                  <div key={s.slug} className="subcat-card soon">
                    <span className="soon-badge">قريبًا</span>
                    <div className="subcat-ic" style={{ background: s.bg }}>{iconInner}</div>
                    <div>
                      <div className="subcat-name">{s.name}</div>
                      <div className="subcat-status" style={{ color: "var(--gray)" }}>قيد الإضافة</div>
                    </div>
                  </div>
                );
              }
              const href = isGiftCards ? getGiftCardLink(s.slug) : getProductLink(s.product || s.slug);
              return (
                <a key={s.slug} href={href} className="subcat-card clickable">
                  <div className="subcat-ic" style={{ background: s.bg }}>{iconInner}</div>
                  <div>
                    <div className="subcat-name">{s.name}</div>
                    <div className="subcat-status">تصفح المنتجات ‹</div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>
    </StoreShell>
  );
}
