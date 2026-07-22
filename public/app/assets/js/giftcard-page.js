/* ============================================================
   GIFT CARD PLATFORM PAGE — renders the hero card mockup and,
   for each region, a grid of fixed-value denominations. Falls
   back to a professional empty state when a platform has no
   regions/prices added yet (e.g. Google Play, for now).
   Each page sets `const GIFTCARD_KEY` before including this
   script.
   ============================================================ */

function renderGiftcardHero(gc){
  const iconMarkup = gc.iconImg
    ? `<img src="${gc.iconImg}" alt="${gc.name}" style="width:56px; height:56px; object-fit:contain; filter:drop-shadow(0 4px 10px rgba(0,0,0,0.35));"/>`
    : `<span style="font-size:44px; line-height:1;">${gc.icon}</span>`;
  document.getElementById('giftcardHeroRoot').innerHTML = `
    <div class="wrap">
      <div class="giftcard-hero-inner fade-in">
        <div class="giftcard-mockup" style="background:${gc.cardGradient};">
          <div class="gc-top">
            <span class="gc-icon">${iconMarkup}</span>
            <div class="gc-chip"></div>
          </div>
          <div>
            <div class="gc-name">${gc.name}</div>
            <div class="gc-sub">Digital Gift Card</div>
          </div>
        </div>
        <div class="giftcard-hero-text">
          <h1>${gc.name}</h1>
          <p>اختار المنطقة والقيمة المناسبة إلك — تسليم الكود الرقمي بيوصلك مباشرة بعد تأكيد الطلب.</p>
        </div>
      </div>
    </div>
  `;
}

function renderGiftcardRegions(gc){
  const root = document.getElementById('regionsRoot');

  if(!gc.regions || gc.regions.length === 0){
    root.innerHTML = `
      <div class="giftcard-empty fade-in">
        <div class="ge-icon">🕓</div>
        <h3>القيم والأسعار جاية قريبًا</h3>
        <p>عم نجهز باقات ${gc.name} — لو حابب تطلب قيمة معينة هلق، تواصل معنا مباشرة عالواتساب وبنساعدك.</p>
      </div>
    `;
    return;
  }

  root.innerHTML = gc.regions.map(region => `
    <div class="region-section">
      <div class="region-head">
        <div class="region-flag"><img src="https://flagcdn.com/w160/${region.code}.png" srcset="https://flagcdn.com/w320/${region.code}.png 2x" alt="${region.name}"/></div>
        <div class="region-name">${region.name}</div>
      </div>
      <div class="denom-grid" style="--gc-accent:${gc.accent};">
        ${region.denominations.map(d => `
          <div class="denom-card">
            <div class="dc-value">${d.value}</div>
            <div class="dc-price"><span data-price="${d.price}">${GXCurrency.format(d.price)}</span></div>
            ${gxBuyActionsHtml(d.id)}
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  gxWireBuyActions(root);
}

function refreshGiftcardPrices(){
  document.querySelectorAll('.dc-price [data-price]').forEach(el => {
    el.textContent = GXCurrency.format(parseFloat(el.dataset.price));
  });
}

function initGiftcardPage(){
  const gc = GIFT_CARDS_CATALOG[GIFTCARD_KEY];
  if(!gc){ console.error('Unknown gift card key:', GIFTCARD_KEY); return; }
  document.title = `${gc.name} — GX Store`;
  renderGiftcardHero(gc);
  renderGiftcardRegions(gc);
}

document.addEventListener('DOMContentLoaded', initGiftcardPage);
document.addEventListener('gx:rerender-prices', refreshGiftcardPrices);
