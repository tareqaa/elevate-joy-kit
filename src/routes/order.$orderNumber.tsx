import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { StoreShell } from "@/components/gx/StoreShell";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { useLang } from "@/lib/gx/i18n";
import { getOrderByNumberFn, markCodeRevealedFn, sanitizeImageForEmail } from "@/lib/gx/order-email.functions";
import { toast } from "sonner";
import {
  CheckCircle2, XCircle, Clock, Package, KeyRound, Copy, Check, Eye, EyeOff,
  ExternalLink, Sparkles, Loader2, ShoppingBag, Lock, AlertCircle,
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

  const handleReveal = (idx: number) => {
    setRevealedKeys((prev) => ({ ...prev, [idx]: !prev[idx] }));
    if (order_token) {
      markCodeRevealedFn({ data: { orderToken: order_token.trim() } }).catch(() => {});
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
        labelAr: "مُسلَّم ومكتمل",
        labelEn: "Delivered & Ready",
        badgeBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
      };
    }
    if (s === "cancelled") {
      return {
        labelAr: "تم إلغاء الطلب",
        labelEn: "Cancelled",
        badgeBg: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        icon: <XCircle className="w-4 h-4 text-rose-400" />,
      };
    }
    return {
      labelAr: "قيد التجهيز",
      labelEn: "Processing",
      badgeBg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      icon: <Clock className="w-4 h-4 text-amber-400" />,
    };
  }, [order?.status]);

  return (
    <StoreShell>
      <div className="min-h-[85vh] bg-[#07090e] text-slate-100 py-12 px-4 sm:px-6 flex flex-col justify-center items-center" dir={dir}>
        <div className="w-full max-w-xl space-y-5">

          {/* Loading State */}
          {loading && (
            <div className="rounded-2xl border border-white/5 bg-[#0e1320] p-12 text-center space-y-4 shadow-xl">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
              <div className="text-sm font-semibold text-slate-300">
                {isAr ? "جارٍ استرجاع بيانات الطلب..." : "Loading order details..."}
              </div>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="rounded-2xl border border-white/10 bg-[#0e1320] p-8 text-center space-y-5 shadow-xl">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h2 className="text-lg font-bold text-white">
                  {isAr ? "تعذر العثور على هذا الطلب" : "Order Not Found"}
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {error}
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-white/10 transition-all"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{isAr ? "العودة للمتجر" : "Back to Store"}</span>
                </Link>
              </div>
            </div>
          )}

          {/* Order Details Loaded */}
          {!loading && order && (
            <div className="rounded-2xl border border-white/10 bg-[#0d121c] p-5 sm:p-7 shadow-2xl space-y-6">

              {/* Order Header */}
              <div className="text-center space-y-2 pb-5 border-b border-white/5">
                {order.status === "delivered" ? (
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mx-auto mb-2">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                ) : order.status === "cancelled" ? (
                  <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400 mx-auto mb-2">
                    <XCircle className="w-6 h-6" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 mx-auto mb-2">
                    <Clock className="w-6 h-6" />
                  </div>
                )}

                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  {order.status === "delivered"
                    ? (isAr ? "تم تسليم طلبك بنجاح" : "Your Order is Ready!")
                    : order.status === "cancelled"
                    ? (isAr ? "تم إلغاء الطلب" : "Order Cancelled")
                    : (isAr ? "طلبك قيد التجهيز" : "Order is Processing")}
                </h1>

                <div className="flex items-center justify-center gap-2 text-xs text-slate-400 flex-wrap">
                  <span>{isAr ? "طلب رقم" : "Order"} <strong className="text-slate-200 font-mono">#{order.order_number}</strong></span>
                  <span>•</span>
                  <span>
                    {new Date(order.created_at).toLocaleDateString(isAr ? "ar-JO" : "en-US", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span>•</span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-medium ${statusInfo.badgeBg}`}>
                    {statusInfo.icon}
                    <span>{isAr ? statusInfo.labelAr : statusInfo.labelEn}</span>
                  </span>
                </div>
              </div>

              {/* Locked view when guest visits without token */}
              {isLocked ? (
                <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-5 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div className="text-sm font-bold text-white">
                    {isAr ? "هذا الطلب محمي" : "Protected Order"}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                    {isAr
                      ? "لعرض الكود وبيانات التفعيل، يرجى فتح الرابط السري المرسل إلى بريدك الإلكتروني، أو تسجيل الدخول بنفس الحساب."
                      : "To access activation keys, please open the secret link sent to your email or log in."}
                  </p>
                  <div className="pt-2 flex justify-center gap-2.5 flex-wrap">
                    <Link
                      to="/auth"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all"
                    >
                      {isAr ? "تسجيل الدخول" : "Log In"}
                    </Link>
                    <Link
                      to="/"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs border border-white/10 transition-all"
                    >
                      {isAr ? "الرئيسية" : "Home"}
                    </Link>
                  </div>
                </div>
              ) : (
                /* HERO: Digital Code / Activation Box */
                order.status === "delivered" && (
                  <div className="space-y-3.5">
                    <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-cyan-400" />
                      <span>{isAr ? "بيانات الكود والتفعيل" : "Activation Details"}</span>
                    </div>

                    {deliveryCodes.length === 0 ? (
                      <div className="rounded-xl border border-white/5 bg-slate-900/50 p-5 text-center text-sm text-slate-300">
                        {isAr ? "تم إتمام الطلب وتفعيله لحسابك مباشرة." : "Your order has been completed and activated."}
                      </div>
                    ) : (
                      deliveryCodes.map((code, idx) => {
                        const displayValue = code.value || code.extra || "";
                        const isRevealed = revealedKeys[idx] ?? true;
                        const kind = code.kind || "code";

                        return (
                          <div
                            key={idx}
                            className="rounded-xl border border-cyan-500/20 bg-slate-950/70 p-4 sm:p-5 space-y-3.5"
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                              <span className="font-bold text-white">
                                {code.label || (isAr ? `كود المنتج #${idx + 1}` : `Product Code #${idx + 1}`)}
                              </span>

                              <div className="flex items-center gap-1.5">
                                {code.region && (
                                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px] font-medium border border-white/5">
                                    {code.region}
                                  </span>
                                )}
                                {kind === "account" && (
                                  <span className="px-2 py-0.5 rounded bg-purple-950/70 text-purple-300 text-[11px] font-medium border border-purple-800/40">
                                    {isAr ? "حساب" : "Account"}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="rounded-lg border border-white/10 bg-[#06080d] p-3 flex items-center justify-between gap-3">
                              <div className="font-mono text-base sm:text-lg font-bold tracking-wider text-cyan-300 select-all break-all">
                                {isRevealed ? displayValue : "••••••••••••••••"}
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleReveal(idx)}
                                  title={isRevealed ? (isAr ? "إخفاء" : "Hide") : (isAr ? "إظهار" : "Reveal")}
                                  className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs"
                                >
                                  {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(displayValue, `code-${idx}`)}
                                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-sm ${
                                    copiedKey === `code-${idx}`
                                      ? "bg-emerald-500 text-slate-950"
                                      : "bg-cyan-500 hover:bg-cyan-400 text-slate-950"
                                  }`}
                                >
                                  {copiedKey === `code-${idx}` ? (
                                    <>
                                      <Check className="w-3.5 h-3.5" />
                                      <span>{isAr ? "تم النسخ" : "Copied"}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>{isAr ? "نسخ الكود" : "Copy Code"}</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            {kind === "account" && (code.email || code.password) && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                {code.email && (
                                  <div className="rounded-lg bg-slate-900/60 border border-white/5 p-2.5 flex items-center justify-between text-xs">
                                    <div>
                                      <div className="text-[10px] text-slate-400 font-bold">{isAr ? "الإيميل" : "Email"}</div>
                                      <div className="font-mono text-white mt-0.5 break-all">{code.email}</div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => copyToClipboard(code.email!, `email-${idx}`)}
                                      className="text-cyan-400 hover:text-cyan-300 p-1"
                                      title={isAr ? "نسخ" : "Copy"}
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                                {code.password && (
                                  <div className="rounded-lg bg-slate-900/60 border border-white/5 p-2.5 flex items-center justify-between text-xs">
                                    <div>
                                      <div className="text-[10px] text-slate-400 font-bold">{isAr ? "كلمة المرور" : "Password"}</div>
                                      <div className="font-mono text-white mt-0.5 break-all">{code.password}</div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => copyToClipboard(code.password!, `pass-${idx}`)}
                                      className="text-cyan-400 hover:text-cyan-300 p-1"
                                      title={isAr ? "نسخ" : "Copy"}
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {code.extra && kind !== "account" && (
                              <div className="text-xs text-slate-300 bg-slate-900/40 rounded-lg p-2 border border-white/5">
                                {code.extra}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )
              )}

              {/* Reassurance Banner */}
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-3.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 text-slate-300">
                  <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>
                    {isAr
                      ? "يمكنك دائماً رؤية هذا المنتج والوصول لرموز التفعيل في صفحة طلباتي."
                      : "You can always access your activation codes anytime in My Orders."}
                  </span>
                </div>
                <Link
                  to="/_authenticated/account"
                  search={{ tab: "orders" }}
                  className="text-cyan-400 hover:text-cyan-300 font-bold shrink-0 underline underline-offset-4"
                >
                  {isAr ? "طلباتي" : "My Orders"}
                </Link>
              </div>

              {/* Simple Products Summary */}
              <div className="pt-3 border-t border-white/5 space-y-2.5">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {isAr ? "المنتجات المطلوبة" : "Ordered Items"}
                </div>

                <div className="space-y-2">
                  {Array.isArray(order.items) &&
                    order.items.map((it: any, i: number) => {
                      const qty = it.qty || it.quantity || 1;
                      const coverImg = sanitizeImageForEmail(it.image, it.name, it.product_slug || it.slug);

                      return (
                        <div
                          key={i}
                          className="rounded-xl bg-slate-950/50 border border-white/5 p-3 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            {coverImg ? (
                              <img
                                src={coverImg}
                                alt={it.name}
                                className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-800 border border-white/5 flex items-center justify-center text-sm shrink-0">
                                🎮
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-white">{it.name}</div>
                              <div className="text-slate-400 text-[11px] mt-0.5">
                                {isAr ? "الكمية:" : "Qty:"} {qty} {it.region ? `• ${it.region}` : ""}
                              </div>
                            </div>
                          </div>

                          <div className="font-mono font-bold text-slate-200">
                            {it.price != null ? `${(Number(it.price) * qty).toFixed(2)} د.أ` : "—"}
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Total Paid */}
                <div className="flex justify-between items-center pt-2 text-xs">
                  <span className="text-slate-400">{isAr ? "المبلغ الإجمالي المدفوع:" : "Total Paid:"}</span>
                  <span className="font-mono text-sm font-bold text-cyan-400">
                    {Number(order.total_jod || 0).toFixed(2)} د.أ
                  </span>
                </div>
              </div>

              {/* Support Button (WhatsApp) */}
              <div className="pt-2 text-center">
                <a
                  href={`https://wa.me/962776252313?text=${encodeURIComponent(
                    `مرحباً GX Store، أود المساعدة بشأن طلبي رقم #${order.order_number}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-emerald-400 transition-colors py-1 px-3"
                >
                  <WhatsAppSvg />
                  <span>{isAr ? "تحتاج مساعدة في التفعيل؟ تواصل مع الدعم عبر واتساب" : "Need help? Contact support on WhatsApp"}</span>
                </a>
              </div>

            </div>
          )}

        </div>
      </div>
    </StoreShell>
  );
}
