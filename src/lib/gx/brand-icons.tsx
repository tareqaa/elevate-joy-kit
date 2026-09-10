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

export const VBUCKS_IMAGES: Record<number, string> = {
  800: "https://cdn1.epicgames.com/offer/fn/EN_FNECO_41-00_RMT_CoreV-BucksPacks_800_EGS_Portrait_1200x1600_1200x1600-79529d8c20514e82ae2ebce58991b912",
  2400: "https://cdn1.epicgames.com/offer/fn/EN_FNECO_41-00_RMT_CoreV-BucksPacks_2400_EGS_Landscape_2560x1440_2560x1440-e51d802c9d414431973ae3e2ba60528d",
  4500: "https://cdn1.epicgames.com/offer/fn/EN_FNECO_41-00_RMT_CoreV-BucksPacks_4500_EGS_Landscape_2560x1440_2560x1440-799cfafb76bf4ae795fece5e4c0de4a3",
  12500: "https://cdn1.epicgames.com/offer/fn/EN_FNECO_41-00_RMT_CoreV-BucksPacks_12500_EGS_Portrait_1200x1600_1200x1600-070f17d0f6a34e9180b2927c8c24c40e",
};

export function VbucksIcon({ tier }: { tier: number }) {
  const imgUrl = VBUCKS_IMAGES[tier];
  if (imgUrl) {
    return (
      <img
        src={imgUrl}
        alt={`${tier} V-Bucks`}
        className="prod-thumb-img prod-card-img"
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    );
  }
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
  return (
    <img
      src="https://cdn1.epicgames.com/offer/fn/FNECO_41-30_August_Crew_Lineup_EGS_Launcher_Blade_1200x1600_1200x1600-911e7061d0aa458aa67d4e5897fcb473"
      alt="Fortnite Crew"
      className="prod-thumb-img prod-card-img"
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  );
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
  snapchat: { mode: "self" },
  canva: { mode: "self" },
  linkedin: { mode: "self" },
  fortnite: { mode: "self" },
  microsoft365: { mode: "tile", bg: "linear-gradient(135deg,#ea3e23,#7a1a0a)" },
  windows: { mode: "tile", bg: "linear-gradient(135deg,#f5f7fb,#c9d6e8)" },
  autodesk: { mode: "tile", bg: "linear-gradient(135deg,#1f1a14,#0a0805)", imgStyle: { filter: "invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.35))" } },
};

export function SnapchatPoster({ duration }: { duration?: string }) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "#FFFC00",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        userSelect: "none",
        padding: "16px 12px 28px",
      }}
    >
      {/* Official Snapchat Logo uploaded by user */}
      <img
        src="/app/assets/img/snapchat-logo.png"
        alt="Snapchat+"
        style={{
          width: 88,
          height: 88,
          objectFit: "contain",
          filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.2))",
          marginBottom: 8,
        }}
      />

      {/* Typography on Poster */}
      <div style={{ textAlign: "center", lineHeight: 1.15 }}>
        <div style={{ color: "#000000", fontWeight: 900, fontSize: 17, letterSpacing: 0.5, fontFamily: "'Tajawal', sans-serif" }}>
          SNAPCHAT
        </div>
        <div style={{ color: "#111111", fontWeight: 900, fontSize: 13, letterSpacing: 1, marginTop: 2, fontFamily: "'Tajawal', sans-serif" }}>
          PLUS {duration ? `• ${duration}` : ""}
        </div>
      </div>
    </div>
  );
}

export function AdobePoster({ duration }: { duration?: string }) {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <img
        src="/app/assets/img/adobe-cc.webp"
        alt="Adobe Creative Cloud"
        className="prod-thumb-img prod-card-img"
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
}

export function CanvaPoster({ duration }: { duration?: string }) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "radial-gradient(circle at 50% 32%, #00d2df 0%, #008fcc 38%, #5b1fb8 82%, #320a70 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        userSelect: "none",
        padding: "16px 12px 28px",
      }}
    >
      <img
        src="/app/assets/img/canva-logo.png"
        alt="Canva Pro"
        style={{
          width: 96,
          height: 96,
          objectFit: "contain",
          filter: "drop-shadow(0 12px 24px rgba(0,0,0,0.35))",
          marginBottom: 8,
        }}
      />
      <div style={{ textAlign: "center", lineHeight: 1.15 }}>
        <div style={{ color: "#ffffff", fontWeight: 900, fontSize: 17, letterSpacing: 0.5, fontFamily: "'Tajawal', sans-serif" }}>
          CANVA PRO
        </div>
        <div style={{ color: "rgba(255,255,255,0.85)", fontWeight: 800, fontSize: 12, letterSpacing: 0.5, marginTop: 2, fontFamily: "'Tajawal', sans-serif" }}>
          {duration || "اشتراك سنوي رسمي"}
        </div>
      </div>
    </div>
  );
}

export function WindowsPoster({
  planLabel,
  cartId,
}: {
  planLabel?: string;
  cartId?: string;
} = {}) {
  const lbl = (planLabel || "").toLowerCase();
  const cid = (cartId || "").toLowerCase();

  const isHome = lbl.includes("home") || cid.includes("home");
  const isPro = lbl.includes("pro") || cid.includes("pro") || !isHome;
  const isOem = lbl.includes("oem") || cid.includes("oem");
  const isAcct = lbl.includes("account") || lbl.includes("acct") || cid.includes("acct");

  const editionTitle = isHome ? "WINDOWS 11 HOME" : "WINDOWS 11 PRO";
  const editionSub = isOem
    ? "OEM • تفعيل مذربورد"
    : isAcct
    ? "ACCOUNT • ربط بالحساب"
    : "تفعيل رسمي أصلي مدى الحياة";

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: isHome
          ? "radial-gradient(circle at 50% 32%, #00a4ef 0%, #0078d4 35%, #052147 80%, #021124 100%)"
          : "radial-gradient(circle at 50% 32%, #0078d4 0%, #00509d 35%, #031b38 80%, #010c1c 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        userSelect: "none",
        padding: "16px 12px 28px",
      }}
    >
      {/* Ambient glow behind logo */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 130,
          height: 130,
          background: isHome ? "rgba(0, 164, 239, 0.45)" : "rgba(0, 120, 212, 0.45)",
          filter: "blur(28px)",
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />

      {/* Windows 11 Fluent 4-Pane Vector Logo */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 34px)",
          gap: 6,
          filter: "drop-shadow(0 10px 22px rgba(0, 120, 212, 0.7))",
          marginBottom: 12,
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ width: 34, height: 34, borderRadius: 4, background: "linear-gradient(135deg, #42b6ff, #0078d4)" }} />
        <div style={{ width: 34, height: 34, borderRadius: 4, background: "linear-gradient(135deg, #42b6ff, #0078d4)" }} />
        <div style={{ width: 34, height: 34, borderRadius: 4, background: "linear-gradient(135deg, #42b6ff, #0078d4)" }} />
        <div style={{ width: 34, height: 34, borderRadius: 4, background: "linear-gradient(135deg, #42b6ff, #0078d4)" }} />
      </div>

      {/* Modern Typography */}
      <div style={{ textAlign: "center", lineHeight: 1.15, position: "relative", zIndex: 1 }}>
        <div
          style={{
            color: "#ffffff",
            fontWeight: 900,
            fontSize: 16,
            letterSpacing: 0.8,
            fontFamily: "'Tajawal', sans-serif",
            textShadow: "0 2px 8px rgba(0,0,0,0.5)",
          }}
        >
          {editionTitle}
        </div>
        <div
          style={{
            color: "rgba(255,255,255,0.85)",
            fontWeight: 800,
            fontSize: 12,
            letterSpacing: 0.4,
            marginTop: 3,
            fontFamily: "'Tajawal', sans-serif",
            textShadow: "0 1px 4px rgba(0,0,0,0.6)",
          }}
        >
          {editionSub}
        </div>
      </div>
    </div>
  );
}

export function ProductIcon({ product, duration }: { product: Product; duration?: string }) {
  if (!product) return null;
  if (product.slug === "snapchat") return <SnapchatPoster duration={duration} />;
  if (product.slug === "adobe") return <AdobePoster duration={duration} />;
  if (product.slug === "canva") return <CanvaPoster duration={duration} />;
  if (product.slug === "windows") return <WindowsPoster />;
  if (product.slug === "fortnite") return <FortniteIcon />;
  if (product.slug === "gemini") {
    const src = product.imageUrl || product.iconImg || "/app/assets/img/gemini-logo.svg";
    return <img src={src} alt={product.name} className="prod-thumb-img prod-card-img" />;
  }
  const cfg = BRAND_CFG[product.slug];
  if (cfg && product.iconImg) {
    if (cfg.mode === "self") return brandImgSelfContained(product.iconImg, product.name);
    return tileImg(product.iconImg, product.name, cfg.bg, cfg.imgStyle);
  }
  if (product.imageUrl && (product.imageUrl.startsWith("http") || product.imageUrl.startsWith("/"))) {
    return <img src={product.imageUrl} alt={product.name} className="prod-thumb-img prod-card-img" style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
  }
  if (product.iconImg) return tileImg(product.iconImg, product.name, "linear-gradient(135deg,#1b1f2c,#0b0d14)");
  return <span style={{ fontSize: 44 }}>{product.icon}</span>;
}

export { VBUCKS_TIER_THEMES, CREW_TIER_THEMES } from "@/components/gx/ProductTemplates";
