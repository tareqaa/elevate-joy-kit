import { useState } from "react";
import { useCart } from "@/lib/gx/cart";
import { useLang } from "@/lib/gx/i18n";

export function BuyActions({ cartId }: { cartId: string }) {
  const cart = useCart();
  const { t } = useLang();
  const [added, setAdded] = useState(false);
  return (
    <div className="buy-actions">
      <button
        className={`add-cart-btn ${added ? "added" : ""}`}
        type="button"
        onClick={() => {
          cart.add(cartId);
          setAdded(true);
          setTimeout(() => setAdded(false), 1200);
        }}
      >
        {added ? t("buy.added") : t("buy.add")}
      </button>
      <button className="buy-now-btn" type="button" onClick={() => cart.buyNow(cartId)}>
        {t("buy.buy_now")}
      </button>
    </div>
  );
}
