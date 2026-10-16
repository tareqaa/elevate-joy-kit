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
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/order/$orderNumber")({
  head: ({ params }) => ({
    meta: [
      { title: `طلب #${params.orderNumber} | متجر GX Store` },
      { name: "description", content: `تفاصيل واستلام الطلب #${params.orderNumber} من متجر GX Store` },
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
    getOrderByNumberFn({ data: { orderNumber } })
      .then((res) => {
        if (!mounted) return;
        if (res.ok && res.order) {
          setOrder(res.order);
        } else {
          setError(res.error || "لم يتم العثور على الطلب");
        }
      })
      .catch((err) => {
        if (mounted) setError(err.message || "حدث خطأ أثناء تحميل الطلب");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [orderNumber]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    toast.success(isAr ? "تم النسخ بنجاح!" : "Copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 2000);
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
        labelAr: "تم التسليم بنجاح",
        labelEn: "Delivered",
        color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
      };
    }
    if (s === "cancelled") {
      return {
        labelAr: "ملغى",
        labelEn: "Cancelled",
        color: "text-rose-400 bg-rose-500/10 border-rose-500/30",
        icon: <XCircle className="w-5 h-5 text-rose-400" />,
      };
    }
    if (s === "paid" || s === "processing") {
      return {
        labelAr: "قيد التجهيز والتسليم",
        labelEn: "Processing",
        color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
        icon: <Package className="w-5 h-5 text-cyan-400 animate-pulse" />,
      };
    }
    return {
      labelAr: "قيد المراجعة والدفع",
      labelEn: "Pending Payment",
      color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
      icon: <Clock className="w-5 h-5 text-amber-400" />,
    };
  }, [order?.status]);

  const items = useMemo(() => {
    return Array.isArray(order?.items) ? order.items : [];
  }, [order]);

  const supportMsg = useMemo(() => {
    return `مرحباً، أود الاستفسار بشأن طلبي رقم #${orderNumber} في متجر GX Store.`;
  }, [orderNumber]);

  return (
    <StoreShell>
      <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto" dir={dir}>
        
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">جاري تحميل بيانات الطلب...</h2>
            <p className="text-slate-400 text-sm">لحظات ويتم عرض معلومات طلبك ورموز التفعيل.</p>
          </div>
        )}

        {/* Error / Not Found */}
        {!loading && error && (
          <div className="p-8 rounded-2xl bg-[#111622] border border-rose-500/30 text-center max-w-lg mx-auto shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 grid place-items-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-white mb-2">تعذر العثور على الطلب</h2>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              تأكد من صحة رقم الطلب المكتوب في الرابط. إذا كنت متأكداً من إتمام الطلب، يمكنك التواصل فوراً مع الدعم الفني لحل الأمر.
            </p>
            <div className="flex justify-center gap-3">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold hover:bg-white/10 transition"
              >
                العودة للرئيسية
              </Link>
              <a
                href={`https://wa.me/962776252313?text=${encodeURIComponent(supportMsg)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold shadow-lg shadow-emerald-500/20 hover:brightness-110 transition"
              >
                <WhatsAppSvg />
                تواصل مع الدعم
              </a>
            </div>
          </div>
        )}

        {/* Order Details Loaded */}
        {!loading && order && (
          <div className="space-y-6">
            
            {/* Hero Header Card */}
            <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-[#141b2b] to-[#0d121c] border border-cyan-500/20 shadow-2xl relative overflow-hidden">
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
                    تاريخ الطلب: {new Date(order.created_at).toLocaleString("ar-EG", { dateStyle: "long", timeStyle: "short" })}
                  </div>
                </div>

                {/* Status Badge */}
                <div className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-xl border text-sm font-extrabold ${statusInfo.color}`}>
                  {statusInfo.icon}
                  <span>{isAr ? statusInfo.labelAr : statusInfo.labelEn}</span>
                </div>
              </div>

              {/* Quick Customer Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-slate-400 mb-1">اسم العميل</div>
                  <div className="font-bold text-white truncate">{order.customer_name || "عميل GX Store"}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-slate-400 mb-1">طريقة الدفع</div>
                  <div className="font-bold text-cyan-300">
                    {order.delivery_data?.payment_method === "cliq"
                      ? "خدمة كليك (CliQ) 🇯🇴"
                      : order.delivery_data?.payment_method === "gx_wallet"
                      ? "محفظة GX Wallet 🌐"
                      : "دفع إلكتروني"}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-slate-400 mb-1">إجمالي المبلغ</div>
                  <div className="font-bold text-emerald-400 font-mono text-sm">
                    {Number(order.total_jod).toFixed(2)} د.أ
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-slate-400 mb-1">البريد الإلكتروني</div>
                  <div className="font-semibold text-slate-300 truncate" dir="ltr">
                    {order.customer_email || order.delivery_data?.customer_email || "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Delivered Product Keys & Credentials (Redeem Section) */}
            {order.status === "delivered" && (
              <div className="p-6 sm:p-8 rounded-2xl bg-[#0f1420] border border-emerald-500/30 shadow-2xl">
                <div className="flex items-center justify-between gap-3 mb-6 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 grid place-items-center text-emerald-400">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-black text-white">
                        {isAr ? "مفاتيح وبيانات التفعيل (جاهزة للاستلام)" : "Activation Keys & Credentials"}
                      </h2>
                      <p className="text-xs text-slate-400">
                        {isAr ? "انقر على زر الإظهار والنسخ لتفعيل منتجك فوراً." : "Click Reveal & Copy to use your keys."}
                      </p>
                    </div>
                  </div>
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    مُسلَّم ومضمون 100%
                  </span>
                </div>

                {/* Digital keys loop */}
                {deliveryCodes.length > 0 ? (
                  <div className="space-y-4">
                    {deliveryCodes.map((code, idx) => {
                      const isRevealed = !!revealedKeys[idx];
                      const isAccount = code.kind === "account";
                      const isTopup = code.kind === "topup";

                      return (
                        <div
                          key={idx}
                          className="p-4 sm:p-5 rounded-xl bg-black/40 border border-white/10 hover:border-cyan-500/40 transition"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-white">
                                {code.label || `المفتاح رقم ${idx + 1}`}
                              </span>
                              {code.region && (
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/10 border border-cyan-500/25 text-cyan-300">
                                  {code.region}
                                </span>
                              )}
                            </div>
                            
                            {!isTopup && !isRevealed && (
                              <Button
                                size="sm"
                                onClick={() => setRevealedKeys({ ...revealedKeys, [idx]: true })}
                                className="h-8 gap-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                {isAr ? "إظهار المفتاح" : "Reveal Key"}
                              </Button>
                            )}
                          </div>

                          {/* Key content */}
                          {isTopup ? (
                            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span>تمت تعبئة الرصيد والاشتراك على حسابك بنجاح.</span>
                            </div>
                          ) : isRevealed ? (
                            <div className="space-y-2 mt-2">
                              {isAccount ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                  {code.email && (
                                    <div className="p-2.5 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-between">
                                      <div>
                                        <span className="text-slate-400 block text-[10px]">الإيميل / المستخدم:</span>
                                        <span className="font-mono text-cyan-300 font-bold" dir="ltr">{code.email}</span>
                                      </div>
                                      <button
                                        onClick={() => copyToClipboard(code.email || "", `email_${idx}`)}
                                        className="p-1 rounded hover:bg-white/10 text-slate-300"
                                      >
                                        {copiedKey === `email_${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                      </button>
                                    </div>
                                  )}
                                  {code.password && (
                                    <div className="p-2.5 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-between">
                                      <div>
                                        <span className="text-slate-400 block text-[10px]">كلمة المرور:</span>
                                        <span className="font-mono text-cyan-300 font-bold" dir="ltr">{code.password}</span>
                                      </div>
                                      <button
                                        onClick={() => copyToClipboard(code.password || "", `pwd_${idx}`)}
                                        className="p-1 rounded hover:bg-white/10 text-slate-300"
                                      >
                                        {copiedKey === `pwd_${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="p-3 rounded-lg bg-black/60 border border-cyan-500/30 flex items-center justify-between gap-3">
                                  <span className="font-mono font-black text-cyan-300 tracking-wider text-sm sm:text-base break-all" dir="ltr">
                                    {code.value}
                                  </span>
                                  <button
                                    onClick={() => copyToClipboard(code.value || "", `key_${idx}`)}
                                    className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold inline-flex items-center gap-1.5 shrink-0 transition"
                                  >
                                    {copiedKey === `key_${idx}` ? (
                                      <>
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>تم النسخ</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>نسخ</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}

                              {code.extra && (
                                <div className="text-[11px] text-slate-400 p-2 rounded bg-white/[0.02] border border-white/5">
                                  {code.extra}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="p-3 rounded-lg bg-white/[0.02] border border-dashed border-white/10 text-center text-slate-500 font-mono text-sm tracking-widest" dir="ltr">
                              ••••-••••-••••-••••
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 text-center text-slate-400 text-sm">
                    تم تسليم الطلب. تحقق من الملاحظات أدناه أو تواصل مع الدعم لأي استفسار.
                  </div>
                )}

                {/* Admin notes & instructions */}
                {order.admin_notes && (
                  <div className="mt-5 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs leading-relaxed text-cyan-100">
                    <div className="font-bold text-cyan-300 mb-1 flex items-center gap-1.5">
                      <span>💡 تعليمات وملاحظات الطلب:</span>
                    </div>
                    <div className="whitespace-pre-wrap">{order.admin_notes}</div>
                  </div>
                )}
              </div>
            )}

            {/* If Order is Cancelled */}
            {order.status === "cancelled" && (
              <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200">
                <div className="flex items-center gap-2 font-bold text-lg text-rose-300 mb-2">
                  <XCircle className="w-6 h-6" />
                  <span>تم إلغاء هذا الطلب</span>
                </div>
                <p className="text-sm leading-relaxed text-rose-100/80 mb-4">
                  نحيطك علماً بأنه تم إلغاء الطلب من قِبل إدارة المتجر. إذا كان لديك استفسار أو قمت بالدفع مسبقاً، يمكنك التواصل فوراً مع الدعم الفني لحل المشكلة أو استرجاع الرصيد.
                </p>
                {order.admin_notes && (
                  <div className="p-3 rounded-xl bg-black/30 border border-rose-500/20 text-xs text-rose-200">
                    <strong>سبب الإلغاء / ملاحظة:</strong> {order.admin_notes}
                  </div>
                )}
              </div>
            )}

            {/* Order Items & Financial Summary */}
            <div className="p-6 sm:p-8 rounded-2xl bg-[#0e131d] border border-white/10 shadow-xl">
              <h3 className="text-base font-extrabold text-white mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-cyan-400" />
                <span>المنتجات المشمولة في الطلب ({items.length})</span>
              </h3>

              <div className="divide-y divide-white/5 mb-6">
                {items.map((it: any, idx: number) => {
                  const qty = it.qty || it.quantity || 1;
                  const price = it.price != null ? `${Number(it.price).toFixed(2)} د.أ` : "";
                  return (
                    <div key={idx} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {it.image ? (
                          <img
                            src={it.image}
                            alt={it.name}
                            className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 grid place-items-center text-cyan-400 text-lg shrink-0">
                            🎮
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-bold text-white leading-snug">{it.name}</div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {it.region ? `المنطقة: ${it.region}` : "منتج رقمي"} {qty > 1 ? `• الكمية: ${qty}` : ""}
                          </div>
                        </div>
                      </div>
                      <div className="font-mono font-bold text-white text-sm shrink-0">
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
                    <span>المجموع الفرعي:</span>
                    <span className="font-mono">{Number(order.subtotal_jod).toFixed(2)} د.أ</span>
                  </div>
                )}
                {order.discount_jod && Number(order.discount_jod) > 0 && (
                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span>الخصم المطبق:</span>
                    <span className="font-mono">-{Number(order.discount_jod).toFixed(2)} د.أ</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-base font-black text-white pt-2 border-t border-white/5">
                  <span>المبلغ الإجمالي المدفوع:</span>
                  <span className="font-mono text-cyan-300 text-lg">{Number(order.total_jod).toFixed(2)} د.أ</span>
                </div>
              </div>
            </div>

            {/* Support & Quick Contact */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-[#0e131d] border border-cyan-500/20 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h4 className="font-extrabold text-white text-sm mb-1 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                  <span>هل تحتاج إلى مساعدة بشأن هذا الطلب؟</span>
                </h4>
                <p className="text-xs text-slate-400">
                  فريق دعم GX Store متواجد دائماً لخدمتك على مدار الساعة عبر واتساب أو ديسكورد.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <a
                  href={`https://wa.me/962776252313?text=${encodeURIComponent(supportMsg)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition"
                >
                  <WhatsAppSvg />
                  واتساب
                </a>
                <a
                  href="https://discord.gg/DvkUd5PgqV"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold text-xs shadow-lg shadow-[#5865F2]/20 transition"
                >
                  <DiscordSvg />
                  ديسكورد
                </a>
              </div>
            </div>

            {/* Back to store navigation */}
            <div className="text-center pt-4">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-cyan-300 transition"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>العودة لمتجر GX Store</span>
              </Link>
            </div>

          </div>
        )}

      </div>
    </StoreShell>
  );
}
