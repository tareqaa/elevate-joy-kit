import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Calendar, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/u/$username")({
  ssr: false,
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — GX Store` },
      { name: "description", content: `الملف العام للاعب @${params.username} في متجر GX.` },
      { property: "og:title", content: `@${params.username} — GX Store` },
      { property: "og:description", content: `شاهد المستوى والرتبة والترتيب للاعب @${params.username}.` },
    ],
  }),
  component: PublicProfilePage,
});

const GX_THEME: React.CSSProperties = {
  ["--background" as never]: "#090b10",
  ["--foreground" as never]: "#f5f6f8",
  ["--card" as never]: "#12151f",
  ["--card-foreground" as never]: "#f5f6f8",
  ["--primary" as never]: "#00e5ff",
  ["--primary-foreground" as never]: "#090b10",
  ["--muted" as never]: "#161a26",
  ["--muted-foreground" as never]: "#8b90a0",
  ["--border" as never]: "rgba(255,255,255,0.08)",
  ["--radius" as never]: "12px",
  colorScheme: "dark" as const,
  fontFamily: "'Almarai', system-ui, sans-serif",
};

function rankTier(rank: number): { label: string; color: string } {
  if (rank <= 3) return { label: "أسطوري", color: "from-yellow-400 to-amber-600" };
  if (rank <= 10) return { label: "نخبة", color: "from-fuchsia-500 to-purple-600" };
  if (rank <= 50) return { label: "محترف", color: "from-cyan-400 to-sky-600" };
  if (rank <= 200) return { label: "متقدّم", color: "from-emerald-400 to-teal-600" };
  return { label: "لاعب", color: "from-slate-400 to-slate-600" };
}

function PublicProfilePage() {
  const { username } = Route.useParams();

  const q = useQuery({
    queryKey: ["public-profile", username.toLowerCase()],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_profile", { _username: username });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw notFound();
      return row as {
        id: string; username: string; full_name: string | null;
        avatar_url: string | null; level: number | null; xp: number | null;
        rank: number; created_at: string;
      };
    },
    retry: false,
  });

  return (
    <div dir="rtl" style={GX_THEME} className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 backdrop-blur-xl border-b" style={{ background: "rgba(9,11,16,0.85)", borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-extrabold text-lg tracking-wide">
            <img src="/app/assets/img/gx-logo.png" alt="GX" className="h-9 w-9" />
            <span>GX <span style={{ color: "#00e5ff" }}>STORE</span></span>
          </Link>
          <Link to="/account" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
            حسابي <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {q.isLoading && <p className="text-center text-muted-foreground py-16">جاري التحميل…</p>}
        {q.isError && (
          <Card>
            <CardContent className="py-16 text-center space-y-3">
              <p className="text-lg font-bold">لا يوجد لاعب بهذا الـ GameTag</p>
              <p className="text-sm text-muted-foreground" dir="ltr">@{username}</p>
              <Link to="/account" className="inline-block text-primary hover:underline text-sm">العودة إلى حسابي</Link>
            </CardContent>
          </Card>
        )}
        {q.data && <ProfileCard p={q.data} />}
      </main>
    </div>
  );
}

function ProfileCard({ p }: { p: { username: string; full_name: string | null; avatar_url: string | null; level: number | null; xp: number | null; rank: number; created_at: string; } }) {
  const tier = rankTier(Number(p.rank));
  const avatar = p.avatar_url || `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(p.username)}&backgroundType=gradientLinear&backgroundColor=0ea5e9,6366f1,8b5cf6`;
  const displayName = p.full_name || p.username;
  const level = Math.max(1, Number(p.level) || 1);
  const xp = Math.max(0, Number(p.xp) || 0);

  return (
    <Card className="overflow-hidden border-primary/20">
      <div className={`h-28 bg-gradient-to-l ${tier.color}`} />
      <CardContent className="pt-0 -mt-14">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <img src={avatar} alt={p.username} className="w-28 h-28 rounded-2xl border-4 border-background shadow-xl bg-card object-cover" />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate">{displayName}</h1>
            <p className="text-sm text-primary font-semibold" dir="ltr">@{p.username}</p>
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-1">
              <Calendar className="w-3 h-3" />
              عضو منذ {new Date(p.created_at).toLocaleDateString("ar-EG", { year: "numeric", month: "long" })}
            </p>
          </div>
          <Badge className={`bg-gradient-to-l ${tier.color} text-white border-0 text-xs px-3 py-1`}>{tier.label}</Badge>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-6">
          <Stat icon={<Star className="w-4 h-4" />} label="المستوى" value={`Lv. ${level}`} />
          <Stat icon={<Trophy className="w-4 h-4" />} label="الترتيب" value={`#${p.rank}`} />
          <Stat icon={<Star className="w-4 h-4" />} label="XP" value={xp.toLocaleString("en-US")} />
        </div>

        <p className="mt-6 text-xs text-muted-foreground text-center">
          هذه صفحة عامة — يمكن لأي شخص مشاركتها.
        </p>
      </CardContent>
    </Card>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card/60 p-3 text-center">
      <div className="text-muted-foreground text-xs inline-flex items-center gap-1 justify-center">{icon}{label}</div>
      <div className="text-lg font-black mt-1">{value}</div>
    </div>
  );
}
