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
   CUSTOM HIGH-END VECTOR SVG ICONS FOR ALL CATEGORIES (NO CHEAP EMOJIS)
   ========================================================================= */

/** 1. Snapchat Plus: Crisp Snapchat Ghost on vibrant yellow squircle */
export function SnapchatCatIcon({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 44 44" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="snapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff200" />
          <stop offset="100%" stopColor="#ffb700" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="36" height="36" rx="11" fill="url(#snapGrad)" />
      {/* Official styled Snapchat ghost outline */}
      <path
        d="M22 10.5c-4.2 0-7 3.1-7 6.6 0 1.9.8 3.5 1.7 4.4-.2.5-.9 1.4-2.1 1.7-.3.1-.4.3-.3.6.1.3.3.4.6.4 2.1 0 3.5-1 4-1.6.9.3 1.9.5 3.1.5s2.2-.2 3.1-.5c.5.6 1.9 1.6 4 1.6.3 0 .5-.1.6-.4.1-.3 0-.5-.3-.6-1.2-.3-1.9-1.2-2.1-1.7.9-.9 1.7-2.5 1.7-4.4 0-3.5-2.8-6.6-7-6.6z"
        fill="#111318"
      />
      <path
        d="M13.8 28.2c.8-.4 1.8-.3 2.6.2.9.5 1.9.8 3 .8.8 0 1.5-.2 2-.5.5.3 1.2.5 2 .5 1.1 0 2.1-.3 3-.8.8-.5 1.8-.6 2.6-.2.8.4 1.3 1.1 1.3 1.8 0 .4-.3.6-.7.7-2.1.3-4.2.8-6.1 1.5-.7.2-1.4.3-2.1.3s-1.4-.1-2.1-.3c-1.9-.7-4-1.2-6.1-1.5-.4-.1-.7-.3-.7-.7 0-.7.5-1.4 1.3-1.8z"
        fill="#111318"
      />
      {/* Inner white fill for ghost body */}
      <circle cx="22" cy="17" r="4.2" fill="#ffffff" />
      <path d="M19 19h6v4h-6z" fill="#ffffff" />
    </svg>
  );
}

/** 2. Subscriptions: Royal Electric Purple VIP pass card with golden lighting star */
export function SubscriptionsCatIcon({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 44 44" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="subPassG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="subBoltG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e9d5ff" />
        </linearGradient>
      </defs>
      <rect x="4" y="9" width="36" height="26" rx="8" fill="url(#subPassG)" />
      <rect x="4" y="9" width="36" height="26" rx="8" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
      <path d="M4 17h36" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
      {/* Lightning bolt badge */}
      <path d="M23 18l-3.5 6h4.5l-2.5 7 7.5-8.5h-4.5l3-4.5h-4.5z" fill="url(#subBoltG)" />
      {/* Chip dots */}
      <circle cx="9.5" cy="27.5" r="1.8" fill="#ffffff" fillOpacity="0.4" />
      <circle cx="14" cy="27.5" r="1.8" fill="#ffffff" fillOpacity="0.7" />
    </svg>
  );
}

/** 3. Social Media: Vibrant Blue interconnected network & engagement nexus */
export function SocialMediaCatIcon({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 44 44" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="socG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0066ff" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="36" height="36" rx="11" fill="url(#socG)" />
      {/* Network nodes */}
      <circle cx="16" cy="22" r="4.5" fill="#ffffff" />
      <circle cx="28" cy="14" r="3.8" fill="#ffffff" />
      <circle cx="28" cy="30" r="3.8" fill="#ffffff" />
      {/* Dynamic connection lines */}
      <path d="M19.5 20.2l5.5-4.4M19.5 23.8l5.5 4.4" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
      {/* Orbit pulses */}
      <circle cx="33.5" cy="22" r="2.2" fill="#ffffff" fillOpacity="0.8" />
      <path d="M28 17.5v9" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.4" strokeDasharray="2 2" />
    </svg>
  );
}

/** 4. Design & Software Suite: 4 Colorful App Badges */
export function SoftwareSuiteIcon({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 44 44" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="swG1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00e5ff" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        <linearGradient id="swG2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#9333ea" />
        </linearGradient>
        <linearGradient id="swG3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="swG4" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="16" height="16" rx="5" fill="url(#swG1)" />
      <path d="M8.5 12L11 14.5L15.5 10" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

      <rect x="24" y="4" width="16" height="16" rx="5" fill="url(#swG2)" />
      <circle cx="32" cy="12" r="3.2" stroke="#ffffff" strokeWidth="1.8" fill="none" />

      <rect x="4" y="24" width="16" height="16" rx="5" fill="url(#swG3)" />
      <path d="M8 32H16M12 28V36" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />

      <rect x="24" y="24" width="16" height="16" rx="5" fill="url(#swG4)" />
      <path d="M28 34L32 28L36 34" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 5. Services: Tangerine Orange tech precision gear & digital spark */
export function ServicesCatIcon({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 44 44" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="srvG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="36" height="36" rx="11" fill="url(#srvG)" />
      {/* Precision gear teeth */}
      <path
        d="M22 13a9 9 0 100 18 9 9 0 000-18zm0 4a5 5 0 110 10 5 5 0 010-10z"
        fill="#ffffff"
      />
      <path
        d="M21 9h2v3h-2zm0 23h2v3h-2zm12-11v2h3v-2zm-24 0v2h3v-2zm18.5-7.5l1.4-1.4 2.1 2.1-1.4 1.4zm-14.8 14.8l1.4-1.4 2.1 2.1-1.4 1.4zm14.8 0l-1.4-1.4 2.1-2.1 1.4 1.4zm-14.8-14.8l-1.4-1.4 2.1-2.1 1.4 1.4z"
        fill="#ffffff"
      />
      <circle cx="22" cy="22" r="2.5" fill="#ffffff" />
    </svg>
  );
}

/** 6. Games: Cyber Gaming Neon Green controller */
export function GamingHeroIcon({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 44 44" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gmGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <rect x="4" y="9" width="36" height="26" rx="13" fill="url(#gmGrad)" />
      {/* D-pad */}
      <path d="M12 22h6M15 19v6" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
      {/* Face buttons */}
      <circle cx="28" cy="19" r="1.6" fill="#ffffff" />
      <circle cx="32" cy="22" r="1.6" fill="#ffffff" />
      <circle cx="28" cy="25" r="1.6" fill="#ffffff" />
      <circle cx="24" cy="22" r="1.6" fill="#ffffff" />
      {/* Controller grip notches */}
      <path d="M18 29h8" stroke="#ffffff" strokeWidth="1.6" strokeOpacity="0.5" strokeLinecap="round" />
    </svg>
  );
}

/** 7. Gift Cards: Neon Magenta voucher with satin ribbon bow & chip */
export function GiftCardCatIcon({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 44 44" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="giftG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff4b8b" />
          <stop offset="100%" stopColor="#db2777" />
        </linearGradient>
      </defs>
      <rect x="4" y="10" width="36" height="24" rx="6" fill="url(#giftG)" />
      <rect x="4" y="10" width="36" height="24" rx="6" stroke="rgba(255,255,255,0.28)" strokeWidth="1.2" />
      {/* Ribbon vertical */}
      <path d="M17 10v24" stroke="#ffffff" strokeWidth="2.6" strokeOpacity="0.9" />
      {/* Ribbon horizontal */}
      <path d="M4 22h36" stroke="#ffffff" strokeWidth="2.6" strokeOpacity="0.9" />
      {/* Gift Ribbon Bow */}
      <path
        d="M17 10c-1.8-3.2-4.5-2.8-4.5-.6 0 2.2 3.8 2.8 4.5.6zm0 0c1.8-3.2 4.5-2.8 4.5-.6 0 2.2-3.8 2.8-4.5.6z"
        fill="#ffffff"
      />
      <circle cx="31" cy="16" r="2.2" fill="#ffffff" fillOpacity="0.45" />
    </svg>
  );
}

/** 8. All Products: Radiant Ruby Coral 4-diamond constellation */
export function AllProductsCatIcon({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 44 44" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="allG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#e11d48" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="36" height="36" rx="11" fill="url(#allG)" />
      {/* 4 sparkling diamond tiles */}
      <rect x="10" y="10" width="9" height="9" rx="3" fill="#ffffff" />
      <rect x="23" y="10" width="9" height="9" rx="3" fill="#ffffff" fillOpacity="0.75" />
      <rect x="10" y="23" width="9" height="9" rx="3" fill="#ffffff" fillOpacity="0.75" />
      <rect x="23" y="23" width="9" height="9" rx="3" fill="#ffffff" />
      {/* Sparkle center */}
      <circle cx="21" cy="21" r="2.2" fill="#ffffff" />
    </svg>
  );
}

/** Alias for backward compatibility */
export const SubscriptionsHeroIcon = SubscriptionsCatIcon;

/**
 * Universal Category Icon Renderer:
 * Returns the best-matching, ultra-high-definition vector SVG for each category.
 */
export function renderCategoryVectorIcon(slug: string, size = 32): React.ReactNode {
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
