import { createFileRoute, redirect, Outlet, Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Store, LogOut, LayoutDashboard, User } from "lucide-react";
import { useLang } from "@/lib/gx/i18n";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) throw redirect({ to: "/auth" });
    return { user: data.session.user };
  },
  component: AuthedLayout,
});

// Store palette overrides — makes shadcn components adopt GX Store's dark/cyan theme
// so /account and /admin feel embedded in the same site.
const GX_THEME: React.CSSProperties = {
  // shadcn tokens
  ["--background" as never]: "#090b10",
  ["--foreground" as never]: "#f5f6f8",
  ["--card" as never]: "#12151f",
  ["--card-foreground" as never]: "#f5f6f8",
  ["--popover" as never]: "#12151f",
  ["--popover-foreground" as never]: "#f5f6f8",
  ["--primary" as never]: "#00e5ff",
  ["--primary-foreground" as never]: "#090b10",
  ["--secondary" as never]: "#161a26",
  ["--secondary-foreground" as never]: "#f5f6f8",
  ["--muted" as never]: "#161a26",
  ["--muted-foreground" as never]: "#8b90a0",
  ["--accent" as never]: "#1b2030",
  ["--accent-foreground" as never]: "#f5f6f8",
  ["--destructive" as never]: "#ff2d78",
  ["--destructive-foreground" as never]: "#ffffff",
  ["--border" as never]: "rgba(255,255,255,0.08)",
  ["--input" as never]: "rgba(255,255,255,0.1)",
  ["--ring" as never]: "#00e5ff",
  ["--radius" as never]: "12px",
  colorScheme: "dark" as const,
  fontFamily: "'Almarai', system-ui, sans-serif",
};

function AuthedLayout() {
  const location = useLocation();
  const { user } = Route.useRouteContext();

  const isAdminArea = location.pathname.startsWith("/admin");

  const profileQ = useQuery({
    queryKey: ["my-profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, full_name, avatar_url, xp, level, email")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

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
    window.location.href = "/";
  }

  const profile = profileQ.data;
  const username = profile?.username || user.user_metadata?.username || user.email?.split("@")[0] || "gx";
  const displayName = profile?.full_name || username;
  const level = Math.max(1, Number(profile?.level) || 1);
  const avatar = profile?.avatar_url ||
    `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(username)}&backgroundType=gradientLinear&backgroundColor=0ea5e9,6366f1,8b5cf6`;

  return (
    <div dir="rtl" style={GX_THEME} className="min-h-screen bg-background text-foreground">
      <header
        className="sticky top-0 z-20 backdrop-blur-xl border-b"
        style={{ background: "rgba(9,11,16,0.85)", borderColor: "rgba(255,255,255,0.08)" }}
      >
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 font-extrabold text-lg tracking-wide">
            <img src="/app/assets/img/gx-logo.png" alt="GX" className="h-9 w-9" />
            <span>GX <span style={{ color: "#00e5ff" }}>STORE</span></span>
          </Link>
          <nav className="flex items-center gap-1.5 text-sm">
            <Link
              to="/"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-white/5 transition"
            >
              <Store className="w-4 h-4" /> المتجر
            </Link>
            <Link
              to="/account"
              className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full hover:bg-white/5 transition max-w-[180px]"
            >
              <span className="relative shrink-0">
                <img src={avatar} alt="avatar" className="h-8 w-8 rounded-full border border-primary/50 object-cover bg-card" />
                <span className="absolute -bottom-1 -end-1 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-black leading-4 text-center border-2 border-background">
                  {level}
                </span>
              </span>
              <span className="hidden sm:flex min-w-0 flex-col items-start leading-tight">
                <span className="max-w-[110px] truncate font-bold">{displayName}</span>
                <span className="max-w-[110px] truncate text-[11px] text-primary" dir="ltr">@{username}</span>
              </span>
            </Link>
            {adminQ.data && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold transition"
                style={{ color: "#00e5ff", border: "1px solid rgba(0,229,255,0.3)" }}
              >
                <LayoutDashboard className="w-4 h-4" /> لوحة التحكم
              </Link>
            )}
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-white/5 transition text-[color:var(--muted-foreground)] hover:text-white"
              aria-label="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
