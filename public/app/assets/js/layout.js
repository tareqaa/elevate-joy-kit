/* ============================================================
   GX STORE — LAYOUT MODULE (shared)
   Injects the Navbar, Menu dropdown, Cart Drawer, and Footer
   into every page from one place, so all pages share the exact
   same header/footer/cart markup and behavior.
   Requires: products-data.js, currency.js, cart.js loaded first.
   Each page must contain three empty mount points:
     <div id="navbar-root"></div>
     <div id="cart-drawer-root"></div>
     <div id="footer-root"></div>
   ============================================================ */

function gxDetectActivePage(){
  const path = window.location.pathname.replace(/\/index\.html$/, '/');
  // Path is now scoped under /app/ (e.g. /app/, /app/cart/, /app/games/fortnite/).
  const segs = path.split('/').filter(Boolean);
  if(segs[0] === 'app') segs.shift();
  if(segs.length === 0) return 'home';
  return segs[0] || 'home';
}

function gxRenderNavbar(){
  const active = gxDetectActivePage();
  const isActive = (page) => active === page ? 'active' : '';

  document.getElementById('navbar-root').innerHTML = `
    <nav class="nav">
      <div class="wrap">
        <a href="/app/index.html" class="brand">
          <div class="mark"><img src="/app/assets/img/gx-logo.png" alt="GX"></div>
          <div class="brand-word">GX <span>STORE</span></div>
        </a>
        <div class="search-box" id="gxSearchBox">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          <input type="text" id="gxSearchInput" autocomplete="off" placeholder="دور على منتج أو اشتراك...">
          <div class="gx-search-results" id="gxSearchResults" hidden></div>
        </div>
        <div class="nav-right">
          <button class="currency-pick" id="currencyBtn" type="button">
            <span id="currencyBtnCode">JOD</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
          </button>
          <div class="icon-btn" id="cartBtn" title="السلة">
            🛒
            <span class="badge-count" id="cartCount">0</span>
          </div>
          <div class="menu-wrap">
            <div class="menu-btn" id="menuBtn">
              <div class="bars"><span></span><span></span><span></span></div>
              <span class="btn-label">القائمة</span>
            </div>
            <div class="menu-panel" id="menuPanel">
              <div class="menu-section">
                <div class="ms-title">الصفحات</div>
                <a href="/app/index.html" class="menu-link ${isActive('home')}"><span class="mi">🏠</span> الرئيسية</a>
                <a href="/app/cart/index.html" class="menu-link ${isActive('cart')}"><span class="mi">🛒</span> السلة</a>
                <a href="/app/faq/index.html" class="menu-link ${isActive('faq')}"><span class="mi">❓</span> الأسئلة الشائعة</a>
                <a href="/app/policy/index.html" class="menu-link ${isActive('policy')}"><span class="mi">🛡️</span> الضمان والاسترجاع</a>
              </div>
              <div class="menu-divider"></div>
              <div class="menu-section">
                <div class="ms-title">أقسام المنتجات</div>
                ${CATEGORY_LINKS.map(c => `
                  <a href="/app/${c.slug}/index.html" class="menu-link ${isActive(c.slug)}"><span class="mi">${c.icon}</span> ${c.name}</a>
                `).join('')}
              </div>
              <div class="menu-divider"></div>
              <div class="menu-section">
                <div class="ms-title">تواصل معنا</div>
                <a href="https://wa.me/962776252313" target="_blank" rel="noopener" class="menu-link wa-menu-link">
                  <span class="mi"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.36 5.07L2 22l5.06-1.33A9.94 9.94 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.6 0-3.1-.43-4.4-1.19l-.32-.19-3.02.79.8-2.94-.2-.32A7.94 7.94 0 014 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8zm4.4-5.85c-.24-.12-1.43-.7-1.65-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.35-1.67-.14-.24-.02-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.43-.58 1.63-1.15.2-.57.2-1.05.14-1.15-.06-.1-.22-.16-.46-.28z"/></svg></span>
                  <span>واتساب</span>
                  <span class="wa-number" dir="ltr">+962 77 625 2313</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  `;
}

function gxRenderCartDrawer(){
  document.getElementById('cart-drawer-root').innerHTML = `
    <div class="overlay" id="overlay"></div>
    <div class="cart-drawer" id="cartDrawer">
      <div class="cart-head">
        <h3>سلة المشتريات</h3>
        <div class="cart-close" id="cartClose">✕</div>
      </div>
      <div class="cart-items" id="cartItems"></div>
      <div class="cart-footer">
        <div class="cart-total-row">
          <span class="lbl">الإجمالي</span>
          <span class="val" id="cartTotal">0</span>
        </div>
        <button class="checkout-btn" id="checkoutBtn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.36 5.07L2 22l5.06-1.33A9.94 9.94 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.6 0-3.1-.43-4.4-1.19l-.32-.19-3.02.79.8-2.94-.2-.32A7.94 7.94 0 014 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8zm4.4-5.85c-.24-.12-1.43-.7-1.65-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.35-1.67-.14-.24-.02-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.43-.58 1.63-1.15.2-.57.2-1.05.14-1.15-.06-.1-.22-.16-.46-.28z"/></svg>
          إتمام الطلب عبر واتساب
        </button>
        <a href="/app/cart/index.html" class="view-cart-link">أو افتح صفحة السلة الكاملة ‹</a>
      </div>
    </div>

    <div class="add-toast" id="addToast">
      <div class="toast-top">
        <div class="toast-icon">✓</div>
        <div class="toast-body">
          <div class="toast-title">تمت الإضافة إلى سلة التسوق</div>
          <div class="toast-sub">لديك <strong id="toastCount">0</strong> منتج في سلة التسوق الخاصة بك</div>
        </div>
      </div>
      <div class="toast-actions">
        <button class="toast-btn-ghost" id="toastContinue">مواصلة التسوق</button>
        <button class="toast-btn-primary" id="toastViewCart">عرض السلة</button>
      </div>
    </div>

    <div class="currency-modal-overlay" id="currencyModalOverlay">
      <div class="currency-modal">
        <div class="cm-head">
          <h3>العملة</h3>
          <div class="cm-close" id="currencyModalClose">✕</div>
        </div>
        <p class="cm-sub">اختار العملة اللي بتفضل تشوف الأسعار فيها بكل الموقع.</p>
        <div class="cm-select-wrap">
          <select id="currencySelect"></select>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        <button class="btn btn-primary btn-block" id="currencyModalConfirm">موافق</button>
      </div>
    </div>
  `;
}

function gxRenderFooter(){
  document.getElementById('footer-root').innerHTML = `
    <footer>
      <div class="wrap">
        <a href="#" id="backToTop" class="back-to-top">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
          العودة إلى الأعلى
        </a>
        <div class="footer-grid">
          <div class="footer-brand">
            <div class="brand">
              <div class="mark"><img src="/app/assets/img/gx-logo.png" alt="GX"></div>
              <div class="brand-word">GX <span>STORE</span></div>
            </div>
            <p>متجرك الرقمي لكل الاشتراكات وبطاقات الألعاب — تفعيل رسمي وسريع لكل الدول العربية.</p>
          </div>
          <div class="footer-col">
            <h5>الأقسام</h5>
            ${CATEGORY_LINKS.map(c => `<a href="/app/${c.slug}/index.html">${c.name}</a>`).join('')}
          </div>
          <div class="footer-col">
            <h5>روابط</h5>
            <a href="/app/index.html">الرئيسية</a>
            <a href="/app/cart/index.html">السلة</a>
            <a href="/app/faq/index.html">الأسئلة الشائعة</a>
            <a href="/app/policy/index.html">الضمان والاسترجاع</a>
          </div>
          <div class="footer-col">
            <h5>تواصل معنا</h5>
            <a class="footer-wa" href="https://wa.me/962776252313" target="_blank" rel="noopener">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.36 5.07L2 22l5.06-1.33A9.94 9.94 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.6 0-3.1-.43-4.4-1.19l-.32-.19-3.02.79.8-2.94-.2-.32A7.94 7.94 0 014 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8zm4.4-5.85c-.24-.12-1.43-.7-1.65-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.35-1.67-.14-.24-.02-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.43-.58 1.63-1.15.2-.57.2-1.05.14-1.15-.06-.1-.22-.16-.46-.28z"/></svg>
              <span dir="ltr">+962 77 625 2313</span>
            </a>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© GX STORE — جميع الحقوق محفوظة</span>
        </div>
      </div>
    </footer>
  `;

  document.getElementById('backToTop').addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({top:0, behavior:'smooth'});
  });
}

function gxRenderCartItemsInDrawer(){
  const resolved = GXCart.getResolvedItems();
  const itemsEl = document.getElementById('cartItems');
  if(!itemsEl) return;

  if(resolved.length === 0){
    itemsEl.innerHTML = `<div class="cart-empty">السلة فاضية — ضيف أول منتج إلك 🛒</div>`;
  }else{
    itemsEl.innerHTML = resolved.map(it => {
      const isSnap = typeof it.cartId === 'string' && it.cartId.startsWith('snap-');
      return `
      <div class="cart-item">
        <div class="ci-thumb" style="background:${it.bg};">${it.icon}</div>
        <div class="ci-info">
          <div class="ci-name">${it.name}</div>
          <div class="ci-price">${GXCurrency.format(it.price)}</div>
          <div class="qty-ctrl">
            <button class="qty-minus" data-id="${it.cartId}">−</button>
            <span>${it.qty}</span>
            <button class="qty-plus" data-id="${it.cartId}" ${isSnap ? 'disabled title="ارجع لصفحة سناب بلس لإضافة حساب جديد مع يوزره"' : ''}>+</button>
          </div>
        </div>
      </div>
    `; }).join('');

    itemsEl.querySelectorAll('.qty-plus').forEach(b => b.addEventListener('click', ()=>{ if(b.disabled) return; GXCart.changeQty(b.dataset.id, 1); }));
    itemsEl.querySelectorAll('.qty-minus').forEach(b => b.addEventListener('click', ()=>GXCart.changeQty(b.dataset.id, -1)));
  }

  const totalEl = document.getElementById('cartTotal');
  const checkoutBtn = document.getElementById('checkoutBtn');
  if(totalEl) totalEl.textContent = GXCurrency.format(GXCart.totalJOD());
  if(checkoutBtn) checkoutBtn.disabled = resolved.length === 0;
}

function gxUpdateCartCount(){
  const el = document.getElementById('cartCount');
  if(el) el.textContent = GXCart.count();
}

let gxOpenCart, gxCloseCart;

function gxWireLayoutEvents(){
  const menuBtn = document.getElementById('menuBtn');
  const menuPanel = document.getElementById('menuPanel');
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    menuPanel.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if(!menuPanel.contains(e.target) && e.target !== menuBtn){
      menuPanel.classList.remove('open');
    }
  });

  const cartBtn = document.getElementById('cartBtn');
  const cartDrawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('overlay');
  const cartClose = document.getElementById('cartClose');

  gxOpenCart = function(){ cartDrawer.classList.add('open'); overlay.classList.add('open'); };
  gxCloseCart = function(){ cartDrawer.classList.remove('open'); overlay.classList.remove('open'); };

  cartBtn.addEventListener('click', gxOpenCart);
  cartClose.addEventListener('click', gxCloseCart);
  overlay.addEventListener('click', gxCloseCart);

  document.getElementById('checkoutBtn').addEventListener('click', async () => {
    const btn = document.getElementById('checkoutBtn');
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '⏳ جاري الحفظ...';
    try{
      const submitted = await GXCart.submitOrder();
      const url = GXCart.buildWhatsAppUrl(undefined, submitted && submitted.order_number);
      if(submitted) GXCart.clear();
      if(url) window.open(url, '_blank');
    }catch(e){
      console.error(e);
      const url = GXCart.buildWhatsAppUrl();
      if(url) window.open(url, '_blank');
    }finally{
      btn.disabled = false;
      btn.innerHTML = original;
    }
  });

  const toast = document.getElementById('addToast');
  document.getElementById('toastContinue').addEventListener('click', gxHideAddedToast);
  document.getElementById('toastViewCart').addEventListener('click', () => {
    gxHideAddedToast();
    gxOpenCart();
  });

  GXCurrency.populateSelect(document.getElementById('currencySelect'));
  gxUpdateCurrencyButton();

  const currencyBtn = document.getElementById('currencyBtn');
  const currencyModalOverlay = document.getElementById('currencyModalOverlay');
  const currencySelect = document.getElementById('currencySelect');

  function openCurrencyModal(){
    currencySelect.value = GXCurrency.get();
    currencyModalOverlay.classList.add('open');
  }
  function closeCurrencyModal(){
    currencyModalOverlay.classList.remove('open');
  }

  currencyBtn.addEventListener('click', openCurrencyModal);
  document.getElementById('currencyModalClose').addEventListener('click', closeCurrencyModal);
  currencyModalOverlay.addEventListener('click', (e) => {
    if(e.target === currencyModalOverlay) closeCurrencyModal();
  });
  document.getElementById('currencyModalConfirm').addEventListener('click', () => {
    GXCurrency.set(currencySelect.value);
    gxUpdateCurrencyButton();
    closeCurrencyModal();
  });

  document.addEventListener('gx:cart-changed', () => {
    gxUpdateCartCount();
    gxRenderCartItemsInDrawer();
  });
  document.addEventListener('gx:currency-changed', () => {
    gxRenderCartItemsInDrawer();
    gxUpdateCurrencyButton();
    document.dispatchEvent(new CustomEvent('gx:rerender-prices'));
  });
}

function gxUpdateCurrencyButton(){
  const codeEl = document.getElementById('currencyBtnCode');
  if(!codeEl) return;
  codeEl.textContent = GXCurrency.get();
}

// Shown after any "add to cart" action anywhere on the site.
// Requires the cart drawer (and its toast markup) to already be rendered.
function gxShowAddedToast(){
  const toast = document.getElementById('addToast');
  if(!toast) return;
  document.getElementById('toastCount').textContent = GXCart.count();
  toast.classList.add('show');
  clearTimeout(window._gxToastTimer);
  window._gxToastTimer = setTimeout(gxHideAddedToast, 4500);
}

function gxHideAddedToast(){
  const toast = document.getElementById('addToast');
  if(toast) toast.classList.remove('show');
}

// Shared "Add to cart" + "Buy now" button pair, used by every product
// card across the site. `cartId` must match a real catalog entry.
function gxBuyActionsHtml(cartId){
  return `
    <div class="buy-actions">
      <button class="add-cart-btn" data-id="${cartId}">🛒 أضف للسلة</button>
      <button class="buy-now-btn" data-id="${cartId}">⚡ اشتري الآن</button>
    </div>
  `;
}

// Wires every .add-cart-btn / .buy-now-btn found within `root` (a DOM
// element or the document). Call this once after inserting HTML built
// with gxBuyActionsHtml().
function gxWireBuyActions(root){
  (root || document).querySelectorAll('.add-cart-btn[data-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      GXCart.add(btn.dataset.id);
      gxShowAddedToast();
      btn.textContent = '✓ أضيفت';
      btn.classList.add('added');
      setTimeout(()=>{
        btn.textContent = '🛒 أضف للسلة';
        btn.classList.remove('added');
      }, 1200);
    });
  });
  (root || document).querySelectorAll('.buy-now-btn[data-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      GXCart.buyNow(btn.dataset.id);
    });
  });
}

function gxInjectSupabaseBridge(){
  if(document.querySelector('script[data-gx-supabase]')) return window.gxSupabaseBridgeScriptReady;
  window.gxSupabaseBridgeScriptReady = new Promise((resolve) => {
    const finish = () => resolve(window.gxSupabaseReady);
    const fail = () => resolve(null);

  const s = document.createElement('script');
  s.src = '/app/assets/js/supabase-bridge.js';
  s.setAttribute('data-gx-supabase', '1');
    s.onload = finish;
    s.onerror = fail;
  document.head.appendChild(s);
  });
  return window.gxSupabaseBridgeScriptReady;
}

function gxInitLayout(){
  gxInjectSupabaseBridge();
  gxRenderNavbar();
  gxRenderCartDrawer();
  gxRenderFooter();
  gxWireLayoutEvents();
  gxUpdateCartCount();
  gxRenderCartItemsInDrawer();
  GXCurrency.autoDetect();
  gxRenderAuthState();
}

// Renders an account dropdown in the navbar. Draws the "login" state
// immediately so the button is always visible, then upgrades to the
// "account" state (with dropdown menu) once the Supabase bridge loads.
function gxRenderAccountLink(signedIn, isAdmin, profile){
  const navRight = document.querySelector('.nav-right');
  if(!navRight) return;
  const existing = document.getElementById('accountWrap');
  if(existing) existing.remove();

  const wrap = document.createElement('div');
  wrap.id = 'accountWrap';
  wrap.className = 'account-wrap';

  if(!signedIn){
    wrap.innerHTML = `
      <button type="button" class="icon-btn account-link" id="accountLoginBtn" title="تسجيل الدخول" aria-label="تسجيل الدخول">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
      </button>`;
  }else{
    const p = profile || {};
    const seed = p.username || p.email || 'gx';
    const avatarUrl = p.avatar_url || `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(seed)}&backgroundType=gradientLinear&backgroundColor=0ea5e9,6366f1,8b5cf6`;
    const level = Math.max(1, Number(p.level) || 1);
    const xp = Math.max(0, Number(p.xp) || 0);
    const perLevel = 100;
    const xpInLevel = xp % perLevel;
    const pct = Math.max(4, Math.min(100, (xpInLevel / perLevel) * 100));
    const emailPrefix = p.email ? p.email.split('@')[0] : '';
    const displayName = p.full_name || p.username || emailPrefix || 'حسابي';
    const handle = p.username ? '@' + p.username : (p.email || '');


    wrap.innerHTML = `
      <button type="button" class="icon-btn account-avatar-btn" id="accountBtn" title="حسابي" aria-label="حسابي">
        <img src="${avatarUrl}" alt="" />
        <span class="account-lvl-dot">${level}</span>
        <span class="account-notif-dot" id="accUnreadDot" hidden></span>
      </button>
      <div class="account-panel" id="accountPanel">
        <div class="acc-mini">
          <div class="acc-mini__name">${displayName}</div>
          <div class="acc-mini__handle" dir="ltr">${handle}</div>
        </div>
        <div class="acc-divider"></div>

        <a href="/account?tab=orders" class="acc-link"><span class="ai">📦</span><span>الطلبات</span></a>
        <button type="button" class="acc-link" id="accNotifLink"><span class="ai">🔔</span><span>الإشعارات</span><span class="soon-tag acc-unread-badge" id="accUnreadBadge" hidden>0</span></button>
        <a href="#" class="acc-link acc-soon" data-soon><span class="ai">⭐</span><span>الأمنيات</span><span class="soon-tag">قريباً</span></a>
        <a href="/account?tab=profile" class="acc-link"><span class="ai">👤</span><span>حسابي</span></a>
        <a href="/account?tab=security" class="acc-link"><span class="ai">⚙️</span><span>الإعدادات</span></a>
        ${isAdmin ? '<div class="acc-divider"></div><a href="/admin" class="acc-link acc-admin"><span class="ai">🛡️</span><span>لوحة التحكم</span></a>' : ''}
        <div class="acc-divider"></div>
        <button type="button" class="acc-link acc-logout" id="accLogout"><span class="ai">↩︎</span><span>تسجيل الخروج</span></button>
      </div>`;

  }
  navRight.insertBefore(wrap, navRight.firstChild);

  if(!signedIn){
    const loginBtn = wrap.querySelector('#accountLoginBtn');
    if(loginBtn) loginBtn.addEventListener('click', (e)=>{ e.preventDefault(); gxOpenAuthModal(); });
    return;
  }

  const btn = wrap.querySelector('#accountBtn');
  const panel = wrap.querySelector('#accountPanel');
  let hoverTimer = null;
  const open = ()=>{ clearTimeout(hoverTimer); panel.classList.add('open'); };
  const closeSoon = ()=>{ hoverTimer = setTimeout(()=> panel.classList.remove('open'), 180); };
  btn.addEventListener('click', (e)=>{ e.stopPropagation(); panel.classList.toggle('open'); });
  wrap.addEventListener('mouseenter', open);
  wrap.addEventListener('mouseleave', closeSoon);
  document.addEventListener('click', (e)=>{ if(!wrap.contains(e.target)) panel.classList.remove('open'); });
  wrap.querySelectorAll('[data-soon]').forEach(a => a.addEventListener('click', (e)=>{
    e.preventDefault();
    panel.classList.remove('open');
    alert('هاي الميزة قريباً 🚀');
  }));
  const notifBtn = wrap.querySelector('#accNotifLink');
  if(notifBtn) notifBtn.addEventListener('click', (e)=>{
    e.preventDefault(); e.stopPropagation();
    panel.classList.remove('open');
    gxOpenNotifCenter();
  });

  const logout = wrap.querySelector('#accLogout');
  if(logout) logout.addEventListener('click', async ()=>{
    try{
      if(window.gxSupabaseReady) await window.gxSupabaseReady;
      if(window.gxSupabase) await window.gxSupabase.auth.signOut();
    }catch(_){}
    window.location.reload();
  });
}

/* ============================================================
   In-page Auth Modal (login / signup) — opens over the store.
   ============================================================ */
function gxEnsureAuthModal(){
  if(document.getElementById('gxAuthModal')) return;
  const el = document.createElement('div');
  el.id = 'gxAuthModal';
  el.className = 'gx-auth-modal';
  el.setAttribute('dir', 'rtl');
  el.innerHTML = `
    <div class="gx-auth-modal__scrim" data-close></div>
    <div class="gx-auth-modal__card" role="dialog" aria-modal="true">
      <button type="button" class="gx-auth-modal__close" data-close aria-label="إغلاق">✕</button>
      <div class="gx-auth-modal__avatar">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
      </div>
      <div class="gx-auth-modal__tabs">
        <button type="button" class="on" data-tab="signin">دخول</button>
        <button type="button" data-tab="signup">حساب جديد</button>
      </div>
      <h3 class="gx-auth-modal__title" id="gxAuthTitle">تسجيل الدخول</h3>

      <form class="gx-auth-modal__form" id="gxAuthForm">
        <label data-only="signup">اسم المستخدم <span style="opacity:.6;font-weight:500">(3-20 حرف/رقم/_)</span></label>
        <input type="text" id="gxAuthUsername" dir="ltr" placeholder="your_tag" pattern="[a-zA-Z0-9_]{3,20}" data-only="signup" />
        <label>البريد الإلكتروني</label>
        <input type="email" id="gxAuthEmail" dir="ltr" placeholder="your@email.com" required />
        <label>كلمة السر</label>
        <input type="password" id="gxAuthPass" dir="ltr" placeholder="••••••" minlength="6" required />
        <button type="submit" class="gx-auth-modal__submit" id="gxAuthSubmit">دخول</button>
      </form>

      <div class="gx-auth-modal__divider"><span>أو تابع بحسابك في</span></div>
      <div class="gx-auth-modal__social">
        <button type="button" class="gx-social-btn" id="gxAuthGoogle" title="Google">
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        </button>
      </div>
      <div class="gx-auth-modal__msg" id="gxAuthMsg"></div>
    </div>`;
  document.body.appendChild(el);

  const close = ()=> el.classList.remove('open');
  el.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
  document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') close(); });

  const tabs = el.querySelectorAll('.gx-auth-modal__tabs button');
  const setMode = (mode)=>{
    el.dataset.mode = mode;
    tabs.forEach(b => b.classList.toggle('on', b.dataset.tab === mode));
    el.querySelector('#gxAuthTitle').textContent = mode === 'signin' ? 'تسجيل الدخول' : 'إنشاء حساب';
    el.querySelector('#gxAuthSubmit').textContent = mode === 'signin' ? 'دخول' : 'إنشاء حساب';
    el.querySelectorAll('[data-only="signup"]').forEach(n => n.style.display = mode === 'signup' ? '' : 'none');
  };
  tabs.forEach(b => b.addEventListener('click', ()=> setMode(b.dataset.tab)));
  setMode('signin');

  const msg = el.querySelector('#gxAuthMsg');
  const showMsg = (t, ok=false)=>{ msg.textContent = t; msg.className = 'gx-auth-modal__msg ' + (ok?'ok':'err'); };

  el.querySelector('#gxAuthForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    showMsg('...');
    try{
      if(window.gxSupabaseReady) await window.gxSupabaseReady;
      if(!window.gxSupabase){ showMsg('تعذّر الاتصال، حاول لاحقاً'); return; }
      const email = el.querySelector('#gxAuthEmail').value.trim();
      const password = el.querySelector('#gxAuthPass').value;
      const mode = el.dataset.mode;
      if(mode === 'signin'){
        const { error } = await window.gxSupabase.auth.signInWithPassword({ email, password });
        if(error){ showMsg(error.message); return; }
        showMsg('تم الدخول 👋', true);
        setTimeout(()=> window.location.reload(), 500);
      }else{
        const username = el.querySelector('#gxAuthUsername').value.trim();
        if(!/^[a-zA-Z0-9_]{3,20}$/.test(username)){ showMsg('اسم المستخدم: 3-20 حرف/رقم/_'); return; }
        const { error } = await window.gxSupabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + '/app/index.html', data: { username } },
        });
        if(error){ showMsg(error.message); return; }
        showMsg('تم إنشاء الحساب! تحقق من إيميلك.', true);
      }
    }catch(err){ showMsg((err && err.message) || 'خطأ غير متوقع'); }
  });

  el.querySelector('#gxAuthGoogle').addEventListener('click', async ()=>{
    showMsg('...');
    try{
      if(window.gxSupabaseReady) await window.gxSupabaseReady;
      if(!window.gxSupabase){ showMsg('تعذّر الاتصال'); return; }
      const { error } = await window.gxSupabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/app/index.html' },
      });
      if(error) showMsg(error.message);
    }catch(err){ showMsg((err && err.message) || 'خطأ'); }
  });
}

function gxOpenAuthModal(){
  gxEnsureAuthModal();
  const el = document.getElementById('gxAuthModal');
  if(el) el.classList.add('open');
}

async function gxFetchProfile(user){
  if(!user) return null;
  const meta = user.user_metadata || {};
  let cached = null;
  try{
    const raw = localStorage.getItem(`gx:profile:${user.id}`);
    if(raw) cached = JSON.parse(raw);
  }catch(_){}
  try{
    const { data } = await window.gxSupabase
      .from('profiles')
      .select('username, full_name, avatar_url, xp, level, email')
      .eq('id', user.id)
      .maybeSingle();
    if(data){
      const merged = Object.assign(
        {},
        cached || {},
        {
          username: meta.username,
          full_name: meta.full_name || meta.name,
          avatar_url: meta.avatar_url,
          email: user.email,
        },
        data,
        { email: data.email || user.email }
      );
      try{ localStorage.setItem(`gx:profile:${user.id}`, JSON.stringify(Object.assign({}, merged, { _cachedAt: Date.now() }))); }catch(_){}
      return merged;
    }
    return Object.assign(
      {},
      cached || {},
      {
        email: user.email,
        username: meta.username,
        full_name: meta.full_name || meta.name,
        avatar_url: meta.avatar_url,
      }
    );
  }catch(_){
    return Object.assign(
      {},
      cached || {},
      {
        email: user.email,
        username: meta.username,
        full_name: meta.full_name || meta.name,
        avatar_url: meta.avatar_url,
      }
    );
  }
}

async function gxRenderAuthState(){
  gxRenderAccountLink(false, false);
  try{
    if(!window.gxSupabaseReady && window.gxSupabaseBridgeScriptReady) await window.gxSupabaseBridgeScriptReady;
    if(!window.gxSupabaseReady) return;
    await window.gxSupabaseReady;
    if(!window.gxSupabase) return;

    const applyForSession = async (session) => {
      const user = session && session.user;
      if(!user){ gxRenderAccountLink(false, false); return; }
      let isAdmin = false; let profile = null;
      try{
        const checkAdmin = async () => {
          try{
            const { data } = await window.gxSupabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
            return !!data;
          }catch(_){
            return false;
          }
        };
        const [adminAllowed, prof] = await Promise.all([
          checkAdmin(),
          gxFetchProfile(user),
        ]);
        isAdmin = adminAllowed;
        profile = prof;
      }catch(_){}
      gxRenderAccountLink(true, isAdmin, profile || { email: user.email });
      gxInitNotifications(user);
    };


    const { data: sessData } = await window.gxSupabase.auth.getSession();
    await applyForSession(sessData && sessData.session);

    window.gxSupabase.auth.onAuthStateChange((event, session) => {
      // Only react to identity transitions; ignore TOKEN_REFRESHED to avoid flicker
      if(event !== 'SIGNED_IN' && event !== 'SIGNED_OUT' && event !== 'USER_UPDATED') return;
      applyForSession(session);
    });

    // Refresh navbar when profile is updated from /account
    const refresh = async () => {
      try{
        const { data } = await window.gxSupabase.auth.getSession();
        await applyForSession(data && data.session);
      }catch(_){}
    };
    window.addEventListener('gx:profile-updated', refresh);
    window.addEventListener('storage', (e) => { if(e.key === 'gx:profile-updated') refresh(); });

  }catch(e){ /* keep default login CTA */ }
}

/* ============================================================
   Notifications — realtime badge on the navbar avatar + chime.
   ============================================================ */
let gxNotifSub = null;
let gxUnreadCount = 0;

function gxSetUnread(n){
  gxUnreadCount = Math.max(0, n|0);
  const dot = document.getElementById('accUnreadDot');
  const badge = document.getElementById('accUnreadBadge');
  if(dot) dot.hidden = gxUnreadCount === 0;
  if(badge){
    if(gxUnreadCount === 0){ badge.hidden = true; }
    else { badge.hidden = false; badge.textContent = gxUnreadCount > 99 ? '99+' : String(gxUnreadCount); }
  }
}

function gxPlayNotifChime(){
  try{
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if(!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [ [880, 0], [1320, 0.11] ].forEach(([freq, offset])=>{
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, now + offset);
      g.gain.exponentialRampToValueAtTime(0.22, now + offset + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.28);
      o.connect(g).connect(ctx.destination);
      o.start(now + offset); o.stop(now + offset + 0.3);
    });
    setTimeout(()=> ctx.close && ctx.close(), 900);
  }catch(_){}
}

async function gxInitNotifications(user){
  try{
    if(!window.gxSupabase || !user) return;
    // Fetch current unread count
    const { count } = await window.gxSupabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null);
    gxSetUnread(count || 0);

    // Avoid duplicate subscriptions
    if(gxNotifSub){
      try{ await window.gxSupabase.removeChannel(gxNotifSub); }catch(_){}
      gxNotifSub = null;
    }
    gxNotifSub = window.gxSupabase
      .channel('gx-notif-' + user.id)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload)=>{
          gxSetUnread(gxUnreadCount + 1);
          gxPlayNotifChime();
          const n = payload.new || {};
          gxShowToast(n.title || 'إشعار جديد', n.body || '');
        }
      )
      .subscribe();
  }catch(e){ /* silent */ }
}

function gxShowToast(title, body){
  let host = document.getElementById('gxToastHost');
  if(!host){
    host = document.createElement('div');
    host.id = 'gxToastHost';
    host.style.cssText = 'position:fixed;top:76px;left:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
    document.body.appendChild(host);
  }
  const t = document.createElement('div');
  t.setAttribute('dir','rtl');
  t.style.cssText = 'background:linear-gradient(135deg,#0f172a,#1e293b);color:#f5f6f8;border:1px solid rgba(0,229,255,.35);box-shadow:0 12px 32px rgba(0,229,255,.18);padding:12px 14px;border-radius:12px;min-width:260px;max-width:340px;pointer-events:auto;transform:translateY(-8px);opacity:0;transition:all .25s;';
  t.innerHTML = `<div style="font-weight:800;color:#00e5ff;font-size:14px;margin-bottom:4px;">🔔 ${title}</div><div style="font-size:13px;color:#c8ccd6;">${body||''}</div>`;
  host.appendChild(t);
  requestAnimationFrame(()=>{ t.style.opacity='1'; t.style.transform='translateY(0)'; });
  setTimeout(()=>{ t.style.opacity='0'; t.style.transform='translateY(-8px)'; setTimeout(()=> t.remove(), 300); }, 5500);
}

document.addEventListener('DOMContentLoaded', gxInitLayout);

/* ============================================================
   Notifications Center — right-side sliding drawer.
   ============================================================ */
function gxEnsureNotifCenter(){
  if(document.getElementById('gxNotifCenter')) return document.getElementById('gxNotifCenter');
  const el = document.createElement('div');
  el.id = 'gxNotifCenter';
  el.className = 'gx-notif';
  el.setAttribute('dir','rtl');
  el.innerHTML = `
    <div class="gx-notif__scrim" data-close></div>
    <aside class="gx-notif__panel" role="dialog" aria-modal="true" aria-label="الإشعارات">
      <header class="gx-notif__head">
        <div class="gx-notif__title"><span>🔔</span><span>الإشعارات</span></div>
        <button type="button" class="gx-notif__close" data-close aria-label="إغلاق">✕</button>
      </header>
      <div class="gx-notif__list" id="gxNotifList">
        <div class="gx-notif__empty">جاري التحميل…</div>
      </div>
    </aside>`;
  document.body.appendChild(el);
  el.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', ()=> el.classList.remove('open')));
  document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') el.classList.remove('open'); });
  return el;
}

function gxRelTime(iso){
  try{
    const t = new Date(iso).getTime();
    const s = Math.max(1, Math.floor((Date.now() - t)/1000));
    if(s < 60) return 'الآن';
    const m = Math.floor(s/60); if(m < 60) return `قبل ${m} د`;
    const h = Math.floor(m/60); if(h < 24) return `قبل ${h} س`;
    const d = Math.floor(h/24); if(d < 30) return `قبل ${d} ي`;
    return new Date(iso).toLocaleDateString('ar-EG');
  }catch(_){ return ''; }
}

function gxNotifIcon(type){
  if(type === 'order_delivered') return '✅';
  if(type === 'order_pending') return '⏳';
  return '🔔';
}

async function gxOpenNotifCenter(){
  const el = gxEnsureNotifCenter();
  el.classList.add('open');
  const list = el.querySelector('#gxNotifList');
  list.innerHTML = '<div class="gx-notif__empty">جاري التحميل…</div>';
  try{
    if(window.gxSupabaseReady) await window.gxSupabaseReady;
    const sb = window.gxSupabase;
    if(!sb){ list.innerHTML = '<div class="gx-notif__empty">تعذّر التحميل.</div>'; return; }
    const { data: userData } = await sb.auth.getUser();
    const user = userData && userData.user;
    if(!user){ list.innerHTML = '<div class="gx-notif__empty">سجّل دخول لعرض الإشعارات.</div>'; return; }
    const { data, error } = await sb
      .from('notifications')
      .select('id, type, title, body, read_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if(error) throw error;
    if(!data || data.length === 0){
      list.innerHTML = '<div class="gx-notif__empty">لا توجد إشعارات بعد.</div>';
    } else {
      list.innerHTML = data.map(n => `
        <div class="gx-notif__item ${n.read_at ? '' : 'is-unread'}">
          <div class="gx-notif__ico">${gxNotifIcon(n.type)}</div>
          <div class="gx-notif__body">
            <div class="gx-notif__t">${n.title || 'إشعار'}</div>
            ${n.body ? `<div class="gx-notif__b">${n.body}</div>` : ''}
            <div class="gx-notif__time">${gxRelTime(n.created_at)}</div>
          </div>
        </div>`).join('');
    }
    // Mark unread as read
    const unreadIds = (data || []).filter(n => !n.read_at).map(n => n.id);
    if(unreadIds.length){
      try{
        await sb.from('notifications').update({ read_at: new Date().toISOString() }).in('id', unreadIds);
        gxSetUnread(0);
      }catch(_){}
    }
  }catch(e){
    list.innerHTML = '<div class="gx-notif__empty">تعذّر تحميل الإشعارات.</div>';
  }
}
window.gxOpenNotifCenter = gxOpenNotifCenter;



