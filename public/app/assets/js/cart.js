/* ============================================================
   GX STORE — CART MODULE (shared)
   Cart state lives in localStorage under 'gx_cart' as an array
   of {cartId, qty, meta?}. For snap-plus items, meta.usernames
   holds the list of usernames provided per account, so removing
   or reducing a snap line automatically drops the matching users
   without leaving stale text behind.
   Requires: products-data.js and currency.js to be loaded first.
   ============================================================ */

const GXCart = (function(){
  const STORAGE_KEY = 'gx_cart';
  const NOTES_KEY = 'gx_cart_notes';
  let items = [];

  function isSnapId(cartId){
    return typeof cartId === 'string' && cartId.startsWith('snap-');
  }

  function load(){
    try{
      items = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if(!Array.isArray(items)) items = [];
    }catch(e){
      items = [];
    }
    // One-time migration: strip legacy auto-appended snap usernames
    // from the free-notes field (older versions stored them there).
    migrateLegacyNotes();
  }

  function migrateLegacyNotes(){
    const raw = localStorage.getItem(NOTES_KEY) || '';
    if(!raw) return;
    // Legacy auto-blocks always started with "👻 سناب بلس".
    if(raw.indexOf('👻 سناب بلس') === -1) return;
    const cleaned = raw
      .split(/\n(?=👻 سناب بلس)/)
      .filter(block => !block.startsWith('👻 سناب بلس'))
      .join('\n')
      .trim();
    localStorage.setItem(NOTES_KEY, cleaned);
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

  // Add / merge a snap-plus line together with its per-account usernames.
  // qty always mirrors usernames.length so the two can never drift apart.
  function addSnap(cartId, usernames){
    const clean = (usernames || []).map(u => (u || '').trim()).filter(Boolean);
    if(clean.length === 0) return;
    const existing = items.find(i => i.cartId === cartId && !i.custom);
    if(existing){
      existing.meta = existing.meta || {};
      existing.meta.usernames = (existing.meta.usernames || []).concat(clean);
      existing.qty = existing.meta.usernames.length;
    }else{
      items.push({cartId, qty:clean.length, meta:{usernames:clean}});
    }
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

  // Same as buyNow but for snap-plus (replaces line with the new usernames).
  function buyNowSnap(cartId, usernames){
    const clean = (usernames || []).map(u => (u || '').trim()).filter(Boolean);
    if(clean.length === 0) return;
    items = items.filter(i => i.cartId !== cartId);
    items.push({cartId, qty:clean.length, meta:{usernames:clean}});
    persist();
    window.location.href = '/app/cart/index.html';
  }

  // Adds an item that isn't in the static catalog (e.g. a custom V-Bucks amount).
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
    // For snap lines, keep usernames array length aligned with qty.
    if(item.meta && Array.isArray(item.meta.usernames)){
      if(item.qty < item.meta.usernames.length){
        item.meta.usernames = item.meta.usernames.slice(0, Math.max(item.qty, 0));
      }
    }
    if(item.qty <= 0){ items = items.filter(i => i.cartId !== cartId); }
    if(items.length === 0){ setNotesSilent(''); }
    persist();
  }

  function remove(cartId){
    items = items.filter(i => i.cartId !== cartId);
    if(items.length === 0){ setNotesSilent(''); }
    persist();
  }

  function clear(){
    items = [];
    setNotesSilent('');
    persist();
  }

  function setNotesSilent(text){
    localStorage.setItem(NOTES_KEY, text);
  }

  function count(){
    return items.reduce((s,i)=>s+i.qty, 0);
  }

  function getResolvedItems(){
    return items
      .map(i => {
        const usernames = i.meta && Array.isArray(i.meta.usernames) ? i.meta.usernames.slice() : null;
        if(i.custom){
          return {cartId:i.cartId, qty:i.qty, name:i.custom.name, icon:i.custom.icon, bg:i.custom.bg, price:i.custom.price, usernames};
        }
        const plan = findPlanByCartId(i.cartId);
        return plan ? {...plan, qty:i.qty, usernames} : null;
      })
      .filter(Boolean);
  }

  // Returns the raw usernames array currently stored for a snap-plus plan.
  function getSnapUsernames(cartId){
    const item = items.find(i => i.cartId === cartId);
    return item && item.meta && Array.isArray(item.meta.usernames) ? item.meta.usernames.slice() : [];
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

  function buildWhatsAppUrl(notesOverride, orderNumberOverride){
    const resolved = getResolvedItems();
    if(resolved.length === 0) return null;

    const currency = GXCurrency.get();
    const totalJod = totalJOD();
    const itemCount = resolved.reduce((n, it) => n + it.qty, 0);
    const orderId = orderNumberOverride || ('GX-' + Date.now().toString().slice(-6));
    const now = new Date();
    const dateStr = now.toLocaleDateString('ar-EG', { year:'numeric', month:'long', day:'numeric' });
    const timeStr = now.toLocaleTimeString('ar-EG', { hour:'2-digit', minute:'2-digit' });

    const lines = resolved.map((it, i) => {
      const lineTotal = it.price * it.qty;
      let block =
`${i+1}) ${it.name}
     • الكمية: ${it.qty}
     • سعر الوحدة: ${GXCurrency.format(it.price)}
     • المجموع: ${GXCurrency.format(lineTotal)}`;
      if(it.usernames && it.usernames.length){
        const users = it.usernames.map((u, k) => `        ${k+1}. ${u}`).join('\n');
        block += `\n     • اليوزرات:\n${users}`;
      }
      return block;
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
      msg += `\n\n📝 *ملاحظات إضافية:*\n${notes.trim()}\n━━━━━━━━━━━━━━━━━━━━`;
    }

    msg += `\n\n✅ الرجاء تأكيد الطلب ليتم البدء بالتجهيز.\nشكراً لاختيارك GX Store 💙`;

    return 'https://wa.me/962776252313?text=' + encodeURIComponent(msg);
  }

  // Persists the current cart into the `orders` table (via Supabase bridge).
  // Returns the inserted row (including the DB-generated order_number)
  // or null when there is no bridge / no items / an error occurs.
  async function submitOrder(){
    const resolved = getResolvedItems();
    if(resolved.length === 0) return null;
    if(!window.gxSupabaseReady) return null;
    try{
      await window.gxSupabaseReady;
      const sb = window.gxSupabase;
      if(!sb) return null;
      const { data: userData } = await sb.auth.getUser();
      const user = userData && userData.user;
      const items = resolved.map(it => ({
        cartId: it.cartId,
        name: it.name,
        qty: it.qty,
        price: it.price,
        usernames: it.usernames || null,
      }));
      const customerNotes = getNotes() || null;
      const payload = {
        user_id: user ? user.id : null,
        customer_name: user ? (user.user_metadata && user.user_metadata.full_name) || null : null,
        customer_whatsapp: null,
        items,
        total_jod: totalJOD(),
        currency_snapshot: GXCurrency.get(),
        delivery_data: customerNotes ? { customer_notes: customerNotes } : {},
        status: 'pending',
      };

      const { data, error } = await sb.from('orders').insert(payload).select().single();
      if(error){ console.warn('[GX] order insert error', error); return null; }
      return data;
    }catch(e){
      console.warn('[GX] submitOrder failed', e);
      return null;
    }
  }

  load();

  return {add, addSnap, buyNow, buyNowSnap, addCustom, changeQty, remove, clear, count, getResolvedItems, getSnapUsernames, totalJOD, buildWhatsAppUrl, getNotes, setNotes, submitOrder};
})();
