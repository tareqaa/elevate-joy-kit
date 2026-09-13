import { createFileRoute, redirect, Outlet, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/gx/i18n";
import { Navbar } from "@/components/gx/Navbar";
import { CartDrawer } from "@/components/gx/CartDrawer";

// Reuse the last known session across navigations so moving between
// account/admin pages doesn't re-await the auth client each time.
let cachedUser: import("@supabase/supabase-js").User | null = null;

// Drop the cached session as soon as the user signs out, otherwise the stale
// user would keep the protected subtree open until a full page refresh.
if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session?.user) cachedUser = null;
    else if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
      cachedUser = session.user;
    }
  });
}


export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) {
      cachedUser = null;
      throw redirect({ to: "/auth" });
    }

    try {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal && aal.currentLevel === "aal1" && aal.nextLevel === "aal2") {
        cachedUser = null;
        throw redirect({ to: "/auth" });
      }
    } catch (err) {
      if ((err as any)?.to) throw err;
    }

    cachedUser = data.session.user;
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
