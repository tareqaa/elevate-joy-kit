/* ============================================================
   FORTNITE PAGE — custom logic for /games/fortnite/.
   Unlike a normal product page, Fortnite sells two distinct
   things (a monthly Crew subscription and V-Bucks currency),
   so it gets its own dedicated script instead of the generic
   product-page.js template.
   ============================================================ */

const p = PRODUCTS_CATALOG.fortnite;

function renderFortniteHero(){
  document.getElementById('productHeroRoot').innerHTML = `
    <div class="wrap">
      <div class="product-hero-inner fade-in">
        <div class="product-icon-badge">
          <div class="core">${p.icon}</div>
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

function renderCrewPlans(){
  const grid = document.getElementById('crewGrid');
  grid.innerHTML = p.crewPlans.map(plan => {
    const discount = plan.oldPrice ? Math.round((1 - plan.price / plan.oldPrice) * 100) : 0;
    return `
      <div class="prod-card">
        <div class="prod-thumb" style="background:${p.thumbBg};">
          ${plan.tag ? `<span class="tag-badge">${plan.tag}</span>` : ''}
          ${discount ? `<span class="discount-badge">-${discount}%</span>` : ''}
          ${crewIconSvg()}
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

function renderVbucksPlans(){
  const grid = document.getElementById('vbucksGrid');
  grid.innerHTML = p.vbucksPlans.map(plan => {
    const discount = plan.oldPrice ? Math.round((1 - plan.price / plan.oldPrice) * 100) : 0;
    return `
      <div class="prod-card">
        <div class="prod-thumb" style="background:${p.thumbBg};">
          ${discount ? `<span class="discount-badge">-${discount}%</span>` : ''}
          ${vbucksIconSvg()}
        </div>
        <div class="prod-body">
          <div class="prod-name" style="min-height:auto; font-size:15px;">${plan.label}</div>
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

  // Custom quantity card — price isn't fixed, so we add it as a
  // custom cart item and quote the final price over WhatsApp.
  const customBtn = document.getElementById('customVbBtn');
  const customInput = document.getElementById('customVbAmount');
  customBtn.addEventListener('click', () => {
    const amount = parseInt(customInput.value, 10);
    if(!amount || amount <= 0){
      customInput.focus();
      customInput.style.borderColor = 'var(--pink)';
      setTimeout(()=>{ customInput.style.borderColor = ''; }, 1200);
      return;
    }
    GXCart.addCustom({
      name:`V-Bucks — كمية مخصصة (${amount.toLocaleString('en-US')})`,
      icon:'🪙',
      bg:p.thumbBg,
      price:0,
    });
    GXCart.appendNote(`طلب كمية V-Bucks مخصصة: ${amount.toLocaleString('en-US')} وحدة — الرجاء تأكيد السعر`);
    gxShowAddedToast();
    customBtn.textContent = '✓ أضيفت — بنأكدلك السعر عالواتساب';
    customBtn.classList.add('added');
    setTimeout(()=>{
      customBtn.textContent = 'أضف الكمية المخصصة';
      customBtn.classList.remove('added');
      customInput.value = '';
    }, 1600);
  });
}

function renderFortniteFeatures(){
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

function renderFortniteDelivery(){
  const d = p.delivery;
  document.getElementById('deliveryRoot').innerHTML = `
    <div class="delivery-box fade-in delivery-box-wide">
      <div class="dic">🔒</div>
      <div>
        <h3>كيف توصلك الباقة؟</h3>
        <p>${d.intro}</p>

        <div class="delivery-cols">
          <div class="delivery-col">
            <div class="delivery-col-title">📋 المطلوب منك بعد الطلب</div>
            <ul class="delivery-list">
              ${d.requirements.map(r => `<li>${r}</li>`).join('')}
            </ul>
          </div>
          <div class="delivery-col">
            <div class="delivery-col-title">🛡️ الأمان والموثوقية</div>
            <ul class="delivery-list">
              ${d.safety.map(s => `<li>${s}</li>`).join('')}
            </ul>
          </div>
        </div>

        <div class="delivery-col-title" style="margin-top:18px;">🎮 يشمل رصيد V-Bucks</div>
        <ul class="delivery-list">
          ${d.platformNotes.map(n => `<li>${n}</li>`).join('')}
        </ul>
      </div>
    </div>
  `;
}

function refreshFortnitePrices(){
  document.querySelectorAll('.prod-old').forEach(el => {
    el.textContent = GXCurrency.format(parseFloat(el.dataset.old));
  });
  document.querySelectorAll('.prod-new').forEach(el => {
    el.textContent = GXCurrency.format(parseFloat(el.dataset.new));
  });
}

function initFortnitePage(){
  document.title = `${p.name} — GX Store`;
  renderFortniteHero();
  renderCrewPlans();
  renderVbucksPlans();
  renderFortniteFeatures();
  renderFortniteDelivery();
}

document.addEventListener('DOMContentLoaded', initFortnitePage);
document.addEventListener('gx:rerender-prices', refreshFortnitePrices);
