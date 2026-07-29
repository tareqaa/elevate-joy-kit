import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Home as HomeIcon, LayoutDashboard, Package, Settings as SettingsIcon, X, Pencil } from "lucide-react";

/**
 * Floating admin quick-access panel — only visible when the current viewer
 * has the "admin" role. Gives one-click jumps into the most-used admin pages,
 * with a highlighted "Edit homepage" shortcut when on "/".
 */
export function AdminFab() {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function check() {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const uid = sess.session?.user?.id;
        if (!uid) { if (mounted) setIsAdmin(false); return; }
        const { data } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" });
        if (mounted) setIsAdmin(Boolean(data));
      } catch {
        if (mounted) setIsAdmin(false);
      }
    }
    check();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") check();
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  // Hide inside admin/account routes — it's redundant there.
  if (!isAdmin) return null;
  if (location.pathname.startsWith("/admin") || location.pathname.startsWith("/account")) return null;

  const onHome = location.pathname === "/";

  return (
    <>
      <style>{fabCss}</style>
      {onHome && (
        <Link to="/admin/home" className="gx-edit-home-btn" title="تحرير الصفحة الرئيسية">
          <Pencil size={16} />
          <span>تحرير الصفحة</span>
        </Link>
      )}
      <div className={`gx-fab-wrap ${open ? "open" : ""}`}>
        {open && (
          <div className="gx-fab-menu">
            <button className="gx-fab-item"
              onClick={() => { window.dispatchEvent(new Event("gx:toggle-text-edit")); setOpen(false); }}>
              <Pencil size={15} /><span>تحرير نصوص هذه الصفحة</span>
            </button>
            <Link to="/admin" className="gx-fab-item"><LayoutDashboard size={15} /><span>لوحة التحكم</span></Link>
            <Link to="/admin/home" className="gx-fab-item on"><HomeIcon size={15} /><span>الصفحة الرئيسية</span></Link>
            <Link to="/admin/orders" className="gx-fab-item"><Package size={15} /><span>الطلبات</span></Link>
            <Link to="/admin/settings" className="gx-fab-item"><SettingsIcon size={15} /><span>الإعدادات</span></Link>
          </div>

        )}
        <button className="gx-fab-btn" onClick={() => setOpen((v) => !v)} aria-label="أدوات الأدمن">
          {open ? <X size={20} /> : <span className="gx-fab-mark">GX</span>}
        </button>
      </div>
    </>
  );
}

const fabCss = `
.gx-edit-home-btn{position:fixed;bottom:22px;inset-inline-start:22px;z-index:70;display:inline-flex;align-items:center;gap:8px;padding:11px 16px;border-radius:99px;background:linear-gradient(135deg,#00d4ff,#7dfffe);color:#031018;font-weight:900;font-size:13.5px;text-decoration:none;box-shadow:0 10px 30px rgba(0,212,255,.45),inset 0 0 0 1px rgba(255,255,255,.25);transition:transform .18s ease, box-shadow .18s ease;}
.gx-edit-home-btn:hover{transform:translateY(-2px);box-shadow:0 14px 36px rgba(0,212,255,.55);}

.gx-fab-wrap{position:fixed;bottom:22px;inset-inline-end:22px;z-index:70;display:flex;flex-direction:column;align-items:flex-end;gap:10px;}
.gx-fab-btn{width:52px;height:52px;border-radius:50%;border:0;cursor:pointer;background:linear-gradient(135deg,#0b1220,#111a2c);color:#00d4ff;box-shadow:0 12px 30px rgba(0,0,0,.45),inset 0 0 0 1px rgba(0,212,255,.4);display:grid;place-items:center;transition:transform .2s ease;}
.gx-fab-btn:hover{transform:scale(1.06);}
.gx-fab-mark{font-weight:900;letter-spacing:.5px;font-size:13px;text-shadow:0 0 12px rgba(0,212,255,.6);}
.gx-fab-menu{background:rgba(10,14,24,.94);backdrop-filter:blur(14px);border:1px solid rgba(0,212,255,.2);border-radius:14px;padding:8px;display:flex;flex-direction:column;gap:2px;min-width:200px;box-shadow:0 20px 50px rgba(0,0,0,.5);animation:gxFabIn .16s ease;}
@keyframes gxFabIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
.gx-fab-item{display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:9px;color:#c8ceda;text-decoration:none;font-size:13px;font-weight:700;transition:all .14s;}
.gx-fab-item:hover{background:rgba(0,212,255,.08);color:#00d4ff;}
.gx-fab-item.on{background:linear-gradient(135deg,rgba(0,212,255,.14),rgba(0,212,255,.04));color:#00d4ff;box-shadow:inset 0 0 0 1px rgba(0,212,255,.25);}
@media(max-width:560px){
  .gx-edit-home-btn{bottom:80px;padding:10px 14px;font-size:12.5px;}
  .gx-fab-wrap{bottom:80px;}
}
`;
