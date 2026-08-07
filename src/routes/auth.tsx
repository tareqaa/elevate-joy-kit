import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLang } from "@/lib/gx/i18n";
import { useAuthActions } from "@/lib/gx/use-auth-actions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — GX Store" },
      { name: "description", content: "Sign in or create an account to track your orders." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useLang();
  const navigate = useNavigate();
  const { signIn, signUp, resetPassword, signInWithGoogle } = useAuthActions();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/account" });
    });
  }, [navigate]);

  const [siEmail, setSiEmail] = useState("");
  const [siPass, setSiPass] = useState("");
  const [suUsername, setSuUsername] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPass, setSuPass] = useState("");

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await signIn(siEmail, siPass);
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(t("auth.hello"));
    navigate({ to: "/account" });
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await signUp(suEmail, suPass, suUsername, "/account");
    setLoading(false);
    if (!res.ok) {
      return toast.error(res.error === "invalid_username" ? t("auth.username_pattern_err") : res.error);
    }
    toast.success(t("auth.signup_ok"));
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await resetPassword(siEmail);
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(t("auth.reset_sent"));
  }

  async function handleGoogle() {
    setLoading(true);
    const res = await signInWithGoogle("/account");
    if (!res.ok) { setLoading(false); toast.error(res.error); }
  }


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
          <div className="gx-auth-tabs">
            <button className={mode === "signin" ? "on" : ""} onClick={() => setMode("signin")} type="button">{t("auth.tab_signin")}</button>
            <button className={mode === "signup" ? "on" : ""} onClick={() => setMode("signup")} type="button">{t("auth.tab_signup")}</button>
          </div>

          <h1 className="gx-auth-title">{mode === "signin" ? t("auth.welcome_back") : mode === "signup" ? t("auth.create_account") : t("auth.reset_title")}</h1>
          <p className="gx-auth-sub">
            {mode === "signin" ? t("auth.signin_desc") : mode === "signup" ? t("auth.signup_desc") : t("auth.reset_btn")}
          </p>

          {mode === "signin" ? (
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
            <form onSubmit={handleReset} className="gx-auth-form">
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
