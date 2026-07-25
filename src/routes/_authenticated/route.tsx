import { createFileRoute, redirect, Outlet, Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const location = useLocation();
  const { user } = Route.useRouteContext();

  const isAdminArea = location.pathname.startsWith("/admin");

  const adminQ = useQuery({
    queryKey: ["is-admin", user.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      return !!data;
    },
  });

  // Admin area: render bare — the admin layout ships its own themed chrome.
  if (isAdminArea) return <Outlet />;

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("تم تسجيل الخروج");
    window.location.href = "/auth";
  }
  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 font-bold">
            <img src="/app/assets/img/gx-logo.png" alt="GX" className="h-8 w-8" />
            <span>GX <span className="text-primary">STORE</span></span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link to="/account" className="px-3 py-1.5 rounded hover:bg-accent">حسابي</Link>
            {adminQ.data && (
              <Link to="/admin" className="px-3 py-1.5 rounded hover:bg-accent text-primary font-semibold">لوحة التحكم</Link>
            )}
            <a href="/app/index.html" className="px-3 py-1.5 rounded hover:bg-accent">المتجر</a>
            <Button size="sm" variant="outline" onClick={signOut}>خروج</Button>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
