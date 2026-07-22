/* ============================================================
   BRAND ICONS — shared custom SVG badges for third-party
   products we resell (V-Bucks, Fortnite Crew, Adobe Creative
   Cloud). Each is drawn as original artwork inspired by the
   product's real visual identity (colors / general shape
   language) rather than a reproduction of the official logo.
   All three share the same rounded-square "app badge" frame so
   they read as one consistent icon family across the site.
   Used by: home-page.js, fortnite-page.js, product-page.js
   ============================================================ */

function brandBadge(gradientId, stops, glyph){
  return `
    <svg width="52" height="52" viewBox="0 0 54 54">
      <defs>
        <linearGradient id="${gradientId}" x1="0" y1="0" x2="1" y2="1">
          ${stops}
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="50" height="50" rx="14" fill="url(#${gradientId})" stroke="rgba(255,255,255,0.22)" stroke-width="1.5"/>
      ${glyph}
    </svg>
  `;
}

// V-Bucks — circular coin motif with a bold "V", in the currency's
// signature cyan/teal tones, set on our standard badge tile.
function vbucksIconSvg(){
  const stops = `
    <stop offset="0%" stop-color="#7cf5e6"/>
    <stop offset="55%" stop-color="#12c2c2"/>
    <stop offset="100%" stop-color="#0a6e8c"/>
  `;
  const glyph = `
    <circle cx="27" cy="27" r="17" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="2"/>
    <text x="27" y="35" text-anchor="middle" font-family="Tajawal, sans-serif" font-weight="900" font-size="22" fill="#fff">V</text>
  `;
  return brandBadge('vbGrad', stops, glyph);
}

// Fortnite Crew — a simple crown silhouette (the subscription's
// signature "royalty" motif), in the site's purple/blue accent.
function crewIconSvg(){
  const stops = `
    <stop offset="0%" stop-color="#b26bff"/>
    <stop offset="55%" stop-color="#6a2df0"/>
    <stop offset="100%" stop-color="#1a0f3d"/>
  `;
  const glyph = `
    <path d="M13 36 L13 21 L20.5 29 L27 14 L33.5 29 L41 21 L41 36 Z"
          fill="#fff" stroke="rgba(255,255,255,0.4)" stroke-width="1" stroke-linejoin="round"/>
    <rect x="13" y="37.5" width="28" height="3.2" rx="1.4" fill="#fff"/>
  `;
  return brandBadge('crewGrad', stops, glyph);
}

// Adobe Creative Cloud — official brand mark rendered from the packaged
// image asset (the recognizable rainbow-gradient "infinity/CC" logo on a
// white rounded-square). Kept at the same 52px size as the other badges
// so it visually aligns with the rest of the product card family.
function adobeIconSvg(){
  return `
    <img src="/app/assets/img/adobe-cc.webp"
         alt="Adobe Creative Cloud"
         width="52" height="52"
         style="display:block; border-radius:14px; background:#fff; padding:4px; box-shadow:0 4px 14px -6px rgba(0,0,0,0.35);"/>
  `;
}
