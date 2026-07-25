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
        <div class="search-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          <input type="text" placeholder="دور على منتج أو اشتراك...">
        </div>
        <div class="nav-right">
          <button class="currency-pick" id="currencyBtn" type="button">
            <span id="currencyBtnFlag">🇯🇴</span>
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
  const flagEl = document.getElementById('currencyBtnFlag');
  const codeEl = document.getElementById('currencyBtnCode');
  if(!flagEl || !codeEl) return;
  const code = GXCurrency.get();
  const info = CURRENCIES[code];
  if(info) flagEl.textContent = info.flag;
  codeEl.textContent = code;
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
  if(document.querySelector('script[data-gx-supabase]')) return;
  const s = document.createElement('script');
  s.src = '/app/assets/js/supabase-bridge.js';
  s.setAttribute('data-gx-supabase', '1');
  document.head.appendChild(s);
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

// Renders an account/login link in the navbar. Draws the "login" state
// immediately so the button is always visible, then upgrades to the
// "account" state once the Supabase bridge finishes loading.
function gxRenderAccountLink(signedIn){
  const navRight = document.querySelector('.nav-right');
  if(!navRight) return;
  const existing = document.getElementById('accountLink');
  if(existing) existing.remove();
  const link = document.createElement('a');
  link.id = 'accountLink';
  link.className = 'icon-btn account-link';
  if(signedIn){
    link.href = '/account';
    link.title = 'حسابي';
    link.setAttribute('aria-label','حسابي');
    link.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    link.classList.add('account-link--signed');
  }else{
    link.href = '/auth';
    link.title = 'تسجيل الدخول';
    link.setAttribute('aria-label','تسجيل الدخول');
    link.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>';
  }
  navRight.insertBefore(link, navRight.firstChild);
}

async function gxRenderAuthState(){
  // Show the login CTA immediately (bridge may not be loaded yet).
  gxRenderAccountLink(false);
  try{
    if(!window.gxSupabaseReady) return;
    await window.gxSupabaseReady;
    if(!window.gxSupabase) return;
    const { data } = await window.gxSupabase.auth.getUser();
    gxRenderAccountLink(!!(data && data.user));
    // Keep it in sync with auth changes.
    window.gxSupabase.auth.onAuthStateChange((_e, session) => {
      gxRenderAccountLink(!!session);
    });
  }catch(e){ /* keep default login CTA */ }
}



document.addEventListener('DOMContentLoaded', gxInitLayout);
