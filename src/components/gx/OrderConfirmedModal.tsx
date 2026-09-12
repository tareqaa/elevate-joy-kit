import { useEffect, useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useLang } from "@/lib/gx/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/lib/gx/site-settings";

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
  const isAr = lang !== "en";
  const [copied, setCopied] = useState(false);
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

  async function copy() {
    try {
      await navigator.clipboard.writeText(orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* noop */ }
  }

  const supportPhone = (site.support_whatsapp || "962776252313").replace(/[^0-9]/g, "");

  const effectiveWaUrl = useMemo(() => {
    if (waUrl && waUrl.trim()) return waUrl;

    const pmLabel =
      paymentMethod === "cliq"
        ? "خدمة كليك (CliQ) 🇯🇴"
        : paymentMethod === "card"
        ? "بطاقة بنكية (Visa / Mastercard) 💳"
        : "محفظة GX (GX Wallet) 🌐";

    const msg = `مرحباً GX Store، قمت بعمل طلب جديد عبر المتجر:
🆔 *رقم الطلب:* ${orderNumber}
💳 *طريقة الدفع:* ${pmLabel}

✅ يرجى تزويدي بتفاصيل الدفع وتأكيد استلام الطلب. شكراً!`;

    const encoded = encodeURIComponent(msg);
    return `https://wa.me/${supportPhone}?text=${encoded}`;
  }, [waUrl, orderNumber, paymentMethod, supportPhone]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 10050,
        background: "rgba(3,5,10,0.78)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, animation: "gxFadeIn .18s ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        dir={dir}
        style={{
          background: "linear-gradient(160deg,#12151f 0%,#0b0e17 100%)",
          border: "1px solid rgba(0,229,255,0.28)",
          borderRadius: 22, padding: "26px 22px",
          maxWidth: 440, width: "100%",
          color: "#f5f6f8",
          boxShadow: "0 30px 80px -20px rgba(0,229,255,0.35), 0 0 0 1px rgba(255,255,255,0.04) inset",
          fontFamily: "'Almarai',system-ui,sans-serif",
          animation: "gxPop .22s cubic-bezier(.2,.9,.3,1.2)",
          textAlign: "center",
        }}
      >
        <div style={{
          width: 66, height: 66, margin: "0 auto 12px", borderRadius: "50%",
          background: "linear-gradient(135deg,#00e5ff,#7c3aed)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 34, boxShadow: "0 12px 30px -8px rgba(0,229,255,0.55)",
          color: "#ffffff",
        }}>✓</div>
        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
          {t("cart.order_created")}
        </h3>
        {paymentMethod && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            margin: "8px auto 0", padding: "4px 12px", borderRadius: 999,
            fontSize: 12, fontWeight: 800,
            background: paymentMethod === "cliq" ? "rgba(168,85,247,0.15)" : paymentMethod === "card" ? "rgba(59,130,246,0.15)" : "rgba(0,229,255,0.12)",
            border: paymentMethod === "cliq" ? "1px solid rgba(168,85,247,0.4)" : paymentMethod === "card" ? "1px solid rgba(59,130,246,0.4)" : "1px solid rgba(0,229,255,0.35)",
            color: paymentMethod === "cliq" ? "#d8b4fe" : paymentMethod === "card" ? "#93c5fd" : "#00e5ff",
          }}>
            <span>
              {isAr
                ? (paymentMethod === "cliq" ? "🇯🇴 طريقة الدفع: كليك (CliQ)" : paymentMethod === "card" ? "💳 طريقة الدفع: بطاقة بنكية (Visa / Mastercard)" : "🌐 طريقة الدفع: محفظة GX (GX Wallet)")
                : (paymentMethod === "cliq" ? "🇯🇴 Payment Method: CliQ" : paymentMethod === "card" ? "💳 Payment Method: Bank Card (Visa / Mastercard)" : "🌐 Payment Method: GX Wallet")}
            </span>
          </div>
        )}
        <p style={{ margin: "10px 0 16px", fontSize: 13, color: "#a1a7b8", lineHeight: 1.6 }}>
          {t("cart.order_saved_note")}
        </p>
        <div style={{
          background: "rgba(0,229,255,0.08)",
          border: "1px dashed rgba(0,229,255,0.4)",
          borderRadius: 14, padding: "14px 12px", marginBottom: 16,
        }}>
          <div style={{ fontSize: 11, color: "#a1a7b8", marginBottom: 4, letterSpacing: 0.5 }}>
            {t("cart.your_order_number")}
          </div>
          <div dir="ltr" style={{
            fontFamily: "'JetBrains Mono',ui-monospace,monospace",
            fontSize: 26, fontWeight: 900, color: "#00e5ff",
            letterSpacing: 2,
          }}>{orderNumber}</div>
          <button
            type="button" onClick={copy}
            style={{
              marginTop: 8, background: "transparent", border: "1px solid rgba(0,229,255,0.35)",
              color: "#00e5ff", padding: "6px 14px", borderRadius: 999, fontSize: 12,
              cursor: "pointer", fontWeight: 700,
            }}
          >
            {copied ? "✓ " + t("acc.copied") : "📋 " + t("cart.copy_number")}
          </button>
        </div>

        <div style={{
          fontSize: 12, color: "#94a3b8", lineHeight: 1.6, marginBottom: 16,
          padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          {isAr
            ? "💡 اضغط الزر الأخضر أدناه للمتابعة فوراً عبر واتساب، أو أرسل الرقم لفريق الدعم عبر أي منصة لتأكيد الطلب."
            : "💡 Click the green button below to proceed via WhatsApp, or send your order number to our support team on any platform to confirm."}
        </div>

        {/* Primary Call-to-Action: Direct WhatsApp Button */}
        <a
          href={effectiveWaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="gx-wa-checkout-btn"
          style={{
            width: "100%", padding: "14px 18px", borderRadius: 14, textDecoration: "none",
            background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)", color: "#ffffff",
            fontSize: 15, fontWeight: 800, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            boxShadow: "0 10px 28px -6px rgba(37,211,102,0.65), 0 0 0 1px rgba(255,255,255,0.2) inset",
            transition: "all 0.2s ease",
            boxSizing: "border-box",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#ffffff">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.164.577 4.195 1.583 5.952l-1.683 6.155 6.305-1.654c1.704.931 3.663 1.464 5.795 1.464 6.627 0 12-5.373 12-12s-5.373-12-12-12z" />
          </svg>
          <span>{isAr ? "متابعة وتأكيد الطلب عبر واتساب" : "Confirm Order via WhatsApp"}</span>
        </a>

        {signedIn && (
          <Link
            to="/account"
            search={{ tab: "orders" as const }}
            onClick={onClose}
            preload="intent"
            style={{
              display: "block", marginTop: 10, padding: "10px 14px", borderRadius: 12,
              border: "1px solid rgba(0,229,255,0.35)", background: "rgba(0,229,255,0.06)",
              color: "#00e5ff", fontSize: 13, fontWeight: 700, textDecoration: "none",
            }}
          >
            📦 {t("cart.track_order")}
          </Link>
        )}

        <button
          type="button" onClick={onClose}
          style={{
            marginTop: 10, background: "transparent", border: "none",
            color: "#8b90a0", fontSize: 13, cursor: "pointer", padding: "6px 10px",
          }}
        >
          {t("common.close")}
        </button>
      </div>
      <style>{`
        @keyframes gxFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes gxPop { from { opacity: 0; transform: scale(.92) translateY(8px) } to { opacity: 1; transform: none } }
        .gx-wa-checkout-btn:hover {
          transform: translateY(-2px);
          filter: brightness(1.08);
          box-shadow: 0 14px 34px -6px rgba(37,211,102,0.8) !important;
        }
        .gx-wa-checkout-btn:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}
