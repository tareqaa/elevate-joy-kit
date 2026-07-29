import { useEffect, useState } from "react";
import { useLang } from "@/lib/gx/i18n";
import { supabase } from "@/integrations/supabase/client";


export function OrderConfirmedModal({
  orderNumber,
  waUrl,
  onClose,
}: {
  orderNumber: string;
  waUrl: string | null;
  onClose: () => void;
}) {
  const { t, dir } = useLang();
  const [copied, setCopied] = useState(false);

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

  function goWa() {
    if (!waUrl) return;
    const opened = window.open(waUrl, "_blank", "noopener,noreferrer");
    if (!opened) window.location.href = waUrl;
  }

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
        }}>✓</div>
        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
          {t("cart.order_created")}
        </h3>
        <p style={{ margin: "6px 0 16px", fontSize: 13, color: "#a1a7b8", lineHeight: 1.6 }}>
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
        {waUrl && (
          <button
            type="button" onClick={goWa}
            style={{
              width: "100%", padding: "12px 16px", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg,#25D366,#128C7E)", color: "#fff",
              fontSize: 15, fontWeight: 800, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: "0 10px 24px -8px rgba(37,211,102,0.55)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.36 5.07L2 22l5.06-1.33A9.94 9.94 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/></svg>
            {t("cart.continue_wa")}
          </button>
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
      `}</style>
    </div>
  );
}
