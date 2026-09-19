import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useCart } from "@/lib/gx/cart";
import { useLang } from "@/lib/gx/i18n";
import { CART_ADDED_EVENT } from "./AddedToCartModal";

export function BuyActions({ cartId, meta }: { cartId: string; meta?: Record<string, any> }) {
  const cart = useCart();
  const { t } = useLang();
  const navigate = useNavigate();
  const [added, setAdded] = useState(false);
  return (
    <div className="buy-actions">
      <button
        className={`add-cart-btn ${added ? "added" : ""}`}
        type="button"
        title={added ? t("buy.added") : t("buy.add")}
        aria-label={added ? t("buy.added") : t("buy.add")}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          cart.add(cartId, 1, meta);
          setAdded(true);
          window.dispatchEvent(new CustomEvent(CART_ADDED_EVENT));
          setTimeout(() => setAdded(false), 1200);
        }}
      >
        <span className="cart-btn-icon" aria-hidden="true">
          {added ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          )}
        </span>
        <span className="cart-btn-label">{added ? t("buy.added") : t("buy.add")}</span>
      </button>
      <button
        className="buy-now-btn"
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          cart.buyNow(cartId, 1, meta);
          navigate({ to: "/cart" });
        }}
      >
        {t("buy.buy_now")}
      </button>
    </div>
  );
}
