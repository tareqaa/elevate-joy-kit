import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useLang } from "@/lib/gx/i18n";
import {
  ShieldAlert,
  AlertTriangle,
  LogIn,
  LogOut,
  ShoppingBag,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  UserPlus,
  KeyRound,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface OrderIpMismatchNoticeProps {
  orderNumber?: string | null;
  customerEmail?: string | null;
  orderToken?: string | null;
  purchaseIp?: string | null;
  currentIp?: string | null;
  accountMismatch?: boolean;
  callerEmail?: string | null;
  onRefresh?: () => void;
}

export function OrderIpMismatchNotice({
  orderNumber,
  customerEmail,
  orderToken,
  purchaseIp,
  currentIp,
  accountMismatch,
  callerEmail,
  onRefresh,
}: OrderIpMismatchNoticeProps) {
  const { lang, dir } = useLang();
  const isAr = lang === "ar";
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;
  const [loggingOut, setLoggingOut] = useState(false);

  const returnUrl = orderToken
    ? `/order/completed?order_token=${encodeURIComponent(orderToken)}`
    : orderNumber
    ? `/order/${encodeURIComponent(orderNumber)}`
    : "/account";

  async function handleSwitchAccount(mode: "signin" | "signup") {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
    } catch {}
    const emailParam = customerEmail ? `&email=${encodeURIComponent(customerEmail)}` : "";
    window.location.href = `/auth?mode=${mode}${emailParam}&redirect=${encodeURIComponent(returnUrl)}`;
  }

  // CASE 1: LOGGED IN WITH DIFFERENT ACCOUNT (Account Mismatch)
  if (accountMismatch) {
    return (
      <div
        style={{
          borderRadius: "20px",
          backgroundColor: "#0d111a",
          border: "1px solid rgba(245, 158, 11, 0.35)",
          boxShadow: "0 24px 64px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(245, 158, 11, 0.1)",
          padding: "40px 28px",
          maxWidth: "760px",
          margin: "0 auto",
          color: "#f5f6f8",
          fontFamily: "'Tajawal', 'Almarai', sans-serif",
          lineHeight: 1.7,
          boxSizing: "border-box",
          animation: "drfFadeUp 0.35s ease",
        }}
        dir={dir}
      >
        {/* Warning Icon */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              backgroundColor: "rgba(245, 158, 11, 0.12)",
              border: "1.5px solid rgba(245, 158, 11, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fbbf24",
              boxShadow: "0 0 24px rgba(245, 158, 11, 0.25)",
            }}
          >
            <AlertTriangle size={32} strokeWidth={2.2} />
          </div>
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: "22px",
            fontWeight: 900,
            textAlign: "center",
            color: "#ffffff",
            margin: "0 0 12px 0",
          }}
        >
          {isAr ? "حسابك الحالي غير متطابق مع هذا الطلب" : "Current Account Does Not Match This Order"}
        </h2>

        {/* Description */}
        <div
          style={{
            fontSize: "14px",
            color: "#cbd5e1",
            textAlign: "center",
            maxWidth: "640px",
            margin: "0 auto 24px auto",
            lineHeight: 1.8,
          }}
        >
          <div style={{ marginBottom: "12px" }}>
            {isAr ? "أنت مسجل دخول حالياً بالبريد الإلكتروني: " : "You are currently signed in as: "}
            <span
              style={{
                padding: "3px 10px",
                borderRadius: "6px",
                backgroundColor: "rgba(239, 68, 68, 0.18)",
                border: "1px solid rgba(239, 68, 68, 0.35)",
                color: "#fca5a5",
                fontWeight: 700,
                fontFamily: "monospace",
                direction: "ltr",
                display: "inline-block",
                margin: "0 4px",
              }}
            >
              {callerEmail || "—"}
            </span>
          </div>

          <div style={{ marginBottom: "12px" }}>
            {isAr ? "بينما تم تسجيل وشراء هذا الطلب لحساب البريد: " : "While this order was registered to: "}
            <span
              style={{
                padding: "3px 10px",
                borderRadius: "6px",
                backgroundColor: "rgba(0, 229, 255, 0.15)",
                border: "1px solid rgba(0, 229, 255, 0.4)",
                color: "#00e5ff",
                fontWeight: 700,
                fontFamily: "monospace",
                direction: "ltr",
                display: "inline-block",
                margin: "0 4px",
              }}
            >
              {customerEmail || "—"}
            </span>
          </div>

          <p style={{ color: "#94a3b8", fontSize: "13px", marginTop: "14px" }}>
            {isAr
              ? "لحماية أمان وسرية المفاتيح والأكواد الرقمية، لا يمكن عرض بيانات هذا الطلب إلا عند تسجيل الدخول بالحساب الصحيح الذي تم الشراء به."
              : "For security and privacy, digital product keys and accounts can only be accessed when signed into the exact account used during purchase."}
          </p>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            maxWidth: "460px",
            margin: "0 auto 24px auto",
          }}
        >
          <button
            type="button"
            disabled={loggingOut}
            onClick={() => handleSwitchAccount("signin")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              width: "100%",
              padding: "13px 20px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #00e5ff 0%, #0098d4 100%)",
              color: "#07090e",
              fontWeight: 800,
              fontSize: "14px",
              border: "none",
              cursor: loggingOut ? "not-allowed" : "pointer",
              boxShadow: "0 4px 20px rgba(0, 229, 255, 0.35)",
              transition: "transform 0.15s ease",
            }}
          >
            <LogOut size={16} />
            <span>
              {loggingOut
                ? isAr
                  ? "جارٍ تسجيل الخروج..."
                  : "Signing out..."
                : isAr
                ? "تسجيل الخروج والتبديل إلى حساب الطلب"
                : "Sign Out & Switch to Order Account"}
            </span>
          </button>

          <button
            type="button"
            disabled={loggingOut}
            onClick={() => handleSwitchAccount("signup")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              width: "100%",
              padding: "11px 20px",
              borderRadius: "12px",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#e2e8f0",
              fontWeight: 700,
              fontSize: "13px",
              cursor: loggingOut ? "not-allowed" : "pointer",
            }}
          >
            <UserPlus size={15} />
            <span>
              {isAr
                ? "تسجيل الخروج وإنشاء حساب جديد بهذا الطلب"
                : "Sign Out & Register New Account for this Order"}
            </span>
          </button>
        </div>

        {/* Back Link */}
        <div style={{ textAlign: "center", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "18px" }}>
          <Link
            to="/account"
            style={{ color: "#94a3b8", fontSize: "13px", textDecoration: "underline" }}
          >
            {isAr ? "العودة إلى حسابي الحالي" : "Return to My Current Account"}
          </Link>
        </div>
      </div>
    );
  }

  // CASE 2: VISITOR NOT LOGGED IN & IP MISMATCH
  return (
    <div
      style={{
        borderRadius: "20px",
        backgroundColor: "#0d111a",
        border: "1px solid rgba(0, 229, 255, 0.2)",
        boxShadow: "0 24px 64px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(0, 229, 255, 0.08)",
        padding: "44px 32px",
        maxWidth: "760px",
        margin: "0 auto",
        color: "#f5f6f8",
        fontFamily: "'Tajawal', 'Almarai', sans-serif",
        lineHeight: 1.7,
        boxSizing: "border-box",
        animation: "drfFadeUp 0.35s ease",
      }}
      dir={dir}
    >
      {/* Top Security Shield Icon */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
        <div
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            backgroundColor: "rgba(0, 229, 255, 0.12)",
            border: "1.5px solid rgba(0, 229, 255, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#00e5ff",
            boxShadow: "0 0 24px rgba(0, 229, 255, 0.25)",
          }}
        >
          <ShieldAlert size={30} strokeWidth={2.2} />
        </div>
      </div>

      {/* Main Title */}
      <h2
        style={{
          fontSize: "24px",
          fontWeight: 900,
          textAlign: "center",
          color: "#ffffff",
          margin: "0 0 16px 0",
          letterSpacing: isAr ? 0 : "0.3px",
        }}
      >
        {isAr ? "تأكيد هوية المشتري لاستلام الطلب" : "Customer Verification Required"}
      </h2>

      {/* Explanation */}
      <p
        style={{
          fontSize: "14px",
          color: "#cbd5e1",
          textAlign: "center",
          maxWidth: "680px",
          margin: "0 auto 24px auto",
          lineHeight: 1.75,
        }}
      >
        {isAr
          ? "تم إكمال طلبك بنجاح. وحرصاً على حماية مشترياتك وأكوادك الرقمية من السرقة، تم قفل العرض المباشر لأنك تتصفح من عنوان IP مختلف عن العنوان المستخدم أثناء عملية الشراء."
          : "Your order is ready. For your security, direct code viewing is locked because you are accessing this from a different IP address than used during purchase."}
      </p>

      {/* Subtitle */}
      <div
        style={{
          fontSize: "15px",
          fontWeight: 800,
          color: "#00e5ff",
          textAlign: "center",
          marginBottom: "24px",
        }}
      >
        {isAr ? "للوصول إلى مفاتيحك وأكوادك، يرجى اختيار إحدى الطريقتين:" : "To unlock your keys, choose one of the options below:"}
      </div>

      {/* 2 Clear Distinct Cards */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "18px",
          marginBottom: "28px",
        }}
      >
        {/* Card 1: GUEST PURCHASER (RECOMMENDED) */}
        <div
          style={{
            backgroundColor: "rgba(0, 229, 255, 0.04)",
            border: "1.5px solid rgba(0, 229, 255, 0.28)",
            borderRadius: "16px",
            padding: "22px 24px",
            boxShadow: "0 4px 20px rgba(0, 229, 255, 0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "16px", color: "#ffffff", fontWeight: 800 }}>
              <UserPlus size={18} className="text-cyan-400" />
              <span>{isAr ? "الخيار 1: اشتريت كزائر ولا تملك حساباً بعد؟" : "Option 1: Checked out as a guest without an account?"}</span>
            </div>
            <span
              style={{
                fontSize: "11px",
                padding: "3px 10px",
                borderRadius: "20px",
                backgroundColor: "rgba(0, 229, 255, 0.15)",
                color: "#00e5ff",
                fontWeight: 700,
                border: "1px solid rgba(0, 229, 255, 0.3)",
              }}
            >
              {isAr ? "موصى به لزوار المتجر" : "Recommended for Guests"}
            </span>
          </div>

          <p style={{ fontSize: "13.5px", color: "#94a3b8", margin: "0 0 16px 0", lineHeight: 1.7 }}>
            {isAr ? (
              <>
                إذا أتممت طلبك كزائر دون تسجيل مسبق، كل ما عليك فعله هو <strong>إنشاء حساب جديد</strong> بنفس البريد الإلكتروني الذي أتممت به الشراء ({customerEmail}).
                بمجرد كتابة كلمة مرور جديدة، سيتم ربط طلبك ومفاتيحك تلقائياً وبأمان في حسابك، وستجدها مباشرة في صفحة <strong>طلباتي</strong>.
              </>
            ) : (
              <>
                If you purchased as a guest, simply <strong>create a new account</strong> using your purchase email ({customerEmail}).
                Your order will be automatically linked and waiting safely in your <strong>My Orders</strong> tab.
              </>
            )}
          </p>

          <Link
            to="/auth"
            search={{ mode: "signup", email: customerEmail || undefined, redirect: returnUrl }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "11px 22px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #00e5ff 0%, #0098d4 100%)",
              color: "#07090e",
              fontWeight: 800,
              fontSize: "13.5px",
              textDecoration: "none",
              boxShadow: "0 4px 16px rgba(0, 229, 255, 0.3)",
            }}
          >
            <UserPlus size={16} />
            <span>{isAr ? "إنشاء حساب جديد واستلام الطلب فوراً" : "Create Account & Unlock Order"}</span>
            <ArrowIcon size={14} />
          </Link>
        </div>

        {/* Card 2: EXISTING REGISTERED USER */}
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "16px",
            padding: "20px 24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "15px", color: "#ffffff", fontWeight: 800, marginBottom: "8px" }}>
            <LogIn size={18} className="text-sky-400" />
            <span>{isAr ? "الخيار 2: لديك حساب مسجل بالفعل بهذا البريد؟" : "Option 2: Already have an account with this email?"}</span>
          </div>

          <p style={{ fontSize: "13.5px", color: "#94a3b8", margin: "0 0 14px 0", lineHeight: 1.7 }}>
            {isAr
              ? "إذا كنت مسجلاً مسبقاً في متجر GX Store ولديك كلمة مرور، تفضل بتسجيل الدخول بكلمة المرور الخاصة بك لتأكيد هويتك والاطلاع على مفاتيحك مباشرة."
              : "If you already have a registered password for this email, please sign in to verify your identity and view your keys."}
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
            <Link
              to="/auth"
              search={{ mode: "signin", email: customerEmail || undefined, redirect: returnUrl }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 20px",
                borderRadius: "10px",
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.16)",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "13px",
                textDecoration: "none",
              }}
            >
              <LogIn size={15} />
              <span>{isAr ? "تسجيل الدخول إلى حسابي" : "Sign In to My Account"}</span>
            </Link>

            <Link
              to="/auth"
              search={{ mode: "reset", email: customerEmail || undefined, redirect: returnUrl }}
              style={{
                color: "#38bdf8",
                fontSize: "12.5px",
                textDecoration: "underline",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <KeyRound size={13} />
              <span>{isAr ? "نسيت كلمة المرور؟" : "Forgot Password?"}</span>
            </Link>
          </div>
        </div>

        {/* Step 3: WHAT HAPPENS AFTER */}
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            border: "1px dashed rgba(255, 255, 255, 0.1)",
            borderRadius: "14px",
            padding: "14px 18px",
            fontSize: "13px",
            color: "#94a3b8",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span>
            {isAr ? (
              <>
                بعد تسجيل الدخول أو إنشاء الحساب، يمكنك دائماً التوجه إلى صفحة{" "}
                <Link to="/account" search={{ tab: "orders" }} style={{ color: "#00e5ff", fontWeight: 700, textDecoration: "underline" }}>
                  طلباتي
                </Link>{" "}
                في حسابك لعرض ومتابعة كافة طلباتك ومفاتيحك الرقمية بأمان دائم.
              </>
            ) : (
              <>
                After signing in or registering, you can always visit{" "}
                <Link to="/account" search={{ tab: "orders" }} style={{ color: "#00e5ff", fontWeight: 700, textDecoration: "underline" }}>
                  My Orders
                </Link>{" "}
                to manage all your orders and digital keys safely.
              </>
            )}
          </span>
        </div>
      </div>

      {/* Support Action Button */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          paddingTop: "22px",
        }}
      >
        <a
          href="https://wa.me/962776252313"
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 22px",
            borderRadius: "10px",
            backgroundColor: "rgba(37, 211, 102, 0.12)",
            border: "1px solid rgba(37, 211, 102, 0.3)",
            color: "#4ade80",
            fontWeight: 700,
            fontSize: "13px",
            textDecoration: "none",
          }}
        >
          <span>{isAr ? "تحتاج مساعدة؟ تواصل مع الدعم الفني" : "Need help? Contact Support"}</span>
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}
