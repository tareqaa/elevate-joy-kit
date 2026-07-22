/* ============================================================
   HOME PAGE — renders the category quick-links and the
   featured products grid using the shared product catalog.
   Requires: products-data.js, currency.js, cart.js, layout.js
   ============================================================ */

function renderHomeCategories(){
  const grid = document.getElementById('catGridBig');
  grid.innerHTML = CATEGORY_LINKS.map(c => {
    // The Design/Apps category gets a custom "creative suite" icon grid
    // instead of a plain emoji, evoking a set of creative apps without
    // copying any specific brand's actual icon or logo.
    const iconMarkup = c.slug === 'design'
      ? `<div class="app-icon-grid">
           <span style="background:linear-gradient(135deg,#3b7bf6,#1e4fd1);">Ps</span>
           <span style="background:linear-gradient(135deg,#ff7a3d,#e0402a);">Ai</span>
           <span style="background:linear-gradient(135deg,#8b5cf6,#5b21b6);">Pr</span>
           <span style="background:linear-gradient(135deg,#22c1a8,#0e7a6a);">Id</span>
         </div>`
      : `<div class="cat-ic" style="background:${c.bg}; box-shadow:inset 0 0 0 1.5px ${c.accent}33;">${c.icon}</div>`;

    return `
      <a href="/app/${c.slug}/index.html" class="cat-card-big" style="--accent:${c.accent};">
        <div class="ccb-top">
          ${iconMarkup}
          <div class="ccb-glow" style="background:${c.accent};"></div>
        </div>
        <div>
          <div class="cname-modern">${c.name}</div>
          <div class="cdesc">${c.desc || ''}</div>
        </div>
        <div class="carrow">تصفح القسم <span class="arrow-ic">‹</span></div>
      </a>
    `;
  }).join('');
}

function iconForFeaturedItem(item){
  if(item.product === 'adobe') return adobeIconSvg();
  if(item.product === 'fortnite' && item.cartId.startsWith('fn-crew')) return crewIconSvg();
  if(item.product === 'fortnite' && item.cartId.startsWith('fn-vb')){
    const tier = parseInt(item.cartId.replace('fn-vb-', ''), 10);
    return vbucksIconSvg(tier);
  }
  return item.icon;
}

function renderHomeProducts(){
  const grid = document.getElementById('prodGrid');
  const featured = getFeaturedItems();

  grid.innerHTML = featured.map(p => {
    const discount = Math.round((1 - p.price / p.oldPrice) * 100);
    // Every featured card here represents a specific pre-selected plan
    // (e.g. Snapchat 6-months, Adobe 1-month), so it always renders the
    // standard Add-to-cart / Buy-now action pair used across the site.
    const actionBtn = gxBuyActionsHtml(p.cartId);
    return `
      <div class="prod-card">
        <a href="${p.link}" style="display:contents;">
          <div class="prod-thumb" style="background:${p.bg};">
            <span class="discount-badge">-${discount}%</span>
            ${iconForFeaturedItem(p)}
          </div>
        </a>
        <div class="prod-body">
          <div class="prod-stars">★★★★★</div>
          <div class="prod-name">${p.name}</div>
          <div class="prod-prices">
            <span class="prod-old" data-old="${p.oldPrice}">${GXCurrency.format(p.oldPrice)}</span>
            <span class="prod-new" data-new="${p.price}">${GXCurrency.format(p.price)}</span>
          </div>
          ${actionBtn}
        </div>
      </div>
    `;
  }).join('');

  gxWireBuyActions(grid);
}

function refreshHomePrices(){
  document.querySelectorAll('.prod-old').forEach(el => {
    el.textContent = GXCurrency.format(parseFloat(el.dataset.old));
  });
  document.querySelectorAll('.prod-new').forEach(el => {
    el.textContent = GXCurrency.format(parseFloat(el.dataset.new));
  });
}

const TESTIMONIALS = [
  {name:'يوسف المومني', initial:'ي', color:'linear-gradient(135deg,#00e5ff,#0a6e8c)', quote:'أفضل متجر بالأسعار'},
  {name:'يزن القضاة',   initial:'ي', color:'linear-gradient(135deg,#ff2d78,#b0195a)', quote:null},
  {name:'زهير زامل',    initial:'ز', color:'linear-gradient(135deg,#c6ff3d,#7ea62a)', quote:'التفعيل كان فوري'},
  {name:'Wessam',        initial:'W', color:'linear-gradient(135deg,#b26bff,#6a2df0)', quote:'أنصح فيه بشدة'},
  {name:'علي',           initial:'ع', color:'linear-gradient(135deg,#ffcb47,#c98a12)', quote:null},
  {name:'افنان عمر',     initial:'ا', color:'linear-gradient(135deg,#4fdc4f,#0e7a3c)', quote:'خدمة ممتازة'},
  {name:'طارق دوعر',     initial:'ط', color:'linear-gradient(135deg,#ff8a3d,#c9530f)', quote:'تعامل راقي ومحترم'},
  {name:'Sara Alasmar',  initial:'S', color:'linear-gradient(135deg,#ff5ea8,#c91e6b)', quote:null},
  {name:'Kh H',          initial:'K', color:'linear-gradient(135deg,#38bdf8,#1d6fa8)', quote:'سريع وموثوق'},
  {name:'Rami Awad',     initial:'R', color:'linear-gradient(135deg,#a3e635,#5c8a12)', quote:'تجربة ممتازة'},
  {name:'أحمد زامل',     initial:'أ', color:'linear-gradient(135deg,#818cf8,#4338ca)', quote:'خدمة رائعة وسريعة'},
];

function renderTestimonials(){
  const grid = document.getElementById('testiGrid');
  if(!grid) return;
  // Render the list twice back-to-back so the auto-scroll can loop seamlessly.
  const cardsHtml = TESTIMONIALS.map(t => `
    <div class="testi-card">
      <div class="testi-top">
        <div class="testi-avatar" style="background:${t.color};">${t.initial}</div>
        <div>
          <div class="testi-name">${t.name}</div>
          <div class="testi-stars">★★★★★</div>
        </div>
      </div>
      ${t.quote ? `<div class="testi-quote">${t.quote}</div>` : ''}
    </div>
  `).join('');
  grid.innerHTML = cardsHtml + cardsHtml;

  initTestimonialAutoScroll(grid);
}

function initTestimonialAutoScroll(grid){
  let paused = false;
  let loopWidth = 0;
  let scrollPos = 0; // float accumulator; grid.scrollLeft itself rounds to whole pixels

  function measure(){
    loopWidth = grid.scrollWidth / 2;
  }
  measure();
  window.addEventListener('resize', measure);

  grid.addEventListener('mouseenter', () => paused = true);
  grid.addEventListener('mouseleave', () => { scrollPos = grid.scrollLeft; paused = false; });
  grid.addEventListener('touchstart', () => paused = true, {passive:true});
  grid.addEventListener('touchend', () => setTimeout(()=>{ scrollPos = grid.scrollLeft; paused = false; }, 2000), {passive:true});

  const SPEED = 2.5; // px per frame — clearly faster automatic scroll, still smooth
  function step(){
    if(!paused && loopWidth > 0){
      // RTL scroll containers in Chrome use negative scrollLeft values
      // to move into overflowing content, unlike LTR containers.
      scrollPos -= SPEED;
      if(scrollPos <= -loopWidth){
        scrollPos += loopWidth;
      }
      grid.scrollLeft = scrollPos;
    }
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function initStatCounter(){
  const el = document.getElementById('statCounter');
  if(!el) return;
  const target = 2000;
  let rafId = null;

  function animate(){
    if(rafId) cancelAnimationFrame(rafId);
    // Slow, smooth count from 0 up to the target (1000+).
    const duration = 3800;
    const startTime = performance.now();
    el.textContent = '0';
    function tick(now){
      const progress = Math.min((now - startTime) / duration, 1);
      // easeOutQuint — smooth, gentle deceleration, no jumpy feel.
      const eased = 1 - Math.pow(1 - progress, 5);
      el.textContent = Math.round(eased * target).toLocaleString('en-US');
      if(progress < 1) rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
  }

  // Restart the count every time the box scrolls back into view.
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting) animate();
    });
  }, {threshold:0.5});
  const host = el.closest('#statTrust') || el.closest('.trust-item') || el.parentElement;
  if(host) observer.observe(host);
}

document.addEventListener('DOMContentLoaded', () => {
  renderHomeCategories();
  renderHomeProducts();
  renderTestimonials();
  initStatCounter();
});
document.addEventListener('gx:rerender-prices', refreshHomePrices);
