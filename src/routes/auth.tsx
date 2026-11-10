import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useLang, getHeadLang } from "@/lib/gx/i18n";
import { useAuthActions } from "@/lib/gx/use-auth-actions";
import { ShieldCheck, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { redirect?: string; mode?: "signin" | "signup" | "reset"; email?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    mode: search.mode === "signup" ? "signup" : search.mode === "reset" ? "reset" : search.mode === "signin" ? "signin" : undefined,
    email: typeof search.email === "string" ? search.email : undefined,
  }),
  head: () => {
    const isEn = getHeadLang() === "en";
    return {
      meta: [
        { title: isEn ? "Sign In / Register | GX Store" : "تسجيل الدخول / حساب جديد | متجر GX Store" },
        {
          name: "description",
          content: isEn
            ? "Sign in to your GX Store account to track your orders or create a new account."
            : "سجّل الدخول إلى حسابك في متجر GX Store لمتابعة طلباتك أو إنشاء حساب جديد.",
        },
        { name: "robots", content: "noindex, follow" },
      ],
    };
  },
  component: AuthPage,
});

type AuthMode = "signin" | "signup" | "reset" | "reset_otp" | "reset_new_password" | "signup_otp" | "2fa";

function AuthPage() {
  const { t, lang } = useLang();
  const ar = lang === "ar";
  const search = useSearch({ from: "/auth" });
  const navigate = useNavigate();

  const {
    signIn,
    signUp,
    resetPassword,
    verifyPasswordResetOtp,
    updatePassword,
    verifySignUpOtp,
    signInWithGoogle,
    verify2fa,
    cancel2fa,
    resumeExistingSession,
  } = useAuthActions();

  const [mode, setMode] = useState<AuthMode>(
    search.mode === "signup" ? "signup" : search.mode === "reset" ? "reset" : "signin"
  );
  const [loading, setLoading] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Sign-in state
  const [siEmail, setSiEmail] = useState(search.email || "");
  const [siPass, setSiPass] = useState("");

  // Sign-up state
  const [suEmail, setSuEmail] = useState(search.email || "");
  const [suPass, setSuPass] = useState("");
  const [suUsername, setSuUsername] = useState("");

  // OTP state
  const [otpCode, setOtpCode] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  const safeTarget = search.redirect && search.redirect.startsWith("/") && !search.redirect.startsWith("//")
    ? search.redirect
    : "/account";

  // Returning from Google (or already signed in): finish the sign-in instead
  // of showing the login form again. Runs once on page load only, so the
  // password-reset / signup OTP flows (which create a session mid-page) are untouched.
  useEffect(() => {
    let cancelled = false;
    void resumeExistingSession().then((res) => {
      if (cancelled || !res.signedIn) return;
      if (res.mfaRequired && res.factorId) {
        try { sessionStorage.setItem("gx_2fa_pending", "true"); } catch { /* noop */ }
        setMfaFactorId(res.factorId);
        setMfaCode("");
        setMode("2fa");
        toast.info(t("auth.2fa_desc"));
        return;
      }
      try { sessionStorage.removeItem("gx_2fa_pending"); } catch { /* noop */ }
      navigate({ to: safeTarget, replace: true });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await signIn(siEmail, siPass);
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    if (res.mfaRequired && res.factorId) {
      if (typeof window !== "undefined") {
        try { sessionStorage.setItem("gx_2fa_pending", "true"); } catch { /* noop */ }
      }
      setMfaFactorId(res.factorId);
      setMfaCode("");
      setMode("2fa");
      toast.info(t("auth.2fa_desc"));
      return;
    }
    if (typeof window !== "undefined") {
      try { sessionStorage.removeItem("gx_2fa_pending"); } catch { /* noop */ }
    }
    toast.success(t("auth.hello"));
    navigate({ to: safeTarget });
  }

  async function handleVerify2fa(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaFactorId) return;
    setLoading(true);
    const res = await verify2fa(mfaFactorId, mfaCode);
    setLoading(false);
    if (!res.ok) return toast.error(res.error || t("auth.2fa_invalid_code"));
    if (typeof window !== "undefined") {
      try { sessionStorage.removeItem("gx_2fa_pending"); } catch { /* noop */ }
    }
    toast.success(t("auth.hello"));
    navigate({ to: safeTarget });
  }

  async function handleCancel2fa() {
    if (typeof window !== "undefined") {
      try { sessionStorage.removeItem("gx_2fa_pending"); } catch { /* noop */ }
    }
    await cancel2fa();
    setMfaFactorId(null);
    setMfaCode("");
    setMode("signin");
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await signUp(suEmail, suPass, suUsername, safeTarget);
    setLoading(false);
    if (!res.ok) {
      return toast.error(res.error === "invalid_username" ? t("auth.username_pattern_err") : res.error);
    }

    if (res.requiresOtp) {
      setMode("signup_otp");
      setOtpCode("");
      setResendCooldown(15);
      toast.success(t("auth.reset_sent"));
    } else {
      toast.success(t("auth.signup_ok"));
      navigate({ to: safeTarget });
    }
  }

  async function handleResetRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await resetPassword(siEmail);
    setLoading(false);
    if (!res.ok) {
      if (res.isGuestOnly) {
        toast.info(res.error, { duration: 9000 });
        setSuEmail(siEmail);
        setMode("signup");
        return;
      }
      return toast.error(res.error);
    }
    setMode("reset_otp");
    setOtpCode("");
    setNewPass("");
    setConfirmPass("");
    setResendCooldown(15);
    toast.success(t("auth.reset_sent"));
  }

  async function handleVerifyResetOtp(e: React.FormEvent) {
    e.preventDefault();
    const cleanOtp = otpCode.trim().replace(/\D/g, "");
    if (cleanOtp.length < 6 || cleanOtp.length > 10) {
      return toast.error(t("auth.otp_invalid"));
    }

    setLoading(true);
    const res = await verifyPasswordResetOtp(siEmail, cleanOtp);
    setLoading(false);
    if (!res.ok) {
      return toast.error(res.error || t("auth.otp_invalid"));
    }

    setMode("reset_new_password");
    toast.success(ar ? "تم التحقق من الرمز بنجاح! يمكنك الآن تعيين كلمة المرور الجديدة." : "Code verified! Please set your new password.");
  }

  async function handleSetNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPass.length < 6) {
      return toast.error(ar ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters");
    }
    if (newPass !== confirmPass) {
      return toast.error(t("auth.passwords_dont_match"));
    }

    setLoading(true);
    const res = await updatePassword(newPass);
    setLoading(false);
    if (!res.ok) {
      return toast.error(res.error || "Failed to update password");
    }

    toast.success(t("auth.password_updated"));
    navigate({ to: safeTarget });
  }

  async function handleVerifySignUpOtp(e: React.FormEvent) {
    e.preventDefault();
    const cleanOtp = otpCode.trim().replace(/\D/g, "");
    if (cleanOtp.length < 6 || cleanOtp.length > 10) {
      return toast.error(t("auth.otp_invalid"));
    }

    setLoading(true);
    const res = await verifySignUpOtp(suEmail, cleanOtp);
    setLoading(false);
    if (!res.ok) {
      return toast.error(res.error || t("auth.otp_invalid"));
    }

    toast.success(t("auth.signup_success_login"));
    navigate({ to: safeTarget });
  }

  async function handleResendCode() {
    if (resendCooldown > 0) return;
    const targetEmail = mode === "reset_otp" ? siEmail : suEmail;
    if (!targetEmail) return;

    setLoading(true);
    if (mode === "reset_otp") {
      const res = await resetPassword(targetEmail);
      setLoading(false);
      if (!res.ok) return toast.error(res.error);
      setResendCooldown(15);
      toast.success(t("auth.reset_sent"));
    } else if (mode === "signup_otp") {
      const res = await signUp(suEmail, suPass, suUsername, safeTarget);
      setLoading(false);
      if (!res.ok) return toast.error(res.error);
      setResendCooldown(15);
      toast.success(t("auth.reset_sent"));
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const res = await signInWithGoogle(safeTarget);
    if (!res.ok) { setLoading(false); toast.error(res.error); }
  }

  const isOtpScreen = mode === "reset_otp" || mode === "reset_new_password" || mode === "signup_otp" || mode === "2fa";

  return (
    <div className="gx-auth-root">
      <style>{cssBlock}</style>
      <div className="gx-auth-bg" />
      <div className="gx-auth-wrap">
        <Link to="/" className="gx-auth-brand">
          <img src="/app/assets/img/gx-logo.png" alt="GX" />
          <span>GX <b>STORE</b></span>
        </Link>

        <div className="gx-auth-card">
          {!isOtpScreen && (
            <div className="gx-auth-tabs">
              <button className={mode === "signin" ? "on" : ""} onClick={() => setMode("signin")} type="button">{t("auth.tab_signin")}</button>
              <button className={mode === "signup" ? "on" : ""} onClick={() => setMode("signup")} type="button">{t("auth.tab_signup")}</button>
            </div>
          )}

          <h1 className="gx-auth-title">
            {mode === "signin"
              ? t("auth.welcome_back")
              : mode === "signup"
              ? t("auth.create_account")
              : mode === "2fa"
              ? t("auth.2fa_title")
              : mode === "reset_otp"
              ? (ar ? "التحقق من الرمز" : "Verify Code")
              : mode === "reset_new_password"
              ? (ar ? "تعيين كلمة المرور الجديدة" : "Set New Password")
              : mode === "signup_otp"
              ? t("auth.signup_verify_title")
              : t("auth.reset_title")}
          </h1>
          <p className="gx-auth-sub">
            {mode === "signin"
              ? t("auth.signin_desc")
              : mode === "signup"
              ? t("auth.signup_desc")
              : mode === "2fa"
              ? t("auth.2fa_desc")
              : mode === "reset_otp"
              ? `${t("auth.otp_sent_to")} ${siEmail}`
              : mode === "reset_new_password"
              ? (ar ? "أدخل كلمة المرور الجديدة لحسابك" : "Enter your new account password")
              : mode === "signup_otp"
              ? `${t("auth.otp_sent_to")} ${suEmail}`
              : t("auth.reset_btn")}
          </p>

          {mode === "2fa" ? (
            <form onSubmit={handleVerify2fa} className="gx-auth-form">
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(0, 229, 255, 0.12)", border: "1.5px solid rgba(0, 229, 255, 0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ShieldCheck style={{ width: "24px", height: "24px", color: "#00e5ff" }} />
                </div>
              </div>
              <label>{t("auth.2fa_code")}</label>
              <input
                type="text"
                required
                autoFocus
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                dir="ltr"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                style={{ textAlign: "center", letterSpacing: "8px", fontSize: "1.25rem", fontWeight: 700 }}
              />
              <button type="submit" className="gx-auth-btn primary" disabled={loading || mfaCode.length !== 6}>
                {loading ? "..." : t("auth.2fa_verify_btn")}
              </button>
              <button type="button" className="gx-auth-linkbtn" onClick={handleCancel2fa}>
                {t("auth.2fa_cancel_btn")}
              </button>
            </form>
          ) : mode === "reset_otp" ? (
            <form onSubmit={handleVerifyResetOtp} className="gx-auth-form">
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(0, 229, 255, 0.12)", border: "1.5px solid rgba(0, 229, 255, 0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <KeyRound style={{ width: "24px", height: "24px", color: "#00e5ff" }} />
                </div>
              </div>
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
              <button type="submit" className="gx-auth-btn primary" disabled={loading || otpCode.length < 6}>
                {loading ? "..." : (ar ? "التحقق من الرمز" : "Verify Code")}
              </button>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", fontSize: "13px" }}>
                <button
                  type="button"
                  className="gx-auth-linkbtn"
                  disabled={loading || resendCooldown > 0}
                  onClick={handleResendCode}
                  style={{ opacity: resendCooldown > 0 ? 0.6 : 1, margin: 0 }}
                >
                  {resendCooldown > 0 ? `${t("auth.otp_resend_wait")} (${resendCooldown}s)` : t("auth.otp_resend")}
                </button>
                <button type="button" className="gx-auth-linkbtn" onClick={() => setMode("reset")} style={{ margin: 0 }}>
                  {t("auth.back_signin")}
                </button>
              </div>
            </form>
          ) : mode === "reset_new_password" ? (
            <form onSubmit={handleSetNewPassword} className="gx-auth-form">
              <label>{t("auth.new_password")}</label>
              <input
                type="password"
                required
                autoFocus
                minLength={6}
                dir="ltr"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
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
              <button type="submit" className="gx-auth-btn primary" disabled={loading || newPass.length < 6 || confirmPass.length < 6}>
                {loading ? "..." : t("auth.update_password")}
              </button>
            </form>
          ) : mode === "signup_otp" ? (
            <form onSubmit={handleVerifySignUpOtp} className="gx-auth-form">
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(0, 229, 255, 0.12)", border: "1.5px solid rgba(0, 229, 255, 0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <KeyRound style={{ width: "24px", height: "24px", color: "#00e5ff" }} />
                </div>
              </div>
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
              <button type="submit" className="gx-auth-btn primary" disabled={loading || otpCode.length < 6}>
                {loading ? "..." : t("auth.signup_confirm_btn")}
              </button>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", fontSize: "13px" }}>
                <button
                  type="button"
                  className="gx-auth-linkbtn"
                  disabled={loading || resendCooldown > 0}
                  onClick={handleResendCode}
                  style={{ opacity: resendCooldown > 0 ? 0.6 : 1, margin: 0 }}
                >
                  {resendCooldown > 0 ? `${t("auth.otp_resend_wait")} (${resendCooldown}s)` : t("auth.otp_resend")}
                </button>
                <button type="button" className="gx-auth-linkbtn" onClick={() => setMode("signup")} style={{ margin: 0 }}>
                  {t("auth.back_signin")}
                </button>
              </div>
            </form>
          ) : mode === "signin" ? (
            <form onSubmit={handleSignIn} className="gx-auth-form">
              <label>{t("auth.email")}</label>
              <input type="email" required dir="ltr" value={siEmail} onChange={(e) => setSiEmail(e.target.value)} placeholder="you@email.com" />
              <label>{t("auth.password")}</label>
              <input type="password" required minLength={6} dir="ltr" value={siPass} onChange={(e) => setSiPass(e.target.value)} placeholder="••••••" />
              <button type="submit" className="gx-auth-btn primary" disabled={loading}>
                {loading ? "..." : t("auth.signin_btn")}
              </button>
              <button type="button" className="gx-auth-linkbtn" onClick={() => setMode("reset")}>{t("auth.forgot")}</button>
            </form>
          ) : mode === "reset" ? (
            <form onSubmit={handleResetRequest} className="gx-auth-form">
              <label>{t("auth.email")}</label>
              <input type="email" required dir="ltr" value={siEmail} onChange={(e) => setSiEmail(e.target.value)} placeholder="you@email.com" />
              <button type="submit" className="gx-auth-btn primary" disabled={loading}>
                {loading ? "..." : t("auth.reset_btn")}
              </button>
              <button type="button" className="gx-auth-linkbtn" onClick={() => setMode("signin")}>{t("auth.back_signin")}</button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="gx-auth-form">
              <label>{t("acc.gametag")}</label>
              <input type="text" required dir="ltr" value={suUsername} onChange={(e) => setSuUsername(e.target.value)} placeholder="your_tag" pattern="[a-zA-Z0-9_]{3,20}" />
              <label>{t("auth.email")}</label>
              <input type="email" required dir="ltr" value={suEmail} onChange={(e) => setSuEmail(e.target.value)} placeholder="you@email.com" />
              <label>{t("auth.password")} <span className="hint">{t("auth.password_hint")}</span></label>
              <input type="password" required minLength={6} dir="ltr" value={suPass} onChange={(e) => setSuPass(e.target.value)} placeholder="••••••" />
              <button type="submit" className="gx-auth-btn primary" disabled={loading}>
                {loading ? "..." : t("auth.signup_btn")}
              </button>
            </form>
          )}

          {!isOtpScreen && (
            <>
              <div className="gx-auth-divider"><span>{t("auth.or")}</span></div>

              <button className="gx-auth-btn google" onClick={handleGoogle} disabled={loading} type="button">
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {t("auth.google")}
              </button>
            </>
          )}

          <Link to="/" className="gx-auth-back">{t("auth.back_to_store")}</Link>
        </div>
      </div>
    </div>
  );
}

const cssBlock = `
.gx-auth-root{position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px 16px;background:#090b10;color:#f5f6f8;font-family:'Cairo','Tajawal',system-ui,sans-serif;overflow:hidden;}
.gx-auth-bg{position:absolute;inset:0;background:
  radial-gradient(600px 400px at 20% 10%, rgba(0,229,255,0.14), transparent 60%),
  radial-gradient(500px 350px at 85% 90%, rgba(255,45,120,0.10), transparent 60%),
  linear-gradient(180deg, #0b0e15 0%, #090b10 100%);pointer-events:none;}
.gx-auth-wrap{position:relative;width:100%;max-width:440px;}
.gx-auth-brand{display:flex;align-items:center;justify-content:center;gap:10px;text-decoration:none;color:#f5f6f8;font-weight:900;font-size:20px;margin-bottom:20px;}
.gx-auth-brand img{width:44px;height:44px;object-fit:contain;}
.gx-auth-brand b{color:#00e5ff;}
.gx-auth-card{background:#12151f;border:1.5px solid rgba(255,255,255,0.08);border-radius:20px;padding:28px 22px;box-shadow:0 20px 60px -20px rgba(0,229,255,0.15);}
.gx-auth-tabs{display:grid;grid-template-columns:1fr 1fr;background:#0d1018;border:1.5px solid rgba(255,255,255,0.08);border-radius:12px;padding:4px;margin-bottom:20px;}
.gx-auth-tabs button{background:transparent;border:0;padding:10px;border-radius:9px;color:#8b90a0;font-weight:700;font-size:14px;cursor:pointer;transition:all .18s;font-family:inherit;}
.gx-auth-tabs button.on{background:#00e5ff;color:#05060a;}
.gx-auth-title{font-size:22px;font-weight:900;margin:0 0 6px;}
.gx-auth-sub{font-size:13px;color:#8b90a0;margin:0 0 20px;}
.gx-auth-form{display:flex;flex-direction:column;gap:6px;}
.gx-auth-form label{font-size:13px;font-weight:700;color:#c8ccd6;margin-top:10px;}
.gx-auth-form label .hint{font-weight:500;color:#8b90a0;font-size:11px;}
.gx-auth-form input{background:#0d1018;border:1.5px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px 14px;color:#f5f6f8;font-size:14px;outline:none;transition:border-color .18s;font-family:inherit;}
.gx-auth-form input:focus{border-color:#00e5ff;}
.gx-auth-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:13px;border-radius:11px;font-weight:800;font-size:14px;border:0;cursor:pointer;margin-top:16px;transition:all .18s;font-family:inherit;}
.gx-auth-btn.primary{background:linear-gradient(135deg,#00e5ff,#00b8d4);color:#05060a;}
.gx-auth-btn.primary:hover:not(:disabled){filter:brightness(1.1);transform:translateY(-1px);}
.gx-auth-btn.google{background:#0d1018;color:#f5f6f8;border:1.5px solid rgba(255,255,255,0.1);}
.gx-auth-btn.google:hover:not(:disabled){border-color:#00e5ff;}
.gx-auth-btn:disabled{opacity:0.6;cursor:not-allowed;}
.gx-auth-divider{display:flex;align-items:center;gap:12px;margin:20px 0 4px;color:#8b90a0;font-size:12px;}
.gx-auth-divider::before,.gx-auth-divider::after{content:'';flex:1;height:1px;background:rgba(255,255,255,0.08);}
.gx-auth-back{display:block;text-align:center;margin-top:18px;color:#8b90a0;font-size:13px;text-decoration:none;transition:color .18s;}
.gx-auth-back:hover{color:#00e5ff;}
.gx-auth-linkbtn{background:none;border:0;cursor:pointer;color:#8b90a0;font-size:13px;font-weight:600;font-family:inherit;margin-top:12px;transition:color .18s;}
.gx-auth-linkbtn:hover{color:#00e5ff;}
`;
