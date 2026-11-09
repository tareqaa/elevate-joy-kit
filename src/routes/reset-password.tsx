import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLang } from "@/lib/gx/i18n";
import { useAuthActions } from "@/lib/gx/use-auth-actions";
import { recordAuthAttemptServer } from "@/lib/gx/security.functions";
import { KeyRound, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "استعادة كلمة المرور | متجر GX Store" },
      { name: "description", content: "تعيين كلمة مرور جديدة لحسابك في متجر GX Store." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { t, lang } = useLang();
  const ar = lang === "ar";
  const navigate = useNavigate();
  const { resetPassword, verifyPasswordResetOtp } = useAuthActions();

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"email" | "otp" | "password">("email");

  // Form states
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [pass, setPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive && data.session) setStep("password");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setStep("password");
      }
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Step 1: Send OTP to Email
  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      toast.error(ar ? "يرجى إدخال بريد إلكتروني صالح" : "Please enter a valid email");
      return;
    }

    setLoading(true);
    const res = await resetPassword(cleanEmail);
    setLoading(false);

    if (!res.ok) {
      toast.error(res.error || (ar ? "تعذّر إرسال رمز التحقق" : "Failed to send verification code"));
      return;
    }

    setResendCooldown(15);
    setStep("otp");
    toast.success(ar ? "تم إرسال رمز التحقق إلى بريدك الإلكتروني" : "Verification code sent to your email");
  }

  // Step 2: Verify OTP
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otpCode.trim().replace(/\D/g, "");

    if (cleanOtp.length < 6 || cleanOtp.length > 10) {
      toast.error(t("auth.otp_invalid"));
      return;
    }

    setLoading(true);
    const res = await verifyPasswordResetOtp(cleanEmail, cleanOtp);
    setLoading(false);

    if (!res.ok) {
      toast.error(res.error || t("auth.otp_invalid"));
      return;
    }

    setStep("password");
    toast.success(ar ? "تم التحقق من الرمز بنجاح! أدخل كلمة المرور الجديدة." : "Code verified! Please enter your new password.");
  }

  // Resend code handler
  async function handleResendCode() {
    if (resendCooldown > 0 || !email) return;
    setLoading(true);
    const res = await resetPassword(email.trim().toLowerCase());
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error || (ar ? "تعذّر إعادة إرسال الرمز" : "Failed to resend code"));
      return;
    }
    setResendCooldown(15);
    toast.success(ar ? "تمت إعادة إرسال رمز التحقق" : "Verification code resent");
  }

  // Step 3: Set New Password
  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (pass.length < 6) {
      toast.error(ar ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters");
      return;
    }
    if (pass !== confirmPass) {
      toast.error(t("auth.passwords_dont_match"));
      return;
    }

    setLoading(true);
    const { data: updateData, error } = await supabase.auth.updateUser({ password: pass });
    setLoading(false);
    if (error) return toast.error(error.message);

    try {
      const userEmail = updateData?.user?.email || email;
      if (userEmail) {
        void recordAuthAttemptServer({
          data: {
            email: userEmail,
            type: "reset_success",
            status: "success",
            userId: updateData?.user?.id,
          },
        }).catch(() => {});
      }
    } catch {}

    toast.success(t("auth.password_updated"));
    navigate({ to: "/account" });
  }

  return (
    <div className="gx-rp-root">
      <style>{css}</style>
      <div className="gx-rp-bg" />
      <div className="gx-rp-wrap">
        <Link to="/" className="gx-rp-brand">
          <img src="/app/assets/img/gx-logo.png" alt="GX" />
          <span>GX <b>STORE</b></span>
        </Link>
        <div className="gx-rp-card">
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(0, 229, 255, 0.12)", border: "1.5px solid rgba(0, 229, 255, 0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <KeyRound style={{ width: "24px", height: "24px", color: "#00e5ff" }} />
            </div>
          </div>

          <h1 className="gx-rp-title">
            {step === "password"
              ? (ar ? "تعيين كلمة المرور الجديدة" : "Set New Password")
              : step === "otp"
              ? (ar ? "رمز التحقق (OTP)" : "Verification Code")
              : t("auth.reset_title")}
          </h1>
          <p className="gx-rp-sub">
            {step === "password"
              ? (ar ? "أدخل كلمة المرور الجديدة لحسابك" : "Enter your new account password")
              : step === "otp"
              ? (ar ? `تم إرسال رمز التحقق إلى: ${email}` : `A verification code was sent to: ${email}`)
              : (ar ? "أدخل بريدك الإلكتروني لإرسال رمز التحقق" : "Enter your email to receive a verification code")}
          </p>

          {/* Step 1: Enter Email Only */}
          {step === "email" && (
            <form onSubmit={handleSendEmail} className="gx-rp-form">
              <label>{t("auth.email")}</label>
              <input
                type="email"
                required
                autoFocus
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
              />
              <button type="submit" className="gx-rp-btn" disabled={loading || !email.includes("@")}>
                {loading ? "..." : (ar ? "إرسال رمز التحقق" : "Send Verification Code")}
              </button>
            </form>
          )}

          {/* Step 2: Enter OTP Code Only */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="gx-rp-form">
              <label>{t("auth.otp_code")}</label>
              <input
                type="text"
                required
                autoFocus
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                dir="ltr"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                style={{
                  textAlign: "center",
                  letterSpacing: otpCode.length > 6 ? "5px" : "8px",
                  fontSize: "1.3rem",
                  fontWeight: 700,
                }}
              />
              <button type="submit" className="gx-rp-btn" disabled={loading || otpCode.length < 6}>
                {loading ? "..." : (ar ? "التحقق من الرمز" : "Verify Code")}
              </button>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", fontSize: "13px" }}>
                <button
                  type="button"
                  className="gx-rp-linkbtn"
                  disabled={loading || resendCooldown > 0}
                  onClick={handleResendCode}
                  style={{ opacity: resendCooldown > 0 ? 0.6 : 1 }}
                >
                  {resendCooldown > 0 ? `${t("auth.otp_resend_wait")} (${resendCooldown}s)` : t("auth.otp_resend")}
                </button>
                <button
                  type="button"
                  className="gx-rp-linkbtn"
                  onClick={() => { setStep("email"); setOtpCode(""); }}
                >
                  {ar ? "تغيير البريد الإلكتروني" : "Change Email"}
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Enter New Password */}
          {step === "password" && (
            <form onSubmit={handleSetPassword} className="gx-rp-form">
              <label>{t("auth.new_password")}</label>
              <input
                type="password"
                required
                autoFocus
                minLength={6}
                dir="ltr"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="••••••"
              />
              <label>{t("auth.confirm_password")}</label>
              <input
                type="password"
                required
                minLength={6}
                dir="ltr"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="••••••"
              />
              <button type="submit" className="gx-rp-btn" disabled={loading || pass.length < 6 || confirmPass.length < 6}>
                {loading ? "..." : t("auth.update_password")}
              </button>
            </form>
          )}

          <Link to="/auth" className="gx-rp-back">{t("auth.back_signin")}</Link>
        </div>
      </div>
    </div>
  );
}

const css = `
.gx-rp-root{position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px 16px;background:#090b10;color:#f5f6f8;font-family:'Cairo','Tajawal',system-ui,sans-serif;overflow:hidden;}
.gx-rp-bg{position:absolute;inset:0;background:
  radial-gradient(600px 400px at 20% 10%, rgba(0,229,255,0.14), transparent 60%),
  radial-gradient(500px 350px at 85% 90%, rgba(255,45,120,0.10), transparent 60%),
  linear-gradient(180deg,#0b0e15 0%,#090b10 100%);pointer-events:none;}
.gx-rp-wrap{position:relative;width:100%;max-width:440px;}
.gx-rp-brand{display:flex;align-items:center;justify-content:center;gap:10px;text-decoration:none;color:#f5f6f8;font-weight:900;font-size:20px;margin-bottom:20px;}
.gx-rp-brand img{width:44px;height:44px;object-fit:contain;}
.gx-rp-brand b{color:#00e5ff;}
.gx-rp-card{background:#12151f;border:1.5px solid rgba(255,255,255,0.08);border-radius:20px;padding:28px 22px;box-shadow:0 20px 60px -20px rgba(0,229,255,0.15);}
.gx-rp-title{font-size:22px;font-weight:900;margin:0 0 6px;text-align:center;}
.gx-rp-sub{font-size:13px;color:#8b90a0;margin:0 0 20px;text-align:center;line-height:1.5;}
.gx-rp-form{display:flex;flex-direction:column;gap:6px;}
.gx-rp-form label{font-size:13px;font-weight:700;color:#c8ccd6;margin-top:10px;}
.gx-rp-form input{background:#0d1018;border:1.5px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px 14px;color:#f5f6f8;font-size:14px;outline:none;transition:border-color .18s;font-family:inherit;}
.gx-rp-form input:focus{border-color:#00e5ff;}
.gx-rp-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:13px;border-radius:11px;font-weight:800;font-size:14px;border:0;cursor:pointer;margin-top:16px;background:linear-gradient(135deg,#00e5ff,#00b8d4);color:#05060a;transition:all .18s;font-family:inherit;}
.gx-rp-btn:hover:not(:disabled){filter:brightness(1.1);transform:translateY(-1px);}
.gx-rp-btn:disabled{opacity:0.6;cursor:not-allowed;}
.gx-rp-linkbtn{background:none;border:0;cursor:pointer;color:#8b90a0;font-size:13px;font-weight:600;font-family:inherit;transition:color .18s;padding:0;}
.gx-rp-linkbtn:hover:not(:disabled){color:#00e5ff;}
.gx-rp-back{display:block;text-align:center;margin-top:18px;color:#8b90a0;font-size:13px;text-decoration:none;transition:color .18s;}
.gx-rp-back:hover{color:#00e5ff;}
`;
