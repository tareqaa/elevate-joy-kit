import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { StoreShell } from "@/components/gx/StoreShell";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { useLang } from "@/lib/gx/i18n";
import { getOrderByNumberFn } from "@/lib/gx/order-email.functions";
import { toast } from "sonner";
import {
  CheckCircle2, XCircle, Clock, Package, KeyRound, Copy, Check, Eye, ExternalLink,
  ShieldCheck, AlertTriangle, ArrowRight, MessageSquare, Mail, User, Wallet, Sparkles, Loader2,
  ChevronRight, ArrowLeft, Star, ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/order/$orderNumber")({
  head: ({ params }) => ({
    meta: [
      { title: `طلب #${params.orderNumber} | متجر GX Store` },
      { name: "description", content: `استلام وتفعيل الطلب #${params.orderNumber} من متجر GX Store` },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: STORE_HEAD_LINKS,
  }),
  component: OrderDetailsPage,
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

function OrderDetailsPage() {
  const { orderNumber } = Route.useParams();
  const { lang, dir } = useLang();
  const isAr = lang === "ar";

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    getOrderByNumberFn({ data: { orderNumber } })
      .then((res) => {
        if (!mounted) return;
        if (res.ok && res.order) {
          setOrder(res.order);
        } else {
          setError(res.error || (isAr ? "لم يتم العثور على هذا الطلب" : "Order not found"));
        }
      })
      .catch((err) => {
        if (mounted) setError(err.message || (isAr ? "حدث خطأ أثناء تحميل الطلب" : "Failed to load order"));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [orderNumber, isAr]);

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
    if (s === "paid" || s === "processing") {
      return {
        labelAr: "قيد التجهيز والتسليم",
        labelEn: "Processing Delivery",
        color: "text-cyan-400 bg-cyan-500/15 border-cyan-500/40",
        icon: <Package className="w-5 h-5 text-cyan-400 animate-pulse" />,
      };
    }
    return {
      labelAr: "بانتظار تأكيد الدفع",
      labelEn: "Pending Payment",
      color: "text-amber-400 bg-amber-500/15 border-amber-500/40",
      icon: <Clock className="w-5 h-5 text-amber-400" />,
    };
  }, [order?.status]);

  const items = useMemo(() => {
    return Array.isArray(order?.items) ? order.items : [];
  }, [order]);

  const supportMsg = useMemo(() => {
    return `مرحباً، أود المساعدة بخصوص طلبي رقم #${orderNumber} في متجر GX Store.`;
  }, [orderNumber]);

  return (
    <StoreShell>
      <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto" dir={dir}>
        
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
            <h2 className="text-xl font-black text-white mb-2">
              {isAr ? "جاري تحميل تفاصيل الطلب والمفاتيح..." : "Loading order details..."}
            </h2>
            <p className="text-slate-400 text-sm">
              {isAr ? "يرجى الانتظار بضع ثوانٍ لعرض رموز التفعيل وبيانات طلبك." : "Please wait a moment."}
            </p>
          </div>
        )}

        {/* Error / Not Found */}
        {!loading && error && (
          <div className="p-8 sm:p-10 rounded-2xl bg-[#111622] border border-rose-500/30 text-center max-w-lg mx-auto shadow-2xl mt-10">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 grid place-items-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-white mb-2">
              {isAr ? "تعذر العثور على هذا الطلب" : "Order Not Found"}
            </h2>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              {isAr
                ? "تأكد من صحة رقم الطلب المدخل في الرابط، أو تواصل فوراً مع الدعم الفني لمساعدتك."
                : "Please check the order number or contact our support team."}
            </p>
            <div className="flex justify-center gap-3 flex-wrap">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold hover:bg-white/10 transition"
              >
                {isAr ? "العودة للمتجر" : "Back to Home"}
              </Link>
              <a
                href={`https://wa.me/962776252313?text=${encodeURIComponent(supportMsg)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold shadow-lg shadow-emerald-500/20 hover:brightness-110 transition"
              >
                <WhatsAppSvg />
                {isAr ? "تواصل مع الدعم الفني" : "Contact Support"}
              </a>
            </div>
          </div>
        )}

        {/* Order Details Loaded */}
        {!loading && order && (
          <div className="space-y-6">
            
            {/* 3-Step Horizontal Stepper (Driffle Style) */}
            <div className="p-4 rounded-2xl bg-[#101522] border border-white/10 flex items-center justify-between text-xs sm:text-sm font-bold text-slate-400 overflow-x-auto gap-2">
              <div className="flex items-center gap-2 text-emerald-400 shrink-0">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 grid place-items-center text-xs">✓</span>
                <span>{isAr ? "السلة (Cart)" : "Cart"}</span>
              </div>
              <div className="h-0.5 flex-1 bg-emerald-500/30 min-w-[30px]" />
              <div className="flex items-center gap-2 text-emerald-400 shrink-0">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 grid place-items-center text-xs">✓</span>
                <span>{isAr ? "تأكيد الدفع (Checkout)" : "Checkout"}</span>
              </div>
              <div className="h-0.5 flex-1 bg-cyan-500/50 min-w-[30px]" />
              <div className="flex items-center gap-2 text-cyan-300 font-extrabold shrink-0">
                <span className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-400 grid place-items-center text-xs text-cyan-300 animate-pulse">3</span>
                <span>{isAr ? "الاستلام والتفعيل (Reveal)" : "Reveal Product"}</span>
              </div>
            </div>

            {/* Hero Header Card */}
            <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-[#141b2b] to-[#0c1018] border border-cyan-500/25 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
              
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6 mb-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-widest mb-1.5">
                    <span>⚡ GX STORE ORDER</span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-black text-white font-mono" dir="ltr">
                      #{order.order_number}
                    </h1>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(order.order_number, "order_no")}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition"
                      title="نسخ رقم الطلب"
                    >
                      {copiedKey === "order_no" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="text-xs text-slate-400 mt-2">
                    {isAr ? "تاريخ الطلب:" : "Order Date:"} {new Date(order.created_at).toLocaleString(isAr ? "ar-JO" : "en-GB", { dateStyle: "long", timeStyle: "short" })}
                  </div>
                </div>

                {/* Status Badge */}
                <div className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-extrabold ${statusInfo.color}`}>
                  {statusInfo.icon}
                  <span>{isAr ? statusInfo.labelAr : statusInfo.labelEn}</span>
                </div>
              </div>

              {/* Quick Customer Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-slate-400 mb-1">{isAr ? "اسم العميل" : "Customer"}</div>
                  <div className="font-bold text-white truncate">{order.customer_name || (isAr ? "عميل GX Store" : "Customer")}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-slate-400 mb-1">{isAr ? "طريقة الدفع" : "Payment"}</div>
                  <div className="font-bold text-cyan-300">
                    {order.delivery_data?.payment_method === "cliq"
                      ? (isAr ? "كليك (CliQ) 🇯🇴" : "CliQ 🇯🇴")
                      : order.delivery_data?.payment_method === "gx_wallet"
                      ? "GX Wallet 🌐"
                      : (isAr ? "دفع إلكتروني" : "Card / Electronic")}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-slate-400 mb-1">{isAr ? "إجمالي المبلغ" : "Total Paid"}</div>
                  <div className="font-bold text-emerald-400 font-mono text-sm">
                    {Number(order.total_jod).toFixed(2)} {isAr ? "د.أ" : "JOD"}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-slate-400 mb-1">{isAr ? "البريد الإلكتروني" : "Email"}</div>
                  <div className="font-semibold text-slate-300 truncate" dir="ltr">
                    {order.customer_email || order.delivery_data?.customer_email || "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* CRITICAL REASSURANCE BANNER (USER REQUEST: يمكنك رؤية المنتج دوماً في صفحة طلباتي) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-[#101726] to-[#0c1018] border border-cyan-500/30 flex flex-wrap items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 grid place-items-center text-cyan-300 shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">
                    {isAr
                      ? "✨ يمكنك دائماً رؤية هذا المنتج ورموز التفعيل والوصول إليها دوماً في صفحة طلباتي"
                      : "✨ You can reveal and view your product at any time in My Orders page"}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {isAr
                      ? "جميع أكوادك واشتراكاتك تبقى محفوظة في حسابك دائماً دون انقطاع."
                      : "All your digital keys and credentials remain safely stored in your account."}
                  </div>
                </div>
              </div>

              <Link
                to="/account"
                search={{ tab: "orders" }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition"
              >
                <span>{isAr ? "الانتقال لصفحة طلباتي" : "Go to My Orders"}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Delivered Product Keys & Credentials (DRIFFLE & GAMIVO REVEAL SECTION) */}
            {order.status === "delivered" && (
              <div className="p-6 sm:p-8 rounded-2xl bg-[#0f1422] border border-emerald-500/35 shadow-2xl">
                
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 grid place-items-center text-emerald-400">
                      <KeyRound className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-black text-white">
                        {isAr ? "استلام وتفعيل المنتج (Product Activation)" : "Product Activation Items"}
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {isAr
                          ? `عدد عناصر التفعيل: ${deliveryCodes.length || 1} • اضغط إظهار ونسخ المفتاح للاستخدام.`
                          : `Activation items: ${deliveryCodes.length || 1} • Click Reveal and Copy to use.`}
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    {isAr ? "مضمون 100% من GX Store" : "100% Verified Key"}
                  </span>
                </div>

                {/* Warning note (Gamivo style) */}
                <div className="mb-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-200/90 leading-relaxed">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>{isAr ? "تنبيه هام قبل الإظهار:" : "Important Notice:"}</strong>{" "}
                    {isAr
                      ? "يرجى التأكد من توافق المنتج مع حسابك وجهازك. بمجرد إظهار مفتاح التفعيل أو استلام بيانات الحساب، يعتبر المنتج مستلماً ومكتملاً ولا يمكن استرجاعه أو إلغاؤه بسبب الطبيعة الرقمية الفورية."
                      : "Please ensure your account/device is compatible. Once the activation item is displayed, it cannot be refunded or returned."}
                  </div>
                </div>

                {/* Digital keys loop */}
                {deliveryCodes.length > 0 ? (
                  <div className="space-y-4">
                    {deliveryCodes.map((code, idx) => {
                      const isRevealed = !!revealedKeys[idx];
                      const isAccount = code.kind === "account";
                      const isTopup = code.kind === "topup";
                      const isUrl = (code.value || "").startsWith("http://") || (code.value || "").startsWith("https://");

                      return (
                        <div
                          key={idx}
                          className="p-5 rounded-2xl bg-black/50 border border-white/10 hover:border-cyan-500/50 transition shadow-lg"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-sm text-white">
                                {code.label || (isAr ? `عنصر التفعيل #${idx + 1}` : `Activation Item #${idx + 1}`)}
                              </span>
                              {code.region && (
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                                  {code.region}
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 border border-white/10 text-slate-400">
                                {isTopup ? (isAr ? "شحن مباشر" : "Top-up") : isAccount ? (isAr ? "حساب جاهز" : "Account") : (isAr ? "مفتاح رقمي" : "Digital Key")}
                              </span>
                            </div>
                            
                            {!isTopup && !isRevealed && (
                              <Button
                                size="sm"
                                onClick={() => setRevealedKeys({ ...revealedKeys, [idx]: true })}
                                className="h-8 gap-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs shadow-md shadow-orange-500/25"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                {isAr ? "إظهار مفتاح التفعيل (Reveal)" : "Reveal Product"}
                              </Button>
                            )}
                          </div>

                          {/* Key content */}
                          {isTopup ? (
                            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span>{isAr ? "تم شحن الرصيد والاشتراك مباشرة على حسابك بنجاح." : "The top-up was processed directly on your account."}</span>
                            </div>
                          ) : isRevealed ? (
                            <div className="space-y-3 mt-3">
                              {isAccount ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                  {code.email && (
                                    <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
                                      <div>
                                        <span className="text-slate-400 block text-[10px]">{isAr ? "البريد / اسم المستخدم:" : "Username / Email:"}</span>
                                        <span className="font-mono text-cyan-300 font-bold text-sm" dir="ltr">{code.email}</span>
                                      </div>
                                      <button
                                        onClick={() => copyToClipboard(code.email || "", `email_${idx}`)}
                                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300"
                                      >
                                        {copiedKey === `email_${idx}` ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                      </button>
                                    </div>
                                  )}
                                  {code.password && (
                                    <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
                                      <div>
                                        <span className="text-slate-400 block text-[10px]">{isAr ? "كلمة المرور:" : "Password:"}</span>
                                        <span className="font-mono text-cyan-300 font-bold text-sm" dir="ltr">{code.password}</span>
                                      </div>
                                      <button
                                        onClick={() => copyToClipboard(code.password || "", `pwd_${idx}`)}
                                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300"
                                      >
                                        {copiedKey === `pwd_${idx}` ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="p-4 rounded-xl bg-black/80 border border-cyan-500/40">
                                  <div className="text-[11px] text-slate-400 mb-1.5 font-bold">
                                    {isAr ? "رمز أو رابط التفعيل الرقمي:" : "Activation Key / Link:"}
                                  </div>
                                  <div className="font-mono font-black text-cyan-300 text-sm sm:text-base break-all tracking-wider mb-3 select-all bg-white/[0.03] p-2.5 rounded-lg border border-white/5" dir="ltr">
                                    {code.value || "—"}
                                  </div>
                                  
                                  {/* Driffle & Gamivo Action Buttons */}
                                  <div className="flex flex-wrap items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => copyToClipboard(code.value || "", `key_${idx}`)}
                                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold inline-flex items-center gap-2 shadow-lg shadow-blue-500/20 transition"
                                    >
                                      {copiedKey === `key_${idx}` ? (
                                        <>
                                          <Check className="w-4 h-4 text-emerald-300" />
                                          <span>{isAr ? "تم النسخ بنجاح" : "Copied!"}</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-4 h-4" />
                                          <span>{isAr ? "نسخ إلى الحافظة (Copy)" : "Copy to clipboard"}</span>
                                        </>
                                      )}
                                    </button>

                                    {isUrl && (
                                      <a
                                        href={code.value}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-bold inline-flex items-center gap-2 transition"
                                      >
                                        <ExternalLink className="w-4 h-4 text-cyan-400" />
                                        <span>{isAr ? "دليل ورابط التفعيل المباشر" : "Activation Guide / Open Link"}</span>
                                      </a>
                                    )}
                                  </div>
                                </div>
                              )}

                              {code.extra && (
                                <div className="text-xs text-slate-300 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                  <strong>{isAr ? "معلومات إضافية:" : "Extra Info:"}</strong> {code.extra}
                                </div>
                              )}

                              <div className="text-[11px] text-slate-500 pt-1">
                                {isAr ? "✓ تم إظهار المفتاح وتجهيزه بنجاح" : "✓ Key revealed and ready to use"}
                              </div>
                            </div>
                          ) : (
                            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-dashed border-white/15 text-center text-slate-500 font-mono text-sm tracking-widest select-none" dir="ltr">
                              ••••-••••-••••-••••
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 text-center text-slate-400 text-sm">
                    {isAr ? "تم تسليم الطلب بنجاح. راجع الملاحظات أو تواصل مع الدعم لأي استفسار." : "Order delivered. Contact support if you need assistance."}
                  </div>
                )}

                {/* Admin notes & instructions */}
                {order.admin_notes && (
                  <div className="mt-5 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-xs leading-relaxed text-cyan-100">
                    <div className="font-bold text-cyan-300 mb-1 flex items-center gap-1.5">
                      <span>💡 {isAr ? "تعليمات وملاحظات الطلب والتفعيل:" : "Order Instructions & Notes:"}</span>
                    </div>
                    <div className="whitespace-pre-wrap">{order.admin_notes}</div>
                  </div>
                )}
              </div>
            )}

            {/* If Order is Cancelled */}
            {order.status === "cancelled" && (
              <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200">
                <div className="flex items-center gap-2 font-black text-lg text-rose-300 mb-2">
                  <XCircle className="w-6 h-6" />
                  <span>{isAr ? "تم إلغاء هذا الطلب" : "This order has been cancelled"}</span>
                </div>
                <p className="text-sm leading-relaxed text-rose-100/80 mb-4">
                  {isAr
                    ? "نحيطك علماً بأنه تم إلغاء الطلب من قِبل إدارة المتجر. إذا كان لديك استفسار أو قمت بالدفع مسبقاً، يمكنك التواصل فوراً مع الدعم الفني لحل الأمر أو استرجاع الرصيد."
                    : "This order was cancelled by store administration. Please contact support if you need a refund or assistance."}
                </p>
                {order.admin_notes && (
                  <div className="p-3.5 rounded-xl bg-black/40 border border-rose-500/25 text-xs text-rose-200">
                    <strong>{isAr ? "سبب الإلغاء / ملاحظة:" : "Cancellation Reason:"}</strong> {order.admin_notes}
                  </div>
                )}
              </div>
            )}

            {/* Order Items & Financial Summary (DRIFFLE STYLE) */}
            <div className="p-6 sm:p-8 rounded-2xl bg-[#0e131e] border border-white/10 shadow-xl">
              <h3 className="text-base font-extrabold text-white mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-cyan-400" />
                <span>{isAr ? `المنتجات المشمولة في الطلب (${items.length})` : `Your Order Items (${items.length})`}</span>
              </h3>

              <div className="divide-y divide-white/5 mb-6">
                {items.map((it: any, idx: number) => {
                  const qty = it.qty || it.quantity || 1;
                  const price = it.price != null ? `${Number(it.price).toFixed(2)} ${isAr ? "د.أ" : "JOD"}` : "";
                  return (
                    <div key={idx} className="py-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        {it.image ? (
                          <img
                            src={it.image}
                            alt={it.name}
                            className="w-14 h-14 rounded-xl object-cover border border-white/10 shrink-0 bg-[#121722]"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 grid place-items-center text-cyan-400 text-xl shrink-0">
                            🎮
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-extrabold text-white leading-snug">{it.name}</div>
                          <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-white/5 text-[11px] text-cyan-300 font-semibold">
                              {it.region ? (isAr ? `المنطقة: ${it.region}` : `Region: ${it.region}`) : (isAr ? "عالمي (Global)" : "Global")}
                            </span>
                            {qty > 1 && <span>• {isAr ? `الكمية: x${qty}` : `Qty: x${qty}`}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="font-mono font-black text-cyan-300 text-base shrink-0">
                        {price}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total Calculation */}
              <div className="border-t border-white/10 pt-4 space-y-2 text-xs">
                {order.subtotal_jod && Number(order.subtotal_jod) !== Number(order.total_jod) && (
                  <div className="flex justify-between text-slate-400">
                    <span>{isAr ? "المجموع الفرعي:" : "Subtotal:"}</span>
                    <span className="font-mono">{Number(order.subtotal_jod).toFixed(2)} {isAr ? "د.أ" : "JOD"}</span>
                  </div>
                )}
                {order.discount_jod && Number(order.discount_jod) > 0 && (
                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span>{isAr ? "الخصم المطبق:" : "Discount:"}</span>
                    <span className="font-mono">-{Number(order.discount_jod).toFixed(2)} {isAr ? "د.أ" : "JOD"}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-base font-black text-white pt-2 border-t border-white/5">
                  <span>{isAr ? "المبلغ الإجمالي المدفوع:" : "ORDER TOTAL:"}</span>
                  <span className="font-mono text-cyan-300 text-xl font-black">{Number(order.total_jod).toFixed(2)} {isAr ? "د.أ" : "JOD"}</span>
                </div>
              </div>
            </div>

            {/* Facing Issues? Support Section (DRIFFLE SCREENSHOT 2 STYLE) */}
            <div className="p-6 sm:p-7 rounded-2xl bg-[#0f1422] border border-white/10 shadow-lg">
              <h4 className="font-black text-white text-base mb-1.5 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-cyan-400" />
                <span>{isAr ? "هل تواجه أي مشكلة أو استفسار؟" : "Facing issues?"}</span>
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                {isAr
                  ? "فريق دعم GX Store سعيد بمساعدتك في أي وقت. تواصل معنا مباشرة عبر واتساب أو ديسكورد وسنقوم بالرد عليك فوراً."
                  : "If you experience any inconvenience, our Support Team is happy to help. Contact us and we will get back to you as soon as possible."}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={`https://wa.me/962776252313?text=${encodeURIComponent(supportMsg)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition"
                >
                  <WhatsAppSvg />
                  {isAr ? "محادثة الدعم الفني عبر واتساب" : "WhatsApp Support"}
                </a>
                <a
                  href="https://discord.gg/DvkUd5PgqV"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold text-xs shadow-lg shadow-[#5865F2]/20 transition"
                >
                  <DiscordSvg />
                  {isAr ? "سيرفر الدعم ديسكورد" : "Discord Support"}
                </a>
              </div>
            </div>

            {/* Continue Shopping Button */}
            <div className="text-center pt-2">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition"
              >
                <ShoppingBag className="w-4 h-4 text-cyan-400" />
                <span>{isAr ? "متابعة التسوق في المتجر (Continue Shopping)" : "Continue Shopping"}</span>
              </Link>
            </div>

          </div>
        )}

      </div>
    </StoreShell>
  );
}
