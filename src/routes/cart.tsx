import { createFileRoute, Link } from "@tanstack/react-router";
import { StoreShell } from "@/components/gx/StoreShell";
import { useCart } from "@/lib/gx/cart";
import { useCurrency } from "@/lib/gx/currency";
import { useLang } from "@/lib/gx/i18n";
import { localizeResolvedName } from "@/lib/gx/product-locale";
import { useSiteSettings } from "@/lib/gx/site-settings";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { OrderConfirmedModal } from "@/components/gx/OrderConfirmedModal";
import { coinsToJod, jodToCoins } from "@/lib/gx/loyalty";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Cart — GX Store" },
      { name: "description", content: "Review your order before checking out — GX Store." },
    ],
    links: STORE_HEAD_LINKS,
  }),
  component: CartPage,
});

const COUNTRY_CODES: { code: string; flag: string; name: string }[] = [
  { code: "+962", flag: "🇯🇴", name: "الأردن" },
  { code: "+966", flag: "🇸🇦", name: "السعودية" },
  { code: "+971", flag: "🇦🇪", name: "الإمارات" },
  { code: "+965", flag: "🇰🇼", name: "الكويت" },
  { code: "+974", flag: "🇶🇦", name: "قطر" },
  { code: "+973", flag: "🇧🇭", name: "البحرين" },
  { code: "+968", flag: "🇴🇲", name: "عُمان" },
  { code: "+20", flag: "🇪🇬", name: "مصر" },
  { code: "+970", flag: "🇵🇸", name: "فلسطين" },
  { code: "+961", flag: "🇱🇧", name: "لبنان" },
  { code: "+963", flag: "🇸🇾", name: "سوريا" },
  { code: "+964", flag: "🇮🇶", name: "العراق" },
  { code: "+967", flag: "🇾🇪", name: "اليمن" },
  { code: "+218", flag: "🇱🇾", name: "ليبيا" },
  { code: "+216", flag: "🇹🇳", name: "تونس" },
  { code: "+213", flag: "🇩🇿", name: "الجزائر" },
  { code: "+212", flag: "🇲🇦", name: "المغرب" },
  { code: "+90",  flag: "🇹🇷", name: "تركيا" },
  { code: "+1",   flag: "🇺🇸", name: "أمريكا/كندا" },
  { code: "+44",  flag: "🇬🇧", name: "بريطانيا" },
];

function CartPage() {
  const { t } = useLang();
  return (
    <StoreShell>
      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <div><span className="k">{t("cart.title")}</span><h2>{t("cart.subtitle")}</h2></div>
          </div>
          <div className="cart-page-grid">
            <CartList />
            <CartSummary />
          </div>
        </div>
      </section>
    </StoreShell>
  );
}

function CartList() {
  const cart = useCart();
  const { format } = useCurrency();
  const { t, lang } = useLang();
  if (cart.items.length === 0) {
    return (
      <div className="cart-list-card">
        <div className="empty-cart">
          <div className="ec-icon">🛒</div>
          <h3>{t("cart.empty_title")}</h3>
          <p>{t("cart.empty_desc")}</p>
          <Link to="/" className="btn btn-primary">{t("home.browse_products")}</Link>
        </div>
      </div>
    );
  }
  return (
    <div className="cart-list-card">
      <div className="cart-list-head">
        <h2>{t("cart.list_head")} ({cart.count})</h2>
        <span className="clear-link" onClick={() => { if (confirm(t("cart.confirm_clear"))) cart.clear(); }}>{t("cart.clear")}</span>
      </div>
      {cart.items.map(it => {
        const isSnap = it.cartId.startsWith("snap-");
        return (
          <div key={it.cartId} className="cart-row">
            <div className="cr-thumb" style={{ background: it.bg }}>{it.icon}</div>
            <div className="cr-info">
              <div className="cr-name">{localizeResolvedName(it.name, lang)}</div>
              <div className="cr-unit">{t("cart.unit_price")}: <span>{format(it.price)}</span></div>
              {isSnap && it.usernames && it.usernames.length > 0 && (
                <div className="cr-users">
                  <span className="cr-users-label">{t("cart.users_label")}</span>{" "}
                  {it.usernames.map((u, i) => <span key={i} className="cr-user-chip">@{u}</span>)}
                </div>
              )}
              {isSnap && (
                <div className="cr-lock-hint">
                  {t("cart.add_snap_hint_a")} <Link to="/snapchat">{t("cart.add_snap_hint_b")}</Link>
                </div>
              )}
            </div>
            <div className="cr-qty">
              <button onClick={() => cart.changeQty(it.cartId, -1)}>−</button>
              <span>{it.qty}</span>
              <button disabled={isSnap} onClick={() => cart.changeQty(it.cartId, 1)}>+</button>
            </div>
            <div className="cr-price">{format(it.price * it.qty)}</div>
            <button className="cr-remove" onClick={() => cart.remove(it.cartId)}>✕</button>
          </div>
        );
      })}
    </div>
  );
}

function CartSummary() {
  const cart = useCart();
  const { format } = useCurrency();
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState<{ orderNumber: string; waUrl: string | null } | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const site = useSiteSettings();
  if (cart.items.length === 0 && !confirmed) return null;

  async function apply() {
    if (couponBusy) return;
    setCouponBusy(true);
    const r = await cart.applyCoupon(couponInput);
    setCouponMsg({ ok: r.ok, msg: r.message });
    setCouponBusy(false);
    if (r.ok) setCouponInput("");
  }

  async function checkout() {
    if (site.maintenance_mode) {
      const { toast } = await import("sonner");
      toast.error(site.maintenance_message || "الموقع تحت الصيانة حالياً");
      return;
    }
    const isWa = cart.contact.type === "whatsapp";
    if (!cart.contact.name.trim() || cart.contact.phone.trim().length < 3) {
      const { toast } = await import("sonner");
      toast.error(isWa ? "عبّي الاسم ورقم الواتساب قبل إتمام الطلب" : "عبّي الاسم ويوزر التيليجرام قبل إتمام الطلب");
      return;
    }
    setBusy(true);
    try {
      const submitted = await cart.submitOrder();
      if (!submitted?.order_number) {
        const { toast } = await import("sonner");
        toast.error(t("cart.checkout_saving"));
        return;
      }
      const orderNumber = submitted.order_number;
      const url = cart.buildWhatsAppUrl(orderNumber);
      cart.clear();
      setConfirmed({ orderNumber, waUrl: url });
    } finally {
      setBusy(false);
    }
  }

  const isWa = cart.contact.type === "whatsapp";
  const disabled = busy || cart.items.length === 0 || !cart.contact.name.trim() || cart.contact.phone.trim().length < 3;

  return (
    <div className="summary-card">
      <style>{summaryCss}</style>
      <h3>{t("cart.summary")}</h3>

      {/* Contact block */}
      <div className="gx-contact-block">
        <div className="gx-cb-title">📞 معلومات التواصل <span className="gx-req">إلزامي</span></div>
        <input
          className="gx-cb-input"
          type="text"
          placeholder="الاسم الكامل"
          value={cart.contact.name}
          onChange={(e) => cart.setContact({ name: e.target.value })}
        />
        <div className="gx-cb-types">
          <label className={"gx-cb-type " + (cart.contact.type === "whatsapp" ? "on" : "")}>
            <input type="radio" name="ct" checked={cart.contact.type === "whatsapp"} onChange={() => { cart.setContact({ type: "whatsapp", phone: "" }); }} />
            <span>📱 واتساب</span>
          </label>
          <label className={"gx-cb-type " + (cart.contact.type === "telegram" ? "on" : "")}>
            <input type="radio" name="ct" checked={cart.contact.type === "telegram"} onChange={() => { cart.setContact({ type: "telegram", phone: "", countryCode: "" }); }} />
            <span>✈️ تيليجرام</span>
          </label>
        </div>
        {isWa ? (
          <div className="gx-cb-row" style={{ marginTop: 8 }}>
            <select
              className="gx-cb-select"
              value={cart.contact.countryCode || "+962"}
              onChange={(e) => cart.setContact({ countryCode: e.target.value })}
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code}>{c.flag} {c.code} {c.name}</option>
              ))}
            </select>
            <input
              className="gx-cb-input gx-cb-phone"
              type="tel"
              inputMode="numeric"
              placeholder="رقم الواتساب"
              value={cart.contact.phone}
              onChange={(e) => cart.setContact({ phone: e.target.value.replace(/[^\d]/g, "") })}
            />
          </div>
        ) : (
          <input
            className="gx-cb-input"
            type="text"
            placeholder="يوزر التيليجرام (بدون @)"
            value={cart.contact.phone}
            onChange={(e) => cart.setContact({ phone: e.target.value.replace(/^@+/, "").trim() })}
            style={{ marginTop: 8, direction: "ltr", textAlign: "left" }}
          />
        )}
      </div>

      {/* Coupon block */}
      <div className="gx-coupon-block">
        <div className="gx-cb-title">🏷️ كوبون خصم</div>
        {cart.coupon ? (
          <div className="gx-coupon-applied">
            <div>
              <div className="gx-coupon-code">{cart.coupon.code}</div>
              <div className="gx-coupon-note">خصم: -{format(cart.coupon.discount_jod)}</div>
            </div>
            <button type="button" className="gx-coupon-remove" onClick={() => { cart.removeCoupon(); setCouponMsg(null); }}>إزالة</button>
          </div>
        ) : (
          <>
            <div className="gx-cb-row">
              <input
                className="gx-cb-input"
                type="text"
                placeholder="أدخل كود الكوبون"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); apply(); } }}
              />
              <button type="button" className="btn btn-primary gx-coupon-apply" onClick={apply} disabled={couponBusy || !couponInput.trim()}>
                {couponBusy ? "..." : "تطبيق"}
              </button>
            </div>
            {couponMsg && (
              <div className={"gx-coupon-msg " + (couponMsg.ok ? "ok" : "err")}>{couponMsg.msg}</div>
            )}
          </>
        )}
      </div>

      <CoinsBlock />

      <div className="summary-line"><span>{t("cart.item_count")}</span><span>{cart.count}</span></div>
      <div className="summary-line"><span>المجموع الفرعي</span><span>{format(cart.subtotalJOD)}</span></div>
      {cart.coupon && (
        <div className="summary-line" style={{ color: "#00e5b0" }}>
          <span>خصم ({cart.coupon.code})</span>
          <span>-{format(cart.coupon.discount_jod)}</span>
        </div>
      )}
      {cart.coins && (
        <div className="summary-line" style={{ color: "#ffc400" }}>
          <span>GX Coins ({cart.coins.coins.toLocaleString("en-US")})</span>
          <span>-{format(cart.coins.discount_jod)}</span>
        </div>
      )}
      <div className="summary-total">
        <span className="lbl">{t("cart.total")}</span>
        <span className="val">{format(cart.totalJOD)}</span>
      </div>

      <div className="notes-field">
        <label>{t("cart.notes_label")}</label>
        <textarea placeholder={t("cart.notes_placeholder")} value={cart.notes} onChange={(e) => cart.setNotes(e.target.value)} />
        {cart.items.some(it => it.cartId.startsWith("snap-")) && (
          <div className="hint">{t("cart.notes_hint")}</div>
        )}
      </div>
      <button className="btn btn-green btn-block" disabled={disabled} onClick={checkout}>
        {busy ? t("cart.checkout_saving") : t("cart.checkout_wa")}
      </button>
      {confirmed && (
        <OrderConfirmedModal
          orderNumber={confirmed.orderNumber}
          waUrl={confirmed.waUrl}
          onClose={() => setConfirmed(null)}
        />
      )}
    </div>
  );
}

const summaryCss = `
.gx-contact-block, .gx-coupon-block{margin:14px 0;padding:14px;border:1px solid rgba(0,229,255,.18);border-radius:14px;background:linear-gradient(180deg,rgba(0,229,255,.05),rgba(0,229,255,.01))}
.gx-cb-title{font-weight:800;color:#e6f7ff;font-size:14px;margin-bottom:10px;display:flex;align-items:center;gap:8px}
.gx-req{font-size:10px;background:rgba(255,84,112,.15);color:#ff98a8;padding:2px 8px;border-radius:99px;font-weight:700;border:1px solid rgba(255,84,112,.35)}
.gx-cb-input, .gx-cb-select{width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:rgba(0,0,0,.35);color:#e6f7ff;font-family:inherit;font-size:14px;margin-bottom:8px;box-sizing:border-box}
.gx-cb-input:focus, .gx-cb-select:focus{outline:none;border-color:rgba(0,229,255,.55);box-shadow:0 0 0 3px rgba(0,229,255,.15)}
.gx-cb-row{display:flex;gap:8px;margin-bottom:8px}
.gx-cb-select{max-width:180px;flex:0 0 auto;margin-bottom:0}
.gx-cb-phone{flex:1;margin-bottom:0;direction:ltr;text-align:right}
.gx-cb-types{display:flex;gap:8px;margin-top:4px}
.gx-cb-type{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:9px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);cursor:pointer;font-size:13px;font-weight:700;color:#a3b6c9;transition:all .18s}
.gx-cb-type input{display:none}
.gx-cb-type.on{background:linear-gradient(135deg,rgba(0,229,255,.2),rgba(0,229,255,.06));color:#00e5ff;border-color:rgba(0,229,255,.5)}
.gx-coupon-apply{padding:10px 18px;white-space:nowrap;margin-bottom:0!important}
.gx-coupon-msg{margin-top:8px;font-size:12.5px;font-weight:700;padding:8px 10px;border-radius:8px}
.gx-coupon-msg.ok{background:rgba(0,229,176,.12);color:#00e5b0;border:1px solid rgba(0,229,176,.35)}
.gx-coupon-msg.err{background:rgba(255,84,112,.1);color:#ff98a8;border:1px solid rgba(255,84,112,.3)}
.gx-coupon-applied{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:10px;background:rgba(0,229,176,.1);border:1px dashed rgba(0,229,176,.4)}
.gx-coupon-code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:900;color:#00e5b0;letter-spacing:1px}
.gx-coupon-note{font-size:11px;color:#7fe5c8;margin-top:2px}
.gx-coupon-remove{background:transparent;border:1px solid rgba(255,84,112,.4);color:#ff98a8;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer}
.gx-coupon-remove:hover{background:rgba(255,84,112,.1)}
.gx-coins-max{margin-top:6px;background:transparent;border:1px dashed rgba(255,196,0,.4);color:#ffc400;padding:7px 12px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;width:100%}
@media (max-width:600px){ .gx-cb-select{max-width:150px} }
`;

function CoinsBlock() {
  const cart = useCart();
  const { format } = useCurrency();
  const [balance, setBalance] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) return;
      const { data } = await supabase.from("profiles").select("gx_coins").eq("id", uid).maybeSingle();
      if (alive) setBalance(Number(data?.gx_coins ?? 0));
    })();
    return () => { alive = false; };
  }, []);

  if (balance === null) return null;

  const maxByCart = jodToCoins(Math.max(0, cart.subtotalJOD - (cart.coupon?.discount_jod ?? 0)));
  const usable = Math.min(balance, maxByCart);

  async function apply(v: number) {
    if (busy) return;
    setBusy(true);
    const r = await cart.applyCoins(v);
    setMsg({ ok: r.ok, msg: r.message });
    setBusy(false);
  }

  return (
    <div className="gx-coupon-block">
      <div className="gx-cb-title">
        🪙 GX Coins
        <span style={{ marginInlineStart: "auto", fontSize: 12, color: "#ffc400" }}>
          {balance.toLocaleString("en-US")} ≈ {format(coinsToJod(balance))}
        </span>
      </div>
      {cart.coins ? (
        <div className="gx-coupon-applied">
          <div>
            <div className="gx-coupon-code">{cart.coins.coins.toLocaleString("en-US")} Coins</div>
            <div className="gx-coupon-note">خصم: -{format(cart.coins.discount_jod)}</div>
          </div>
          <button type="button" className="gx-coupon-remove" onClick={() => { cart.removeCoins(); setMsg(null); }}>إزالة</button>
        </div>
      ) : usable < 1 ? (
        <div className="gx-coupon-note" style={{ fontSize: 12 }}>
          اجمع عملات GX مع كل طلب مكتمل — كل 1000 عملة = 1 دينار خصم.
        </div>
      ) : (
        <>
          <div className="gx-cb-row">
            <input
              className="gx-cb-input"
              type="number"
              min={1}
              max={usable}
              placeholder={`استخدم حتى ${usable.toLocaleString("en-US")} عملة`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button type="button" className="btn btn-primary gx-coupon-apply" disabled={busy || !amount}
              onClick={() => apply(Number(amount))}>
              {busy ? "..." : "استخدام"}
            </button>
          </div>
          <button type="button" className="gx-coins-max" onClick={() => { setAmount(String(usable)); apply(usable); }}>
            استخدم الحد الأقصى ({usable.toLocaleString("en-US")})
          </button>
          {msg && <div className={"gx-coupon-msg " + (msg.ok ? "ok" : "err")}>{msg.msg}</div>}
        </>
      )}
    </div>
  );
}
