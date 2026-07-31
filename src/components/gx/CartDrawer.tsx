import { useEffect } from "react";
import { useCart } from "@/lib/gx/cart";
import { useCurrency } from "@/lib/gx/currency";
import { useLang } from "@/lib/gx/i18n";
import { localizeResolvedName } from "@/lib/gx/product-locale";
import { Link } from "@tanstack/react-router";

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
          <h3>{t("cart.title")}</h3>
          <button type="button" className="cart-close" onClick={cart.closeDrawer} aria-label={t("common.close")} title={t("common.close")}>✕</button>
        </div>
        <div className="cart-items">
          {cart.items.length === 0 ? (
            <div className="cart-empty">{t("cart.empty_drawer")}</div>
          ) : (
            cart.items.map(it => {
              const isSnap = it.cartId.startsWith("snap-");
              return (
                <div key={it.cartId} className="cart-item">
                  <div className="ci-thumb" style={{ background: it.bg }}>{it.icon}</div>
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
          {cart.items.length > 0 && (
            <button
              type="button"
              className="cart-clear-link"
              onClick={() => {
                if (window.confirm(lang === "ar" ? "هل تريد حذف كل المنتجات من السلة؟" : "Remove all items from your cart?")) cart.clear();
              }}
            >
              {lang === "ar" ? "🗑️ حذف كل المنتجات" : "🗑️ Clear cart"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
