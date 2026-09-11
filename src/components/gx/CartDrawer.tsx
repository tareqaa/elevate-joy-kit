import { useEffect } from "react";
import { useCart } from "@/lib/gx/cart";
import { useCurrency } from "@/lib/gx/currency";
import { useLang } from "@/lib/gx/i18n";
import { localizeResolvedName } from "@/lib/gx/product-locale";
import { CartItemThumb } from "@/components/gx/CartThumb";
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";

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

  return (
    <>
      <div className={"overlay" + (cart.isDrawerOpen ? " open" : "")} onClick={cart.closeDrawer} />
      <div className={"cart-drawer" + (cart.isDrawerOpen ? " open" : "")}>
        <div className="cart-head">
          <div className="cart-head-title-wrap">
            <span className="cart-head-icon">🛒</span>
            <h3>{t("cart.title")}</h3>
          </div>
          <button
            type="button"
            className="cart-close"
            onClick={cart.closeDrawer}
            aria-label={t("common.close")}
            title={t("common.close")}
          >
            <X size={19} strokeWidth={2.4} />
          </button>
        </div>
        <div className="cart-items">
          {cart.items.length === 0 ? (
            <div className="cart-empty">{t("cart.empty_drawer")}</div>
          ) : (
            cart.items.map(it => {
              const isSnap = it.cartId.startsWith("snap-");
              return (
                <div key={it.cartId} className="cart-item">
                  <CartItemThumb item={it} size={52} />
                  <div className="ci-info">
                    <div className="ci-name">{localizeResolvedName(it.name, lang)}</div>
                    <div className="ci-price">{format(it.price)}</div>
                    <div className="qty-ctrl">
                      <button onClick={() => cart.changeQty(it.cartId, -1)}>−</button>
                      <span>{it.qty}</span>
                      <button disabled={isSnap} onClick={() => cart.changeQty(it.cartId, 1)}>+</button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="cart-footer">
          <div className="cart-total-row">
            <span className="lbl">{t("cart.total")}</span>
            <span className="val">{format(cart.totalJOD)}</span>
          </div>
          <Link to="/cart" className="checkout-btn" onClick={cart.closeDrawer} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, textDecoration: "none" }}>
            {t("cart.checkout_wa")}
          </Link>
          <button
            type="button"
            className="cart-continue-shopping-btn"
            onClick={cart.closeDrawer}
          >
            {lang === "ar" ? "← متابعة التسوق" : "Continue Shopping →"}
          </button>
          {cart.items.length > 0 && (
            <button type="button" className="cart-clear-link" onClick={() => cart.clear()}>
              {lang === "ar" ? "تفريغ السلة" : "Clear cart"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
