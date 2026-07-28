import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLang } from "@/lib/gx/i18n";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset password — GX Store" },
      { name: "description", content: "Set a new password for your GX Store account." },
      { property: "og:title", content: "Reset password — GX Store" },
      { property: "og:description", content: "Set a new password for your GX Store account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [pass, setPass] = useState("");

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setReady(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pass });
    setLoading(false);
    if (error) return toast.error(error.message);
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
          <h1 className="gx-rp-title">{t("auth.reset_title")}</h1>
          {!ready ? (
            <p className="gx-rp-sub">...</p>
          ) : (
            <form onSubmit={submit} className="gx-rp-form">
              <label>{t("auth.new_password")}</label>
              <input type="password" required minLength={6} dir="ltr" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••" />
              <button type="submit" className="gx-rp-btn" disabled={loading}>
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
.gx-rp-wrap{position:relative;width:100%;max-width:420px;}
.gx-rp-brand{display:flex;align-items:center;justify-content:center;gap:10px;text-decoration:none;color:#f5f6f8;font-weight:900;font-size:20px;margin-bottom:20px;}
.gx-rp-brand img{width:44px;height:44px;object-fit:contain;}
.gx-rp-brand b{color:#00e5ff;}
.gx-rp-card{background:#12151f;border:1.5px solid rgba(255,255,255,0.08);border-radius:20px;padding:28px 22px;box-shadow:0 20px 60px -20px rgba(0,229,255,0.15);}
.gx-rp-title{font-size:22px;font-weight:900;margin:0 0 14px;}
.gx-rp-sub{font-size:13px;color:#8b90a0;margin:0;}
.gx-rp-form{display:flex;flex-direction:column;gap:6px;}
.gx-rp-form label{font-size:13px;font-weight:700;color:#c8ccd6;}
.gx-rp-form input{background:#0d1018;border:1.5px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px 14px;color:#f5f6f8;font-size:14px;outline:none;font-family:inherit;transition:border-color .18s;}
.gx-rp-form input:focus{border-color:#00e5ff;}
.gx-rp-btn{margin-top:16px;padding:13px;border-radius:11px;border:0;cursor:pointer;background:linear-gradient(135deg,#00e5ff,#00b8d4);color:#05060a;font-weight:800;font-size:14px;font-family:inherit;transition:all .18s;}
.gx-rp-btn:hover:not(:disabled){filter:brightness(1.1);transform:translateY(-1px);}
.gx-rp-btn:disabled{opacity:.6;cursor:not-allowed;}
.gx-rp-back{display:block;text-align:center;margin-top:18px;color:#8b90a0;font-size:13px;text-decoration:none;transition:color .18s;}
.gx-rp-back:hover{color:#00e5ff;}
`;
