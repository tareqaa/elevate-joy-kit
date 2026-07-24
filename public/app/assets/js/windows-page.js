/* ============================================================
   WINDOWS PAGE — Snapchat-style plan selector.
   Lets the visitor pick a Windows edition + activation type and
   shows a live order summary with the dynamic price, then adds
   that single plan to the cart (or jumps to "buy now").
   ============================================================ */

const wp = PRODUCTS_CATALOG.windows;

let winState = {
  planId: wp.plans.find(pl => pl.tag)?.id || wp.plans[0].id,
};

function renderWinHero(){
  const iconMarkup = productIconMarkup(wp);
  document.getElementById('productHeroRoot').innerHTML = `
    <div class="wrap">
      <div class="product-hero-inner fade-in">
        <div class="product-icon-badge">
          <div class="core">${iconMarkup}</div>
        </div>
        <div class="product-hero-text">
          <span class="cat-tag">${wp.category}</span>
          <h1>${wp.tagline}</h1>
          <p>${wp.description}</p>
        </div>
      </div>
    </div>
  `;
}

function getWinPlan(){
  return wp.plans.find(pl => pl.id === winState.planId);
}

function renderWinPlans(){
  const grid = document.getElementById('winPlanGrid');
  grid.innerHTML = wp.plans.map(plan => {
    const discount = plan.oldPrice ? Math.round((1 - plan.price / plan.oldPrice) * 100) : 0;
    return `
    <div class="snap-plan ${plan.id === winState.planId ? 'selected' : ''}" data-id="${plan.id}">
      <div class="sp-check">✓</div>
      ${plan.tag ? `<div class="sp-tag">${plan.tag}</div>` : ''}
      ${discount ? `<div class="sp-discount">وفّر ${discount}%</div>` : ''}
      <div class="sp-icon" style="background:rgba(0,164,239,0.14); font-size:22px;">🪟</div>
      <div class="sp-label" style="font-size:14.5px; line-height:1.35;">${plan.label}</div>
      <div>
        ${plan.oldPrice ? `<span class="sp-old" data-old="${plan.oldPrice}">${GXCurrency.format(plan.oldPrice)}</span>` : ''}
        <span class="sp-price" data-new="${plan.price}">${GXCurrency.format(plan.price)}</span>
      </div>
    </div>
  `;
  }).join('');

  grid.querySelectorAll('.snap-plan').forEach(card => {
    card.addEventListener('click', () => {
      winState.planId = card.dataset.id;
      renderWinPlans();
      updateWinSummary();
    });
  });
}

function updateWinSummary(){
  const plan = getWinPlan();
  document.getElementById('winSumEdition').textContent = plan.label;
  document.getElementById('winSumOld').textContent = plan.oldPrice ? GXCurrency.format(plan.oldPrice) : '—';
  document.getElementById('winSumTotal').textContent = GXCurrency.format(plan.price);
}

function wireWinActions(){
  document.getElementById('addWinBtn').addEventListener('click', () => {
    const plan = getWinPlan();
    GXCart.add(plan.id, 1);
    gxShowAddedToast();
    const btn = document.getElementById('addWinBtn');
    btn.textContent = '✓ أضيفت للسلة بنجاح';
    btn.classList.add('added');
    setTimeout(()=>{
      btn.textContent = '🛒 أضف الطلب للسلة';
      btn.classList.remove('added');
    }, 1600);
  });
  document.getElementById('buyWinBtn').addEventListener('click', () => {
    const plan = getWinPlan();
    GXCart.buyNow(plan.id);
  });
}

function renderWinFeatures(){
  const grid = document.getElementById('featuresGrid');
  grid.innerHTML = wp.features.map(f => `
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

function renderWinDelivery(){
  document.getElementById('deliveryRoot').innerHTML = `
    <div class="delivery-box fade-in">
      <div class="dic">🔒</div>
      <div>
        <h3>كيف توصلك الباقة؟</h3>
        <p>${wp.deliveryMethod}</p>
      </div>
    </div>
  `;
}

function refreshWinPrices(){
  renderWinPlans();
  updateWinSummary();
}

function initWindowsPage(){
  document.title = `${wp.name} — GX Store`;
  renderWinHero();
  renderWinPlans();
  updateWinSummary();
  wireWinActions();
  renderWinFeatures();
  renderWinDelivery();
}

document.addEventListener('DOMContentLoaded', initWindowsPage);
document.addEventListener('gx:rerender-prices', refreshWinPrices);
