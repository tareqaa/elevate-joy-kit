/* ============================================================
   GX STORE — CART MODULE (shared)
   Cart state lives in localStorage under 'gx_cart' as an array
   of {cartId, qty}. Every page (home, product pages, cart page)
   reads/writes through this same module, so the cart is always
   in sync no matter which page the visitor is on.
   Requires: products-data.js and currency.js to be loaded first.
   ============================================================ */

const GXCart = (function(){
  const STORAGE_KEY = 'gx_cart';
  const NOTES_KEY = 'gx_cart_notes';
  let items = [];

  function load(){
    try{
      items = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if(!Array.isArray(items)) items = [];
    }catch(e){
      items = [];
    }
  }

  function persist(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    document.dispatchEvent(new CustomEvent('gx:cart-changed', {detail:{items:getResolvedItems()}}));
  }

  function add(cartId, qty = 1){
    const existing = items.find(i => i.cartId === cartId && !i.custom);
    if(existing){ existing.qty += qty; }
    else{ items.push({cartId, qty}); }
    persist();
  }

  // Adds an item and takes the visitor straight to the cart page —
  // used by "Buy Now" buttons. Unlike plain add(), Buy Now does NOT
  // stack onto whatever qty already sits in the cart for the same
  // item; it sets the line to exactly `qty` so clicking "اشتري الآن"
  // for a single unit always lands you on a cart line of that qty,
  // even if the same product was previously added and removed.
  function buyNow(cartId, qty = 1){
    const existing = items.find(i => i.cartId === cartId && !i.custom);
    if(existing){ existing.qty = qty; }
    else{ items.push({cartId, qty}); }
    persist();
    window.location.href = '/app/cart/index.html';
  }

  // Adds an item that isn't in the static catalog (e.g. a custom V-Bucks amount).
  // `data` must include: name, icon, bg, price. A unique cartId is generated
  // unless one is provided.
  function addCustom(data, qty = 1){
    const cartId = data.cartId || ('custom-' + Date.now() + '-' + Math.random().toString(36).slice(2,7));
    items.push({
      cartId,
      qty,
      custom:{
        name:data.name,
        icon:data.icon || '🎮',
        bg:data.bg || 'linear-gradient(145deg,#1a1e2a,#0a0c12)',
        price:data.price,
      }
    });
    persist();
    return cartId;
  }

  function changeQty(cartId, delta){
    const item = items.find(i => i.cartId === cartId);
    if(!item) return;
    item.qty += delta;
    if(item.qty <= 0){ items = items.filter(i => i.cartId !== cartId); }
    persist();
  }

  function remove(cartId){
    items = items.filter(i => i.cartId !== cartId);
    persist();
  }

  function clear(){
    items = [];
    persist();
    setNotes('');
  }

  function count(){
    return items.reduce((s,i)=>s+i.qty, 0);
  }

  // Returns items joined with their live product/plan info (name, icon, price...)
  function getResolvedItems(){
    return items
      .map(i => {
        if(i.custom){
          return {cartId:i.cartId, qty:i.qty, name:i.custom.name, icon:i.custom.icon, bg:i.custom.bg, price:i.custom.price};
        }
        const plan = findPlanByCartId(i.cartId);
        return plan ? {...plan, qty:i.qty} : null;
      })
      .filter(Boolean);
  }

  function totalJOD(){
    return getResolvedItems().reduce((sum, it) => sum + it.price * it.qty, 0);
  }

  function getNotes(){
    return localStorage.getItem(NOTES_KEY) || '';
  }

  function setNotes(text){
    localStorage.setItem(NOTES_KEY, text);
  }

  // Appends a new line to the stored notes (used by product pages that need
  // to attach structured info, like Snapchat usernames per account).
  function appendNote(text){
    const current = getNotes();
    const next = current ? (current + '\n' + text) : text;
    setNotes(next);
  }

  function buildWhatsAppUrl(notesOverride){
    const resolved = getResolvedItems();
    if(resolved.length === 0) return null;

    const currency = GXCurrency.get();
    const totalJod = totalJOD();
    const itemCount = resolved.reduce((n, it) => n + it.qty, 0);
    const orderId = 'GX-' + Date.now().toString().slice(-6);
    const now = new Date();
    const dateStr = now.toLocaleDateString('ar-EG', { year:'numeric', month:'long', day:'numeric' });
    const timeStr = now.toLocaleTimeString('ar-EG', { hour:'2-digit', minute:'2-digit' });

    const lines = resolved.map((it, i) => {
      const lineTotal = it.price * it.qty;
      return `${i+1}) ${it.name}\n     • الكمية: ${it.qty}\n     • سعر الوحدة: ${GXCurrency.format(it.price)}\n     • المجموع: ${GXCurrency.format(lineTotal)}`;
    }).join('\n\n');

    let msg =
`🧾 *فاتورة طلب جديد — GX Store*
━━━━━━━━━━━━━━━━━━━━
🆔 رقم الطلب: ${orderId}
📅 التاريخ: ${dateStr}
🕐 الوقت: ${timeStr}
━━━━━━━━━━━━━━━━━━━━

🛍️ *تفاصيل المنتجات:*

${lines}

━━━━━━━━━━━━━━━━━━━━
📦 عدد القطع: ${itemCount}
💰 *الإجمالي المستحق: ${GXCurrency.format(totalJod)}*
💱 العملة: ${currency}
━━━━━━━━━━━━━━━━━━━━`;

    const notes = notesOverride !== undefined ? notesOverride : getNotes();
    if(notes && notes.trim()){
      msg += `\n\n📝 *بيانات إضافية / يوزرات:*\n${notes.trim()}\n━━━━━━━━━━━━━━━━━━━━`;
    }

    msg += `\n\n✅ الرجاء تأكيد الطلب ليتم البدء بالتجهيز.\nشكراً لاختيارك GX Store 💙`;

    return 'https://wa.me/962776252313?text=' + encodeURIComponent(msg);
  }

  load();

  return {add, buyNow, addCustom, changeQty, remove, clear, count, getResolvedItems, totalJOD, buildWhatsAppUrl, getNotes, setNotes, appendNote};
})();
