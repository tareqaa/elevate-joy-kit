import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { StoreShell } from "@/components/gx/StoreShell";
import { PRODUCTS_CATALOG } from "@/data/products";
import { useCurrency } from "@/lib/gx/currency";
import { useCart } from "@/lib/gx/cart";
import { FeatureAccordion, DeliveryBox, SectionHead } from "@/components/gx/Primitives";

export const Route = createFileRoute("/snapchat")({
  head: () => ({
    meta: [
      { title: "سناب بلس — GX Store" },
      { name: "description", content: "فعّل سناب بلس بأسهل وأسرع طريقة — تفعيل رسمي عن طريق الإهداء داخل سناب شات." },
      { property: "og:title", content: "سناب بلس — GX Store" },
    ],
  }),
  component: SnapchatPage,
});

function SnapchatPage() {
  const sp = PRODUCTS_CATALOG.snapchat;
  const { format } = useCurrency();
  const cart = useCart();
  const defaultPlan = sp.plans!.find((pl) => pl.tag)?.id || sp.plans![0].id;
  const [planId, setPlanId] = useState(defaultPlan);
  const [usernames, setUsernames] = useState<string[]>([""]);
  const [error, setError] = useState<string | null>(null);
  const [addedFlash, setAddedFlash] = useState(false);
  const plan = useMemo(() => sp.plans!.find((p) => p.id === planId)!, [planId, sp.plans]);

  function updateUsername(i: number, v: string) {
    const next = usernames.slice();
    next[i] = v.trim();
    setUsernames(next);
    setError(null);
  }

  function inc() {
    if (usernames.length >= 10) return;
    const missingIdx = usernames.findIndex((u) => !u.trim());
    if (missingIdx !== -1) { setError("عبّي يوزر الحساب الحالي قبل ما تضيف حساب جديد"); return; }
    setUsernames([...usernames, ""]);
  }
  function dec() {
    if (usernames.length <= 1) return;
    setUsernames(usernames.slice(0, -1));
  }

  function validate() {
    const missingIdx = usernames.findIndex((u) => !u.trim());
    if (missingIdx !== -1) { setError("الرجاء إدخال يوزر السناب لكل حساب قبل الإضافة للسلة"); return false; }
    return true;
  }

  function addToCart() {
    if (!validate()) return;
    cart.addSnap(plan.id, usernames);
    setAddedFlash(true);
    setTimeout(() => setAddedFlash(false), 1600);
  }
  function buyNow() {
    if (!validate()) return;
    cart.buyNowSnap(plan.id, usernames);
  }

  return (
    <StoreShell>
      <section className="product-hero">
        <div className="wrap">
          <div className="product-hero-inner fade-in">
            <div className="product-icon-badge"><div className="core">{sp.icon}</div></div>
            <div className="product-hero-text">
              <span className="cat-tag">{sp.category}</span>
              <h1>{sp.tagline}</h1>
              <p>{sp.description}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <SectionHead eyebrow="الباقات" title="اختار الباقة المناسبة إلك" />
          <div className="snap-plan-grid">
            {sp.plans!.map((pl) => {
              const discount = pl.oldPrice ? Math.round((1 - pl.price / pl.oldPrice) * 100) : 0;
              return (
                <div key={pl.id} className={"snap-plan" + (pl.id === planId ? " selected" : "")} onClick={() => setPlanId(pl.id)}>
                  <div className="sp-check">✓</div>
                  {pl.tag && <div className="sp-tag">{pl.tag}</div>}
                  {discount > 0 && <div className="sp-discount">وفّر {discount}%</div>}
                  <div className="sp-icon">👻</div>
                  <div className="sp-label">{pl.label}</div>
                  <div>
                    {pl.oldPrice && <span className="sp-old">{format(pl.oldPrice)}</span>}
                    <span className="sp-price">{format(pl.price)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "var(--bg2)", paddingTop: 0 }}>
        <div className="wrap">
          <SectionHead eyebrow="بيانات الطلب" title="حدد عدد الحسابات ويوزراتها" />
          <div className="order-box">
            <div>
              <div className="order-field">
                <label>عدد الحسابات</label>
                <div className="stepper-row">
                  <button type="button" onClick={inc}>+</button>
                  <div className="count">{usernames.length}</div>
                  <button type="button" onClick={dec}>−</button>
                </div>
                <div className="stepper-hint">إذا بدك تفعّل أكثر من حساب بنفس الطلب، زوّد العدد وبتطلعلك خانة يوزر لكل حساب.</div>
              </div>
              <div>
                {usernames.map((val, i) => (
                  <div key={i} className="username-field">
                    <label>{usernames.length === 1 ? sp.identifierLabel : `${sp.identifierLabel} — حساب ${i + 1}`}</label>
                    <input
                      type="text"
                      className={"uname-input" + (error && !val.trim() ? " error" : "")}
                      placeholder={sp.identifierPlaceholder}
                      value={val}
                      onChange={(e) => updateUsername(i, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="order-summary">
              <h3>ملخص الطلب</h3>
              <div className="os-row"><span>المدة</span><span>{plan.label}</span></div>
              <div className="os-row"><span>سعر الباقة</span><span>{format(plan.price)}</span></div>
              <div className="os-row"><span>عدد الحسابات</span><span>{usernames.length}</span></div>
              <div className="os-total">
                <span className="lbl">الإجمالي</span>
                <span className="val">{format(plan.price * usernames.length)}</span>
              </div>
              {error && <div className="order-error" style={{ display: "block" }}>{error}</div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button className={"btn btn-primary btn-block" + (addedFlash ? " added" : "")} type="button" onClick={addToCart}>
                  {addedFlash ? "✓ أضيفت للسلة بنجاح" : "🛒 أضف الطلب للسلة"}
                </button>
                <button className="btn btn-ghost btn-block" type="button" onClick={buyNow}>⚡ اشتري الآن</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <SectionHead eyebrow="المميزات" title="شو رح تحصل عليه بالضبط" sub="اضغط على أي ميزة لتشوف تفاصيلها" />
          <FeatureAccordion features={sp.features || []} />
        </div>
      </section>

      <section className="section" style={{ background: "var(--bg2)" }}>
        <div className="wrap">
          <DeliveryBox method={sp.deliveryMethod} identifierLabel={sp.identifierLabel} />
        </div>
      </section>
    </StoreShell>
  );
}
