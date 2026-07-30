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

function shade(hex: string, amount: number) {
  const m = /^#?([a-f\d]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
    Math.max(0, Math.min(255, Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount)))),
  );
  return `#${ch.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
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

/** One clean line per segment — no emoji, never spills out of the wheel. */
function segLabel(name: string) {
  const clean = (name || "").replace(/\s+/g, " ").trim();
  return clean.length > 18 ? `${clean.slice(0, 17)}…` : clean;
}

/** Curated wheel palette — richer than raw DB colors, still rarity-aware. */
const WHEEL_PALETTE = ["#0ea5e9", "#7c3aed", "#f59e0b", "#10b981", "#ec4899", "#3b82f6", "#f97316", "#8b5cf6"];
const RARITY_PALETTE: Record<string, string> = {
  legendary: "#f59e0b",
  epic: "#a855f7",
};

function segColor(p: { color?: string | null; rarity?: string | null }, i: number) {
  return RARITY_PALETTE[p.rarity || ""] || WHEEL_PALETTE[i % WHEEL_PALETTE.length];
}


const WHEEL_CSS = `
@keyframes gxw-bulbs { 0%,100% { opacity:1 } 50% { opacity:.25 } }
@keyframes gxw-tick { 0%,100% { transform: rotate(0deg) } 45% { transform: rotate(-17deg) } }
@keyframes gxw-halo { 0%,100% { opacity:.35; transform: scale(1) } 50% { opacity:.7; transform: scale(1.04) } }
@keyframes gxw-pop { 0% { transform: scale(.85); opacity:0 } 60% { transform: scale(1.03) } 100% { transform: scale(1); opacity:1 } }
@keyframes gxw-confetti { 0% { transform: translate3d(0,0,0) rotate(0); opacity:1 } 100% { transform: translate3d(var(--dx), 220px, 0) rotate(540deg); opacity:0 } }
.gxw-halo { animation: gxw-halo 3.2s ease-in-out infinite; }
.gxw-ticking { animation: gxw-tick .12s linear infinite; transform-origin: 50% 12%; }
.gxw-bulb-a { animation: gxw-bulbs 1.1s ease-in-out infinite; }
.gxw-bulb-b { animation: gxw-bulbs 1.1s ease-in-out infinite; animation-delay: .55s; }
.gxw-pop { animation: gxw-pop .45s cubic-bezier(.2,.9,.25,1) both; }
.gxw-confetti span { position:absolute; top:0; left:50%; width:8px; height:12px; border-radius:2px; animation: gxw-confetti 1.6s ease-in forwards; }
`;

export function WheelCore({ compact = false }: { compact?: boolean }) {
  const qc = useQueryClient();
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
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

  const bulbs = useMemo(() => Array.from({ length: 24 }, (_, i) => (i * 360) / 24), []);
  const confetti = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        dx: `${Math.round(Math.random() * 260 - 130)}px`,
        delay: `${Math.random() * 0.35}s`,
        color: ["#22d3ee", "#f59e0b", "#a855f7", "#34d399", "#f43f5e"][i % 5],
        left: `${Math.round(Math.random() * 90 + 5)}%`,
      })),
    [result?.prize_id],
  );

  async function spin() {
    if (!canSpin) return;
    setSpinning(true);
    setResult(null);
    setCelebrate(false);
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
    setAngle(angle + 360 * 7 + delta);

    timerRef.current = window.setTimeout(() => {
      setSpinning(false);
      setResult(res);
      if (res.reward_type !== "no_reward") setCelebrate(true);
      window.setTimeout(() => setCelebrate(false), 1900);
      void qc.invalidateQueries({ queryKey: ["wheel-status"] });
      void qc.invalidateQueries({ queryKey: ["my-loyalty"] });
      void qc.invalidateQueries({ queryKey: ["my-profile"] });
    }, 5600);
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
  const size = compact
    ? "w-[280px] h-[280px] sm:w-[330px] sm:h-[330px]"
    : "w-[300px] h-[300px] sm:w-[360px] sm:h-[360px]";
  

  return (
    <div dir="rtl" className="space-y-5">
      <style dangerouslySetInnerHTML={{ __html: WHEEL_CSS }} />

      <div className="flex flex-col items-center gap-5">
        <div className={`relative ${size} max-w-full`}>
          {/* ambient halo */}
          <div
            className="gxw-halo pointer-events-none absolute -inset-6 rounded-full blur-2xl"
            style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.35), transparent 65%)" }}
          />

          {/* confetti burst */}
          {celebrate && (
            <div className="gxw-confetti pointer-events-none absolute inset-x-0 top-4 h-full overflow-visible z-30">
              {confetti.map((c, i) => (
                <span key={i} style={{ left: c.left, background: c.color, ["--dx" as string]: c.dx, animationDelay: c.delay }} />
              ))}
            </div>
          )}

          {/* rotating wheel */}
          <svg
            viewBox="0 0 300 300"
            className="absolute inset-0 w-full h-full"
            style={{
              transform: `rotate(${angle}deg)`,
              transition: spinning ? "transform 5.4s cubic-bezier(0.13, 0.78, 0.12, 1)" : undefined,
              filter: "drop-shadow(0 18px 40px rgba(0,0,0,.55))",
            }}
          >
            <defs>
              {prizes.map((p, i) => {
                const c = segColor(p, i);
                return (
                  <linearGradient key={p.id} id={`gxw-g-${p.id}`} x1="0.1" y1="0" x2="0.9" y2="1">
                    <stop offset="0%" stopColor={shade(c, 0.28)} />
                    <stop offset="55%" stopColor={c} />
                    <stop offset="100%" stopColor={shade(c, -0.42)} />
                  </linearGradient>
                );
              })}

              <radialGradient id="gxw-gloss" cx="50%" cy="28%" r="72%">
                <stop offset="0%" stopColor="#fff" stopOpacity="0.22" />
                <stop offset="55%" stopColor="#fff" stopOpacity="0.04" />
                <stop offset="100%" stopColor="#000" stopOpacity="0.28" />
              </radialGradient>
              <linearGradient id="gxw-rim" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fde68a" />
                <stop offset="35%" stopColor="#b45309" />
                <stop offset="65%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#78350f" />
              </linearGradient>
            </defs>

            {/* clean edge — no heavy frame */}
            <circle cx="150" cy="150" r="140" fill="hsl(var(--card))" />


            {/* segments */}
            {prizes.map((p, i) => {
              const start = i * seg;
              const mid = start + seg / 2;
              const label = segLabel(p.name);
              return (
                <g key={p.id}>
                  <path
                    d={segmentPath(150, 150, 138, start, start + seg)}
                    fill={`url(#gxw-g-${p.id})`}
                    stroke="rgba(255,255,255,0.10)"
                    strokeWidth="1"
                  />
                  <g transform={`rotate(${mid - 90} 150 150)`}>
                    <text
                      x="226"
                      y="150"
                      fill="#ffffff"
                      fontSize={prizes.length > 8 ? 11.5 : 13}
                      fontWeight="900"
                      textAnchor="middle"
                      dominantBaseline="central"
                      textLength={label.length > 11 ? 96 : undefined}
                      lengthAdjust="spacingAndGlyphs"
                      style={{
                        paintOrder: "stroke",
                        fontFamily: "inherit",
                        direction: "rtl",
                        unicodeBidi: "plaintext",
                      }}
                      stroke="rgba(0,0,0,0.5)"
                      strokeWidth="3"
                      strokeLinejoin="round"
                    >
                      {label}
                    </text>
                  </g>

                  {/* separator */}
                  <line
                    x1="150"
                    y1="150"
                    x2={polar(150, 150, 138, start)[0]}
                    y2={polar(150, 150, 138, start)[1]}
                    stroke="rgba(255,255,255,0.28)"
                    strokeWidth="1.1"
                  />
                </g>
              );
            })}


            {/* gloss + bulbs */}
            <circle cx="150" cy="150" r="138" fill="url(#gxw-gloss)" pointerEvents="none" />
            {bulbs.map((a, i) => {
              const [bx, by] = polar(150, 150, 147, a);
              return (
                <circle
                  key={a}
                  cx={bx}
                  cy={by}
                  r="3.1"
                  fill={i % 2 ? "#fde68a" : "#fff7ed"}
                  className={i % 2 ? "gxw-bulb-a" : "gxw-bulb-b"}
                  style={{ filter: "drop-shadow(0 0 4px rgba(253,224,71,.9))" }}
                />
              );
            })}
          </svg>

          {/* pointer */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 -top-2 z-20 ${spinning ? "gxw-ticking" : ""}`}
            style={{ filter: "drop-shadow(0 4px 10px rgba(0,0,0,.6))" }}
          >
            <svg width="38" height="52" viewBox="0 0 38 52">
              <path d="M19 50 L4 16 A16 16 0 1 1 34 16 Z" fill="url(#gxw-rim2)" stroke="#fff7ed" strokeWidth="1.6" />
              <circle cx="19" cy="15" r="5" fill="#1f1300" />
              <defs>
                <linearGradient id="gxw-rim2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fde68a" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* center hub / spin button */}
          <button
            type="button"
            onClick={spin}
            disabled={!canSpin}
            aria-label="لف الآن"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 grid place-items-center rounded-full border-[3px] border-amber-300/80 text-[13px] font-black tracking-wide transition-transform duration-200 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100"
            style={{
              width: compact ? 76 : 84,
              height: compact ? 76 : 84,
              background: "radial-gradient(circle at 50% 30%, #1f2937, #050810 70%)",
              boxShadow: "0 0 26px hsl(var(--primary) / .55), inset 0 0 18px rgba(251,191,36,.25)",
              color: "#fde68a",
            }}
          >
            {spinning ? <span className="text-[11px]">…يلف</span> : canSpin ? "SPIN" : "🔒"}
          </button>
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
          className="gxw-pop rounded-2xl border p-4 text-center space-y-3"
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
