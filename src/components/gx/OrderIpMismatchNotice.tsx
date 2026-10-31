import React from "react";
import { Link } from "@tanstack/react-router";
import { useLang } from "@/lib/gx/i18n";
import { ShieldAlert, RefreshCw, KeyRound, LogIn, ShoppingBag, ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";

export interface OrderIpMismatchNoticeProps {
  orderNumber?: string | null;
  customerEmail?: string | null;
  orderToken?: string | null;
  purchaseIp?: string | null;
  currentIp?: string | null;
  onRefresh?: () => void;
}

export function OrderIpMismatchNotice({
  orderNumber,
  customerEmail,
  orderToken,
  purchaseIp,
  currentIp,
  onRefresh,
}: OrderIpMismatchNoticeProps) {
  const { lang, dir } = useLang();
  const isAr = lang === "ar";
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  const returnUrl = orderToken
    ? `/order/completed?order_token=${encodeURIComponent(orderToken)}`
    : orderNumber
    ? `/order/${encodeURIComponent(orderNumber)}`
    : "/account";

  const forgotPasswordUrl = `/auth?mode=reset${
    customerEmail ? `&email=${encodeURIComponent(customerEmail)}` : ""
  }&redirect=${encodeURIComponent(returnUrl)}`;

  const loginUrl = `/auth?mode=signin${
    customerEmail ? `&email=${encodeURIComponent(customerEmail)}` : ""
  }&redirect=${encodeURIComponent(returnUrl)}`;

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
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "20px",
        }}
      >
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

      {/* Main Title: Dear Customer / عميلنا العزيز */}
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
        {isAr ? "عميلنا العزيز" : "Dear Customer"}
      </h2>

      {/* Primary Explanation Text */}
      <p
        style={{
          fontSize: "14.5px",
          color: "#cbd5e1",
          textAlign: "center",
          maxWidth: "680px",
          margin: "0 auto 24px auto",
          lineHeight: 1.75,
        }}
      >
        {isAr
          ? "تم إكمال طلبك بنجاح. ومع ذلك، يتعذر عليك حالياً عرض وتفعيل المنتج الذي اشتريته لأنك تحاول الوصول إليه من عنوان IP مختلف عن العنوان الذي استخدمته أثناء عملية الشراء."
          : "Your order has been successfully completed. However, you are having trouble viewing the product you purchased. This is because you are trying to view your product from a different IP address than the one you purchased."}
      </p>

      {/* Subtitle / Instructions Lead */}
      <div
        style={{
          fontSize: "15px",
          fontWeight: 800,
          color: "#00e5ff",
          textAlign: "center",
          marginBottom: "28px",
        }}
      >
        {isAr ? "للوصول إلى طلبك، يرجى اتباع الخطوات أدناه:" : "To access your order, please follow the steps below:"}
      </div>

      {/* 4 Steps Section */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "18px",
          marginBottom: "32px",
        }}
      >
        {/* Step 1 */}
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            padding: "16px 20px",
          }}
        >
          <div style={{ fontSize: "14px", color: "#f1f5f9", fontWeight: 700, marginBottom: "8px" }}>
            {isAr
              ? "1. استخدم البريد الإلكتروني الذي استخدمته عند شراء المنتج لإنشاء طلب إعادة تعيين كلمة المرور من هذا الرابط."
              : "1. Use the email address you used when purchasing the product to create a password reset request from this link."}
          </div>
          <div style={{ fontSize: "13.5px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span>{isAr ? "رابط إعادة تعيين كلمة المرور:" : "Password reset link:"}</span>
            <Link
              to="/auth"
              search={{ mode: "reset", email: customerEmail || undefined, redirect: returnUrl }}
              style={{
                color: "#38bdf8",
                fontWeight: 800,
                textDecoration: "underline",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <KeyRound size={14} />
              <span>{isAr ? "نسيت كلمة المرور" : "Forgot Password"}</span>
            </Link>
            {customerEmail && (
              <span
                style={{
                  fontSize: "11.5px",
                  padding: "2px 8px",
                  borderRadius: "6px",
                  backgroundColor: "rgba(56, 189, 248, 0.12)",
                  color: "#38bdf8",
                  fontWeight: 600,
                }}
              >
                ({customerEmail})
              </span>
            )}
          </div>
        </div>

        {/* Step 2 */}
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            padding: "16px 20px",
          }}
        >
          <div style={{ fontSize: "14px", color: "#f1f5f9", fontWeight: 700 }}>
            {isAr
              ? "2. قم بإنشاء كلمة مرور جديدة عبر رابط إعادة تعيين كلمة المرور المرسل إلى بريدك الإلكتروني."
              : "2. Create a new password from the password reset link sent to your email address."}
          </div>
        </div>

        {/* Step 3 */}
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            padding: "16px 20px",
          }}
        >
          <div style={{ fontSize: "14px", color: "#f1f5f9", fontWeight: 700, marginBottom: "8px" }}>
            {isAr
              ? "3. يمكنك تسجيل الدخول إلى حسابك بكلمة المرور الجديدة وبريدك الإلكتروني."
              : "3. You can log in to your account with the new password and your email address."}
          </div>
          <div style={{ fontSize: "13.5px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span>{isAr ? "رابط تسجيل الدخول:" : "Login Link:"}</span>
            <Link
              to="/auth"
              search={{ mode: "signin", email: customerEmail || undefined, redirect: returnUrl }}
              style={{
                color: "#38bdf8",
                fontWeight: 800,
                textDecoration: "underline",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <LogIn size={14} />
              <span>{isAr ? "تسجيل الدخول" : "Login"}</span>
            </Link>
          </div>
        </div>

        {/* Step 4 */}
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            padding: "16px 20px",
          }}
        >
          <div style={{ fontSize: "14px", color: "#f1f5f9", fontWeight: 700, marginBottom: "8px" }}>
            {isAr
              ? "4. بعد تسجيل الدخول، يمكنك الوصول إلى المنتج الذي اشتريته من صفحة مشترياتي."
              : "4. After logging in, you can access the product you purchased from the Purchased Product page."}
          </div>
          <div style={{ fontSize: "13.5px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span>{isAr ? "الرابط:" : "Link:"}</span>
            <Link
              to="/account"
              style={{
                color: "#00e5ff",
                fontWeight: 800,
                textDecoration: "underline",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <ShoppingBag size={14} />
              <span>{isAr ? "مشترياتي" : "My Purchases"}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Re-check Action & Support */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          paddingTop: "24px",
        }}
      >
        <Link
          to="/account"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "11px 22px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #00e5ff 0%, #0098d4 100%)",
            color: "#07090e",
            fontWeight: 800,
            fontSize: "13.5px",
            textDecoration: "none",
            boxShadow: "0 4px 16px rgba(0, 229, 255, 0.3)",
            transition: "transform 0.15s ease",
          }}
        >
          <ShoppingBag size={16} />
          <span>{isAr ? "الانتقال إلى مشترياتي" : "Go to My Purchases"}</span>
        </Link>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "11px 20px",
              borderRadius: "12px",
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.16)",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={14} />
            <span>{isAr ? "إعادة فحص الاتصال" : "Re-check Connection"}</span>
          </button>
        )}

        <a
          href="https://wa.me/962776252313"
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "11px 20px",
            borderRadius: "12px",
            backgroundColor: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            color: "#94a3b8",
            fontWeight: 700,
            fontSize: "13px",
            textDecoration: "none",
          }}
        >
          <span>{isAr ? "تواصل مع الدعم الفني" : "Contact Support"}</span>
          <ExternalLink size={13} style={{ opacity: 0.7 }} />
        </a>
      </div>

      {/* Security IP Diagnostics (Subtle) */}
      {(purchaseIp || currentIp) && (
        <div
          style={{
            marginTop: "20px",
            textAlign: "center",
            fontSize: "11px",
            color: "#64748b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          {purchaseIp && (
            <span>
              🔒 {isAr ? "IP الشراء:" : "Purchase IP:"} <code style={{ color: "#94a3b8" }}>{purchaseIp}</code>
            </span>
          )}
          {currentIp && (
            <span>
              🌐 {isAr ? "IP الحالي:" : "Current IP:"} <code style={{ color: "#94a3b8" }}>{currentIp}</code>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
