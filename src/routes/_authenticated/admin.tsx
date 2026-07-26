import { createFileRoute, redirect, Outlet, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const user = (context as { user?: { id: string } }).user;
    if (!user) throw redirect({ to: "/auth" });
    const { data, error } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (error || !data) throw redirect({ to: "/account" });
  },
  component: AdminLayout,
});

const NAV: Array<{ to: "/admin" | "/admin/orders" | "/admin/users"; label: string; icon: string; exact?: boolean }> = [
  { to: "/admin", label: "نظرة عامة", icon: "📊", exact: true },
  { to: "/admin/orders", label: "الطلبات", icon: "📦" },
  { to: "/admin/users", label: "المستخدمون", icon: "👥" },
];

function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [openMobile, setOpenMobile] = useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("تم تسجيل الخروج");
    navigate({ to: "/auth" });
  }

  return (
    <div dir="rtl" className="gx-admin-root">
      <style>{adminCss}</style>

      <aside className={`gx-admin-side ${openMobile ? "open" : ""}`}>
        <div className="gx-side-brand">
          <img src="/app/assets/img/gx-logo.png" alt="GX" />
          <div>
            <div className="gx-side-title">GX <b>STORE</b></div>
            <div className="gx-side-sub">لوحة التحكم</div>
          </div>
        </div>

        <nav className="gx-side-nav">
          {NAV.map((n) => {
            const active = n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to} onClick={() => setOpenMobile(false)}
                className={`gx-side-link ${active ? "on" : ""}`}>
                <span className="ni">{n.icon}</span>
                <span>{n.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="gx-side-foot">
          <Link to="/" className="gx-side-link"><span className="ni">🏬</span><span>المتجر</span></Link>
          <Link to="/account" className="gx-side-link"><span className="ni">👤</span><span>حسابي</span></Link>
          <button className="gx-side-link gx-side-logout" onClick={signOut}>
            <span className="ni">↩︎</span><span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {openMobile && <div className="gx-admin-scrim" onClick={() => setOpenMobile(false)} />}

      <div className="gx-admin-main">
        <header className="gx-admin-top">
          <button className="gx-admin-burger" onClick={() => setOpenMobile((v) => !v)} aria-label="القائمة">☰</button>
          <div className="gx-admin-title">لوحة تحكم GX</div>
          <div className="gx-admin-badge">Admin</div>
        </header>
        <div className="gx-admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

const adminCss = `
.gx-admin-root{position:fixed;inset:0;display:flex;background:#090b10;color:#f5f6f8;font-family:'Cairo','Tajawal',system-ui,sans-serif;overflow:hidden;}
.gx-admin-side{width:260px;background:linear-gradient(180deg,#0d1018 0%,#0a0c14 100%);border-inline-start:1.5px solid rgba(255,255,255,.06);display:flex;flex-direction:column;padding:20px 14px;flex-shrink:0;z-index:20;}
.gx-side-brand{display:flex;align-items:center;gap:10px;padding:6px 6px 18px;border-bottom:1px solid rgba(255,255,255,.06);margin-bottom:14px;}
.gx-side-brand img{width:40px;height:40px;object-fit:contain;}
.gx-side-title{font-weight:900;font-size:16px;} .gx-side-title b{color:#00e5ff;}
.gx-side-sub{font-size:11px;color:#8b90a0;margin-top:2px;}
.gx-side-nav{display:flex;flex-direction:column;gap:4px;flex:1;}
.gx-side-link{display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:10px;color:#c8ccd6;text-decoration:none;font-size:14px;font-weight:600;background:transparent;border:0;cursor:pointer;font-family:inherit;text-align:right;transition:all .15s;}
.gx-side-link:hover{background:rgba(0,229,255,.08);color:#00e5ff;}
.gx-side-link.on{background:linear-gradient(135deg,rgba(0,229,255,.18),rgba(0,229,255,.05));color:#00e5ff;box-shadow:inset 0 0 0 1px rgba(0,229,255,.25);}
.gx-side-link .ni{font-size:16px;width:22px;text-align:center;}
.gx-side-foot{margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,.06);display:flex;flex-direction:column;gap:4px;}
.gx-side-logout{color:#ff6b6b;} .gx-side-logout:hover{background:rgba(255,107,107,.1);color:#ff6b6b;}

.gx-admin-main{flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden;}
.gx-admin-top{display:flex;align-items:center;gap:12px;padding:14px 22px;background:#0d1018;border-bottom:1.5px solid rgba(255,255,255,.06);flex-shrink:0;}
.gx-admin-burger{display:none;background:transparent;border:1.5px solid rgba(255,255,255,.1);color:#f5f6f8;width:38px;height:38px;border-radius:10px;font-size:18px;cursor:pointer;}
.gx-admin-title{font-weight:900;font-size:17px;flex:1;}
.gx-admin-badge{background:linear-gradient(135deg,#00e5ff,#00b8d4);color:#05060a;padding:5px 12px;border-radius:99px;font-size:11px;font-weight:800;}
.gx-admin-content{flex:1;overflow-y:auto;padding:22px;}

.gx-admin-scrim{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:15;}

@media (max-width: 900px){
  .gx-admin-side{position:fixed;top:0;bottom:0;right:0;transform:translateX(100%);transition:transform .25s ease;box-shadow:-20px 0 40px rgba(0,0,0,.5);}
  .gx-admin-side.open{transform:translateX(0);}
  .gx-admin-burger{display:inline-flex;align-items:center;justify-content:center;}
  .gx-admin-content{padding:16px;}
}

/* Themed cards inside content (shadcn Card overrides) */
.gx-admin-content [data-slot="card"],
.gx-admin-content .rounded-lg.border.bg-card,
.gx-admin-content .bg-card{background:#12151f !important;border-color:rgba(255,255,255,.08) !important;color:#f5f6f8;}
.gx-admin-content .text-muted-foreground{color:#8b90a0 !important;}
.gx-admin-content table{color:#f5f6f8;}
.gx-admin-content thead{color:#8b90a0;}
.gx-admin-content tr{border-color:rgba(255,255,255,.06) !important;}
.gx-admin-content .hover\\:bg-accent\\/30:hover{background:rgba(0,229,255,.06) !important;}
`;
