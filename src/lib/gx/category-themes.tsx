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
   100% UNIFIED SIZE, AUTHENTIC, LOGICAL ICONS ACROSS ALL CATEGORIES
   Every icon is built with identical bounding dimensions (viewBox 0 0 44 44)
   and a matching 36x36 squircle base so every card is identical in height.
   ========================================================================= */

/** 1. Snapchat Plus: Official Snapchat Logo with Snapchat+ Plus Badge */
export function SnapchatCatIcon({ size = 40 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        background: "#FFFC00",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        boxSizing: "border-box",
        overflow: "hidden",
        flexShrink: 0,
        boxShadow: "0 4px 12px rgba(255, 252, 0, 0.25)",
      }}
      title="Snapchat+"
    >
      {/* Official Snapchat Ghost Logo */}
      <img
        src="/app/assets/img/snapchat-logo.png"
        alt="Snapchat+"
        style={{
          width: "76%",
          height: "76%",
          objectFit: "contain",
          filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.12))",
        }}
      />
      {/* Official Snapchat+ (Plus) Badge */}
      <div
        style={{
          position: "absolute",
          top: 3,
          right: 3,
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: "#000000",
          border: "1px solid #FFFC00",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffffff",
          fontSize: 10,
          fontWeight: 900,
          lineHeight: 1,
          boxShadow: "0 2px 4px rgba(0,0,0,0.35)",
        }}
      >
        +
      </div>
    </div>
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
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#srvGrad)" />
      {/* Digital Canvas / Landing Page / Post Design Window */}
      <rect x="7" y="8" width="24" height="18" rx="3.5" fill="#ffffff" />
      {/* Window Header Bar */}
      <rect x="7" y="8" width="24" height="4.5" rx="3.5" fill="#fed7aa" />
      <circle cx="10.5" cy="10.2" r="0.9" fill="#ea580c" />
      <circle cx="13" cy="10.2" r="0.9" fill="#ea580c" />
      {/* Post Image Block */}
      <rect x="10" y="15" width="7" height="7.5" rx="1.5" fill="#fdba74" />
      {/* Text / Document / Code Lines */}
      <rect x="19" y="15.5" width="9" height="1.8" rx="0.9" fill="#ea580c" />
      <rect x="19" y="18.5" width="7.5" height="1.5" rx="0.75" fill="#ea580c" fillOpacity="0.7" />
      <rect x="19" y="21" width="5" height="1.5" rx="0.75" fill="#ea580c" fillOpacity="0.4" />
      {/* Creative Stylus / Design Pen */}
      <path d="M21 30.5l7-7" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M28 23.5l2-2" stroke="#fef08a" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M21 30.5l-2.2 1.2 1.2-2.2z" fill="#ffffff" />
      {/* Meta Ads / Growth Sparkle */}
      <path d="M31.5 8l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" fill="#ffffff" />
      <circle cx="33" cy="27" r="1.5" fill="#fef08a" />
    </svg>
  );
}

/** 6. Games: Simple, Clean Xbox Wireless Controller */
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
      {/* Simple, Clean Xbox Controller Ergonomic Body */}
      <path
        d="M11 15c0-2.8 2.5-4 6-4h6c3.5 0 6 1.2 6 4 0 2-.4 4.5-1.2 7-1 3.2-2.8 5-4.8 4-1.2-.6-2-2-2.5-3.5-.4-1.2-1.2-1.5-2.5-1.5h-4c-1.3 0-2.1.3-2.5 1.5-.5 1.5-1.3 2.9-2.5 3.5-2 1-3.8-.8-4.8-4C11.4 19.5 11 17 11 15z"
        fill="#ffffff"
      />
      {/* Xbox Center Guide Button */}
      <circle cx="20" cy="14" r="1.8" fill="#059669" />
      {/* Asymmetric Left Thumbstick (Upper-Left) */}
      <circle cx="15" cy="16.5" r="2.2" fill="#059669" />
      <circle cx="15" cy="16.5" r="1.1" fill="#ffffff" />
      {/* Directional D-Pad (Lower-Left) */}
      <path d="M17.5 22.5v3M16 24h3" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" />
      {/* 4 Action Buttons (ABXY) (Upper-Right) */}
      <circle cx="25" cy="15" r="0.9" fill="#059669" />
      <circle cx="27" cy="16.8" r="0.9" fill="#059669" />
      <circle cx="25" cy="18.6" r="0.9" fill="#059669" />
      <circle cx="23" cy="16.8" r="0.9" fill="#059669" />
      {/* Asymmetric Right Thumbstick (Lower-Right) */}
      <circle cx="22.5" cy="22.5" r="2.2" fill="#059669" />
      <circle cx="22.5" cy="22.5" r="1.1" fill="#ffffff" />
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
