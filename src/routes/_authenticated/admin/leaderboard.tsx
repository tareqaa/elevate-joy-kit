import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Trophy, Search, RefreshCcw, Download, Camera, Coins, Sparkles,
  ShoppingBag, Medal, Crown, Users as UsersIcon, History,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/leaderboard")({
  head: () => ({ meta: [{ title: "المتصدرون — لوحة التحكم" }] }),
  component: LeaderboardAdmin,
});

type Row = {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  xp: number;
  gx_coins: number;
  level_code: string;
  orders_count: number;
  total_spent: number;
  created_at: string;
};

type LevelRow = { code: string; name_ar: string; color: string; icon: string; sort_order: number };
type Snapshot = { id: string; period: string; period_start: string | null; period_end: string | null; created_at: string; data: unknown };

type SortKey = "xp" | "gx_coins" | "total_spent" | "orders_count";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "xp", label: "الأعلى XP" },
  { key: "gx_coins", label: "الأكثر عملات" },
  { key: "total_spent", label: "الأكثر إنفاقًا" },
  { key: "orders_count", label: "الأكثر طلبات" },
];

function norm(s: string) {
  return s.toLowerCase().replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").trim();
}

function nf(n: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(n || 0));
}

function LeaderboardAdmin() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("xp");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [limit, setLimit] = useState(50);

  const dataQ = useQuery({
    queryKey: ["admin-leaderboard"],
    queryFn: async () => {
      const [profiles, levels, snaps] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, full_name, email, avatar_url, xp, gx_coins, level_code, orders_count, total_spent, created_at")
          .order("xp", { ascending: false }),
        supabase.from("levels").select("code, name_ar, color, icon, sort_order").order("sort_order"),
        supabase.from("leaderboard_snapshots").select("*").order("created_at", { ascending: false }).limit(12),
      ]);
      if (profiles.error) throw profiles.error;
      return {
        rows: (profiles.data ?? []) as unknown as Row[],
        levels: (levels.data ?? []) as unknown as LevelRow[],
        snaps: (snaps.data ?? []) as unknown as Snapshot[],
      };
    },
  });

  const rows = dataQ.data?.rows ?? [];
  const levels = dataQ.data?.levels ?? [];
  const levelMap = useMemo(() => new Map(levels.map((l) => [l.code, l])), [levels]);

  const filtered = useMemo(() => {
    const nq = norm(q);
    let list = rows.filter((r) => {
      if (levelFilter !== "all" && r.level_code !== levelFilter) return false;
      if (!nq) return true;
      return [r.username, r.full_name, r.email].some((v) => v && norm(String(v)).includes(nq));
    });
    list = [...list].sort((a, b) => (Number(b[sortKey]) || 0) - (Number(a[sortKey]) || 0));
    return list;
  }, [rows, q, levelFilter, sortKey]);

  const visible = filtered.slice(0, limit);

  const stats = useMemo(() => {
    const active = rows.filter((r) => (r.xp || 0) > 0).length;
    return {
      players: rows.length,
      active,
      xp: rows.reduce((s, r) => s + (r.xp || 0), 0),
      coins: rows.reduce((s, r) => s + Number(r.gx_coins || 0), 0),
    };
  }, [rows]);

  const snapshot = useMutation({
    mutationFn: async () => {
      const top = [...rows]
        .sort((a, b) => (b.xp || 0) - (a.xp || 0))
        .slice(0, 100)
        .map((r, i) => ({
          rank: i + 1,
          user_id: r.id,
          username: r.username,
          full_name: r.full_name,
          xp: r.xp,
          gx_coins: Number(r.gx_coins || 0),
          level_code: r.level_code,
        }));
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from("leaderboard_snapshots").insert({
        period: "manual",
        period_start: today,
        period_end: today,
        data: top,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حفظ لقطة للمتصدرين");
      qc.invalidateQueries({ queryKey: ["admin-leaderboard"] });
    },
    onError: (e: unknown) => toast.error((e as Error)?.message ?? "تعذّر حفظ اللقطة"),
  });

  function exportCsv() {
    const head = ["#", "GameTag", "الاسم", "البريد", "المستوى", "XP", "GX Coins", "الطلبات", "الإنفاق"];
    const lines = filtered.map((r, i) =>
      [
        i + 1,
        r.username ?? "",
        r.full_name ?? "",
        r.email ?? "",
        levelMap.get(r.level_code)?.name_ar ?? r.level_code,
        r.xp ?? 0,
        Number(r.gx_coins || 0),
        r.orders_count ?? 0,
        Number(r.total_spent || 0),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = "\uFEFF" + [head.join(","), ...lines].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `gx-leaderboard-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const medal = (i: number) =>
    i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : String(i + 1);

  return (
    <div dir="rtl" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Trophy size={20} className="text-amber-400" /> لوحة المتصدرين
          </h1>
          <p className="text-sm text-muted-foreground">ترتيب اللاعبين حسب XP والعملات والإنفاق مع حفظ لقطات دورية.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => dataQ.refetch()}>
            <RefreshCcw size={15} className="ml-1" /> تحديث
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
            <Download size={15} className="ml-1" /> تصدير CSV
          </Button>
          <Button size="sm" onClick={() => snapshot.mutate()} disabled={snapshot.isPending || !rows.length}>
            <Camera size={15} className="ml-1" /> حفظ لقطة
          </Button>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          { icon: UsersIcon, label: "إجمالي اللاعبين", value: nf(stats.players), color: "text-cyan-400" },
          { icon: Sparkles, label: "لاعبون لديهم XP", value: nf(stats.active), color: "text-purple-400" },
          { icon: Trophy, label: "مجموع XP", value: nf(stats.xp), color: "text-amber-400" },
          { icon: Coins, label: "مجموع GX Coins", value: nf(stats.coins), color: "text-yellow-400" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon size={22} className={s.color} />
              <div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="text-lg font-bold">{s.value}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Podium */}
      {!q && levelFilter === "all" && filtered.length >= 3 && (
        <div className="grid gap-3 md:grid-cols-3">
          {filtered.slice(0, 3).map((r, i) => {
            const lv = levelMap.get(r.level_code);
            return (
              <Card key={r.id} className={i === 0 ? "border-amber-400/50" : ""}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="text-2xl">{i === 0 ? <Crown className="text-amber-400" /> : <Medal className={i === 1 ? "text-slate-300" : "text-orange-400"} />}</div>
                  <img
                    src={r.avatar_url || "/app/assets/img/gx-logo.png"}
                    alt=""
                    className="w-11 h-11 rounded-full object-cover border border-white/10"
                  />
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{r.full_name || r.username || "لاعب"}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      @{r.username ?? "—"} · {lv?.name_ar ?? r.level_code}
                    </div>
                    <div className="text-xs mt-1 font-bold text-cyan-400">{nf(r.xp)} XP</div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو GameTag أو البريد" className="pr-9" />
            </div>
            <div className="flex flex-wrap gap-1">
              {SORTS.map((s) => (
                <Button key={s.key} size="sm" variant={sortKey === s.key ? "default" : "outline"} onClick={() => setSortKey(s.key)}>
                  {s.label}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              <Button size="sm" variant={levelFilter === "all" ? "default" : "outline"} onClick={() => setLevelFilter("all")}>
                كل المستويات
              </Button>
              {levels.map((l) => (
                <Button key={l.code} size="sm" variant={levelFilter === l.code ? "default" : "outline"} onClick={() => setLevelFilter(l.code)}>
                  {l.icon} {l.name_ar}
                </Button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-xs">
                  <th className="text-right p-2 w-12">#</th>
                  <th className="text-right p-2">اللاعب</th>
                  <th className="text-right p-2">المستوى</th>
                  <th className="text-right p-2">XP</th>
                  <th className="text-right p-2">GX Coins</th>
                  <th className="text-right p-2">الطلبات</th>
                  <th className="text-right p-2">الإنفاق</th>
                </tr>
              </thead>
              <tbody>
                {dataQ.isLoading &&
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="p-2">
                        <div className="h-9 rounded bg-white/5 animate-pulse" />
                      </td>
                    </tr>
                  ))}
                {!dataQ.isLoading && !visible.length && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">لا يوجد لاعبون مطابقون</td>
                  </tr>
                )}
                {visible.map((r, i) => {
                  const lv = levelMap.get(r.level_code);
                  return (
                    <tr key={r.id} className="border-t border-white/5 hover:bg-white/5">
                      <td className="p-2 font-bold">{medal(i)}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <img src={r.avatar_url || "/app/assets/img/gx-logo.png"} alt="" className="w-8 h-8 rounded-full object-cover border border-white/10" />
                          <div className="min-w-0">
                            <div className="font-medium truncate">{r.full_name || r.username || "لاعب"}</div>
                            <div className="text-xs text-muted-foreground truncate">@{r.username ?? "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-2">
                        <Badge variant="outline" style={lv?.color ? { borderColor: lv.color, color: lv.color } : undefined}>
                          {lv?.icon} {lv?.name_ar ?? r.level_code}
                        </Badge>
                      </td>
                      <td className="p-2 font-semibold text-cyan-400">{nf(r.xp)}</td>
                      <td className="p-2 text-yellow-400">{nf(Number(r.gx_coins || 0))}</td>
                      <td className="p-2">
                        <span className="inline-flex items-center gap-1"><ShoppingBag size={13} /> {nf(r.orders_count)}</span>
                      </td>
                      <td className="p-2">{nf(Number(r.total_spent || 0))} د.أ</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length > visible.length && (
            <div className="text-center">
              <Button variant="outline" size="sm" onClick={() => setLimit((v) => v + 50)}>
                عرض المزيد ({filtered.length - visible.length})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3 font-semibold">
            <History size={17} className="text-cyan-400" /> اللقطات المحفوظة
          </div>
          {!dataQ.data?.snaps?.length ? (
            <p className="text-sm text-muted-foreground">لا توجد لقطات بعد — اضغط «حفظ لقطة» لتوثيق الترتيب الحالي.</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {dataQ.data.snaps.map((s) => (
                <div key={s.id} className="rounded-lg border border-white/10 p-3 text-sm">
                  <div className="font-medium">لقطة {s.period}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleString("ar-EG")} · {Array.isArray(s.data) ? s.data.length : 0} لاعب
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
