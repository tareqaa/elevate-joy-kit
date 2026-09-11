import { createFileRoute, Link } from "@tanstack/react-router";
import { StoreShell } from "@/components/gx/StoreShell";
import { useCart } from "@/lib/gx/cart";
import { useCurrency } from "@/lib/gx/currency";
import { useLang } from "@/lib/gx/i18n";
import { CartItemThumb } from "@/components/gx/CartThumb";
import { localizeResolvedName } from "@/lib/gx/product-locale";
import { useSiteSettings } from "@/lib/gx/site-settings";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { OrderConfirmedModal } from "@/components/gx/OrderConfirmedModal";
import { coinsToJod, jodToCoins, MAX_COINS_DISCOUNT_RATIO } from "@/lib/gx/loyalty";
import { supabase } from "@/integrations/supabase/client";
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

function TrashIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function CartPage() {
  const { t } = useLang();
  const cart = useCart();
  const [stage, setStage] = useState<1 | 2>(1);
  const [confirmed, setConfirmed] = useState<{
    orderNumber: string;
    waUrl: string | null;
    paymentMethod?: "cliq" | "card" | "gx_wallet";
  } | null>(null);

  const isJordan = (cart.contact.countryCode || "+962") === "+962";
  const [paymentMethod, setPaymentMethod] = useState<"cliq" | "card">(isJordan ? "cliq" : "card");

  useEffect(() => {
    if (!isJordan && paymentMethod === "cliq") {
      setPaymentMethod("card");
    }
  }, [isJordan, paymentMethod]);

  return (
    <StoreShell>
      <section className="section gx-checkout-section">
        <style>{checkoutCss}</style>
        <div className="wrap">
          {cart.items.length === 0 ? (
            <CartList />
          ) : stage === 1 ? (
            <div className="gx-eneba-grid">
              {/* Right column in RTL: Cart Items */}
              <div className="gx-eneba-main">
                <CartList />
              </div>

              {/* Left column in RTL: Delivery & Summary */}
              <div className="gx-eneba-side">
                <CartDeliveryCard />
                <CartSummaryStage1
                  onContinue={() => {
                    setStage(2);
                    window.scrollTo({ top: 80, behavior: "smooth" });
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="gx-eneba-grid">
              {/* Right column in RTL: Payment Methods */}
              <div className="gx-eneba-main">
                <CartPaymentStage2
                  paymentMethod={paymentMethod}
                  setPaymentMethod={setPaymentMethod}
                  isJordan={isJordan}
                  onBack={() => {
                    setStage(1);
                    window.scrollTo({ top: 80, behavior: "smooth" });
                  }}
                />
              </div>

              {/* Left column in RTL: Order Recap */}
              <div className="gx-eneba-side">
                <CartOrderRecapStage2
                  paymentMethod={paymentMethod}
                  onEditEmail={() => {
                    setStage(1);
                    window.scrollTo({ top: 80, behavior: "smooth" });
                  }}
                  onConfirmed={(data) => setConfirmed(data)}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {confirmed && (
        <OrderConfirmedModal
          orderNumber={confirmed.orderNumber}
          waUrl={confirmed.waUrl}
          paymentMethod={confirmed.paymentMethod}
          onClose={() => {
            setConfirmed(null);
            setStage(1);
          }}
        />
      )}
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
    <div className="cart-list-card gx-eneba-cart-card">
      <div className="cart-list-head">
        <h2>{t("cart.shopping_cart")} ({cart.count})</h2>
        <span
          className="clear-link"
          onClick={() => { if (confirm(t("cart.confirm_clear"))) cart.clear(); }}
        >
          {t("cart.clear")}
        </span>
      </div>

      {cart.items.map((it) => {
        const isSnap = it.cartId.startsWith("snap-");
        return (
          <div key={it.cartId} className="cart-row gx-eneba-row">
            <CartItemThumb item={it} size={70} />

            <div className="cr-info">
              <div className="cr-name">{localizeResolvedName(it.name, lang)}</div>
              <div className="cr-unit">
                {t("cart.unit_price")}: <span>{format(it.price)}</span>
              </div>

              {isSnap && it.usernames && it.usernames.length > 0 && (
                <div className="cr-users">
                  <span className="cr-users-label">{t("cart.users_label")}</span>{" "}
                  {it.usernames.map((u, i) => (
                    <span key={i} className="cr-user-chip">@{u}</span>
                  ))}
                </div>
              )}

              {isSnap && (
                <div className="cr-lock-hint">
                  {t("cart.add_snap_hint_a")}{" "}
                  <Link to="/snapchat">{t("cart.add_snap_hint_b")}</Link>
                </div>
              )}
            </div>

            <div className="cr-qty" aria-label={t("cart.qty")}>
              <button aria-label="−" onClick={() => cart.changeQty(it.cartId, -1)}>−</button>
              <span>{it.qty}</span>
              <button aria-label="+" disabled={isSnap} onClick={() => cart.changeQty(it.cartId, 1)}>+</button>
            </div>

            <div className="cr-price">{format(it.price * it.qty)}</div>

            <button
              className="gx-row-trash"
              title={t("cart.remove_item")}
              aria-label={t("cart.remove_item")}
              onClick={() => cart.remove(it.cartId)}
            >
              <TrashIcon size={18} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/** Card 1: "أين تريد تسليم الطلب؟" - Hidden completely if user is signed in */
function CartDeliveryCard() {
  const cart = useCart();
  const { t } = useLang();
  const [signedInUser, setSignedInUser] = useState<{ id: string; email: string } | null>(null);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        const uEmail = data.session.user.email || "";
        setSignedInUser({ id: data.session.user.id, email: uEmail });
        if (!cart.contact.email && uEmail) {
          cart.setContact({ email: uEmail });
        }
      }
    });
  }, [cart]);

  // If user is signed in, completely omit this card
  if (signedInUser) {
    return null;
  }

  return (
    <div className="gx-delivery-card">
      <div className="gx-dc-title">
        <span>✉️</span>
        <h3>{t("cart.email_label")}</h3>
      </div>

      <div className="gx-email-box">
        <input
          className="gx-cb-input"
          type="email"
          autoComplete="email"
          placeholder={t("cart.email_ph")}
          value={cart.contact.email || ""}
          onChange={(e) => cart.setContact({ email: e.target.value })}
          style={{ direction: "ltr", textAlign: "left" }}
        />

        <label className="gx-remember-row">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <span>{t("cart.remember_me")}</span>
        </label>
      </div>
    </div>
  );
}

/** Card 2: "الملخص" (Summary Stage 1) */
function CartSummaryStage1({ onContinue }: { onContinue: () => void }) {
  const cart = useCart();
  const { format } = useCurrency();
  const { t } = useLang();
  const [couponOpen, setCouponOpen] = useState(!!cart.coupon);
  const [couponInput, setCouponInput] = useState("");
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);

  async function applyCoupon() {
    if (couponBusy) return;
    setCouponBusy(true);
    const r = await cart.applyCoupon(couponInput);
    setCouponMsg({ ok: r.ok, msg: r.message });
    setCouponBusy(false);
    if (r.ok) setCouponInput("");
  }

  async function handleAdvance() {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id;
    if (!uid) {
      const email = (cart.contact.email || "").trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        const { toast } = await import("sonner");
        toast.error(t("cart.fill_email"));
        return;
      }
    }
    onContinue();
  }

  return (
    <div className="summary-card gx-eneba-summary-card">
      <h3 className="gx-summary-title">{t("cart.summary_box")}</h3>

      {/* Prominent Action Button at TOP */}
      <button className="btn btn-primary btn-block gx-eneba-cta" onClick={handleAdvance}>
        {t("cart.continue_to_payment")} ←
      </button>

      {/* Breakdown Lines */}
      <div className="gx-summary-lines" style={{ marginTop: 16 }}>
        <div className="summary-line">
          <span>{t("cart.item_count")}</span>
          <span>{cart.count}</span>
        </div>
        <div className="summary-line">
          <span>{t("cart.subtotal")}</span>
          <span>{format(cart.subtotalJOD)}</span>
        </div>
        {cart.coupon && (
          <div className="summary-line" style={{ color: "#00e5b0" }}>
            <span>{t("cart.discount")} ({cart.coupon.code})</span>
            <span>-{format(cart.coupon.discount_jod)}</span>
          </div>
        )}
        {cart.coins && (
          <div className="summary-line" style={{ color: "#fbbf24" }}>
            <span>GX Coins ({cart.coins.coins.toLocaleString("en-US")})</span>
            <span>-{format(cart.coins.discount_jod)}</span>
          </div>
        )}
        {cart.creditJOD > 0 && (
          <div className="summary-line" style={{ color: "#38bdf8" }}>
            <span>{t("cart.store_credit")}</span>
            <span>-{format(cart.creditJOD)}</span>
          </div>
        )}
        <div className="summary-total">
          <span className="lbl">{t("cart.total")}</span>
          <span className="val">{format(cart.totalJOD)}</span>
        </div>
      </div>

      {/* Accordion: "هل لديك كود خصم؟" */}
      <div className="gx-coupon-accordion">
        <button
          type="button"
          className="gx-ca-toggle"
          onClick={() => setCouponOpen(!couponOpen)}
        >
          <span>🏷️ {t("cart.have_coupon")}</span>
          <span>{couponOpen ? "▲" : "▼"}</span>
        </button>

        {couponOpen && (
          <div className="gx-ca-content">
            {cart.coupon ? (
              <div className="gx-coupon-applied">
                <div>
                  <div className="gx-coupon-code">{cart.coupon.code}</div>
                  <div className="gx-coupon-note">
                    {t("cart.discount")}: -{format(cart.coupon.discount_jod)}
                  </div>
                </div>
                <button
                  type="button"
                  className="gx-coupon-remove"
                  onClick={() => { cart.removeCoupon(); setCouponMsg(null); }}
                >
                  {t("cart.remove")}
                </button>
              </div>
            ) : (
              <>
                <div className="gx-cb-row" style={{ marginTop: 8 }}>
                  <input
                    className="gx-cb-input"
                    type="text"
                    placeholder={t("cart.coupon_ph")}
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyCoupon(); } }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary gx-coupon-apply"
                    onClick={applyCoupon}
                    disabled={couponBusy || !couponInput.trim()}
                  >
                    {couponBusy ? "..." : t("cart.apply")}
                  </button>
                </div>
                {couponMsg && (
                  <div className={"gx-coupon-msg " + (couponMsg.ok ? "ok" : "err")}>
                    {couponMsg.msg}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <CreditBlock />
      <CoinsBlock />
    </div>
  );
}

/** Stage 2: Payment Methods Page */
function CartPaymentStage2({
  paymentMethod,
  setPaymentMethod,
  isJordan,
  onBack,
}: {
  paymentMethod: "cliq" | "card";
  setPaymentMethod: (m: "cliq" | "card") => void;
  isJordan: boolean;
  onBack: () => void;
}) {
  const { t } = useLang();

  return (
    <div className="cart-list-card gx-eneba-payment-card">
      <div className="cart-list-head" style={{ alignItems: "center" }}>
        <h2>{t("cart.payment_method_title")}</h2>
        <button type="button" className="gx-back-link" onClick={onBack}>
          ← {t("cart.shopping_cart")}
        </button>
      </div>

      <div className="gx-payment-list">
        {/* CliQ Option - Jordan ONLY (Clean official logo badge, no exposed raw alias) */}
        {isJordan && (
          <div
            className={"gx-payment-card-eneba " + (paymentMethod === "cliq" ? "active" : "")}
            onClick={() => setPaymentMethod("cliq")}
          >
            <div className="gx-pc-radio">
              <span className="gx-pc-dot" />
            </div>

            <div className="gx-pc-body">
              <div className="gx-pc-title">{t("cart.method_cliq")}</div>
              <div className="gx-pc-sub">{t("cart.method_cliq_desc")}</div>
            </div>

            {/* Official CliQ Logo Badge */}
            <div className="gx-pc-logo-badge cliq">
              <img src="/app/assets/img/cliq-logo.png" alt="CliQ" />
            </div>
          </div>
        )}

        {/* Visa / Mastercard Option - Jordan & International */}
        <div
          className={"gx-payment-card-eneba " + (paymentMethod === "card" ? "active" : "")}
          onClick={() => setPaymentMethod("card")}
        >
          <div className="gx-pc-radio">
            <span className="gx-pc-dot" />
          </div>

          <div className="gx-pc-body">
            <div className="gx-pc-title">{t("cart.method_card")}</div>
            <div className="gx-pc-sub">{t("cart.method_card_desc")}</div>
          </div>

          {/* Visa / Mastercard Logo Badge */}
          <div className="gx-pc-logo-badge card">
            <img src="/app/assets/img/cards-logo.svg" alt="Visa / Mastercard" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Stage 2 Left Column: Order Recap & Complete Payment */
function CartOrderRecapStage2({
  paymentMethod,
  onEditEmail,
  onConfirmed,
}: {
  paymentMethod: "cliq" | "card";
  onEditEmail: () => void;
  onConfirmed: (data: { orderNumber: string; waUrl: string | null; paymentMethod?: "cliq" | "card" }) => void;
}) {
  const cart = useCart();
  const { format } = useCurrency();
  const { t, lang } = useLang();
  const [busy, setBusy] = useState(false);
  const site = useSiteSettings();

  async function handleCheckout() {
    if (site.maintenance_mode) {
      const { toast } = await import("sonner");
      toast.error(site.maintenance_message || "الموقع تحت الصيانة حالياً");
      return;
    }
    setBusy(true);
    try {
      const submitted = await cart.submitOrder(paymentMethod);
      if (!submitted?.order_number) {
        const { toast } = await import("sonner");
        toast.error(t("cart.checkout_saving"));
        return;
      }
      const orderNumber = submitted.order_number;
      const url = cart.buildWhatsAppUrl(orderNumber, paymentMethod);
      cart.clear();
      onConfirmed({ orderNumber, waUrl: url, paymentMethod });
    } catch (e) {
      const { toast } = await import("sonner");
      const msg = e instanceof Error ? e.message : String(e ?? "");
      toast.error(msg || t("cart.checkout_saving"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="summary-card gx-eneba-summary-card">
      <h3 className="gx-summary-title">{t("cart.order_recap")}</h3>

      {/* Compact items list in recap */}
      <div className="gx-recap-items">
        {cart.items.map((it) => (
          <div key={it.cartId} className="gx-recap-line">
            <div className="gx-rl-thumb">
              <CartItemThumb item={it} size={36} />
            </div>
            <div className="gx-rl-name">
              <span>{localizeResolvedName(it.name, lang)}</span>
              <small>× {it.qty}</small>
            </div>
            <div className="gx-rl-price">{format(it.price * it.qty)}</div>
          </div>
        ))}
      </div>

      {/* Email recap with Edit button if entered */}
      {cart.contact.email && (
        <div className="gx-recap-email-box">
          <div className="gx-reb-left">
            <span className="gx-reb-lbl">{t("cart.email_label")}:</span>
            <span className="gx-reb-val" dir="ltr">{cart.contact.email}</span>
          </div>
          <button type="button" className="gx-reb-edit" onClick={onEditEmail}>
            {t("cart.edit")}
          </button>
        </div>
      )}

      {/* Order Notes */}
      <div className="notes-field" style={{ marginTop: 12 }}>
        <label>{t("cart.notes_label")}</label>
        <textarea
          placeholder={t("cart.notes_placeholder")}
          value={cart.notes}
          onChange={(e) => cart.setNotes(e.target.value)}
          rows={2}
        />
      </div>

      {/* Price breakdown */}
      <div className="gx-summary-lines" style={{ marginTop: 12 }}>
        <div className="summary-line">
          <span>{t("cart.subtotal")}</span>
          <span>{format(cart.subtotalJOD)}</span>
        </div>
        {cart.coupon && (
          <div className="summary-line" style={{ color: "#00e5b0" }}>
            <span>{t("cart.discount")} ({cart.coupon.code})</span>
            <span>-{format(cart.coupon.discount_jod)}</span>
          </div>
        )}
        {cart.coins && (
          <div className="summary-line" style={{ color: "#fbbf24" }}>
            <span>GX Coins ({cart.coins.coins.toLocaleString("en-US")})</span>
            <span>-{format(cart.coins.discount_jod)}</span>
          </div>
        )}
        {cart.creditJOD > 0 && (
          <div className="summary-line" style={{ color: "#38bdf8" }}>
            <span>{t("cart.store_credit")}</span>
            <span>-{format(cart.creditJOD)}</span>
          </div>
        )}
        <div className="summary-total">
          <span className="lbl">{t("cart.total")}</span>
          <span className="val">{format(cart.totalJOD)}</span>
        </div>
      </div>

      {/* Primary Action Button */}
      <button
        className="btn btn-green btn-block gx-checkout-btn"
        style={{ marginTop: 16 }}
        disabled={busy || cart.items.length === 0}
        onClick={handleCheckout}
      >
        {busy ? t("cart.checkout_saving") : t("cart.complete_payment") + " 💳"}
      </button>
    </div>
  );
}

/** Re-engineered, elegant GX Coins block */
function CoinsBlock() {
  const cart = useCart();
  const { format } = useCurrency();
  const { t, lang } = useLang();
  const isAr = lang !== "en";
  const [balance, setBalance] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
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

  if (balance === null || balance <= 0) return null;

  const payable = Math.max(0, cart.subtotalJOD - (cart.coupon?.discount_jod ?? 0));
  const capJod = Math.round(payable * MAX_COINS_DISCOUNT_RATIO * 100) / 100;
  const usable = Math.min(balance, jodToCoins(capJod));

  async function apply(v: number) {
    if (busy || v <= 0) return;
    setBusy(true);
    const r = await cart.applyCoins(v);
    setMsg({ ok: r.ok, msg: r.message });
    setBusy(false);
  }

  return (
    <div className="gx-balance-card coins">
      <div className="gx-bc-head">
        <div className="gx-bc-left">
          <span className="gx-bc-icon">🪙</span>
          <span className="gx-bc-title">GX Coins</span>
        </div>
        <div className="gx-bc-pill coins">
          {balance.toLocaleString("en-US")} ≈ {format(coinsToJod(balance))}
        </div>
      </div>

      {cart.coins ? (
        <div className="gx-bc-applied coins">
          <div className="gx-bca-info">
            <span className="gx-bca-val">{cart.coins.coins.toLocaleString("en-US")} Coins</span>
            <span className="gx-bca-sub">{t("cart.discount")}: -{format(cart.coins.discount_jod)}</span>
          </div>
          <button
            type="button"
            className="gx-bc-remove"
            onClick={() => { cart.removeCoins(); setMsg(null); }}
          >
            {t("cart.remove")}
          </button>
        </div>
      ) : usable < 1 ? (
        <div className="gx-bc-hint">
          {balance < 1 ? t("cart.coins_earn") : t("cart.coins_low")}
        </div>
      ) : (
        <div className="gx-bc-actions">
          <div className="gx-bc-hint">
            {isAr
              ? `يمكنك خصم حتى ${format(capJod)} باستخدام ${usable.toLocaleString("en-US")} عملة`
              : `Knock off up to ${format(capJod)} with ${usable.toLocaleString("en-US")} coins`}
          </div>

          {/* Quick Preset Segmented Buttons */}
          <div className="gx-bc-presets">
            {[
              { label: "25%", ratio: 0.25 },
              { label: "50%", ratio: 0.5 },
              { label: isAr ? `الحد الأقصى (${usable.toLocaleString("en-US")})` : `Max (${usable.toLocaleString("en-US")})`, ratio: 1 },
            ].map((p) => {
              const v = Math.max(1, Math.floor(usable * p.ratio));
              return (
                <button
                  key={p.ratio}
                  type="button"
                  className="gx-bc-preset-btn"
                  onClick={() => {
                    setAmount(String(v));
                    apply(v);
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Clean input row */}
          <div className="gx-bc-input-group">
            <input
              className="gx-bc-input"
              type="number"
              min={1}
              max={usable}
              placeholder={`${t("cart.use_up_to")} ${usable.toLocaleString("en-US")}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (amount) apply(Number(amount));
                }
              }}
            />
            <button
              type="button"
              className="gx-bc-apply-btn"
              disabled={busy || !amount || Number(amount) <= 0}
              onClick={() => apply(Number(amount))}
            >
              {busy ? "..." : t("cart.use")}
            </button>
          </div>

          {msg && <div className={"gx-coupon-msg " + (msg.ok ? "ok" : "err")}>{msg.msg}</div>}
        </div>
      )}
    </div>
  );
}

/** Re-engineered, elegant Store Credit block */
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
    if (busy || v <= 0) return;
    setBusy(true);
    const r = await cart.applyCredit(v);
    setMsg({ ok: r.ok, msg: r.message });
    setBusy(false);
  }

  return (
    <div className="gx-balance-card credit">
      <div className="gx-bc-head">
        <div className="gx-bc-left">
          <span className="gx-bc-icon">💳</span>
          <span className="gx-bc-title">{t("cart.store_credit")}</span>
        </div>
        <div className="gx-bc-pill credit">
          {format(balance)}
        </div>
      </div>

      {cart.creditJOD > 0 ? (
        <div className="gx-bc-applied credit">
          <div className="gx-bca-info">
            <span className="gx-bca-val">{format(cart.creditJOD)}</span>
            <span className="gx-bca-sub">{t("cart.credit_applied")}</span>
          </div>
          <button
            type="button"
            className="gx-bc-remove"
            onClick={() => { cart.removeCredit(); setMsg(null); }}
          >
            {t("cart.remove")}
          </button>
        </div>
      ) : usable > 0 ? (
        <div className="gx-bc-actions">
          <div className="gx-bc-input-group">
            <input
              className="gx-bc-input"
              type="number"
              min={0.01}
              step={0.01}
              max={usable}
              placeholder={`${t("cart.use_up_to")} ${format(usable)}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (amount) apply(Number(amount));
                }
              }}
            />
            <button
              type="button"
              className="gx-bc-max-btn"
              onClick={() => { setAmount(usable.toFixed(2)); apply(usable); }}
            >
              كامل الرصيد
            </button>
            <button
              type="button"
              className="gx-bc-apply-btn"
              disabled={busy || !amount || Number(amount) <= 0}
              onClick={() => apply(Number(amount))}
            >
              {busy ? "..." : t("cart.use")}
            </button>
          </div>
          {msg && <div className={"gx-coupon-msg " + (msg.ok ? "ok" : "err")}>{msg.msg}</div>}
        </div>
      ) : null}
    </div>
  );
}

const checkoutCss = `
/* 2-Column Grid (Main right, sidebar left in RTL) */
.gx-eneba-grid{display:grid;grid-template-columns:1fr 370px;gap:24px;align-items:start}
.gx-eneba-main{display:flex;flex-direction:column;gap:20px}
.gx-eneba-side{display:flex;flex-direction:column;gap:18px}

.gx-eneba-cart-card{border-radius:18px;border:1px solid rgba(0,229,255,.16);background:linear-gradient(180deg,rgba(18,22,34,.7),rgba(10,13,22,.85))}
.gx-eneba-row{position:relative;border-bottom:1px solid rgba(255,255,255,.06)!important;padding:16px 0!important}
.gx-row-trash{background:transparent;border:none;color:#64748b;cursor:pointer;padding:8px;border-radius:8px;display:flex;align-items:center;justify-content:center;transition:all .18s}
.gx-row-trash:hover{color:#ff5470;background:rgba(255,84,112,.1)}

/* Delivery Card (Where to deliver) */
.gx-delivery-card{border-radius:18px;padding:18px;border:1px solid rgba(0,229,255,.16);background:linear-gradient(180deg,rgba(18,22,34,.7),rgba(10,13,22,.85))}
.gx-dc-title{display:flex;align-items:center;gap:8px;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,.06)}
.gx-dc-title h3{margin:0;font-size:15px;font-weight:900;color:#f1f5f9}
.gx-remember-row{display:flex;align-items:center;gap:8px;font-size:12.5px;color:#cbd5e1;cursor:pointer;margin-top:8px}
.gx-remember-row input{width:16px;height:16px;accent-color:#00e5ff;cursor:pointer}

/* Summary Card */
.gx-eneba-summary-card{border-radius:18px;padding:18px;border:1px solid rgba(0,229,255,.16);background:linear-gradient(180deg,rgba(18,22,34,.7),rgba(10,13,22,.85))}
.gx-summary-title{margin:0 0 14px;font-size:16px;font-weight:900;color:#f1f5f9}
.gx-eneba-cta{background:linear-gradient(135deg,#00e5ff,#00b4d8)!important;color:#020b14!important;font-weight:900!important;font-size:15.5px!important;padding:13px!important;border-radius:12px!important;box-shadow:0 8px 24px -4px rgba(0,229,255,.5)!important}
.gx-eneba-cta:hover{transform:translateY(-1px);box-shadow:0 10px 28px -4px rgba(0,229,255,.65)!important}

/* Coupon Accordion */
.gx-coupon-accordion{margin-top:16px;border-top:1px solid rgba(255,255,255,.06);padding-top:12px}
.gx-ca-toggle{width:100%;display:flex;align-items:center;justify-content:space-between;background:none;border:none;color:#cbd5e1;font-size:13px;font-weight:800;cursor:pointer;padding:6px 0}
.gx-ca-toggle:hover{color:#00e5ff}

/* Balance & Loyalty Cards (Store Credit & GX Coins) */
.gx-balance-card{margin-top:14px;padding:14px 16px;border-radius:14px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.07);transition:all .2s ease}
.gx-balance-card.credit{background:linear-gradient(180deg,rgba(56,189,248,.04) 0%,rgba(14,20,35,.4) 100%);border-color:rgba(56,189,248,.2)}
.gx-balance-card.coins{background:linear-gradient(180deg,rgba(245,158,11,.04) 0%,rgba(14,20,35,.4) 100%);border-color:rgba(245,158,11,.2)}
.gx-bc-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
.gx-bc-left{display:flex;align-items:center;gap:8px}
.gx-bc-icon{font-size:16px;line-height:1}
.gx-bc-title{font-size:13.5px;font-weight:800;color:#f1f5f9}
.gx-bc-pill{font-size:12px;font-weight:800;padding:3px 10px;border-radius:999px;border:1px solid transparent}
.gx-bc-pill.credit{background:rgba(56,189,248,.12);color:#38bdf8;border-color:rgba(56,189,248,.3)}
.gx-bc-pill.coins{background:rgba(245,158,11,.12);color:#fbbf24;border-color:rgba(245,158,11,.3)}
.gx-bc-actions{margin-top:10px}
.gx-bc-hint{font-size:11.5px;color:#94a3b8;margin:4px 0 10px;line-height:1.5}
.gx-bc-presets{display:flex;gap:6px;margin-bottom:10px}
.gx-bc-preset-btn{flex:1;padding:6px 8px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#cbd5e1;font-size:11.5px;font-weight:800;cursor:pointer;transition:all .18s;text-align:center}
.gx-bc-preset-btn:hover{background:rgba(245,158,11,.15);border-color:rgba(245,158,11,.45);color:#fbbf24}
.gx-bc-input-group{display:flex;gap:6px;align-items:center}
.gx-bc-input{flex:1;min-width:0;padding:8px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.4);color:#f1f5f9;font-size:13px;font-family:inherit;box-sizing:border-box}
.gx-bc-input:focus{outline:none;border-color:#00e5ff}
.gx-bc-max-btn{white-space:nowrap;padding:8px 10px;border-radius:10px;border:1px solid rgba(56,189,248,.3);background:rgba(56,189,248,.08);color:#38bdf8;font-size:11.5px;font-weight:700;cursor:pointer;transition:all .18s}
.gx-bc-max-btn:hover{background:rgba(56,189,248,.18);border-color:#38bdf8}
.gx-bc-apply-btn{padding:8px 14px;border-radius:10px;border:none;background:linear-gradient(135deg,#00e5ff,#00b4d8);color:#020b14;font-size:12.5px;font-weight:800;cursor:pointer;white-space:nowrap;transition:all .18s}
.gx-bc-apply-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 4px 14px rgba(0,229,255,.4)}
.gx-bc-apply-btn:disabled{opacity:.4;cursor:not-allowed}
.gx-bc-applied{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:10px;margin-top:8px}
.gx-bc-applied.credit{background:rgba(56,189,248,.1);border:1px solid rgba(56,189,248,.3)}
.gx-bc-applied.coins{background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3)}
.gx-bca-info{display:flex;flex-direction:column}
.gx-bca-val{font-size:13.5px;font-weight:800;color:#f1f5f9}
.gx-bca-sub{font-size:11px;color:#94a3b8}
.gx-bc-remove{background:transparent;border:1px solid rgba(255,84,112,.4);color:#ff98a8;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer}
.gx-bc-remove:hover{background:rgba(255,84,112,.12)}

/* Payment Stage 2 Cards */
.gx-eneba-payment-card{border-radius:18px;border:1px solid rgba(0,229,255,.16);background:linear-gradient(180deg,rgba(18,22,34,.7),rgba(10,13,22,.85))}
.gx-payment-list{display:flex;flex-direction:column;gap:14px;margin:16px 0}
.gx-payment-card-eneba{display:flex;align-items:center;gap:14px;padding:18px 20px;border-radius:16px;background:rgba(255,255,255,.02);border:1.5px solid rgba(255,255,255,.08);cursor:pointer;transition:all .2s ease}
.gx-payment-card-eneba:hover{background:rgba(255,255,255,.04);border-color:rgba(0,229,255,.35)}
.gx-payment-card-eneba.active{background:linear-gradient(135deg,rgba(0,229,255,.1),rgba(124,58,237,.06));border-color:#00e5ff;box-shadow:0 10px 28px -6px rgba(0,229,255,.25)}
.gx-pc-radio{width:22px;height:22px;border-radius:50%;border:2px solid rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;flex:0 0 auto;transition:all .18s}
.gx-payment-card-eneba.active .gx-pc-radio{border-color:#00e5ff}
.gx-pc-dot{width:10px;height:10px;border-radius:50%;background:transparent;transition:all .18s}
.gx-payment-card-eneba.active .gx-pc-dot{background:#00e5ff;box-shadow:0 0 8px #00e5ff}
.gx-pc-body{flex:1}
.gx-pc-title{font-size:15px;font-weight:900;color:#f8fafc}
.gx-payment-card-eneba.active .gx-pc-title{color:#00e5ff}
.gx-pc-sub{font-size:12px;color:#94a3b8;margin-top:2px}

/* Payment Logos (CliQ and Visa/Mastercard) */
.gx-pc-logo-badge{flex:0 0 auto;height:40px;min-width:104px;padding:4px 12px;border-radius:10px;display:flex;align-items:center;justify-content:center;box-sizing:border-box}
.gx-pc-logo-badge.cliq{background:#ffffff;border:1px solid rgba(255,255,255,.9);box-shadow:0 4px 12px rgba(0,0,0,.35)}
.gx-pc-logo-badge.cliq img{height:24px;width:auto;max-width:86px;object-fit:contain}
.gx-pc-logo-badge.card{background:#ffffff;border:1px solid rgba(255,255,255,.9);box-shadow:0 4px 12px rgba(0,0,0,.35);padding:4px 8px}
.gx-pc-logo-badge.card img{height:24px;width:auto;object-fit:contain}

/* Recap Side (Stage 2) */
.gx-recap-items{display:flex;flex-direction:column;gap:10px;margin-bottom:12px;max-height:220px;overflow-y:auto;padding-inline-end:4px}
.gx-recap-line{display:flex;align-items:center;gap:10px;font-size:12.5px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,.05)}
.gx-rl-thumb{flex:0 0 auto}
.gx-rl-name{flex:1;color:#cbd5e1;display:flex;flex-direction:column}
.gx-rl-name small{color:#64748b}
.gx-rl-price{font-weight:800;color:#f1f5f9}
.gx-recap-email-box{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07)}
.gx-reb-left{display:flex;flex-direction:column;gap:2px}
.gx-reb-lbl{font-size:11px;color:#64748b}
.gx-reb-val{font-size:13px;font-weight:800;color:#e2e8f0}
.gx-reb-edit{background:none;border:none;color:#00e5ff;font-size:12.5px;font-weight:800;cursor:pointer;text-decoration:underline}

/* Common form styles */
.gx-cb-input{width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:rgba(0,0,0,.35);color:#e6f7ff;font-family:inherit;font-size:14px;box-sizing:border-box}
.gx-cb-input:focus{outline:none;border-color:rgba(0,229,255,.55);box-shadow:0 0 0 3px rgba(0,229,255,.15)}
.gx-cb-row{display:flex;gap:8px}
.gx-coupon-apply{padding:10px 18px;white-space:nowrap}
.gx-coupon-applied{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:10px;background:rgba(0,229,176,.1);border:1px dashed rgba(0,229,176,.4)}
.gx-coupon-code{font-family:ui-monospace,monospace;font-weight:900;color:#00e5b0}
.gx-coupon-note{font-size:11px;color:#7fe5c8;margin-top:2px}
.gx-coupon-remove{background:transparent;border:1px solid rgba(255,84,112,.4);color:#ff98a8;padding:5px 10px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer}
.gx-coupon-msg{margin-top:6px;font-size:12px;font-weight:700;padding:6px 10px;border-radius:8px}
.gx-coupon-msg.ok{background:rgba(0,229,176,.12);color:#00e5b0}
.gx-coupon-msg.err{background:rgba(255,84,112,.1);color:#ff98a8}
.gx-back-link{background:none;border:none;color:#00e5ff;font-size:13px;font-weight:800;cursor:pointer}

@media (max-width:900px){
  .gx-eneba-grid{grid-template-columns:1fr}
}
`;
