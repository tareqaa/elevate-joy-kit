import React from "react";

export type CategoryTheme = {
  accent: string;
  glow: string;
  ambient: string;
};

/**
 * Single source of truth for category theme colors and glowing gradients.
 * Directly links homepage category cards with category detail pages.
 */
export function getCategoryTheme(slug: string): CategoryTheme {
  switch (slug) {
    case "subscriptions":
      return { glow: "rgba(245, 158, 11, 0.45)", ambient: "rgba(245, 158, 11, 0.15)", accent: "#f59e0b" };
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
    case "games":
    case "pc-games":
    case "steam":
      return { glow: "rgba(0, 229, 255, 0.35)", ambient: "rgba(0, 229, 255, 0.14)", accent: "#00e5ff" };
    case "sony":
      return { glow: "rgba(0, 112, 209, 0.4)", ambient: "rgba(0, 112, 209, 0.15)", accent: "#0070d1" };
    case "xbox-games":
      return { glow: "rgba(16, 124, 65, 0.4)", ambient: "rgba(16, 124, 65, 0.15)", accent: "#107c41" };
    case "gift-cards":
    case "gc-playstation":
    case "gc-xbox":
    case "gc-google-play":
    case "gc-itunes":
      return { glow: "rgba(255, 45, 120, 0.35)", ambient: "rgba(255, 45, 120, 0.14)", accent: "#ff2d78" };
    case "social-media":
      return { glow: "rgba(59, 130, 246, 0.4)", ambient: "rgba(59, 130, 246, 0.14)", accent: "#3b82f6" };
    case "services":
      return { glow: "rgba(255, 149, 0, 0.4)", ambient: "rgba(255, 149, 0, 0.14)", accent: "#ff9500" };
    case "snapchat":
      return { glow: "rgba(255, 203, 71, 0.45)", ambient: "rgba(255, 203, 71, 0.16)", accent: "#ffcb47" };
    case "products":
    case "all":
      return { glow: "rgba(0, 245, 160, 0.4)", ambient: "rgba(0, 245, 160, 0.14)", accent: "#00f5a0" };
    case "design":
    case "apps":
    case "software":
    default:
      return { glow: "rgba(0, 229, 255, 0.3)", ambient: "rgba(0, 229, 255, 0.12)", accent: "#00e5ff" };
  }
}

export function SoftwareSuiteIcon({ size = 34 }: { size?: number }) {
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

export function GamingHeroIcon({ size = 34 }: { size?: number }) {
  return (
    <svg viewBox="0 0 44 44" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gmGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00e5ff" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <rect x="3" y="9" width="38" height="26" rx="13" fill="url(#gmGrad)" />
      <path d="M10 22H18M14 18V26" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="28" cy="19" r="1.8" fill="#ffffff" />
      <circle cx="33" cy="22" r="1.8" fill="#ffffff" />
      <circle cx="28" cy="25" r="1.8" fill="#ffffff" />
      <circle cx="23" cy="22" r="1.8" fill="#ffffff" />
    </svg>
  );
}

export function SubscriptionsHeroIcon({ size = 34 }: { size?: number }) {
  return (
    <svg viewBox="0 0 44 44" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="subGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <rect x="3" y="8" width="38" height="28" rx="8" fill="url(#subGrad)" />
      <path d="M10 22H34M10 27H24M10 17H16" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="32" cy="16" r="3" fill="#ffffff" />
    </svg>
  );
}
