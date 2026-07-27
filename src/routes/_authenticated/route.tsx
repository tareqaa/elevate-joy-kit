import { createFileRoute, redirect, Outlet, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/gx/i18n";
import { Navbar } from "@/components/gx/Navbar";
import { CartDrawer } from "@/components/gx/CartDrawer";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) throw redirect({ to: "/auth" });
    return { user: data.session.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const location = useLocation();
  const { dir } = useLang();

  const isAdminArea = location.pathname.startsWith("/admin");

  // Admin area: render bare — the admin layout ships its own themed chrome.
  if (isAdminArea) return <Outlet />;

  return (
    <div dir={dir} className="gx-auth-page-shell min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="gx-account-main mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-7">
        <Outlet />
      </main>
      <CartDrawer />
    </div>
  );
}
