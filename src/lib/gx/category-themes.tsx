import React from "react";

export type CategoryTheme = {
  accent: string;
  glow: string;
  ambient: string;
};

/**
 * Single source of truth for category theme colors and glowing gradients.
 * Designed with color theory: every root category has an entirely unique,
 * high-contrast, vibrant signature color.
 *
 * 1. snapchat:     Electric Yellow      #ffd600
 * 2. subscriptions: Royal Electric Purple#8b5cf6 (NO brown)
 * 3. social-media:  Vibrant Social Blue  #0088ff
 * 4. design:        Electric Cyan        #00e5ff
 * 5. services:      Tangerine Orange     #ff9100
 * 6. games:         Neon Cyber Green     #05df72 (distinct from Cyan)
 * 7. gift-cards:    Neon Magenta Pink    #ff2d78
 * 8. products:      Radiant Ruby Coral   #ff385c
 */
export function getCategoryTheme(slug: string): CategoryTheme {
  switch (slug) {
    case "snapchat":
      return { glow: "rgba(255, 214, 0, 0.45)", ambient: "rgba(255, 214, 0, 0.16)", accent: "#ffd600" };

    case "subscriptions":
      return { glow: "rgba(139, 92, 246, 0.45)", ambient: "rgba(139, 92, 246, 0.16)", accent: "#8b5cf6" };

    case "social-media":
      return { glow: "rgba(0, 136, 255, 0.45)", ambient: "rgba(0, 136, 255, 0.16)", accent: "#0088ff" };

    case "design":
    case "apps":
    case "software":
      return { glow: "rgba(0, 229, 255, 0.4)", ambient: "rgba(0, 229, 255, 0.14)", accent: "#00e5ff" };

    case "services":
      return { glow: "rgba(255, 145, 0, 0.45)", ambient: "rgba(255, 145, 0, 0.16)", accent: "#ff9100" };

    case "games":
    case "pc-games":
    case "steam":
      return { glow: "rgba(5, 223, 114, 0.45)", ambient: "rgba(5, 223, 114, 0.16)", accent: "#05df72" };

    case "gift-cards":
      return { glow: "rgba(255, 45, 120, 0.45)", ambient: "rgba(255, 45, 120, 0.15)", accent: "#ff2d78" };

    case "products":
    case "all":
      return { glow: "rgba(255, 56, 92, 0.45)", ambient: "rgba(255, 56, 92, 0.15)", accent: "#ff385c" };

    // Specific sub-categories
    case "canva":
      return { glow: "rgba(0, 196, 204, 0.45)", ambient: "rgba(0, 196, 204, 0.16)", accent: "#00c4cc" };
    case "adobe":
      return { glow: "rgba(235, 16, 0, 0.4)", ambient: "rgba(235, 16, 0, 0.14)", accent: "#eb1000" };
    case "windows-keys":
    case "windows":
      return { glow: "rgba(0, 120, 212, 0.45)", ambient: "rgba(0, 120, 212, 0.16)", accent: "#0078d4" };
    case "microsoft365":
      return { glow: "rgba(242, 80, 34, 0.4)", ambient: "rgba(242, 80, 34, 0.14)", accent: "#f25022" };
    case "autodesk":
      return { glow: "rgba(6, 150, 215, 0.4)", ambient: "rgba(6, 150, 215, 0.14)", accent: "#0696d7" };
    case "linkedin":
    case "linkedin-premium":
      return { glow: "rgba(10, 102, 194, 0.45)", ambient: "rgba(10, 102, 194, 0.16)", accent: "#0a66c2" };
    case "gemini":
    case "ai":
      return { glow: "rgba(147, 51, 234, 0.45)", ambient: "rgba(126, 34, 206, 0.15)", accent: "#9333ea" };
    case "fortnite":
      return { glow: "rgba(168, 85, 247, 0.4)", ambient: "rgba(147, 51, 234, 0.15)", accent: "#a855f7" };
    case "sony":
    case "gc-playstation":
      return { glow: "rgba(0, 112, 209, 0.4)", ambient: "rgba(0, 112, 209, 0.15)", accent: "#0070d1" };
    case "xbox-games":
    case "gc-xbox":
      return { glow: "rgba(16, 124, 65, 0.4)", ambient: "rgba(16, 124, 65, 0.15)", accent: "#107c41" };
    case "gc-google-play":
      return { glow: "rgba(0, 200, 83, 0.4)", ambient: "rgba(0, 200, 83, 0.15)", accent: "#00c853" };
    case "gc-itunes":
      return { glow: "rgba(255, 45, 120, 0.4)", ambient: "rgba(255, 45, 120, 0.15)", accent: "#ff2d78" };

    default:
      return { glow: "rgba(0, 229, 255, 0.35)", ambient: "rgba(0, 229, 255, 0.12)", accent: "#00e5ff" };
  }
}

/* =========================================================================
   REAL, LOGICAL, AUTHENTIC ICONS FOR EVERY CATEGORY (NO ABSTRACT CHECKS/MARKS)
   ========================================================================= */

/** 1. Snapchat Plus: Official Real Snapchat Logo */
export function SnapchatCatIcon({ size = 34 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <img
        src="/app/assets/img/snapchat-logo.png"
        alt="Snapchat"
        loading="lazy"
        decoding="async"
        style={{
          width: size,
          height: size,
          objectFit: "contain",
          borderRadius: 8,
          filter: "drop-shadow(0 2px 8px rgba(255, 214, 0, 0.35))",
        }}
      />
    </div>
  );
}

/** 2. Design & Software Suite: Real App Suite (Adobe CC, Canva, Windows, Microsoft 365) */
export function SoftwareSuiteIcon({ size = 34 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr",
        gap: 3,
        padding: 2,
      }}
      title="Adobe, Canva, Windows, Microsoft 365"
    >
      <div
        style={{
          background: "rgba(255, 255, 255, 0.08)",
          borderRadius: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          padding: 1.5,
          border: "1px solid rgba(255, 255, 255, 0.12)",
        }}
      >
        <img
          src="/app/assets/img/adobe-cc.webp"
          alt="Adobe"
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>
      <div
        style={{
          background: "rgba(255, 255, 255, 0.08)",
          borderRadius: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          padding: 1.5,
          border: "1px solid rgba(255, 255, 255, 0.12)",
        }}
      >
        <img
          src="/app/assets/img/canva-logo.png"
          alt="Canva"
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>
      <div
        style={{
          background: "rgba(255, 255, 255, 0.08)",
          borderRadius: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          padding: 1.5,
          border: "1px solid rgba(255, 255, 255, 0.12)",
        }}
      >
        <img
          src="/app/assets/img/windows-icon.svg"
          alt="Windows"
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>
      <div
        style={{
          background: "rgba(255, 255, 255, 0.08)",
          borderRadius: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          padding: 1.5,
          border: "1px solid rgba(255, 255, 255, 0.12)",
        }}
      >
        <img
          src="/app/assets/img/microsoft365-logo.svg"
          alt="Microsoft 365"
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>
    </div>
  );
}

/** 3. Subscriptions: Royal Electric Purple VIP pass card with star & smart chip */
export function SubscriptionsCatIcon({ size = 34 }: { size?: number }) {
  return (
    <svg viewBox="0 0 44 44" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="subPassG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="subStarG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f3e8ff" />
        </linearGradient>
      </defs>
      <rect x="4" y="9" width="36" height="26" rx="8" fill="url(#subPassG)" />
      <rect x="4" y="9" width="36" height="26" rx="8" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" />
      <path d="M4 17h36" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
      {/* VIP Star Badge */}
      <path
        d="M22 19l1.8 3.6 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4-2.9-2.8 4-.6L22 19z"
        fill="url(#subStarG)"
      />
      {/* Pass indicator chip */}
      <rect x="8" y="24" width="5" height="5" rx="1.5" fill="#ffffff" fillOpacity="0.75" />
      <path d="M16 26.5h8" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6" />
    </svg>
  );
}

/** 4. Social Media: Social Interaction Bubble with Likes Heart & Engagement */
export function SocialMediaCatIcon({ size = 34 }: { size?: number }) {
  return (
    <svg viewBox="0 0 44 44" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="socG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0066ff" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="36" height="36" rx="11" fill="url(#socG)" />
      {/* Social Chat Bubble with Heart */}
      <path
        d="M12 21c0-5 4.5-9 10-9s10 4 10 9-4.5 9-10 9c-1.6 0-3.1-.3-4.5-1l-4.5 1.5 1.2-3.8c-1.4-1.6-2.2-3.6-2.2-5.7z"
        fill="#ffffff"
      />
      {/* Glowing Social Heart in center */}
      <path
        d="M22 23.6l-.7-.6c-2.4-2.2-4-3.6-4-5.3 0-1.4 1.1-2.4 2.4-2.4 1 0 1.9.5 2.3 1.2.4-.7 1.3-1.2 2.3-1.2 1.4 0 2.4 1.1 2.4 2.4 0 1.7-1.6 3.1-4 5.3l-.7.6z"
        fill="#0066ff"
      />
    </svg>
  );
}

/** 5. Services: Academic Graduation Cap (خدمات طلابية) & Digital Assistance */
export function ServicesCatIcon({ size = 34 }: { size?: number }) {
  return (
    <svg viewBox="0 0 44 44" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="srvGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
        <linearGradient id="capGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#fed7aa" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="36" height="36" rx="11" fill="url(#srvGrad)" />
      {/* Academic Graduation Cap (Mortarboard) - Perfectly represents student services */}
      <path d="M22 11L9 17.5L22 24L35 17.5L22 11Z" fill="url(#capGrad)" />
      <path
        d="M14 20.5V26.5C14 29 17.5 31.5 22 31.5C26.5 31.5 30 29 30 26.5V20.5L22 24.5L14 20.5Z"
        fill="#ffffff"
        fillOpacity="0.9"
      />
      {/* Tassel */}
      <path d="M32 18.5V26" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="32" cy="26.5" r="1.5" fill="#ffffff" />
      {/* Central Star */}
      <path
        d="M22 14.5L23.2 17.5L26 17.5L23.8 19.2L24.6 22L22 20.3L19.4 22L20.2 19.2L18 17.5L20.8 17.5L22 14.5Z"
        fill="#ea580c"
      />
    </svg>
  );
}

/** 6. Games: Modern Console Gamepad Controller */
export function GamingHeroIcon({ size = 34 }: { size?: number }) {
  return (
    <svg viewBox="0 0 44 44" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gmGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="36" height="36" rx="11" fill="url(#gmGrad)" />
      {/* Modern Gamepad Controller Silhouette */}
      <path
        d="M13 14h18c3.3 0 6 2.7 6 6v7c0 3.3-2.7 6-6 6-1.5 0-3-.6-4.1-1.7L24.5 29h-5l-2.4 2.3c-1.1 1.1-2.6 1.7-4.1 1.7-3.3 0-6-2.7-6-6v-7c0-3.3 2.7-6 6-6z"
        fill="#ffffff"
      />
      {/* D-Pad on Left */}
      <path d="M12 21h4M14 19v4" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" />
      {/* ABXY Action Buttons on Right */}
      <circle cx="28" cy="19.5" r="1.3" fill="#059669" />
      <circle cx="31" cy="21.5" r="1.3" fill="#059669" />
      <circle cx="28" cy="23.5" r="1.3" fill="#059669" />
      <circle cx="25" cy="21.5" r="1.3" fill="#059669" />
      {/* Dual Thumbsticks */}
      <circle cx="18" cy="24" r="2" fill="#059669" fillOpacity="0.75" />
      <circle cx="24" cy="24" r="2" fill="#059669" fillOpacity="0.75" />
    </svg>
  );
}

/** 7. Gift Cards: Gift Voucher Card with Satin Ribbon Bow */
export function GiftCardCatIcon({ size = 34 }: { size?: number }) {
  return (
    <svg viewBox="0 0 44 44" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="giftG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff4b8b" />
          <stop offset="100%" stopColor="#db2777" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="36" height="36" rx="11" fill="url(#giftG)" />
      {/* Gift Card Silhouette */}
      <rect x="9" y="13" width="26" height="19" rx="4" fill="#ffffff" />
      {/* Gift Ribbon Vertical & Horizontal */}
      <rect x="18" y="13" width="4" height="19" fill="#db2777" />
      <rect x="9" y="21" width="26" height="4" fill="#db2777" />
      {/* Ribbon Bow on top */}
      <circle cx="17.5" cy="12" r="2.5" fill="#ffffff" stroke="#db2777" strokeWidth="1.2" />
      <circle cx="22.5" cy="12" r="2.5" fill="#ffffff" stroke="#db2777" strokeWidth="1.2" />
      <circle cx="20" cy="13" r="1.8" fill="#db2777" />
    </svg>
  );
}

/** 8. All Products: Store Shopping Bag with Catalog Grid */
export function AllProductsCatIcon({ size = 34 }: { size?: number }) {
  return (
    <svg viewBox="0 0 44 44" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="allG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#e11d48" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="36" height="36" rx="11" fill="url(#allG)" />
      {/* Store Shopping Bag */}
      <rect x="11" y="16" width="22" height="17" rx="4" fill="#ffffff" />
      <path d="M16 16v-3c0-3.3 2.7-5 6-5s6 1.7 6 5v3" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" />
      {/* Store 4-square grid on bag */}
      <rect x="15" y="20" width="4" height="4" rx="1" fill="#e11d48" />
      <rect x="21" y="20" width="4" height="4" rx="1" fill="#e11d48" />
      <rect x="15" y="26" width="4" height="4" rx="1" fill="#e11d48" />
      <rect x="21" y="26" width="4" height="4" rx="1" fill="#e11d48" />
    </svg>
  );
}

/** Alias for backward compatibility */
export const SubscriptionsHeroIcon = SubscriptionsCatIcon;

/**
 * Universal Category Icon Renderer:
 * Returns the best-matching, authentic, highly recognized icon for each category.
 */
export function renderCategoryVectorIcon(slug: string, size = 34): React.ReactNode {
  switch (slug) {
    case "snapchat":
      return <SnapchatCatIcon size={size} />;
    case "subscriptions":
      return <SubscriptionsCatIcon size={size} />;
    case "social-media":
      return <SocialMediaCatIcon size={size} />;
    case "design":
    case "apps":
    case "software":
      return <SoftwareSuiteIcon size={size} />;
    case "services":
      return <ServicesCatIcon size={size} />;
    case "games":
    case "pc-games":
    case "steam":
      return <GamingHeroIcon size={size} />;
    case "gift-cards":
      return <GiftCardCatIcon size={size} />;
    case "products":
    case "all":
      return <AllProductsCatIcon size={size} />;
    default:
      return <AllProductsCatIcon size={size} />;
  }
}
