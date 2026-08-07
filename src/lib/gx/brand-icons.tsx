import type { Product } from "@/data/products";

/* Brand icon renderers — ported from public/app/assets/js/brand-icons.js */

const tileImg = (src: string, alt: string, gradient: string, imgStyle?: React.CSSProperties) => (
  <span
    style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 52, height: 52, borderRadius: 14,
      background: gradient,
      border: "1.5px solid rgba(255,255,255,0.22)",
      boxShadow: "0 6px 14px -8px rgba(0,0,0,0.5)",
    }}
  >
    <img
      src={src} alt={alt} width={40} height={40}
      style={{ display: "block", width: 40, height: 40, objectFit: "contain", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.25))", ...imgStyle }}
    />
  </span>
);

const VBUCKS_TIER_GRADIENTS: Record<number, string> = {
  800: "linear-gradient(135deg,#4bd94b,#1e7a1e)",
  2400: "linear-gradient(135deg,#3ba9ff,#0a3d91)",
  4500: "linear-gradient(135deg,#b26bff,#4a1e9c)",
  12500: "linear-gradient(135deg,#ffcf47,#c76a0a)",
};

const VBUCKS_TIER_SIZES: Record<number, number> = {
  800: 38,
  2400: 44,
  4500: 50,
  12500: 56,
};

export function VbucksIcon({ tier }: { tier: number }) {
  const size = VBUCKS_TIER_SIZES[tier] || 42;
  const gradient = VBUCKS_TIER_GRADIENTS[tier] || "linear-gradient(135deg,#12c2c2,#0a6e8c)";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 60,
        height: 60,
        borderRadius: 16,
        background: gradient,
        border: "1.5px solid rgba(255,255,255,0.3)",
        boxShadow: "0 8px 20px -6px rgba(0,0,0,0.6)",
        position: "relative",
      }}
    >
      <img
        src="/app/assets/img/vbucks.png"
        alt="V-Bucks"
        width={size}
        height={size}
        style={{
          display: "block",
          width: size,
          height: size,
          objectFit: "contain",
          filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.4))",
          transition: "transform 0.25s ease",
        }}
      />
    </span>
  );
}

export function CrewIcon() {
  return tileImg("/app/assets/img/fortnite-crew-logo.png", "Fortnite Crew", "linear-gradient(135deg,#1fa9ff,#0a3d91)");
}

export function AdobeIcon() {
  return tileImg(
    "/app/assets/img/adobe-cc.webp",
    "Adobe Creative Cloud",
    "linear-gradient(135deg,#ff2a2a,#990000)"
  );
}

export function FortniteIcon() {
  return tileImg("/app/assets/img/fortnite-logo.png", "Fortnite", "linear-gradient(135deg,#3ba9ff,#0a3d91)");
}

function brandImgSelfContained(src: string, alt: string) {
  return (
    <img
      src={src} alt={alt} width={52} height={52}
      style={{ display: "block", width: 52, height: 52, objectFit: "cover", borderRadius: 14, boxShadow: "0 6px 14px -8px rgba(0,0,0,0.5)" }}
    />
  );
}

type Cfg = { mode: "self" } | { mode: "tile"; bg: string; imgStyle?: React.CSSProperties };
const BRAND_CFG: Record<string, Cfg> = {
  canva: { mode: "self" },
  linkedin: { mode: "self" },
  fortnite: { mode: "self" },
  microsoft365: { mode: "tile", bg: "linear-gradient(135deg,#ea3e23,#7a1a0a)" },
  windows: { mode: "tile", bg: "linear-gradient(135deg,#f5f7fb,#c9d6e8)" },
  gemini: { mode: "tile", bg: "linear-gradient(135deg,#8e75b2,#2a1a4a)" },
  autodesk: { mode: "tile", bg: "linear-gradient(135deg,#1f1a14,#0a0805)", imgStyle: { filter: "invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.35))" } },
};

export function ProductIcon({ product }: { product: Product }) {
  if (!product) return null;
  if (product.slug === "adobe") return <AdobeIcon />;
  if (product.slug === "fortnite") return <FortniteIcon />;
  const cfg = BRAND_CFG[product.slug];
  if (cfg && product.iconImg) {
    if (cfg.mode === "self") return brandImgSelfContained(product.iconImg, product.name);
    return tileImg(product.iconImg, product.name, cfg.bg, cfg.imgStyle);
  }
  if (product.iconImg) return tileImg(product.iconImg, product.name, "linear-gradient(135deg,#1b1f2c,#0b0d14)");
  return <span style={{ fontSize: 44 }}>{product.icon}</span>;
}
