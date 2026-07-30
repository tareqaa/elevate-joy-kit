import { createFileRoute, redirect, Outlet, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminCommandPalette } from "@/components/gx/admin/AdminCommandPalette";
import {
  LayoutDashboard, Package, Users, Search, Bell, ChevronLeft, ChevronRight,
  Store, User, LogOut, Command, FolderTree, ShoppingBag, Activity, Settings, Ticket, Home, Star, Sparkles, Smile, Award, Trophy,
} from "lucide-react";

// Cache the admin-role check per user for the lifetime of the tab so moving
// between admin pages doesn't re-hit the network on every navigation.
let adminRoleCache: { userId: string; isAdmin: boolean } | null = null;

// Never keep a role decision alive past sign-out.
if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session?.user) adminRoleCache = null;
    else if (adminRoleCache && adminRoleCache.userId !== session.user.id) adminRoleCache = null;
  });
}


export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const user = (context as { user?: { id: string } }).user;
    if (!user) throw redirect({ to: "/auth" });
    if (adminRoleCache?.userId === user.id) {
      if (!adminRoleCache.isAdmin) throw redirect({ to: "/account" });
      return;
    }
    const { data, error } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    const isAdmin = !error && !!data;
    adminRoleCache = { userId: user.id, isAdmin };
    if (!isAdmin) throw redirect({ to: "/account" });
  },
  component: AdminLayout,
});

type NavItem = { to: string; label: string; Icon: typeof LayoutDashboard; exact?: boolean; soon?: boolean };

const NAV: NavItem[] = [
  { to: "/admin", label: "لوحة التحكم", Icon: LayoutDashboard, exact: true },
  { to: "/admin/orders", label: "الطلبات", Icon: Package },
  { to: "/admin/users", label: "المستخدمون", Icon: Users },
  { to: "/admin/products", label: "المنتجات", Icon: ShoppingBag },
  { to: "/admin/categories", label: "الأقسام", Icon: FolderTree },
  { to: "/admin/home", label: "الصفحة الرئيسية", Icon: Home },
  { to: "/admin/coupons", label: "الكوبونات", Icon: Ticket },
  { to: "/admin/reviews", label: "المراجعات", Icon: Star },
  { to: "/admin/loyalty", label: "نظام الولاء", Icon: Sparkles },
  { to: "/admin/wheel", label: "عجلة الحظ", Icon: Disc3 },
  { to: "/admin/avatars", label: "الأفاتار", Icon: Smile },
  { to: "/admin/badges", label: "الشارات", Icon: Award },
  { to: "/admin/leaderboard", label: "المتصدرون", Icon: Trophy },
  { to: "/admin/activity", label: "سجل النشاطات", Icon: Activity },
  { to: "/admin/settings", label: "الإعدادات", Icon: Settings },
];


function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [openMobile, setOpenMobile] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("gx_admin_side_collapsed") === "1";
  });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [me, setMe] = useState<{ email?: string; full_name?: string; avatar_url?: string } | null>(null);

  useEffect(() => {
    localStorage.setItem("gx_admin_side_collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u || !mounted) return;
      const { data: prof } = await supabase.from("profiles").select("full_name, avatar_url, email").eq("id", u.id).maybeSingle();
      if (!mounted) return;
      setMe({ email: u.email ?? undefined, full_name: prof?.full_name ?? undefined, avatar_url: prof?.avatar_url ?? undefined });

      const { count } = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending");
      if (mounted) setUnread(count ?? 0);
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const ch = supabase
      .channel("admin-orders-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, async () => {
        const { count } = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending");
        setUnread(count ?? 0);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("تم تسجيل الخروج");
    navigate({ to: "/auth" });
  }

  const initials = (me?.full_name || me?.email || "GX").trim().slice(0, 2).toUpperCase();

  return (
    <div dir="rtl" className="gx-admin-root">
      <style>{adminCss}</style>

      <aside className={`gx-aside ${openMobile ? "open" : ""} ${collapsed ? "collapsed" : ""}`}>
        <div className="gx-aside-brand">
          <div className="gx-brand-mark"><img src="/app/assets/img/gx-logo.png" alt="GX" /></div>
          {!collapsed && (
            <div className="gx-brand-text">
              <div className="gx-brand-title">GX <b>ADMIN</b></div>
              <div className="gx-brand-sub">لوحة تحكم احترافية</div>
            </div>
          )}
        </div>

        <nav className="gx-aside-nav">
          {NAV.map((n) => {
            const active = n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to);
            const Icon = n.Icon;
            const inner = (
              <>
                <span className="gx-nav-icon"><Icon size={18} strokeWidth={2.2} /></span>
                {!collapsed && <span className="gx-nav-label">{n.label}</span>}
                {!collapsed && n.soon && <span className="gx-nav-soon">قريبًا</span>}
                {active && <span className="gx-nav-glow" aria-hidden />}
              </>
            );
            if (n.soon) {
              return (
                <button key={n.to} type="button" disabled className={`gx-nav-link disabled`} title={collapsed ? n.label + " — قريبًا" : undefined}>
                  {inner}
                </button>
              );
            }
            return (
              <Link key={n.to} to={n.to as never} onClick={() => setOpenMobile(false)}
                className={`gx-nav-link ${active ? "on" : ""}`} title={collapsed ? n.label : undefined}>
                {inner}
              </Link>
            );
          })}
        </nav>

        <div className="gx-aside-foot">
          <Link to="/" className="gx-nav-link" title="المتجر"><span className="gx-nav-icon"><Store size={18} /></span>{!collapsed && <span className="gx-nav-label">المتجر</span>}</Link>
          <Link to="/account" className="gx-nav-link" title="حسابي"><span className="gx-nav-icon"><User size={18} /></span>{!collapsed && <span className="gx-nav-label">حسابي</span>}</Link>
          <button className="gx-nav-link gx-logout" onClick={signOut} title="تسجيل الخروج"><span className="gx-nav-icon"><LogOut size={18} /></span>{!collapsed && <span className="gx-nav-label">خروج</span>}</button>
        </div>

        <button className="gx-collapse-btn" onClick={() => setCollapsed((v) => !v)} aria-label="طيّ القائمة">
          {collapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </aside>

      {openMobile && <div className="gx-scrim" onClick={() => setOpenMobile(false)} />}

      <div className="gx-main">
        <header className="gx-top">
          <button className="gx-burger" onClick={() => setOpenMobile((v) => !v)} aria-label="القائمة">☰</button>

          <button type="button" className="gx-search-trigger" onClick={() => setPaletteOpen(true)}>
            <Search size={15} />
            <span>ابحث عن طلب، مستخدم، صفحة…</span>
            <kbd className="gx-kbd"><Command size={11} /> K</kbd>
          </button>

          <div className="gx-top-right">
            <button className="gx-icon-btn" title="طلبات معلّقة" onClick={() => navigate({ to: "/admin/orders" as never })}>
              <Bell size={16} />
              {unread > 0 && <span className="gx-bell-dot">{unread > 99 ? "99+" : unread}</span>}
            </button>
            <div className="gx-live">
              <span className="gx-live-dot" />
              <span>Live</span>
            </div>
            <div className="gx-me">
              {me?.avatar_url ? <img src={me.avatar_url} alt="" /> : <span className="gx-me-fallback">{initials}</span>}
              <div className="gx-me-text">
                <div className="gx-me-name">{me?.full_name || me?.email?.split("@")[0] || "Admin"}</div>
                <div className="gx-me-role">Administrator</div>
              </div>
            </div>
          </div>
        </header>

        <div className="gx-content">
          <Outlet />
        </div>
      </div>

      <AdminCommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

const adminCss = `
.gx-admin-root{position:fixed;inset:0;display:flex;background:radial-gradient(1200px 700px at 100% -10%,rgba(0,212,255,.08),transparent 60%),radial-gradient(900px 600px at -10% 110%,rgba(125,255,254,.06),transparent 60%),linear-gradient(180deg,#070912,#0a0d18);color:#e8ecf5;font-family:'Cairo','Tajawal',system-ui,sans-serif;overflow:hidden;}

.gx-aside{width:260px;background:linear-gradient(180deg,rgba(13,17,28,.95),rgba(9,12,20,.98));backdrop-filter:blur(18px);border-inline-start:1px solid rgba(0,212,255,.12);display:flex;flex-direction:column;padding:18px 12px;flex-shrink:0;z-index:30;position:relative;transition:width .25s cubic-bezier(.4,0,.2,1);}
.gx-aside.collapsed{width:76px;padding:18px 8px;}
.gx-aside-brand{display:flex;align-items:center;gap:10px;padding:6px 4px 16px;border-bottom:1px solid rgba(0,212,255,.1);margin-bottom:12px;}
.gx-brand-mark{width:42px;height:42px;border-radius:11px;background:linear-gradient(135deg,rgba(0,212,255,.2),rgba(125,255,254,.08));display:grid;place-items:center;box-shadow:0 0 24px rgba(0,212,255,.25),inset 0 0 0 1px rgba(0,212,255,.35);flex-shrink:0;}
.gx-brand-mark img{width:28px;height:28px;object-fit:contain;}
.gx-brand-text{min-width:0;overflow:hidden;}
.gx-brand-title{font-weight:900;font-size:15px;letter-spacing:.5px;color:#f5f8ff;white-space:nowrap;}
.gx-brand-title b{color:#00d4ff;text-shadow:0 0 10px rgba(0,212,255,.5);}
.gx-brand-sub{font-size:10.5px;color:#7a8299;margin-top:2px;white-space:nowrap;}

.gx-aside-nav{display:flex;flex-direction:column;gap:3px;flex:1;overflow-y:auto;padding:4px 0;}
.gx-aside-nav::-webkit-scrollbar{width:4px;} .gx-aside-nav::-webkit-scrollbar-thumb{background:rgba(0,212,255,.15);border-radius:2px;}

.gx-nav-link{position:relative;display:flex;align-items:center;gap:12px;padding:10px 11px;border-radius:10px;color:#b6bdd0;text-decoration:none;font-size:13.5px;font-weight:600;background:transparent;border:0;cursor:pointer;font-family:inherit;text-align:right;transition:all .18s;width:100%;}
.gx-nav-link:hover:not(.disabled){background:rgba(0,212,255,.08);color:#00d4ff;transform:translateX(-2px);}
.gx-nav-link.on{background:linear-gradient(135deg,rgba(0,212,255,.16),rgba(0,212,255,.04));color:#00d4ff;box-shadow:inset 0 0 0 1px rgba(0,212,255,.28);}
.gx-nav-link.on .gx-nav-icon{color:#00d4ff;filter:drop-shadow(0 0 6px rgba(0,212,255,.6));}
.gx-nav-link.disabled{opacity:.42;cursor:not-allowed;}
.gx-nav-icon{width:22px;display:grid;place-items:center;color:#8a92a8;transition:color .18s;flex-shrink:0;}
.gx-nav-link:hover:not(.disabled) .gx-nav-icon{color:#00d4ff;}
.gx-nav-label{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.gx-nav-soon{font-size:9px;padding:2px 6px;border-radius:99px;background:rgba(255,255,255,.06);color:#7a8299;font-weight:700;}
.gx-nav-glow{position:absolute;inset-inline-start:0;top:20%;bottom:20%;width:3px;border-radius:2px;background:linear-gradient(180deg,#00d4ff,#7dfffe);box-shadow:0 0 8px rgba(0,212,255,.7);}

.gx-aside-foot{margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.05);display:flex;flex-direction:column;gap:3px;}
.gx-logout{color:#ff6b6b !important;} .gx-logout:hover{background:rgba(255,107,107,.1) !important;color:#ff8888 !important;}
.gx-logout .gx-nav-icon{color:#ff6b6b;}

.gx-collapse-btn{position:absolute;inset-inline-start:-11px;top:64px;width:22px;height:22px;border-radius:50%;background:#0d1220;border:1px solid rgba(0,212,255,.35);color:#00d4ff;display:grid;place-items:center;cursor:pointer;z-index:5;box-shadow:0 0 12px rgba(0,212,255,.25);}
.gx-collapse-btn:hover{background:rgba(0,212,255,.15);}

.gx-scrim{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:25;backdrop-filter:blur(3px);}

.gx-main{flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden;}
.gx-top{display:flex;align-items:center;gap:14px;padding:12px 22px;background:rgba(10,13,24,.72);backdrop-filter:blur(14px);border-bottom:1px solid rgba(0,212,255,.1);flex-shrink:0;}
.gx-burger{display:none;background:transparent;border:0;color:#e8ecf5;font-size:22px;cursor:pointer;}

.gx-search-trigger{flex:1;max-width:520px;display:flex;align-items:center;gap:10px;padding:9px 14px;border-radius:11px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);color:#8a92a8;font-family:inherit;font-size:13px;cursor:pointer;transition:all .18s;}
.gx-search-trigger:hover{background:rgba(0,212,255,.06);border-color:rgba(0,212,255,.25);color:#c8ceda;}
.gx-search-trigger span{flex:1;text-align:right;}
.gx-kbd{display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:6px;background:rgba(0,212,255,.08);border:1px solid rgba(0,212,255,.2);color:#00d4ff;font-family:ui-monospace,monospace;font-size:11px;font-weight:700;}

.gx-top-right{display:flex;align-items:center;gap:10px;margin-inline-start:auto;}
.gx-icon-btn{position:relative;width:38px;height:38px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);color:#c8ceda;cursor:pointer;display:grid;place-items:center;transition:all .18s;}
.gx-icon-btn:hover{background:rgba(0,212,255,.1);border-color:rgba(0,212,255,.3);color:#00d4ff;}
.gx-bell-dot{position:absolute;top:-4px;inset-inline-end:-4px;min-width:18px;height:18px;padding:0 5px;border-radius:99px;background:linear-gradient(135deg,#ff5470,#ff8855);color:#fff;font-size:10px;font-weight:800;display:grid;place-items:center;box-shadow:0 0 10px rgba(255,84,112,.6);}

.gx-live{display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:99px;background:rgba(0,212,255,.08);border:1px solid rgba(0,212,255,.2);color:#7dfffe;font-size:11px;font-weight:700;}
.gx-live-dot{width:7px;height:7px;border-radius:50%;background:#00e5b0;box-shadow:0 0 8px #00e5b0;animation:gxPulse 1.6s ease-in-out infinite;}
@keyframes gxPulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.5;transform:scale(1.35);}}

.gx-me{display:flex;align-items:center;gap:9px;padding:5px 10px 5px 5px;border-radius:99px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);}
.gx-me img,.gx-me-fallback{width:30px;height:30px;border-radius:50%;object-fit:cover;background:linear-gradient(135deg,#00d4ff,#7dfffe);color:#031018;display:grid;place-items:center;font-weight:900;font-size:12px;}
.gx-me-text{line-height:1.15;}
.gx-me-name{font-size:12.5px;font-weight:700;color:#e8ecf5;}
.gx-me-role{font-size:10px;color:#7a8299;}

.gx-content{flex:1;overflow-y:auto;padding:22px;}
.gx-content::-webkit-scrollbar{width:8px;} .gx-content::-webkit-scrollbar-thumb{background:rgba(0,212,255,.15);border-radius:4px;} .gx-content::-webkit-scrollbar-thumb:hover{background:rgba(0,212,255,.3);}

@media (max-width:900px){
  .gx-aside{position:fixed;inset-block:0;inset-inline-end:0;transform:translateX(100%);}
  .gx-aside.open{transform:translateX(0);}
  .gx-aside.collapsed{width:260px;padding:18px 12px;}
  .gx-collapse-btn{display:none;}
  .gx-burger{display:grid;place-items:center;}
  .gx-search-trigger span{display:none;}
  .gx-me-text{display:none;}
  .gx-content{padding:14px;}
}
`;
