import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, Check, Gift, Sparkles, Timer } from "lucide-react";

type Prize = {
  id: string;
  name: string;
  prize_type: string;
  amount: number;
  product_slug: string | null;
  weight: number;
  is_active: boolean;
  sort_order: number;
};

type SpinResult = {
  ok?: boolean;
  prize_id?: string;
  name?: string;
  prize_type?: string;
  amount?: number;
  coupon_code?: string | null;
  coupon_expires_at?: string | null;
  next_spin_at?: string | null;
};

type WheelStatus = {
  ok?: boolean;
  can_spin?: boolean;
  next_spin_at?: string | null;
  seconds_remaining?: number;
  message?: string;
};

const SEGMENT_COLORS = [
  "#0ea5b7", "#7c3aed", "#0891b2", "#c026d3", "#0d9488", "#6366f1",
  "#0e7490", "#a21caf", "#0f766e", "#4f46e5",
];

function isRare(p: Prize, totalWeight: number) {
  return totalWeight > 0 && p.weight / totalWeight <= 0.1;
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

export function SpinWheel() {
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
  const totalWeight = useMemo(() => prizes.reduce((a, p) => a + (p.weight || 0), 0), [prizes]);
  const seg = prizes.length > 0 ? 360 / prizes.length : 360;

  const canSpin = !!statusQ.data?.can_spin && prizes.length > 0 && !spinning;

  async function spin() {
    if (!canSpin) return;
    setSpinning(true);
    setResult(null);
    const { data, error } = await supabase.rpc("spin_wheel");
    if (error) {
      setSpinning(false);
      toast.error(error.message);
      void qc.invalidateQueries({ queryKey: ["wheel-status"] });
      return;
    }
    const res = (data ?? {}) as SpinResult;
    const idx = Math.max(0, prizes.findIndex((p) => p.id === res.prize_id));
    // Land the pointer (top, 0deg) exactly on the winning segment's centre.
    const targetCentre = idx * seg + seg / 2;
    const current = angle % 360;
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

  return (
    <Card className="overflow-hidden border-primary/25" dir="rtl">
      <CardContent className="p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">عجلة الحظ اليومية</h2>
        </div>
        <p className="text-sm text-muted-foreground">لفة واحدة كل يوم — اربح GX Coins أو XP أو كوبونات خصم.</p>

        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            {/* pointer */}
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
              className="w-[290px] h-[290px] sm:w-[340px] sm:h-[340px] rounded-full"
              style={{
                transform: `rotate(${angle}deg)`,
                transition: spinning ? "transform 5s cubic-bezier(0.16, 1, 0.3, 1)" : undefined,
                boxShadow: "0 0 40px hsl(var(--primary) / 0.25)",
              }}
            >
              <circle cx="150" cy="150" r="148" fill="hsl(var(--card))" stroke="hsl(var(--primary) / 0.5)" strokeWidth="3" />
              {prizes.map((p, i) => {
                const start = i * seg;
                const end = start + seg;
                const rare = isRare(p, totalWeight);
                const [tx, ty] = polar(150, 150, 92, start + seg / 2);
                return (
                  <g key={p.id}>
                    <path
                      d={segmentPath(150, 150, 145, start, end)}
                      fill={SEGMENT_COLORS[i % SEGMENT_COLORS.length]}
                      fillOpacity={rare ? 0.95 : 0.75}
                      stroke={rare ? "#fbbf24" : "rgba(255,255,255,0.18)"}
                      strokeWidth={rare ? 2.5 : 1}
                    />
                    <text
                      x={tx} y={ty}
                      fill="#fff" fontSize="12" fontWeight="700"
                      textAnchor="middle" dominantBaseline="middle"
                      transform={`rotate(${start + seg / 2}, ${tx}, ${ty})`}
                    >
                      {p.name.length > 16 ? `${p.name.slice(0, 15)}…` : p.name}
                    </text>
                    {rare && (
                      <text
                        x={polar(150, 150, 128, start + seg / 2)[0]}
                        y={polar(150, 150, 128, start + seg / 2)[1]}
                        fill="#fbbf24" fontSize="13" textAnchor="middle" dominantBaseline="middle"
                      >
                        ★
                      </text>
                    )}
                  </g>
                );
              })}
              <circle cx="150" cy="150" r="26" fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth="3" />
            </svg>
          </div>

          {statusQ.isLoading ? (
            <p className="text-sm text-muted-foreground">جاري التحميل…</p>
          ) : statusQ.data?.can_spin ? (
            <Button size="lg" onClick={spin} disabled={!canSpin} className="min-w-44 font-bold">
              {spinning ? "جاري اللف…" : "لف العجلة"}
            </Button>
          ) : (
            <div className="text-center space-y-2">
              <Button size="lg" disabled className="min-w-44 font-bold">لفة اليوم مستخدمة</Button>
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Timer className="w-4 h-4" />
                اللفة القادمة بعد <span className="font-mono text-foreground" dir="ltr">{fmtCountdown(remaining)}</span>
              </p>
            </div>
          )}
        </div>

        {result && !spinning && (
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 text-center space-y-3 animate-scale-in">
            <div className="flex items-center justify-center gap-2 text-primary font-bold">
              <Gift className="w-5 h-5" /> مبروك! ربحت
            </div>
            <div className="text-xl font-black">{result.name}</div>
            {result.coupon_code && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">كود الكوبون</div>
                <div className="flex items-center justify-center gap-2">
                  <div className="font-mono bg-background border rounded px-3 py-2 select-all" dir="ltr">
                    {result.coupon_code}
                  </div>
                  <Button size="icon" variant="outline" onClick={copyCode}>
                    {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                {result.coupon_expires_at && (
                  <p className="text-xs text-muted-foreground">
                    صالح حتى {new Date(result.coupon_expires_at).toLocaleDateString("ar-EG")}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
