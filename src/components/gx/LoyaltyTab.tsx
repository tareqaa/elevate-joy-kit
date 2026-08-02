import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Coins, Sparkles, Trophy, Ticket, Copy, Check, Lock, Star } from "lucide-react";
import { useLang } from "@/lib/gx/i18n";
import { coinsToJod, fetchLevels, fetchMyLoyalty, levelName, levelProgress } from "@/lib/gx/loyalty";
import { useCurrency } from "@/lib/gx/currency";
import { bidi } from "@/lib/gx/loyalty-copy";

export function LoyaltyTab({ userId }: { userId: string }) {
  const { lang, dir } = useLang();
  const qc = useQueryClient();
  const { format } = useCurrency();
  const isAr = lang === "ar";

  const loyaltyQ = useQuery({ queryKey: ["my-loyalty", userId], queryFn: fetchMyLoyalty });
  const levelsQ = useQuery({ queryKey: ["levels"], queryFn: fetchLevels });

  const couponsQ = useQuery({
    queryKey: ["my-level-coupons", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_coupons").select("*").eq("user_id", userId)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const badgesQ = useQuery({
    queryKey: ["badges-with-mine", userId],
    queryFn: async () => {
      const [all, mine] = await Promise.all([
        supabase.from("badges").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("user_badges").select("badge_id, earned_at").eq("user_id", userId),
      ]);
      if (all.error) throw all.error;
      if (mine.error) throw mine.error;
      const owned = new Map((mine.data ?? []).map((b) => [b.badge_id, b.earned_at]));
      return (all.data ?? []).map((b) => ({ ...b, earned_at: owned.get(b.id) ?? null }));
    },
  });

  const avatarsQ = useQuery({
    queryKey: ["avatar-collections"],
    queryFn: async () => {
      const [cols, avs] = await Promise.all([
        supabase.from("avatar_collections").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("avatars").select("*").eq("is_active", true).order("sort_order"),
      ]);
      if (cols.error) throw cols.error;
      if (avs.error) throw avs.error;
      return (cols.data ?? []).map((c) => ({ ...c, avatars: (avs.data ?? []).filter((a) => a.collection_id === c.id) }));
    },
  });

  const loyalty = loyaltyQ.data;
  const levels = levelsQ.data ?? [];
  const currentSort = useMemo(
    () => levels.find((l) => l.code === loyalty?.level?.code)?.sort_order ?? 0,
    [levels, loyalty],
  );
  const prog = levelProgress(loyalty?.xp ?? 0, loyalty?.level ?? null, loyalty?.next_level ?? null);

  async function pickAvatar(imageUrl: string, avatarId: string, border: string | null) {
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: imageUrl, avatar_id: avatarId, avatar_border: border })
      .eq("id", userId);
    if (error) { toast.error(error.message); return; }
    toast.success(isAr ? "تم تغيير الأفاتار" : "Avatar updated");
    qc.invalidateQueries({ queryKey: ["my-profile", userId] });
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("gx:profile-updated"));
  }

  return (
    <div className="space-y-4" dir={dir}>
      {/* Level card */}
      <Card className="overflow-hidden border-primary/20">
        <div className="h-1.5" style={{ background: loyalty?.level?.gradient || "linear-gradient(90deg,#00e5ff,#7c3aed)" }} />
        <CardContent className="pt-5 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div
              className="w-14 h-14 rounded-2xl grid place-items-center text-2xl shrink-0"
              style={{ background: loyalty?.level?.gradient || "#12151f" }}
            >
              {loyalty?.level?.icon || "🎮"}
            </div>
            <div className="flex-1 min-w-[160px]">
              <div className="text-xs text-muted-foreground">{isAr ? "مستواك الحالي" : "Your level"}</div>
              <div className="text-xl font-black" style={{ color: loyalty?.level?.color || undefined }}>
                {levelName(loyalty?.level, lang) || "—"}
              </div>
            </div>
            <Badge variant="outline" className="gap-1 text-xs">
              <Trophy className="w-3 h-3" /> #{loyalty?.rank ?? "—"}
            </Badge>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold">{(loyalty?.xp ?? 0).toLocaleString("en-US")} XP</span>
              <span className="text-muted-foreground">
                {loyalty?.next_level
                  ? (isAr
                      ? `باقي ${prog.remaining.toLocaleString("en-US")} XP إلى ${levelName(loyalty.next_level, lang)}`
                      : `${prog.remaining.toLocaleString("en-US")} XP to ${levelName(loyalty.next_level, lang)}`)
                  : (isAr ? "أعلى مستوى 🎉" : "Max level 🎉")}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-white/8 overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{ width: `${prog.pct}%`, background: loyalty?.level?.gradient || "#00e5ff" }} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <MiniStat icon={<Coins className="w-3.5 h-3.5" />} label={isAr ? "GX Coins" : "GX Coins"}
              value={(loyalty?.coins ?? 0).toLocaleString("en-US")}
              hint={`≈ ${bidi(format(coinsToJod(loyalty?.coins ?? 0)))}`} />
            <MiniStat icon={<Sparkles className="w-3.5 h-3.5" />} label="XP" value={(loyalty?.xp ?? 0).toLocaleString("en-US")} />
            <MiniStat icon={<Star className="w-3.5 h-3.5" />} label={isAr ? "الطلبات" : "Orders"} value={String(loyalty?.orders_count ?? 0)} />
            <MiniStat icon={<Trophy className="w-3.5 h-3.5" />} label={isAr ? "إجمالي الإنفاق" : "Total spent"}
              value={bidi(format(Number(loyalty?.total_spent ?? 0)))} />
          </div>

          {loyalty?.level && (
            <p className="text-[11px] text-muted-foreground">
              {isAr
                ? `مكافأة مستواك: +${loyalty.level.coins_bonus_pct}% GX Coins إضافية على كل طلب مكتمل.`
                : `Level perk: +${loyalty.level.coins_bonus_pct}% bonus GX Coins on every completed order.`}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Levels ladder */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{isAr ? "سلّم المستويات" : "Levels"}</CardTitle></CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {levels.map((l) => {
            const reached = (l.sort_order ?? 0) <= currentSort;
            return (
              <div key={l.id} className={`rounded-xl border p-3 ${reached ? "border-primary/40 bg-primary/5" : "border-white/10 opacity-70"}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{l.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm truncate" style={{ color: l.color }}>{levelName(l, lang)}</div>
                    <div className="text-[11px] text-muted-foreground">{l.min_xp.toLocaleString("en-US")} XP</div>
                  </div>
                  {reached ? <Check className="w-4 h-4 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                  {l.reward_coins > 0 && <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300">+{l.reward_coins} Coins</span>}
                  {l.coupon_percent > 0 && <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300">{isAr ? "كوبون" : "Coupon"} {l.coupon_percent}%</span>}
                  {l.coins_bonus_pct > 0 && <span className="px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300">+{l.coins_bonus_pct}% {isAr ? "عملات" : "coins"}</span>}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Coupons */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Ticket className="w-4 h-4" />{isAr ? "كوبوناتي" : "My coupons"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(couponsQ.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">{isAr ? "لا يوجد كوبونات بعد — ارفع مستواك للحصول على كوبونات." : "No coupons yet — level up to earn coupons."}</p>
          )}
          {(couponsQ.data ?? []).map((c) => {
            const used = !!c.used_at;
            const expired = new Date(c.expires_at).getTime() < Date.now();
            return <CouponRow key={c.id} code={c.code} percent={c.percent} max={c.max_discount_jod} used={used} expired={expired} expiresAt={c.expires_at} isAr={isAr} />;
          })}
        </CardContent>
      </Card>

      {/* Badges */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{isAr ? "الشارات" : "Badges"}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {(badgesQ.data ?? []).map((b) => (
            <div key={b.id} className={`rounded-xl border p-3 text-center ${b.earned_at ? "border-white/15 bg-white/5" : "border-white/10 opacity-50"}`}>
              <div className="text-2xl">{b.icon}</div>
              <div className="text-xs font-bold mt-1" style={{ color: b.earned_at ? b.color : undefined }}>
                {isAr ? b.name_ar : b.name_en}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                {(isAr ? b.description_ar : b.description_en) || ""}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Avatars */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{isAr ? "الصورة الشخصية" : "Profile picture"}</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(avatarsQ.data ?? []).flatMap((col) =>
              col.avatars.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => pickAvatar(a.image_url, a.id, col.border_css)}
                  className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/15 hover:border-primary hover:scale-105 transition"
                  aria-label={isAr ? "اختيار الصورة" : "Select avatar"}
                >
                  <img src={a.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                </button>
              )),
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

function CouponRow({ code, percent, max, used, expired, expiresAt, isAr }: {
  code: string; percent: number; max: number | null; used: boolean; expired: boolean; expiresAt: string; isAr: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const { format } = useCurrency();
  const dead = used || expired;
  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${dead ? "border-white/10 opacity-55" : "border-emerald-500/30 bg-emerald-500/5"}`}>
      <div className="min-w-0">
        <div className="font-mono font-black tracking-wider text-emerald-300" dir="ltr">{code}</div>
        <div className="text-[11px] text-muted-foreground">
          {isAr ? `خصم ${percent}%` : `${percent}% off`}
          {max ? (isAr ? ` — بحد أقصى ${bidi(format(max))}` : ` — up to ${bidi(format(max))}`) : ""}
          {" · "}
          {used ? (isAr ? "مستخدم" : "Used") : expired ? (isAr ? "منتهي" : "Expired")
            : (isAr ? `ينتهي ${new Date(expiresAt).toLocaleDateString("ar-EG")}` : `Expires ${new Date(expiresAt).toLocaleDateString("en-US")}`)}
        </div>
      </div>
      <Button size="sm" variant="outline" disabled={dead}
        onClick={() => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </Button>
    </div>
  );
}

function MiniStat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
      <div className="text-[10px] text-muted-foreground inline-flex items-center gap-1">{icon}{label}</div>
      <div className="text-base font-black mt-0.5">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
