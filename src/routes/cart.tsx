import { createFileRoute, Link } from "@tanstack/react-router";
import { StoreShell } from "@/components/gx/StoreShell";
import { useCart } from "@/lib/gx/cart";
import { useCurrency } from "@/lib/gx/currency";
import { useLang } from "@/lib/gx/i18n";
import { localizeResolvedName } from "@/lib/gx/product-locale";
import { useState } from "react";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Cart — GX Store" },
      { name: "description", content: "Review your order before checking out — GX Store." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { t } = useLang();
  return (
    <StoreShell>
      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <div><span className="k">{t("cart.title")}</span><h2>{t("cart.subtitle")}</h2></div>
          </div>
          <div className="cart-page-grid">
            <CartList />
            <CartSummary />
          </div>
        </div>
      </section>
    </StoreShell>
  );
}

function CartList() {
  const cart = useCart();
  const { format } = useCurrency();
  const { t, lang } = useLang();
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
    <div className="cart-list-card">
      <div className="cart-list-head">
        <h2>{t("cart.list_head")} ({cart.count})</h2>
        <span className="clear-link" onClick={() => { if (confirm(t("cart.confirm_clear"))) cart.clear(); }}>{t("cart.clear")}</span>
      </div>
      {cart.items.map(it => {
        const isSnap = it.cartId.startsWith("snap-");
        return (
          <div key={it.cartId} className="cart-row">
            <div className="cr-thumb" style={{ background: it.bg }}>{it.icon}</div>
            <div className="cr-info">
              <div className="cr-name">{localizeResolvedName(it.name, lang)}</div>
              <div className="cr-unit">{t("cart.unit_price")}: <span>{format(it.price)}</span></div>
              {isSnap && it.usernames && it.usernames.length > 0 && (
                <div className="cr-users">
                  <span className="cr-users-label">{t("cart.users_label")}</span>{" "}
                  {it.usernames.map((u, i) => <span key={i} className="cr-user-chip">@{u}</span>)}
                </div>
              )}
              {isSnap && (
                <div className="cr-lock-hint">
                  {t("cart.add_snap_hint_a")} <Link to="/snapchat">{t("cart.add_snap_hint_b")}</Link>
                </div>
              )}
            </div>
            <div className="cr-qty">
              <button onClick={() => cart.changeQty(it.cartId, -1)}>−</button>
              <span>{it.qty}</span>
              <button disabled={isSnap} onClick={() => cart.changeQty(it.cartId, 1)}>+</button>
            </div>
            <div className="cr-price">{format(it.price * it.qty)}</div>
            <button className="cr-remove" onClick={() => cart.remove(it.cartId)}>✕</button>
          </div>
        );
      })}
    </div>
  );
}

function CartSummary() {
  const cart = useCart();
  const { format } = useCurrency();
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  if (cart.items.length === 0) return null;

  async function checkout() {
    setBusy(true);
    try {
      const submitted = await cart.submitOrder();
      const url = cart.buildWhatsAppUrl(submitted?.order_number);
      if (submitted) cart.clear();
      if (url) window.open(url, "_blank");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="summary-card">
      <h3>{t("cart.summary")}</h3>
      <div className="summary-line"><span>{t("cart.item_count")}</span><span>{cart.count}</span></div>
      <div className="summary-total">
        <span className="lbl">{t("cart.total")}</span>
        <span className="val">{format(cart.totalJOD)}</span>
      </div>
      <div className="notes-field">
        <label>{t("cart.notes_label")}</label>
        <textarea placeholder={t("cart.notes_placeholder")} value={cart.notes} onChange={(e) => cart.setNotes(e.target.value)} />
        <div className="hint">{t("cart.notes_hint")}</div>
      </div>
      <button className="btn btn-green btn-block" disabled={busy} onClick={checkout}>
        {busy ? t("cart.checkout_saving") : t("cart.checkout_wa")}
      </button>
    </div>
  );
}
