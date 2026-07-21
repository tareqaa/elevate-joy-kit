/* ============================================================
   CATEGORY LANDING PAGE — renders the hero + subcategory grid
   for any group category. Each page sets `const CATEGORY_KEY`
   before including this script.
   ============================================================ */

function initCategoryPage(){
  const meta = CATEGORY_META[CATEGORY_KEY];
  const subs = SUBCATEGORIES[CATEGORY_KEY] || [];
  if(!meta){ console.error('Unknown category key:', CATEGORY_KEY); return; }

  document.title = `${meta.name} — GX Store`;

  document.getElementById('categoryHeroRoot').innerHTML = `
    <div class="wrap">
      <div class="category-hero-inner fade-in">
        <div class="category-hero-icon">${meta.icon}</div>
        <div class="category-hero-text">
          <h1>${meta.name}</h1>
          <p>${meta.tagline}</p>
        </div>
      </div>
    </div>
  `;

  document.getElementById('subcatGrid').innerHTML = subs.map(s => {
    if(s.comingSoon){
      return `
        <div class="subcat-card soon">
          <span class="soon-badge">قريبًا</span>
          <div class="subcat-ic" style="background:${s.bg};">${s.icon}</div>
          <div>
            <div class="subcat-name">${s.name}</div>
            <div class="subcat-status" style="color:var(--gray);">قيد الإضافة</div>
          </div>
        </div>
      `;
    }
    return `
      <a href="/app/${CATEGORY_KEY}/${s.slug}/" class="subcat-card clickable">
        <div class="subcat-ic" style="background:${s.bg};">${s.icon}</div>
        <div>
          <div class="subcat-name">${s.name}</div>
          <div class="subcat-status">تصفح المنتجات ‹</div>
        </div>
      </a>
    `;
  }).join('');
}

document.addEventListener('DOMContentLoaded', initCategoryPage);
