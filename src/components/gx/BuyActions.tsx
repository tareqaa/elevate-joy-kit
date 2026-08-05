import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useCart } from "@/lib/gx/cart";
import { useLang } from "@/lib/gx/i18n";
import { CART_ADDED_EVENT } from "./AddedToCartModal";

export function BuyActions({ cartId }: { cartId: string }) {
  const cart = useCart();
  const { t } = useLang();
  const navigate = useNavigate();
  const [added, setAdded] = useState(false);
  return (
    <div className="buy-actions">
      <button
        className={`add-cart-btn ${added ? "added" : ""}`}
        type="button"
        onClick={() => {
          cart.add(cartId);
          setAdded(true);
          window.dispatchEvent(new CustomEvent(CART_ADDED_EVENT));
          setTimeout(() => setAdded(false), 1200);
        }}
      >
        {added ? t("buy.added") : t("buy.add")}
      </button>
      <button className="buy-now-btn" type="button" onClick={() => { cart.buyNow(cartId); navigate({ to: "/cart" }); }}>
        {t("buy.buy_now")}
      </button>
    </div>
  );
}
