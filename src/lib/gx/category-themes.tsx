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
      return { glow: "rgba(37, 99, 235, 0.45)", ambient: "rgba(37, 99, 235, 0.16)", accent: "#3b82f6" };

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
    case "instagram":
      return { glow: "rgba(225, 48, 108, 0.45)", ambient: "rgba(225, 48, 108, 0.16)", accent: "#e1306c" };
    case "facebook":
      return { glow: "rgba(24, 119, 242, 0.45)", ambient: "rgba(24, 119, 242, 0.16)", accent: "#1877f2" };

    default:
      return { glow: "rgba(0, 229, 255, 0.35)", ambient: "rgba(0, 229, 255, 0.12)", accent: "#00e5ff" };
  }
}

/* =========================================================================
   100% UNIFIED SIZE, AUTHENTIC, LOGICAL ICONS ACROSS ALL CATEGORIES
   Every icon is built with identical bounding dimensions (viewBox 0 0 44 44)
   and a matching 36x36 squircle base so every card is identical in height.
   ========================================================================= */

/** 1. Snapchat Plus: Official Snapchat Logo Image */
export function SnapchatCatIcon({ size = 40 }: { size?: number }) {
  return (
    <img
      src="/app/assets/img/snapchat-square.png"
      alt="Snapchat+"
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        objectFit: "cover",
        flexShrink: 0,
        display: "block",
      }}
    />
  );
}

/** 2. Subscriptions: Royal Electric Purple VIP Crown Badge */
export function SubscriptionsCatIcon({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="subPassG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#subPassG)" />
      {/* Seamless Royal VIP Crown */}
      <path
        d="M10 25c0 .6.4 1 1 1h18c.6 0 1-.4 1-1l2-12c.1-.7-.7-1.2-1.3-.7L25 17l-4.2-7c-.3-.6-1.3-.6-1.6 0l-4.2 7-5.7-4.7c-.6-.5-1.4 0-1.3.7L10 25z"
        fill="#ffffff"
      />
      {/* Crown Rim Base */}
      <rect x="9" y="24.5" width="22" height="3" rx="1.5" fill="#ffffff" />
      {/* 3 Regal Inset Jewels */}
      <circle cx="15" cy="21.5" r="1.3" fill="#7c3aed" />
      <circle cx="20" cy="19.5" r="1.6" fill="#7c3aed" />
      <circle cx="25" cy="21.5" r="1.3" fill="#7c3aed" />
    </svg>
  );
}

/** 3. Social Media: Social Chat Bubble with 3 Conversation Dots (NO HEART) */
export function SocialMediaCatIcon({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="socG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0066ff" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#socG)" />
      {/* Clean Social Chat Bubble */}
      <path
        d="M10 19.5c0-5 4.5-9 10-9s10 4 10 9-4.5 9-10 9c-1.7 0-3.3-.4-4.7-1.2L10 28.5l1.4-4.2c-1-1.4-1.4-3.1-1.4-4.8z"
        fill="#ffffff"
      />
      {/* 3 Clean Social Conversation Dots */}
      <circle cx="15.5" cy="19.5" r="1.8" fill="#0066ff" />
      <circle cx="20" cy="19.5" r="1.8" fill="#0066ff" />
      <circle cx="24.5" cy="19.5" r="1.8" fill="#0066ff" />
    </svg>
  );
}

/** 4. Design & Software Suite: Real App Logos (Adobe CC, Canva, Windows, Microsoft 365) */
export function SoftwareSuiteIcon({ size = 40 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        background: "linear-gradient(135deg, #00e5ff 0%, #0284c7 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        padding: 3.5,
        flexShrink: 0,
      }}
      title="Adobe, Canva, Windows, Microsoft 365"
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: 2.5,
        }}
      >
        <div style={{ background: "rgba(0, 0, 0, 0.45)", borderRadius: 3.5, display: "flex", alignItems: "center", justifyContent: "center", padding: 1.5 }}>
          <img src="/app/assets/img/adobe-cc.webp" alt="Adobe" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
        <div style={{ background: "rgba(0, 0, 0, 0.45)", borderRadius: 3.5, display: "flex", alignItems: "center", justifyContent: "center", padding: 1.5 }}>
          <img src="/app/assets/img/canva-logo.png" alt="Canva" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
        <div style={{ background: "rgba(0, 0, 0, 0.45)", borderRadius: 3.5, display: "flex", alignItems: "center", justifyContent: "center", padding: 1.5 }}>
          <img src="/app/assets/img/windows-icon.svg" alt="Windows" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
        <div style={{ background: "rgba(0, 0, 0, 0.45)", borderRadius: 3.5, display: "flex", alignItems: "center", justifyContent: "center", padding: 1.5 }}>
          <img src="/app/assets/img/microsoft365-logo.svg" alt="Microsoft 365" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
      </div>
    </div>
  );
}

/** 5. Services: Digital Agency, Landing Pages, Post Design, Meta Ads & Text Solutions */
export function ServicesCatIcon({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="srvGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#srvGrad)" />

      {/* Precision 6-Tooth Service Cog - Perfectly Centered in the middle (20, 20) with matching size */}
      <g transform="translate(20, 20)">
        {/* 6 Precision Rounded Teeth (3 Rotated Rectangles) */}
        <rect x="-2.7" y="-11.2" width="5.4" height="22.4" rx="1.8" fill="#ffffff" />
        <rect x="-2.7" y="-11.2" width="5.4" height="22.4" rx="1.8" fill="#ffffff" transform="rotate(60)" />
        <rect x="-2.7" y="-11.2" width="5.4" height="22.4" rx="1.8" fill="#ffffff" transform="rotate(120)" />

        {/* Main Solid Hub */}
        <circle cx="0" cy="0" r="8.6" fill="#ffffff" />

        {/* Recessed Center Core Hole */}
        <circle cx="0" cy="0" r="4.6" fill="#1d4ed8" />

        {/* Inner Glowing Diamond / Star Core */}
        <path
          d="M0 -3L.75 -.75L3 0L.75 .75L0 3L-.75 .75L-3 0L-.75 -.75Z"
          fill="#ffffff"
        />
        <circle cx="0" cy="0" r="0.9" fill="#93c5fd" />
      </g>

      {/* Dynamic Service Sparkles */}
      <path d="M31.5 7.5l.6 1.8 1.8.6-1.8.6-.6 1.8-.6-1.8-1.8-.6 1.8-.6.6-1.8z" fill="#ffffff" fillOpacity="0.9" />
      <path d="M8.5 30.5l.4 1.2 1.2.4-1.2.4-.4 1.2-.4-1.2-1.2-.4 1.2-.4.4-1.2z" fill="#ffffff" fillOpacity="0.8" />
    </svg>
  );
}

/** 6. Games: Authentic Vector Xbox Controller */
export function GamingHeroIcon({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="gmGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#gmGrad)" />
      {/* Official Geometric Xbox Wireless Controller */}
      <g transform="translate(20, 20) scale(0.082) translate(-250, -256)">
        {/* Top bumper line */}
        <path
          d="M351 172.4c-1-2.6-3.1-4.6-5.7-5.5l-32.5-12.3c-5.5-2.1-11.5-1.7-16.7 1l-8.4 4.4h-75.4l-8.3-4.4c-5.2-2.7-11.3-3.1-16.7-1l-32.6 12.3c-2.6 1-4.7 3-5.7 5.5l-2.5 6.2v18h207v-17.9z"
          fill="#ffffff"
          fillOpacity="0.8"
        />
        {/* Main Solid Xbox Controller Body */}
        <path
          d="M360 184.4c-1.3-2.8-3.7-4.9-6.6-5.9l-38.3-12.8c-6-2-12.5-0.2-16.7 4.5L278.5 193c-1.2 1.4-3 2.2-4.9 2.3h-47.2c-1.9 0-3.7-0.8-4.9-2.3l-19.9-22.9c-4.1-4.7-10.7-6.5-16.7-4.5l-38.3 12.8c-2.9 1-5.3 3.1-6.6 5.9c-11.7 25-66.2 148.8-9.9 162c3.4 0.8 7-0.2 9.5-2.8l40.5-40.5c3.5-3.5 8.3-5.5 13.3-5.5h113.2c5 0 9.8 2 13.3 5.5l40.5 40.5c2.5 2.5 6.1 3.5 9.5 2.8C426.3 333.2 371.7 209.5 360 184.4z"
          fill="#ffffff"
        />
        {/* Xbox Center Guide Sphere */}
        <circle cx="250.1" cy="180" r="14" fill="#059669" />
        <path d="M254 172.5l-9 9M256.2 181.5l-9-9" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" />
        {/* Small View & Menu Buttons */}
        <circle cx="226" cy="211" r="5" fill="#059669" />
        <circle cx="274" cy="211" r="5" fill="#059669" />
        {/* Left Thumbstick (Asymmetric, Upper-Left) */}
        <circle cx="177" cy="211.6" r="20" fill="#059669" />
        <circle cx="177" cy="211.6" r="9" fill="#ffffff" />
        {/* Right Thumbstick (Asymmetric, Lower-Right) */}
        <circle cx="290" cy="265" r="20" fill="#059669" />
        <circle cx="290" cy="265" r="9" fill="#ffffff" />
        {/* Directional D-Pad (Lower-Left) */}
        <path
          d="M224 260h-6.5v-6.5c0-2.5-2-4.5-4.5-4.5s-4.5 2-4.5 4.5v6.5h-6.5c-2.5 0-4.5 2-4.5 4.5s2 4.5 4.5 4.5h6.5v6.5c0 2.5 2 4.5 4.5 4.5s4.5-2 4.5-4.5v-6.5h6.5c2.5 0 4.5-2 4.5-4.5s-2-4.5-4.5-4.5z"
          fill="#059669"
        />
        {/* 4 Action Buttons ABXY (Upper-Right) */}
        <circle cx="323" cy="186" r="9.5" fill="#059669" />
        <circle cx="351.5" cy="214" r="9.5" fill="#059669" />
        <circle cx="323" cy="242" r="9.5" fill="#059669" />
        <circle cx="294.5" cy="214" r="9.5" fill="#059669" />
      </g>
    </svg>
  );
}

/** 7. Gift Cards: 3D Luxury Gift Box with Satin Ribbon & Bow */
export function GiftCardCatIcon({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="giftG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff4b8b" />
          <stop offset="100%" stopColor="#db2777" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#giftG)" />
      {/* Gift Box Base */}
      <rect x="10" y="16.5" width="20" height="14.5" rx="2.5" fill="#ffffff" />
      {/* Gift Box Lid */}
      <rect x="8" y="12.5" width="24" height="4.5" rx="2" fill="#ffffff" />
      {/* Satin Vertical Ribbon */}
      <rect x="18" y="12.5" width="4" height="18.5" fill="#facc15" />
      {/* Ribbon Shadow on Lid */}
      <rect x="8" y="16.5" width="24" height="1" fill="#000000" fillOpacity="0.08" />
      {/* Ribbon Bow on Top */}
      <path
        d="M18 12.5c-2.4-3.2-5.5-2.8-5.5-.5 0 2 3.5 2.8 5.5.5zm4 0c2.4-3.2 5.5-2.8 5.5-.5 0 2-3.5 2.8-5.5.5z"
        fill="#facc15"
      />
      <circle cx="20" cy="12.5" r="1.6" fill="#eab308" />
      {/* Sparkle Star */}
      <path d="M29.5 7.5l.6 1.8 1.8.6-1.8.6-.6 1.8-.6-1.8-1.8-.6 1.8-.6.6-1.8z" fill="#fef08a" />
    </svg>
  );
}

/** 8. All Products: 4-Diamond Sparkle Constellation (The praised catalog grid) */
export function AllProductsCatIcon({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="allG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#e11d48" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#allG)" />
      {/* 4 Sparkling Diamond Tiles */}
      <rect x="9" y="9" width="9.5" height="9.5" rx="3" fill="#ffffff" />
      <rect x="21.5" y="9" width="9.5" height="9.5" rx="3" fill="#ffffff" fillOpacity="0.75" />
      <rect x="9" y="21.5" width="9.5" height="9.5" rx="3" fill="#ffffff" fillOpacity="0.75" />
      <rect x="21.5" y="21.5" width="9.5" height="9.5" rx="3" fill="#ffffff" />
      {/* Center 4-Point Star Sparkle */}
      <path d="M20 14.5l1 4.5 4.5 1-4.5 1-1 4.5-1-4.5-4.5-1 4.5-1 1-4.5z" fill="#ffffff" />
    </svg>
  );
}

/** Alias for backward compatibility */
export const SubscriptionsHeroIcon = SubscriptionsCatIcon;

/**
 * Universal Category Icon Renderer:
 * Returns the best-matching, authentic, highly recognized icon for each category.
 * Every single icon strictly adheres to the exact same uniform 40x40 squircle base.
 */
export function renderCategoryVectorIcon(slug: string, size = 40): React.ReactNode {
  switch (slug) {
    case "snapchat":
      return <SnapchatCatIcon size={size} />;
    case "subscriptions":
      return <SubscriptionsCatIcon size={size} />;
    case "social-media":
      return <SocialMediaCatIcon size={size} />;
    case "instagram":
      return (
        <img
          src="/app/assets/img/instagram-logo.svg"
          alt="Instagram"
          style={{ width: size, height: size, borderRadius: 12, objectFit: "contain", flexShrink: 0, display: "block" }}
        />
      );
    case "facebook":
      return (
        <img
          src="/app/assets/img/facebook-logo.svg"
          alt="Facebook"
          style={{ width: size, height: size, borderRadius: 12, objectFit: "contain", flexShrink: 0, display: "block" }}
        />
      );
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
