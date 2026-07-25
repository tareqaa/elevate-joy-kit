import { createFileRoute, redirect, Outlet, Link, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const user = (context as { user?: { id: string } }).user;
    if (!user) throw redirect({ to: "/auth" });
    const { data, error } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (error || !data) throw redirect({ to: "/account" });
  },
  component: AdminLayout,
});

function AdminLayout() {
  const location = useLocation();
  const tabs = [
    { to: "/admin", label: "نظرة عامة", exact: true },
    { to: "/admin/orders", label: "الطلبات" },
    { to: "/admin/users", label: "المستخدمون" },
  ] as const;
  return (
    <div className="space-y-6">
      <div className="border-b flex gap-1 overflow-x-auto">
        {tabs.map((t) => {
          const active = t.exact ? location.pathname === t.to : location.pathname.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`px-4 py-2 text-sm border-b-2 transition-colors whitespace-nowrap ${
                active ? "border-primary text-foreground font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}
