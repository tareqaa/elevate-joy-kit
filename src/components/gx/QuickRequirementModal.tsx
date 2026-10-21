import { useEffect, useState, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useCart } from "@/lib/gx/cart";
import { useLang } from "@/lib/gx/i18n";
import { CART_ADDED_EVENT } from "./AddedToCartModal";
import {
  getRememberedWhatsApp,
  setRememberedWhatsApp,
  getRememberedEmail,
  setRememberedEmail,
  isRememberContactEnabled,
  setRememberContactEnabled,
  type ProductRequirementType,
} from "@/lib/gx/contact-storage";
import { MessageCircle, Mail, Link as LinkIcon, Check, X, ShieldCheck } from "lucide-react";

export const PROMPT_REQUIREMENT_EVENT = "gx:prompt-requirement";

export type PromptRequirementDetail = {
  cartId: string;
  meta?: Record<string, any>;
  action?: "add" | "buy";
  requirementType?: ProductRequirementType;
  productName?: string;
  label?: string;
  placeholder?: string;
  hint?: string;
};

export function triggerRequirementPrompt(detail: PromptRequirementDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PROMPT_REQUIREMENT_EVENT, { detail }));
}

export function QuickRequirementModal() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const cart = useCart();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [data, setData] = useState<PromptRequirementDetail | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      const customEvent = e as CustomEvent<PromptRequirementDetail>;
      if (!customEvent.detail) return;
      const d = customEvent.detail;
      setData(d);

      // Pre-fill remembered contact if available
      let initialVal = "";
      if (d.requirementType === "whatsapp") {
        initialVal = getRememberedWhatsApp();
      } else if (d.requirementType === "email") {
        initialVal = getRememberedEmail();
      }

      setValue(initialVal);
      setError(false);
      setRememberMe(isRememberContactEnabled());
      setOpen(true);
    };

    window.addEventListener(PROMPT_REQUIREMENT_EVENT, onPrompt);
    return () => window.removeEventListener(PROMPT_REQUIREMENT_EVENT, onPrompt);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 120);
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setOpen(false);
      };
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }
  }, [open]);

  if (!open || !data) return null;

  const reqType = data.requirementType || "whatsapp";
  const isWhatsApp = reqType === "whatsapp";
  const isEmail = reqType === "email";

  const title =
    isWhatsApp
      ? ar
        ? "بيانات التواصل والتفعيل"
        : "Contact & Activation Info"
      : isEmail
      ? ar
        ? "بيانات تفعيل الاشتراك"
        : "Subscription Activation Email"
      : ar
      ? "بيانات الطلب والتفعيل"
      : "Order Identifier";

  const label =
    data.label ||
    (isWhatsApp
      ? ar
        ? "رقم الواتساب للتواصل والتفعيل *"
        : "WhatsApp Number *"
      : isEmail
      ? ar
        ? "البريد الإلكتروني لتفعيل الاشتراك *"
        : "Email for Activation *"
      : ar
      ? "المعرّف أو الرابط المطلوب *"
      : "Target Identifier or Link *");

  const placeholder =
    data.placeholder ||
    (isWhatsApp
      ? ar
        ? "ضع رقم الواتس اب الخاص بك لسهولة التواصل والتفعيل (مثال: 0791234567)"
        : "Enter WhatsApp phone number (e.g. 0791234567)"
      : isEmail
      ? ar
        ? "أدخل إيميلك لتصلك الدعوة والتفعيل (بدون باسورد)"
        : "Enter your email for invite (no password)"
      : ar
      ? "أدخل الرابط أو اسم الحساب"
      : "Enter profile link or identifier");

  const hint =
    data.hint ||
    (isWhatsApp
      ? ar
        ? "💬 سنتواصل معك عبر الواتساب لتأكيد وشحن وتفعيل طلبك بأسرع وقت وأمان كامل — لا نحتاج كلمة سر حسابك نهائياً."
        : "💬 We will contact you on WhatsApp to safely complete your activation — no password needed."
      : isEmail
      ? ar
        ? "✉️ أدخل بريدك الإلكتروني الشخصي لتصلك الدعوة والتفعيل الرسمي — بدون كلمة سر."
        : "✉️ Enter your personal email to receive the official invitation — no password needed."
      : null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = value.trim();
    if (!clean) {
      setError(true);
      inputRef.current?.focus();
      return;
    }

    // Persist if requested
    if (isWhatsApp) {
      setRememberedWhatsApp(clean, rememberMe);
    } else if (isEmail) {
      setRememberedEmail(clean, rememberMe);
    }
    setRememberContactEnabled(rememberMe);

    const mergedMeta = {
      ...(data.meta || {}),
      usernames: [clean],
    };

    if (data.action === "buy") {
      cart.buyNow(data.cartId, 1, mergedMeta);
      setOpen(false);
      navigate({ to: "/cart" });
    } else {
      cart.add(data.cartId, 1, mergedMeta);
      setOpen(false);
      window.dispatchEvent(new CustomEvent(CART_ADDED_EVENT));
    }
  };

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 250,
        background: "rgba(4, 6, 14, 0.78)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(460px, 100%)",
          background: "linear-gradient(165deg, #131722 0%, #0c0f17 100%)",
          border: isWhatsApp ? "1.5px solid rgba(16, 185, 129, 0.35)" : "1.5px solid rgba(0, 229, 255, 0.3)",
          borderRadius: 20,
          padding: "26px 22px 22px",
          boxShadow: "0 25px 70px rgba(0, 0, 0, 0.65), 0 0 35px rgba(0, 229, 255, 0.08)",
          color: "#f8fafc",
          position: "relative",
          direction: ar ? "rtl" : "ltr",
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{
            position: "absolute",
            top: 16,
            insetInlineEnd: 16,
            background: "rgba(255, 255, 255, 0.07)",
            border: "none",
            borderRadius: "50%",
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#94a3b8",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          title={ar ? "إغلاق" : "Close"}
        >
          <X size={17} />
        </button>

        {/* Header Icon + Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: isWhatsApp
                ? "linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(16, 185, 129, 0.08))"
                : "linear-gradient(135deg, rgba(0, 229, 255, 0.22), rgba(0, 229, 255, 0.06))",
              border: isWhatsApp ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(0, 229, 255, 0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isWhatsApp ? "#10b981" : "#00e5ff",
            }}
          >
            {isWhatsApp ? (
              <MessageCircle size={24} strokeWidth={2.3} />
            ) : isEmail ? (
              <Mail size={23} strokeWidth={2.3} />
            ) : (
              <LinkIcon size={22} strokeWidth={2.3} />
            )}
          </div>

          <div>
            <h3 style={{ margin: 0, fontSize: "1.08rem", fontWeight: 800, color: "#ffffff" }}>
              {title}
            </h3>
            {data.productName && (
              <div style={{ fontSize: "0.82rem", color: "#94a3b8", marginTop: 2 }}>
                {data.productName}
              </div>
            )}
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: "block",
                fontSize: "0.86rem",
                fontWeight: 700,
                color: "#e2e8f0",
                marginBottom: 6,
              }}
            >
              {label}
            </label>
            <div style={{ position: "relative" }}>
              <input
                ref={inputRef}
                type={isEmail ? "email" : "text"}
                dir="auto"
                value={value}
                placeholder={placeholder}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (error && e.target.value.trim()) setError(false);
                }}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "rgba(255, 255, 255, 0.05)",
                  border: error ? "1.5px solid #ef4444" : "1.5px solid rgba(255, 255, 255, 0.12)",
                  color: "#ffffff",
                  fontSize: "0.92rem",
                  fontFamily: "inherit",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              {value && (
                <button
                  type="button"
                  onClick={() => setValue("")}
                  style={{
                    position: "absolute",
                    insetInlineEnd: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    padding: 4,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            {error && (
              <div style={{ fontSize: "0.78rem", color: "#f87171", marginTop: 5 }}>
                ⚠️ {ar ? "يرجى تعبئة الحقل للمتابعة" : "Please fill this field to proceed"}
              </div>
            )}
          </div>

          {/* Helper hint */}
          {hint && (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                background: isWhatsApp ? "rgba(16, 185, 129, 0.08)" : "rgba(0, 229, 255, 0.07)",
                border: isWhatsApp ? "1px solid rgba(16, 185, 129, 0.18)" : "1px solid rgba(0, 229, 255, 0.15)",
                fontSize: "0.8rem",
                color: isWhatsApp ? "#6ee7b7" : "#a5f3fc",
                lineHeight: 1.5,
                marginBottom: 14,
              }}
            >
              {hint}
            </div>
          )}

          {/* Remember Me Checkbox */}
          {(isWhatsApp || isEmail) && (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 18,
                fontSize: "0.82rem",
                color: "#cbd5e1",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{
                  accentColor: isWhatsApp ? "#10b981" : "#00e5ff",
                  width: 16,
                  height: 16,
                  cursor: "pointer",
                }}
              />
              <span>
                {isWhatsApp
                  ? ar
                    ? "تذكر رقمي للطلبات القادمة (حفظ تلقائي لعدم إدخاله كل مرة)"
                    : "Remember my number for future orders"
                  : ar
                  ? "تذكر إيميلي للطلبات القادمة (حفظ تلقائي)"
                  : "Remember my email for future orders"}
              </span>
            </label>
          )}

          {/* Action Buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                padding: "11px 16px",
                borderRadius: 12,
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.14)",
                color: "#e2e8f0",
                fontSize: "0.88rem",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {ar ? "إلغاء" : "Cancel"}
            </button>

            <button
              type="submit"
              style={{
                padding: "11px 16px",
                borderRadius: 12,
                background: isWhatsApp
                  ? "linear-gradient(135deg, #10b981, #059669)"
                  : "linear-gradient(135deg, #00e5ff, #00b4d8)",
                border: "none",
                color: isWhatsApp ? "#ffffff" : "#06131c",
                fontSize: "0.88rem",
                fontWeight: 800,
                cursor: "pointer",
                fontFamily: "inherit",
                boxShadow: isWhatsApp
                  ? "0 4px 14px rgba(16, 185, 129, 0.35)"
                  : "0 4px 14px rgba(0, 229, 255, 0.35)",
              }}
            >
              {data.action === "buy"
                ? ar
                  ? "متابعة الشراء ←"
                  : "Continue to Buy →"
                : ar
                ? "تأكيد وإضافة للسلة ✓"
                : "Confirm & Add ✓"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
