/* ============================================================
   SNAPCHAT PAGE — custom order flow for /snapchat/.
   Lets the visitor pick a duration, set how many accounts they
   want activated, and enter a username per account — then adds
   one cart line (qty = number of accounts) and attaches the
   usernames to the shared order notes so they show up in the
   cart page and the WhatsApp message automatically.
   ============================================================ */

const sp = PRODUCTS_CATALOG.snapchat;

let orderState = {
  planId: sp.plans.find(pl => pl.tag)?.id || sp.plans[0].id,
  accounts: 1,
  usernames: [''],
};

function renderSnapHero(){
  document.getElementById('productHeroRoot').innerHTML = `
    <div class="wrap">
      <div class="product-hero-inner fade-in">
        <div class="product-icon-badge">
          <div class="core">${sp.icon}</div>
        </div>
        <div class="product-hero-text">
          <span class="cat-tag">${sp.category}</span>
          <h1>${sp.tagline}</h1>
          <p>${sp.description}</p>
        </div>
      </div>
    </div>
  `;
}

function getSelectedPlan(){
  return sp.plans.find(pl => pl.id === orderState.planId);
}

function renderSnapPlans(){
  const grid = document.getElementById('snapPlanGrid');
  grid.innerHTML = sp.plans.map(plan => {
    const discount = plan.oldPrice ? Math.round((1 - plan.price / plan.oldPrice) * 100) : 0;
    return `
    <div class="snap-plan ${plan.id === orderState.planId ? 'selected' : ''}" data-id="${plan.id}">
      <div class="sp-check">✓</div>
      ${plan.tag ? `<div class="sp-tag">${plan.tag}</div>` : ''}
      ${discount ? `<div class="sp-discount">وفّر ${discount}%</div>` : ''}
      <div class="sp-icon">👻</div>
      <div class="sp-label">${plan.label}</div>
      <div>
        ${plan.oldPrice ? `<span class="sp-old" data-old="${plan.oldPrice}">${GXCurrency.format(plan.oldPrice)}</span>` : ''}
        <span class="sp-price" data-new="${plan.price}">${GXCurrency.format(plan.price)}</span>
      </div>
    </div>
  `;
  }).join('');

  grid.querySelectorAll('.snap-plan').forEach(card => {
    card.addEventListener('click', () => {
      orderState.planId = card.dataset.id;
      renderSnapPlans();
      updateOrderSummary();
    });
  });
}

function renderUsernameFields(){
  const wrap = document.getElementById('usernameFields');
  wrap.innerHTML = orderState.usernames.map((val, i) => `
    <div class="username-field">
      <label>${orderState.usernames.length === 1 ? sp.identifierLabel : `${sp.identifierLabel} — حساب ${i+1}`}</label>
      <input type="text" class="uname-input" data-idx="${i}" placeholder="${sp.identifierPlaceholder}" value="${val}">
    </div>
  `).join('');

  wrap.querySelectorAll('.uname-input').forEach(inp => {
    inp.addEventListener('input', () => {
      orderState.usernames[parseInt(inp.dataset.idx)] = inp.value.trim();
      inp.classList.remove('error');
      document.getElementById('orderError').style.display = 'none';
      updateOrderSummary();
    });
  });
}

function updateOrderSummary(){
  const plan = getSelectedPlan();
  document.getElementById('sumDuration').textContent = plan.label;
  document.getElementById('sumUnitPrice').textContent = GXCurrency.format(plan.price);
  document.getElementById('sumAccounts').textContent = orderState.accounts;
  document.getElementById('sumTotal').textContent = GXCurrency.format(plan.price * orderState.accounts);
}

function wireStepper(){
  document.getElementById('accIncBtn').addEventListener('click', () => {
    if(orderState.accounts >= 10) return;
    // لا نسمح بإضافة حساب جديد قبل تعبئة كل اليوزرات الحالية
    const missingIdx = orderState.usernames.findIndex(u => !u || !u.trim());
    if(missingIdx !== -1){
      const errBox = document.getElementById('orderError');
      errBox.textContent = 'عبّي يوزر الحساب الحالي قبل ما تضيف حساب جديد';
      errBox.style.display = 'block';
      const input = document.querySelector(`.uname-input[data-idx="${missingIdx}"]`);
      if(input){ input.classList.add('error'); input.focus(); }
      return;
    }
    orderState.accounts += 1;
    orderState.usernames.push('');
    document.getElementById('accCount').textContent = orderState.accounts;
    renderUsernameFields();
    updateOrderSummary();
    // ركّز على حقل اليوزر الجديد مباشرة
    setTimeout(() => {
      const newInput = document.querySelector(`.uname-input[data-idx="${orderState.accounts - 1}"]`);
      if(newInput) newInput.focus();
    }, 30);
  });
  document.getElementById('accDecBtn').addEventListener('click', () => {
    if(orderState.accounts <= 1) return;
    orderState.accounts -= 1;
    orderState.usernames.pop();
    document.getElementById('accCount').textContent = orderState.accounts;
    renderUsernameFields();
    updateOrderSummary();
  });
}

function validateOrder(){
  const missingIdx = orderState.usernames.findIndex(u => !u || !u.trim());
  if(missingIdx !== -1){
    const errBox = document.getElementById('orderError');
    errBox.textContent = 'الرجاء إدخال يوزر السناب لكل حساب قبل الإضافة للسلة';
    errBox.style.display = 'block';
    const input = document.querySelector(`.uname-input[data-idx="${missingIdx}"]`);
    if(input){ input.classList.add('error'); input.focus(); }
    return false;
  }
  return true;
}

function wireAddToCart(){
  document.getElementById('addOrderBtn').addEventListener('click', () => {
    if(!validateOrder()) return;
    const plan = getSelectedPlan();
    GXCart.addSnap(plan.id, orderState.usernames);
    gxShowAddedToast();
    const btn = document.getElementById('addOrderBtn');
    btn.textContent = '✓ أضيفت للسلة بنجاح';
    btn.classList.add('added');
    setTimeout(()=>{
      btn.textContent = '🛒 أضف الطلب للسلة';
      btn.classList.remove('added');
    }, 1600);
  });

  document.getElementById('buyNowOrderBtn').addEventListener('click', () => {
    if(!validateOrder()) return;
    const plan = getSelectedPlan();
    GXCart.buyNowSnap(plan.id, orderState.usernames);
  });
}


function renderSnapFeatures(){
  const grid = document.getElementById('featuresGrid');
  grid.innerHTML = sp.features.map(f => `
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

function renderSnapDelivery(){
  document.getElementById('deliveryRoot').innerHTML = `
    <div class="delivery-box fade-in">
      <div class="dic">🔒</div>
      <div>
        <h3>كيف توصلك الباقة؟</h3>
        <p>${sp.deliveryMethod}</p>
        <div class="identifier-note">📌 كل ما نحتاجه منك هو <strong>${sp.identifierLabel}</strong> — بدون أي باسورد.</div>
      </div>
    </div>
  `;
}

function refreshSnapPrices(){
  renderSnapPlans();
  updateOrderSummary();
}

function initSnapchatPage(){
  document.title = `${sp.name} — GX Store`;
  renderSnapHero();
  renderSnapPlans();
  renderUsernameFields();
  updateOrderSummary();
  wireStepper();
  wireAddToCart();
  renderSnapFeatures();
  renderSnapDelivery();
}

document.addEventListener('DOMContentLoaded', initSnapchatPage);
document.addEventListener('gx:rerender-prices', refreshSnapPrices);
