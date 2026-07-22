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
