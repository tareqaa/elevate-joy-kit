/* ============================================================
   CART PAGE — full standalone cart view at /cart/.
   Reads/writes through the same GXCart module as the drawer,
   so it always reflects the exact same state.
   ============================================================ */

function renderCartPage(){
  const resolved = GXCart.getResolvedItems();
  const listRoot = document.getElementById('cartListRoot');
  const summaryRoot = document.getElementById('summaryRoot');

  if(resolved.length === 0){
    listRoot.innerHTML = `
      <div class="cart-list-card">
        <div class="empty-cart">
          <div class="ec-icon">🛒</div>
          <h3>السلة فاضية</h3>
          <p>لسا ما ضفت أي منتج — تصفح المنتجات وابدأ التسوق.</p>
          <a href="/app/index.html" class="btn btn-primary">تصفح المنتجات</a>
        </div>
      </div>
    `;
    summaryRoot.innerHTML = '';
    return;
  }

  listRoot.innerHTML = `
    <div class="cart-list-card">
      <div class="cart-list-head">
        <h2>منتجات السلة (${GXCart.count()})</h2>
        <span class="clear-link" id="clearCartBtn">إفراغ السلة</span>
      </div>
      ${resolved.map(it => {
        const isSnap = typeof it.cartId === 'string' && it.cartId.startsWith('snap-');
        return `
        <div class="cart-row">
          <div class="cr-thumb" style="background:${it.bg};">${it.icon}</div>
          <div class="cr-info">
            <div class="cr-name">${it.name}</div>
            <div class="cr-unit">سعر الوحدة: <span data-unit="${it.price}">${GXCurrency.format(it.price)}</span></div>
            ${isSnap ? `<div class="cr-lock-hint">لتعديل عدد الحسابات واليوزرات، <a href="/app/snapchat/index.html">افتح صفحة سناب بلس</a></div>` : ''}
          </div>
          <div class="cr-qty">
            <button class="qty-minus" data-id="${it.cartId}">−</button>
            <span>${it.qty}</span>
            <button class="qty-plus" data-id="${it.cartId}" ${isSnap ? 'disabled title="لإضافة حساب جديد، ارجع لصفحة سناب بلس عشان تكتب اليوزر"' : ''}>+</button>
          </div>
          <div class="cr-price" data-line="${it.price * it.qty}">${GXCurrency.format(it.price * it.qty)}</div>
          <button class="cr-remove" data-id="${it.cartId}">✕</button>
        </div>
      `; }).join('')}
    </div>
  `;

  summaryRoot.innerHTML = `
    <div class="summary-card">
      <h3>ملخص الطلب</h3>
      <div class="summary-line"><span>عدد المنتجات</span><span>${GXCart.count()}</span></div>
      <div class="summary-total">
        <span class="lbl">الإجمالي</span>
        <span class="val" id="cartPageTotal">${GXCurrency.format(GXCart.totalJOD())}</span>
      </div>
      <div class="notes-field">
        <label>ملاحظات الطلب (اختياري)</label>
        <textarea id="orderNotes" placeholder="مثال: يوزرات الحسابات، أو أي طلب خاص...">${GXCart.getNotes()}</textarea>
        <div class="hint">تقدر تكتب هون يوزرات حساباتك أو أي تفاصيل بتساعدنا نجهز طلبك.</div>
      </div>
      <button class="btn btn-green btn-block" id="pageCheckoutBtn">
        إتمام الطلب عبر واتساب
      </button>
    </div>
  `;

  wireCartRowEvents();
}

function wireCartRowEvents(){
  document.querySelectorAll('.qty-plus').forEach(b => b.addEventListener('click', () => GXCart.changeQty(b.dataset.id, 1)));
  document.querySelectorAll('.qty-minus').forEach(b => b.addEventListener('click', () => GXCart.changeQty(b.dataset.id, -1)));
  document.querySelectorAll('.cr-remove').forEach(b => b.addEventListener('click', () => GXCart.remove(b.dataset.id)));

  const clearBtn = document.getElementById('clearCartBtn');
  if(clearBtn) clearBtn.addEventListener('click', () => {
    if(confirm('متأكد بدك تفرّغ السلة؟')) GXCart.clear();
  });

  const notesField = document.getElementById('orderNotes');
  if(notesField) notesField.addEventListener('input', () => {
    GXCart.setNotes(notesField.value);
  });

  const checkoutBtn = document.getElementById('pageCheckoutBtn');
  if(checkoutBtn) checkoutBtn.addEventListener('click', () => {
    const url = GXCart.buildWhatsAppUrl();
    if(url) window.open(url, '_blank');
  });
}

document.addEventListener('DOMContentLoaded', renderCartPage);
document.addEventListener('gx:cart-changed', renderCartPage);
document.addEventListener('gx:rerender-prices', renderCartPage);
