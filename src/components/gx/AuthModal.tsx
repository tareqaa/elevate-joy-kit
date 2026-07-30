import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useLang } from "@/lib/gx/i18n";

export function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLang();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [username, setUsername] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg({ text: "..." });
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (error) return setMsg({ text: error.message });
        return setMsg({ text: t("auth.reset_sent"), ok: true });
      }
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass });
        if (error) return setMsg({ text: error.message });
        setMsg({ text: t("auth.signed_in_ok"), ok: true });
        setTimeout(() => { onClose(); window.location.reload(); }, 500);
      } else {
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())) return setMsg({ text: t("auth.username_pattern_err") });
        const { error } = await supabase.auth.signUp({
          email: email.trim(), password: pass,
          options: { emailRedirectTo: window.location.origin + "/", data: { username: username.trim() } },
        });
        if (error) return setMsg({ text: error.message });
        setMsg({ text: t("auth.signup_ok"), ok: true });
      }
    } catch (err) {
      setMsg({ text: (err as Error).message || "Unexpected error" });
    }
  }

  async function google() {
    setMsg({ text: "..." });
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/",
      });
      if (result.error) return setMsg({ text: (result.error as Error).message || "Google sign-in failed" });
      if (result.redirected) return;
      setMsg({ text: t("auth.signed_in_ok"), ok: true });
      setTimeout(() => { onClose(); window.location.reload(); }, 400);
    } catch (err) {
      setMsg({ text: (err as Error).message || "Google sign-in failed" });
    }
  }


  return (
    <div className={"gx-auth-modal" + (open ? " open" : "")}>
      <div className="gx-auth-modal__scrim" onClick={onClose} />
      <div className="gx-auth-modal__card" role="dialog" aria-modal="true">
        <button type="button" className="gx-auth-modal__close" onClick={onClose} aria-label={t("common.close")}>✕</button>
        <div className="gx-auth-modal__avatar">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
        </div>
        <div className="gx-auth-modal__tabs">
          <button type="button" className={mode === "signin" ? "on" : ""} onClick={() => setMode("signin")}>{t("auth.tab_signin")}</button>
          <button type="button" className={mode === "signup" ? "on" : ""} onClick={() => setMode("signup")}>{t("auth.tab_signup")}</button>
        </div>
        <h3 className="gx-auth-modal__title">{mode === "signin" ? t("auth.signin_btn") : mode === "signup" ? t("auth.signup_btn") : t("auth.reset_title")}</h3>
        <form className="gx-auth-modal__form" onSubmit={submit}>
          {mode === "signup" && (
            <>
              <label>{t("acc.gametag")}</label>
              <input type="text" dir="ltr" placeholder="your_tag" pattern="[a-zA-Z0-9_]{3,20}" value={username} onChange={(e) => setUsername(e.target.value)} />
            </>
          )}
          <label>{t("auth.email2")}</label>
          <input type="email" dir="ltr" placeholder="your@email.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
          {mode !== "reset" && (
            <>
              <label>{t("auth.password")}</label>
              <input type="password" dir="ltr" placeholder="••••••" minLength={6} required value={pass} onChange={(e) => setPass(e.target.value)} />
            </>
          )}
          <button type="submit" className="gx-auth-modal__submit">{mode === "signin" ? t("auth.signin_btn") : mode === "signup" ? t("auth.signup_btn") : t("auth.reset_btn")}</button>
          {mode === "signin" && (
            <button type="button" className="gx-auth-modal__link" onClick={() => { setMode("reset"); setMsg(null); }}>{t("auth.forgot")}</button>
          )}
          {mode === "reset" && (
            <button type="button" className="gx-auth-modal__link" onClick={() => { setMode("signin"); setMsg(null); }}>{t("auth.back_signin")}</button>
          )}
        </form>
        <div className="gx-auth-modal__divider"><span>{t("auth.or_social")}</span></div>
        <div className="gx-auth-modal__social">
          <button type="button" className="gx-social-btn" onClick={google} title="Google">
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          </button>
        </div>
        <div className={"gx-auth-modal__msg " + (msg?.ok ? "ok" : "err")}>{msg?.text ?? ""}</div>
      </div>
    </div>
  );
}
