import { createFileRoute, Link } from "@tanstack/react-router";
import { StoreShell } from "@/components/gx/StoreShell";
import { useCart } from "@/lib/gx/cart";
import { useCurrency } from "@/lib/gx/currency";
import { useState } from "react";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "السلة — GX Store" },
      { name: "description", content: "راجع طلبك قبل إتمامه — GX Store." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  return (
    <StoreShell>
      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <div><span className="k">سلة المشتريات</span><h2>راجع طلبك قبل ما ترسله</h2></div>
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
  if (cart.items.length === 0) {
    return (
      <div className="cart-list-card">
        <div className="empty-cart">
          <div className="ec-icon">🛒</div>
          <h3>السلة فاضية</h3>
          <p>لسا ما ضفت أي منتج — تصفح المنتجات وابدأ التسوق.</p>
          <Link to="/" className="btn btn-primary">تصفح المنتجات</Link>
        </div>
      </div>
    );
  }
  return (
    <div className="cart-list-card">
      <div className="cart-list-head">
        <h2>منتجات السلة ({cart.count})</h2>
        <span className="clear-link" onClick={() => { if (confirm("متأكد بدك تفرّغ السلة؟")) cart.clear(); }}>إفراغ السلة</span>
      </div>
      {cart.items.map(it => {
        const isSnap = it.cartId.startsWith("snap-");
        return (
          <div key={it.cartId} className="cart-row">
            <div className="cr-thumb" style={{ background: it.bg }}>{it.icon}</div>
            <div className="cr-info">
              <div className="cr-name">{it.name}</div>
              <div className="cr-unit">سعر الوحدة: <span>{format(it.price)}</span></div>
              {isSnap && it.usernames && it.usernames.length > 0 && (
                <div className="cr-users">
                  <span className="cr-users-label">اليوزرات:</span>{" "}
                  {it.usernames.map((u, i) => <span key={i} className="cr-user-chip">@{u}</span>)}
                </div>
              )}
              {isSnap && (
                <div className="cr-lock-hint">
                  لإضافة حساب جديد بيوزر، <a href="/app/snapchat/index.html">افتح صفحة سناب بلس</a>
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
      <h3>ملخص الطلب</h3>
      <div className="summary-line"><span>عدد المنتجات</span><span>{cart.count}</span></div>
      <div className="summary-total">
        <span className="lbl">الإجمالي</span>
        <span className="val">{format(cart.totalJOD)}</span>
      </div>
      <div className="notes-field">
        <label>ملاحظات إضافية (اختياري)</label>
        <textarea placeholder="أي طلب خاص أو تفاصيل إضافية..." value={cart.notes} onChange={(e) => cart.setNotes(e.target.value)} />
        <div className="hint">اليوزرات محفوظة تلقائياً مع كل حساب سناب — هون بس للملاحظات الإضافية.</div>
      </div>
      <button className="btn btn-green btn-block" disabled={busy} onClick={checkout}>
        {busy ? "⏳ جاري الحفظ..." : "إتمام الطلب عبر واتساب"}
      </button>
    </div>
  );
}
