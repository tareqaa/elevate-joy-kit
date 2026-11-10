import { resolveRegionLabel } from "@/lib/gx/region";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { StoreShell } from "@/components/gx/StoreShell";
import { useCart } from "@/lib/gx/cart";
import { useCurrency } from "@/lib/gx/currency";
import { useLang, getHeadLang } from "@/lib/gx/i18n";
import { CartItemThumb } from "@/components/gx/CartThumb";
import { localizeResolvedName } from "@/lib/gx/product-locale";
import { getDeliveryTypeInfo } from "@/lib/gx/delivery-types";
import { useSiteSettings, getEffectiveStockLimit } from "@/lib/gx/site-settings";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { OrderConfirmedModal } from "@/components/gx/OrderConfirmedModal";
import { coinsToJod, jodToCoins, MAX_COINS_DISCOUNT_RATIO, isEligibleForCoins, isGiftCardItem } from "@/lib/gx/loyalty";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useMemo } from "react";
import {
  getRememberedWhatsApp,
  setRememberedWhatsApp,
  getRememberedEmail,
  setRememberedEmail,
  isRememberContactEnabled,
  setRememberContactEnabled,
  resolveProductRequirementType,
} from "@/lib/gx/contact-storage";
import {
  detectUserCountry,
  formatInternationalWhatsApp,
  getFormattedInternationalPhone,
  resolveCountryFromPhone,
  COUNTRIES,
  CountryPhoneInput,
  CountryInfo,
  getDetectedIpCountry,
  fetchUserCountryOnce,
} from "@/lib/gx/country-phone";

export const Route = createFileRoute("/cart")({
  head: () => {
    const isEn = getHeadLang() === "en";
    return {
      meta: [
        { title: isEn ? "Shopping Cart | GX Store" : "السلة | متجر GX Store" },
        { name: "description", content: isEn ? "Shopping Cart — GX Store" : "سلة المشتريات — متجر GX Store" },
        { name: "robots", content: "noindex, nofollow" },
      ],
      links: STORE_HEAD_LINKS,
    };
  },
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
  const { t, lang } = useLang();
  const cart = useCart();

  useEffect(() => {
    document.title = lang === "en" ? "Shopping Cart | GX Store" : "السلة | متجر GX Store";
  }, [lang]);
  const { currency } = useCurrency();
  const [stage, setStage] = useState<1 | 2>(1);
  const [confirmed, setConfirmed] = useState<{
    orderNumber: string;
    waUrl: string | null;
    paymentMethod?: "cliq" | "card" | "gx_wallet" | "binance_pay";
    orderToken?: string;
  } | null>(null);

  // --- Strict IP-Based Country Detection (Phone number has NO effect) ---
  const [ipCountry, setIpCountry] = useState<string>(() => {
    return getDetectedIpCountry();
  });

  useEffect(() => {
    let active = true;
    void fetchUserCountryOnce().then((cc) => {
      if (active && cc) setIpCountry(cc.toUpperCase());
    });
    const onDetected = (e: Event) => {
      const cc = (e as CustomEvent).detail;
      if (active && cc && typeof cc === "string") {
        setIpCountry(cc.toUpperCase());
      }
    };
    window.addEventListener("gx:country-detected", onDetected);
    return () => {
      active = false;
      window.removeEventListener("gx:country-detected", onDetected);
    };
  }, []);

  // ONLY based on IP address: JO = Jordan (CliQ only), anything else = international (Binance Pay)
  const isJordan = ipCountry === "JO";

  // Check admin role to allow full preview of all payment options
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(async ({ data: sess }) => {
      const uid = sess.session?.user?.id;
      if (!uid) {
        if (active) setIsAdmin(false);
        return;
      }
      try {
        const { data } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" });
        if (active) setIsAdmin(Boolean(data));
      } catch {
        if (active) setIsAdmin(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const [paymentMethod, setPaymentMethod] = useState<"cliq" | "binance_pay">(
    isJordan ? "cliq" : "binance_pay"
  );
  const [userPickedMethod, setUserPickedMethod] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      setPaymentMethod(isJordan ? "cliq" : "binance_pay");
    } else if (!userPickedMethod) {
      setPaymentMethod(isJordan ? "cliq" : "binance_pay");
    }
  }, [isJordan, isAdmin, userPickedMethod]);

  const handleSelectPaymentMethod = (m: "cliq" | "binance_pay") => {
    setUserPickedMethod(true);
    setPaymentMethod(m);
  };

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
            <div className="gx-checkout-grid">
              {/* Right column in RTL: Cart Items */}
              <div className="gx-checkout-main">
                <CartList />
              </div>

              {/* Left column in RTL: Delivery & Summary */}
              <div className="gx-checkout-side">
                <CartCustomerContactCard />
                <CartSummaryStage1
                  onContinue={() => {
                    setStage(2);
                    window.scrollTo({ top: 80, behavior: "smooth" });
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="gx-checkout-grid">
              {/* Right column in RTL: Payment Methods */}
              <div className="gx-checkout-main">
                <CartPaymentStage2
                  paymentMethod={paymentMethod}
                  setPaymentMethod={handleSelectPaymentMethod}
                  isJordan={isJordan}
                  isAdmin={isAdmin}
                  onBack={() => {
                    setStage(1);
                    window.scrollTo({ top: 80, behavior: "smooth" });
                  }}
                />
              </div>

              {/* Left column in RTL: Order Recap */}
              <div className="gx-checkout-side">
                <CartOrderRecapStage2
                  paymentMethod={paymentMethod}
                  isJordan={isJordan}
                  isAdmin={isAdmin}
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
          orderToken={confirmed.orderToken}
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

function CartItemTargetEditor({ item }: { item: any }) {
  const cart = useCart();
  const { lang } = useLang();
  const isAr = lang !== "en";
  const reqType = resolveProductRequirementType(item);
  const isSnap = item.cartId?.startsWith("snap-");
  const currentTarget = item.usernames?.[0] || "";

  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState(currentTarget);
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo>(() => {
    const fromPhone = resolveCountryFromPhone(currentTarget || cart.contact.phone);
    if (fromPhone) return fromPhone;
    if (cart.contact.countryCode) {
      const match = COUNTRIES.find((c) => c.dialCode === cart.contact.countryCode || c.code === cart.contact.countryCode);
      if (match) return match;
    }
    return detectUserCountry();
  });

  // If no requirement type and no usernames, don't show
  if (reqType === "none" && (!item.usernames || item.usernames.length === 0)) {
    return null;
  }

  const label =
    reqType === "whatsapp"
      ? (isAr ? "🟢 رقم الواتساب:" : "🟢 WhatsApp:")
      : reqType === "email"
      ? (isAr ? "✉️ إيميل التفعيل:" : "✉️ Activation Email:")
      : isSnap
      ? (isAr ? "👻 يوزرات سناب:" : "👻 Snapchat:")
      : reqType === "link"
      ? (isAr ? "🔗 رابط الحساب:" : "🔗 Link:")
      : (isAr ? "المعرّف:" : "Target:");

  const placeholder =
    reqType === "whatsapp"
      ? selectedCountry.placeholder
      : reqType === "email"
      ? (isAr ? "name@example.com" : "name@example.com")
      : (isAr ? "أدخل المعرف أو الرابط" : "Enter target");

  function handleSave() {
    const clean = val.trim();
    if (reqType === "whatsapp" && clean) {
      const formatted = formatInternationalWhatsApp(clean, selectedCountry);
      const finalPhone = formatted.fullInternational || clean;
      cart.updateItemTarget(item.cartId, finalPhone);
      cart.setContact({ phone: finalPhone, countryCode: selectedCountry.dialCode, type: "whatsapp" });
      const remember = isRememberContactEnabled();
      setRememberedWhatsApp(finalPhone, remember);
    } else {
      cart.updateItemTarget(item.cartId, clean);
      if (reqType === "email" && clean) {
        cart.setContact({ email: clean });
      }
    }
    setIsEditing(false);
  }

  if (isEditing) {
    if (reqType === "whatsapp") {
      return (
        <div style={{ marginTop: 8, maxWidth: 360, position: "relative", zIndex: 50 }}>
          <CountryPhoneInput
            value={val}
            country={selectedCountry}
            onChange={(raw, _full, c) => {
              setVal(raw);
              if (c) setSelectedCountry(c);
            }}
            onCountryChange={setSelectedCountry}
            autoFocus
            isAr={isAr}
            inputStyle={{ height: "36px", fontSize: "13px" }}
          />
          <div style={{ display: "flex", gap: "8px", marginTop: 8 }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ height: "28px", fontSize: "11.5px", padding: "0 12px", lineHeight: "28px" }}
              onClick={handleSave}
            >
              {isAr ? "✓ حفظ الرقم" : "Save"}
            </button>
            <button
              type="button"
              style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "12px" }}
              onClick={() => setIsEditing(false)}
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="cr-edit-target-box" style={{ marginTop: 6, display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
        <input
          type={reqType === "email" ? "email" : "text"}
          className="gx-cb-input"
          style={{ height: "30px", fontSize: "12px", padding: "4px 8px", width: "190px" }}
          placeholder={placeholder}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSave();
            } else if (e.key === "Escape") {
              setIsEditing(false);
            }
          }}
        />
        <button
          type="button"
          className="btn btn-primary"
          style={{ height: "30px", fontSize: "11.5px", padding: "0 10px", lineHeight: "30px" }}
          onClick={handleSave}
        >
          {isAr ? "✓ حفظ" : "Save"}
        </button>
        <button
          type="button"
          style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "12px" }}
          onClick={() => setIsEditing(false)}
        >
          {isAr ? "إلغاء" : "Cancel"}
        </button>
      </div>
    );
  }

  if (!currentTarget && (reqType === "whatsapp" || reqType === "email")) {
    return (
      <div style={{ marginTop: 4 }}>
        <button
          type="button"
          onClick={() => {
            const fallback = reqType === "whatsapp" ? (cart.contact.phone || getRememberedWhatsApp()) : (cart.contact.email || getRememberedEmail());
            setVal(fallback || "");
            setIsEditing(true);
          }}
          style={{
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px dashed rgba(239, 68, 68, 0.5)",
            color: "#fca5a5",
            fontSize: "11.5px",
            padding: "2px 8px",
            borderRadius: "6px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span>⚠️ {reqType === "whatsapp" ? (isAr ? "اضغط لإضافة رقم الواتساب للتفعيل" : "Add WhatsApp number") : (isAr ? "اضغط لإضافة إيميل التفعيل" : "Add activation email")}</span>
          <span style={{ textDecoration: "underline" }}>{isAr ? "إضافة" : "Add"}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="cr-users" style={{ marginTop: 4, display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
      <span className="cr-users-label" style={{ fontSize: 12, color: "#94a3b8" }}>
        {label}
      </span>{" "}
      <span
        className="cr-user-chip"
        style={{
          display: "inline-block",
          fontSize: 11.5,
          color: reqType === "whatsapp" ? "#00e5b0" : "#00e5ff",
          background: reqType === "whatsapp" ? "rgba(0, 229, 176, 0.12)" : "rgba(0, 229, 255, 0.12)",
          border: reqType === "whatsapp" ? "1px solid rgba(0, 229, 176, 0.25)" : "1px solid rgba(0, 229, 255, 0.2)",
          padding: "2px 8px",
          borderRadius: 6,
          maxWidth: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          verticalAlign: "middle",
        }}
        title={currentTarget}
      >
        {isSnap ? `@${currentTarget}` : (currentTarget.length > 35 ? `${currentTarget.slice(0, 32)}...` : currentTarget)}
      </span>
      {!isSnap && (
        <button
          type="button"
          onClick={() => {
            setVal(currentTarget);
            setIsEditing(true);
          }}
          style={{
            background: "transparent",
            border: "none",
            color: "#94a3b8",
            fontSize: "11px",
            cursor: "pointer",
            padding: "1px 4px",
            textDecoration: "underline",
          }}
          title={isAr ? "تعديل هذا المعرف أو الرقم" : "Edit target"}
        >
          {isAr ? "تعديل" : "Edit"}
        </button>
      )}
    </div>
  );
}

function CartList() {
  const cart = useCart();
  const { format } = useCurrency();
  const { t, lang } = useLang();
  const siteSettings = useSiteSettings();

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
    <div className="cart-list-card gx-checkout-cart-card">
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
        const stockLimit = getEffectiveStockLimit(
          siteSettings?.product_stock_limits,
          it.cartId,
          it.product
        );
        const isSoldOut = stockLimit !== null && stockLimit <= 0;
        const isMax = isSnap || isSoldOut || (stockLimit !== null && it.qty >= stockLimit);
        const deliveryInfo = getDeliveryTypeInfo(
          {
            slug: it.product,
            cartId: it.cartId,
            name: it.name,
            productType: it.deliveryType,
          },
          lang
        );
        const cleanRegion = resolveRegionLabel(
          { region: it.region, name: it.name, cartId: it.cartId, slug: it.product },
          lang,
        );

        return (
          <div key={it.cartId} className={`cart-row gx-checkout-row ${isSoldOut ? "is-sold-out" : ""}`} style={isSoldOut ? { opacity: 0.72 } : undefined}>
            <CartItemThumb item={it} size={70} />

            <div className="cr-info">
              <div className="cr-name">
                {localizeResolvedName(it.name, lang)}
                {isSoldOut && (
                  <span style={{ marginInlineStart: 8, fontSize: "11px", padding: "2px 7px", borderRadius: "4px", background: "rgba(239, 68, 68, 0.2)", color: "#ef4444", fontWeight: 800 }}>
                    ⚠️ {lang === "en" ? "Sold Out" : "نفدت الكمية"}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "3px", marginBottom: "4px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "11px", padding: "1px 7px", borderRadius: "4px", background: "rgba(0, 229, 255, 0.12)", color: "#00e5ff", fontWeight: 600 }}>
                  {deliveryInfo.label}
                </span>
                <span style={{ fontSize: "11px", padding: "1px 7px", borderRadius: "4px", background: "rgba(255, 255, 255, 0.08)", color: "#cbd5e1", fontWeight: 500 }}>
                  {cleanRegion}
                </span>
              </div>
              <div className="cr-unit">
                {t("cart.unit_price")}: <span>{format(it.price)}</span>
              </div>

              <CartItemTargetEditor item={it} />

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
              <button
                aria-label="+"
                disabled={isMax}
                title={
                  isSnap
                    ? lang === "ar" ? "الحد الأقصى 1" : "Max 1"
                    : stockLimit !== null && it.qty >= stockLimit
                    ? lang === "ar" ? `أقصى كمية متاحة هي ${stockLimit}` : `Max available is ${stockLimit}`
                    : lang === "ar" ? "زيادة" : "Increase"
                }
                onClick={() => cart.changeQty(it.cartId, 1)}
              >
                +
              </button>
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

function readStoredUser(): { id: string; email: string } | null {
  if (typeof window === "undefined") return null;
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.includes("auth-token")) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as { user?: { id?: string; email?: string }; currentSession?: { user?: { id?: string; email?: string } } };
      const user = parsed.user ?? parsed.currentSession?.user;
      if (user?.id) return { id: user.id, email: user.email || "" };
    }
  } catch { /* noop */ }
  return null;
}

function readCachedBalances(): { coins: number; credit: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("gx_profile_cache");
    if (raw) {
      const p = JSON.parse(raw) as { gx_coins?: number; store_credit_jod?: number };
      if (p && (typeof p.gx_coins === "number" || typeof p.store_credit_jod === "number")) {
        return {
          coins: Number(p.gx_coins ?? 0),
          credit: Number(p.store_credit_jod ?? 0),
        };
      }
    }
  } catch { /* noop */ }
  return null;
}

/** Card: "Where to deliver the order?" */
function CartCustomerContactCard() {
  const cart = useCart();
  const { lang } = useLang();
  const isAr = lang !== "en";
  const [signedInUser, setSignedInUser] = useState<{ id: string; email: string } | null>(() => readStoredUser());
  const [rememberEmail, setRememberEmail] = useState(() => {
    try {
      return !!localStorage.getItem("gx_customer_email");
    } catch {
      return false;
    }
  });

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        const uEmail = data.session.user.email || "";
        const uid = data.session.user.id;
        setSignedInUser({ id: uid, email: uEmail });
        
        // If phone is already populated in cart, skip network query
        if (cart.contact.phone) return;

        // Try reading cached profile first (0ms, 0 network requests)
        try {
          const raw = localStorage.getItem(`gx:profile:${uid}`) || localStorage.getItem("gx_profile_cache");
          if (raw) {
            const p = JSON.parse(raw);
            if (p?.whatsapp) {
              const cleanDigits = String(p.whatsapp).trim().replace(/\D/g, "");
              if (cleanDigits) {
                cart.setContact({ phone: cleanDigits, type: "whatsapp" });
                return;
              }
            }
          }
        } catch { /* noop */ }

        // Fetch profile whatsapp only if not found in cache
        try {
          const { data: prof } = await supabase
            .from("profiles")
            .select("whatsapp")
            .eq("id", uid)
            .maybeSingle();
          if (prof?.whatsapp) {
            const raw = String(prof.whatsapp).trim();
            const cleanDigits = raw.replace(/\D/g, "");
            cart.setContact({ phone: cleanDigits, type: "whatsapp" });
          }
        } catch { /* noop */ }
      }
    });
  }, []); // Run on mount only to prevent refetch spam on every cart state change

  // Keep phone populated from localStorage if empty, for communication
  useEffect(() => {
    if (!cart.contact.phone) {
      const remembered = getRememberedWhatsApp();
      if (remembered) {
        cart.setContact({ phone: remembered, type: "whatsapp" });
      }
    }
  }, []); // Run on mount only

  const handleEmailChange = (val: string) => {
    cart.setContact({ email: val });
    if (rememberEmail) {
      try {
        if (val.trim()) {
          localStorage.setItem("gx_customer_email", val.trim());
        } else {
          localStorage.removeItem("gx_customer_email");
        }
      } catch { /* noop */ }
    }
    cart.items.forEach((it) => {
      if (resolveProductRequirementType(it) === "email") {
        cart.updateItemTarget(it.cartId, val);
      }
    });
  };

  const handleRememberToggle = (checked: boolean) => {
    setRememberEmail(checked);
    setRememberContactEnabled(checked);
    try {
      if (checked) {
        if (cart.contact.email?.trim()) localStorage.setItem("gx_customer_email", cart.contact.email.trim());
        if (cart.contact.phone?.trim()) setRememberedWhatsApp(cart.contact.phone.trim(), true);
      } else {
        localStorage.removeItem("gx_customer_email");
        localStorage.removeItem("gx_customer_whatsapp");
        localStorage.removeItem("gx_cart_contact");
      }
    } catch { /* noop */ }
  };

  return (
    <div className="gx-delivery-card gx-contact-card">
      {/* Top Header: Where to deliver the order? */}
      <div className="gx-dc-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, borderBottom: "none", paddingBottom: 0 }}>
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.2px" }}>
          {isAr ? "أين تريد استلام الطلب؟" : "Where to deliver the order?"}
        </h3>
        {signedInUser?.email && !cart.contact.email && (
          <button
            type="button"
            onClick={() => handleEmailChange(signedInUser.email)}
            style={{
              background: "transparent",
              border: "none",
              color: "#00e5ff",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
              padding: 0,
              textDecoration: "underline",
            }}
          >
            {isAr ? "استخدام بريد حسابي" : "Use my account email"}
          </button>
        )}
      </div>

      {/* Label: البريد الإلكتروني * */}
      <div style={{ marginBottom: 6 }}>
        <label
          htmlFor="gx-cart-delivery-email"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: "13px",
            fontWeight: 700,
            color: "#e2e8f0",
            cursor: "pointer",
          }}
        >
          <span>{isAr ? "البريد الإلكتروني" : "Email"}</span>
          <span style={{ color: "#00e5ff", fontWeight: 900 }}>*</span>
        </label>
      </div>

      {/* Input box: NO placeholder text inside! */}
      <div className="gx-contact-group" style={{ position: "relative", zIndex: 10 }}>
        <input
          id="gx-cart-delivery-email"
          className="gx-cb-input gx-delivery-email-input"
          type="email"
          autoComplete="email"
          placeholder=""
          value={cart.contact.email || ""}
          onChange={(e) => handleEmailChange(e.target.value)}
          style={{
            direction: "ltr",
            textAlign: "left",
            fontSize: "14px",
            height: "44px",
            background: "rgba(6, 11, 22, 0.75)",
            border: "1.5px solid rgba(0, 229, 255, 0.22)",
            borderRadius: "10px",
            color: "#ffffff",
            padding: "0 14px",
            width: "100%",
            boxSizing: "border-box",
            transition: "all 0.2s ease",
          }}
        />

        {/* Bottom row: Unified Remember Me matching QuickRequirementModal */}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 10,
            fontSize: "0.82rem",
            color: "#cbd5e1",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <input
            type="checkbox"
            checked={rememberEmail}
            onChange={(e) => handleRememberToggle(e.target.checked)}
            style={{
              accentColor: "#10b981",
              width: 16,
              height: 16,
              cursor: "pointer",
            }}
          />
          <span>
            {isAr
              ? "تذكر بياناتي للطلبات القادمة (حفظ تلقائي لعدم إدخالها كل مرة)"
              : "Remember my details for future orders"}
          </span>
        </label>
      </div>
    </div>
  );
}

/** Card: "الملخص" (Summary Stage 1 with Integrated Loyalty & Discounts) */
function CartSummaryStage1({ onContinue }: { onContinue: () => void }) {
  const cart = useCart();
  const { format } = useCurrency();
  const { t, lang, dir } = useLang();
  const isAr = lang !== "en";
  const siteSettings = useSiteSettings();

  // Balances state - synchronously initialize from cached profile for instant 0ms render
  const [balance, setBalance] = useState<{ coins: number; credit: number } | null>(() => readCachedBalances());
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
      if (alive && data) {
        setBalance({
          coins: Number(data.gx_coins ?? 0),
          credit: Number(data.store_credit_jod ?? 0),
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
    const { toast } = await import("sonner");

    // 0. Stock validation: prevent checking out items that are sold out / out of stock
    const soldOutItem = cart.items.find((it) => {
      const limit = getEffectiveStockLimit(
        siteSettings?.product_stock_limits,
        it.cartId,
        it.product
      );
      return limit !== null && limit <= 0;
    });
    if (soldOutItem) {
      toast.error(
        isAr
          ? `عذراً، المنتج "${soldOutItem.name}" نفدت كميته حالياً، يرجى إزالته من السلة للمتابعة.`
          : `Sorry, "${soldOutItem.name}" is currently sold out. Please remove it from cart to continue.`
      );
      return;
    }

    // 1. WhatsApp validation strictly for items requiring WhatsApp contact (LinkedIn, Fortnite Crew, etc.)
    const whatsappItems = cart.items.filter(
      (it) => resolveProductRequirementType(it) === "whatsapp"
    );
    if (whatsappItems.length > 0) {
      const missingTarget = whatsappItems.find((it) => !it.usernames?.[0]?.trim());
      if (missingTarget) {
        toast.error(
          isAr
            ? "يرجى إدخال وحفظ رقم الواتساب لمنتج التفعيل في السلة"
            : "Please enter and save the WhatsApp number for items in your cart"
        );
        return;
      }
      const phone = (
        cart.contact.phone ||
        whatsappItems[0]?.usernames?.[0] ||
        (isRememberContactEnabled() ? getRememberedWhatsApp() : "")
      ).trim();
      const cleanDigits = phone.replace(/\D/g, "");
      if (!phone || cleanDigits.length < 7) {
        toast.error(
          isAr
            ? "ضع رقم الواتس اب الخاص بك لسهولة التواصل والتفعيل"
            : "Please enter your WhatsApp phone number for easy contact & activation"
        );
        return;
      }
      const detected = resolveCountryFromPhone(phone);
      const code = detected?.dialCode || cart.contact.countryCode || "+962";
      cart.setContact({ phone, countryCode: code, type: "whatsapp" });
    }

    // 2. Email validation for all orders
    const email = (cart.contact.email || "").trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      toast.error(
        isAr
          ? "يرجى كتابة البريد الإلكتروني لتلقي التفعيل والطلب"
          : "Please enter your email to receive order delivery & activation"
      );
      return;
    }

    onContinue();
  }

  // Eligible subtotal for coins (only games & digital subscriptions; gift cards excluded)
  const eligibleItems = cart.items.filter((it) => isEligibleForCoins(it));
  const eligibleSubtotal = eligibleItems.reduce(
    (sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 1),
    0
  );
  const hasGiftCards = cart.items.some((it) => isGiftCardItem(it));
  const hasOnlyGiftCards = cart.items.length > 0 && eligibleItems.length === 0;

  // Coins calculations
  const coinsBalance = balance?.coins ?? 0;
  const creditBalance = balance?.credit ?? 0;

  const payableForCoins = Math.max(0, eligibleSubtotal - (cart.coupon?.discount_jod ?? 0));
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
    <div className="summary-card gx-checkout-summary-card">
      <h3 className="gx-summary-title">{t("cart.summary_box")}</h3>

      {/* Prominent Action Button at TOP */}
      <button className="btn btn-primary btn-block gx-checkout-cta" onClick={handleAdvance}>
        {t("cart.continue_to_payment")} {dir === "rtl" ? "←" : "→"}
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

      {/* Integrated Loyalty & Discounts Section */}
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
                    <span className="gx-sl-applied-sub">{t("cart.discount_label")} -{format(cart.coupon.discount_jod)}</span>
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
                <span className="gx-sl-title">{t("cart.coins_title")}</span>
              </div>
              <div className="gx-sl-head-right">
                {cart.coins ? (
                  <span className="gx-sl-badge active coins">{t("cart.coins_applied_badge")} (-{format(cart.coins.discount_jod)})</span>
                ) : (
                  <span className="gx-sl-badge coins">{coinsBalance.toLocaleString("en-US")} {t("cart.coins_unit")}</span>
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
                        {cart.coins.coins.toLocaleString("en-US")} {t("cart.coins_unit")}
                      </span>
                      <span className="gx-sl-applied-sub">{t("cart.discount_label")} -{format(cart.coins.discount_jod)}</span>
                    </div>
                    <button
                      type="button"
                      className="gx-sl-remove-link"
                      onClick={() => { cart.removeCoins(); setCoinMsg(null); }}
                    >
                      {t("cart.coins_cancel_btn")}
                    </button>
                  </div>
                ) : hasOnlyGiftCards ? (
                  <div
                    style={{
                      fontSize: "12.5px",
                      color: "#fbbf24",
                      background: "rgba(245, 158, 11, 0.08)",
                      padding: "12px 14px",
                      borderRadius: "10px",
                      border: "1px solid rgba(245, 158, 11, 0.2)",
                      lineHeight: 1.6,
                    }}
                  >
                    {isAr
                      ? "⚠️ عملات GX Coins متاحة فقط للألعاب والاشتراكات الرقمية، ولا يمكن استخدامها على بطاقات الهدايا (Gift Cards)."
                      : "⚠️ GX Coins are only redeemable on games and digital subscriptions, and cannot be used on gift cards."}
                  </div>
                ) : usableCoins < 1 ? (
                  <div className="gx-sl-hint">{t("cart.coins_low")}</div>
                ) : (
                  <div className="gx-sl-action-box">
                    <div className="gx-sl-hint">
                      {isAr
                        ? `يمكنك خصم حتى ${format(maxCoinsDiscountJod)} (بحد أقصى 25% من قيمة الألعاب والاشتراكات المؤهلة) باستخدام ${usableCoins.toLocaleString("en-US")} عملة.`
                        : `Knock off up to ${format(maxCoinsDiscountJod)} (max 25% of eligible games & subscriptions) with ${usableCoins.toLocaleString("en-US")} coins.`}
                    </div>
                    {hasGiftCards && (
                      <div style={{ fontSize: "11.5px", color: "#94a3b8", marginBottom: "8px" }}>
                        {isAr
                          ? "ℹ️ ملاحظة: تُستثنى بطاقات الهدايا في السلة من احتساب خصم العملات."
                          : "ℹ️ Note: Gift cards in cart are excluded from coins discount."}
                      </div>
                    )}

                    <div className="gx-sl-preset-row">
                      {[
                        { label: "25%", ratio: 0.25 },
                        { label: "50%", ratio: 0.5 },
                        { label: isAr ? "الحد الأقصى" : "Max", ratio: 1 },
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
                        placeholder={t("cart.coins_input_ph").replace("{max}", usableCoins.toLocaleString("en-US"))}
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
                        {coinBusy ? "..." : t("cart.coins_use_btn")}
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
                <span className="gx-sl-title">{t("cart.credit_title")}</span>
              </div>
              <div className="gx-sl-head-right">
                {cart.creditJOD > 0 ? (
                  <span className="gx-sl-badge active credit">{t("cart.credit_applied_badge")} (-{format(cart.creditJOD)})</span>
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
                      <span className="gx-sl-applied-sub">{t("cart.credit_applied_desc")}</span>
                    </div>
                    <button
                      type="button"
                      className="gx-sl-remove-link"
                      onClick={() => { cart.removeCredit(); setCreditMsg(null); }}
                    >
                      {t("cart.credit_cancel_btn")}
                    </button>
                  </div>
                ) : usableCredit > 0 ? (
                  <div className="gx-sl-action-box">
                    <div className="gx-sl-hint">
                      {t("cart.credit_can_use").replace("{amount}", format(usableCredit))}
                    </div>

                    <div className="gx-cb-row">
                      <input
                        className="gx-cb-input"
                        type="number"
                        min={0.01}
                        step={0.01}
                        max={usableCredit}
                        placeholder={t("cart.credit_input_ph").replace("{max}", format(usableCredit))}
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
                        {creditBusy ? "..." : t("cart.credit_use_btn")}
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
                      {t("cart.credit_use_all_btn").replace("{amount}", format(usableCredit))}
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
  isAdmin,
  onBack,
}: {
  paymentMethod: "cliq" | "binance_pay";
  setPaymentMethod: (m: "cliq" | "binance_pay") => void;
  isJordan: boolean;
  isAdmin?: boolean;
  onBack: () => void;
}) {
  const { t, dir, lang } = useLang();
  const isAr = lang !== "en";

  return (
    <div className="gx-payment-stage-wrapper">
      {/* Clean Header with Back Link (Right-pointing arrow in RTL, Left in LTR) */}
      <div className="gx-pm-header">
        <div className="gx-pm-header-info">
          <h2>{t("cart.payment_method_title")}</h2>
        </div>
        <button type="button" className="gx-pm-back-pill" onClick={onBack}>
          <span className="gx-arr">{dir === "rtl" ? "→" : "←"}</span> {t("cart.shopping_cart")}
        </button>
      </div>

      {/* Payment Selection List (Spacious & Cleanly Separated) */}
      <div className="gx-pm-tiles-list">
        {/* CliQ Option (Jordan or Admin only) */}
        {(isJordan || isAdmin) && (
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
              </div>
              <p className="gx-pm-desc">{t("cart.method_cliq_desc")}</p>
            </div>

            {/* Official CliQ Logo in pristine white container */}
            <div className="gx-pm-logo cliq">
              <img src="/app/assets/img/cliq-logo.png" alt="CliQ" />
            </div>
          </div>
        )}

        {/* Binance Pay Option (International or Admin only) */}
        {(!isJordan || isAdmin) && (
          <div
            className={"gx-pm-tile " + (paymentMethod === "binance_pay" ? "active" : "")}
            onClick={() => setPaymentMethod("binance_pay")}
          >
            <div className="gx-pm-radio">
              <div className="gx-pm-radio-ring">
                <div className="gx-pm-radio-inner" />
              </div>
            </div>

            <div className="gx-pm-info">
              <div className="gx-pm-name-row">
                <span className="gx-pm-name">{t("cart.method_binance")}</span>
              </div>
              <p className="gx-pm-desc">{t("cart.method_binance_desc")}</p>
            </div>

            {/* Binance Pay Logo */}
            <div className="gx-pm-logo binance" style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "10px", background: "#0b0e11", border: "1px solid rgba(240, 185, 11, 0.25)", overflow: "hidden", padding: 6 }}>
              <img src="/app/assets/img/binance-logo.svg" alt="Binance Pay" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Stage 2 Left Column: Order Recap & Complete Payment */
function CartOrderRecapStage2({
  paymentMethod,
  isJordan,
  isAdmin,
  onEditEmail,
  onConfirmed,
}: {
  paymentMethod: "cliq" | "binance_pay";
  isJordan: boolean;
  isAdmin?: boolean;
  onEditEmail: () => void;
  onConfirmed: (data: { orderNumber: string; waUrl: string | null; paymentMethod?: "cliq" | "binance_pay"; orderToken?: string }) => void;
}) {
  const cart = useCart();
  const { format } = useCurrency();
  const { t, lang, dir } = useLang();
  const isAr = lang !== "en";
  const [busy, setBusy] = useState(false);
  const [showFeeInfo, setShowFeeInfo] = useState(false);
  const [binanceOrderId, setBinanceOrderId] = useState("");
  const [binanceError, setBinanceError] = useState(false);
  const [copiedBinanceId, setCopiedBinanceId] = useState(false);
  const site = useSiteSettings();
  const [signedInUser, setSignedInUser] = useState<{ id: string; email: string } | null>(() => readStoredUser());

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        const uEmail = data.session.user.email || "";
        setSignedInUser({ id: data.session.user.id, email: uEmail });
        if (uEmail && !cart.contact.email) {
          cart.setContact({ email: uEmail });
        }
      }
    });
  }, [cart]);

  const netBeforeFee = Math.max(
    0,
    cart.subtotalJOD -
      (cart.coupon?.discount_jod ?? 0) -
      (cart.coins?.discount_jod ?? 0) -
      cart.creditJOD
  );

  const binanceFeeJOD =
    paymentMethod === "binance_pay" && netBeforeFee > 0
      ? Math.round(netBeforeFee * 0.03 * 1000) / 1000
      : 0;

  const finalTotalJOD = Math.round((netBeforeFee + binanceFeeJOD) * 1000) / 1000;
  const finalTotalUSDT = (finalTotalJOD * 1.41).toFixed(2);

  async function handleCheckout() {
    if (site.maintenance_mode) {
      const { toast } = await import("sonner");
      toast.error(site.maintenance_message || (lang === "ar" ? "الموقع تحت الصيانة حالياً" : "The store is currently under maintenance"));
      return;
    }
    if (paymentMethod === "binance_pay" && !binanceOrderId.trim()) {
      setBinanceError(true);
      const { toast } = await import("sonner");
      toast.error(isAr ? "يرجى إدخال رقم الـ Order ID الخاص ببايننس باي" : "Please enter your Binance Pay Order ID");
      return;
    }
    setBinanceError(false);
    setBusy(true);
    try {
      const submitted = await cart.submitOrder(paymentMethod, binanceOrderId.trim() || null);
      if (!submitted?.order_number) {
        const { toast } = await import("sonner");
        toast.error(t("cart.checkout_saving"));
        return;
      }
      const orderNumber = submitted.order_number;
      const url = cart.buildWhatsAppUrl(orderNumber, paymentMethod);
      cart.clear();

      if (paymentMethod === "binance_pay") {
        if (submitted.order_token) {
          window.location.href = `/order/completed?order_token=${encodeURIComponent(submitted.order_token)}`;
        } else {
          window.location.href = `/order/${orderNumber}`;
        }
        return;
      }

      onConfirmed({ orderNumber, waUrl: url, paymentMethod, orderToken: submitted.order_token });
    } catch (e) {
      const { toast } = await import("sonner");
      const msg = e instanceof Error ? e.message : String(e ?? "");
      toast.error(msg || t("cart.checkout_saving"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="summary-card gx-checkout-summary-card">
      <h3 className="gx-summary-title">{t("cart.order_recap")}</h3>

      {/* Compact items list in recap */}
      <div className="gx-recap-items">
        {cart.items.map((it) => {
          const deliveryInfo = getDeliveryTypeInfo(
            {
              slug: it.product,
              cartId: it.cartId,
              name: it.name,
              productType: it.deliveryType,
            },
            lang
          );
          return (
            <div key={it.cartId} className="gx-recap-line">
              <div className="gx-rl-thumb">
                <CartItemThumb item={it} size={36} />
              </div>
              <div className="gx-rl-name">
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <span>{localizeResolvedName(it.name, lang)}</span>
                  <small style={{ color: "#00e5ff", fontWeight: 600, fontSize: "11px" }}>• {deliveryInfo.label}</small>
                </div>
                <small>× {it.qty}</small>
              </div>
              <div className="gx-rl-price">{format(it.price * it.qty)}</div>
            </div>
          );
        })}
      </div>

      {/* Email recap: signed in user's email takes top priority */}
      {(signedInUser?.email || cart.contact.email) && (
        <div className="gx-recap-email-box">
          <div className="gx-reb-left">
            <span className="gx-reb-lbl">{t("cart.email_label")}:</span>
            <span className="gx-reb-val" dir="ltr">{signedInUser?.email || cart.contact.email}</span>
          </div>
          {!signedInUser && (
            <button type="button" className="gx-reb-edit" onClick={onEditEmail}>
              {t("cart.edit")}
            </button>
          )}
        </div>
      )}

      {/* WhatsApp phone recap */}
      {cart.contact.phone && (
        <div className="gx-recap-email-box" style={{ marginTop: 6 }}>
          <div className="gx-reb-left">
            <span className="gx-reb-lbl">🟢 {isAr ? "رقم الواتساب:" : "WhatsApp:"}</span>
            <span className="gx-reb-val" dir="ltr">{getFormattedInternationalPhone(cart.contact.phone, cart.contact.countryCode)}</span>
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

        {/* Binance Pay Processing Fee (3% with info button) */}
        {paymentMethod === "binance_pay" && (
          <div className="summary-line gx-fee-summary-line" style={{ color: "#38bdf8" }}>
            <div className="gx-fee-label-col">
              <span>{isAr ? "رسوم الخدمة" : "Service Fee"}</span>
              <button
                type="button"
                className="gx-fee-q-btn"
                onClick={() => setShowFeeInfo(true)}
                aria-label={isAr ? "شرح رسوم الخدمة" : "Service fee info"}
                title={isAr ? "اضغط لمعرفة سبب وتفاصيل رسوم الخدمة" : "Click to view service fee details"}
              >
                ?
              </button>
            </div>
            <span className="gx-fee-val">+{format(binanceFeeJOD)}</span>
          </div>
        )}

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
          <span className="val">{format(finalTotalJOD)}</span>
        </div>

        {/* Total Payable in USDT for Binance Pay */}
        {paymentMethod === "binance_pay" && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: "10px", background: "rgba(240, 185, 11, 0.12)", border: "1px solid rgba(240, 185, 11, 0.35)", marginTop: 10 }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#f0b90b" }}>
              {isAr ? "المبلغ المطلوب بـ USDT:" : "Total in USDT:"}
            </span>
            <span style={{ fontSize: "17px", fontWeight: 900, color: "#fff", letterSpacing: "0.5px" }}>
              {finalTotalUSDT} USDT
            </span>
          </div>
        )}
      </div>

      {/* Interactive Binance Pay Card with ID, Link, and Order ID Input */}
      {paymentMethod === "binance_pay" && (
        <div style={{ marginTop: 14, padding: "14px", borderRadius: "12px", background: "linear-gradient(145deg, rgba(240, 185, 11, 0.08), rgba(11, 14, 17, 0.85))", border: "1px solid rgba(240, 185, 11, 0.28)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: "11px", color: "#f0b90b", fontWeight: 700, textTransform: "uppercase" }}>
                {isAr ? "معرّف بايننس باي (Pay ID)" : "Binance Pay ID"}
              </div>
              <div style={{ fontSize: "19px", fontWeight: 900, color: "#fff", letterSpacing: "1px", marginTop: "2px" }}>
                835207366
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText("835207366");
                setCopiedBinanceId(true);
                setTimeout(() => setCopiedBinanceId(false), 2000);
              }}
              style={{ padding: "6px 12px", borderRadius: "8px", background: copiedBinanceId ? "#10b981" : "rgba(240, 185, 11, 0.2)", color: copiedBinanceId ? "#fff" : "#f0b90b", border: "1px solid rgba(240, 185, 11, 0.4)", cursor: "pointer", fontSize: "12px", fontWeight: 700 }}
            >
              {copiedBinanceId ? (isAr ? "تم النسخ ✓" : "Copied ✓") : (isAr ? "نسخ الـ ID 📋" : "Copy ID 📋")}
            </button>
          </div>

          <a
            href="https://www.binance.com/en/my/wallet/account/payment"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", padding: "10px", borderRadius: "8px", background: "#f0b90b", color: "#000", fontWeight: 800, fontSize: "13px", textDecoration: "none", marginBottom: 14 }}
          >
            <span>{isAr ? "فتح صفحة Binance Pay للدفع المباشر ↗" : "Open Binance Pay to Pay ↗"}</span>
          </a>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>
              {isAr ? "أدخل رقم الـ Order ID من بايننس بعد التحويل *" : "Enter Binance Order ID after transfer *"}
            </label>
            <input
              type="text"
              dir="ltr"
              placeholder={isAr ? "مثال: 1234567890..." : "e.g. 1234567890..."}
              value={binanceOrderId}
              onChange={(e) => {
                setBinanceOrderId(e.target.value);
                if (binanceError) setBinanceError(false);
              }}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: binanceError ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.18)", color: "#fff", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
            />
            {binanceError && (
              <span style={{ display: "block", color: "#ef4444", fontSize: "11px", marginTop: 4 }}>
                {isAr ? "يرجى إدخال رقم الـ Order ID لتأكيد الدفع" : "Please enter your Binance Order ID"}
              </span>
            )}
            <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: 6, lineHeight: 1.4 }}>
              {isAr
                ? "بعد إتمام التحويل عبر بايننس، الصق رقم الـ Order ID هنا ثم اضغط إكمال الدفع."
                : "After completing transfer via Binance, paste the Order ID here then click Complete Payment."}
            </p>
          </div>
        </div>
      )}

      {/* Primary Action Button */}
      <button
        className="btn btn-green btn-block gx-checkout-btn"
        style={{ marginTop: 16 }}
        disabled={busy || cart.items.length === 0}
        onClick={handleCheckout}
      >
        {busy
          ? t("cart.checkout_saving")
          : paymentMethod === "binance_pay"
          ? (isAr ? `إكمال الدفع (${finalTotalUSDT} USDT)` : `Complete Payment (${finalTotalUSDT} USDT)`)
          : (isAr ? "إكمال الدفع" : "Complete Payment")}
      </button>

      {/* Fee Explanation Modal */}
      {showFeeInfo && (
        <div
          className="gx-fee-modal-overlay"
          onClick={() => setShowFeeInfo(false)}
        >
          <div
            className="gx-fee-modal-card"
            onClick={(e) => e.stopPropagation()}
            dir={dir}
          >
            <div className="gx-fee-modal-head">
              <div className="gx-fee-modal-title">
                <span style={{ fontSize: 20 }}>⚙️</span>
                <h4>{isAr ? "رسوم خدمة المعالجة (Binance Pay)" : "Binance Pay Processing Fee"}</h4>
              </div>
              <button
                type="button"
                className="gx-fee-close-btn"
                onClick={() => setShowFeeInfo(false)}
                aria-label={isAr ? "إغلاق" : "Close"}
              >
                ✕
              </button>
            </div>

            <div className="gx-fee-modal-body">
              <p>
                {isAr
                  ? "تُفرض هذه الرسوم بنسبة 3% لتغطية تكاليف معالجة التحويلات الرقمية وضمان تأكيد وسرعة معالجة الطلبات الدولية عبر شبكة بايننس باي (Binance Pay)."
                  : "This 3% fee covers digital transaction processing and instant confirmation across Binance Pay for international orders."}
              </p>
              <div className="gx-fee-calc-box">
                <div className="gx-fee-calc-row">
                  <span>{isAr ? "نسبة المعالجة:" : "Processing Rate:"}</span>
                  <strong>3%</strong>
                </div>
              </div>
            </div>

            <div className="gx-fee-modal-footer">
              <button
                type="button"
                className="gx-fee-confirm-btn"
                onClick={() => setShowFeeInfo(false)}
              >
                {isAr ? "فهمت ذلك" : "Got it"}
              </button>
            </div>
          </div>
        </div>
      )}
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
.gx-checkout-grid{display:grid;grid-template-columns:1fr 370px;gap:24px;align-items:start}
.gx-checkout-main{display:flex;flex-direction:column;gap:20px}
.gx-checkout-side{display:flex;flex-direction:column;gap:18px}

.gx-checkout-cart-card{border-radius:18px;border:1px solid rgba(0,229,255,.16);background:linear-gradient(180deg,rgba(18,22,34,.7),rgba(10,13,22,.85))}
.gx-checkout-row{position:relative;border-bottom:1px solid rgba(255,255,255,.06)!important;padding:16px 0!important}
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
.gx-delivery-card{border-radius:18px;padding:18px;border:1px solid rgba(0,229,255,.16);background:linear-gradient(180deg,rgba(18,22,34,.7),rgba(10,13,22,.85));box-shadow:0 10px 30px -8px rgba(0,0,0,.45)}
.gx-dc-title{display:flex;align-items:center;gap:8px;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,.06)}
.gx-dc-title h3{margin:0;font-size:15px;font-weight:900;color:#f1f5f9}
.gx-remember-row{display:flex;align-items:center;gap:8px;font-size:12.5px;color:#cbd5e1;cursor:pointer;margin-top:8px}
.gx-remember-row input{width:16px;height:16px;accent-color:#00e5ff;cursor:pointer}
.gx-signedin-email-row{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:10px}
.cr-edit-target-box input{background:rgba(255,255,255,.05);border:1px solid rgba(0,229,255,.3);border-radius:6px;color:#f1f5f9}
.cr-edit-target-box input:focus{border-color:#00e5ff;outline:none}
.gx-contact-label{position:relative;z-index:100}
.gx-help-tooltip-wrap{position:relative;display:inline-flex;align-items:center;cursor:pointer;z-index:100}
.gx-help-icon{font-size:13px;line-height:1;opacity:.9;transition:transform .2s,opacity .2s;display:inline-block}
.gx-help-tooltip-wrap:hover .gx-help-icon{opacity:1;transform:scale(1.15)}
.gx-help-tooltip-popover{position:absolute;bottom:calc(100% + 8px);left:0;width:270px;background:#0b1120!important;background-color:#0b1120!important;border:1px solid #00e5ff!important;box-shadow:0 14px 35px rgba(0,0,0,.95);color:#f8fafc;font-size:11.5px;font-weight:600;line-height:1.55;padding:10px 14px;border-radius:10px;pointer-events:none;opacity:0;visibility:hidden;transition:all .2s cubic-bezier(.16,1,.3,1);z-index:99999;text-align:right}
.gx-popover-arrow{position:absolute;top:100%;left:20px;border-width:6px;border-style:solid;border-color:#00e5ff transparent transparent transparent}
.gx-help-tooltip-wrap:hover .gx-help-tooltip-popover{opacity:1!important;visibility:visible;bottom:calc(100% + 6px)}

/* Summary Card */
.gx-checkout-summary-card{border-radius:18px;padding:18px;border:1px solid rgba(0,229,255,.16);background:linear-gradient(180deg,rgba(18,22,34,.7),rgba(10,13,22,.85))}
.gx-summary-title{margin:0 0 14px;font-size:16px;font-weight:900;color:#f1f5f9}
.gx-checkout-cta{background:linear-gradient(135deg,#00e5ff,#00b4d8)!important;color:#020b14!important;font-weight:900!important;font-size:15.5px!important;padding:13px!important;border-radius:12px!important;box-shadow:0 8px 24px -4px rgba(0,229,255,.5)!important}
.gx-checkout-cta:hover{transform:translateY(-1px);box-shadow:0 10px 28px -4px rgba(0,229,255,.65)!important}

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

/* Service Fee Line & Info Tooltip / Modal */
.gx-fee-summary-line {
  background: rgba(56, 189, 248, 0.05);
  border-radius: 8px;
  padding: 4px 8px;
  margin: 2px -8px;
}
.gx-fee-label-col {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.gx-fee-q-btn {
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  border: 1.5px solid rgba(255, 255, 255, 0.35);
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: all 0.2s ease;
}
.gx-fee-q-btn:hover {
  background: rgba(0, 229, 255, 0.25);
  border-color: #00e5ff;
  color: #00e5ff;
  box-shadow: 0 0 10px rgba(0, 229, 255, 0.4);
  transform: scale(1.1);
}
.gx-fee-val {
  font-weight: 800;
}
.gx-pm-fee-pill {
  font-size: 11px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
}
.gx-pm-fee-pill.free {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.35);
}
.gx-pm-fee-pill.fee {
  background: rgba(56, 189, 248, 0.12);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.3);
}
.gx-fee-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 10060;
  background: rgba(3, 6, 15, 0.82);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: gxFadeIn 0.2s ease-out;
}
.gx-fee-modal-card {
  background: linear-gradient(160deg, #131722 0%, #0b0e17 100%);
  border: 1px solid rgba(0, 229, 255, 0.32);
  border-radius: 20px;
  padding: 24px;
  max-width: 450px;
  width: 100%;
  color: #f1f5f9;
  box-shadow: 0 25px 70px -15px rgba(0, 229, 255, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
  font-family: inherit;
  animation: gxPop 0.22s cubic-bezier(0.2, 0.9, 0.3, 1.2);
  box-sizing: border-box;
}
.gx-fee-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.gx-fee-modal-title {
  display: flex;
  align-items: center;
  gap: 10px;
}
.gx-fee-modal-title h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #ffffff;
}
.gx-fee-close-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}
.gx-fee-close-btn:hover {
  background: rgba(255, 84, 112, 0.2);
  color: #ff5470;
  border-color: rgba(255, 84, 112, 0.4);
}
.gx-fee-modal-body p {
  font-size: 13.5px;
  line-height: 1.65;
  color: #cbd5e1;
  margin: 0 0 14px;
}
.gx-fee-calc-box {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px 14px;
  margin-bottom: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.gx-fee-calc-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: #94a3b8;
}
.gx-fee-calc-row strong {
  color: #00e5ff;
  font-weight: 800;
}
.gx-fee-tip-box {
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.25);
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.gx-fee-tip-box p {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.55;
  color: #6ee7b7;
  font-weight: 600;
}
.gx-fee-confirm-btn {
  width: 100%;
  margin-top: 18px;
  padding: 12px;
  border-radius: 12px;
  background: linear-gradient(135deg, #00e5ff, #3b82f6);
  border: none;
  color: #020817;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 6px 20px -4px rgba(0, 229, 255, 0.4);
}
.gx-fee-confirm-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 25px -4px rgba(0, 229, 255, 0.6);
}

.cart-list-card, .gx-checkout-cart-card, .cart-row, .gx-checkout-row {
  overflow: visible !important;
}

@media (max-width:900px){
  .gx-checkout-grid{grid-template-columns:1fr}
  .gx-stepper-container{padding:10px 14px !important}
  .gx-pm-tile{padding:16px 18px;gap:14px}
  .gx-pm-logo{min-width:90px;height:38px}
}
`;
