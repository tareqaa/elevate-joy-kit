import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, Check, Sparkles, Timer } from "lucide-react";

type Prize = {
  id: string;
  name: string;
  icon: string;
  reward_type: string;
  reward_value: number | null;
  rarity: string;
  color: string;
  weight: number;
  is_active: boolean;
  sort_order: number;
};

type SpinResult = {
  ok?: boolean;
  prize_id?: string;
  name?: string;
  icon?: string;
  reward_type?: string;
  reward_value?: number | null;
  rarity?: string;
  color?: string;
  coupon_code?: string | null;
  coupon_expires_at?: string | null;
  boost_expires_at?: string | null;
  next_spin_at?: string | null;
};

type WheelStatus = {
  ok?: boolean;
  can_spin?: boolean;
  next_spin_at?: string | null;
  seconds_remaining?: number;
  message?: string;
};

const RARITY_FALLBACK: Record<string, string> = {
  common: "#64748b",
  rare: "#6366f1",
  epic: "#a21caf",
  legendary: "#f59e0b",
};

function rarityLabel(r?: string) {
  return r === "legendary" ? "أسطوري" : r === "epic" ? "ملحمي" : r === "rare" ? "نادر" : "عادي";
}

function isRare(rarity?: string) {
  return rarity === "epic" || rarity === "legendary";
}

function prizeColor(p: { color?: string | null; rarity?: string | null }) {
  return p.color || RARITY_FALLBACK[p.rarity || "common"] || "#64748b";
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)] as const;
}

function segmentPath(cx: number, cy: number, r: number, start: number, end: number) {
  const [x1, y1] = polar(cx, cy, r, start);
  const [x2, y2] = polar(cx, cy, r, end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

function fmtCountdown(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function fmtDate(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("ar-EG", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function rewardSummary(r: SpinResult) {
  const v = Number(r.reward_value ?? 0);
  switch (r.reward_type) {
    case "xp":
      return { value: `+${v.toLocaleString("en-US")} XP`, desc: "نقاط خبرة تُضاف لمستواك فورًا" };
    case "gx_coins":
      return { value: `+${v.toLocaleString("en-US")} 🪙`, desc: "GX Coins أُضيفت إلى رصيدك" };
    case "discount_percent":
      return { value: `${v}% خصم`, desc: "كوبون خصم لمرة واحدة على طلبك القادم" };
    case "boost_double_coins":
      return { value: "×2 GX Coins", desc: "مضاعفة عملات طلبك القادم" };
    case "boost_double_xp":
      return { value: "×2 XP", desc: "مضاعفة نقاط الخبرة في طلبك القادم" };
    default:
      return { value: "", desc: "" };
  }
}

export function WheelCore({ compact = false }: { compact?: boolean }) {
  const qc = useQueryClient();
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const timerRef = useRef<number | null>(null);

  const prizesQ = useQuery({
    queryKey: ["wheel-prizes-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wheel_prizes")
        .select("*")
        .eq("is_active", true)
        .order("sort_order")
        .order("id");
      if (error) throw error;
      return (data ?? []) as unknown as Prize[];
    },
  });

  const statusQ = useQuery({
    queryKey: ["wheel-status"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_wheel_status");
      if (error) throw error;
      return (data ?? {}) as WheelStatus;
    },
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const secs = Number(statusQ.data?.seconds_remaining ?? 0);
    setRemaining(statusQ.data?.can_spin ? 0 : secs);
  }, [statusQ.data]);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = window.setInterval(() => {
      setRemaining((v) => {
        if (v <= 1) {
          void qc.invalidateQueries({ queryKey: ["wheel-status"] });
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [remaining, qc]);

  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current); }, []);

  const prizes = prizesQ.data ?? [];
  const seg = prizes.length > 0 ? 360 / prizes.length : 360;
  const canSpin = !!statusQ.data?.can_spin && prizes.length > 0 && !spinning;

  async function spin() {
    if (!canSpin) return;
    setSpinning(true);
    setResult(null);
    // 1) Ask the server FIRST — the visual outcome is decided by this response.
    const { data, error } = await supabase.rpc("spin_wheel");
    if (error) {
      setSpinning(false);
      toast.error(error.message);
      void qc.invalidateQueries({ queryKey: ["wheel-status"] });
      return;
    }
    const res = (data ?? {}) as SpinResult;
    if (res.ok === false) {
      setSpinning(false);
      toast.error("لفة اليوم مستخدمة، عد غدًا 🎡");
      void qc.invalidateQueries({ queryKey: ["wheel-status"] });
      return;
    }
    // 2) Animate to the exact server-decided segment.
    const idx = Math.max(0, prizes.findIndex((p) => p.id === res.prize_id));
    const targetCentre = idx * seg + seg / 2;
    const current = ((angle % 360) + 360) % 360;
    const delta = (360 - targetCentre - current + 360) % 360;
    setAngle(angle + 360 * 6 + delta);

    timerRef.current = window.setTimeout(() => {
      setSpinning(false);
      setResult(res);
      void qc.invalidateQueries({ queryKey: ["wheel-status"] });
      void qc.invalidateQueries({ queryKey: ["my-loyalty"] });
      void qc.invalidateQueries({ queryKey: ["my-profile"] });
    }, 5200);
  }

  async function copyCode() {
    if (!result?.coupon_code) return;
    await navigator.clipboard.writeText(result.coupon_code);
    setCopied(true);
    toast.success("تم نسخ الكود");
    setTimeout(() => setCopied(false), 1500);
  }

  const summary = result ? rewardSummary(result) : null;
  const noReward = result?.reward_type === "no_reward";
  const legendary = isRare(result?.rarity);
  const expiry = fmtDate(result?.coupon_expires_at || result?.boost_expires_at);
  const size = compact ? "w-[260px] h-[260px] sm:w-[320px] sm:h-[320px]" : "w-[290px] h-[290px] sm:w-[340px] sm:h-[340px]";

  return (
    <div dir="rtl" className="space-y-5">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div
            className="absolute left-1/2 -translate-x-1/2 -top-1 z-10"
            style={{
              width: 0, height: 0,
              borderInlineStart: "12px solid transparent",
              borderInlineEnd: "12px solid transparent",
              borderTop: "22px solid hsl(var(--primary))",
              filter: "drop-shadow(0 0 6px hsl(var(--primary) / 0.8))",
            }}
          />
          <svg
            viewBox="0 0 300 300"
            className={`${size} rounded-full max-w-full`}
            style={{
              transform: `rotate(${angle}deg)`,
              transition: spinning ? "transform 5s cubic-bezier(0.15, 0.9, 0.2, 1)" : undefined,
              boxShadow: "0 0 50px hsl(var(--primary) / 0.25)",
            }}
          >
            <defs>
              <filter id="gx-wheel-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <circle cx="150" cy="150" r="148" fill="hsl(var(--card))" stroke="hsl(var(--primary) / 0.5)" strokeWidth="3" />
            {prizes.map((p, i) => {
              const start = i * seg;
              const end = start + seg;
              const rare = isRare(p.rarity);
              const [tx, ty] = polar(150, 150, 96, start + seg / 2);
              const [ix, iy] = polar(150, 150, 126, start + seg / 2);
              const label = p.name.length > 15 ? `${p.name.slice(0, 14)}…` : p.name;
              return (
                <g key={p.id} filter={p.rarity === "legendary" ? "url(#gx-wheel-glow)" : undefined}>
                  <path
                    d={segmentPath(150, 150, 145, start, end)}
                    fill={prizeColor(p)}
                    fillOpacity={rare ? 0.95 : 0.78}
                    stroke={p.rarity === "legendary" ? "#fbbf24" : rare ? "rgba(251,191,36,0.6)" : "rgba(255,255,255,0.18)"}
                    strokeWidth={rare ? 2.5 : 1}
                  />
                  <text
                    x={ix} y={iy} fontSize="16" textAnchor="middle" dominantBaseline="middle"
                    transform={`rotate(${start + seg / 2}, ${ix}, ${iy})`}
                  >
                    {p.icon || "🎁"}
                  </text>
                  <text
                    x={tx} y={ty}
                    fill="#fff" fontSize="11.5" fontWeight="700"
                    textAnchor="middle" dominantBaseline="middle"
                    transform={`rotate(${start + seg / 2}, ${tx}, ${ty})`}
                  >
                    {label}
                  </text>
                </g>
              );
            })}
            <circle cx="150" cy="150" r="26" fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth="3" />
            <text x="150" y="151" fontSize="18" textAnchor="middle" dominantBaseline="middle">🎡</text>
          </svg>
        </div>

        {statusQ.isLoading ? (
          <p className="text-sm text-muted-foreground">جاري التحميل…</p>
        ) : statusQ.data?.can_spin ? (
          <Button size="lg" onClick={spin} disabled={!canSpin} className="min-w-44 font-bold">
            {spinning ? "جاري اللف…" : "لف الآن"}
          </Button>
        ) : (
          <div className="text-center space-y-2">
            <Button size="lg" disabled aria-disabled className="min-w-44 font-bold pointer-events-none opacity-60">
              لفة اليوم مستخدمة
            </Button>
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Timer className="w-4 h-4" />
              اللفة القادمة بعد <span className="font-mono text-foreground" dir="ltr">{fmtCountdown(remaining)}</span>
            </p>
          </div>
        )}
      </div>

      {result && !spinning && (
        <div
          className="rounded-2xl border p-4 text-center space-y-3 animate-scale-in"
          style={{
            borderColor: noReward ? "hsl(var(--border))" : `${prizeColor(result)}88`,
            background: noReward ? "hsl(var(--muted) / 0.35)" : `${prizeColor(result)}18`,
            boxShadow: legendary ? `0 0 34px ${prizeColor(result)}55` : undefined,
          }}
        >
          {noReward ? (
            <>
              <div className="text-3xl">🍀</div>
              <div className="text-lg font-bold">حظ أوفر!</div>
              <p className="text-sm text-muted-foreground">ما في جائزة هالمرة — رجعة بكرة معها فرصة جديدة تمامًا 💪</p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 text-primary font-bold">
                <Sparkles className="w-5 h-5" /> 🎉 مبروك! لقد حصلت على
              </div>
              <div className="text-2xl font-black flex items-center justify-center gap-2">
                <span>{result.icon || "🎁"}</span><span>{result.name}</span>
              </div>
              {summary?.value && <div className="text-lg font-extrabold" style={{ color: prizeColor(result) }}>{summary.value}</div>}
              {summary?.desc && <p className="text-sm text-muted-foreground">{summary.desc}</p>}
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                {rarityLabel(result.rarity)}
              </div>
              {result.coupon_code && (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">كود الكوبون</div>
                  <div className="flex items-center justify-center gap-2">
                    <div className="font-mono bg-background border rounded px-3 py-2 select-all tracking-wider" dir="ltr">
                      {result.coupon_code}
                    </div>
                    <Button size="icon" variant="outline" onClick={copyCode} aria-label="نسخ الكود">
                      {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )}
              {expiry && <p className="text-xs text-muted-foreground">ينتهي في {expiry}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function SpinWheel() {
  return (
    <Card className="overflow-hidden border-primary/25" dir="rtl">
      <CardContent className="p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">🎡 عجلة الحظ اليومية</h2>
        </div>
        <p className="text-sm text-muted-foreground">لفّة مجانية كل يوم واحصل على مكافآت GX</p>
        <WheelCore />
      </CardContent>
    </Card>
  );
}

export function SpinWheelModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-[440px] w-[calc(100vw-1.5rem)] max-h-[90vh] overflow-y-auto border-primary/30">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="text-xl font-black">🎡 عجلة الحظ اليومية</DialogTitle>
          <DialogDescription>لفّة مجانية كل يوم واحصل على مكافآت GX</DialogDescription>
        </DialogHeader>
        <WheelCore compact />
      </DialogContent>
    </Dialog>
  );
}
