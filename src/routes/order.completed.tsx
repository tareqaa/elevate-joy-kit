import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { StoreShell } from "@/components/gx/StoreShell";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { useLang } from "@/lib/gx/i18n";
import { getOrderByTokenFn, sanitizeImageForEmail } from "@/lib/gx/order-email.functions";
import { CloudflareTurnstile } from "@/components/gx/CloudflareTurnstile";
import { toast } from "sonner";
import {
  CheckCircle2, XCircle, Clock, Package, KeyRound, Copy, Check, Eye, ExternalLink,
  ShieldCheck, AlertTriangle, ArrowRight, MessageSquare, Mail, User, Wallet, Sparkles, Loader2,
  ChevronRight, ArrowLeft, Star, ShoppingBag, ShieldAlert, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/order/completed")({
  validateSearch: (search: Record<string, unknown>) => ({
    order_token: typeof search.order_token === "string" ? search.order_token : "",
  }),
  head: () => ({
    meta: [
      { title: "استلام وتفعيل الطلب | متجر GX Store" },
      { name: "description", content: "صفحة استلام وتفعيل طلبك الرقمي بأمان عبر متجر GX Store" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: STORE_HEAD_LINKS,
  }),
  component: OrderCompletedPage,
});

type DeliveryCode = {
  kind?: "code" | "account" | "topup";
  label?: string;
  value?: string;
  email?: string;
  password?: string;
  region?: string;
  extra?: string;
};

function WhatsAppSvg() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

function DiscordSvg() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

export function OrderCompletedPage() {
  const { order_token } = Route.useSearch();
  const { lang, dir } = useLang();
  const isAr = lang === "ar";

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Record<number, boolean>>({});
  const [botVerified, setBotVerified] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!order_token || !order_token.trim()) {
      setLoading(false);
      setError(
        isAr
          ? "لم يتم العثور على رمز وصول رقمي صالح لهذا الطلب (Missing Order Token). يرجى فتح الرابط السري المرسل إلى بريدك الإلكتروني."
          : "Missing or invalid order access token. Please open the secure link sent to your email address."
      );
      return;
    }

    setLoading(true);
    setError(null);

    getOrderByTokenFn({ data: { orderToken: order_token.trim() } })
      .then((res) => {
        if (!mounted) return;
        if (res.ok && res.order) {
          setOrder(res.order);
        } else {
          setError(res.error || (isAr ? "رمز الطلب غير صالح أو منتهي الصلاحية" : "Invalid or expired order token"));
        }
      })
      .catch((err) => {
        if (mounted) setError(err.message || (isAr ? "فشل التحقق من الطلب" : "Failed to load order"));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [order_token, isAr]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    toast.success(isAr ? "تم النسخ إلى الحافظة بنجاح!" : "Copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 2200);
  };

  const deliveryCodes: DeliveryCode[] = useMemo(() => {
    if (!order?.delivery_data || typeof order.delivery_data !== "object") return [];
    const codes = (order.delivery_data as any).codes;
    return Array.isArray(codes) ? codes : [];
  }, [order]);

  const statusInfo = useMemo(() => {
    const s = order?.status || "pending";
    if (s === "delivered") {
      return {
        labelAr: "مُسلَّم ومكتمل 100%",
        labelEn: "Completed & Delivered",
        color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/40",
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
      };
    }
    if (s === "cancelled") {
      return {
        labelAr: "تم إلغاء الطلب",
        labelEn: "Order Cancelled",
        color: "text-rose-400 bg-rose-500/15 border-rose-500/40",
        icon: <XCircle className="w-5 h-5 text-rose-400" />,
      };
    }
    return {
      labelAr: "قيد المراجعة والتجهيز",
      labelEn: "Processing",
      color: "text-amber-400 bg-amber-500/15 border-amber-500/40",
      icon: <Clock className="w-5 h-5 text-amber-400" />,
    };
  }, [order?.status]);

  return (
    <StoreShell>
      <div className="min-h-screen bg-[#07090e] text-slate-100 py-8 px-4 sm:px-6 lg:px-8 selection:bg-cyan-500 selection:text-black" dir={dir}>
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Gamivo / Eneba 3-Step Horizontal Stepper Header */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-4 sm:p-5 shadow-xl">
            <div className="flex items-center justify-between max-w-2xl mx-auto relative">
              {/* Step 1: Cart */}
              <div className="flex flex-col items-center gap-1.5 z-10">
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 font-black text-sm flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  ✓
                </div>
                <span className="text-[12px] font-bold text-slate-300">
                  {isAr ? "سلة الشراء" : "Shopping Cart"}
                </span>
              </div>

              {/* Connector line 1 */}
              <div className="flex-1 h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-400 mx-2 -mt-5" />

              {/* Step 2: Payment */}
              <div className="flex flex-col items-center gap-1.5 z-10">
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 font-black text-sm flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  ✓
                </div>
                <span className="text-[12px] font-bold text-slate-300">
                  {isAr ? "تأكيد الدفع" : "Payment"}
                </span>
              </div>

              {/* Connector line 2 */}
              <div className="flex-1 h-0.5 bg-gradient-to-r from-emerald-400 to-cyan-400 mx-2 -mt-5" />

              {/* Step 3: Reveal / Delivery (Active Glow) */}
              <div className="flex flex-col items-center gap-1.5 z-10">
                <div className="w-9 h-9 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 border-2 border-cyan-300 text-slate-950 font-black text-sm flex items-center justify-center shadow-lg shadow-cyan-500/40 animate-pulse">
                  3
                </div>
                <span className="text-[12px] font-black text-cyan-300">
                  {isAr ? "استلام وتفعيل الكود" : "Claim & Activate"}
                </span>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="rounded-3xl border border-white/10 bg-slate-900/40 p-16 text-center space-y-4">
              <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto" />
              <div className="text-base font-bold text-slate-300">
                {isAr ? "جارٍ التحقق من الرمز السري واسترجاع بيانات الطلب..." : "Verifying secure order token..."}
              </div>
            </div>
          )}

          {/* Error / Unauthorized State */}
          {!loading && error && (
            <div className="rounded-3xl border border-rose-500/30 bg-rose-950/20 p-8 sm:p-12 text-center space-y-6 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400">
                <ShieldAlert className="w-9 h-9" />
              </div>
              <div className="space-y-2 max-w-lg mx-auto">
                <h2 className="text-2xl font-black text-white">
                  {isAr ? "رمز الوصول السري غير صالح أو محمي" : "Invalid or Protected Access Link"}
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {error}
                </p>
                <p className="text-xs text-slate-400">
                  {isAr
                    ? "لأسباب أمنية ولحماية مفاتيح التفعيل الرقمية، لا يمكن الوصول إلى الطلبات بدون الرابط السري المشفر المرسل للبريد."
                    : "For security and digital key protection, guest access requires the cryptographically signed token sent to your email."}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-sm shadow-lg shadow-cyan-500/25 hover:brightness-110 transition-all"
                >
                  <User className="w-4 h-4" />
                  <span>{isAr ? "تسجيل الدخول إلى حسابي" : "Log In to My Account"}</span>
                </Link>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-white/10 transition-all"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{isAr ? "العودة للرئيسية" : "Back to Store"}</span>
                </Link>
              </div>
            </div>
          )}

          {/* Success / Loaded Order */}
          {!loading && order && (
            <>
              {/* USER EXPLICIT REQUIREMENT: Prominent Banner for My Orders */}
              <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-purple-950/30 p-4 sm:p-5 flex items-center justify-between gap-4 shadow-lg">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-sm sm:text-base font-black text-white">
                      {isAr
                        ? "✨ يمكنك دائماً رؤية هذا المنتج ورموز التفعيل والوصول إليها دوماً في صفحة طلباتي"
                        : "✨ You can always view these activation codes anytime in your My Orders page"}
                    </div>
                    <div className="text-xs text-cyan-200/70 mt-0.5">
                      {isAr
                        ? "سواء كنت زائر أو لديك حساب، سجل الدخول بنفس الإيميل وستجد جميع طلباتك محفوظة"
                        : "Your purchases are permanently linked to your email address and profile"}
                    </div>
                  </div>
                </div>

                <Link
                  to="/_authenticated/account"
                  search={{ tab: "orders" }}
                  className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold text-xs shrink-0 transition-all"
                >
                  <span>{isAr ? "صفحة طلباتي (My Orders)" : "My Orders"}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Main Order Card */}
              <div className="rounded-3xl border border-white/10 bg-slate-900/70 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-8">

                {/* Status Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
                  <div className="space-y-1">
                    <div className="text-xs text-slate-400 font-bold tracking-wider">
                      {isAr ? "رقم الطلب (ORDER ID)" : "ORDER ID"}
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-white font-mono flex items-center gap-3">
                      <span>#{order.order_number}</span>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${statusInfo.color}`}>
                        {statusInfo.icon}
                        <span>{isAr ? statusInfo.labelAr : statusInfo.labelEn}</span>
                      </span>
                    </div>
                  </div>

                  <div className="text-right sm:text-left">
                    <div className="text-xs text-slate-400 font-bold">
                      {isAr ? "تاريخ الطلب" : "Order Date"}
                    </div>
                    <div className="text-sm font-semibold text-slate-300 mt-1">
                      {new Date(order.created_at).toLocaleDateString(isAr ? "ar-JO" : "en-US", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>

                {/* USER EXPLICIT REQUIREMENT: Cloudflare I'm not a robot Challenge */}
                {!botVerified && order.status === "delivered" && (
                  <CloudflareTurnstile
                    lang={lang}
                    onVerified={(t) => {
                      setBotVerified(true);
                      toast.success(isAr ? "تم التحقق بنجاح من Cloudflare!" : "Cloudflare verification passed!");
                    }}
                  />
                )}

                {/* DELIVERY KEYS & CODES SECTION (THE HERO) */}
                {order.status === "delivered" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-5 h-5 text-cyan-400" />
                        <h3 className="text-lg font-black text-white">
                          {isAr ? "مفاتيح وبيانات التفعيل الرقمية (Instant Delivery)" : "Digital Activation Keys & Details"}
                        </h3>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        {deliveryCodes.length} {isAr ? "عنصر للتفعيل" : "Items to redeem"}
                      </span>
                    </div>

                    {deliveryCodes.length === 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-center space-y-2">
                        <Package className="w-8 h-8 text-cyan-400 mx-auto" />
                        <div className="text-sm font-bold text-slate-300">
                          {isAr ? "تم إتمام الطلب، ويتم تسليم الخدمة لحسابك مباشرة" : "Order completed and delivered to your account"}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {deliveryCodes.map((code, idx) => {
                          const isRevealed = botVerified && revealedKeys[idx];
                          const displayValue = code.value || code.extra || "";
                          const kind = code.kind || "code";

                          return (
                            <div
                              key={idx}
                              className="rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-5 space-y-4 shadow-xl transition-all"
                            >
                              {/* Label & Region Tag */}
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
                                  <span className="text-sm font-black text-white">
                                    {code.label || (isAr ? `مفتاح تفعيل رقم #${idx + 1}` : `Key #${idx + 1}`)}
                                  </span>
                                  {kind === "account" && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                                      {isAr ? "حساب جاهز" : "Account"}
                                    </span>
                                  )}
                                </div>

                                {code.region && (
                                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-sky-950/60 text-sky-300 border border-sky-800/50">
                                    {isAr ? "المنطقة / الريجون:" : "Region:"} {code.region}
                                  </span>
                                )}
                              </div>

                              {/* Activation Key Box */}
                              <div className="rounded-xl border border-white/10 bg-black/50 p-3 sm:p-4 flex items-center justify-between gap-3">
                                <div className="font-mono text-base sm:text-lg font-black tracking-widest text-cyan-300 break-all select-all">
                                  {!botVerified ? (
                                    <span className="text-slate-500 text-sm tracking-normal flex items-center gap-2">
                                      <Lock className="w-4 h-4 text-amber-400" />
                                      {isAr ? "قم بتأكيد التحقق من Cloudflare أعلاه لإظهار الكود" : "Verify with Cloudflare above to unlock key"}
                                    </span>
                                  ) : isRevealed ? (
                                    displayValue
                                  ) : (
                                    "••••-••••-••••-••••-••••"
                                  )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {botVerified && !isRevealed && (
                                    <Button
                                      size="sm"
                                      onClick={() => setRevealedKeys((prev) => ({ ...prev, [idx]: true }))}
                                      className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold"
                                    >
                                      <Eye className="w-3.5 h-3.5 mr-1" />
                                      {isAr ? "إظهار الكود" : "Reveal Code"}
                                    </Button>
                                  )}

                                  {botVerified && isRevealed && (
                                    <Button
                                      size="sm"
                                      onClick={() => copyToClipboard(displayValue, `key-${idx}`)}
                                      className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-slate-950 font-black text-xs shadow-md"
                                    >
                                      {copiedKey === `key-${idx}` ? (
                                        <>
                                          <Check className="w-3.5 h-3.5 mr-1 text-emerald-950" />
                                          {isAr ? "تم النسخ!" : "Copied!"}
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3.5 h-3.5 mr-1" />
                                          {isAr ? "نسخ الكود" : "Copy Key"}
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {/* Account credentials if kind === account */}
                              {kind === "account" && (code.email || code.password) && isRevealed && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                  {code.email && (
                                    <div className="rounded-xl bg-slate-950/70 border border-white/5 p-3 flex items-center justify-between">
                                      <div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase">{isAr ? "الإيميل" : "Email"}</div>
                                        <div className="font-mono text-xs text-white break-all mt-0.5">{code.email}</div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => copyToClipboard(code.email!, `email-${idx}`)}
                                        className="text-cyan-400 hover:text-cyan-300 p-1"
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                  {code.password && (
                                    <div className="rounded-xl bg-slate-950/70 border border-white/5 p-3 flex items-center justify-between">
                                      <div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase">{isAr ? "كلمة المرور" : "Password"}</div>
                                        <div className="font-mono text-xs text-white break-all mt-0.5">{code.password}</div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => copyToClipboard(code.password!, `pass-${idx}`)}
                                        className="text-cyan-400 hover:text-cyan-300 p-1"
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Cancellation notice if cancelled */}
                {order.status === "cancelled" && (
                  <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-5 space-y-2 text-rose-200">
                    <div className="font-black flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-rose-400" />
                      <span>{isAr ? "ملاحظة بشأن إلغاء الطلب" : "Order Cancellation Notice"}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-300">
                      {order.admin_notes ||
                        (isAr
                          ? "تم إلغاء هذا الطلب من قبل إدارة المتجر. إذا قمت بالدفع مسبقاً، يرجى التواصل مع الدعم الفني لاسترداد المبلغ أو توجيه الرصيد لحسابك."
                          : "This order has been cancelled by administration. If you have already paid, please contact support for a refund or credit.")}
                    </p>
                  </div>
                )}

                {/* PRODUCTS SUMMARY TABLE */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <h4 className="text-sm font-black text-slate-300 tracking-wider">
                    {isAr ? "ملخص المنتجات المطلوبة" : "ORDER ITEMS SUMMARY"}
                  </h4>

                  <div className="space-y-2">
                    {Array.isArray(order.items) &&
                      order.items.map((it: any, i: number) => {
                        const qty = it.qty || it.quantity || 1;
                        const coverImg = sanitizeImageForEmail(it.image, it.name, it.product_slug || it.slug);

                        return (
                          <div
                            key={i}
                            className="rounded-2xl border border-white/5 bg-slate-950/50 p-3.5 flex items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-3.5">
                              {coverImg ? (
                                <img
                                  src={coverImg}
                                  alt={it.name}
                                  className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-xl shrink-0">
                                  🎮
                                </div>
                              )}
                              <div>
                                <div className="text-sm font-bold text-white leading-tight">
                                  {it.name}
                                </div>
                                <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                                  <span>{isAr ? "الكمية:" : "Qty:"} {qty}</span>
                                  {it.region && <span>• {it.region}</span>}
                                </div>
                              </div>
                            </div>

                            <div className="text-right font-mono text-cyan-300 font-black text-sm">
                              {it.price != null ? `${Number(it.price).toFixed(2)} د.أ` : "—"}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="rounded-2xl bg-black/40 border border-white/10 p-5 space-y-2.5">
                  <div className="flex justify-between text-sm text-slate-400">
                    <span>{isAr ? "المجموع الفرعي" : "Subtotal"}</span>
                    <span className="font-mono text-slate-200">{Number(order.subtotal_jod ?? order.total_jod).toFixed(2)} د.أ</span>
                  </div>

                  {order.discount_jod && Number(order.discount_jod) > 0 ? (
                    <div className="flex justify-between text-sm text-emerald-400">
                      <span>{isAr ? "الخصم المطبق" : "Discount Applied"}</span>
                      <span className="font-mono">-{Number(order.discount_jod).toFixed(2)} د.أ</span>
                    </div>
                  ) : null}

                  <div className="pt-2 border-t border-white/10 flex justify-between text-base font-black text-white">
                    <span>{isAr ? "المبلغ الإجمالي المدفوع" : "Total Amount Paid"}</span>
                    <span className="font-mono text-lg text-cyan-400">{Number(order.total_jod || 0).toFixed(2)} د.أ</span>
                  </div>
                </div>

                {/* Support Card (WhatsApp & Discord) */}
                <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/60 p-5 space-y-3">
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-cyan-400" />
                    <span>{isAr ? "تحتاج مساعدة في التفعيل أو واجهت مشكلة؟" : "Need Help with Activation?"}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {isAr
                      ? "فريق دعم GX Store متاح على مدار الساعة عبر واتساب وديسكورد لمساعدتك في تفعيل أي كود خطوة بخطوة."
                      : "Our support team is available 24/7 on WhatsApp and Discord to assist you with activation."}
                  </p>

                  <div className="flex flex-wrap gap-2.5 pt-1">
                    <a
                      href={`https://wa.me/962776252313?text=${encodeURIComponent(
                        `مرحباً GX Store، أود المساعدة بشأن طلبي رقم #${order.order_number}`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md"
                    >
                      <WhatsAppSvg />
                      <span>{isAr ? "واتساب الدعم الفني" : "WhatsApp Support"}</span>
                    </a>

                    <a
                      href="https://discord.gg/DvkUd5PgqV"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold text-xs transition-all shadow-md"
                    >
                      <DiscordSvg />
                      <span>{isAr ? "سيرفر ديسكورد" : "Discord Community"}</span>
                    </a>
                  </div>
                </div>

              </div>
            </>
          )}

        </div>
      </div>
    </StoreShell>
  );
}
