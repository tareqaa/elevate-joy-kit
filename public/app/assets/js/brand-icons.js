/* ============================================================
   BRAND ICONS — shared brand badges for third-party products we
   resell. Each shares the same 52px rounded-square "app badge"
   frame so they read as one consistent icon family across the
   site. Used by: home-page.js, fortnite-page.js, product-page.js
   ============================================================ */

function _brandTileImg(src, alt, gradient, extraStyle){
  return `
    <span style="display:inline-flex; align-items:center; justify-content:center;
                 width:52px; height:52px; border-radius:14px;
                 background:${gradient};
                 border:1.5px solid rgba(255,255,255,0.22);
                 box-shadow:0 6px 14px -8px rgba(0,0,0,0.5);
                 ${extraStyle || ''}">
      <img src="${src}" alt="${alt}" width="40" height="40"
           style="display:block; width:40px; height:40px; object-fit:contain;
                  filter:drop-shadow(0 2px 4px rgba(0,0,0,0.25));"/>
    </span>
  `;
}

// V-Bucks — real V-Bucks coin artwork, background tinted by Fortnite
// rarity color based on the pack size (following official Fortnite
// rarity: uncommon/green, rare/blue, epic/purple, legendary/gold).
const VBUCKS_TIER_GRADIENTS = {
  800:   'linear-gradient(135deg,#4bd94b,#1e7a1e)',   // Uncommon (green)
  2400:  'linear-gradient(135deg,#3ba9ff,#0a3d91)',   // Rare (blue)
  4500:  'linear-gradient(135deg,#b26bff,#4a1e9c)',   // Epic (purple)
  12500: 'linear-gradient(135deg,#ffcf47,#c76a0a)',   // Legendary (gold/orange)
};
function vbucksIconSvg(tier){
  const grad = VBUCKS_TIER_GRADIENTS[tier] || 'linear-gradient(135deg,#12c2c2,#0a6e8c)';
  return _brandTileImg('/app/assets/img/vbucks.png', 'V-Bucks', grad);
}

// Fortnite Crew — official-style crown emblem on the Crew signature
// blue gradient.
function crewIconSvg(){
  return _brandTileImg(
    '/app/assets/img/fortnite-crew-logo.png',
    'Fortnite Crew',
    'linear-gradient(135deg,#1fa9ff,#0a3d91)'
  );
}

// Adobe Creative Cloud — official rainbow CC mark on white.
function adobeIconSvg(){
  return `
    <img src="/app/assets/img/adobe-cc.webp"
         alt="Adobe Creative Cloud"
         width="52" height="52"
         style="display:block; border-radius:14px; background:#fff; padding:4px; box-shadow:0 4px 14px -6px rgba(0,0,0,0.35);"/>
  `;
}

// Fortnite — official F lettermark on the Fortnite signature blue gradient.
function fortniteIconSvg(){
  return _brandTileImg(
    '/app/assets/img/fortnite-logo.png',
    'Fortnite',
    'linear-gradient(135deg,#3ba9ff,#0a3d91)'
  );
}

// Self-contained brand icon (image already ships its own background/frame,
// e.g. Canva 3D icon, gold LinkedIn tile). Rendered as a 52px rounded
// square with a subtle drop shadow so it still fits the icon family.
function brandImgSelfContained(src, alt){
  return `
    <img src="${src}" alt="${alt}" width="52" height="52"
         style="display:block; width:52px; height:52px; object-fit:cover;
                border-radius:14px; box-shadow:0 6px 14px -8px rgba(0,0,0,0.5);"/>
  `;
}

// Tinted brand tile for icons that ship as flat line/color art on a
// transparent background (Microsoft 365, Windows, Gemini, Autodesk…).
// Same 52px rounded-square framing as the other brand icons.
function brandImgTile(src, alt, bgStyle, extraImgStyle){
  const bg = bgStyle || 'linear-gradient(135deg,#1b1f2c,#0b0d14)';
  return `
    <span style="display:inline-flex; align-items:center; justify-content:center;
                 width:52px; height:52px; border-radius:14px;
                 background:${bg};
                 border:1.5px solid rgba(255,255,255,0.22);
                 box-shadow:0 6px 14px -8px rgba(0,0,0,0.5);">
      <img src="${src}" alt="${alt}" width="36" height="36"
           style="display:block; width:36px; height:36px; object-fit:contain;
                  filter:drop-shadow(0 2px 4px rgba(0,0,0,0.25)); ${extraImgStyle || ''}"/>
    </span>
  `;
}

// Per-slug rendering config so every brand ends up in a visually balanced
// tile that works with its own artwork (transparent vs baked-in bg).
const BRAND_ICON_CONFIG = {
  canva:        {mode:'self'},
  linkedin:     {mode:'self'},
  fortnite:     {mode:'self'},
  microsoft365: {mode:'tile', bg:'linear-gradient(135deg,#ea3e23,#7a1a0a)'},
  windows:      {mode:'tile', bg:'linear-gradient(135deg,#f5f7fb,#c9d6e8)'},
  gemini:       {mode:'tile', bg:'linear-gradient(135deg,#8e75b2,#2a1a4a)'},
  // Autodesk logo ships in solid black — flip it to white so it reads on
  // the warm dark tile, matching Autodesk's official on-dark treatment.
  autodesk:     {mode:'tile', bg:'linear-gradient(135deg,#1f1a14,#0a0805)', imgStyle:'filter:invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.35));'},
};

// Central dispatcher used by product-page.js and home-page.js so every
// place that renders a product icon stays consistent as the catalog grows.
function productIconMarkup(product){
  if(!product) return '';
  if(product.slug === 'adobe') return adobeIconSvg();
  if(product.slug === 'fortnite') return fortniteIconSvg();
  const cfg = BRAND_ICON_CONFIG[product.slug];
  if(cfg && product.iconImg){
    if(cfg.mode === 'self') return brandImgSelfContained(product.iconImg, product.name);
    return brandImgTile(product.iconImg, product.name, cfg.bg, cfg.imgStyle);
  }
  if(product.iconImg) return brandImgTile(product.iconImg, product.name);
  return product.icon || '';
}
