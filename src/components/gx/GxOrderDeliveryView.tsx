import React, { useState, useMemo, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useLang } from "@/lib/gx/i18n";
import { useCurrency } from "@/lib/gx/currency";
import { toast } from "sonner";
import { markCodeRevealedFn } from "@/lib/gx/order-email.functions";
import { supabase } from "@/integrations/supabase/client";
import { resolveProductImage } from "@/lib/gx/product-images";
import { OrderIpMismatchNotice } from "./OrderIpMismatchNotice";
import { formatFullRegion } from "@/lib/gx/region";
import { resolveProductActivationGuide } from "@/lib/gx/activation-guide";
import {
  Check,
  Copy,
  ExternalLink,
  Lock,
  Unlock,
  Key,
  ShoppingBag,
  AlertTriangle,
  Globe,
  KeyRound,
  X,
  HelpCircle,
  Sparkles,
  Star,
  Send,
  MessageSquareHeart,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Shield,
  Clock,
  User as UserIcon,
  XCircle,
  Zap,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────
   DELIVERY DATA PARSER HELPER
   ──────────────────────────────────────────────────────────────── */

export function parseDeliveryData(data: any): Record<string, any> {
  if (!data) return {};
  if (typeof data === "object" && !Array.isArray(data)) return data;
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return {};
    }
  }
  return {};
}

/* ────────────────────────────────────────────────────────────────
   PLATFORM ICON SVGs
   ──────────────────────────────────────────────────────────────── */

function WhatsAppSvg({ size = 20, color = "#25D366" }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill={color} style={{ width: size, height: size, flexShrink: 0 }}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function AppleSvg({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 170 170" fill="currentColor" className={className} style={{ width: 14, height: 14 }}>
      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.6-7.85-11.75-14.43-5.26-8.36-9.4-17.61-12.43-27.75-3.03-10.14-4.55-20.06-4.55-29.77 0-14.35 3.82-26.17 11.45-35.46 7.63-9.29 17.1-13.99 28.4-14.1 4.58 0 9.8 1.25 15.66 3.76 5.86 2.5 9.4 3.8 10.63 3.89 1.48-.15 5.16-1.46 11.03-3.95 5.87-2.48 10.87-3.66 15-3.53 11.22.64 20.31 4.7 27.27 12.18-9.8 5.87-14.6 14.13-14.4 24.77.22 8.37 3.42 15.34 9.61 20.9 6.19 5.57 13.51 8.84 21.96 9.8-2.39 7.07-5.33 14.15-8.81 21.24zM119.22 33.72c0-7.39 2.66-14.18 7.97-20.37 5.31-6.19 11.89-9.84 19.74-10.95.22 1.08.33 2.17.33 3.26 0 7.39-2.77 14.24-8.31 20.54-5.54 6.3-12.27 9.89-20.19 10.76-.22-1.08-.34-2.16-.34-3.24z" />
    </svg>
  );
}

function SteamSvg({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={{ width: 14, height: 14 }}>
      <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.005.105.005.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 12-5.373 12-12S18.605 0 11.979 0z" />
    </svg>
  );
}

function PlayStationSvg({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={{ width: 14, height: 14 }}>
      <path d="M8.077 14.288c.176.463.313.93.407 1.396.697 1.233 2.006 1.83 3.639 1.289 1.487-.492 2.112-1.579 2.112-2.716 0-1.849-1.396-2.614-3.56-3.447l-1.611-.607c-2.483-.933-4.095-2.023-4.095-4.664 0-3.084 2.222-4.814 5.922-4.536 2.378.18 4.295 1.056 5.545 2.464l-2.062 2.274c-.958-1.025-2.225-1.62-3.593-1.748-1.428-.135-2.618.397-2.618 1.547 0 1.396 1.066 1.942 3.036 2.684l1.631.619c2.895 1.1 4.75 2.302 4.75 5.253 0 3.528-2.782 5.344-6.85 5.589-3.264.195-5.753-.948-7.078-2.923l2.42-2.479z" />
    </svg>
  );
}

function XboxSvg({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={{ width: 14, height: 14 }}>
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-1.84 3.738c.67-.14 1.268-.14 1.84 0 1.246.304 2.41 1.082 3.425 2.29-1.285 1.01-2.906 1.742-4.633 1.996-1.727-.254-3.348-.986-4.633-1.996 1.015-1.208 2.179-1.986 3.425-2.29h1.999-.418zm-4.78 4.416c1.17 1.01 2.585 1.764 4.148 2.112-2.128 1.488-4.49 1.91-6.19 1.137-.775-.353-1.39-.93-1.758-1.688 1.02-1.077 2.306-1.884 3.8-1.56zm13.24 1.56c-.368.758-.983 1.335-1.758 1.688-1.7.773-4.062.35-6.19-1.137 1.563-.348 2.978-1.102 4.148-2.112 1.494-.324 2.78.483 3.8 1.56z" />
    </svg>
  );
}

function detectPlatformIcon(platform?: string, name?: string) {
  const p = (platform || "").toLowerCase();
  const n = (name || "").toLowerCase();

  if (p.includes("apple") || n.includes("apple") || p.includes("itunes") || n.includes("itunes")) {
    return <AppleSvg className="text-white" />;
  }
  if (p.includes("steam") || n.includes("steam")) {
    return <SteamSvg className="text-cyan-400" />;
  }
  if (p.includes("playstation") || n.includes("playstation") || p.includes("psn") || n.includes("psn") || n.includes("سوني") || n.includes("بلايستيشن")) {
    return <PlayStationSvg className="text-blue-400" />;
  }
  if (p.includes("xbox") || n.includes("xbox") || n.includes("اكس بوكس")) {
    return <XboxSvg className="text-emerald-400" />;
  }
  return <KeyRound style={{ width: 14, height: 14, color: "#00e5ff" }} />;
}

/* ────────────────────────────────────────────────────────────────
   ROBUST LOCAL PRODUCT IMAGE RESOLVER
   Uses local paths (/app/assets/img/...) so assets load instantly.
   ──────────────────────────────────────────────────────────────── */

export function getProductCoverImage(
  image?: string | null,
  name?: string | null,
  slug?: string | null,
  dbImageMap?: Record<string, string>
): string {
  const cleanSlug = (slug || "").toLowerCase().trim();
  const cleanName = (name || "").toLowerCase().trim();

  // 1. Check canonical unified registry first (TOD variants, Valorant, Discord, etc.)
  const canonical = resolveProductImage({
    cartId: cleanSlug,
    slug: cleanSlug,
    name: cleanName,
  });
  if (canonical) {
    return canonical;
  }

  // 2. Check if DB map has an image for this slug
  if (cleanSlug && dbImageMap && dbImageMap[cleanSlug]) {
    let url = dbImageMap[cleanSlug];
    if (url.startsWith("https://gxstore.me/")) url = url.replace("https://gxstore.me", "");
    return url;
  }

  // 3. If item already has a direct valid image
  if (image && typeof image === "string" && image.trim()) {
    let clean = image.trim();
    if (clean.startsWith("https://gxstore.me/")) clean = clean.replace("https://gxstore.me", "");
    return clean;
  }

  // 3. Match known catalog items to local files in /app/assets/img/
  if (
    cleanSlug.includes("playstation") ||
    cleanSlug.includes("psn") ||
    cleanName.includes("playstation") ||
    cleanName.includes("بلايستيشن") ||
    cleanName.includes("سوني")
  ) {
    return "/app/assets/img/playstation-store-card.jpg";
  }
  if (
    cleanSlug.includes("xbox") ||
    cleanName.includes("xbox") ||
    cleanName.includes("اكس بوكس") ||
    cleanName.includes("game pass")
  ) {
    return "/app/assets/img/catalog/xbox.jpg";
  }
  if (cleanSlug.includes("steam") || cleanName.includes("steam") || cleanName.includes("ستيم")) {
    return "/app/assets/img/catalog/steam.jpg";
  }
  if (
    cleanSlug.includes("itunes") ||
    cleanSlug.includes("apple") ||
    cleanName.includes("itunes") ||
    cleanName.includes("ايتونز") ||
    cleanName.includes("آيتونز") ||
    cleanName.includes("آبل") ||
    cleanName.includes("ابل") ||
    cleanName.includes("apple")
  ) {
    return "/app/assets/img/itunes-card.png";
  }
  if (cleanSlug.includes("nordvpn") || cleanName.includes("nordvpn") || cleanName.includes("نورد")) {
    return "/app/assets/img/catalog/nordvpn.jpg";
  }
  if (cleanSlug.includes("headspace") || cleanName.includes("headspace") || cleanName.includes("هيد سبيس")) {
    return "/app/assets/img/catalog/headspace.jpg";
  }
  if (cleanSlug.includes("notion") || cleanName.includes("notion") || cleanName.includes("نوشن")) {
    return "/app/assets/img/catalog/notion.jpg";
  }
  if (cleanSlug.includes("adobe-acrobat") || cleanName.includes("acrobat") || cleanName.includes("اكروبات")) {
    return "/app/assets/img/catalog/adobe-acrobat.jpg";
  }
  if (cleanSlug.includes("adobe-express") || cleanName.includes("express")) {
    return "/app/assets/img/catalog/adobe-express.jpg";
  }
  if (cleanSlug.includes("adobe") || cleanName.includes("adobe") || cleanName.includes("ادوبي")) {
    return "/app/assets/img/adobe-cc.webp";
  }
  if (cleanSlug.includes("canva") || cleanName.includes("canva") || cleanName.includes("كانفا")) {
    return "/app/assets/img/canva-logo.png";
  }
  if (cleanSlug.includes("snapchat") || cleanName.includes("snapchat") || cleanName.includes("سناب")) {
    return "/app/assets/img/snapchat-logo.png";
  }
  if (cleanSlug.includes("roblox") || cleanName.includes("roblox") || cleanName.includes("روبلوكس") || cleanName.includes("robux")) {
    return "/app/assets/img/catalog/roblox-robux.jpg";
  }
  if (cleanSlug.includes("pubg") || cleanName.includes("pubg") || cleanName.includes("ببجي")) {
    return "/app/assets/img/catalog/pubg-mobile.webp";
  }
  if (cleanSlug.includes("freefire") || cleanSlug.includes("free-fire") || cleanName.includes("freefire") || cleanName.includes("فري فاير")) {
    return "/app/assets/img/catalog/free-fire.png";
  }
  if (cleanSlug.includes("fortnite") || cleanName.includes("fortnite") || cleanName.includes("فورتنايت") || cleanName.includes("v-bucks")) {
    return "/app/assets/img/fortnite-crew.jpg";
  }
  if (cleanSlug.includes("realms")) {
    return "/app/assets/img/catalog/minecraft-realms-plus.png";
  }
  if (cleanSlug.includes("minecraft") || cleanName.includes("minecraft") || cleanName.includes("ماين كرافت")) {
    return "/app/assets/img/catalog/minecraft-java-bedrock.png";
  }
  if (cleanSlug.includes("lovable") || cleanName.includes("lovable") || cleanName.includes("لوفابل")) {
    return "/app/assets/img/catalog/lovable.webp";
  }
  if (cleanSlug.includes("linkedin") || cleanName.includes("linkedin") || cleanName.includes("لينكد")) {
    return "/app/assets/img/catalog/linkedin.png";
  }
  if (cleanSlug.includes("duolingo") || cleanName.includes("duolingo") || cleanName.includes("دولينجو") || cleanName.includes("دولينقو")) {
    return "/app/assets/img/catalog/duolingo-super.png";
  }
  if (cleanSlug.includes("autodesk") || cleanName.includes("autodesk") || cleanName.includes("أوتوديسك")) {
    return "/app/assets/img/catalog/autodesk-cover.jpg";
  }
  const isExplicitTod = cleanSlug === "tod" || cleanSlug.startsWith("tod-") || cleanName.startsWith("tod") || cleanName.includes("تود") || cleanName.includes(" tod");
  if (isExplicitTod && !cleanSlug.includes("autodesk")) {
    if (cleanSlug.includes("4k") || cleanName.includes("4k")) {
      return "/app/assets/img/catalog/tod-4k-card.jpg";
    }
    if (cleanSlug.includes("mobile") || cleanName.includes("mobile") || cleanName.includes("موبايل")) {
      return "/app/assets/img/catalog/tod-mobile-card.jpg";
    }
    return "/app/assets/img/catalog/tod-standard-card.jpg";
  }
  if (cleanSlug.includes("youtube") || cleanName.includes("youtube") || cleanName.includes("يوتيوب")) {
    return "/app/assets/img/catalog/youtube-premium.jpg";
  }
  if (cleanSlug.includes("windows") || cleanName.includes("windows") || cleanName.includes("ويندوز")) {
    return "/app/assets/img/catalog/windows-cover.jpg";
  }
  if (cleanSlug.includes("microsoft") || cleanSlug.includes("office") || cleanSlug.includes("365") || cleanName.includes("microsoft") || cleanName.includes("office") || cleanName.includes("اوفيس") || cleanName.includes("مايكروسوفت")) {
    return "/app/assets/img/microsoft365-logo.png";
  }
  if (cleanSlug.includes("gemini") || cleanName.includes("gemini") || cleanName.includes("جيميناي") || cleanName.includes("جيميني")) {
    return "/app/assets/img/gemini-logo.png";
  }
  if (cleanSlug.includes("autodesk") || cleanSlug.includes("autocad") || cleanName.includes("autodesk") || cleanName.includes("autocad") || cleanName.includes("اوتوديسك") || cleanName.includes("اوتوكاد")) {
    return "/app/assets/img/autodesk-logo.png";
  }
  if (cleanSlug.includes("capcut") || cleanName.includes("capcut") || cleanName.includes("كاب كات")) {
    return "/app/assets/img/catalog/capcut-pro.png";
  }
  if (cleanSlug.includes("gta") || cleanName.includes("gta") || cleanName.includes("جراند")) {
    return "/app/assets/img/catalog/gta-v-enhanced-pc.jpg";
  }
  if (cleanSlug.includes("discord") || cleanName.includes("discord") || cleanName.includes("دسكورد") || cleanName.includes("ديسكورد")) {
    return "/app/assets/img/catalog/discord-nitro-1-month.png";
  }

  return "/app/assets/img/gx-logo.png";
}

export type DeliveryCode = {
  kind?: "code" | "account" | "topup";
  label?: string;
  value?: string;
  email?: string;
  password?: string;
  region?: string;
  extra?: string;
  revealed_at?: string | null;
  revealed_ip?: string | null;
  revealed_country?: string | null;
  revealed_city?: string | null;
  revealed_ua?: string | null;
  last_revealed_at?: string | null;
  last_revealed_ip?: string | null;
  status?: "active" | "cancelled" | "refunded";
  is_cancelled?: boolean;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  backup_email?: string;
  backup_code?: string;
  extra_fields?: Array<{ label: string; value: string }>;
  notes?: string;
};


export interface DeliverableUnit {
  unitIndex: number;
  item: any;
  itemIndex: number;
  unitInItem: number;
  totalUnitsInItem: number;
  unitLabel: string;
  code: DeliveryCode | null;
  coverImg: string;
  regionBadge: string;
  isAccount: boolean;
  isTopup: boolean;
  platform?: string;
  siblingUnits: Array<{
    unitIndex: number;
    unitInItem: number;
    code: DeliveryCode | null;
  }>;
}

export interface GxOrderDeliveryViewProps {
  order: any;
  loading: boolean;
  error: string | null;
  isLocked?: boolean;
  orderToken?: string;
  revealedKeys: Record<number, boolean>;
  copiedKey: string | null;
  onRevealKey: (index: number) => void;
  onCopyKey: (text: string, id: string) => void;
  ipMismatchInfo?: {
    mismatch: boolean;
    purchaseIp?: string | null;
    currentIp?: string | null;
    customerEmail?: string | null;
    orderNumber?: string | null;
    accountMismatch?: boolean;
    callerEmail?: string | null;
  } | null;
  onRefresh?: () => void;
}

/* ────────────────────────────────────────────────────────────────
   ORDER TIMELINE STEPPER BAR (4-Step Continuous Animated Rail)
   1. السلة (Cart)
   2. الدفع (Payment)
   3. قيد التحضير (Preparation)
   4. استلام المنتج (Product Delivery)
   Continuous base rail passes through circle centers. Zero gaps, zero text overlap.
   ──────────────────────────────────────────────────────────────── */

interface OrderStepperLineProps {
  currentStep: 2 | 3 | 4;
  isAr: boolean;
  accentCyan: string;
}

function OrderStepperLine({ currentStep, isAr, accentCyan }: OrderStepperLineProps) {
  const steps = [
    { num: 1, label: isAr ? "السلة" : "Cart" },
    { num: 2, label: isAr ? "الدفع" : "Payment" },
    { num: 3, label: isAr ? "قيد التحضير" : "Preparation" },
    { num: 4, label: isAr ? "استلام المنتج" : "Delivery" },
  ];

  // Continuous progress bar width: 33.3% at step 2, 66.6% at step 3, 100% at step 4
  const progressPercent = currentStep === 2 ? 33.333 : currentStep === 3 ? 66.666 : 100;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: "560px",
        margin: "0 auto 10px",
        padding: "12px 16px 14px",
        boxSizing: "border-box",
        animation: "drfFadeUp 0.3s ease",
      }}
    >
      {/* ── 1. CONTINUOUS BASE RAIL (Runs precisely through circle centers) ── */}
      <div
        style={{
          position: "absolute",
          top: "27px",
          left: "calc(16px + 12.5%)",
          right: "calc(16px + 12.5%)",
          height: "3px",
          backgroundColor: "#202a3c",
          borderRadius: "3px",
          zIndex: 1,
        }}
      >
        {/* ── 2. ACTIVE PROGRESS FILL ── */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            ...(isAr ? { right: 0 } : { left: 0 }),
            width: `${progressPercent}%`,
            background: isAr
              ? "linear-gradient(-90deg, #00e5ff 0%, #00b4d8 100%)"
              : "linear-gradient(90deg, #00e5ff 0%, #00b4d8 100%)",
            boxShadow: "0 0 10px rgba(0, 229, 255, 0.65)",
            borderRadius: "3px",
            transition: "width 0.45s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </div>

      {/* ── 3. STEP ITEMS (Circles & Labels) ── */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          alignItems: "flex-start",
          width: "100%",
        }}
      >
        {steps.map((st) => {
          const isDone = st.num < currentStep;
          const isActive = st.num === currentStep;

          return (
            <div
              key={st.num}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                padding: "0 2px",
                boxSizing: "border-box",
                minWidth: 0,
              }}
            >
              {/* Circle Badge */}
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isActive
                    ? accentCyan
                    : isDone
                    ? "#0b1320"
                    : "#0a0f18",
                  border: isActive
                    ? `2px solid ${accentCyan}`
                    : isDone
                    ? `2px solid ${accentCyan}`
                    : "2px solid #243044",
                  color: isActive
                    ? "#07090e"
                    : isDone
                    ? accentCyan
                    : "#64748b",
                  fontWeight: 900,
                  fontSize: "13px",
                  boxShadow: isActive
                    ? "0 0 16px rgba(0, 229, 255, 0.75)"
                    : isDone
                    ? "0 0 6px rgba(0, 229, 255, 0.25)"
                    : "none",
                  animation: isActive ? "drfPulseCircle 2.2s infinite ease-in-out" : undefined,
                  transition: "all 0.3s ease",
                  flexShrink: 0,
                }}
              >
                {isDone ? (
                  <Check style={{ width: "15px", height: "15px", strokeWidth: 3 }} />
                ) : (
                  <span>{st.num}</span>
                )}
              </div>

              {/* Label Underneath */}
              <span
                style={{
                  marginTop: "8px",
                  fontSize: "clamp(10.5px, 2.9vw, 12.5px)",
                  fontWeight: isActive ? 800 : isDone ? 700 : 600,
                  color: isActive ? accentCyan : isDone ? "#e2e8f0" : "#64748b",
                  textAlign: "center",
                  lineHeight: "1.25",
                  wordBreak: "break-word",
                  display: "inline-block",
                  maxWidth: "100%",
                }}
              >
                {st.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   ORDER PROGRESS & DETAILS COMPONENTS (Inspired by G2G)
   Structured, clean, dignified - zero repetition or gimmick copy.
   ──────────────────────────────────────────────────────────────── */

interface OrderStatusViewProps {
  order: any;
  isAr: boolean;
  cardBg: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  accentCyan: string;
  dbImageMap: Record<string, string>;
  onRefresh?: () => void;
}

/**
 * 1. ORDER ACTIVITY TIMELINE (سجل ومراحل سير الطلب - Like G2G)
 */
function OrderActivityTimeline({
  order,
  isAr,
  cardBg,
  cardBorder,
  textPrimary,
  textSecondary,
  accentCyan,
  currentStatus,
}: {
  order: any;
  isAr: boolean;
  cardBg: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  accentCyan: string;
  currentStatus: "pending" | "processing" | "delivered";
}) {
  const formattedDate = order?.created_at
    ? new Date(order.created_at).toLocaleDateString(isAr ? "ar-JO" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const isPending = currentStatus === "pending";
  const isProcessing = currentStatus === "processing";
  const isDelivered = currentStatus === "delivered";

  const milestones = [
    {
      title: isAr ? "استلام وتسجيل الطلب" : "Order Placed",
      desc: isAr ? "تم استلام الطلب وتوليد الفاتورة بنجاح في النظام" : "Order submitted and invoice created successfully",
      time: formattedDate,
      state: "completed" as const,
    },
    {
      title: isAr ? "مراجعة وتأكيد استلام الدفع" : "Payment Verification",
      desc: isPending
        ? isAr
          ? "جاري التحقق من عملية الدفع ومطابقة التحويل من قِبل الإدارة"
          : "Verifying payment transfer with store management"
        : isAr
        ? "تم تأكيد استلام المبلغ الإجمالي للطلب بنجاح"
        : "Payment confirmed and verified successfully",
      time: isPending ? (isAr ? "قيد المراجعة الآن" : "Under review") : formattedDate,
      state: isPending ? ("active" as const) : ("completed" as const),
    },
    {
      title: isAr ? "تجهيز المنتجات والأكواد" : "Keys & Products Preparation",
      desc: isPending
        ? isAr
          ? "تبدأ مرحلة التجهيز فور تأكيد استلام الدفع مباشرة"
          : "Preparation starts immediately after payment confirmation"
        : isProcessing
        ? isAr
          ? "يعمل فريق المتجر الآن على تجهيز الأكواد الرقمية للطلب"
          : "Store team is currently preparing your digital codes"
        : isAr
        ? "تم الانتهاء من تجهيز كافة الأكواد الرقمية"
        : "Digital codes preparation completed",
      time: isPending ? (isAr ? "المرحلة القادمة" : "Upcoming") : isProcessing ? (isAr ? "قيد التنفيذ الآن ⚡" : "In progress ⚡") : (isAr ? "مكتمل" : "Completed"),
      state: isPending ? ("upcoming" as const) : isProcessing ? ("active" as const) : ("completed" as const),
    },
    {
      title: isAr ? "تسليم الأكواد والتفعيل" : "Delivery & Activation",
      desc: isDelivered
        ? isAr
          ? "تم تسليم جميع الأكواد بنجاح، يمكنك نسخها واستخدامها الآن"
          : "Codes delivered successfully, ready to copy and redeem"
        : isAr
        ? "ستظهر مفاتيح التفعيل وكود الحساب مباشرة هنا فور الانتهاء"
        : "Activation keys will appear directly here once ready",
      time: isDelivered ? (isAr ? "تم التسليم" : "Delivered") : (isAr ? "المرحلة الأخيرة" : "Final step"),
      state: isDelivered ? ("completed" as const) : ("upcoming" as const),
    },
  ];

  return (
    <div
      style={{
        borderRadius: "16px",
        backgroundColor: cardBg,
        border: `1px solid ${cardBorder}`,
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 800, color: textPrimary, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
          <Clock style={{ width: "16px", height: "16px", color: accentCyan }} />
          {isAr ? "سجل ومراحل تنفيذ الطلب" : "Order Activity Timeline"}
        </h3>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: isPending ? "#fbbf24" : accentCyan,
            backgroundColor: isPending ? "rgba(245, 158, 11, 0.1)" : "rgba(0, 229, 255, 0.1)",
            padding: "3px 10px",
            borderRadius: "6px",
            border: `1px solid ${isPending ? "rgba(245, 158, 11, 0.25)" : "rgba(0, 229, 255, 0.25)"}`,
          }}
        >
          {isPending
            ? isAr ? "المرحلة 2: بانتظار تأكيد الدفع" : "Step 2: Awaiting Payment"
            : isProcessing
            ? isAr ? "المرحلة 3: قيد التجهيز الآن" : "Step 3: Preparing Keys"
            : isAr ? "المرحلة 4: تم التسليم" : "Step 4: Delivered"}
        </span>
      </div>

      {/* Timeline items list */}
      <div style={{ display: "flex", flexDirection: "column", position: "relative" }}>
        {milestones.map((m, idx) => {
          const isLast = idx === milestones.length - 1;
          const isDone = m.state === "completed";
          const isActive = m.state === "active";

          return (
            <div key={idx} style={{ display: "flex", gap: "14px", position: "relative", minHeight: isLast ? "auto" : "76px" }}>
              {/* Timeline Indicator Column */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "20px", flexShrink: 0 }}>
                {isDone ? (
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      backgroundColor: "rgba(16, 185, 129, 0.15)",
                      border: "1.5px solid #10b981",
                      color: "#10b981",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Check style={{ width: "11px", height: "11px", strokeWidth: 3 }} />
                  </div>
                ) : isActive ? (
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      backgroundColor: isPending ? "rgba(245, 158, 11, 0.2)" : "rgba(0, 229, 255, 0.2)",
                      border: `1.5px solid ${isPending ? "#fbbf24" : accentCyan}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: `0 0 10px ${isPending ? "rgba(245, 158, 11, 0.6)" : "rgba(0, 229, 255, 0.6)"}`,
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: isPending ? "#fbbf24" : accentCyan,
                      }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      backgroundColor: "rgba(255, 255, 255, 0.04)",
                      border: "1.5px solid rgba(255, 255, 255, 0.15)",
                      flexShrink: 0,
                    }}
                  />
                )}

                {/* Vertical connecting line */}
                {!isLast && (
                  <div
                    style={{
                      width: "1.5px",
                      flex: 1,
                      backgroundColor: isDone ? "#10b981" : "rgba(255, 255, 255, 0.1)",
                      margin: "4px 0",
                    }}
                  />
                )}
              </div>

              {/* Text Information */}
              <div style={{ flex: 1, paddingBottom: isLast ? "0" : "26px" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: "6px" }}>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: isActive ? 800 : isDone ? 700 : 600,
                      color: isActive ? (isPending ? "#fbbf24" : accentCyan) : isDone ? textPrimary : "rgba(255, 255, 255, 0.4)",
                    }}
                  >
                    {m.title}
                  </span>
                  <span style={{ fontSize: "11px", color: textSecondary, fontWeight: 600 }}>
                    {m.time}
                  </span>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: textSecondary, lineHeight: 1.55 }}>
                  {m.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 2. ORDER ITEMS CARD (تفاصيل المنتجات - مرتب وأنيق بدون حشو)
 */
function OrderItemsCard({
  items,
  isAr,
  cardBg,
  cardBorder,
  textPrimary,
  textSecondary,
  accentCyan,
  dbImageMap,
}: {
  items: any[];
  isAr: boolean;
  cardBg: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  accentCyan: string;
  dbImageMap: Record<string, string>;
}) {
  const { format } = useCurrency();
  return (
    <div
      style={{
        borderRadius: "16px",
        backgroundColor: cardBg,
        border: `1px solid ${cardBorder}`,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 800, color: textPrimary, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
          <ShoppingBag style={{ width: "16px", height: "16px", color: accentCyan }} />
          {isAr ? `المنتجات في هذا الطلب (${items.length})` : `Order Items (${items.length})`}
        </h3>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {items.map((it: any, idx: number) => {
          const coverImg = getProductCoverImage(it.image, it.name, it.product_slug || it.slug, dbImageMap);
          const qty = Math.max(1, Number(it.qty ?? it.quantity) || 1);
          const regionBadge = formatFullRegion(
            {
              region: it.region,
              cartId: it.cartId || it.id || it.sku,
              name: it.name,
              slug: it.product_slug || it.slug,
            },
            isAr ? "ar" : "en"
          );

          return (
            <div
              key={idx}
              style={{
                borderRadius: "12px",
                backgroundColor: "rgba(255, 255, 255, 0.025)",
                border: "1px solid rgba(255, 255, 255, 0.07)",
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: "1 1 auto" }}>
                <img
                  src={coverImg}
                  alt={it.name || "Product"}
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "10px",
                    objectFit: "cover",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    backgroundColor: "rgba(255, 255, 255, 0.03)",
                    flexShrink: 0,
                  }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "/app/assets/img/gx-logo.png";
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "13.5px", fontWeight: 800, color: textPrimary, lineHeight: 1.4 }}>
                    {it.name || (isAr ? "منتج رقمي" : "Digital Product")}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", flexWrap: "wrap" }}>
                    {regionBadge && (
                      <span
                        style={{
                          fontSize: "10.5px",
                          color: accentCyan,
                          fontWeight: 800,
                          backgroundColor: "rgba(0, 229, 255, 0.08)",
                          padding: "1px 7px",
                          borderRadius: "4px",
                          border: "1px solid rgba(0, 229, 255, 0.2)",
                        }}
                      >
                        {regionBadge}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#cbd5e1",
                        fontWeight: 700,
                        backgroundColor: "rgba(255, 255, 255, 0.06)",
                        padding: "1px 7px",
                        borderRadius: "4px",
                      }}
                    >
                      ×{qty}
                    </span>
                  </div>
                </div>
              </div>

              {/* Item Price on opposite side */}
              {it.price !== undefined && (
                <div style={{ fontSize: "13.5px", fontWeight: 800, color: textPrimary, flexShrink: 0 }} dir="ltr">
                  {format(Number(it.price) * qty)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 3. ORDER SUMMARY TABLE (ملخص الطلب المالي والمعلومات - Like G2G Image 4)
 */
function OrderSummaryTable({
  order,
  isAr,
  cardBg,
  cardBorder,
  textPrimary,
  textSecondary,
  accentCyan,
  isPending,
}: {
  order: any;
  isAr: boolean;
  cardBg: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  accentCyan: string;
  isPending: boolean;
}) {
  const { format } = useCurrency();
  const [copiedNum, setCopiedNum] = useState(false);

  const handleCopyOrderNum = () => {
    if (order?.order_number) {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(String(order.order_number));
      }
      setCopiedNum(true);
      toast.success(isAr ? "تم نسخ رقم الطلب بنجاح!" : "Order number copied!");
      setTimeout(() => setCopiedNum(false), 2000);
    }
  };

  const formattedDate = order?.created_at
    ? new Date(order.created_at).toLocaleDateString(isAr ? "ar-JO" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const deliveryData = parseDeliveryData(order?.delivery_data);
  const subtotalJod = Number(order?.total_jod || 0);
  const rawPm = String(deliveryData.payment_method || order?.payment_method || "").toLowerCase().trim();
  const isBinance = rawPm === "binance_pay" || rawPm === "binance" || Boolean(deliveryData.binance_order_id || deliveryData.binance_id);

  const calculatedBinanceFee = isBinance ? Math.round(subtotalJod * 0.03 * 100) / 100 : 0;
  const feeJod = Number(deliveryData.fee_jod ?? calculatedBinanceFee);
  const feeRate = deliveryData.fee_rate || "3%";
  const totalWithFeeJod = Number(deliveryData.total_with_fee_jod ?? (subtotalJod + feeJod));
  const totalUsdt = deliveryData.total_usdt ?? (isBinance && totalWithFeeJod > 0 ? (totalWithFeeJod * 1.41).toFixed(2) : null);

  const paymentMethodLabel = (() => {
    if (rawPm === "cliq") return isAr ? "خدمة كليك (CliQ) 🇯🇴" : "CliQ (Jordan) 🇯🇴";
    if (isBinance) return isAr ? "بايننس باي (Binance Pay) 🟡" : "Binance Pay 🟡";
    if (rawPm === "gx_wallet") return isAr ? "محفظة GX Wallet 🌐" : "GX Wallet 🌐";
    if (rawPm === "card") return isAr ? "بطاقة بنكية (Visa / MC) 💳" : "Bank Card (Visa / MC) 💳";
    return isAr ? "دفع إلكتروني مباشر" : "Direct Electronic Payment";
  })();

  return (
    <div
      style={{
        borderRadius: "16px",
        backgroundColor: cardBg,
        border: `1px solid ${cardBorder}`,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
      }}
    >
      <h3 style={{ fontSize: "14px", fontWeight: 800, color: textPrimary, margin: 0 }}>
        {isAr ? "ملخص الطلب والبيانات المالية" : "Order Summary & Details"}
      </h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))",
          gap: "12px",
          borderRadius: "12px",
          backgroundColor: "rgba(255, 255, 255, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          padding: "14px 16px",
        }}
      >
        {/* Row 1: Order No */}
        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          <span style={{ fontSize: "11px", color: textSecondary, fontWeight: 700 }}>
            {isAr ? "رقم الطلب" : "Order No."}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "13px", fontWeight: 900, color: textPrimary, fontFamily: "monospace" }} dir="ltr">
              #{order?.order_number}
            </span>
            <button
              type="button"
              onClick={handleCopyOrderNum}
              style={{
                background: "none",
                border: "none",
                color: copiedNum ? "#10b981" : accentCyan,
                cursor: "pointer",
                padding: "2px",
                display: "flex",
                alignItems: "center",
              }}
              title={isAr ? "نسخ" : "Copy"}
            >
              {copiedNum ? <Check style={{ width: "13px", height: "13px" }} /> : <Copy style={{ width: "13px", height: "13px" }} />}
            </button>
          </div>
        </div>

        {/* Row 2: Date */}
        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          <span style={{ fontSize: "11px", color: textSecondary, fontWeight: 700 }}>
            {isAr ? "تاريخ تقديم الطلب" : "Placed On"}
          </span>
          <span style={{ fontSize: "12.5px", fontWeight: 800, color: textPrimary }}>
            {formattedDate}
          </span>
        </div>

        {/* Row 3: Payment Status */}
        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          <span style={{ fontSize: "11px", color: textSecondary, fontWeight: 700 }}>
            {isAr ? "حالة الدفع" : "Payment Status"}
          </span>
          <span
            style={{
              fontSize: "12.5px",
              fontWeight: 800,
              color: isPending ? "#fbbf24" : "#10b981",
            }}
          >
            {isPending ? (isAr ? "بانتظار التأكيد ⏳" : "Awaiting Confirmation ⏳") : (isAr ? "تم التأكيد بنجاح ✓" : "Paid ✓")}
          </span>
        </div>

        {/* Row 4: Payment Method */}
        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          <span style={{ fontSize: "11px", color: textSecondary, fontWeight: 700 }}>
            {isAr ? "طريقة الدفع" : "Payment Method"}
          </span>
          <span style={{ fontSize: "12.5px", fontWeight: 800, color: textPrimary }}>
            {paymentMethodLabel}
          </span>
        </div>
      </div>

      {/* Financial Breakdown (Products Subtotal, Service Fee if any, Total) */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          paddingTop: "10px",
          borderTop: "1px solid rgba(255, 255, 255, 0.07)",
          fontSize: "13px",
        }}
      >
        {feeJod > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: textSecondary }}>
              <span>{isAr ? "قيمة المنتجات:" : "Products Subtotal:"}</span>
              <span dir="ltr" style={{ fontWeight: 700, color: textPrimary }}>
                {format(subtotalJod)}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#38bdf8" }}>
              <span>{isAr ? `رسوم الخدمة (${feeRate}):` : `Service Fee (${feeRate}):`}</span>
              <span dir="ltr" style={{ fontWeight: 700 }}>
                +{format(feeJod)}
              </span>
            </div>
          </>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: feeJod > 0 ? "8px" : "0",
            borderTop: feeJod > 0 ? "1px dashed rgba(255, 255, 255, 0.07)" : "none",
          }}
        >
          <span style={{ fontSize: "13.5px", fontWeight: 800, color: textPrimary }}>
            {isAr ? "المبلغ الإجمالي:" : "Total Amount:"}
          </span>
          <div style={{ display: "flex", flexDirection: "column", alignItems: isAr ? "flex-start" : "flex-end" }}>
            <div style={{ fontSize: "18px", fontWeight: 900, color: isPending ? "#fbbf24" : "#10b981", display: "flex", alignItems: "center", gap: "4px" }} dir="ltr">
              <span>{format(totalWithFeeJod)}</span>
            </div>
            {totalUsdt && (
              <span style={{ fontSize: "12px", fontWeight: 800, color: "#F0B90B" }} dir="ltr">
                (≈ {totalUsdt} USDT)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 4. ORDER PAYMENT PENDING VIEW (لما يطلب جديد وبانتظار تأكيد الدفع)
 */
function OrderPaymentPendingView({
  order,
  isAr,
  cardBg,
  cardBorder,
  textPrimary,
  textSecondary,
  accentCyan,
  dbImageMap,
}: OrderStatusViewProps) {
  const { format, currency } = useCurrency();
  const items = Array.isArray(order?.items) ? order.items : [];

  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [copiedPayId, setCopiedPayId] = useState(false);
  const [copiedUsdt, setCopiedUsdt] = useState(false);
  const [copiedCliqAlias, setCopiedCliqAlias] = useState(false);

  const deliveryData = parseDeliveryData(order?.delivery_data);
  const subtotalJod = Number(order?.total_jod || 0);
  const rawPm = String(deliveryData.payment_method || order?.payment_method || "").toLowerCase().trim();
  const isBinance = rawPm === "binance_pay" || rawPm === "binance" || Boolean(deliveryData.binance_order_id || deliveryData.binance_id);

  const calculatedBinanceFee = isBinance ? Math.round(subtotalJod * 0.03 * 100) / 100 : 0;
  const feeJod = Number(deliveryData.fee_jod ?? calculatedBinanceFee);
  const totalWithFeeJod = Number(deliveryData.total_with_fee_jod ?? (subtotalJod + feeJod));
  const totalUsdt = deliveryData.total_usdt ?? (isBinance && totalWithFeeJod > 0 ? (totalWithFeeJod * 1.41).toFixed(2) : null);

  const waHelpUrl = isBinance
    ? `https://wa.me/962776252313?text=${encodeURIComponent(
        isAr
          ? `مرحباً متجر GX Store 👋 أود الاستفسار عن التحقق من طلبي رقم #${order?.order_number} (الدفع عبر Binance Pay - رقم العملية: ${deliveryData.binance_order_id || deliveryData.binance_id || "—"}). المبلغ: ${totalUsdt || ""} USDT.`
          : `Hello GX Store 👋 Inquiring about Binance Pay verification for order #${order?.order_number} (Binance ID: ${deliveryData.binance_order_id || deliveryData.binance_id || "—"}). Total: ${totalUsdt || ""} USDT.`
      )}`
    : `https://wa.me/962776252313?text=${encodeURIComponent(
        isAr
          ? `مرحباً متجر GX Store 👋 أود إرسال إشعار تحويل CliQ لطلبي رقم #${order?.order_number}. المبلغ: ${Number(order?.total_jod || 0).toFixed(2)} د.أ.`
          : `Hello GX Store 👋 Inquiring about CliQ payment confirmation for order #${order?.order_number}. Amount: ${format(Number(order?.total_jod || 0))}.`
      )}`;

  const handleCopy = (text: string, setCopied: (v: boolean) => void, msgAr: string, msgEn: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(isAr ? msgAr : msgEn);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "18px",
        width: "100%",
        animation: "drfFadeUp 0.3s ease",
      }}
    >
      {/* ── TOP STATUS BANNER ── */}
      <div
        style={{
          borderRadius: "18px",
          backgroundColor: cardBg,
          border: isBinance ? "1px solid rgba(240, 185, 11, 0.35)" : "1px solid rgba(245, 158, 11, 0.35)",
          background: isBinance
            ? "linear-gradient(180deg, rgba(240, 185, 11, 0.10) 0%, rgba(17, 19, 23, 0.96) 100%)"
            : "linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, rgba(17, 19, 23, 0.96) 100%)",
          padding: "24px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          boxShadow: isBinance ? "0 8px 30px rgba(240, 185, 11, 0.08)" : "0 8px 30px rgba(0, 0, 0, 0.3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 12px",
              borderRadius: "8px",
              backgroundColor: isBinance ? "rgba(240, 185, 11, 0.16)" : "rgba(245, 158, 11, 0.16)",
              color: isBinance ? "#fde047" : "#fbbf24",
              fontSize: "12px",
              fontWeight: 800,
              border: isBinance ? "1px solid rgba(240, 185, 11, 0.3)" : "1px solid rgba(245, 158, 11, 0.3)",
            }}
          >
            <Clock style={{ width: "13px", height: "13px" }} />
            <span>{isAr ? "حالة الدفع: ⏳ قيد التحقق والمراجعة" : "Payment Status: ⏳ Pending Verification"}</span>
          </span>

          <span style={{ fontSize: "12px", color: textSecondary, fontFamily: "monospace", fontWeight: 700 }} dir="ltr">
            #{order?.order_number}
          </span>
        </div>

        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 900, color: textPrimary, margin: "0 0 8px" }}>
            {isBinance
              ? (isAr ? "تم استلام طلبك وبانتظار التحقق من دفعة Binance Pay" : "Order Received — Awaiting Binance Pay Verification")
              : (isAr ? "تم استلام طلبك وبانتظار تأكيد استلام تحويل CliQ" : "Order Received — Awaiting CliQ Payment Confirmation")}
          </h2>
          <p style={{ margin: 0, fontSize: "13.5px", color: textSecondary, lineHeight: 1.7 }}>
            {isBinance
              ? (isAr
                  ? "تم تسجيل طلبك وتفاصيل عملية الدفع بنجاح. نقوم حالياً بمطابقة الدفعة للتأكد من وصولها، وقد تستغرق هذه العملية بعض الوقت. بمجرد تأكيد الدفع، سيتم تجهيز طلبك وتسليم أكوادك فوراً، ولا يلزمك اتخاذ أي إجراء إضافي حالياً."
                  : "Your order and payment details have been recorded successfully. We are currently verifying the payment, which may take some time. Once confirmed, your order will be fulfilled and codes delivered immediately. No further action is required from you.")
              : (isAr
                  ? "تم تسجيل طلبك بنجاح. نقوم حالياً بالتحقق من عملية الدفع ومطابقة التحويل لتأكيد الطلب والانتقال مباشرة لمرحلة التجهيز والتسليم الفوري."
                  : "Your order has been recorded successfully. We are currently verifying the payment transfer to confirm your order and proceed directly to delivery.")}
          </p>
        </div>

        {/* Detailed Payment Card */}
        {isBinance ? (
          <div
            style={{
              marginTop: "4px",
              padding: "16px 18px",
              borderRadius: "14px",
              backgroundColor: "rgba(240, 185, 11, 0.05)",
              border: "1px solid rgba(240, 185, 11, 0.25)",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", borderBottom: "1px solid rgba(240, 185, 11, 0.15)", paddingBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "16px" }}>🟡</span>
                <strong style={{ fontSize: "13.5px", color: "#F0B90B", fontWeight: 800 }}>
                  {isAr ? "بيانات الدفع عبر بايننس باي (Binance Pay)" : "Binance Pay Payment Details"}
                </strong>
              </div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "#fbbf24",
                  backgroundColor: "rgba(251, 191, 36, 0.12)",
                  padding: "2px 8px",
                  borderRadius: "6px",
                  border: "1px solid rgba(251, 191, 36, 0.25)",
                }}
              >
                {isAr ? "⏳ بانتظار مطابقة الإشعار" : "⏳ Awaiting Match"}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", fontSize: "12.5px" }}>
              {/* Customer Binance Order ID */}
              {(deliveryData.binance_order_id || deliveryData.binance_id) && (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ color: "#9ca3af", fontSize: "11px", fontWeight: 700 }}>
                    {isAr ? "رقم عملية بايننس (Binance Order ID):" : "Your Binance Order ID:"}
                  </span>
                  <div>
                    <code style={{ color: "#00e5ff", fontFamily: "monospace", fontSize: "13.5px", fontWeight: 800, background: "rgba(0, 229, 255, 0.08)", padding: "3px 10px", borderRadius: "6px", border: "1px solid rgba(0, 229, 255, 0.2)" }}>
                      {String(deliveryData.binance_order_id || deliveryData.binance_id)}
                    </code>
                  </div>
                </div>
              )}

              {/* Store Binance Pay ID */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ color: "#9ca3af", fontSize: "11px", fontWeight: 700 }}>
                  {isAr ? "معرّف المتجر في بايننس (Pay ID):" : "Store Binance Pay ID:"}
                </span>
                <div>
                  <code style={{ color: "#F0B90B", fontFamily: "monospace", fontSize: "13.5px", fontWeight: 800, background: "rgba(240, 185, 11, 0.08)", padding: "3px 10px", borderRadius: "6px", border: "1px solid rgba(240, 185, 11, 0.2)" }}>
                    835207366
                  </code>
                </div>
              </div>

              {/* Required Transfer Amount with 3% fee */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ color: "#9ca3af", fontSize: "11px", fontWeight: 700 }}>
                  {isAr ? "المبلغ المطلوب بالكامل (شاملاً رسوم 3%):" : "Total Required (incl. 3% fee):"}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ color: "#ffffff", fontWeight: 900, fontSize: "14px", background: "rgba(240, 185, 11, 0.18)", padding: "3px 10px", borderRadius: "6px", border: "1px solid rgba(240, 185, 11, 0.35)" }}>
                    {totalUsdt ? `${totalUsdt} USDT` : format(totalWithFeeJod)}
                  </span>
                  {totalUsdt && (
                    <span style={{ fontSize: "11.5px", color: textSecondary }}>
                      ({format(totalWithFeeJod)})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              marginTop: "4px",
              padding: "16px 18px",
              borderRadius: "14px",
              backgroundColor: "rgba(0, 229, 255, 0.05)",
              border: "1px solid rgba(0, 229, 255, 0.25)",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "16px" }}>🇯🇴</span>
                <strong style={{ fontSize: "13.5px", color: accentCyan, fontWeight: 800 }}>
                  {isAr ? "الدفع عبر خدمة كليك (CliQ)" : "CliQ Payment Details"}
                </strong>
              </div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  color: accentCyan,
                  backgroundColor: "rgba(0, 229, 255, 0.12)",
                  padding: "2px 8px",
                  borderRadius: "6px",
                  border: "1px solid rgba(0, 229, 255, 0.25)",
                }}
              >
                {isAr ? "⏳ بانتظار استلام التحويل البنكي" : "⏳ Awaiting Bank Transfer"}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", fontSize: "12.5px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "#9ca3af" }}>{isAr ? "الاسم المستعار (CliQ Alias):" : "CliQ Alias:"}</span>
                <code style={{ color: accentCyan, fontFamily: "monospace", fontSize: "13.5px", fontWeight: 800, background: "rgba(0, 229, 255, 0.08)", padding: "3px 10px", borderRadius: "6px", border: "1px solid rgba(0, 229, 255, 0.2)" }}>
                  GXSTORE
                </code>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ color: "#9ca3af" }}>{isAr ? "المبلغ المطلوب:" : "Amount:"}</span>
                <strong style={{ color: "#ffffff", fontSize: "14px", fontWeight: 900 }}>
                  {format(Number(order?.total_jod || 0))}
                  {currency !== "JOD" && (
                    <span style={{ fontSize: "12px", color: textSecondary, fontWeight: 600, marginInlineStart: "4px" }}>
                      ({Number(order?.total_jod || 0).toFixed(2)} د.أ)
                    </span>
                  )}
                </strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── ORDER ACTIVITY TIMELINE (Like G2G) ── */}
      <OrderActivityTimeline
        order={order}
        isAr={isAr}
        cardBg={cardBg}
        cardBorder={cardBorder}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        accentCyan={accentCyan}
        currentStatus="pending"
      />

      {/* ── ORDER ITEMS CARD (Like G2G) ── */}
      <OrderItemsCard
        items={items}
        isAr={isAr}
        cardBg={cardBg}
        cardBorder={cardBorder}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        accentCyan={accentCyan}
        dbImageMap={dbImageMap}
      />

      {/* ── ORDER SUMMARY TABLE (Like G2G) ── */}
      <OrderSummaryTable
        order={order}
        isAr={isAr}
        cardBg={cardBg}
        cardBorder={cardBorder}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        accentCyan={accentCyan}
        isPending={true}
      />
    </div>
  );
}

/**
 * 5. ORDER PREPARATION VIEW (بعد تأكيد استلام الدفع والطلب قيد التحضير والتجهيز)
 */
function OrderPreparationView({
  order,
  isAr,
  cardBg,
  cardBorder,
  textPrimary,
  textSecondary,
  accentCyan,
  dbImageMap,
}: OrderStatusViewProps) {
  const { format, currency } = useCurrency();
  const items = Array.isArray(order?.items) ? order.items : [];

  const waHelpUrl = `https://wa.me/962776252313?text=${encodeURIComponent(
    isAr
      ? `مرحباً متجر GX Store 👋 أود الاستفسار عن طلبي رقم #${order?.order_number} (الطلب قيد التحضير والتجهيز).`
      : `Hello GX Store 👋 Inquiring about my order #${order?.order_number} (in preparation).`
  )}`;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "18px",
        width: "100%",
        animation: "drfFadeUp 0.3s ease",
      }}
    >
      {/* ── TOP STATUS BANNER ── */}
      <div
        style={{
          borderRadius: "16px",
          backgroundColor: cardBg,
          border: "1px solid rgba(0, 229, 255, 0.3)",
          background: "linear-gradient(180deg, rgba(0, 229, 255, 0.08) 0%, rgba(17, 19, 23, 0.95) 100%)",
          padding: "24px 22px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: "6px",
              backgroundColor: "rgba(0, 229, 255, 0.15)",
              color: accentCyan,
              fontSize: "11px",
              fontWeight: 800,
            }}
          >
            {isAr ? "تم تأكيد الدفع • قيد التجهيز ⚡" : "Payment Confirmed • In Preparation ⚡"}
          </span>
        </div>
        <h2 style={{ fontSize: "18px", fontWeight: 900, color: textPrimary, margin: 0 }}>
          {isAr ? "طلبك قيد التحضير والتجهيز الآن" : "Your Order is Being Prepared"}
        </h2>
        <p style={{ margin: 0, fontSize: "13px", color: textSecondary, lineHeight: 1.6 }}>
          {isAr
            ? "تم تأكيد استلام الدفع بنجاح. يعمل فريق المتجر حالياً على إعداد وتجهيز الأكواد الرقمية، وستظهر مباشرة في الخطوة التالية فور الانتهاء."
            : "Payment confirmed successfully. Our store team is preparing your digital codes, and they will appear directly here once ready."}
        </p>
      </div>

      {/* ── ORDER ACTIVITY TIMELINE (Like G2G) ── */}
      <OrderActivityTimeline
        order={order}
        isAr={isAr}
        cardBg={cardBg}
        cardBorder={cardBorder}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        accentCyan={accentCyan}
        currentStatus="processing"
      />

      {/* ── ORDER ITEMS CARD (Like G2G) ── */}
      <OrderItemsCard
        items={items}
        isAr={isAr}
        cardBg={cardBg}
        cardBorder={cardBorder}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        accentCyan={accentCyan}
        dbImageMap={dbImageMap}
      />

      {/* ── ORDER SUMMARY TABLE (Like G2G) ── */}
      <OrderSummaryTable
        order={order}
        isAr={isAr}
        cardBg={cardBg}
        cardBorder={cardBorder}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        accentCyan={accentCyan}
        isPending={false}
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   REVIEW ORDER MODAL (Direct, Fast, Bypasses RLS via RPC)
   ──────────────────────────────────────────────────────────────── */

function ReviewOrderModal({
  order,
  isOpen,
  onClose,
  isAr,
  onSubmitted,
  initialRating = 5,
}: {
  order: any;
  isOpen: boolean;
  onClose: () => void;
  isAr: boolean;
  onSubmitted: () => void;
  initialRating?: number;
}) {
  const [rating, setRating] = useState(initialRating || 5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialRating > 0) setRating(initialRating);
  }, [initialRating, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("full_name, username")
            .eq("id", user.id)
            .maybeSingle();
          if (prof) {
            setDisplayName(prof.full_name || prof.username || "");
          }
        }
      } catch {}
    })();
  }, [isOpen]);

  if (!isOpen) return null;

  async function submit() {
    if (rating === 0) {
      toast.error(isAr ? "اختر عدد النجوم أولاً" : "Please select a star rating first");
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const res: any = await (supabase.rpc as any)("submit_order_review", {
        p_order_id: order?.id || null,
        p_order_number: order?.order_number || "",
        p_rating: rating,
        p_comment: comment.trim(),
        p_display_name: displayName.trim() || (isAr ? "عميل GX" : "GX Customer"),
        p_user_id: user?.id || null,
      });

      setSaving(false);
      const data = res?.data;
      if (res?.error) {
        toast.error(res.error.message || (isAr ? "حدث خطأ أثناء حفظ التقييم" : "Error saving review"));
        return;
      }
      if (data && !data.success) {
        if (data.already) {
          toast.error(isAr ? "تم تقييم هذا الطلب مسبقاً" : "You already reviewed this order");
          onSubmitted();
          onClose();
        } else {
          toast.error(data.error || (isAr ? "حدث خطأ" : "Something went wrong"));
        }
        return;
      }

      toast.success(isAr ? "شكراً على تقييمك! تم تسجيل رأيك بنجاح ❤️" : "Thank you for your review! ❤️");
      onSubmitted();
      onClose();
    } catch (err: any) {
      setSaving(false);
      toast.error(err?.message || (isAr ? "حدث خطأ أثناء حفظ التقييم" : "Error submitting review"));
    }
  }

  const starLabels = isAr
    ? ["سيء جداً 😞", "سيء 🙁", "مقبول 😐", "جيد جداً 🙂", "ممتاز ورائع! 🌟"]
    : ["Terrible", "Poor", "Fair", "Very Good", "Excellent! 🌟"];

  const activeRating = hover || rating;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(12px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#13161f",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "18px",
          maxWidth: "460px",
          width: "100%",
          padding: "24px",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.8), 0 0 32px rgba(255, 213, 79, 0.08)",
          boxSizing: "border-box",
          position: "relative",
          animation: "drfFadeScale 0.25s ease",
        }}
        onClick={(e) => e.stopPropagation()}
        dir={isAr ? "rtl" : "ltr"}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: "rgba(255, 213, 79, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffd54f",
              }}
            >
              <Star size={20} fill="#ffd54f" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#ffffff" }}>
                {isAr ? "تقييم تجربة الشراء" : "Rate Your Experience"}
              </h3>
              <span style={{ fontSize: "11.5px", color: "#8b9ab0" }}>
                {isAr ? `الطلب #${order?.order_number}` : `Order #${order?.order_number}`}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#8b9ab0",
              cursor: "pointer",
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Big Interactive Stars */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", margin: "20px 0" }}>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }} onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHover(n)}
                onClick={() => setRating(n)}
                style={{
                  background: "none",
                  border: 0,
                  cursor: "pointer",
                  padding: "4px",
                  lineHeight: 0,
                  transform: activeRating >= n ? "scale(1.2)" : "scale(1)",
                  transition: "transform 0.15s ease",
                }}
              >
                <Star
                  size={36}
                  fill={activeRating >= n ? "#ffd54f" : "transparent"}
                  color={activeRating >= n ? "#ffd54f" : "#3d4c5c"}
                  strokeWidth={1.5}
                />
              </button>
            ))}
          </div>
          {activeRating > 0 && (
            <div
              style={{
                fontSize: "13px",
                fontWeight: 800,
                padding: "4px 16px",
                borderRadius: "20px",
                color: activeRating >= 4 ? "#4ade80" : activeRating >= 3 ? "#fbbf24" : "#f87171",
                background:
                  activeRating >= 4
                    ? "rgba(74, 222, 128, 0.1)"
                    : activeRating >= 3
                    ? "rgba(251, 191, 36, 0.1)"
                    : "rgba(248, 113, 113, 0.1)",
              }}
            >
              {starLabels[activeRating - 1]}
            </div>
          )}
        </div>

        {/* Inputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#8b9ab0", marginBottom: "5px" }}>
              {isAr ? "الاسم الظاهر" : "Display Name"}
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={isAr ? "اسمك كما سيظهر" : "Your name as shown"}
              maxLength={60}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "10px",
                background: "rgba(0, 0, 0, 0.35)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                color: "#ffffff",
                fontSize: "13px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#8b9ab0", marginBottom: "5px" }}>
              {isAr ? "تعليقك وملاحظاتك (اختياري)" : "Your feedback (optional)"}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 250))}
              placeholder={isAr ? "شاركنا رأيك في سرعة الخدمة وجودة المنتج..." : "Share your feedback..."}
              rows={3}
              maxLength={250}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "10px",
                background: "rgba(0, 0, 0, 0.35)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                color: "#ffffff",
                fontSize: "13px",
                outline: "none",
                resize: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={submit}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "12px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #ffd54f 0%, #ffb300 100%)",
              color: "#07090e",
              fontWeight: 900,
              fontSize: "13.5px",
              border: "none",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
              marginTop: "6px",
            }}
          >
            <Send size={15} />
            <span>{saving ? (isAr ? "جاري الإرسال..." : "Submitting...") : (isAr ? "إرسال التقييم" : "Submit Rating")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   MAIN COMPONENT
   ──────────────────────────────────────────────────────────────── */

export function GxOrderDeliveryView({
  order,
  loading,
  error,
  isLocked = false,
  orderToken,
  revealedKeys,
  copiedKey,
  onRevealKey,
  onCopyKey,
  ipMismatchInfo,
  onRefresh,
}: GxOrderDeliveryViewProps) {
  const { lang, dir } = useLang();
  const { format, currency } = useCurrency();
  const isAr = lang === "ar";

  const [selectedItemIdx, setSelectedItemIdx] = useState<number | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [showOrderSummary, setShowOrderSummary] = useState(false);

  // Review states
  const [reviewStatus, setReviewStatus] = useState<"loading" | "already" | "ready" | "submitted">("loading");
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);

  // Product images database cache
  const [dbImageMap, setDbImageMap] = useState<Record<string, string>>({});

  const statusLower = (order?.status || "").toLowerCase();
  const isCancelledOrder = Boolean(
    statusLower === "cancelled" ||
    (error && (error.includes("إلغاء") || error.includes("cancelled") || error.includes("ملغي")))
  );
  const isPendingOrder = Boolean(!isCancelledOrder && statusLower === "pending");
  const isProcessingOrder = Boolean(!isCancelledOrder && (statusLower === "paid" || statusLower === "processing"));
  const isDeliveredOrder = Boolean(statusLower === "delivered" || statusLower === "completed");
  const currentStep: 2 | 3 | 4 = isDeliveredOrder ? 4 : isProcessingOrder ? 3 : 2;

  const [revealedModalKey, setRevealedModalKey] = useState<DeliveryCode | null>(null);
  const prevStatusRef = React.useRef(order?.status);

  useEffect(() => {
    const prev = prevStatusRef.current;
    const current = order?.status;
    if (
      prev &&
      (prev.toLowerCase() === "paid" || prev.toLowerCase() === "processing" || prev.toLowerCase() === "pending") &&
      (current?.toLowerCase() === "delivered" || current?.toLowerCase() === "completed")
    ) {
      toast.success(isAr ? "🎉 مبروك! تم تجهيز وتسليم طلبك بنجاح!" : "🎉 Congratulations! Your order is delivered!");
    }
    prevStatusRef.current = current;
  }, [order?.status, isAr]);

  const deliveryCodes: DeliveryCode[] = useMemo(() => {
    const delData = parseDeliveryData(order?.delivery_data);
    const codes = delData.codes;
    return Array.isArray(codes) ? codes : [];
  }, [order]);


  const items = useMemo(() => {
    return Array.isArray(order?.items) ? order.items : [];
  }, [order]);

  const deliverableUnits = useMemo<DeliverableUnit[]>(() => {
    if (deliveryCodes.length > 0) {
      return deliveryCodes.map((c, idx) => {
        const matchingItem = items.find((it: any) => {
          const itName = (it.name || "").trim().toLowerCase();
          const cLbl = (c.label || "").trim().toLowerCase();
          return itName && (cLbl.includes(itName) || itName.includes(cLbl.replace(/\s*\(\d+\/\d+\)$/, "")));
        }) || (items[idx] || items[0] || null);

        const isThisTopup = Boolean(c?.kind === "topup" || matchingItem?.delivery_type === "topup");
        const isThisAccount = !isThisTopup && Boolean(
          c?.kind === "account" || (c && c.email && !c.value) || matchingItem?.delivery_type === "account"
        );

        // Respect admin-edited title: code.label comes first!
        const unitLabel = (c.label && c.label.trim()) || matchingItem?.name || (isAr ? "منتج رقمي" : "Digital Product");

        const coverImg = getProductCoverImage(
          matchingItem?.image,
          unitLabel || matchingItem?.name,
          matchingItem?.product_slug || matchingItem?.slug,
          dbImageMap
        );

        const regionBadge = formatFullRegion(
          {
            region: c.region || matchingItem?.region,
            cartId: matchingItem?.cartId || matchingItem?.id,
            name: unitLabel,
            slug: matchingItem?.product_slug || matchingItem?.slug,
          },
          isAr ? "ar" : "en",
          { withDetails: false }
        );

        return {
          unitIndex: idx,
          item: matchingItem || { name: unitLabel },
          itemIndex: idx,
          unitInItem: 1,
          totalUnitsInItem: 1,
          unitLabel,
          code: c,
          coverImg,
          regionBadge,
          isAccount: isThisAccount,
          isTopup: isThisTopup,
          platform: matchingItem?.platform,
          siblingUnits: [{ unitIndex: idx, unitInItem: 1, code: c }],
        };
      });
    }

    const units: DeliverableUnit[] = [];
    if (items && items.length > 0) {
      items.forEach((it: any, itemIdx: number) => {
        const qty = Math.max(1, Number(it.qty ?? it.quantity) || 1);
        const coverImg = getProductCoverImage(it.image, it.name, it.product_slug || it.slug, dbImageMap);
        const regionBadge = formatFullRegion({ region: it.region, name: it.name }, isAr ? "ar" : "en");
        for (let k = 0; k < qty; k++) {
          const uIdx = units.length;
          units.push({
            unitIndex: uIdx,
            item: it,
            itemIndex: itemIdx,
            unitInItem: k + 1,
            totalUnitsInItem: qty,
            unitLabel: qty > 1 ? `${it.name} (كود ${k + 1} من ${qty})` : (it.name || "منتج رقمي"),
            code: null,
            coverImg,
            regionBadge,
            isAccount: it?.delivery_type === "account",
            isTopup: it?.delivery_type === "topup",
            platform: it?.platform,
            siblingUnits: [{ unitIndex: uIdx, unitInItem: k + 1, code: null }],
          });
        }
      });
    }
    return units;
  }, [items, deliveryCodes, dbImageMap, isAr]);


  // Load product images from DB
  useEffect(() => {
    if (!items || !items.length) return;
    const slugs = items.map((it: any) => it.product_slug || it.slug).filter(Boolean);
    if (!slugs.length) return;

    (async () => {
      try {
        const { data } = await supabase
          .from("products")
          .select("slug, image_url, icon_image_url")
          .in("slug", slugs);
        if (data && data.length > 0) {
          const map: Record<string, string> = {};
          data.forEach((p) => {
            const img = p.image_url || p.icon_image_url;
            if (img) map[p.slug] = img;
          });
          setDbImageMap((prev) => ({ ...prev, ...map }));
        }
      } catch {}
    })();
  }, [items]);

  // Check review status
  useEffect(() => {
    if (!order?.order_number) return;
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase
          .from("reviews")
          .select("id")
          .eq("order_number", order.order_number)
          .maybeSingle();
        if (!alive) return;
        if (data) setReviewStatus("already");
        else setReviewStatus("ready");
      } catch {
        if (alive) setReviewStatus("ready");
      }
    })();
    return () => {
      alive = false;
    };
  }, [order?.order_number]);

  // Local persistent revealed state to prevent race-condition regressions when background sync triggers
  const storageKey = order?.order_number || order?.id ? `gx_rev_${order.order_number || order.id}` : null;
  const [localRevealed, setLocalRevealed] = useState<Record<number, boolean>>(() => {
    if (!storageKey || typeof window === "undefined") return {};
    try {
      const saved = sessionStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const markUnitRevealedLocally = (idx: number) => {
    setLocalRevealed((prev) => {
      const next = { ...prev, [idx]: true };
      if (storageKey && typeof window !== "undefined") {
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };

  const isUnitRevealed = (idx: number | null | undefined): boolean => {
    if (idx === null || idx === undefined) return false;
    const unit = deliverableUnits[idx];
    return Boolean(
      revealedKeys[idx] ||
      localRevealed[idx] ||
      unit?.code?.revealed_at
    );
  };

  // Mandatory confirmation checkbox state before revealing code or account credentials
  const [agreeChecked, setAgreeChecked] = useState(false);

  const activeUnit = selectedItemIdx !== null ? deliverableUnits[selectedItemIdx] : null;
  const activeItem = activeUnit ? activeUnit.item : null;
  const activeCode = activeUnit ? activeUnit.code : null;
  const isAccountItem = Boolean(
    activeUnit?.isAccount ||
    activeCode?.kind === "account" ||
    (activeCode && activeCode.email && !activeCode.value) ||
    activeItem?.delivery_type === "account"
  );
  const isTopupItem = Boolean(
    activeUnit?.isTopup ||
    activeCode?.kind === "topup" ||
    activeItem?.delivery_type === "topup"
  );

  const activeModalRegion = activeUnit?.regionBadge || (activeItem
    ? formatFullRegion(
        {
          region: activeCode?.region || activeItem?.region,
          cartId: activeItem?.cartId || activeItem?.id,
          name: activeItem?.name,
          slug: activeItem?.product_slug || activeItem?.slug,
        },
        isAr ? "ar" : "en",
        { withDetails: true }
      )
    : "");

  // Open modal without revealing yet - user must confirm and check agreement
  const handleOpenReveal = (idx: number) => {
    const unit = deliverableUnits[idx];
    if (unit?.code?.is_cancelled || unit?.code?.status === "cancelled" || unit?.code?.status === "refunded") {
      toast.error(isAr ? "عذراً، تم إلغاء هذا الكود أو المنتج من قِبل إدارة المتجر." : "This code has been cancelled by store admin.");
      return;
    }
    setSelectedItemIdx(idx);
    setShowGuide(false);
    // If unit was already revealed, auto-check agreement so it NEVER locks them out again!
    if (isUnitRevealed(idx)) {
      setAgreeChecked(true);
    } else {
      setAgreeChecked(false);
    }
  };

  // Explicit confirmation to reveal code/account - records reveal strictly after agreement
  const handleConfirmReveal = async (idx: number) => {
    const unit = deliverableUnits[idx];
    if (unit?.code?.is_cancelled || unit?.code?.status === "cancelled" || unit?.code?.status === "refunded") {
      toast.error(isAr ? "عذراً، هذا الكود ملغي ولا يمكن كشفه." : "This code is cancelled and cannot be revealed.");
      handleCloseReveal();
      return;
    }
    markUnitRevealedLocally(idx);
    setAgreeChecked(true);
    onRevealKey(idx);
    const num = order?.order_number ? String(order.order_number).trim() : undefined;
    if (order?.order_number || orderToken) {
      try {
        const res: any = await markCodeRevealedFn({
          data: {
            orderToken: orderToken ? orderToken.trim() : undefined,
            orderNumber: num,
            codeIndex: idx,
          },
        });
        if (res && res.code_cancelled) {
          toast.error(res.error || (isAr ? "تم إلغاء هذا الكود من قِبل إدارة المتجر" : "This code was cancelled"));
          handleCloseReveal();
        }
      } catch {}
    }
  };

  const handleCloseReveal = () => {
    setSelectedItemIdx(null);
    setShowGuide(false);
    setAgreeChecked(false);
  };

  // Compute order total from items
  const orderTotal = useMemo(() => {
    if (order?.total_jod) return order.total_jod;
    return items.reduce((sum: number, it: any) => sum + ((it.price || 0) * (it.qty || it.quantity || 1)), 0);
  }, [order, items]);

  /* ── Shared Styles ────────────────────────────────────────── */
  const cardBg = "#0f1219";
  const cardBorder = "rgba(255, 255, 255, 0.07)";
  const accentCyan = "#00e5ff";
  const textPrimary = "#ffffff";
  const textSecondary = "#8b9ab0";
  const textMuted = "#5a6a7e";

  return (
    <div
      style={{
        backgroundColor: "#07090e",
        minHeight: "100vh",
        width: "100%",
        paddingTop: "100px",
        paddingBottom: "80px",
        paddingLeft: "16px",
        paddingRight: "16px",
        boxSizing: "border-box",
        fontFamily: "'Tajawal', 'Almarai', sans-serif",
        color: "#f5f6f8",
      }}
      dir={dir}
    >
      {/* Animation Keyframes */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes drfFadeUp {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes drfFadeScale {
            from { opacity: 0; transform: scale(0.96); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes drfPulse {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }
          @keyframes drfGlow {
            0%, 100% { box-shadow: 0 0 15px rgba(0, 229, 255, 0.15); }
            50% { box-shadow: 0 0 25px rgba(0, 229, 255, 0.35); }
          }
          @keyframes drfRadarPing {
            0% { transform: scale(0.85); opacity: 0.9; }
            50% { transform: scale(1.4); opacity: 0.35; }
            100% { transform: scale(1.9); opacity: 0; }
          }
          @keyframes drfLiveBadgePulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.35; transform: scale(0.85); }
          }
          @keyframes drfGlowPulse {
            0%, 100% { box-shadow: 0 0 20px rgba(0, 229, 255, 0.25), inset 0 0 15px rgba(0, 229, 255, 0.15); }
            50% { box-shadow: 0 0 35px rgba(0, 229, 255, 0.55), inset 0 0 25px rgba(0, 229, 255, 0.3); }
          }
          @keyframes drfCelebrationPop {
            0% { transform: scale(0.95); opacity: 0; }
            50% { transform: scale(1.02); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes drfPulseCircle {
            0%, 100% {
              box-shadow: 0 0 16px rgba(0, 229, 255, 0.6), 0 0 28px rgba(0, 229, 255, 0.25);
              transform: scale(1);
            }
            50% {
              box-shadow: 0 0 26px rgba(0, 229, 255, 0.95), 0 0 42px rgba(0, 229, 255, 0.45);
              transform: scale(1.08);
            }
          }
          @keyframes drfLineFlow {
            0% {
              background-position: 0% 50%;
            }
            100% {
              background-position: 200% 50%;
            }
          }
          @media (max-width: 640px) {
            .drf-unit-card-inner {
              flex-direction: column !important;
              align-items: stretch !important;
              gap: 14px !important;
              padding: 14px 14px !important;
            }
            .drf-unit-info-left {
              width: 100% !important;
              align-items: center !important;
            }
            .drf-unit-actions-right {
              width: 100% !important;
              align-items: stretch !important;
            }
            .drf-unit-reveal-btn {
              width: 100% !important;
              justify-content: center !important;
              padding: 12px 18px !important;
              font-size: 13.5px !important;
            }
            .drf-unit-cancelled-badge {
              width: 100% !important;
              justify-content: center !important;
              padding: 12px 14px !important;
              text-align: center !important;
              box-sizing: border-box !important;
            }
            .drf-gift-card-img {
              width: 76px !important;
              height: 52px !important;
              border-radius: 8px !important;
            }
          }
        `,
        }}
      />

      {/* Main Container */}
      <div
        style={{
          maxWidth: "880px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "28px",
          alignItems: "stretch",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* =========================================================
            HEADER STEPPER (4-Step Animated Interactive Line)
           ========================================================= */}
        <OrderStepperLine
          currentStep={currentStep}
          isAr={isAr}
          accentCyan={accentCyan}
        />

        {/* LOADING STATE */}
        {loading && (
          <div
            style={{
              borderRadius: "18px",
              backgroundColor: cardBg,
              border: `1px solid ${cardBorder}`,
              padding: "60px 24px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                border: `3px solid rgba(0, 229, 255, 0.15)`,
                borderTopColor: accentCyan,
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <span style={{ fontSize: "14px", color: textSecondary }}>
              {isAr ? "جاري جلب تفاصيل ومفاتيح طلبك..." : "Loading order keys..."}
            </span>
          </div>
        )}

        {/* DEAD LINK FOR CANCELLED ORDERS */}
        {!loading && isCancelledOrder && (
          <div
            style={{
              borderRadius: "20px",
              backgroundColor: cardBg,
              border: "1px solid rgba(239, 68, 68, 0.4)",
              background: "linear-gradient(180deg, rgba(239, 68, 68, 0.08) 0%, rgba(15, 18, 25, 0.95) 100%)",
              padding: "50px 24px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "20px",
              animation: "drfFadeUp 0.4s ease",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(239, 68, 68, 0.12)",
            }}
          >
            <div
              style={{
                width: "68px",
                height: "68px",
                borderRadius: "50%",
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                border: "2px solid rgba(239, 68, 68, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ef4444",
                boxShadow: "0 0 25px rgba(239, 68, 68, 0.25)",
              }}
            >
              <AlertTriangle style={{ width: "34px", height: "34px" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "520px" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  alignSelf: "center",
                  padding: "4px 14px",
                  borderRadius: "20px",
                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  color: "#f87171",
                  fontSize: "12px",
                  fontWeight: 800,
                }}
              >
                <span>⛔ {isAr ? "رابط ملغي وغير صالح" : "Dead / Inactive Link"}</span>
              </div>
              <h2 style={{ fontSize: "20px", fontWeight: 900, color: textPrimary, margin: "6px 0 0" }}>
                {isAr ? "تم إلغاء هذا الطلب نهائياً" : "This Order Has Been Cancelled"}
              </h2>
              <p style={{ fontSize: "13.5px", color: textSecondary, margin: 0, lineHeight: 1.65 }}>
                {isAr
                  ? "تم إيقاف وإلغاء صلاحية هذا الرابط تماماً نظراً لإلغاء الطلب من قبل إدارة المتجر. لا تتوفر أي أكواد أو تفاصيل تفعيل لهذا الطلب."
                  : "This link has been permanently disabled and invalidated because the order was cancelled by store management. No activation codes or details are available."}
              </p>
            </div>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center", marginTop: "8px" }}>
              <Link
                to="/"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "12px 24px",
                  borderRadius: "12px",
                  background: `linear-gradient(135deg, ${accentCyan}, #0098d4)`,
                  color: "#07090e",
                  fontWeight: 900,
                  fontSize: "13.5px",
                  textDecoration: "none",
                  boxShadow: "0 4px 18px rgba(0, 229, 255, 0.3)",
                }}
              >
                <ShoppingBag style={{ width: "16px", height: "16px" }} />
                <span>{isAr ? "تصفح المتجر 🛍️" : "Visit Store 🛍️"}</span>
              </Link>
              <a
                href="https://wa.me/962776252313"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "12px 22px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  border: `1px solid ${cardBorder}`,
                  color: textPrimary,
                  fontWeight: 800,
                  fontSize: "13.5px",
                  textDecoration: "none",
                }}
              >
                <WhatsAppSvg size={17} color="#25D366" />
                <span>{isAr ? "الدعم الفني عبر واتساب" : "WhatsApp Support"}</span>
              </a>
            </div>
          </div>
        )}

        {/* ERROR STATE */}
        {!loading && !isCancelledOrder && error && (
          <div
            style={{
              borderRadius: "18px",
              backgroundColor: cardBg,
              border: "1px solid rgba(239, 68, 68, 0.3)",
              padding: "40px 24px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
              animation: "drfFadeUp 0.4s ease",
            }}
          >
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "50%",
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ef4444",
              }}
            >
              <AlertTriangle style={{ width: "26px", height: "26px" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <h2 style={{ fontSize: "17px", fontWeight: 800, color: textPrimary, margin: 0 }}>
                {isAr ? "تعذر فتح الطلب" : "Unable to Open Order"}
              </h2>
              <p style={{ fontSize: "13px", color: textSecondary, margin: 0, lineHeight: 1.6 }}>{error}</p>
            </div>
            <Link
              to="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "11px 26px",
                borderRadius: "12px",
                background: `linear-gradient(135deg, ${accentCyan}, #0098d4)`,
                color: "#07090e",
                fontWeight: 800,
                fontSize: "13px",
                textDecoration: "none",
                marginTop: "4px",
              }}
            >
              <ShoppingBag style={{ width: "16px", height: "16px" }} />
              <span>{isAr ? "العودة للمتجر" : "Back to Store"}</span>
            </Link>
          </div>
        )}

        {/* IP MISMATCH OR ACCOUNT MISMATCH FRAUD PROTECTION NOTICE */}
        {!loading && !isCancelledOrder && ipMismatchInfo?.mismatch && (
          <OrderIpMismatchNotice
            orderNumber={ipMismatchInfo.orderNumber || order?.order_number}
            customerEmail={ipMismatchInfo.customerEmail || order?.customer_email}
            orderToken={orderToken}
            purchaseIp={ipMismatchInfo.purchaseIp}
            currentIp={ipMismatchInfo.currentIp}
            accountMismatch={ipMismatchInfo.accountMismatch}
            callerEmail={ipMismatchInfo.callerEmail}
            onRefresh={onRefresh}
          />
        )}

        {/* LOCKED ORDER STATE */}
        {!loading && order && isLocked && !isPendingOrder && !isProcessingOrder && !ipMismatchInfo?.mismatch && (
          <div
            style={{
              borderRadius: "18px",
              backgroundColor: cardBg,
              border: "1px solid rgba(245, 158, 11, 0.25)",
              padding: "48px 24px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "18px",
              animation: "drfFadeUp 0.4s ease",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                backgroundColor: "rgba(245, 158, 11, 0.1)",
                border: "1px solid rgba(245, 158, 11, 0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#f59e0b",
              }}
            >
              <Lock style={{ width: "28px", height: "28px" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "460px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 800, color: textPrimary, margin: 0 }}>
                {isAr ? "مفاتيح هذا الطلب محمية ومشفرة" : "Protected Order"}
              </h2>
              <p style={{ fontSize: "13px", color: textSecondary, margin: 0, lineHeight: 1.6 }}>
                {isAr
                  ? "لعرض كود التفعيل الرقمي، يرجى فتح الرابط السري المرسل إلى بريدك الإلكتروني، أو تسجيل الدخول بنفس الحساب."
                  : "To view your digital keys, please open the secret link sent to your email or log in."}
              </p>
            </div>
            <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
              <Link
                to="/auth"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "11px 26px",
                  borderRadius: "12px",
                  background: `linear-gradient(135deg, ${accentCyan}, #0098d4)`,
                  color: "#07090e",
                  fontWeight: 800,
                  fontSize: "13px",
                  textDecoration: "none",
                }}
              >
                {isAr ? "تسجيل الدخول" : "Log In"}
              </Link>
              <Link
                to="/"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "11px 26px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(255, 255, 255, 0.06)",
                  border: `1px solid ${cardBorder}`,
                  color: textPrimary,
                  fontWeight: 700,
                  fontSize: "13px",
                  textDecoration: "none",
                }}
              >
                {isAr ? "الرئيسية" : "Home"}
              </Link>
            </div>
          </div>
        )}

        {/* PENDING PAYMENT STATE (لما واحد يطلب جديد - Step 2) */}
        {!loading && order && isPendingOrder && !isCancelledOrder && !ipMismatchInfo?.mismatch && (
          <OrderPaymentPendingView
            order={order}
            isAr={isAr}
            cardBg={cardBg}
            cardBorder={cardBorder}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            accentCyan={accentCyan}
            dbImageMap={dbImageMap}
            onRefresh={onRefresh}
          />
        )}

        {/* ORDER IN PREPARATION STATE (بعد تأكيد الدفع - Step 3) */}
        {!loading && order && isProcessingOrder && !isCancelledOrder && !ipMismatchInfo?.mismatch && (
          <OrderPreparationView
            order={order}
            isAr={isAr}
            cardBg={cardBg}
            cardBorder={cardBorder}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            accentCyan={accentCyan}
            dbImageMap={dbImageMap}
            onRefresh={onRefresh}
          />
        )}

        {/* =========================================================
            MAIN CONTENT (WHEN LOADED & UNLOCKED & READY/DELIVERED - Step 4)
           ========================================================= */}
        {!loading && order && !isPendingOrder && !isProcessingOrder && (!isLocked || isDeliveredOrder) && !isCancelledOrder && !ipMismatchInfo?.mismatch && (
          <div style={{ display: "flex", flexDirection: "column", gap: "22px", width: "100%" }}>
            {/* ── SECTION 1: ORDER SUMMARY & DETAILS (AT THE VERY TOP) ── */}
            <div
              style={{
                borderRadius: "18px",
                backgroundColor: cardBg,
                border: `1px solid rgba(0, 229, 255, 0.15)`,
                overflow: "hidden",
                animation: "drfFadeUp 0.5s ease",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
              }}
            >
              {/* Header: Success & Rating Shortcut */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "16px",
                  padding: "18px 22px",
                  background: "linear-gradient(135deg, rgba(0, 229, 255, 0.08), rgba(16, 185, 129, 0.05))",
                  borderBottom: `1px solid rgba(255, 255, 255, 0.06)`,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, rgba(0, 229, 255, 0.18), rgba(16, 185, 129, 0.12))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: accentCyan,
                      flexShrink: 0,
                    }}
                  >
                    <CheckCircle2 style={{ width: "22px", height: "22px" }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <h2 style={{ fontSize: "16px", fontWeight: 800, color: textPrimary, margin: 0 }}>
                      {isAr ? "ملخص وتفاصيل الطلب" : "Order Summary & Details"}
                    </h2>
                    <div style={{ fontSize: "12px", color: textSecondary, display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span>
                        {isAr ? "رقم الطلب:" : "Order #"}{" "}
                        <strong style={{ color: textPrimary }}>{order.order_number}</strong>
                      </span>
                      {order.created_at && (
                        <>
                          <span style={{ color: "rgba(255,255,255,0.12)" }}>•</span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <Clock style={{ width: "11px", height: "11px" }} />
                            {new Date(order.created_at).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Direct Rate Button in Top Header */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRating(5);
                    setReviewModalOpen(true);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 14px",
                    borderRadius: "10px",
                    backgroundColor:
                      reviewStatus === "already" || reviewStatus === "submitted"
                        ? "rgba(16, 185, 129, 0.12)"
                        : "rgba(255, 213, 79, 0.12)",
                    border: `1px solid ${
                      reviewStatus === "already" || reviewStatus === "submitted"
                        ? "rgba(16, 185, 129, 0.3)"
                        : "rgba(255, 213, 79, 0.3)"
                    }`,
                    color: reviewStatus === "already" || reviewStatus === "submitted" ? "#10b981" : "#ffd54f",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 800,
                    flexShrink: 0,
                    transition: "all 0.15s ease",
                  }}
                >
                  <Star size={13} fill={reviewStatus === "already" || reviewStatus === "submitted" ? "#10b981" : "#ffd54f"} />
                  <span>
                    {reviewStatus === "already" || reviewStatus === "submitted"
                      ? isAr
                        ? "تم التقييم ✓"
                        : "Reviewed ✓"
                      : isAr
                      ? "قيّم الطلب"
                      : "Rate Order"}
                  </span>
                </button>
              </div>

              {/* Order Items Breakdown & Total */}
              <div
                style={{
                  padding: "16px 22px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  fontSize: "13px",
                  color: textSecondary,
                }}
              >
                {items.map((it: any, i: number) => {
                  const itemQty = it.qty || it.quantity || 1;
                  return (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: textPrimary, fontWeight: 600 }}>
                        {it.name}{" "}
                        <strong style={{ color: textSecondary, fontWeight: 500 }}>× {itemQty}</strong>
                      </span>
                      <span style={{ color: textPrimary, fontWeight: 700 }} dir="ltr">
                        {format((it.price || 0) * itemQty)}
                      </span>
                    </div>
                  );
                })}

                {Number(order.discount_jod || 0) > 0 ? (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#10b981", fontWeight: 700 }}>
                    <span>{isAr ? "الخصم" : "Discount"}</span>
                    <span dir="ltr">-{format(Number(order.discount_jod))}</span>
                  </div>
                ) : null}

                {(() => {
                  const delData = parseDeliveryData(order?.delivery_data);
                  const rawPm = String(delData.payment_method || order?.payment_method || "").toLowerCase().trim();
                  const isBin = rawPm === "binance_pay" || rawPm === "binance" || Boolean(delData.binance_order_id || delData.binance_id);
                  const subTotal = Number(orderTotal || order?.total_jod || 0);
                  const calcFee = isBin ? Math.round(subTotal * 0.03 * 100) / 100 : 0;
                  const feeJod = Number(delData.fee_jod ?? calcFee);
                  const feeRate = delData.fee_rate || "3%";
                  if (feeJod <= 0) return null;
                  return (
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#38bdf8", fontWeight: 700 }}>
                      <span>{isAr ? `رسوم الخدمة (${feeRate})` : `Service Fee (${feeRate})`}</span>
                      <span dir="ltr">+{format(feeJod)}</span>
                    </div>
                  );
                })()}

                <div
                  style={{
                    borderTop: `1px solid rgba(255, 255, 255, 0.06)`,
                    paddingTop: "12px",
                    marginTop: "4px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontWeight: 800,
                    fontSize: "14px",
                  }}
                >
                  <span style={{ color: textPrimary }}>{isAr ? "الإجمالي الكلي:" : "Total Paid:"}</span>
                  <div style={{ textAlign: isAr ? "left" : "right" }}>
                    <span style={{ color: accentCyan, fontSize: "16px", fontWeight: 900 }} dir="ltr">
                      {(() => {
                        const delData = parseDeliveryData(order?.delivery_data);
                        const rawPm = String(delData.payment_method || order?.payment_method || "").toLowerCase().trim();
                        const isBin = rawPm === "binance_pay" || rawPm === "binance" || Boolean(delData.binance_order_id || delData.binance_id);
                        const subTotal = Number(orderTotal || order?.total_jod || 0);
                        const calcFee = isBin ? Math.round(subTotal * 0.03 * 100) / 100 : 0;
                        const feeJod = Number(delData.fee_jod ?? calcFee);
                        const totalWithFee = Number(delData.total_with_fee_jod ?? (subTotal + feeJod));
                        return format(totalWithFee);
                      })()}
                    </span>
                    {(() => {
                      const delData = parseDeliveryData(order?.delivery_data);
                      const rawPm = String(delData.payment_method || order?.payment_method || "").toLowerCase().trim();
                      const isBin = rawPm === "binance_pay" || rawPm === "binance" || Boolean(delData.binance_order_id || delData.binance_id);
                      const subTotal = Number(orderTotal || order?.total_jod || 0);
                      const calcFee = isBin ? Math.round(subTotal * 0.03 * 100) / 100 : 0;
                      const feeJod = Number(delData.fee_jod ?? calcFee);
                      const totalWithFee = Number(delData.total_with_fee_jod ?? (subTotal + feeJod));
                      const totalUsdt = delData.total_usdt ?? (isBin && totalWithFee > 0 ? (totalWithFee * 1.41).toFixed(2) : null);
                      if (!totalUsdt) return null;
                      return (
                        <div style={{ color: "#F0B90B", fontSize: "12px", fontWeight: 800 }} dir="ltr">
                          ({totalUsdt} USDT)
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* ── SECTION 2: YOUR ORDER ITEMS & KEYS ───────────── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", width: "100%", animation: "drfFadeUp 0.6s ease" }}>
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: 800,
                  color: textPrimary,
                  margin: 0,
                  letterSpacing: "-0.01em",
                }}
              >
                {isAr ? "المنتجات في طلبك ومفاتيح التفعيل" : "Your Products & Activation Keys"}
              </h2>

              {/* LIST OF INDEPENDENT CODE PRODUCTS */}
              {deliverableUnits.map((unit, unitIdx) => {
                const isKeyRevealed = isUnitRevealed(unitIdx);
                const isThisTopup = Boolean(unit.isTopup);
                const isThisAccount = Boolean(unit.isAccount);
                const itemCode = unit.code;
                const revealedDate = itemCode?.revealed_at;
                const isCodeCancelled = Boolean(
                  itemCode?.is_cancelled ||
                  itemCode?.status === "cancelled" ||
                  itemCode?.status === "refunded"
                );

                return (
                  <div
                    key={unitIdx}
                    style={{
                      borderRadius: "16px",
                      backgroundColor: cardBg,
                      border: `1px solid ${
                        isCodeCancelled
                          ? "rgba(244, 63, 94, 0.3)"
                          : isKeyRevealed
                          ? "rgba(16, 185, 129, 0.25)"
                          : cardBorder
                      }`,
                      overflow: "hidden",
                      width: "100%",
                      boxSizing: "border-box",
                      transition: "all 0.2s ease",
                      boxShadow: isKeyRevealed ? "0 4px 20px rgba(0, 0, 0, 0.3)" : "none",
                    }}
                  >
                    <div
                      className="drf-unit-card-inner"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "16px",
                        padding: "16px 20px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div className="drf-unit-info-left" style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0, flex: 1 }}>
                        <img
                          src={unit.coverImg}
                          alt={unit.unitLabel}
                          className="drf-gift-card-img"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.dataset.triedFallback) {
                              target.dataset.triedFallback = "1";
                              target.src = "/app/assets/img/gx-logo.png";
                            }
                          }}
                          style={{
                            width: "78px",
                            height: "54px",
                            borderRadius: "10px",
                            objectFit: "cover",
                            backgroundColor: "rgba(0, 0, 0, 0.4)",
                            border: `1px solid ${cardBorder}`,
                            flexShrink: 0,
                            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
                          }}
                        />

                        <div style={{ display: "flex", flexDirection: "column", gap: "7px", minWidth: 0 }}>
                          <h3
                            style={{
                              fontSize: "14.5px",
                              fontWeight: 800,
                              color: textPrimary,
                              margin: 0,
                              lineHeight: 1.45,
                            }}
                          >
                            {unit.unitLabel}
                          </h3>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                            {isCodeCancelled ? (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  padding: "2px 8px",
                                  borderRadius: "6px",
                                  backgroundColor: "rgba(244, 63, 94, 0.15)",
                                  border: "1px solid rgba(244, 63, 94, 0.35)",
                                  fontSize: "10.5px",
                                  fontWeight: 800,
                                  color: "#fb7185",
                                }}
                              >
                                <XCircle style={{ width: "11px", height: "11px" }} />
                                {isAr ? "كود ملغي / مسترجع" : "CANCELLED"}
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  padding: "2px 8px",
                                  borderRadius: "6px",
                                  backgroundColor: isThisTopup
                                    ? "rgba(16, 185, 129, 0.08)"
                                    : isThisAccount
                                    ? "rgba(168, 85, 247, 0.08)"
                                    : "rgba(0, 229, 255, 0.08)",
                                  border: `1px solid ${
                                    isThisTopup
                                      ? "rgba(16, 185, 129, 0.2)"
                                      : isThisAccount
                                      ? "rgba(168, 85, 247, 0.2)"
                                      : "rgba(0, 229, 255, 0.15)"
                                  }`,
                                  fontSize: "10.5px",
                                  fontWeight: 800,
                                  color: isThisTopup ? "#10b981" : isThisAccount ? "#c084fc" : accentCyan,
                                  textTransform: "uppercase",
                                }}
                              >
                                <Globe style={{ width: "10px", height: "10px" }} />
                                {isThisTopup ? (isAr ? "شحن مباشر" : "TOP-UP") : isThisAccount ? (isAr ? "حساب جاهز" : "ACCOUNT") : unit.regionBadge}
                              </span>
                            )}
                            {unit.platform && (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  padding: "2px 8px",
                                  borderRadius: "6px",
                                  backgroundColor: "rgba(255, 255, 255, 0.04)",
                                  border: `1px solid ${cardBorder}`,
                                  fontSize: "10.5px",
                                  fontWeight: 700,
                                  color: textSecondary,
                                }}
                              >
                                {detectPlatformIcon(unit.platform, unit.unitLabel)}
                                {unit.platform}
                              </span>
                            )}
                            {revealedDate && !isCodeCancelled && (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  padding: "2px 8px",
                                  borderRadius: "6px",
                                  backgroundColor: "rgba(16, 185, 129, 0.12)",
                                  border: "1px solid rgba(16, 185, 129, 0.3)",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  color: "#34d399",
                                }}
                              >
                                <CheckCircle2 style={{ width: "11px", height: "11px" }} />
                                <span>{isAr ? "تم الكشف:" : "Revealed:"} {new Date(revealedDate).toLocaleTimeString(isAr ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Action Section */}
                      <div className="drf-unit-actions-right" style={{ display: "flex", flexDirection: "column", alignItems: isAr ? "flex-start" : "flex-end", gap: "6px" }}>
                        {isCodeCancelled ? (
                          <div
                            className="drf-unit-cancelled-badge"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "7px",
                              padding: "10px 18px",
                              borderRadius: "10px",
                              backgroundColor: "rgba(244, 63, 94, 0.12)",
                              border: "1px solid rgba(244, 63, 94, 0.35)",
                              color: "#fb7185",
                              fontSize: "12.5px",
                              fontWeight: 800,
                            }}
                          >
                            <XCircle style={{ width: "15px", height: "15px", flexShrink: 0 }} />
                            <span>{isAr ? "تم إلغاء هذا الكود (مسترجع / Refunded)" : "Code Cancelled / Refunded"}</span>
                          </div>
                        ) : isThisTopup ? (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: isAr ? "flex-start" : "flex-end",
                              gap: "4px",
                            }}
                          >
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "8px 14px",
                                borderRadius: "10px",
                                backgroundColor: "rgba(16, 185, 129, 0.12)",
                                border: "1px solid rgba(16, 185, 129, 0.3)",
                                color: "#10b981",
                                fontSize: "12px",
                                fontWeight: 800,
                              }}
                            >
                              <CheckCircle2 style={{ width: "14px", height: "14px" }} />
                              <span>{isAr ? "تم الشحن على الحساب مباشرة" : "Topped Up Directly"}</span>
                            </div>
                            {(itemCode?.email || itemCode?.value) && (
                              <span
                                style={{
                                  fontSize: "11px",
                                  color: textSecondary,
                                  fontFamily: "monospace",
                                }}
                                dir="ltr"
                              >
                                {itemCode?.email || itemCode?.value}
                              </span>
                            )}
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="drf-unit-reveal-btn"
                              onClick={() => handleOpenReveal(unitIdx)}
                              style={{
                                background: isKeyRevealed
                                  ? isThisAccount
                                    ? "rgba(168, 85, 247, 0.15)"
                                    : "rgba(0, 229, 255, 0.12)"
                                  : isThisAccount
                                  ? "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)"
                                  : `linear-gradient(135deg, ${accentCyan}, #0098d4)`,
                                color: isKeyRevealed
                                  ? isThisAccount ? "#c084fc" : accentCyan
                                  : isThisAccount ? "#ffffff" : "#07090e",
                                border: isKeyRevealed
                                  ? `1px solid ${isThisAccount ? "rgba(168, 85, 247, 0.35)" : "rgba(0, 229, 255, 0.3)"}`
                                  : "none",
                                borderRadius: "10px",
                                padding: "10px 20px",
                                fontWeight: 900,
                                fontSize: "12.5px",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "7px",
                                boxShadow: isKeyRevealed
                                  ? "none"
                                  : isThisAccount
                                  ? "0 4px 14px rgba(168, 85, 247, 0.3)"
                                  : "0 4px 14px rgba(0, 229, 255, 0.25)",
                                transition: "all 0.15s ease",
                              }}
                            >
                              {isKeyRevealed ? (
                                <>
                                  <Check style={{ width: "14px", height: "14px" }} />
                                  <span>
                                    {isThisAccount
                                      ? isAr ? "عرض بيانات الحساب المستلم" : "View Account Details"
                                      : isAr ? "عرض الكود المستلم" : "View Key"}
                                  </span>
                                </>
                              ) : (
                                <>
                                  {isThisAccount ? (
                                    <UserIcon style={{ width: "14px", height: "14px" }} />
                                  ) : (
                                    <KeyRound style={{ width: "14px", height: "14px" }} />
                                  )}
                                  <span>
                                    {isThisAccount
                                      ? isAr ? "عرض تفاصيل الحساب" : "View Account Details"
                                      : isAr ? "إظهار الكود 🔑" : "Reveal Key 🔑"}
                                  </span>
                                </>
                              )}
                            </button>
                            {revealedDate && (
                              <span style={{ fontSize: "11px", color: "#34d399", fontWeight: 700 }}>
                                ✓ {isAr ? "تم الكشف:" : "Revealed:"} {new Date(revealedDate).toLocaleDateString(isAr ? "ar-EG" : "en-US", { month: "numeric", day: "numeric" })}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── SECTION 3: WHATSAPP SUPPORT HELP ─────────────── */}
            <div
              style={{
                borderRadius: "16px",
                backgroundColor: cardBg,
                border: `1px solid ${cardBorder}`,
                padding: "18px 22px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
                flexWrap: "wrap",
                animation: "drfFadeUp 0.7s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "12px",
                    backgroundColor: "rgba(37, 211, 102, 0.12)",
                    border: "1px solid rgba(37, 211, 102, 0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <WhatsAppSvg size={22} color="#25D366" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 800, color: textPrimary, margin: 0 }}>
                    {isAr ? "هل تحتاج إلى مساعدة أو لديك استفسار؟" : "Need help with your order?"}
                  </h3>
                  <p style={{ fontSize: "12px", color: textSecondary, margin: 0 }}>
                    {isAr
                      ? "فريق دعم متجر GX متواجد على الواتساب لمساعدتك في التفعيل فوراً."
                      : "GX Store team is ready to assist you on WhatsApp."}
                  </p>
                </div>
              </div>

              <a
                href={`https://wa.me/962776252313?text=${encodeURIComponent(
                  isAr
                    ? `مرحباً، أحتاج مساعدة بخصوص الطلب #${order.order_number}`
                    : `Hi GX Store, I need assistance with order #${order.order_number}`
                )}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "9px 18px",
                  borderRadius: "10px",
                  backgroundColor: "#25D366",
                  color: "#07090e",
                  fontWeight: 800,
                  fontSize: "12.5px",
                  textDecoration: "none",
                  boxShadow: "0 4px 14px rgba(37, 211, 102, 0.25)",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                }}
              >
                <WhatsAppSvg size={15} color="#07090e" />
                <span>{isAr ? "تواصل عبر الواتساب" : "Chat on WhatsApp"}</span>
              </a>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================
          REVEAL PRODUCT MODAL (With Explicit Image & Confirmation Step)
         ========================================================= */}
      {selectedItemIdx !== null && activeItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(14px)",
          }}
          onClick={handleCloseReveal}
        >
          <div
            style={{
              backgroundColor: "#13161f",
              border: `1px solid rgba(255, 255, 255, 0.1)`,
              borderRadius: "20px",
              maxWidth: "560px",
              width: "100%",
              maxHeight: "92vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 24px 64px rgba(0, 0, 0, 0.8), 0 0 32px rgba(0, 229, 255, 0.06)",
              boxSizing: "border-box",
              position: "relative",
              animation: "drfFadeScale 0.25s ease",
            }}
            onClick={(e) => e.stopPropagation()}
            dir={dir}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "18px 22px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                {isAccountItem ? (
                  <UserIcon style={{ width: "17px", height: "17px", color: "#c084fc" }} />
                ) : (
                  <KeyRound style={{ width: "17px", height: "17px", color: accentCyan }} />
                )}
                <h3 style={{ fontSize: "15px", fontWeight: 800, color: textPrimary, margin: 0 }}>
                  {isAccountItem
                    ? isAr ? "عرض وتفاصيل الحساب" : "Account Access & Details"
                    : isAr ? "تفاصيل واستلام كود التفعيل" : "Product Key Delivery Details"}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseReveal}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  border: `1px solid ${cardBorder}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: textSecondary,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <X style={{ width: "15px", height: "15px" }} />
              </button>
            </div>

            {/* Product Hero Box: Large Cover Image & Details */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", padding: "20px 22px 16px" }}>
              <img
                src={getProductCoverImage(activeItem.image, activeItem.name, activeItem.product_slug || activeItem.slug, dbImageMap)}
                alt={activeUnit?.unitLabel || activeItem.name}
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.dataset.triedFallback) {
                    target.dataset.triedFallback = "1";
                    target.src = "/app/assets/img/gx-logo.png";
                  }
                }}
                style={{
                  width: "80px",
                  height: "100px",
                  borderRadius: "12px",
                  objectFit: "cover",
                  backgroundColor: "rgba(0, 0, 0, 0.5)",
                  border: `1px solid ${isAccountItem ? "rgba(168, 85, 247, 0.3)" : "rgba(0, 229, 255, 0.2)"}`,
                  boxShadow: "0 6px 18px rgba(0, 0, 0, 0.5)",
                  flexShrink: 0,
                }}
              />

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                  <h4
                    style={{
                      fontSize: "15px",
                      fontWeight: 800,
                      color: textPrimary,
                      margin: 0,
                      lineHeight: 1.4,
                    }}
                  >
                    {activeUnit?.unitLabel || activeItem.name}
                  </h4>
                  {activeItem.slug && (
                    <Link
                      to={`/product/${activeItem.slug}` as never}
                      target="_blank"
                      style={{ color: textSecondary, textDecoration: "none", flexShrink: 0, transition: "color 0.15s ease" }}
                    >
                      <ExternalLink style={{ width: "15px", height: "15px" }} />
                    </Link>
                  )}
                </div>

                {/* Badges */}
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "3px 10px",
                      borderRadius: "6px",
                      backgroundColor: isAccountItem ? "rgba(168, 85, 247, 0.12)" : "rgba(0, 229, 255, 0.1)",
                      border: `1px solid ${isAccountItem ? "rgba(168, 85, 247, 0.3)" : "rgba(0, 229, 255, 0.2)"}`,
                      color: isAccountItem ? "#c084fc" : accentCyan,
                      fontSize: "10.5px",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                    }}
                  >
                    {isAccountItem ? (isAr ? "حساب جاهز" : "ACCOUNT") : (isAr ? "كود رقمي" : "DIGITAL KEY")}
                  </span>

                  {activeItem.platform && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "3px 10px",
                        borderRadius: "6px",
                        backgroundColor: "rgba(255, 255, 255, 0.04)",
                        border: `1px solid ${cardBorder}`,
                        fontSize: "10.5px",
                        color: textSecondary,
                      }}
                    >
                      {detectPlatformIcon(activeItem.platform, activeItem.name)}
                      <span>{isAr ? "المنصة:" : "Platform:"}</span>
                      <strong style={{ color: textPrimary }}>{activeItem.platform}</strong>
                    </span>
                  )}

                  {!isTopupItem && activeModalRegion && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "3px 10px",
                        borderRadius: "6px",
                        backgroundColor: "rgba(255, 255, 255, 0.04)",
                        border: `1px solid ${cardBorder}`,
                        fontSize: "10.5px",
                        color: textSecondary,
                      }}
                    >
                      <Globe style={{ width: "11px", height: "11px", color: isAccountItem ? "#c084fc" : accentCyan }} />
                      <span>{isAr ? "المنطقة:" : "Region:"}</span>
                      <strong style={{ color: textPrimary }}>{activeModalRegion}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── STEP 1: CONFIRMATION STEP (BEFORE KEY / ACCOUNT REVEAL) ──── */}
            {!isUnitRevealed(selectedItemIdx) ? (
              <div style={{ padding: "0 22px 22px", display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* Security Warning Notice */}
                <div
                  style={{
                    borderRadius: "12px",
                    background: isAccountItem ? "rgba(168, 85, 247, 0.08)" : "rgba(255, 171, 0, 0.08)",
                    border: `1px solid ${isAccountItem ? "rgba(168, 85, 247, 0.25)" : "rgba(255, 171, 0, 0.25)"}`,
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                  }}
                >
                  <AlertTriangle size={18} color={isAccountItem ? "#c084fc" : "#ffab00"} style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <strong style={{ fontSize: "13px", color: isAccountItem ? "#c084fc" : "#ffab00" }}>
                      {isAccountItem
                        ? isAr ? "تأكيد كشف بيانات الحساب" : "Confirm Account Credentials Reveal"
                        : isAr ? "تأكيد كشف كود التفعيل" : "Confirm Key Reveal"}
                    </strong>
                    <span style={{ fontSize: "12px", color: "#c5d1de", lineHeight: 1.5 }}>
                      {isAccountItem
                        ? isAr
                          ? "بمجرد تأكيد كشف بيانات الحساب، تعتبر بيانات الدخول (الإيميل وكلمة السر) مكشوفة ومستلمة بالكامل. لا يمكن استرجاع أو إلغاء الحساب الرقمي بعد الكشف."
                          : "Once confirmed, the account credentials are fully revealed and considered delivered. Digital accounts cannot be refunded or cancelled once revealed."
                        : isAr
                          ? `هذا المفتاح مخصص لمنطقة: ${activeModalRegion}. بمجرد تأكيد كشف الكود الرقمي، يعتبر المنتج مستلماً ومكشوفاً بنجاح ولا يمكن استرجاعه أو استبداله.`
                          : `This key is for region: ${activeModalRegion}. Once revealed, the item is considered delivered and cannot be refunded or replaced.`}
                    </span>
                  </div>
                </div>

                {/* Masked Key Display Preview */}
                <div
                  style={{
                    borderRadius: "12px",
                    background: "rgba(0, 0, 0, 0.4)",
                    border: `1px dashed ${isAccountItem ? "rgba(168, 85, 247, 0.3)" : "rgba(0, 229, 255, 0.25)"}`,
                    padding: "16px 18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Lock size={16} color={isAccountItem ? "#c084fc" : "#00e5ff"} />
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: "15px",
                        letterSpacing: "4px",
                        color: "#5a6a7e",
                        userSelect: "none",
                      }}
                    >
                      {isAccountItem ? "•••••••••• : ••••••••" : "•••• - •••• - •••• - ••••"}
                    </span>
                  </div>
                  <span style={{ fontSize: "11px", color: textMuted }}>
                    {isAr ? "محمي ومقفل حتى التأكيد" : "Locked until confirmed"}
                  </span>
                </div>

                {/* Mandatory Checkbox Agreement */}
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "11px",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    backgroundColor: agreeChecked
                      ? isAccountItem ? "rgba(168, 85, 247, 0.08)" : "rgba(0, 229, 255, 0.08)"
                      : "rgba(255, 255, 255, 0.03)",
                    border: `1px solid ${
                      agreeChecked
                        ? isAccountItem ? "rgba(168, 85, 247, 0.4)" : "rgba(0, 229, 255, 0.4)"
                        : "rgba(255, 255, 255, 0.1)"
                    }`,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    userSelect: "none",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={agreeChecked}
                    onChange={(e) => setAgreeChecked(e.target.checked)}
                    style={{
                      width: "18px",
                      height: "18px",
                      marginTop: "2px",
                      accentColor: isAccountItem ? "#a855f7" : accentCyan,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: "12px",
                      color: agreeChecked ? "#ffffff" : "#a2b4c7",
                      lineHeight: 1.5,
                      fontWeight: agreeChecked ? 700 : 500,
                    }}
                  >
                    {isAccountItem
                      ? isAr
                        ? "أقر بأنني قمت بقراءة التعليمات وأوافق على كشف بيانات الحساب، وأعلم أنه لا يمكن الإلغاء أو الاسترجاع بعد الكشف."
                        : "I confirm that I have read the instructions and agree to reveal the account credentials. I acknowledge that digital accounts cannot be refunded or cancelled once revealed."
                      : isAr
                        ? "أقر بأنني تأكدت من توافق جهازي وحسابي مع المنطقة المحددة، وأوافق على كشف الكود الرقمي (لا يمكن الاسترجاع بعد الكشف)."
                        : "I confirm that I verified device & region compatibility and agree to reveal the digital key (non-refundable once revealed)."}
                  </span>
                </label>

                {/* Primary Confirm & Reveal Action Button */}
                <button
                  type="button"
                  disabled={!agreeChecked}
                  onClick={() => handleConfirmReveal(selectedItemIdx)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    padding: "14px 24px",
                    borderRadius: "12px",
                    background: agreeChecked
                      ? isAccountItem
                        ? "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)"
                        : "linear-gradient(135deg, #00e5ff 0%, #0098d4 100%)"
                      : "rgba(255, 255, 255, 0.08)",
                    color: agreeChecked ? (isAccountItem ? "#ffffff" : "#07090e") : "rgba(255, 255, 255, 0.3)",
                    fontWeight: 900,
                    fontSize: "14px",
                    border: agreeChecked ? "none" : "1px solid rgba(255, 255, 255, 0.1)",
                    cursor: agreeChecked ? "pointer" : "not-allowed",
                    boxShadow: agreeChecked
                      ? isAccountItem
                        ? "0 4px 20px rgba(168, 85, 247, 0.35)"
                        : "0 4px 20px rgba(0, 229, 255, 0.3)"
                      : "none",
                    transition: "all 0.15s ease",
                    opacity: agreeChecked ? 1 : 0.6,
                  }}
                >
                  <Unlock size={17} />
                  <span>
                    {isAccountItem
                      ? isAr ? "عرض تفاصيل الحساب" : "View Account Details"
                      : isAr ? "تأكيد وكشف كود التفعيل" : "Confirm & Reveal Product Key"}
                  </span>
                </button>
              </div>
            ) : (
              /* ── STEP 2: REVEALED CODE BOX & ACTIONS ──────────── */
              <div style={{ padding: "0 22px 22px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div
                    style={{
                      fontSize: "12.5px",
                      fontWeight: 800,
                      color: textSecondary,
                      letterSpacing: "0.02em",
                      textTransform: "uppercase",
                    }}
                  >
                    {isAr ? "كود التفعيل ومفتاح المنتج:" : "Digital product key:"}
                  </div>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      fontSize: "11px",
                      fontWeight: 800,
                      color: "#10b981",
                      backgroundColor: "rgba(16, 185, 129, 0.1)",
                      padding: "3px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    <Check size={12} />
                    <span>{isAr ? "تم الكشف بنجاح" : "Revealed"}</span>
                  </div>
                </div>

                {/* Monospace Code Box */}
                {activeCode && (activeCode.value || activeCode.extra || activeCode.password) ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {/* Key string if present (for keys or accounts with single token/credentials string) */}
                    {(activeCode.value || (!isAccountItem && activeCode.extra)) && (!isAccountItem || (!activeCode.email && !activeCode.password)) && (
                      <div
                        style={{
                          borderRadius: "12px",
                          background: "rgba(0, 0, 0, 0.45)",
                          border: `1px solid ${isAccountItem ? "rgba(168, 85, 247, 0.3)" : "rgba(0, 229, 255, 0.25)"}`,
                          padding: "16px 18px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "12px",
                          animation: "drfGlow 3s ease infinite",
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
                            fontSize: "15px",
                            fontWeight: 700,
                            color: isAccountItem ? "#c084fc" : accentCyan,
                            wordBreak: "break-all",
                            userSelect: "all",
                            letterSpacing: "0.5px",
                            lineHeight: 1.5,
                          }}
                          dir="ltr"
                        >
                          {activeCode.value || activeCode.extra}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            onCopyKey(
                              activeCode.value || activeCode.extra || "",
                              `modal-code-${selectedItemIdx}`
                            )
                          }
                          style={{
                            padding: "8px",
                            borderRadius: "8px",
                            backgroundColor:
                              copiedKey === `modal-code-${selectedItemIdx}`
                                ? "rgba(16, 185, 129, 0.15)"
                                : "rgba(255, 255, 255, 0.06)",
                            border: `1px solid ${
                              copiedKey === `modal-code-${selectedItemIdx}`
                                ? "rgba(16, 185, 129, 0.3)"
                                : cardBorder
                            }`,
                            color: copiedKey === `modal-code-${selectedItemIdx}` ? "#10b981" : textSecondary,
                            cursor: "pointer",
                            flexShrink: 0,
                            transition: "all 0.15s ease",
                          }}
                          title={isAr ? "نسخ" : "Copy"}
                        >
                          {copiedKey === `modal-code-${selectedItemIdx}` ? (
                            <Check style={{ width: "16px", height: "16px" }} />
                          ) : (
                            <Copy style={{ width: "16px", height: "16px" }} />
                          )}
                        </button>
                      </div>
                    )}

                    {/* Account Credentials */}
                    {isAccountItem && (activeCode.email || activeCode.password) && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }} dir="ltr">
                        {activeCode.email && (
                          <div
                            style={{
                              borderRadius: "10px",
                              background: "rgba(0, 0, 0, 0.3)",
                              border: `1px solid ${cardBorder}`,
                              padding: "12px 14px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <div style={{ minWidth: 0, paddingRight: "8px" }}>
                              <div style={{ fontSize: "10px", color: textSecondary, fontWeight: 800, marginBottom: "2px" }}>EMAIL</div>
                              <div style={{ fontFamily: "monospace", fontSize: "12px", color: textPrimary, overflow: "hidden", textOverflow: "ellipsis" }}>
                                {activeCode.email}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onCopyKey(activeCode.email!, `modal-email-${selectedItemIdx}`)}
                              style={{ background: "none", border: "none", color: accentCyan, cursor: "pointer", padding: "4px" }}
                            >
                              <Copy style={{ width: "14px", height: "14px" }} />
                            </button>
                          </div>
                        )}

                        {activeCode.password && (
                          <div
                            style={{
                              borderRadius: "10px",
                              background: "rgba(0, 0, 0, 0.3)",
                              border: `1px solid ${cardBorder}`,
                              padding: "12px 14px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <div style={{ minWidth: 0, paddingRight: "8px" }}>
                              <div style={{ fontSize: "10px", color: textSecondary, fontWeight: 800, marginBottom: "2px" }}>PASSWORD</div>
                              <div style={{ fontFamily: "monospace", fontSize: "12px", color: textPrimary, overflow: "hidden", textOverflow: "ellipsis" }}>
                                {activeCode.password}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onCopyKey(activeCode.password!, `modal-pass-${selectedItemIdx}`)}
                              style={{ background: "none", border: "none", color: accentCyan, cursor: "pointer", padding: "4px" }}
                            >
                              <Copy style={{ width: "14px", height: "14px" }} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Extra Credentials / Recovery Email / Backup Code / Custom Fields / Notes */}
                    {activeCode && (activeCode.backup_email || activeCode.backup_code || (activeCode.extra_fields && activeCode.extra_fields.length > 0) || activeCode.notes) && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "2px" }}>
                        {activeCode.backup_email && (
                          <div
                            style={{
                              borderRadius: "10px",
                              background: "rgba(0, 0, 0, 0.3)",
                              border: `1px solid ${cardBorder}`,
                              padding: "10px 14px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "8px",
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: "10px", color: "#38bdf8", fontWeight: 800 }}>
                                {isAr ? "📧 الإيميل الاحتياطي (Recovery Email)" : "RECOVERY EMAIL"}
                              </div>
                              <div style={{ fontFamily: "monospace", fontSize: "12px", color: textPrimary, wordBreak: "break-all" }} dir="ltr">
                                {activeCode.backup_email}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onCopyKey(activeCode.backup_email!, `modal-rec-${selectedItemIdx}`)}
                              style={{ background: "none", border: "none", color: accentCyan, cursor: "pointer", padding: "4px" }}
                              title={isAr ? "نسخ" : "Copy"}
                            >
                              <Copy style={{ width: "14px", height: "14px" }} />
                            </button>
                          </div>
                        )}

                        {activeCode.backup_code && (
                          <div
                            style={{
                              borderRadius: "10px",
                              background: "rgba(0, 0, 0, 0.3)",
                              border: `1px solid ${cardBorder}`,
                              padding: "10px 14px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "8px",
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: "10px", color: "#fbbf24", fontWeight: 800 }}>
                                {isAr ? "🔒 رمز الأمان / 2FA / Backup Code" : "SECURITY CODE / PIN"}
                              </div>
                              <div style={{ fontFamily: "monospace", fontSize: "12px", color: textPrimary, wordBreak: "break-all" }} dir="ltr">
                                {activeCode.backup_code}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onCopyKey(activeCode.backup_code!, `modal-pin-${selectedItemIdx}`)}
                              style={{ background: "none", border: "none", color: accentCyan, cursor: "pointer", padding: "4px" }}
                              title={isAr ? "نسخ" : "Copy"}
                            >
                              <Copy style={{ width: "14px", height: "14px" }} />
                            </button>
                          </div>
                        )}

                        {Array.isArray(activeCode.extra_fields) &&
                          activeCode.extra_fields.map((f, fIdx) => (
                            <div
                              key={fIdx}
                              style={{
                                borderRadius: "10px",
                                background: "rgba(0, 0, 0, 0.3)",
                                border: `1px solid ${cardBorder}`,
                                padding: "10px 14px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "8px",
                              }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: "10px", color: textSecondary, fontWeight: 800 }}>{f.label}</div>
                                <div style={{ fontFamily: "monospace", fontSize: "12px", color: textPrimary, wordBreak: "break-all" }} dir="ltr">
                                  {f.value}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => onCopyKey(f.value, `modal-fld-${selectedItemIdx}-${fIdx}`)}
                                style={{ background: "none", border: "none", color: accentCyan, cursor: "pointer", padding: "4px" }}
                                title={isAr ? "نسخ" : "Copy"}
                              >
                                <Copy style={{ width: "14px", height: "14px" }} />
                              </button>
                            </div>
                          ))}

                        {activeCode.notes && (
                          <div
                            style={{
                              borderRadius: "10px",
                              background: "rgba(0, 229, 255, 0.05)",
                              border: "1px solid rgba(0, 229, 255, 0.2)",
                              padding: "10px 14px",
                              fontSize: "12px",
                              color: "#e2e8f0",
                              lineHeight: 1.5,
                            }}
                          >
                            <div style={{ fontSize: "10.5px", color: accentCyan, fontWeight: 800, marginBottom: "3px" }}>
                              {isAr ? "📌 تعليمات وملاحظات إضافية لهذا المنتج:" : "Additional instructions:"}
                            </div>
                            <div style={{ whiteSpace: "pre-wrap" }}>{activeCode.notes}</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* All Sibling Codes for Multi-Quantity Product */}
                    {activeUnit && activeUnit.totalUnitsInItem > 1 && (
                      <div
                        style={{
                          borderRadius: "12px",
                          background: "rgba(0, 0, 0, 0.35)",
                          border: "1px solid rgba(0, 229, 255, 0.2)",
                          padding: "14px 16px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                          marginTop: "6px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: "12px", fontWeight: 800, color: textPrimary }}>
                            {isAr
                              ? `جميع أكواد هذا المنتج في طلبك (${activeUnit.totalUnitsInItem} أكواد):`
                              : `All keys for this product (${activeUnit.totalUnitsInItem} keys):`}
                          </span>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {activeUnit.siblingUnits.map((sib) => {
                            const isSibRevealed = Boolean(sib.unitIndex === selectedItemIdx || sib.code?.revealed_at || revealedKeys[sib.unitIndex]);
                            const isSibCurrent = sib.unitIndex === selectedItemIdx;
                            const rawCodeVal = sib.code?.value || sib.code?.extra || sib.code?.password || "";
                            const sibCodeVal = isSibRevealed ? rawCodeVal : "•••• - •••• - •••• - ••••";
                            const sibKeyId = `sib-code-${sib.unitIndex}`;

                            return (
                              <div
                                key={sib.unitIndex}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: "10px",
                                  padding: "9px 12px",
                                  borderRadius: "8px",
                                  backgroundColor: isSibCurrent
                                    ? "rgba(0, 229, 255, 0.08)"
                                    : "rgba(255, 255, 255, 0.03)",
                                  border: isSibCurrent
                                    ? "1px solid rgba(0, 229, 255, 0.35)"
                                    : "1px solid rgba(255, 255, 255, 0.06)",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
                                  <span
                                    style={{
                                      fontSize: "10.5px",
                                      fontWeight: 800,
                                      padding: "2px 6px",
                                      borderRadius: "4px",
                                      backgroundColor: isSibCurrent ? "rgba(0, 229, 255, 0.18)" : "rgba(255, 255, 255, 0.06)",
                                      color: isSibCurrent ? accentCyan : textSecondary,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {isAr ? `كود ${sib.unitInItem}` : `Key ${sib.unitInItem}`}
                                  </span>
                                  <span
                                    style={{
                                      fontFamily: "'Fira Code', 'Cascadia Code', monospace",
                                      fontSize: "13px",
                                      fontWeight: 700,
                                      color: isSibRevealed && sibCodeVal ? (isSibCurrent ? accentCyan : textPrimary) : textMuted,
                                      direction: "ltr",
                                      unicodeBidi: "isolate",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {isSibRevealed ? (sibCodeVal || (isAr ? "قيد التجهيز..." : "Pending...")) : (isAr ? "🔒 محمي حتى الكشف" : "🔒 Locked until reveal")}
                                  </span>
                                </div>

                                {isSibRevealed && rawCodeVal ? (
                                  <button
                                    type="button"
                                    onClick={() => onCopyKey(rawCodeVal, sibKeyId)}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "5px",
                                      padding: "5px 11px",
                                      borderRadius: "6px",
                                      backgroundColor:
                                        copiedKey === sibKeyId
                                          ? "rgba(16, 185, 129, 0.2)"
                                          : "rgba(255, 255, 255, 0.08)",
                                      border: `1px solid ${
                                        copiedKey === sibKeyId ? "rgba(16, 185, 129, 0.4)" : cardBorder
                                      }`,
                                      color: copiedKey === sibKeyId ? "#10b981" : textPrimary,
                                      cursor: "pointer",
                                      fontSize: "11px",
                                      fontWeight: 700,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {copiedKey === sibKeyId ? (
                                      <>
                                        <Check style={{ width: "12px", height: "12px" }} />
                                        <span>{isAr ? "تم!" : "Copied"}</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy style={{ width: "12px", height: "12px" }} />
                                        <span>{isAr ? "نسخ" : "Copy"}</span>
                                      </>
                                    )}
                                  </button>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Account Extra Notes & Instructions */}
                    {isAccountItem && (activeCode.extra || (activeCode.value && (activeCode.email || activeCode.password))) && (
                      <div
                        style={{
                          borderRadius: "10px",
                          background: "rgba(0, 0, 0, 0.3)",
                          border: `1px solid ${cardBorder}`,
                          padding: "12px 14px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                        }}
                      >
                        <div style={{ fontSize: "10.5px", color: textSecondary, fontWeight: 800 }}>
                          {isAr ? "معلومات وتعليمات إضافية للحساب:" : "ADDITIONAL ACCOUNT DETAILS:"}
                        </div>
                        <div style={{ fontSize: "12px", color: textPrimary, whiteSpace: "pre-wrap", lineHeight: 1.55 }} dir="auto">
                          {activeCode.extra || activeCode.value}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Code Pending Support Assignment */
                  <div
                    style={{
                      borderRadius: "12px",
                      background: "rgba(0, 229, 255, 0.05)",
                      border: "1px solid rgba(0, 229, 255, 0.2)",
                      padding: "18px",
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "13px",
                      color: textSecondary,
                    }}
                  >
                    <Clock size={22} color="#00e5ff" />
                    <span style={{ color: textPrimary, fontWeight: 700 }}>
                      {isAr
                        ? "المفتاح الرقمي قيد التجهيز من قبل فريق الدعم."
                        : "Digital key is being prepared by support team."}
                    </span>
                    <span style={{ fontSize: "12px", color: textMuted }}>
                      {isAr
                        ? "سيتم تحديث وإظهار المفتاح هنا تلقائياً، أو يمكنك مراسلتنا فوراً."
                        : "It will be updated here automatically or you can reach out via WhatsApp."}
                    </span>
                  </div>
                )}

                {/* Action Buttons Row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    flexWrap: "wrap",
                    paddingTop: "6px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      onCopyKey(
                        activeCode?.value || activeCode?.extra || activeCode?.password || "",
                        `btn-copy-${selectedItemIdx}`
                      )
                    }
                    disabled={!activeCode?.value && !activeCode?.extra && !activeCode?.password}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "7px",
                      padding: "10px 20px",
                      borderRadius: "10px",
                      background: `linear-gradient(135deg, ${accentCyan}, #0098d4)`,
                      color: "#07090e",
                      fontWeight: 900,
                      fontSize: "12.5px",
                      border: "none",
                      cursor:
                        !activeCode?.value && !activeCode?.extra && !activeCode?.password
                          ? "not-allowed"
                          : "pointer",
                      opacity:
                        !activeCode?.value && !activeCode?.extra && !activeCode?.password ? 0.4 : 1,
                      boxShadow: "0 3px 12px rgba(0, 229, 255, 0.2)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {copiedKey === `btn-copy-${selectedItemIdx}` ? (
                      <>
                        <Check style={{ width: "14px", height: "14px" }} />
                        <span>{isAr ? "تم النسخ!" : "Copied!"}</span>
                      </>
                    ) : (
                      <>
                        <Copy style={{ width: "14px", height: "14px" }} />
                        <span>{isAr ? "نسخ الكود" : "Copy to clipboard"}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowGuide(!showGuide)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "10px 16px",
                      borderRadius: "10px",
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      color: textPrimary,
                      fontWeight: 700,
                      fontSize: "12.5px",
                      border: `1px solid ${cardBorder}`,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <HelpCircle style={{ width: "14px", height: "14px", color: textSecondary }} />
                    <span>{isAr ? "دليل التفعيل" : "Activation Guide"}</span>
                  </button>
                </div>

                {/* Expanded Activation Guide */}
                {showGuide && (() => {
                  const itemGuide = resolveProductActivationGuide(
                    {
                      name: activeItem?.name,
                      slug: (activeItem as any)?.slug || (activeItem as any)?.product_slug,
                      platform: (activeItem as any)?.platform,
                    },
                    isAr ? "ar" : "en"
                  );

                  return (
                    <div
                      style={{
                        borderRadius: "12px",
                        background: "rgba(0, 0, 0, 0.35)",
                        border: "1px solid rgba(0, 229, 255, 0.2)",
                        padding: "16px 18px",
                        fontSize: "12px",
                        color: textSecondary,
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        lineHeight: 1.7,
                        animation: "drfFadeUp 0.25s ease",
                        marginTop: "6px",
                      }}
                    >
                      <div style={{ fontWeight: 800, color: accentCyan, display: "flex", alignItems: "center", gap: "6px" }}>
                        <Sparkles style={{ width: "14px", height: "14px" }} />
                        <span>{itemGuide.title}</span>
                      </div>
                      <ol style={{ margin: 0, paddingLeft: isAr ? "0" : "18px", paddingRight: isAr ? "18px" : "0", display: "flex", flexDirection: "column", gap: "6px" }}>
                        {itemGuide.steps.map((step, sIdx) => (
                          <li key={sIdx} style={{ color: textPrimary }}>{step}</li>
                        ))}
                      </ol>
                      {itemGuide.directUrl && (
                        <div style={{ marginTop: "6px", paddingTop: "8px", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                          <a
                            href={itemGuide.directUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              color: accentCyan,
                              textDecoration: "underline",
                              fontWeight: 700,
                              fontSize: "11.5px",
                            }}
                          >
                            <ExternalLink style={{ width: "12px", height: "12px" }} />
                            <span>{isAr ? "فتح صفحة التفعيل المباشرة 🔗" : "Open direct redemption link 🔗"}</span>
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Modal Footer - WhatsApp Support */}
            <div
              style={{
                borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                padding: "14px 22px",
                fontSize: "12px",
                color: textSecondary,
                lineHeight: 1.6,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                flexWrap: "wrap",
              }}
            >
              <span>{isAr ? "تواجه مشكلة في الكود؟" : "Facing issues with the key?"}</span>
              <a
                href={`https://wa.me/962776252313?text=${encodeURIComponent(
                  isAr
                    ? `مرحباً، أواجه مشكلة في كود الطلب #${order.order_number}`
                    : `Hi GX Store, I have an issue with key for order #${order.order_number}`
                )}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  color: "#25D366",
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                <WhatsAppSvg size={14} color="#25D366" />
                <span>{isAr ? "مراسلة الدعم الفني هنا" : "Chat with support on WhatsApp"}</span>
              </a>
              <span>{isAr ? "وسيقوم فريقنا بمساعدتك فوراً." : ""}</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          REVIEW ORDER MODAL POPUP
         ========================================================= */}
      <ReviewOrderModal
        order={order}
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        isAr={isAr}
        initialRating={selectedRating}
        onSubmitted={() => setReviewStatus("submitted")}
      />
    </div>
  );
}
