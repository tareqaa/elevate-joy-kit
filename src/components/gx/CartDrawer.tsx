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

  async function checkout() {
    const submitted = await cart.submitOrder();
    const url = cart.buildWhatsAppUrl(submitted?.order_number);
    if (submitted) cart.clear();
    if (url) window.open(url, "_blank");
  }


  return (
    <>
      <div className={"overlay" + (cart.isDrawerOpen ? " open" : "")} onClick={cart.closeDrawer} />
      <div className={"cart-drawer" + (cart.isDrawerOpen ? " open" : "")}>
        <div className="cart-head">
          <h3>{t("cart.title")}</h3>
          <div className="cart-close" onClick={cart.closeDrawer}>✕</div>
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
          <button className="checkout-btn" disabled={cart.items.length === 0} onClick={checkout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.36 5.07L2 22l5.06-1.33A9.94 9.94 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/></svg>
            {t("cart.checkout_wa")}
          </button>
          <Link to="/cart" className="view-cart-link" onClick={cart.closeDrawer}>{t("cart.open_full")}</Link>
        </div>
      </div>
    </>
  );
}
