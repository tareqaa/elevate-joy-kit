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

/** 2-Step Horizontal Progress Bar */
function CheckoutStepper({ stage, onStepClick }: { stage: 1 | 2; onStepClick: (s: 1 | 2) => void }) {
  const { t } = useLang();
  return (
    <div className="gx-stepper-container">
      {/* Step 1: Shopping Cart */}
      <div
        className={"gx-step-node " + (stage === 1 ? "active" : "done")}
        onClick={() => onStepClick(1)}
        title={t("cart.shopping_cart")}
      >
        <div className="gx-step-circle">
          {stage === 2 ? "✓" : "1"}
        </div>
        <span className="gx-step-label">{t("cart.shopping_cart")}</span>
      </div>

      {/* Progress Line */}
      <div className="gx-step-divider">
        <div className={"gx-step-divider-fill " + (stage === 2 ? "active" : "inactive")} />
      </div>

      {/* Step 2: Payment */}
      <div
        className={"gx-step-node " + (stage === 2 ? "active" : "pending")}
        onClick={() => { if (stage === 2) onStepClick(2); }}
        title={t("cart.payment_step")}
      >
        <div className="gx-step-circle">2</div>
        <span className="gx-step-label">{t("cart.payment_step")}</span>
      </div>
    </div>
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
          {cart.items.length > 0 && (
            <CheckoutStepper
              stage={stage}
              onStepClick={(s) => {
                setStage(s);
                window.scrollTo({ top: 80, behavior: "smooth" });
              }}
            />
          )}

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

/** Card: "البريد الإلكتروني" - Hidden completely if user is signed in */
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

/** Card: "الملخص" (Summary Stage 1 with Integrated Loyalty & Discounts) */
function CartSummaryStage1({ onContinue }: { onContinue: () => void }) {
  const cart = useCart();
  const { format } = useCurrency();
  const { t, lang } = useLang();
  const isAr = lang !== "en";

  // Balances state
  const [balance, setBalance] = useState<{ coins: number; credit: number } | null>(null);
  const [openSection, setOpenSection] = useState<"coupon" | "coins" | "credit" | null>(
    cart.coupon ? "coupon" : null
  );

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);

  // Coins state
  const [coinAmount, setCoinAmount] = useState("");
  const [coinMsg, setCoinMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  const [coinBusy, setCoinBusy] = useState(false);

  // Credit state
  const [creditAmount, setCreditAmount] = useState("");
  const [creditMsg, setCreditMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  const [creditBusy, setCreditBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) return;
      const { data } = await supabase
        .from("profiles")
        .select("gx_coins, store_credit_jod")
        .eq("id", uid)
        .maybeSingle();
      if (alive) {
        setBalance({
          coins: Number(data?.gx_coins ?? 0),
          credit: Number(data?.store_credit_jod ?? 0),
        });
      }
    };
    void load();
    const on = () => void load();
    window.addEventListener("gx:balances-updated", on);
    return () => {
      alive = false;
      window.removeEventListener("gx:balances-updated", on);
    };
  }, []);

  async function applyCoupon() {
    if (couponBusy) return;
    setCouponBusy(true);
    const r = await cart.applyCoupon(couponInput);
    setCouponMsg({ ok: r.ok, msg: r.message });
    setCouponBusy(false);
    if (r.ok) setCouponInput("");
  }

  async function applyCoins(v: number) {
    if (coinBusy || v <= 0) return;
    setCoinBusy(true);
    const r = await cart.applyCoins(v);
    setCoinMsg({ ok: r.ok, msg: r.message });
    setCoinBusy(false);
  }

  async function applyCredit(v: number) {
    if (creditBusy || v <= 0) return;
    setCreditBusy(true);
    const r = await cart.applyCredit(v);
    setCreditMsg({ ok: r.ok, msg: r.message });
    setCreditBusy(false);
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

  // Coins calculations
  const coinsBalance = balance?.coins ?? 0;
  const creditBalance = balance?.credit ?? 0;

  const payableForCoins = Math.max(0, cart.subtotalJOD - (cart.coupon?.discount_jod ?? 0));
  const capJod = Math.round(payableForCoins * MAX_COINS_DISCOUNT_RATIO * 100) / 100;
  const maxCoinsForOrder = jodToCoins(capJod);
  const usableCoins = Math.min(coinsBalance, maxCoinsForOrder);
  const maxCoinsDiscountJod = coinsToJod(usableCoins);

  // Credit calculations
  const payableForCredit = Math.max(
    0,
    cart.subtotalJOD - (cart.coupon?.discount_jod ?? 0) - (cart.coins?.discount_jod ?? 0)
  );
  const usableCredit = Math.round(Math.min(creditBalance, payableForCredit) * 100) / 100;

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

      {/* Integrated Loyalty & Discounts Section (طريقة أنيقة ومدمجة بالكامل) */}
      <div className="gx-summary-loyalty-section">
        {/* Accordion 1: Coupon */}
        <div className="gx-sl-item">
          <button
            type="button"
            className={"gx-sl-header " + (openSection === "coupon" ? "open" : "")}
            onClick={() => setOpenSection(openSection === "coupon" ? null : "coupon")}
          >
            <div className="gx-sl-head-left">
              <span className="gx-sl-icon">🏷️</span>
              <span className="gx-sl-title">{t("cart.have_coupon")}</span>
            </div>
            <div className="gx-sl-head-right">
              {cart.coupon ? (
                <span className="gx-sl-badge active">{cart.coupon.code}</span>
              ) : (
                <span className="gx-sl-arrow">{openSection === "coupon" ? "▲" : "▼"}</span>
              )}
            </div>
          </button>

          {openSection === "coupon" && (
            <div className="gx-sl-body">
              {cart.coupon ? (
                <div className="gx-sl-applied-row">
                  <div>
                    <span className="gx-sl-applied-code">{cart.coupon.code}</span>
                    <span className="gx-sl-applied-sub">خصم: -{format(cart.coupon.discount_jod)}</span>
                  </div>
                  <button
                    type="button"
                    className="gx-sl-remove-link"
                    onClick={() => { cart.removeCoupon(); setCouponMsg(null); }}
                  >
                    {t("cart.remove")}
                  </button>
                </div>
              ) : (
                <div className="gx-cb-row" style={{ marginTop: 6 }}>
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
              )}
              {couponMsg && (
                <div className={"gx-coupon-msg " + (couponMsg.ok ? "ok" : "err")}>
                  {couponMsg.msg}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Accordion 2: GX Coins (if user has coins) */}
        {coinsBalance > 0 && (
          <div className="gx-sl-item coins">
            <button
              type="button"
              className={"gx-sl-header " + (openSection === "coins" ? "open" : "")}
              onClick={() => setOpenSection(openSection === "coins" ? null : "coins")}
            >
              <div className="gx-sl-head-left">
                <span className="gx-sl-icon">🪙</span>
                <span className="gx-sl-title">عملات GX Coins</span>
              </div>
              <div className="gx-sl-head-right">
                {cart.coins ? (
                  <span className="gx-sl-badge active coins">مُفعل (-{format(cart.coins.discount_jod)})</span>
                ) : (
                  <span className="gx-sl-badge coins">{coinsBalance.toLocaleString("en-US")} عملة</span>
                )}
                <span className="gx-sl-arrow">{openSection === "coins" ? "▲" : "▼"}</span>
              </div>
            </button>

            {openSection === "coins" && (
              <div className="gx-sl-body">
                {cart.coins ? (
                  <div className="gx-sl-applied-row coins">
                    <div>
                      <span className="gx-sl-applied-code coins">
                        {cart.coins.coins.toLocaleString("en-US")} عملة
                      </span>
                      <span className="gx-sl-applied-sub">خصم: -{format(cart.coins.discount_jod)}</span>
                    </div>
                    <button
                      type="button"
                      className="gx-sl-remove-link"
                      onClick={() => { cart.removeCoins(); setCoinMsg(null); }}
                    >
                      إلغاء
                    </button>
                  </div>
                ) : usableCoins < 1 ? (
                  <div className="gx-sl-hint">لا يمكن استخدام العملات في هذا الطلب حالياً.</div>
                ) : (
                  <div className="gx-sl-action-box">
                    <div className="gx-sl-hint">
                      {isAr
                        ? `يمكنك خصم حتى ${format(maxCoinsDiscountJod)} باستخدام ${usableCoins.toLocaleString("en-US")} عملة.`
                        : `Knock off up to ${format(maxCoinsDiscountJod)} with ${usableCoins.toLocaleString("en-US")} coins.`}
                    </div>

                    <div className="gx-sl-preset-row">
                      {[
                        { label: "25%", ratio: 0.25 },
                        { label: "50%", ratio: 0.5 },
                        { label: isAr ? `الحد الأقصى` : `Max`, ratio: 1 },
                      ].map((p) => {
                        const v = Math.max(1, Math.floor(usableCoins * p.ratio));
                        return (
                          <button
                            key={p.ratio}
                            type="button"
                            className="gx-sl-chip"
                            onClick={() => {
                              setCoinAmount(String(v));
                              applyCoins(v);
                            }}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="gx-cb-row">
                      <input
                        className="gx-cb-input"
                        type="number"
                        min={1}
                        max={usableCoins}
                        placeholder={`حدد العملات (حتى ${usableCoins.toLocaleString("en-US")})`}
                        value={coinAmount}
                        onChange={(e) => setCoinAmount(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (coinAmount) applyCoins(Number(coinAmount));
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-primary gx-coupon-apply"
                        disabled={coinBusy || !coinAmount || Number(coinAmount) <= 0}
                        onClick={() => applyCoins(Number(coinAmount))}
                      >
                        {coinBusy ? "..." : "استخدام"}
                      </button>
                    </div>

                    {coinMsg && (
                      <div className={"gx-coupon-msg " + (coinMsg.ok ? "ok" : "err")}>
                        {coinMsg.msg}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Accordion 3: Store Credit (if user has store credit) */}
        {creditBalance > 0 && (
          <div className="gx-sl-item credit">
            <button
              type="button"
              className={"gx-sl-header " + (openSection === "credit" ? "open" : "")}
              onClick={() => setOpenSection(openSection === "credit" ? null : "credit")}
            >
              <div className="gx-sl-head-left">
                <span className="gx-sl-icon">💳</span>
                <span className="gx-sl-title">{t("cart.store_credit")}</span>
              </div>
              <div className="gx-sl-head-right">
                {cart.creditJOD > 0 ? (
                  <span className="gx-sl-badge active credit">مُفعل (-{format(cart.creditJOD)})</span>
                ) : (
                  <span className="gx-sl-badge credit">{format(creditBalance)}</span>
                )}
                <span className="gx-sl-arrow">{openSection === "credit" ? "▲" : "▼"}</span>
              </div>
            </button>

            {openSection === "credit" && (
              <div className="gx-sl-body">
                {cart.creditJOD > 0 ? (
                  <div className="gx-sl-applied-row credit">
                    <div>
                      <span className="gx-sl-applied-code credit">{format(cart.creditJOD)}</span>
                      <span className="gx-sl-applied-sub">مخصوم من إجمالي الطلب</span>
                    </div>
                    <button
                      type="button"
                      className="gx-sl-remove-link"
                      onClick={() => { cart.removeCredit(); setCreditMsg(null); }}
                    >
                      إلغاء
                    </button>
                  </div>
                ) : usableCredit > 0 ? (
                  <div className="gx-sl-action-box">
                    <div className="gx-sl-hint">
                      يمكنك استخدام حتى {format(usableCredit)} من رصيدك.
                    </div>

                    <div className="gx-cb-row">
                      <input
                        className="gx-cb-input"
                        type="number"
                        min={0.01}
                        step={0.01}
                        max={usableCredit}
                        placeholder={`المبلغ (حتى ${format(usableCredit)})`}
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (creditAmount) applyCredit(Number(creditAmount));
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-primary gx-coupon-apply"
                        disabled={creditBusy || !creditAmount || Number(creditAmount) <= 0}
                        onClick={() => applyCredit(Number(creditAmount))}
                      >
                        {creditBusy ? "..." : "استخدام"}
                      </button>
                    </div>

                    <button
                      type="button"
                      className="gx-sl-use-all-btn"
                      onClick={() => {
                        setCreditAmount(usableCredit.toFixed(2));
                        applyCredit(usableCredit);
                      }}
                    >
                      استخدام كامل الرصيد المتاح ({format(usableCredit)})
                    </button>

                    {creditMsg && (
                      <div className={"gx-coupon-msg " + (creditMsg.ok ? "ok" : "err")}>
                        {creditMsg.msg}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Stage 2: Payment Methods Page (Spacious, Separated, Luxury Design) */
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
    <div className="gx-payment-stage-wrapper">
      {/* Clean Header with Back Link (Right-pointing arrow in RTL) */}
      <div className="gx-pm-header">
        <div className="gx-pm-header-info">
          <h2>{t("cart.payment_method_title")}</h2>
          <p>اختر الطريقة المناسبة لك لإتمام عملية الدفع بأمان وسرعة</p>
        </div>
        <button type="button" className="gx-pm-back-pill" onClick={onBack}>
          <span className="gx-arr">→</span> {t("cart.shopping_cart")}
        </button>
      </div>

      {/* Payment Selection List (Spacious & Cleanly Separated) */}
      <div className="gx-pm-tiles-list">
        {/* CliQ Option - Jordan ONLY */}
        {isJordan && (
          <div
            className={"gx-pm-tile " + (paymentMethod === "cliq" ? "active" : "")}
            onClick={() => setPaymentMethod("cliq")}
          >
            <div className="gx-pm-radio">
              <div className="gx-pm-radio-ring">
                <div className="gx-pm-radio-inner" />
              </div>
            </div>

            <div className="gx-pm-info">
              <div className="gx-pm-name-row">
                <span className="gx-pm-name">{t("cart.method_cliq")}</span>
                <span className="gx-pm-tag cliq">الأردن فقط 🇯🇴</span>
              </div>
              <p className="gx-pm-desc">{t("cart.method_cliq_desc")}</p>
            </div>

            {/* Official CliQ Logo in pristine white container */}
            <div className="gx-pm-logo cliq">
              <img src="/app/assets/img/cliq-logo.png" alt="CliQ" />
            </div>
          </div>
        )}

        {/* Visa / Mastercard Option - Jordan & International */}
        <div
          className={"gx-pm-tile " + (paymentMethod === "card" ? "active" : "")}
          onClick={() => setPaymentMethod("card")}
        >
          <div className="gx-pm-radio">
            <div className="gx-pm-radio-ring">
              <div className="gx-pm-radio-inner" />
            </div>
          </div>

          <div className="gx-pm-info">
            <div className="gx-pm-name-row">
              <span className="gx-pm-name">{t("cart.method_card")}</span>
              <span className="gx-pm-tag card">محلي ودولي 🌐</span>
            </div>
            <p className="gx-pm-desc">{t("cart.method_card_desc")}</p>
          </div>

          {/* Visa / Mastercard Official Vector Badge */}
          <div className="gx-pm-logo card">
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

const checkoutCss = `
/* Top 2-Step Horizontal Progress Bar */
.gx-stepper-container {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  justify-content: center !important;
  margin: 0 auto 28px !important;
  max-width: 540px !important;
  width: 100% !important;
  padding: 12px 20px !important;
  border-radius: 999px !important;
  background: rgba(18, 24, 38, 0.6) !important;
  border: 1px solid rgba(0, 229, 255, 0.14) !important;
  backdrop-filter: blur(10px) !important;
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5) !important;
  box-sizing: border-box !important;
}
.gx-step-node {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
  flex: 0 0 auto;
}
.gx-step-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13.5px;
  font-weight: 900;
  transition: all 0.25s ease;
  background: rgba(255, 255, 255, 0.05);
  color: #94a3b8;
  border: 1.5px solid rgba(255, 255, 255, 0.12);
}
.gx-step-node.active .gx-step-circle {
  background: linear-gradient(135deg, #00e5ff 0%, #00b4d8 100%);
  color: #020b14;
  border-color: #00e5ff;
  box-shadow: 0 0 16px rgba(0, 229, 255, 0.65);
}
.gx-step-node.done .gx-step-circle {
  background: #00e5b0;
  color: #0a0e1a;
  border-color: #00e5b0;
}
.gx-step-label {
  font-size: 13.5px;
  font-weight: 800;
  color: #94a3b8;
  transition: color 0.2s;
  white-space: nowrap;
}
.gx-step-node.active .gx-step-label {
  color: #f1f5f9;
}
.gx-step-node.done .gx-step-label {
  color: #00e5b0;
}
.gx-step-divider {
  flex: 1;
  height: 2px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 16px;
  position: relative;
  border-radius: 99px;
  overflow: hidden;
}
.gx-step-divider-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  left: 0;
  background: linear-gradient(90deg, #00e5ff, #00e5b0);
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: right center;
}
.gx-step-divider-fill.inactive {
  transform: scaleX(0);
}
.gx-step-divider-fill.active {
  transform: scaleX(1);
}

/* 2-Column Grid */
.gx-eneba-grid{display:grid;grid-template-columns:1fr 370px;gap:24px;align-items:start}
.gx-eneba-main{display:flex;flex-direction:column;gap:20px}
.gx-eneba-side{display:flex;flex-direction:column;gap:18px}

.gx-eneba-cart-card{border-radius:18px;border:1px solid rgba(0,229,255,.16);background:linear-gradient(180deg,rgba(18,22,34,.7),rgba(10,13,22,.85))}
.gx-eneba-row{position:relative;border-bottom:1px solid rgba(255,255,255,.06)!important;padding:16px 0!important}
.gx-row-trash{background:transparent;border:none;color:#64748b;cursor:pointer;padding:8px;border-radius:8px;display:flex;align-items:center;justify-content:center;transition:all .18s}
.gx-row-trash:hover{color:#ff5470;background:rgba(255,84,112,.1)}

/* Integrated Loyalty & Discounts in Summary */
.gx-summary-loyalty-section {
  margin-top: 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.gx-sl-item {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.07);
  overflow: hidden;
  transition: all 0.2s ease;
}
.gx-sl-item:hover {
  border-color: rgba(255, 255, 255, 0.14);
}
.gx-sl-item.coins {
  border-color: rgba(245, 158, 11, 0.25);
  background: linear-gradient(180deg, rgba(245, 158, 11, 0.03) 0%, rgba(14, 20, 35, 0.3) 100%);
}
.gx-sl-item.credit {
  border-color: rgba(56, 189, 248, 0.25);
  background: linear-gradient(180deg, rgba(56, 189, 248, 0.03) 0%, rgba(14, 20, 35, 0.3) 100%);
}
.gx-sl-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: none;
  border: none;
  cursor: pointer;
  color: #f1f5f9;
  text-align: inherit;
  transition: background 0.18s;
}
.gx-sl-header:hover {
  background: rgba(255, 255, 255, 0.03);
}
.gx-sl-head-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.gx-sl-icon {
  font-size: 15px;
  line-height: 1;
}
.gx-sl-title {
  font-size: 13px;
  font-weight: 800;
  color: #e2e8f0;
}
.gx-sl-head-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.gx-sl-badge {
  font-size: 11px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.06);
  color: #cbd5e1;
}
.gx-sl-badge.coins {
  background: rgba(245, 158, 11, 0.12);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.3);
}
.gx-sl-badge.credit {
  background: rgba(56, 189, 248, 0.12);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.3);
}
.gx-sl-badge.active {
  background: rgba(0, 229, 176, 0.12);
  color: #00e5b0;
  border: 1px solid rgba(0, 229, 176, 0.3);
}
.gx-sl-arrow {
  font-size: 10px;
  color: #94a3b8;
}
.gx-sl-body {
  padding: 10px 12px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.2);
}
.gx-sl-hint {
  font-size: 11.5px;
  color: #94a3b8;
  margin-bottom: 8px;
  line-height: 1.4;
}
.gx-sl-preset-row {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}
.gx-sl-chip {
  flex: 1;
  padding: 5px 8px;
  border-radius: 6px;
  border: 1px solid rgba(245, 158, 11, 0.3);
  background: rgba(245, 158, 11, 0.08);
  color: #fbbf24;
  font-size: 11.5px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.18s;
  text-align: center;
}
.gx-sl-chip:hover {
  background: rgba(245, 158, 11, 0.2);
  border-color: #fbbf24;
}
.gx-sl-use-all-btn {
  margin-top: 6px;
  width: 100%;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid rgba(56, 189, 248, 0.3);
  background: rgba(56, 189, 248, 0.08);
  color: #38bdf8;
  font-size: 11.5px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.18s;
}
.gx-sl-use-all-btn:hover {
  background: rgba(56, 189, 248, 0.18);
  border-color: #38bdf8;
}
.gx-sl-applied-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(0, 229, 176, 0.08);
  border: 1px solid rgba(0, 229, 176, 0.25);
}
.gx-sl-applied-row.coins {
  background: rgba(245, 158, 11, 0.08);
  border-color: rgba(245, 158, 11, 0.25);
}
.gx-sl-applied-row.credit {
  background: rgba(56, 189, 248, 0.08);
  border-color: rgba(56, 189, 248, 0.25);
}
.gx-sl-applied-code {
  display: block;
  font-size: 12.5px;
  font-weight: 900;
  color: #00e5b0;
}
.gx-sl-applied-code.coins {
  color: #fbbf24;
}
.gx-sl-applied-code.credit {
  color: #38bdf8;
}
.gx-sl-applied-sub {
  font-size: 11px;
  color: #94a3b8;
}
.gx-sl-remove-link {
  background: transparent;
  border: 1px solid rgba(255, 84, 112, 0.4);
  color: #ff98a8;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}
.gx-sl-remove-link:hover {
  background: rgba(255, 84, 112, 0.12);
}

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

/* Payment Stage 2: Spacious & Separated Tiles */
.gx-payment-stage-wrapper {
  border-radius: 20px;
  padding: 24px;
  border: 1px solid rgba(0, 229, 255, 0.16);
  background: linear-gradient(180deg, rgba(18, 22, 34, 0.75), rgba(10, 13, 22, 0.9));
  box-shadow: 0 14px 40px -10px rgba(0, 0, 0, 0.6);
}
.gx-pm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 22px;
}
.gx-pm-header-info h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 900;
  color: #f8fafc;
}
.gx-pm-header-info p {
  margin: 4px 0 0;
  font-size: 12.5px;
  color: #94a3b8;
}
.gx-pm-back-pill {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(0, 229, 255, 0.25);
  color: #00e5ff;
  font-size: 13px;
  font-weight: 800;
  padding: 7px 14px;
  border-radius: 99px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
  white-space: nowrap;
}
.gx-pm-back-pill:hover {
  background: rgba(0, 229, 255, 0.1);
  border-color: #00e5ff;
}
.gx-pm-back-pill .gx-arr {
  font-size: 14px;
  line-height: 1;
}
.gx-pm-tiles-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.gx-pm-tile {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 22px 24px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
  position: relative;
}
.gx-pm-tile:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(0, 229, 255, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
}
.gx-pm-tile.active {
  background: linear-gradient(135deg, rgba(0, 229, 255, 0.09) 0%, rgba(124, 58, 237, 0.05) 100%);
  border-color: #00e5ff;
  box-shadow: 0 12px 32px -6px rgba(0, 229, 255, 0.3);
}
.gx-pm-radio {
  flex: 0 0 auto;
}
.gx-pm-radio-ring {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.gx-pm-tile.active .gx-pm-radio-ring {
  border-color: #00e5ff;
}
.gx-pm-radio-inner {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: transparent;
  transition: all 0.2s;
}
.gx-pm-tile.active .gx-pm-radio-inner {
  background: #00e5ff;
  box-shadow: 0 0 10px #00e5ff;
}
.gx-pm-info {
  flex: 1;
  min-width: 0;
}
.gx-pm-name-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.gx-pm-name {
  font-size: 15.5px;
  font-weight: 800;
  color: #f8fafc;
}
.gx-pm-tile.active .gx-pm-name {
  color: #00e5ff;
}
.gx-pm-tag {
  font-size: 11px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 6px;
}
.gx-pm-tag.cliq {
  background: rgba(168, 85, 247, 0.15);
  color: #d8b4fe;
  border: 1px solid rgba(168, 85, 247, 0.35);
}
.gx-pm-tag.card {
  background: rgba(59, 130, 246, 0.15);
  color: #93c5fd;
  border: 1px solid rgba(59, 130, 246, 0.35);
}
.gx-pm-desc {
  font-size: 12.5px;
  color: #94a3b8;
  margin: 4px 0 0;
  line-height: 1.5;
}
.gx-pm-logo {
  flex: 0 0 auto;
  height: 44px;
  min-width: 115px;
  background: #ffffff;
  border-radius: 12px;
  padding: 6px 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.85);
  box-sizing: border-box;
}
.gx-pm-logo img {
  height: 26px;
  width: auto;
  max-width: 95px;
  object-fit: contain;
}

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
.gx-coupon-msg{margin-top:6px;font-size:12px;font-weight:700;padding:6px 10px;border-radius:8px}
.gx-coupon-msg.ok{background:rgba(0,229,176,.12);color:#00e5b0}
.gx-coupon-msg.err{background:rgba(255,84,112,.1);color:#ff98a8}

@media (max-width:900px){
  .gx-eneba-grid{grid-template-columns:1fr}
  .gx-stepper-container{padding:10px 14px !important}
  .gx-pm-tile{padding:16px 18px;gap:14px}
  .gx-pm-logo{min-width:90px;height:38px}
}
`;
