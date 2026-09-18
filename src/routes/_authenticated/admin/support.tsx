import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Headphones, MessageSquare, ExternalLink, Copy, Check, Send, PhoneCall,
  Sparkles, ShieldCheck, Users, Eye, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/admin/support")({
  head: () => ({ meta: [{ title: "إدارة الدعم الفني والقنوات — لوحة التحكم" }] }),
  component: AdminSupportPage,
});

const WHATSAPP_RAW = "962776252313";
const WHATSAPP_DISPLAY = "0776252313";
const DISCORD_INVITE = "https://discord.gg/DvkUd5PgqV";

const CANNED_RESPONSES = [
  {
    title: "تأكيد استلام الطلب والحوالة",
    text: "أهلاً وسهلاً بك في متجر GX Store 👋 تم استلام الحوالة بنجاح، والطلب الآن قيد التجهيز وسيتم تسليمه لك في أقرب وقت.",
  },
  {
    title: "طلب صورة الخطأ ورقم الطلب",
    text: "أهلاً بك! لمساعدتك بشكل أسرع، يرجى تزويدنا برقم طلبك وصورة أو لقطة شاشة توضح المشكلة أو رسالة الخطأ التي ظهرت لك.",
  },
  {
    title: "تم تسليم الطلب بنجاح",
    text: "مرحباً بك، تم تنفيذ وتسليم طلبك بنجاح 🎉 يمكنك الاطلاع على بيانات المنتج والأكواد من صفحة «طلباتي» في حسابك. نتمنى لك تجربة ممتعة!",
  },
  {
    title: "دعوة لسيرفر الديسكورد",
    text: `انضم لمجتمعنا على ديسكورد لمتابعة العروض والبطولات وفتح تذاكر الدعم المباشرة: ${DISCORD_INVITE}`,
  },
];

function AdminSupportPage() {
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerMsg, setCustomerMsg] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleLaunchWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = customerPhone.replace(/\D/g, "");
    if (!raw) {
      toast.error("يرجى إدخال رقم هاتف العميل");
      return;
    }
    // Normalize Jordan phone numbers
    let formatted = raw;
    if (formatted.startsWith("07")) {
      formatted = "962" + formatted.slice(1);
    } else if (formatted.startsWith("7")) {
      formatted = "962" + formatted;
    }

    const url = `https://wa.me/${formatted}?text=${encodeURIComponent(customerMsg || "مرحباً، معك الدعم الفني لمتجر GX Store 👋")}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCopyText = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    toast.success("تم نسخ الرد بنجاح!");
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-6xl mx-auto" dir="rtl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-purple-950/30 border border-cyan-500/20 backdrop-blur">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 grid place-items-center shrink-0 shadow-[0_0_20px_rgba(0,229,255,0.2)]">
            <Headphones className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">إدارة قنوات الدعم الفني</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                قنوات نشطة ⚡
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              متابعة قنوات الدعم الرسمية (واتساب وديسكورد) وأدوات التواصل المباشر مع العملاء.
            </p>
          </div>
        </div>

        <Link
          to="/support"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold text-xs sm:text-sm transition"
        >
          <Eye className="w-4 h-4" />
          <span>معاينة صفحة الدعم كما يراها العميل</span>
        </Link>
      </div>

      {/* 2 Primary Channels Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* WhatsApp Channel Card */}
        <div className="rounded-2xl p-6 bg-gradient-to-b from-emerald-950/30 to-slate-900/80 border border-emerald-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 grid place-items-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">واتساب الدعم الفني</h3>
                <span className="text-xs text-slate-400 font-mono" dir="ltr">{WHATSAPP_DISPLAY}</span>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              متصل
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            الرقم المعتمد لجميع محادثات الدعم الفني المباشرة وإتمام الطلبات وتأكيد الحوالات عبر المتجر.
          </p>
          <div className="flex gap-2 pt-2">
            <a
              href={`https://wa.me/${WHATSAPP_RAW}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
            >
              <span>فتح واتساب الدعم</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(WHATSAPP_DISPLAY);
                toast.success("تم نسخ الرقم!");
              }}
              className="rounded-xl border-white/10 hover:border-emerald-500/40 text-xs"
            >
              نسخ الرقم
            </Button>
          </div>
        </div>

        {/* Discord Channel Card */}
        <div className="rounded-2xl p-6 bg-gradient-to-b from-indigo-950/30 to-slate-900/80 border border-[#5865F2]/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#5865F2]/20 text-indigo-400 grid place-items-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">سيرفر ديسكورد الرسمي</h3>
                <span className="text-xs text-slate-400 font-mono" dir="ltr">discord.gg/DvkUd5PgqV</span>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#5865F2]/20 text-indigo-300 border border-[#5865F2]/40">
              نشط
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            مجتمع اللاعبين والتذاكر التفاعلية (Support Tickets) وقنوات الإعلانات والبطولات والفعاليات.
          </p>
          <div className="flex gap-2 pt-2">
            <a
              href={DISCORD_INVITE}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold text-xs transition"
            >
              <span>فتح سيرفر الديسكورد</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(DISCORD_INVITE);
                toast.success("تم نسخ الرابط!");
              }}
              className="rounded-xl border-white/10 hover:border-[#5865F2]/40 text-xs"
            >
              نسخ الرابط
            </Button>
          </div>
        </div>

      </div>

      {/* Quick Customer WhatsApp Launcher */}
      <div className="rounded-2xl border border-white/10 bg-card/60 p-6 backdrop-blur space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 grid place-items-center">
            <Send className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">مراسلة عميل مباشرة عبر واتساب</h2>
            <p className="text-xs text-muted-foreground">أدخل رقم العميل وابدأ المحادثة معه فوراً دون الحاجة لحفظ رقمه بجهات الاتصال.</p>
          </div>
        </div>

        <form onSubmit={handleLaunchWhatsApp} className="space-y-3 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">رقم هاتف العميل (واتساب):</label>
              <Input
                dir="ltr"
                placeholder="07XXXXXXXX أو 9627XXXXXXXX"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="bg-background/60 border-white/10 font-mono text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">الرسالة التمهيدية (اختياري):</label>
              <Input
                placeholder="أهلاً بك، معك متجر GX Store بخصوص طلبك..."
                value={customerMsg}
                onChange={(e) => setCustomerMsg(e.target.value)}
                className="bg-background/60 border-white/10 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              className="gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>بدء محادثة واتساب مع هذا الرقم ↗</span>
            </Button>
          </div>
        </form>
      </div>

      {/* Quick Canned Responses */}
      <div className="rounded-2xl border border-white/10 bg-card/60 p-6 backdrop-blur space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 grid place-items-center">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">نماذج ردود سريعة جاهزة للنسخ (Canned Responses)</h2>
            <p className="text-xs text-muted-foreground">اضغط على أي رسالة لنسخها فوراً وإرسالها للعميل عبر واتساب أو ديسكورد.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {CANNED_RESPONSES.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:border-cyan-500/30 transition flex flex-col justify-between gap-3 group"
            >
              <div>
                <h4 className="text-xs font-bold text-cyan-300 mb-1">{item.title}</h4>
                <p className="text-xs text-slate-300 leading-relaxed">{item.text}</p>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyText(item.text, idx)}
                  className="h-7 text-xs gap-1.5 text-slate-400 hover:text-cyan-300 hover:bg-white/5"
                >
                  {copiedIdx === idx ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">تم النسخ</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>نسخ الرد</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
