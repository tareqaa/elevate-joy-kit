/* ============================================================
   PRODUCT PAGE — renders hero, plans (add-to-cart cards),
   feature accordion, and delivery note from the shared catalog.
   Every product page sets `const PRODUCT_KEY = '...'` inline
   before including this script.
   ============================================================ */

function renderProductHero(p){
  const iconMarkup = productIconMarkup(p);
  document.getElementById('productHeroRoot').innerHTML = `
    <div class="wrap">
      <div class="product-hero-inner fade-in">
        <div class="product-icon-badge">
          <div class="core">${iconMarkup}</div>
        </div>
        <div class="product-hero-text">
          <span class="cat-tag">${p.category}</span>
          <h1>${p.tagline}</h1>
          <p>${p.description}</p>
        </div>
      </div>
    </div>
  `;
}

function renderProductPlans(p){
  const grid = document.getElementById('plansGrid');
  const iconMarkup = productIconMarkup(p);
  grid.innerHTML = p.plans.map(plan => {
    const discount = plan.oldPrice ? Math.round((1 - plan.price / plan.oldPrice) * 100) : 0;
    return `
      <div class="prod-card">
        <div class="prod-thumb" style="background:${p.thumbBg};">
          ${plan.tag ? `<span class="tag-badge">${plan.tag}</span>` : ''}
          ${discount ? `<span class="discount-badge">-${discount}%</span>` : ''}
          ${iconMarkup}
        </div>
        <div class="prod-body">
          <div class="prod-name" style="min-height:auto; font-size:16px;">${plan.label}</div>
          <div class="prod-prices">
            ${plan.oldPrice ? `<span class="prod-old" data-old="${plan.oldPrice}">${GXCurrency.format(plan.oldPrice)}</span>` : ''}
            <span class="prod-new" data-new="${plan.price}">${GXCurrency.format(plan.price)}</span>
          </div>
          ${gxBuyActionsHtml(plan.id)}
        </div>
      </div>
    `;
  }).join('');

  gxWireBuyActions(grid);
}

function renderProductFeatures(p){
  const grid = document.getElementById('featuresGrid');
  grid.innerHTML = p.features.map(f => `
    <div class="feature-card">
      <div class="fhead">
        <div class="fleft">
          <div class="ficon">${f.icon}</div>
          <div class="ftitle">${f.title}</div>
        </div>
        <div class="chev">⌄</div>
      </div>
      <div class="fbody">
        <div class="fbody-inner"><p>${f.desc}</p></div>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.fhead').forEach(head => {
    head.addEventListener('click', () => head.parentElement.classList.toggle('open'));
  });
}

function renderDeliveryBox(p){
  document.getElementById('deliveryRoot').innerHTML = `
    <div class="delivery-box fade-in">
      <div class="dic">🔒</div>
      <div>
        <h3>كيف توصلك الباقة؟</h3>
        <p>${p.deliveryMethod}</p>
        ${p.identifierLabel ? `<div class="identifier-note">📌 كل ما نحتاجه منك هو <strong>${p.identifierLabel}</strong> — بدون أي باسورد.</div>` : ''}
      </div>
    </div>
  `;
}

function refreshProductPrices(){
  document.querySelectorAll('.prod-old').forEach(el => {
    el.textContent = GXCurrency.format(parseFloat(el.dataset.old));
  });
  document.querySelectorAll('.prod-new').forEach(el => {
    el.textContent = GXCurrency.format(parseFloat(el.dataset.new));
  });
}

function initProductPage(){
  const p = PRODUCTS_CATALOG[PRODUCT_KEY];
  if(!p){ console.error('Unknown product key:', PRODUCT_KEY); return; }
  document.title = `${p.name} — GX Store`;
  renderProductHero(p);
  renderProductPlans(p);
  renderProductFeatures(p);
  renderDeliveryBox(p);
}

document.addEventListener('DOMContentLoaded', initProductPage);
document.addEventListener('gx:rerender-prices', refreshProductPrices);
