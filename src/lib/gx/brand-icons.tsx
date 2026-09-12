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

export function extractDenomination(name?: string, cartId?: string): string {
  const n = name || "";
  const c = (cartId || "").toLowerCase();

  // 1. Try TRY values (e.g. 50 TRY, 100 TRY, 300 TRY, 1000 TRY)
  const tryMatch = n.match(/(\d+)\s*(?:TRY|ليرة|TL)/i) || c.match(/(?:tr-)(\d+)/);
  if (tryMatch) return `${tryMatch[1]} TRY`;

  // 2. Try GBP £ values
  const gbpMatch = n.match(/(\d+)\s*£/) || n.match(/£\s*(\d+)/) || (c === "gb" ? ["", "10"] : null);
  if (gbpMatch) return `£${gbpMatch[1]}`;

  // 3. Try USD $ values (e.g. 10$, $10, 5$, 50$)
  const usdMatch = n.match(/(\d+)\s*\$/) || n.match(/\$\s*(\d+)/) || c.match(/(?:us-|ae-|sa-|gp-us-)(\d+)/);
  if (usdMatch) return `$${usdMatch[1]}`;

  // 4. Any numbers
  const anyNum = n.match(/(\d+)/);
  if (anyNum) return anyNum[1];

  return "CARD";
}

export function extractRegionInfo(name?: string, cartId?: string, region?: string): { flag: string; label: string } {
  const str = `${name || ""} ${cartId || ""} ${region || ""}`.toLowerCase();
  if (str.includes("tr") || str.includes("ترك") || str.includes("try")) {
    return { flag: "🇹🇷", label: "TURKEY" };
  }
  if (str.includes("sa") || str.includes("سعود") || str.includes("ksa")) {
    return { flag: "🇸🇦", label: "KSA" };
  }
  if (str.includes("ae") || str.includes("إمارات") || str.includes("uae")) {
    return { flag: "🇦🇪", label: "UAE" };
  }
  if (str.includes("gb") || str.includes("uk") || str.includes("بريطان") || str.includes("باوند")) {
    return { flag: "🇬🇧", label: "UK" };
  }
  return { flag: "🇺🇸", label: "USA" };
}

export function GiftCardPoster({
  slug,
  cartId,
  name,
  region,
}: {
  slug: string;
  cartId?: string;
  name?: string;
  region?: string;
}) {
  const denom = extractDenomination(name, cartId);
  const reg = extractRegionInfo(name, cartId, region);

  const isPlaystation = slug.includes("playstation") || (cartId || "").includes("psn") || slug.startsWith("gc-playstation");
  const isXbox = slug.includes("xbox") || (cartId || "").includes("xbox") || slug.startsWith("gc-xbox");
  const isItunes = slug.includes("itunes") || slug.includes("apple") || (cartId || "").includes("itunes") || slug.startsWith("gc-itunes");
  const isGooglePlay = slug.includes("google") || (cartId || "").startsWith("gp-") || slug.startsWith("gc-google");

  let brandName = "GIFT CARD";
  let brandLogo = "/app/assets/img/playstation-logo.svg";
  let bgGradient = "linear-gradient(135deg, #003791 0%, #001f5c 55%, #000f30 100%)";
  let ambientColor = "rgba(0, 112, 209, 0.4)";
  let watermarkSymbols: React.ReactNode = null;

  if (isPlaystation) {
    brandName = "PLAYSTATION";
    brandLogo = "/app/assets/img/playstation-logo.svg";
    bgGradient = "linear-gradient(135deg, #003791 0%, #002366 50%, #001133 100%)";
    ambientColor = "rgba(0, 112, 209, 0.45)";
    watermarkSymbols = (
      <div
        style={{
          position: "absolute",
          top: 8,
          right: 12,
          display: "flex",
          gap: 5,
          opacity: 0.15,
          fontSize: 14,
          fontWeight: 900,
          color: "#ffffff",
          letterSpacing: 2,
          pointerEvents: "none",
        }}
      >
        ▲ ● ✖ ■
      </div>
    );
  } else if (isXbox) {
    brandName = "XBOX STORE";
    brandLogo = "/app/assets/img/xbox-logo.svg";
    bgGradient = "linear-gradient(135deg, #107c10 0%, #0b540b 50%, #052605 100%)";
    ambientColor = "rgba(16, 124, 65, 0.45)";
  } else if (isItunes) {
    brandName = "APPLE & ITUNES";
    brandLogo = "/app/assets/img/itunes-logo.svg";
    bgGradient = "linear-gradient(135deg, #3b0764 0%, #701a75 50%, #be185d 100%)";
    ambientColor = "rgba(241, 7, 163, 0.45)";
  } else if (isGooglePlay) {
    brandName = "GOOGLE PLAY";
    brandLogo = "/app/assets/img/googleplay-logo.png";
    bgGradient = "linear-gradient(135deg, #064e3b 0%, #047857 50%, #0f172a 100%)";
    ambientColor = "rgba(52, 168, 83, 0.45)";
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 180,
        background: bgGradient,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "16px 14px",
        overflow: "hidden",
        userSelect: "none",
        boxSizing: "border-box",
      }}
    >
      {/* Glossy Card Reflection Sweep */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(125deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.03) 38%, transparent 60%)",
          pointerEvents: "none",
        }}
      />

      {/* Ambient radial glow in center */}
      <div
        style={{
          position: "absolute",
          top: "45%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: ambientColor,
          filter: "blur(32px)",
          pointerEvents: "none",
        }}
      />

      {watermarkSymbols}

      {/* Top Header: Brand Logo on Left, Flag Pill on Right */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "relative",
          zIndex: 1,
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <img
            src={brandLogo}
            alt={brandName}
            style={{
              width: 24,
              height: 24,
              objectFit: "contain",
              filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.5))",
            }}
          />
          <span
            style={{
              color: "rgba(255,255,255,0.9)",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 0.8,
              fontFamily: "'Tajawal', sans-serif",
            }}
          >
            {brandName}
          </span>
        </div>

        {/* Region Flag Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "2px 7px",
            borderRadius: 99,
            background: "rgba(0, 0, 0, 0.45)",
            border: "1px solid rgba(255, 255, 255, 0.22)",
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
          }}
        >
          <span style={{ fontSize: 13, lineHeight: 1 }}>{reg.flag}</span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: 0.5,
              fontFamily: "monospace",
            }}
          >
            {reg.label}
          </span>
        </div>
      </div>

      {/* Center: Large High-Contrast Denomination */}
      <div
        style={{
          textAlign: "center",
          position: "relative",
          zIndex: 1,
          margin: "auto 0",
        }}
      >
        <div
          style={{
            fontSize: denom.length > 6 ? 24 : denom.length > 4 ? 28 : 34,
            fontWeight: 900,
            color: "#ffffff",
            letterSpacing: -0.5,
            fontFamily: "'Tajawal', sans-serif",
            textShadow: "0 4px 18px rgba(0, 0, 0, 0.65), 0 1px 2px rgba(0,0,0,0.8)",
            lineHeight: 1,
          }}
        >
          {denom}
        </div>
        <div
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            color: "rgba(255, 255, 255, 0.85)",
            letterSpacing: 0.8,
            marginTop: 4,
            textShadow: "0 1px 3px rgba(0,0,0,0.6)",
          }}
        >
          STORE CREDIT • رصيد متجر
        </div>
      </div>

      {/* Bottom Row: Micro Security Chip on Left, Instant Code on Right */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "relative",
          zIndex: 1,
          width: "100%",
          paddingTop: 4,
        }}
      >
        {/* Micro Golden Smart Chip Graphic */}
        <div
          style={{
            width: 22,
            height: 16,
            borderRadius: 3,
            background: "linear-gradient(135deg, #f5d061 0%, #e6a117 50%, #c4830a 100%)",
            border: "1px solid rgba(255,255,255,0.4)",
            boxShadow: "0 2px 4px rgba(0,0,0,0.35)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: 0,
              right: 0,
              height: 1,
              background: "rgba(0,0,0,0.25)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 0,
              bottom: 0,
              width: 1,
              background: "rgba(0,0,0,0.25)",
            }}
          />
        </div>

        {/* Verification watermark */}
        <div
          style={{
            fontSize: 9.5,
            fontWeight: 800,
            color: "rgba(255, 255, 255, 0.9)",
            display: "flex",
            alignItems: "center",
            gap: 3,
            letterSpacing: 0.4,
          }}
        >
          <span style={{ color: "#00e5ff" }}>⚡</span>
          <span>DIGITAL CODE</span>
        </div>
      </div>
    </div>
  );
}

export { VBUCKS_TIER_THEMES, CREW_TIER_THEMES } from "@/components/gx/ProductTemplates";

