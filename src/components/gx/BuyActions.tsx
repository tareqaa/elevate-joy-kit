import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useCart } from "@/lib/gx/cart";
import { useLang } from "@/lib/gx/i18n";
import { CART_ADDED_EVENT } from "./AddedToCartModal";
import { triggerRequirementPrompt } from "./QuickRequirementModal";
import {
  resolveProductRequirementType,
  getRememberedWhatsApp,
  getRememberedEmail,
} from "@/lib/gx/contact-storage";

export function BuyActions({ cartId, meta }: { cartId: string; meta?: Record<string, any> }) {
  const cart = useCart();
  const { t } = useLang();
  const navigate = useNavigate();
  const [added, setAdded] = useState(false);

  const handleAction = (action: "add" | "buy", e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const req = resolveProductRequirementType({
      slug: meta?.product || cartId,
      name: meta?.name,
      deliveryType: meta?.deliveryType,
      identifierLabelAr: meta?.identifierLabelAr,
      requiresPlayerId: meta?.requiresPlayerId,
    });

    if (req === "whatsapp") {
      const savedPhone = getRememberedWhatsApp();
      if (savedPhone) {
        const mergedMeta = { ...(meta || {}), usernames: [savedPhone] };
        if (action === "buy") {
          cart.buyNow(cartId, 1, mergedMeta);
          navigate({ to: "/cart" });
        } else {
          cart.add(cartId, 1, mergedMeta);
          setAdded(true);
          window.dispatchEvent(new CustomEvent(CART_ADDED_EVENT));
          setTimeout(() => setAdded(false), 1200);
        }
        return;
      }

      // Prompt for WhatsApp phone number
      triggerRequirementPrompt({
        cartId,
        meta,
        action,
        requirementType: "whatsapp",
        productName: meta?.name,
      });
      return;
    }

    if (req === "email") {
      // Always prompt for Email so the user explicitly enters/confirms which account to receive the invite
      triggerRequirementPrompt({
        cartId,
        meta,
        action,
        requirementType: "email",
        productName: meta?.name,
      });
      return;
    }

    if (req === "link" || req === "id") {
      triggerRequirementPrompt({
        cartId,
        meta,
        action,
        requirementType: req,
        productName: meta?.name,
      });
      return;
    }

    // Direct product without requirements
    if (action === "buy") {
      cart.buyNow(cartId, 1, meta);
      navigate({ to: "/cart" });
    } else {
      cart.add(cartId, 1, meta);
      setAdded(true);
      window.dispatchEvent(new CustomEvent(CART_ADDED_EVENT));
      setTimeout(() => setAdded(false), 1200);
    }
  };

  return (
    <div className="buy-actions">
      <button
        className={`add-cart-btn ${added ? "added" : ""}`}
        type="button"
        title={added ? t("buy.added") : t("buy.add")}
        aria-label={added ? t("buy.added") : t("buy.add")}
        onClick={(e) => handleAction("add", e)}
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
        onClick={(e) => handleAction("buy", e)}
      >
        {t("buy.buy_now")}
      </button>
    </div>
  );
}
