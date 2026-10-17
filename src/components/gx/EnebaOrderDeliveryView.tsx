import React, { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useLang } from "@/lib/gx/i18n";
import { toast } from "sonner";
import { sanitizeImageForEmail } from "@/lib/gx/order-email.functions";
import {
  CheckCircle2,
  XCircle,
  Clock,
  KeyRound,
  Copy,
  Check,
  Eye,
  ShoppingBag,
  AlertTriangle,
  Lock,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  ExternalLink,
  Printer,
  Gift,
  Globe,
  ShieldCheck,
  X,
  Share2,
  Sparkles,
} from "lucide-react";

// Platform Logos / SVGs
function AppleSvg({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 170 170" fill="currentColor" className={className}>
      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.6-7.85-11.75-14.43-5.26-8.36-9.4-17.61-12.43-27.75-3.03-10.14-4.55-20.06-4.55-29.77 0-14.35 3.82-26.17 11.45-35.46 7.63-9.29 17.1-13.99 28.4-14.1 4.58 0 9.8 1.25 15.66 3.76 5.86 2.5 9.4 3.8 10.63 3.89 1.48-.15 5.16-1.46 11.03-3.95 5.87-2.48 10.87-3.66 15-3.53 11.22.64 20.31 4.7 27.27 12.18-9.8 5.87-14.6 14.13-14.4 24.77.22 8.37 3.42 15.34 9.61 20.9 6.19 5.57 13.51 8.84 21.96 9.8-2.39 7.07-5.33 14.15-8.81 21.24zM119.22 33.72c0-7.39 2.66-14.18 7.97-20.37 5.31-6.19 11.89-9.84 19.74-10.95.22 1.08.33 2.17.33 3.26 0 7.39-2.77 14.24-8.31 20.54-5.54 6.3-12.27 9.89-20.19 10.76-.22-1.08-.34-2.16-.34-3.24z" />
    </svg>
  );
}

function SteamSvg({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.005.105.005.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 12-5.373 12-12S18.605 0 11.979 0z" />
    </svg>
  );
}

function PlayStationSvg({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M8.077 14.288c.176.463.313.93.407 1.396.697 1.233 2.006 1.83 3.639 1.289 1.487-.492 2.112-1.579 2.112-2.716 0-1.849-1.396-2.614-3.56-3.447l-1.611-.607c-2.483-.933-4.095-2.023-4.095-4.664 0-3.084 2.222-4.814 5.922-4.536 2.378.18 4.295 1.056 5.545 2.464l-2.062 2.274c-.958-1.025-2.225-1.62-3.593-1.748-1.428-.135-2.618.397-2.618 1.547 0 1.396 1.066 1.942 3.036 2.684l1.631.619c2.895 1.1 4.75 2.302 4.75 5.253 0 3.528-2.782 5.344-6.85 5.589-3.264.195-5.753-.948-7.078-2.923l2.42-2.479z" />
    </svg>
  );
}

function XboxSvg({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-1.84 3.738c.67-.14 1.268-.14 1.84 0 1.246.304 2.41 1.082 3.425 2.29-1.285 1.01-2.906 1.742-4.633 1.996-1.727-.254-3.348-.986-4.633-1.996 1.015-1.208 2.179-1.986 3.425-2.29h1.999-.418zm-4.78 4.416c1.17 1.01 2.585 1.764 4.148 2.112-2.128 1.488-4.49 1.91-6.19 1.137-.775-.353-1.39-.93-1.758-1.688 1.02-1.077 2.306-1.884 3.8-1.56zm13.24 1.56c-.368.758-.983 1.335-1.758 1.688-1.7.773-4.062.35-6.19-1.137 1.563-.348 2.978-1.102 4.148-2.112 1.494-.324 2.78.483 3.8 1.56z" />
    </svg>
  );
}

function WhatsAppSvg({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

function detectPlatformIcon(platform?: string, name?: string) {
  const p = (platform || "").toLowerCase();
  const n = (name || "").toLowerCase();

  if (p.includes("apple") || n.includes("apple") || p.includes("itunes") || n.includes("itunes")) {
    return <AppleSvg className="w-5 h-5 text-white" />;
  }
  if (p.includes("steam") || n.includes("steam")) {
    return <SteamSvg className="w-5 h-5 text-cyan-400" />;
  }
  if (p.includes("playstation") || n.includes("playstation") || p.includes("psn") || n.includes("psn") || n.includes("سوني")) {
    return <PlayStationSvg className="w-5 h-5 text-blue-400" />;
  }
  if (p.includes("xbox") || n.includes("xbox") || n.includes("اكس بوكس")) {
    return <XboxSvg className="w-5 h-5 text-emerald-400" />;
  }
  return <KeyRound className="w-5 h-5 text-cyan-400" />;
}

export type DeliveryCode = {
  kind?: "code" | "account" | "topup";
  label?: string;
  value?: string;
  email?: string;
  password?: string;
  region?: string;
  extra?: string;
};

export interface EnebaOrderDeliveryViewProps {
  order: any;
  loading: boolean;
  error: string | null;
  isLocked?: boolean;
  orderToken?: string;
  revealedKeys: Record<number, boolean>;
  copiedKey: string | null;
  onRevealKey: (index: number) => void;
  onCopyKey: (text: string, id: string) => void;
}

export function EnebaOrderDeliveryView({
  order,
  loading,
  error,
  isLocked = false,
  orderToken,
  revealedKeys,
  copiedKey,
  onRevealKey,
  onCopyKey,
}: EnebaOrderDeliveryViewProps) {
  const { lang, dir } = useLang();
  const isAr = lang === "ar";

  const [showOrderInvoice, setShowOrderInvoice] = useState(false);
  const [activeGuideModal, setActiveGuideModal] = useState<{ platform: string; name: string } | null>(null);
  const [activeRegionModal, setActiveRegionModal] = useState<string | null>(null);
  const [activeGiftModal, setActiveGiftModal] = useState<{ code: string; title: string; platform: string; region: string } | null>(null);
  const [giftRecipient, setGiftRecipient] = useState("");
  const [giftNote, setGiftNote] = useState("");
  const [showProblemModal, setShowProblemModal] = useState(false);

  const deliveryCodes: DeliveryCode[] = useMemo(() => {
    if (!order?.delivery_data || typeof order.delivery_data !== "object") return [];
    const codes = (order.delivery_data as any).codes;
    return Array.isArray(codes) ? codes : [];
  }, [order]);

  const items = useMemo(() => {
    return Array.isArray(order?.items) ? order.items : [];
  }, [order]);

  const statusInfo = useMemo(() => {
    const s = order?.status || "pending";
    if (s === "delivered") {
      return {
        labelAr: "مُسلَّم ومكتمل 100%",
        labelEn: "Delivered & Ready",
        badgeBg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
      };
    }
    if (s === "cancelled") {
      return {
        labelAr: "تم إلغاء الطلب",
        labelEn: "Cancelled",
        badgeBg: "bg-rose-500/15 text-rose-400 border-rose-500/30",
        icon: <XCircle className="w-4 h-4 text-rose-400" />,
      };
    }
    return {
      labelAr: "قيد التجهيز والتسليم",
      labelEn: "Processing",
      badgeBg: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      icon: <Clock className="w-4 h-4 text-amber-400" />,
    };
  }, [order?.status]);

  const triggerPrintGift = () => {
    window.print();
  };

  return (
    <div
      className="min-h-screen bg-[#2c1374] text-slate-100 pt-28 sm:pt-36 pb-16 px-4 sm:px-6 lg:px-8 selection:bg-cyan-500 selection:text-black relative overflow-x-hidden font-sans"
      dir={dir}
      style={{
        background: "radial-gradient(circle at 50% 0%, #3d1b96 0%, #280f68 45%, #180942 100%)",
        minHeight: "100vh",
      }}
    >
      {/* Print Styles for Gift Card */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-gift-card, #printable-gift-card * {
            visibility: visible;
          }
          #printable-gift-card {
            position: fixed;
            left: 0;
            top: 0;
            width: 100vw;
            height: 100vh;
            margin: 0;
            padding: 40px;
            background: white !important;
            color: black !important;
            display: flex !important;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            box-shadow: none !important;
            border: 2px dashed #333 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        className="max-w-4xl mx-auto space-y-6"
        style={{
          maxWidth: "880px",
          marginLeft: "auto",
          marginRight: "auto",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >

        {/* ENEBA STEPPER: Cart -> Payment -> 3. Get your product */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm font-bold text-slate-300 py-2">
          {/* Step 1: Cart */}
          <div className="flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
            <span className="w-5 h-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-emerald-400 text-[11px]">
              ✓
            </span>
            <span className="text-white/90">{isAr ? "السلة" : "Cart"}</span>
          </div>

          <div className="w-6 sm:w-12 h-0.5 bg-white/20" />

          {/* Step 2: Payment */}
          <div className="flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
            <span className="w-5 h-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-emerald-400 text-[11px]">
              ✓
            </span>
            <span className="text-white/90">{isAr ? "الدفع" : "Payment"}</span>
          </div>

          <div className="w-6 sm:w-12 h-0.5 bg-cyan-400/60" />

          {/* Step 3: Get your product (Active) */}
          <div className="flex items-center gap-1.5 text-white">
            <span className="w-6 h-6 rounded-full bg-cyan-500 text-slate-950 font-black flex items-center justify-center text-xs shadow-lg shadow-cyan-500/40 animate-pulse">
              3
            </span>
            <span className="font-extrabold text-cyan-300 tracking-wide text-xs sm:text-sm">
              {isAr ? "استلام المنتج" : "Get your product"}
            </span>
          </div>
        </div>

        {/* MAIN PAGE TITLE (Exact Eneba Heading) */}
        <div className="text-center space-y-1.5 pt-2 pb-2">
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight drop-shadow-md">
            {isAr ? "استلام المنتج الرقمي" : "Get your product"}
          </h1>
          <p className="text-xs sm:text-sm text-purple-200/80 font-medium">
            {isAr
              ? "مفاتيح التفعيل جاهزة للاستخدام الفوري ومحفوظة بحسابك دائماً"
              : "Your official digital items are ready and permanently accessible."}
          </p>
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div className="rounded-3xl border border-white/15 bg-[#1f0b54]/90 p-16 text-center space-y-4 shadow-2xl backdrop-blur-md">
            <div className="w-12 h-12 rounded-full border-3 border-cyan-400 border-t-transparent animate-spin mx-auto" />
            <div className="text-base font-bold text-white">
              {isAr ? "جارٍ جلب تفاصيل المنتج ومفاتيح التفعيل..." : "Loading product details..."}
            </div>
          </div>
        )}

        {/* ERROR STATE */}
        {!loading && error && (
          <div className="rounded-3xl border border-rose-500/30 bg-[#1b084b]/95 p-8 sm:p-12 text-center space-y-5 shadow-2xl backdrop-blur-md">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h2 className="text-xl font-bold text-white">
                {isAr ? "تعذر فتح الطلب" : "Unable to Open Order"}
              </h2>
              <p className="text-sm text-purple-200/90 leading-relaxed">
                {error}
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-lg"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{isAr ? "العودة للمتجر" : "Back to Store"}</span>
              </Link>
            </div>
          </div>
        )}

        {/* LOCKED ORDER STATE */}
        {!loading && order && isLocked && (
          <div className="rounded-3xl border border-amber-500/30 bg-[#1f0b54]/95 p-8 sm:p-12 text-center space-y-5 shadow-2xl backdrop-blur-md">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-300">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h2 className="text-xl font-bold text-white">
                {isAr ? "مفاتيح هذا الطلب محمية ومشفرة" : "Protected Order"}
              </h2>
              <p className="text-sm text-purple-200/90 leading-relaxed">
                {isAr
                  ? "لعرض كود التفعيل الرقمي، يرجى فتح الرابط السري المرسل إلى بريدك الإلكتروني، أو تسجيل الدخول بنفس الحساب."
                  : "To view your digital keys, please open the secret link sent to your email or log in."}
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3 flex-wrap">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-lg"
              >
                {isAr ? "تسجيل الدخول" : "Log In"}
              </Link>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/15 transition-all"
              >
                {isAr ? "الرئيسية" : "Home"}
              </Link>
            </div>
          </div>
        )}

        {/* ORDER DETAILS LOADED: THE ENEBA MASTERPIECE */}
        {!loading && order && !isLocked && (
          <div className="space-y-6">

            {/* ORDER TOP COMPACT INFO BAR */}
            <div className="rounded-2xl border border-white/10 bg-[#1c0a4e]/70 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <span className="text-purple-300/80 font-bold uppercase tracking-wider">
                  {isAr ? "طلب رقم" : "ORDER ID"}
                </span>
                <span className="font-mono font-black text-white text-sm sm:text-base select-all bg-black/30 px-2.5 py-0.5 rounded-lg border border-white/10" dir="ltr">
                  #{order.order_number}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-bold text-[11px] ${statusInfo.badgeBg}`}>
                  {statusInfo.icon}
                  <span>{isAr ? statusInfo.labelAr : statusInfo.labelEn}</span>
                </span>
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setShowOrderInvoice(!showOrderInvoice)}
                  className="text-purple-300 hover:text-cyan-300 font-bold flex items-center gap-1 transition-colors"
                >
                  <span>{showOrderInvoice ? (isAr ? "إخفاء الفاتورة" : "Hide invoice") : (isAr ? "تفاصيل الفاتورة" : "Order invoice")}</span>
                  {showOrderInvoice ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* COLLAPSIBLE INVOICE DETAILS */}
            {showOrderInvoice && (
              <div className="rounded-2xl border border-white/10 bg-[#140638]/90 p-5 text-xs space-y-3 animate-in fade-in-50 duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <span className="text-purple-300/80 block mb-1">{isAr ? "العميل:" : "Customer:"}</span>
                    <strong className="text-white text-sm">{order.customer_name || "عميل متجر GX"}</strong>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <span className="text-purple-300/80 block mb-1">{isAr ? "البريد الإلكتروني:" : "Email:"}</span>
                    <strong className="text-white font-mono break-all text-xs">{order.customer_email || order.user_email || "—"}</strong>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <span className="text-purple-300/80 block mb-1">{isAr ? "المجموع المدفوع:" : "Total Paid:"}</span>
                    <strong className="text-cyan-300 font-mono text-base">{Number(order.total_jod || 0).toFixed(2)} د.أ</strong>
                  </div>
                </div>
              </div>
            )}

            {/* EACH ORDER ITEM: ENEBA PURPLE CARD */}
            {items.map((it: any, itemIdx: number) => {
              const coverImg = sanitizeImageForEmail(it.image, it.name, it.product_slug || it.slug);
              const qty = it.qty || it.quantity || 1;
              const regionName = it.region || "GLOBAL";
              const platformName = it.platform || "DIGITAL KEY";

              return (
                <div
                  key={itemIdx}
                  className="rounded-3xl border border-purple-500/25 bg-[#170845]/90 p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6 relative overflow-hidden"
                  style={{
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(110, 40, 230, 0.2)",
                  }}
                >
                  {/* Atmospheric Glow */}
                  <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

                  {/* 1. TOP PRODUCT ROW (Image + Title + Warning Banner + 3 Badges) */}
                  <div className="flex flex-col sm:flex-row items-start gap-5 relative z-10">
                    {/* Product Cover (Vertical/Gift Card ratio) */}
                    <div className="shrink-0 mx-auto sm:mx-0">
                      {coverImg ? (
                        <img
                          src={coverImg}
                          alt={it.name}
                          className="w-28 h-36 sm:w-32 sm:h-44 object-cover rounded-2xl border-2 border-white/15 shadow-2xl bg-black/40"
                        />
                      ) : (
                        <div className="w-28 h-36 sm:w-32 sm:h-44 rounded-2xl bg-gradient-to-br from-purple-800 to-indigo-950 border-2 border-white/15 flex flex-col items-center justify-center p-3 text-center shadow-xl">
                          <Gift className="w-8 h-8 text-cyan-400 mb-2" />
                          <span className="text-[11px] font-bold text-white leading-tight line-clamp-3">
                            {it.name}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Product Information */}
                    <div className="flex-1 w-full space-y-4">
                      {/* Title */}
                      <h2 className="text-lg sm:text-2xl font-black text-white leading-snug tracking-tight">
                        {it.name}
                      </h2>

                      {/* ENEBA YELLOW ALERT BANNER */}
                      <div className="rounded-xl border border-amber-500/35 bg-[#261705]/80 px-4 py-3 text-xs text-amber-200/95 flex items-start gap-2.5 shadow-inner">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">
                          {isAr
                            ? `لا يوجد تاريخ انتهاء للصلاحية. الكود مخصص وصالح فقط لحسابات ${regionName}. يرجى التأكد من أن حسابك مسجل على نفس الدولة أو المنطقة.`
                            : `No expiration date. Code is valid only for ${regionName}. Make sure that your account is registered to ${regionName}.`}
                        </span>
                      </div>

                      {/* ENEBA 3 SPECIFICATION BADGES (Region, Platform, Product Type) */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        {/* 1. Region */}
                        <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/10">
                          <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
                            <Globe className="w-5 h-5 text-purple-300" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-purple-300/80">
                              {isAr ? "المنطقة" : "Region"}
                            </div>
                            <div className="font-extrabold text-sm text-white uppercase truncate">
                              {regionName}
                            </div>
                            <button
                              type="button"
                              onClick={() => setActiveRegionModal(regionName)}
                              className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-medium block mt-0.5 transition-colors"
                            >
                              {isAr ? "قيود المنطقة" : "Check restrictions"}
                            </button>
                          </div>
                        </div>

                        {/* 2. Platform */}
                        <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/10">
                          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300 shrink-0">
                            {detectPlatformIcon(it.platform, it.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-purple-300/80">
                              {isAr ? "المنصة" : "Platform"}
                            </div>
                            <div className="font-extrabold text-sm text-white uppercase truncate">
                              {platformName}
                            </div>
                            <button
                              type="button"
                              onClick={() => setActiveGuideModal({ platform: platformName, name: it.name })}
                              className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-medium block mt-0.5 transition-colors"
                            >
                              {isAr ? "دليل التفعيل ↗" : "Activation guide ↗"}
                            </button>
                          </div>
                        </div>

                        {/* 3. Product Type */}
                        <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/10">
                          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0">
                            <KeyRound className="w-5 h-5 text-emerald-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-purple-300/80">
                              {isAr ? "نوع المنتج" : "Product type"}
                            </div>
                            <div className="font-extrabold text-sm text-white uppercase truncate">
                              {isAr ? "مفتاح رقمي" : "DIGITAL KEY"}
                            </div>
                            <span className="text-[10px] text-emerald-400 font-bold block mt-0.5">
                              {isAr ? "أصلي 100%" : "100% Genuine"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. DIGITAL PRODUCT KEY SECTION */}
                  <div className="space-y-3 pt-2 relative z-10">
                    <div className="text-xs sm:text-sm font-black text-white/90 flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-cyan-400" />
                      <span>{isAr ? "كود ومفتاح المنتج الرقمي:" : "Digital product key:"}</span>
                    </div>

                    {order.status !== "delivered" && (
                      <div className="rounded-2xl border border-amber-500/30 bg-[#0f042e] p-6 text-center space-y-2">
                        <Clock className="w-6 h-6 text-amber-400 mx-auto animate-spin" />
                        <div className="font-bold text-white text-sm">
                          {isAr ? "طلبك قيد التجهيز من قبل النظام..." : "Order is being processed..."}
                        </div>
                        <div className="text-xs text-purple-200/70">
                          {isAr
                            ? "سيصلك المفتاح مباشرة هنا وفي بريدك الإلكتروني خلال دقائق."
                            : "Your keys will appear here and in your inbox shortly."}
                        </div>
                      </div>
                    )}

                    {order.status === "delivered" && deliveryCodes.length === 0 && (
                      <div className="rounded-2xl border border-white/10 bg-[#0f042e] p-6 text-center space-y-2">
                        <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto" />
                        <div className="font-bold text-white text-sm">
                          {isAr ? "تم إتمام التفعيل لحسابك مباشرة بنجاح!" : "Item activated directly to your account!"}
                        </div>
                        <div className="text-xs text-purple-200/70">
                          {isAr ? "لا يتطلب هذا المنتج كود تفعيل خارجي." : "This product does not require a digital key."}
                        </div>
                      </div>
                    )}

                    {order.status === "delivered" && deliveryCodes.map((code, codeIdx) => {
                      const isRevealed = revealedKeys[codeIdx];
                      const displayValue = code.value || code.extra || "";
                      const kind = code.kind || "code";

                      return (
                        <div key={codeIdx} className="space-y-3">
                          {/* THE CONTRASTING DARK CODE BOX */}
                          <div className="rounded-2xl border-2 border-purple-500/30 bg-[#0a031e] p-5 sm:p-8 text-center space-y-5 shadow-2xl relative">

                            {!isRevealed ? (
                              /* STATE 1: MASKED KEY + DISPLAY KEY BUTTON */
                              <div className="space-y-4 py-2">
                                <div className="font-mono text-xl sm:text-3xl font-black tracking-widest text-white/30 select-none">
                                  ••••-••••-••••-••••-••••
                                </div>

                                <div>
                                  <button
                                    type="button"
                                    onClick={() => onRevealKey(codeIdx)}
                                    className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-500 hover:brightness-110 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-cyan-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                                  >
                                    <Eye className="w-5 h-5 text-slate-950" />
                                    <span>{isAr ? "عرض كود التفعيل (Display Key)" : "Display activation key"}</span>
                                  </button>
                                </div>

                                <p className="text-xs text-purple-200/60 max-w-md mx-auto leading-relaxed">
                                  {isAr
                                    ? "الضغط على «عرض كود التفعيل» سيكشف المفتاح ويسجل استلامك له في لوحة التحكم."
                                    : "Clicking display will reveal your key and record delivery in the system."}
                                </p>
                              </div>
                            ) : (
                              /* STATE 2: REVEALED KEY (ENEBA STYLE) */
                              <div className="space-y-5">
                                {/* Big Monospace Key Display */}
                                <div className="flex items-center justify-center gap-3 flex-wrap">
                                  <div
                                    className="font-mono text-xl sm:text-3xl font-black tracking-widest text-white select-all break-all px-4 py-2 rounded-xl bg-white/5 border border-white/10"
                                    dir="ltr"
                                  >
                                    {displayValue}
                                  </div>

                                  {/* Copy Icon Button */}
                                  <button
                                    type="button"
                                    onClick={() => onCopyKey(displayValue, `code-${codeIdx}`)}
                                    className={`p-3 rounded-xl border font-bold transition-all shrink-0 cursor-pointer ${
                                      copiedKey === `code-${codeIdx}`
                                        ? "bg-emerald-500 border-emerald-400 text-slate-950 scale-105"
                                        : "bg-white/10 hover:bg-white/20 border-white/20 text-white"
                                    }`}
                                    title={isAr ? "نسخ الكود" : "Copy key"}
                                  >
                                    {copiedKey === `code-${codeIdx}` ? (
                                      <Check className="w-5 h-5" />
                                    ) : (
                                      <Copy className="w-5 h-5" />
                                    )}
                                  </button>
                                </div>

                                {/* Account Credentials if account */}
                                {kind === "account" && (code.email || code.password) && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-left" dir="ltr">
                                    {code.email && (
                                      <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center justify-between">
                                        <div className="min-w-0 pr-2">
                                          <div className="text-[10px] text-purple-300 font-bold uppercase">EMAIL / USERNAME</div>
                                          <div className="font-mono text-xs sm:text-sm text-white font-bold truncate">{code.email}</div>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => onCopyKey(code.email!, `email-${codeIdx}`)}
                                          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-cyan-400"
                                        >
                                          {copiedKey === `email-${codeIdx}` ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                      </div>
                                    )}
                                    {code.password && (
                                      <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center justify-between">
                                        <div className="min-w-0 pr-2">
                                          <div className="text-[10px] text-purple-300 font-bold uppercase">PASSWORD</div>
                                          <div className="font-mono text-xs sm:text-sm text-white font-bold truncate">{code.password}</div>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => onCopyKey(code.password!, `pass-${codeIdx}`)}
                                          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-cyan-400"
                                        >
                                          {copiedKey === `pass-${codeIdx}` ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Print As A Gift Button (Eneba Style) */}
                                <div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActiveGiftModal({
                                        code: displayValue,
                                        title: it.name,
                                        platform: platformName,
                                        region: regionName,
                                      })
                                    }
                                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-white/25 hover:border-white/50 bg-white/5 hover:bg-white/10 text-white font-bold text-xs sm:text-sm transition-all shadow-md cursor-pointer"
                                  >
                                    <Gift className="w-4 h-4 text-cyan-300" />
                                    <span>{isAr ? "طباعة كهدية (Print as a gift)" : "Print as a gift"}</span>
                                  </button>
                                </div>

                                {/* Don't want to use it now? Library note & button */}
                                <div className="border-t border-white/10 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-purple-200/80">
                                  <span>
                                    {isAr
                                      ? "لا ترغب في تفعيله الآن؟ لا تقلق، يمكنك دائماً العثور على الكود في حسابك!"
                                      : "Don't want to use it now? Don't worry. You can always find the code in your Library!"}
                                  </span>

                                  <Link
                                    to="/account"
                                    search={{ tab: "orders" } as never}
                                    className="px-4 py-2 rounded-xl bg-purple-600/50 hover:bg-purple-600 text-white font-bold border border-purple-400/40 text-xs shrink-0 transition-all cursor-pointer"
                                  >
                                    {isAr ? "مكتبتي / طلباتي" : "My library"}
                                  </Link>
                                </div>
                              </div>
                            )}

                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 3. REFUND POLICY DISCLAIMER (Exact Eneba Disclaimer) */}
                  <div className="text-center text-xs text-purple-200/60 leading-relaxed px-2">
                    {isAr
                      ? "نظراً لأن هذا منتج رقمي وتم عرض مفتاح التفعيل، فإن الطلب غير مؤهل للاسترجاع إلا إذا كان الكود غير صالح أو معيباً."
                      : "Since it's a digital product and the key was displayed, you are not eligible for a refund unless the key is invalid or faulty"}
                  </div>

                  {/* 4. CARD FOOTER: MERCHANT INFO + REPORT A PROBLEM */}
                  <div className="border-t border-white/10 pt-5 flex flex-wrap items-center justify-between gap-4 text-xs">
                    {/* Merchant & Rating */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center font-black text-slate-950 text-sm shadow-md shrink-0">
                        GX
                      </div>
                      <div>
                        <div className="font-extrabold text-white text-sm">
                          {isAr ? "متجر GX Store الرسمي" : "GX Store Official"}
                        </div>
                        <div className="text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>
                            {isAr ? "تقييم 99.9% ممتاز • تفعيل مضمون 100%" : "99.9% of ratings are excellent!"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Report a Problem Button */}
                    <button
                      type="button"
                      onClick={() => setShowProblemModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/20 hover:border-amber-400/60 bg-white/5 hover:bg-amber-500/10 text-white hover:text-amber-300 font-bold text-xs transition-all cursor-pointer"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>{isAr ? "الإبلاغ عن مشكلة (Report a problem)" : "Report a problem"}</span>
                    </button>
                  </div>

                </div>
              );
            })}

          </div>
        )}

      </div>

      {/* MODAL 1: PRINT AS A GIFT MODAL */}
      {activeGiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#190947] border border-white/20 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative text-slate-100">
            <button
              type="button"
              onClick={() => setActiveGiftModal(null)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-300 mb-2">
                <Gift className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-white">
                {isAr ? "طباعة بطاقة إهداء فاخرة" : "Print as a Gift Voucher"}
              </h3>
              <p className="text-xs text-purple-200/80">
                {isAr
                  ? "قم بإهداء هذا الكود الرقمي في بطاقة هدايا أنيقة يمكن طباعتها أو حفظها كـ PDF."
                  : "Gift this digital key in a clean branded gift card."}
              </p>
            </div>

            {/* Recipient Input Fields */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-purple-300 font-bold mb-1">
                  {isAr ? "إلى (اسم المستلم أو الصديق):" : "To (Recipient Name):"}
                </label>
                <input
                  type="text"
                  value={giftRecipient}
                  onChange={(e) => setGiftRecipient(e.target.value)}
                  placeholder={isAr ? "مثال: فيصل العزيز" : "e.g. Alex"}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-3.5 py-2.5 text-white placeholder-white/40 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-purple-300 font-bold mb-1">
                  {isAr ? "رسالة الإهداء (اختياري):" : "Gift Message (Optional):"}
                </label>
                <textarea
                  rows={2}
                  value={giftNote}
                  onChange={(e) => setGiftNote(e.target.value)}
                  placeholder={isAr ? "أجمل الهدايا لأغلى صديق بمناسبة..." : "Enjoy your digital key!"}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-3.5 py-2 text-white placeholder-white/40 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* PREVIEW OF THE PRINTABLE GIFT CARD */}
            <div
              id="printable-gift-card"
              className="rounded-2xl border-2 border-dashed border-cyan-400/50 bg-[#0e0326] p-6 text-center space-y-4 shadow-inner"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="text-left font-black tracking-widest text-cyan-300 text-sm">
                  GX STORE • GIFT CARD
                </div>
                <div className="text-xs text-purple-300 font-mono font-bold">
                  {activeGiftModal.platform}
                </div>
              </div>

              {giftRecipient && (
                <div className="text-sm font-bold text-white">
                  {isAr ? `إلى: ${giftRecipient}` : `To: ${giftRecipient}`}
                </div>
              )}

              <div className="text-base sm:text-lg font-black text-white">
                {activeGiftModal.title}
              </div>

              {giftNote && (
                <p className="text-xs text-purple-200/90 italic">
                  "{giftNote}"
                </p>
              )}

              {/* Secret Key in Gift Box */}
              <div className="rounded-xl bg-black/60 border border-white/10 py-3 px-4 font-mono font-black text-lg sm:text-xl text-cyan-300 tracking-widest select-all" dir="ltr">
                {activeGiftModal.code}
              </div>

              <div className="text-[10px] text-purple-300/70 pt-1">
                {isAr ? "تفعيل رسمي ومضمون عبر متجر GX Store • https://gxstore.me" : "Official digital key via GX Store • https://gxstore.me"}
              </div>
            </div>

            {/* Print & Action Buttons */}
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveGiftModal(null)}
                className="px-5 py-2.5 rounded-xl border border-white/20 hover:bg-white/10 text-white font-bold text-xs cursor-pointer"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>

              <button
                type="button"
                onClick={triggerPrintGift}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition-all shadow-lg cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{isAr ? "طباعة / حفظ PDF" : "Print / Save PDF"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ACTIVATION GUIDE MODAL */}
      {activeGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#190947] border border-white/20 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl relative text-slate-100">
            <button
              type="button"
              onClick={() => setActiveGuideModal(null)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 shrink-0">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  {isAr ? "دليل وطريقة التفعيل السريع" : "Quick Activation Guide"}
                </h3>
                <p className="text-xs text-purple-200/80">
                  {activeGuideModal.name}
                </p>
              </div>
            </div>

            {/* Platform Instructions */}
            <div className="space-y-3 text-xs text-slate-200 leading-relaxed bg-black/40 rounded-2xl p-5 border border-white/10">
              <div className="space-y-2">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span>
                    {isAr
                      ? "قم بتسجيل الدخول إلى حسابك على المنصة الرسمية (تأكد من مطابقة منطقة الحساب)."
                      : "Log in to your official account and ensure region matches."}
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span>
                    {isAr
                      ? "انتقل إلى صفحة (استرداد الرمز / Redeem Code) أو (Redeem Gift Card)."
                      : "Go to the Redeem Code or Redeem Gift Card section."}
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <span>
                    {isAr
                      ? "ألصق كود التفعيل الرقمي الموضح أعلاه واضغط على زر «تأكيد / Redeem»."
                      : "Enter your digital key and click Redeem."}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveGuideModal(null)}
                className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-md cursor-pointer"
              >
                {isAr ? "فهمت، إغلاق" : "Got it, Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: REGION RESTRICTIONS MODAL */}
      {activeRegionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#190947] border border-white/20 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl relative text-slate-100">
            <button
              type="button"
              onClick={() => setActiveRegionModal(null)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 mx-auto">
                <Globe className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white">
                {isAr ? "معلومات وتوافق المنطقة" : "Region Compatibility"}
              </h3>
              <p className="text-sm font-bold text-cyan-300 uppercase">
                {activeRegionModal}
              </p>
            </div>

            <div className="text-xs text-purple-200/90 leading-relaxed bg-black/40 rounded-2xl p-4 border border-white/10">
              {isAr ? (
                <span>
                  هذا الكود مخصص حصرياً للمنطقة المحددة (<strong>{activeRegionModal}</strong>). تأكد من أن إعدادات متجرك أو حسابك تتبع نفس الدولة لتجنب أي تعارض أثناء التفعيل.
                </span>
              ) : (
                <span>
                  This code is specifically for <strong>{activeRegionModal}</strong> accounts. Make sure your account store region matches before redeeming.
                </span>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveRegionModal(null)}
                className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer"
              >
                {isAr ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: REPORT A PROBLEM / SUPPORT MODAL */}
      {showProblemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#190947] border border-white/20 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl relative text-slate-100">
            <button
              type="button"
              onClick={() => setShowProblemModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  {isAr ? "الإبلاغ عن مشكلة أو طلب مساعدة" : "Report a Problem or Get Help"}
                </h3>
                <p className="text-xs text-purple-200/80">
                  {isAr ? "فريق دعم GX Store متاح على مدار الساعة" : "GX Store support is available 24/7"}
                </p>
              </div>
            </div>

            <div className="text-xs text-purple-200/90 leading-relaxed bg-black/40 rounded-2xl p-4 border border-white/10 space-y-2">
              <p>
                {isAr
                  ? `إذا واجهت أي صعوبة في استرداد الكود لطلبك رقم #${order?.order_number}، يمكنك التواصل معنا مباشرة وسنقوم بحل المشكلة فوراً.`
                  : `If you have any issues activating your code for order #${order?.order_number}, our team will resolve it immediately.`}
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowProblemModal(false)}
                className="px-5 py-2.5 rounded-xl border border-white/20 hover:bg-white/10 text-white font-bold text-xs cursor-pointer"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>

              <a
                href={`https://wa.me/962776252313?text=${encodeURIComponent(
                  `مرحباً فريق GX Store، أحتاج مساعدة بخصوص طلبي رقم #${order?.order_number} (كود التفعيل).`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-lg cursor-pointer"
              >
                <WhatsAppSvg className="w-4 h-4" />
                <span>{isAr ? "مراسلة واتساب فورية" : "Instant WhatsApp Support"}</span>
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
