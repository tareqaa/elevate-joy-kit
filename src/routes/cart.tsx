import { createFileRoute, Link } from "@tanstack/react-router";
import { StoreShell } from "@/components/gx/StoreShell";
import { useCart } from "@/lib/gx/cart";
import { useCurrency } from "@/lib/gx/currency";
import { useLang } from "@/lib/gx/i18n";
import { localizeResolvedName } from "@/lib/gx/product-locale";
import { useSiteSettings } from "@/lib/gx/site-settings";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { OrderConfirmedModal } from "@/components/gx/OrderConfirmedModal";
import { coinsToJod, jodToCoins, COINS_PER_JOD_REDEEM, MAX_COINS_DISCOUNT_RATIO } from "@/lib/gx/loyalty";
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

const COUNTRY_CODES: { code: string; flag: string; name: string; en: string }[] = [
  { code: "+962", flag: "🇯🇴", name: "الأردن", en: "Jordan" },
  { code: "+966", flag: "🇸🇦", name: "السعودية", en: "Saudi Arabia" },
  { code: "+971", flag: "🇦🇪", name: "الإمارات", en: "UAE" },
  { code: "+965", flag: "🇰🇼", name: "الكويت", en: "Kuwait" },
  { code: "+974", flag: "🇶🇦", name: "قطر", en: "Qatar" },
  { code: "+973", flag: "🇧🇭", name: "البحرين", en: "Bahrain" },
  { code: "+968", flag: "🇴🇲", name: "عُمان", en: "Oman" },
  { code: "+20", flag: "🇪🇬", name: "مصر", en: "Egypt" },
  { code: "+970", flag: "🇵🇸", name: "فلسطين", en: "Palestine" },
  { code: "+961", flag: "🇱🇧", name: "لبنان", en: "Lebanon" },
  { code: "+963", flag: "🇸🇾", name: "سوريا", en: "Syria" },
  { code: "+964", flag: "🇮🇶", name: "العراق", en: "Iraq" },
  { code: "+967", flag: "🇾🇪", name: "اليمن", en: "Yemen" },
  { code: "+218", flag: "🇱🇾", name: "ليبيا", en: "Libya" },
  { code: "+216", flag: "🇹🇳", name: "تونس", en: "Tunisia" },
  { code: "+213", flag: "🇩🇿", name: "الجزائر", en: "Algeria" },
  { code: "+212", flag: "🇲🇦", name: "المغرب", en: "Morocco" },
  { code: "+90",  flag: "🇹🇷", name: "تركيا", en: "Turkey" },
  { code: "+1",   flag: "🇺🇸", name: "أمريكا/كندا", en: "USA/Canada" },
  { code: "+44",  flag: "🇬🇧", name: "بريطانيا", en: "UK" },
];

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="currentColor" aria-hidden focusable="false">
      <path d="M27.2 4.8A15.86 15.86 0 0 0 16 .1C7.2.1.1 7.2.1 16c0 2.82.74 5.57 2.15 8L0 32l8.19-2.14A15.9 15.9 0 0 0 16 31.9h.01c8.79 0 15.94-7.15 15.94-15.94 0-4.26-1.66-8.26-4.75-11.16zM16 29.22h-.01a13.2 13.2 0 0 1-6.73-1.85l-.48-.29-4.86 1.27 1.3-4.74-.31-.49a13.2 13.2 0 0 1-2.03-7.12C2.88 8.68 8.77 2.8 16 2.8c3.55 0 6.88 1.38 9.39 3.9A13.16 13.16 0 0 1 29.29 16c0 7.27-5.9 13.22-13.29 13.22zm7.24-9.9c-.4-.2-2.35-1.16-2.72-1.29-.36-.13-.63-.2-.9.2-.26.4-1.02 1.29-1.25 1.55-.23.27-.46.3-.86.1-.4-.2-1.68-.62-3.19-1.97-1.18-1.05-1.98-2.35-2.21-2.75-.23-.4-.02-.61.18-.81.18-.18.4-.46.6-.7.2-.23.26-.4.4-.66.13-.27.07-.5-.03-.7-.1-.2-.9-2.17-1.24-2.97-.32-.77-.66-.67-.9-.68-.23-.01-.5-.01-.76-.01-.27 0-.7.1-1.07.5-.36.4-1.4 1.36-1.4 3.33 0 1.96 1.43 3.86 1.63 4.13.2.27 2.83 4.32 6.85 6.05.96.41 1.7.66 2.28.85.96.3 1.83.26 2.52.16.77-.12 2.36-.96 2.7-1.9.33-.93.33-1.73.23-1.9-.1-.16-.36-.26-.76-.46z" />
    </svg>
  );
}

function TelegramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16l-1.86 8.77c-.14.62-.51.77-1.03.48l-2.85-2.1-1.37 1.32c-.15.15-.28.28-.58.28l.2-2.94 5.36-4.84c.23-.2-.05-.32-.36-.12l-6.62 4.17-2.85-.89c-.62-.19-.63-.62.13-.92l11.14-4.3c.52-.19.97.12.8.91z" />
    </svg>
  );
}

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
            <div className="cr-qty" aria-label={t("cart.qty")}>
              <button aria-label="−" onClick={() => cart.changeQty(it.cartId, -1)}>−</button>
              <span>{it.qty}</span>
              <button aria-label="+" disabled={isSnap} onClick={() => cart.changeQty(it.cartId, 1)}>+</button>
            </div>
            <div className="cr-price">{format(it.price * it.qty)}</div>
            <button className="cr-remove" title={t("cart.remove_item")} aria-label={t("cart.remove_item")} onClick={() => cart.remove(it.cartId)}>✕</button>
          </div>
        );
      })}
    </div>
  );
}

function CartSummary() {
  const cart = useCart();
  const { format } = useCurrency();
  const { t, lang } = useLang();
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
      toast.error(isWa ? t("cart.fill_wa") : t("cart.fill_tg"));
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
        <div className="gx-cb-title">
          <span className="gx-step">1</span> {t("cart.contact_title")} <span className="gx-req">{t("cart.required")}</span>
        </div>
        <div className="gx-help" style={{ marginTop: -4 }}>{t("cart.contact_help")}</div>
        <input
          className="gx-cb-input"
          type="text"
          autoComplete="name"
          placeholder={t("cart.name_ph")}
          value={cart.contact.name}
          onChange={(e) => cart.setContact({ name: e.target.value })}
        />
        <div className="gx-cb-types">
          <label className={"gx-cb-type wa " + (cart.contact.type === "whatsapp" ? "on" : "")}>
            <input type="radio" name="ct" checked={cart.contact.type === "whatsapp"} onChange={() => { cart.setContact({ type: "whatsapp", phone: "" }); }} />
            <WhatsAppIcon /><span>{t("cart.whatsapp")}</span>
          </label>
          <label className={"gx-cb-type tg " + (cart.contact.type === "telegram" ? "on" : "")}>
            <input type="radio" name="ct" checked={cart.contact.type === "telegram"} onChange={() => { cart.setContact({ type: "telegram", phone: "", countryCode: "" }); }} />
            <TelegramIcon /><span>{t("cart.telegram")}</span>
          </label>
        </div>
        {isWa ? (
          <div className="gx-cb-row" style={{ marginTop: 8 }}>
            <select
              className="gx-cb-select"
              aria-label={t("cart.wa_ph")}
              value={cart.contact.countryCode || "+962"}
              onChange={(e) => cart.setContact({ countryCode: e.target.value })}
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code}>{c.flag} {c.code} {lang === "en" ? c.en : c.name}</option>
              ))}
            </select>
            <input
              className="gx-cb-input gx-cb-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder={t("cart.wa_ph")}
              value={cart.contact.phone}
              onChange={(e) => cart.setContact({ phone: e.target.value.replace(/[^\d]/g, "") })}
            />
          </div>
        ) : (
          <input
            className="gx-cb-input"
            type="text"
            placeholder={t("cart.tg_ph")}
            value={cart.contact.phone}
            onChange={(e) => cart.setContact({ phone: e.target.value.replace(/^@+/, "").trim() })}
            style={{ marginTop: 8, direction: "ltr", textAlign: "left" }}
          />
        )}
      </div>

      {/* Coupon block */}
      <div className="gx-coupon-block">
        <div className="gx-cb-title"><span className="gx-step">2</span> {t("cart.coupon_title")}</div>
        {cart.coupon ? (
          <div className="gx-coupon-applied">
            <div>
              <div className="gx-coupon-code">{cart.coupon.code}</div>
              <div className="gx-coupon-note">{t("cart.discount")}: -{format(cart.coupon.discount_jod)}</div>
            </div>
            <button type="button" className="gx-coupon-remove" onClick={() => { cart.removeCoupon(); setCouponMsg(null); }}>{t("cart.remove")}</button>
          </div>
        ) : (
          <>
            <div className="gx-cb-row">
              <input
                className="gx-cb-input"
                type="text"
                placeholder={t("cart.coupon_ph")}
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); apply(); } }}
              />
              <button type="button" className="btn btn-primary gx-coupon-apply" onClick={apply} disabled={couponBusy || !couponInput.trim()}>
                {couponBusy ? "..." : t("cart.apply")}
              </button>
            </div>
            {couponMsg && (
              <div className={"gx-coupon-msg " + (couponMsg.ok ? "ok" : "err")}>{couponMsg.msg}</div>
            )}
          </>
        )}
      </div>

      <CreditBlock />
      <CoinsBlock />

      <div className="summary-line"><span>{t("cart.item_count")}</span><span>{cart.count}</span></div>
      <div className="summary-line"><span>{t("cart.subtotal")}</span><span>{format(cart.subtotalJOD)}</span></div>
      {cart.coupon && (
        <div className="summary-line" style={{ color: "#00e5b0" }}>
          <span>{t("cart.discount")} ({cart.coupon.code})</span>
          <span>-{format(cart.coupon.discount_jod)}</span>
        </div>
      )}
      {cart.coins && (
        <div className="summary-line" style={{ color: "#ffc400" }}>
          <span>GX Coins ({cart.coins.coins.toLocaleString("en-US")})</span>
          <span>-{format(cart.coins.discount_jod)}</span>
        </div>
      )}
      {cart.creditJOD > 0 && (
        <div className="summary-line" style={{ color: "#8ab4ff" }}>
          <span>{t("cart.store_credit")}</span>
          <span>-{format(cart.creditJOD)}</span>
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
      <button className="btn btn-green btn-block gx-checkout-btn" disabled={disabled} onClick={checkout}>
        {busy ? t("cart.checkout_saving") : <><WhatsAppIcon size={17} /> {t("cart.checkout_wa")} · {format(cart.totalJOD)}</>}
      </button>
      <div className="gx-secure-note">🔒 {t("cart.secure_note")}</div>
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
.gx-bal-pill{margin-inline-start:auto;font-size:12px;font-weight:800;padding:3px 10px;border-radius:99px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)}
.gx-help{font-size:11.5px;color:#93a4b8;line-height:1.7;margin:2px 0 10px}
.gx-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
.gx-chip{padding:6px 12px;border-radius:99px;font-size:12px;font-weight:800;cursor:pointer;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);color:#cfe0ee}
.gx-chip:hover{border-color:rgba(0,229,255,.5);color:#00e5ff}
.gx-meter{height:6px;border-radius:99px;background:rgba(255,255,255,.07);overflow:hidden;margin:8px 0 4px}
.gx-meter > i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#ffc400,#ff8a00)}
.gx-cb-type svg{flex:0 0 auto}
.gx-cb-type.wa.on{background:linear-gradient(135deg,rgba(37,211,102,.22),rgba(37,211,102,.06));color:#25d366;border-color:rgba(37,211,102,.5)}
.gx-cb-type.tg.on{background:linear-gradient(135deg,rgba(41,171,226,.22),rgba(41,171,226,.06));color:#29abe2;border-color:rgba(41,171,226,.5)}
.gx-cb-type:hover{border-color:rgba(255,255,255,.28);color:#e6f7ff}
.gx-step{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:rgba(0,229,255,.15);border:1px solid rgba(0,229,255,.4);color:#00e5ff;font-size:11px;font-weight:900}
.gx-checkout-btn{display:flex;align-items:center;justify-content:center;gap:8px}
.gx-secure-note{margin-top:10px;text-align:center;font-size:11.5px;color:#93a4b8;line-height:1.6}
@media (max-width:600px){ .gx-cb-select{max-width:150px} }
`;

function CoinsBlock() {
  const cart = useCart();
  const { format } = useCurrency();
  const { t } = useLang();
  const [balance, setBalance] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) return;
      const { data } = await supabase.from("profiles").select("gx_coins").eq("id", uid).maybeSingle();
      if (alive) setBalance(Number(data?.gx_coins ?? 0));
    };
    void load();
    const on = () => void load();
    window.addEventListener("gx:balances-updated", on);
    return () => { alive = false; window.removeEventListener("gx:balances-updated", on); };
  }, []);

  if (balance === null) return null;

  const payable = Math.max(0, cart.subtotalJOD - (cart.coupon?.discount_jod ?? 0));
  // GX Coins can cover at most 50% of the order value.
  const capJod = Math.round(payable * MAX_COINS_DISCOUNT_RATIO * 100) / 100;
  const usable = Math.min(balance, jodToCoins(capJod));

  async function apply(v: number) {
    if (busy) return;
    setBusy(true);
    const r = await cart.applyCoins(v);
    setMsg({ ok: r.ok, msg: r.message });
    setBusy(false);
  }

  const pct = balance > 0 ? Math.min(100, Math.round((usable / balance) * 100)) : 0;

  return (
    <div className="gx-coupon-block">
      <div className="gx-cb-title">
        🪙 GX Coins
        <span className="gx-bal-pill" style={{ color: "#ffc400" }}>
          {balance.toLocaleString("en-US")} ≈ {format(coinsToJod(balance))}
        </span>
      </div>
      <div className="gx-help">
        {t("cart.coins_help_a")} <b>{COINS_PER_JOD_REDEEM.toLocaleString("en-US")}</b> {t("cart.coins_help_b")} <b>{format(capJod)}</b>.
      </div>
      {cart.coins ? (
        <div className="gx-coupon-applied">
          <div>
            <div className="gx-coupon-code">{cart.coins.coins.toLocaleString("en-US")} Coins</div>
            <div className="gx-coupon-note">{t("cart.discount")}: -{format(cart.coins.discount_jod)}</div>
          </div>
          <button type="button" className="gx-coupon-remove" onClick={() => { cart.removeCoins(); setMsg(null); }}>{t("cart.remove")}</button>
        </div>
      ) : usable < 1 ? (
        <div className="gx-coupon-note" style={{ fontSize: 12 }}>
          {balance < 1 ? t("cart.coins_earn") : t("cart.coins_low")}
        </div>
      ) : (
        <>
          <div className="gx-meter"><i style={{ width: `${pct}%` }} /></div>
          <div className="gx-help" style={{ margin: "0 0 8px" }}>
            {t("cart.coins_available")}: <b style={{ color: "#ffc400" }}>{usable.toLocaleString("en-US")}</b> {t("cart.coins_unit")} ({format(coinsToJod(usable))})
          </div>
          <div className="gx-chips">
            {[0.25, 0.5, 1].map((f) => {
              const v = Math.max(1, Math.floor(usable * f));
              return (
                <button key={f} type="button" className="gx-chip"
                  onClick={() => { setAmount(String(v)); apply(v); }}>
                  {f === 1 ? t("cart.max") : `${Math.round(f * 100)}%`} · {v.toLocaleString("en-US")}
                </button>
              );
            })}
          </div>
          <div className="gx-cb-row">
            <input
              className="gx-cb-input"
              type="number"
              min={1}
              max={usable}
              placeholder={`${t("cart.use_up_to")} ${usable.toLocaleString("en-US")} ${t("cart.coins_unit")}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button type="button" className="btn btn-primary gx-coupon-apply" disabled={busy || !amount}
              onClick={() => apply(Number(amount))}>
              {busy ? "..." : t("cart.use")}
            </button>
          </div>
          {msg && <div className={"gx-coupon-msg " + (msg.ok ? "ok" : "err")}>{msg.msg}</div>}
        </>
      )}
    </div>
  );
}

function CreditBlock() {
  const cart = useCart();
  const { format } = useCurrency();
  const { t } = useLang();
  const [balance, setBalance] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) return;
      const { data } = await supabase.from("profiles").select("store_credit_jod").eq("id", uid).maybeSingle();
      if (alive) setBalance(Number(data?.store_credit_jod ?? 0));
    };
    void load();
    const on = () => void load();
    window.addEventListener("gx:balances-updated", on);
    return () => { alive = false; window.removeEventListener("gx:balances-updated", on); };
  }, []);

  if (balance === null || balance <= 0) return null;

  const payable = Math.max(0, cart.subtotalJOD - (cart.coupon?.discount_jod ?? 0) - (cart.coins?.discount_jod ?? 0));
  const usable = Math.round(Math.min(balance, payable) * 100) / 100;

  async function apply(v: number) {
    if (busy) return;
    setBusy(true);
    const r = await cart.applyCredit(v);
    setMsg({ ok: r.ok, msg: r.message });
    setBusy(false);
  }

  return (
    <div className="gx-coupon-block">
      <div className="gx-cb-title">
        💳 {t("cart.credit_title")}
        <span className="gx-bal-pill" style={{ color: "#8ab4ff" }}>{format(balance)}</span>
      </div>
      <div className="gx-help">{t("cart.credit_help")}</div>
      {cart.creditJOD > 0 ? (
        <div className="gx-coupon-applied" style={{ background: "rgba(138,180,255,.1)", borderColor: "rgba(138,180,255,.4)" }}>
          <div>
            <div className="gx-coupon-code" style={{ color: "#8ab4ff" }}>{format(cart.creditJOD)}</div>
            <div className="gx-coupon-note" style={{ color: "#a9c4f0" }}>{t("cart.credit_applied")}</div>
          </div>
          <button type="button" className="gx-coupon-remove" onClick={() => { cart.removeCredit(); setMsg(null); }}>{t("cart.remove")}</button>
        </div>
      ) : (
        <>
          <div className="gx-cb-row">
            <input
              className="gx-cb-input"
              type="number"
              min={0.01}
              step={0.01}
              max={usable}
              placeholder={`${t("cart.use_up_to")} ${format(usable)}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button type="button" className="btn btn-primary gx-coupon-apply" disabled={busy || !amount}
              onClick={() => apply(Number(amount))}>
              {busy ? "..." : t("cart.use")}
            </button>
          </div>
          <button type="button" className="gx-coins-max" style={{ borderColor: "rgba(138,180,255,.4)", color: "#8ab4ff" }}
            onClick={() => { setAmount(usable.toFixed(2)); apply(usable); }}>
            {t("cart.credit_use_all")} ({format(usable)})
          </button>
          {msg && <div className={"gx-coupon-msg " + (msg.ok ? "ok" : "err")}>{msg.msg}</div>}
        </>
      )}
    </div>
  );
}

