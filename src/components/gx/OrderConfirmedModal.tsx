import { useEffect, useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useLang } from "@/lib/gx/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/lib/gx/site-settings";
import { toast } from "sonner";
import { Copy, Check, ExternalLink, CheckCircle2, MessageSquare } from "lucide-react";

const DISCORD_INVITE = "https://discord.gg/DvkUd5PgqV";

function WhatsAppSvg() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

function DiscordSvg() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

export function OrderConfirmedModal({
  orderNumber,
  waUrl,
  paymentMethod,
  onClose,
}: {
  orderNumber: string;
  waUrl: string | null;
  paymentMethod?: "cliq" | "card" | "gx_wallet" | null;
  onClose: () => void;
}) {
  const { t, dir, lang } = useLang();
  const isAr = lang === "ar";
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const site = useSiteSettings();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const pmLabel = useMemo(() => {
    return paymentMethod === "cliq"
      ? (isAr ? "خدمة كليك (CliQ) 🇯🇴" : "CliQ (Jordan) 🇯🇴")
      : paymentMethod === "card"
      ? (isAr ? "بطاقة بنكية (Visa / Mastercard) 💳" : "Bank Card (Visa / Mastercard) 💳")
      : (isAr ? "محفظة GX (GX Wallet) 🌐" : "GX Wallet 🌐");
  }, [paymentMethod, isAr]);

  const supportPhone = (site.support_whatsapp || "962776252313").replace(/[^0-9]/g, "");

  const fullOrderText = useMemo(() => {
    return `🎮 *طلب جديد من متجر GX Store* 🎮
━━━━━━━━━━━━━━━━━━━━
📋 *رقم الطلب:* ${orderNumber}
💳 *طريقة الدفع:* ${pmLabel}
━━━━━━━━━━━━━━━━━━━━
✨ *أود تأكيد الطلب واستلام تفاصيل التفعيل.* شكراً لكم!`;
  }, [orderNumber, pmLabel]);

  const effectiveWaUrl = useMemo(() => {
    if (waUrl && waUrl.trim()) return waUrl;
    return `https://wa.me/${supportPhone}?text=${encodeURIComponent(fullOrderText)}`;
  }, [waUrl, supportPhone, fullOrderText]);

  async function copyOrderNumber() {
    try {
      await navigator.clipboard.writeText(orderNumber);
      setCopiedNumber(true);
      toast.success(isAr ? "تم نسخ رقم الطلب" : "Order number copied");
      setTimeout(() => setCopiedNumber(false), 1800);
    } catch { /* noop */ }
  }



  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10050,
        background: "rgba(3, 5, 10, 0.82)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        animation: "gxFadeIn .18s ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        dir={dir}
        style={{
          background: "linear-gradient(165deg, #131722 0%, #090c13 100%)",
          border: "1px solid rgba(0, 229, 255, 0.25)",
          borderRadius: 24,
          padding: "28px 24px",
          maxWidth: 460,
          width: "100%",
          color: "#f5f6f8",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(0, 229, 255, 0.15)",
          fontFamily: "'Tajawal', 'Cairo', system-ui, sans-serif",
          animation: "gxPop .22s cubic-bezier(.2,.9,.3,1.2)",
          textAlign: "center",
          boxSizing: "border-box",
        }}
      >
        {/* Glowing Top Icon */}
        <div
          style={{
            width: 64,
            height: 64,
            margin: "0 auto 14px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #10b981 0%, #00e5ff 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#051c14",
            boxShadow: "0 10px 25px rgba(0, 229, 255, 0.4)",
          }}
        >
          <CheckCircle2 size={36} strokeWidth={2.4} />
        </div>

        {/* Title */}
        <h3
          style={{
            margin: "0 0 6px",
            fontSize: 22,
            fontWeight: 900,
            color: "#ffffff",
          }}
        >
          {isAr ? "تم تسجيل طلبك بنجاح!" : "Order Placed Successfully!"}
        </h3>

        {/* Payment Method Badge */}
        {paymentMethod && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              margin: "6px auto 14px",
              padding: "4px 12px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 800,
              background: "rgba(0, 229, 255, 0.08)",
              border: "1px solid rgba(0, 229, 255, 0.25)",
              color: "#00e5ff",
            }}
          >
            <span>{pmLabel}</span>
          </div>
        )}

        {/* Order Number Box */}
        <div
          style={{
            background: "rgba(0, 0, 0, 0.4)",
            border: "1px dashed rgba(0, 229, 255, 0.35)",
            borderRadius: 16,
            padding: "14px 16px",
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4, fontWeight: 700 }}>
            {isAr ? "رقم الطلب الخاص بك:" : "Your Order Number:"}
          </div>
          <div
            dir="ltr"
            style={{
              fontFamily: "monospace",
              fontSize: 24,
              fontWeight: 900,
              color: "#00e5ff",
              letterSpacing: 2,
              marginBottom: 8,
            }}
          >
            {orderNumber}
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button
              type="button"
              onClick={copyOrderNumber}
              style={{
                background: copiedNumber ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.06)",
                border: copiedNumber ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(255, 255, 255, 0.12)",
                color: copiedNumber ? "#34d399" : "#cbd5e1",
                padding: "7px 18px",
                borderRadius: 999,
                fontSize: 12,
                cursor: "pointer",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.2s",
              }}
            >
              {copiedNumber ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedNumber ? (isAr ? "تم نسخ الرقم" : "Copied") : (isAr ? "نسخ رقم الطلب" : "Copy Order Number")}</span>
            </button>
          </div>
        </div>

        {/* Prompt Note */}
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>
          {isAr
            ? "لمتابعة طلبك وتأكيد عملية الدفع، اختر المنصة التي تفضلها للتواصل مع فريق الدعم:"
            : "To confirm your payment and receive your order, choose your preferred support channel:"}
        </p>

        {/* Action Buttons (WhatsApp & Discord) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          {/* WhatsApp Button */}
          <a
            href={effectiveWaUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              width: "100%",
              padding: "13px 18px",
              borderRadius: 14,
              textDecoration: "none",
              background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
              color: "#051c14",
              fontSize: 14,
              fontWeight: 900,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              boxShadow: "0 8px 24px -4px rgba(37, 211, 102, 0.5)",
              transition: "transform 0.15s ease, filter 0.15s ease",
              boxSizing: "border-box",
            }}
          >
            <WhatsAppSvg />
            <span>{isAr ? "متابعة الطلب عبر واتساب" : "Confirm Order on WhatsApp"}</span>
            <ExternalLink size={15} />
          </a>

          {/* Discord Button */}
          <a
            href={DISCORD_INVITE}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              width: "100%",
              padding: "13px 18px",
              borderRadius: 14,
              textDecoration: "none",
              background: "linear-gradient(135deg, #5865F2 0%, #4752c4 100%)",
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 900,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              boxShadow: "0 8px 24px -4px rgba(88, 101, 242, 0.5)",
              transition: "transform 0.15s ease, filter 0.15s ease",
              boxSizing: "border-box",
            }}
          >
            <DiscordSvg />
            <span>{isAr ? "متابعة الطلب عبر ديسكورد" : "Confirm Order on Discord"}</span>
            <ExternalLink size={15} />
          </a>
        </div>

        {/* Track in account link (if logged in) */}
        {signedIn && (
          <Link
            to="/account"
            search={{ tab: "orders" as const }}
            onClick={onClose}
            style={{
              display: "block",
              padding: "9px 14px",
              borderRadius: 12,
              border: "1px solid rgba(0, 229, 255, 0.25)",
              background: "rgba(0, 229, 255, 0.05)",
              color: "#00e5ff",
              fontSize: 13,
              fontWeight: 800,
              textDecoration: "none",
              marginBottom: 8,
            }}
          >
            📦 {t("cart.track_order")}
          </Link>
        )}

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "#64748b",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            padding: "6px 12px",
          }}
        >
          {t("common.close")}
        </button>
      </div>

      <style>{`
        @keyframes gxFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes gxPop { from { opacity: 0; transform: scale(.94) translateY(6px) } to { opacity: 1; transform: none } }
      `}</style>
    </div>
  );
}
