import { useState } from "react";
import { useCart } from "@/lib/gx/cart";

export function BuyActions({ cartId }: { cartId: string }) {
  const cart = useCart();
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
        {added ? "✓ أضيفت" : "🛒 أضف للسلة"}
      </button>
      <button className="buy-now-btn" type="button" onClick={() => cart.buyNow(cartId)}>
        ⚡ اشتري الآن
      </button>
    </div>
  );
}
