import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Package, Settings as SettingsIcon, X } from "lucide-react";

/**
 * Floating admin quick-access panel — only visible when the current viewer
 * has the "admin" role. Gives one-click jumps into the most-used admin pages.
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

  return (
    <>
      <style>{fabCss}</style>
      <div className={`gx-fab-wrap ${open ? "open" : ""}`}>
        {open && (
          <div className="gx-fab-menu">
            <Link to="/admin" className="gx-fab-item" onClick={() => setOpen(false)}>
              <LayoutDashboard size={15} /><span>لوحة التحكم</span>
            </Link>
            <Link to="/admin/orders" className="gx-fab-item" onClick={() => setOpen(false)}>
              <Package size={15} /><span>الطلبات</span>
            </Link>
            <Link to="/admin/settings" className="gx-fab-item" onClick={() => setOpen(false)}>
              <SettingsIcon size={15} /><span>الإعدادات</span>
            </Link>
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
.gx-fab-wrap{position:fixed;bottom:22px;inset-inline-end:22px;z-index:70;display:flex;flex-direction:column;align-items:flex-end;gap:10px;}
.gx-fab-btn{width:52px;height:52px;border-radius:50%;border:0;cursor:pointer;background:linear-gradient(135deg,#0b1220,#111a2c);color:#00d4ff;box-shadow:0 12px 30px rgba(0,0,0,.45),inset 0 0 0 1px rgba(0,212,255,.4);display:grid;place-items:center;transition:transform .2s ease;}
.gx-fab-btn:hover{transform:scale(1.06);}
.gx-fab-mark{font-weight:900;letter-spacing:.5px;font-size:13px;text-shadow:0 0 12px rgba(0,212,255,.6);}
.gx-fab-menu{background:rgba(10,14,24,.94);backdrop-filter:blur(14px);border:1px solid rgba(0,212,255,.2);border-radius:14px;padding:8px;display:flex;flex-direction:column;gap:2px;min-width:180px;box-shadow:0 20px 50px rgba(0,0,0,.5);animation:gxFabIn .16s ease;}
@keyframes gxFabIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
.gx-fab-item{appearance:none;background:transparent;border:0;width:100%;text-align:start;font-family:inherit;cursor:pointer;display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:9px;color:#c8ceda;text-decoration:none;font-size:13px;font-weight:700;transition:all .14s;}
.gx-fab-item:hover{background:rgba(0,212,255,.08);color:#00d4ff;}
@media(max-width:560px){
  .gx-fab-wrap{bottom:80px;}
}
`;
