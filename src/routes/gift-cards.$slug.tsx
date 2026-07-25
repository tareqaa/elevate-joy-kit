import { createFileRoute, notFound } from "@tanstack/react-router";
import { StoreShell } from "@/components/gx/StoreShell";
import { GIFT_CARDS_CATALOG } from "@/data/products";
import { useCurrency } from "@/lib/gx/currency";
import { BuyActions } from "@/components/gx/BuyActions";

export const Route = createFileRoute("/gift-cards/$slug")({
  head: ({ params }) => {
    const g = GIFT_CARDS_CATALOG[params.slug];
    const title = g ? `${g.name} — GX Store` : "بطاقات هدايا — GX Store";
    return {
      meta: [
        { title },
        { name: "description", content: g ? `بطاقات ${g.name} بأسعار منافسة — تسليم رقمي فوري.` : "بطاقات هدايا رقمية." },
        { property: "og:title", content: title },
      ],
    };
  },
  loader: ({ params }) => {
    if (!GIFT_CARDS_CATALOG[params.slug]) throw notFound();
    return { slug: params.slug };
  },
  component: GiftCardPage,
});

function GiftCardPage() {
  const { slug } = Route.useLoaderData();
  const gc = GIFT_CARDS_CATALOG[slug];
  const { format } = useCurrency();

  const iconMarkup = gc.iconImg ? (
    <img src={gc.iconImg} alt={gc.name} style={{ width: 56, height: 56, objectFit: "contain", filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.35))" }} />
  ) : (
    <span style={{ fontSize: 44, lineHeight: 1 }}>{gc.icon}</span>
  );

  return (
    <StoreShell>
      <section className="giftcard-hero">
        <div className="wrap">
          <div className="giftcard-hero-inner fade-in">
            <div className="giftcard-mockup" style={{ background: gc.cardGradient }}>
              <div className="gc-top">
                <span className="gc-icon">{iconMarkup}</span>
                <div className="gc-chip" />
              </div>
              <div>
                <div className="gc-name">{gc.name}</div>
                <div className="gc-sub">Digital Gift Card</div>
              </div>
            </div>
            <div className="giftcard-hero-text">
              <h1>{gc.name}</h1>
              <p>اختار المنطقة والقيمة المناسبة إلك — تسليم الكود الرقمي بيوصلك مباشرة بعد تأكيد الطلب.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          {(!gc.regions || gc.regions.length === 0) ? (
            <div className="giftcard-empty fade-in">
              <div className="ge-icon">🕓</div>
              <h3>القيم والأسعار جاية قريبًا</h3>
              <p>عم نجهز باقات {gc.name} — لو حابب تطلب قيمة معينة هلق، تواصل معنا مباشرة عالواتساب وبنساعدك.</p>
            </div>
          ) : (
            gc.regions.map((region) => (
              <div key={region.code} className="region-section">
                <div className="region-head">
                  <div className="region-flag">
                    <img src={`https://flagcdn.com/w160/${region.code}.png`} srcSet={`https://flagcdn.com/w320/${region.code}.png 2x`} alt={region.name} />
                  </div>
                  <div className="region-name">{region.name}</div>
                </div>
                <div className="denom-grid" style={{ ["--gc-accent" as string]: gc.accent } as React.CSSProperties}>
                  {region.denominations.map((d) => (
                    <div key={d.id} className="denom-card">
                      <div className="dc-value">{d.value}</div>
                      <div className="dc-price"><span>{format(d.price)}</span></div>
                      <BuyActions cartId={d.id} />
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </StoreShell>
  );
}
