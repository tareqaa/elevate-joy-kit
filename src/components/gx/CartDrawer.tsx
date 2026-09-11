import { useEffect } from "react";
import { useCart } from "@/lib/gx/cart";
import { useCurrency } from "@/lib/gx/currency";
import { useLang } from "@/lib/gx/i18n";
import { localizeResolvedName } from "@/lib/gx/product-locale";
import { CartItemThumb } from "@/components/gx/CartThumb";
import { Link } from "@tanstack/react-router";
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";

export function CartDrawer() {
  const cart = useCart();
  const { format } = useCurrency();
  const { t, lang } = useLang();

  useEffect(() => {
    if (!cart.isDrawerOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") cart.closeDrawer(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [cart.isDrawerOpen, cart.closeDrawer]);

  const ArrowIcon = lang === "ar" ? ArrowLeft : ArrowRight;

  return (
    <>
      <div
        className={"overlay gx-cart-overlay" + (cart.isDrawerOpen ? " open" : "")}
        onClick={cart.closeDrawer}
      />
      <aside
        className={"cart-drawer gx-premium-cart-drawer" + (cart.isDrawerOpen ? " open" : "")}
        aria-label={t("cart.title")}
      >
        {/* Drawer Header */}
        <div className="cart-head gx-cart-head">
          <div className="cart-head-title-wrap gx-cart-title-wrap">
            <div className="gx-cart-head-icon">
              <ShoppingBag size={20} strokeWidth={2.2} />
            </div>
            <div className="gx-cart-head-meta">
              <div className="gx-cart-head-row">
                <h3 className="gx-cart-title">{t("cart.title")}</h3>
                {cart.count > 0 && (
                  <span className="gx-cart-count-chip">
                    {cart.count} {lang === "ar" ? (cart.count === 1 ? "منتج" : cart.count === 2 ? "منتجان" : "منتجات") : (cart.count === 1 ? "item" : "items")}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="cart-close gx-cart-close"
            onClick={cart.closeDrawer}
            aria-label={t("common.close")}
            title={t("common.close")}
          >
            <X size={19} strokeWidth={2.4} />
          </button>
        </div>

        {/* Scrollable Items */}
        <div className="cart-items gx-cart-items-body">
          {cart.items.length === 0 ? (
            <div className="gx-cart-empty-wrapper">
              <div className="gx-cart-empty-circle">
                <ShoppingBag size={44} strokeWidth={1.5} />
              </div>
              <h4>{lang === "ar" ? "سلة المشتريات فارغة" : "Your cart is empty"}</h4>
              <p>{lang === "ar" ? "لم تضف أي منتج بعد، تصفح أقوى العروض والألعاب الرقمية المتوفرة!" : "You haven't added any products yet. Discover the best digital games and subscriptions!"}</p>
              <button
                type="button"
                className="gx-cart-empty-cta"
                onClick={cart.closeDrawer}
              >
                {lang === "ar" ? "تصفح المتجر الآن" : "Browse Store Now"}
              </button>
            </div>
          ) : (
            <div className="gx-cart-cards-container">
              {cart.items.map((it) => {
                const isSnap = it.cartId.startsWith("snap-");
                return (
                  <div key={it.cartId} className="gx-cart-item-card">
                    {/* Item Thumbnail */}
                    <div className="gx-cart-item-thumb-box">
                      <CartItemThumb item={it} size={56} />
                    </div>

                    {/* Item Details */}
                    <div className="gx-cart-item-details">
                      <div className="gx-cart-item-header">
                        <span className="gx-cart-item-name" title={localizeResolvedName(it.name, lang)}>
                          {localizeResolvedName(it.name, lang)}
                        </span>
                        <button
                          type="button"
                          className="gx-cart-item-trash"
                          onClick={() => cart.remove(it.cartId)}
                          title={lang === "ar" ? "حذف من السلة" : "Remove item"}
                          aria-label={lang === "ar" ? "حذف من السلة" : "Remove item"}
                        >
                          <Trash2 size={15} strokeWidth={2} />
                        </button>
                      </div>

                      {/* Price & Stepper Row */}
                      <div className="gx-cart-item-footer">
                        <div className="gx-cart-item-pricing">
                          <span className="gx-cart-item-price">{format(it.price * it.qty)}</span>
                          {it.qty > 1 && (
                            <span className="gx-cart-item-single">
                              {format(it.price)} / {lang === "ar" ? "قطعة" : "ea"}
                            </span>
                          )}
                        </div>

                        <div className="gx-cart-pill-stepper">
                          <button
                            type="button"
                            className="gx-cart-stepper-btn minus"
                            onClick={() => cart.changeQty(it.cartId, -1)}
                            title={lang === "ar" ? "تقليل" : "Decrease"}
                            aria-label="Decrease quantity"
                          >
                            <Minus size={12} strokeWidth={2.6} />
                          </button>
                          <span className="gx-cart-stepper-value">{it.qty}</span>
                          <button
                            type="button"
                            className="gx-cart-stepper-btn plus"
                            disabled={isSnap}
                            onClick={() => cart.changeQty(it.cartId, 1)}
                            title={isSnap ? (lang === "ar" ? "الحد الأقصى 1" : "Max 1") : (lang === "ar" ? "زيادة" : "Increase")}
                            aria-label="Increase quantity"
                          >
                            <Plus size={12} strokeWidth={2.6} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Area */}
        {cart.items.length > 0 && (
          <div className="cart-footer gx-cart-footer-modern">
            {/* Total Price Row */}
            <div className="gx-cart-total-box">
              <span className="lbl">{t("cart.total")}</span>
              <span className="val">{format(cart.totalJOD)}</span>
            </div>

            {/* Primary Action Button */}
            <Link
              to="/cart"
              className="checkout-btn gx-cart-main-checkout-btn"
              onClick={cart.closeDrawer}
            >
              <span>{t("cart.checkout_wa")}</span>
              <ArrowIcon size={18} strokeWidth={2.4} className="gx-cart-checkout-arrow" />
            </Link>

            {/* Secondary Actions: Continue Shopping + Clear Cart */}
            <div className="gx-cart-bottom-actions">
              <button
                type="button"
                className="cart-continue-shopping-btn gx-cart-continue-clean"
                onClick={cart.closeDrawer}
              >
                {lang === "ar" ? "← متابعة التسوق" : "Continue Shopping →"}
              </button>
              <button
                type="button"
                className="cart-clear-link gx-cart-clear-clean"
                onClick={() => cart.clear()}
                title={lang === "ar" ? "تفريغ السلة" : "Clear cart"}
              >
                <Trash2 size={13} strokeWidth={2} />
                <span>{lang === "ar" ? "تفريغ السلة" : "Clear"}</span>
              </button>
            </div>

            {/* Trust badge */}
            <div className="gx-cart-trust-note">
              <ShieldCheck size={14} />
              <span>{lang === "ar" ? "دفع آمن 100% · ضمان ذهبي على جميع المنتجات" : "100% Secure Checkout · Official Warranty"}</span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
