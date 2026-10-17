import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { StoreShell } from "@/components/gx/StoreShell";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { useLang } from "@/lib/gx/i18n";
import { getOrderByNumberFn, markCodeRevealedFn, sanitizeImageForEmail } from "@/lib/gx/order-email.functions";
import { toast } from "sonner";
import {
  CheckCircle2, XCircle, Clock, Package, KeyRound, Copy, Check, Eye,
  ExternalLink, Sparkles, Loader2, ShoppingBag, AlertTriangle, Lock,
  ChevronDown, ChevronUp, HelpCircle,
} from "lucide-react";

export const Route = createFileRoute("/order/$orderNumber")({
  validateSearch: (search: Record<string, unknown>) => ({
    order_token: typeof search.order_token === "string" ? search.order_token : "",
  }),
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

function OrderDetailsPage() {
  const { orderNumber } = Route.useParams();
  const { order_token } = Route.useSearch();
  const { lang, dir } = useLang();
  const isAr = lang === "ar";

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Record<number, boolean>>({});
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    getOrderByNumberFn({
      data: {
        orderNumber,
        orderToken: order_token || undefined,
      },
    })
      .then((res) => {
        if (!mounted) return;
        if (res.ok && res.order) {
          setOrder(res.order);
          setIsLocked(Boolean(res.isLocked));
          if (res.order.codes_revealed_at) {
            setRevealedKeys({ 0: true, 1: true, 2: true, 3: true, 4: true });
          }
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
  }, [orderNumber, order_token, isAr]);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopiedKey(id);
      toast.success(isAr ? "تم نسخ الكود بنجاح!" : "Copied to clipboard!");
      setTimeout(() => setCopiedKey(null), 2500);

      if (order_token) {
        markCodeRevealedFn({ data: { orderToken: order_token.trim() } }).catch(() => {});
      }
    } catch {
      toast.error(isAr ? "فشل النسخ تلقائياً" : "Failed to copy");
    }
  };

  const handleRevealKey = async (idx: number) => {
    setRevealedKeys((prev) => ({ ...prev, [idx]: true }));
    if (order_token) {
      try {
        await markCodeRevealedFn({ data: { orderToken: order_token.trim() } });
      } catch {
        // silent
      }
    }
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

  const items = useMemo(() => {
    return Array.isArray(order?.items) ? order.items : [];
  }, [order]);

  return (
    <StoreShell>
      <div className="min-h-screen bg-[#07090e] text-slate-100 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 selection:bg-cyan-500 selection:text-black" dir={dir}>
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Gamivo Top Notice */}
          <div className="rounded-xl border border-amber-500/25 bg-amber-950/20 px-4 py-3 text-xs sm:text-sm text-amber-200/90 flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {isAr
                ? "يرجى التأكد من أنك قمت بشراء المنتج الصحيح. بمجرد الضغط على «عرض الكود»، يعتبر المفتاح الرقمي مستلماً ولا يمكن استرجاعه."
                : "Please make sure you've purchased the correct product. Once the activation item is displayed, it cannot be returned."}
            </span>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="rounded-2xl border border-white/10 bg-[#0e1422] p-16 text-center space-y-4 shadow-xl">
              <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto" />
              <div className="text-base font-bold text-slate-200">
                {isAr ? "جارٍ تحميل تفاصيل الطلب..." : "Loading order details..."}
              </div>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="rounded-2xl border border-rose-500/30 bg-[#0e1422] p-8 sm:p-12 text-center space-y-5 shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h2 className="text-xl font-bold text-white">
                  {isAr ? "تعذر العثور على هذا الطلب" : "Order Not Found"}
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {error}
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-white/10 transition-all"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{isAr ? "العودة للمتجر" : "Back to Store"}</span>
                </Link>
              </div>
            </div>
          )}

          {/* Order Details Loaded */}
          {!loading && order && (
            <div className="space-y-6">

              {/* Order Details Top Bar */}
              <div className="rounded-2xl border border-white/10 bg-[#0d121c] p-5 sm:p-6 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {isAr ? "رقم الطلب (ORDER ID)" : "ORDER ID"}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xl sm:text-2xl font-black font-mono text-white select-all" dir="ltr">
                        #{order.order_number}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${statusInfo.badgeBg}`}>
                        {statusInfo.icon}
                        <span>{isAr ? statusInfo.labelAr : statusInfo.labelEn}</span>
                      </span>
                    </div>
                  </div>

                  <div className="text-right sm:text-left space-y-1">
                    <div className="text-xs font-bold text-slate-400">
                      {isAr ? "تاريخ الطلب" : "Order Date"}
                    </div>
                    <div className="text-xs sm:text-sm font-semibold text-slate-300">
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

                {/* Collapsible Order Summary Bar */}
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span>{isAr ? "المجموع المدفوع:" : "Total Paid:"}</span>
                    <strong className="text-cyan-400 text-sm font-mono font-bold">
                      {Number(order.total_jod || 0).toFixed(2)} د.أ
                    </strong>
                    {order.delivery_data?.payment_method && (
                      <span className="text-slate-500">• {String(order.delivery_data.payment_method).toUpperCase()}</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowOrderDetails(!showOrderDetails)}
                    className="inline-flex items-center gap-1 text-slate-300 hover:text-cyan-300 font-bold transition-colors"
                  >
                    <span>{showOrderDetails ? (isAr ? "إخفاء التفاصيل" : "Hide Details") : (isAr ? "تفاصيل الطلب والفاتورة" : "Order Details")}</span>
                    {showOrderDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {showOrderDetails && (
                  <div className="mt-4 pt-4 border-t border-white/5 space-y-3 text-xs animate-in fade-in-50 duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-black/30 rounded-xl p-4 border border-white/5">
                      <div>
                        <span className="text-slate-400">{isAr ? "اسم العميل:" : "Customer:"} </span>
                        <strong className="text-slate-200">{order.customer_name || "عميل GX"}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">{isAr ? "البريد الإلكتروني:" : "Email:"} </span>
                        <strong className="text-slate-200 font-mono">{order.customer_email || order.user_email || "—"}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">{isAr ? "المجموع الفرعي:" : "Subtotal:"} </span>
                        <strong className="text-slate-200 font-mono">{Number(order.subtotal_jod ?? order.total_jod).toFixed(2)} د.أ</strong>
                      </div>
                      {order.discount_jod && Number(order.discount_jod) > 0 ? (
                        <div>
                          <span className="text-emerald-400">{isAr ? "الخصم المطبق:" : "Discount:"} </span>
                          <strong className="text-emerald-300 font-mono">-{Number(order.discount_jod).toFixed(2)} د.أ</strong>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>

              {/* Locked view when guest visits without token */}
              {isLocked ? (
                <div className="rounded-2xl border border-amber-500/25 bg-[#0e1422] p-8 sm:p-10 text-center space-y-4 shadow-xl">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                    <Lock className="w-7 h-7" />
                  </div>
                  <div className="space-y-1.5 max-w-md mx-auto">
                    <h3 className="text-lg font-bold text-white">
                      {isAr ? "مفاتيح هذا الطلب محمية" : "Protected Order"}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {isAr
                        ? "لعرض كود التفعيل الرقمي، يرجى فتح الرابط السري المشفر المرسل إلى بريدك الإلكتروني، أو تسجيل الدخول بنفس الحساب."
                        : "To access activation keys, please open the secret link sent to your email or log in."}
                    </p>
                  </div>
                  <div className="pt-2 flex justify-center gap-3 flex-wrap">
                    <Link
                      to="/auth"
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-md"
                    >
                      {isAr ? "تسجيل الدخول" : "Log In"}
                    </Link>
                    <Link
                      to="/"
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs border border-white/10 transition-all"
                    >
                      {isAr ? "الرئيسية" : "Home"}
                    </Link>
                  </div>
                </div>
              ) : (
                /* PRODUCTS & ACTIVATION SECTION (Gamivo Hero Card) */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                      <Package className="w-5 h-5 text-cyan-400" />
                      <span>{isAr ? "المنتجات ومفاتيح التفعيل الرقمية" : "Products & Digital Keys"}</span>
                    </h2>
                    <span className="text-xs text-slate-400 font-mono font-bold">
                      {deliveryCodes.length > 0 ? `${deliveryCodes.length} ${isAr ? "مفاتيح" : "Items"}` : ""}
                    </span>
                  </div>

                  {items.map((it: any, itemIdx: number) => {
                    const coverImg = sanitizeImageForEmail(it.image, it.name, it.product_slug || it.slug);
                    const qty = it.qty || it.quantity || 1;

                    return (
                      <div
                        key={itemIdx}
                        className="rounded-2xl border border-white/10 bg-[#0e1422] p-5 sm:p-6 shadow-xl space-y-5"
                      >
                        <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
                          {coverImg ? (
                            <img
                              src={coverImg}
                              alt={it.name}
                              className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border border-white/10 shrink-0 bg-slate-900 shadow-md"
                            />
                          ) : (
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-3xl shrink-0">
                              🎮
                            </div>
                          )}

                          <div className="flex-1 min-w-[200px] space-y-2">
                            <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                              {it.name}
                            </h3>

                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-white/5 font-semibold">
                                {isAr ? "المنصة:" : "Platform:"} {it.platform || "Digital Code"}
                              </span>

                              {it.region && (
                                <span className="px-2.5 py-1 rounded-lg bg-cyan-950/60 text-cyan-300 border border-cyan-800/40 font-semibold">
                                  {isAr ? "المنطقة:" : "Region:"} {it.region}
                                </span>
                              )}

                              <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 font-semibold">
                                {isAr ? "الكمية:" : "Qty:"} {qty}
                              </span>

                              <span className="font-mono font-bold text-slate-200 ml-auto">
                                {it.price != null ? `${(Number(it.price) * qty).toFixed(2)} د.أ` : ""}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-white/5" />

                        {order.status === "delivered" && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
                              <span className="flex items-center gap-1.5 text-cyan-300">
                                <KeyRound className="w-4 h-4 text-cyan-400" />
                                <span>{isAr ? "كود التفعيل الرقمي (Digital Activation Item)" : "Digital Activation Item"}</span>
                              </span>
                            </div>

                            {deliveryCodes.length === 0 ? (
                              <div className="rounded-xl border border-white/5 bg-black/40 p-5 text-center text-xs text-slate-300">
                                {isAr ? "تم إكمال الطلب وتفعيله لحسابك مباشرة." : "Delivered and activated to your account."}
                              </div>
                            ) : (
                              deliveryCodes.map((code, codeIdx) => {
                                const isRevealed = revealedKeys[codeIdx];
                                const displayValue = code.value || code.extra || "";
                                const kind = code.kind || "code";

                                return (
                                  <div key={codeIdx} className="space-y-3">
                                    {!isRevealed ? (
                                      <div className="rounded-xl border border-cyan-500/30 bg-[#06080d] p-5 sm:p-6 text-center space-y-3 shadow-inner">
                                        <div className="font-mono text-xl sm:text-2xl font-bold tracking-widest text-slate-600 select-none">
                                          ••••-••••-••••-••••-••••
                                        </div>
                                        <div>
                                          <button
                                            type="button"
                                            onClick={() => handleRevealKey(codeIdx)}
                                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-slate-950 font-black text-sm shadow-lg shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5"
                                          >
                                            <Eye className="w-4 h-4" />
                                            <span>{isAr ? "عرض كود التفعيل (Display Key)" : "Display Activation Key"}</span>
                                          </button>
                                        </div>
                                        <p className="text-[11px] text-slate-400 max-w-md mx-auto leading-relaxed">
                                          {isAr
                                            ? "الضغط على «عرض كود التفعيل» سيكشف الكود ويسجل استلامك له في لوحة التحكم."
                                            : "Clicking display will reveal your key and record delivery in the system."}
                                        </p>
                                      </div>
                                    ) : (
                                      <div className="rounded-xl border border-cyan-500/40 bg-[#06080d] p-4 sm:p-5 space-y-3 shadow-lg">
                                        <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                                          <div className="font-mono text-lg sm:text-2xl font-bold tracking-widest text-cyan-300 select-all break-all bg-black/40 px-4 py-3 rounded-lg border border-white/5 flex-1 min-w-[200px]">
                                            {displayValue}
                                          </div>

                                          <button
                                            type="button"
                                            onClick={() => copyToClipboard(displayValue, `code-${codeIdx}`)}
                                            className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-black transition-all shrink-0 shadow-md ${
                                              copiedKey === `code-${codeIdx}`
                                                ? "bg-emerald-500 text-slate-950"
                                                : "bg-cyan-500 hover:bg-cyan-400 text-slate-950"
                                            }`}
                                          >
                                            {copiedKey === `code-${codeIdx}` ? (
                                              <>
                                                <Check className="w-4 h-4 text-emerald-950" />
                                                <span>{isAr ? "تم النسخ بنجاح!" : "Copied!"}</span>
                                              </>
                                            ) : (
                                              <>
                                                <Copy className="w-4 h-4" />
                                                <span>{isAr ? "نسخ الكود (Copy)" : "Copy Key"}</span>
                                              </>
                                            )}
                                          </button>
                                        </div>

                                        {kind === "account" && (code.email || code.password) && (
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                            {code.email && (
                                              <div className="rounded-xl bg-slate-900/80 border border-white/5 p-3 flex items-center justify-between">
                                                <div>
                                                  <div className="text-[10px] text-slate-400 font-bold uppercase">{isAr ? "الإيميل" : "Email"}</div>
                                                  <div className="font-mono text-xs sm:text-sm text-white break-all mt-0.5">{code.email}</div>
                                                </div>
                                                <button
                                                  type="button"
                                                  onClick={() => copyToClipboard(code.email!, `email-${codeIdx}`)}
                                                  className="text-cyan-400 hover:text-cyan-300 p-1.5"
                                                  title={isAr ? "نسخ" : "Copy"}
                                                >
                                                  <Copy className="w-4 h-4" />
                                                </button>
                                              </div>
                                            )}
                                            {code.password && (
                                              <div className="rounded-xl bg-slate-900/80 border border-white/5 p-3 flex items-center justify-between">
                                                <div>
                                                  <div className="text-[10px] text-slate-400 font-bold uppercase">{isAr ? "كلمة المرور" : "Password"}</div>
                                                  <div className="font-mono text-xs sm:text-sm text-white break-all mt-0.5">{code.password}</div>
                                                </div>
                                                <button
                                                  type="button"
                                                  onClick={() => copyToClipboard(code.password!, `pass-${codeIdx}`)}
                                                  className="text-cyan-400 hover:text-cyan-300 p-1.5"
                                                  title={isAr ? "نسخ" : "Copy"}
                                                >
                                                  <Copy className="w-4 h-4" />
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {code.extra && kind !== "account" && (
                                          <div className="text-xs text-slate-300 bg-slate-900/50 rounded-lg p-2.5 border border-white/5">
                                            {code.extra}
                                          </div>
                                        )}

                                        <p className="text-[11px] text-emerald-400/80 flex items-center gap-1.5 pt-1">
                                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                          <span>{isAr ? "تم إظهار الكود بنجاح وتسجيل الاستلام. يرجى تفعيله على حسابك." : "Key revealed and delivered successfully."}</span>
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}

                        {order.status === "cancelled" && (
                          <div className="rounded-xl border border-rose-500/25 bg-rose-950/20 p-4 text-xs text-rose-200 space-y-1">
                            <strong className="text-rose-300">{isAr ? "ملاحظة الإلغاء من الإدارة:" : "Cancellation Notice:"}</strong>
                            <p className="text-slate-300 leading-relaxed">{order.admin_notes || (isAr ? "تم إلغاء هذا الطلب من قبل الإدارة." : "Order cancelled.")}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Reassurance Banner */}
              <div className="rounded-2xl border border-cyan-500/25 bg-gradient-to-r from-cyan-950/30 via-slate-900/60 to-slate-950 p-4 sm:p-5 flex items-center justify-between gap-4 shadow-lg flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-white">
                      {isAr
                        ? "✨ يمكنك دائماً الرجوع لهذا الكود والوصول إليه دوماً في صفحة طلباتي."
                        : "✨ You can always access your activation codes anytime in your My Orders page."}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {isAr
                        ? "سجل الدخول بنفس هذا الإيميل لتجد جميع مشترياتك محفوظة بشكل دائم في حسابك."
                        : "Log in with this email anytime to view your order history."}
                    </div>
                  </div>
                </div>

                <Link
                  to="/_authenticated/account"
                  search={{ tab: "orders" }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-bold text-xs shrink-0 transition-all"
                >
                  <span>{isAr ? "صفحة طلباتي" : "My Orders"}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Support & Assistance Card */}
              <div className="rounded-2xl border border-white/10 bg-[#0d121c] p-5 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="space-y-0.5">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-cyan-400" />
                    <span>{isAr ? "تحتاج مساعدة في تفعيل الكود؟" : "Need help activating your code?"}</span>
                  </div>
                  <div className="text-slate-400">
                    {isAr
                      ? "فريق دعم GX Store متواجد لمساعدتك خطوة بخطوة عبر واتساب."
                      : "Our support team is available on WhatsApp to guide you."}
                  </div>
                </div>

                <a
                  href={`https://wa.me/962776252313?text=${encodeURIComponent(
                    `مرحباً GX Store، أود المساعدة بشأن طلبي رقم #${order.order_number}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shrink-0"
                >
                  <WhatsAppSvg />
                  <span>{isAr ? "واتساب الدعم الفني" : "WhatsApp Support"}</span>
                </a>
              </div>

            </div>
          )}

        </div>
      </div>
    </StoreShell>
  );
}
