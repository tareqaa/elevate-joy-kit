import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  TrendingUp, DollarSign, Package, Clock, Users, CheckCircle2, ArrowUpRight,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "لوحة التحكم — GX Admin" }] }),
  component: AdminOverview,
});

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  total_jod: number;
  customer_name: string | null;
  items: unknown;
  created_at: string;
};

function AdminOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard-v2"],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86400_000).toISOString();
      const [ordersRes, usersRes, todayUsersRes] = await Promise.all([
        supabase.from("orders")
          .select("id, order_number, status, total_jod, customer_name, items, created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: false }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 7 * 86400_000).toISOString()),
      ]);
      return {
        orders: (ordersRes.data ?? []) as OrderRow[],
        totalUsers: usersRes.count ?? 0,
        weekUsers: todayUsersRes.count ?? 0,
      };
    },
    refetchInterval: 60_000,
  });

  const stats = useMemo(() => {
    const orders = data?.orders ?? [];
    const now = Date.now();
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const paidLike = new Set(["paid", "processing", "delivered"]);

    let today = 0, month = 0, pending = 0, delivered = 0, cancelled = 0, processing = 0, paid = 0;
    for (const o of orders) {
      const t = new Date(o.created_at).getTime();
      const amt = Number(o.total_jod || 0);
      if (paidLike.has(o.status)) {
        if (t >= startOfDay.getTime()) today += amt;
        if (t >= startOfMonth.getTime()) month += amt;
      }
      if (o.status === "pending") pending++;
      else if (o.status === "delivered") delivered++;
      else if (o.status === "cancelled") cancelled++;
      else if (o.status === "processing") processing++;
      else if (o.status === "paid") paid++;
    }

    // 30-day chart
    const days: { day: string; label: string; sales: number; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 86400_000);
      const key = d.toISOString().slice(0, 10);
      days.push({ day: key, label: `${d.getDate()}/${d.getMonth() + 1}`, sales: 0, count: 0 });
    }
    const map = new Map(days.map((d) => [d.day, d]));
    for (const o of orders) {
      const key = o.created_at.slice(0, 10);
      const row = map.get(key);
      if (!row) continue;
      row.count += 1;
      if (paidLike.has(o.status)) row.sales += Number(o.total_jod || 0);
    }

    // Top products
    const productCounts = new Map<string, { name: string; qty: number; total: number }>();
    for (const o of orders) {
      const items = Array.isArray(o.items) ? o.items : [];
      for (const it of items as Array<{ title?: string; name?: string; qty?: number; price?: number; price_jod?: number }>) {
        const name = String(it.title || it.name || "منتج");
        const qty = Number(it.qty || 1);
        const price = Number(it.price_jod || it.price || 0);
        const cur = productCounts.get(name) ?? { name, qty: 0, total: 0 };
        cur.qty += qty; cur.total += price * qty;
        productCounts.set(name, cur);
      }
    }
    const topProducts = [...productCounts.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);

    const statusPie = [
      { name: "قيد الانتظار", value: pending, color: "#f59e0b" },
      { name: "مدفوع", value: paid, color: "#3b82f6" },
      { name: "قيد المعالجة", value: processing, color: "#8b5cf6" },
      { name: "مكتمل", value: delivered, color: "#00d4ff" },
      { name: "ملغى", value: cancelled, color: "#64748b" },
    ].filter((s) => s.value > 0);

    return { today, month, pending, delivered, days, topProducts, statusPie, recent: orders.slice(0, 8) };
  }, [data]);

  const totalUsers = data?.totalUsers ?? 0;
  const weekUsers = data?.weekUsers ?? 0;

  return (
    <div className="gx-dash">
      <style>{dashCss}</style>

      <div className="gx-dash-head">
        <div>
          <h1 className="gx-dash-title">نظرة عامة</h1>
          <p className="gx-dash-sub">آخر تحديث: {new Date().toLocaleString("ar-JO", { hour: "2-digit", minute: "2-digit" })}</p>
        </div>
      </div>

      <div className="gx-kpi-grid">
        <Kpi icon={<DollarSign size={18} />} label="مبيعات اليوم" value={fmt(stats.today)} suffix="د.أ" tone="cyan" loading={isLoading} />
        <Kpi icon={<TrendingUp size={18} />} label="مبيعات الشهر" value={fmt(stats.month)} suffix="د.أ" tone="teal" loading={isLoading} />
        <Kpi icon={<Clock size={18} />} label="طلبات معلّقة" value={String(stats.pending)} tone="amber" loading={isLoading} />
        <Kpi icon={<CheckCircle2 size={18} />} label="طلبات مكتملة" value={String(stats.delivered)} tone="green" loading={isLoading} />
        <Kpi icon={<Users size={18} />} label="إجمالي المستخدمين" value={String(totalUsers)} tone="cyan" loading={isLoading} />
        <Kpi icon={<Users size={18} />} label="جدد هذا الأسبوع" value={`+${weekUsers}`} tone="teal" loading={isLoading} />
      </div>

      <div className="gx-charts-grid">
        <div className="gx-card gx-card-xl">
          <div className="gx-card-head">
            <div>
              <div className="gx-card-title">المبيعات خلال 30 يوم</div>
              <div className="gx-card-sub">المجموع بالدينار الأردني</div>
            </div>
          </div>
          <div className="gx-chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={stats.days} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="gxCyanFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00d4ff" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#00d4ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="label" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "#0d1220", border: "1px solid rgba(0,212,255,.3)", borderRadius: 8, direction: "rtl" }} labelStyle={{ color: "#7dfffe" }} formatter={(v: number) => [`${v.toFixed(2)} د.أ`, "المبيعات"]} />
                <Area type="monotone" dataKey="sales" stroke="#00d4ff" strokeWidth={2} fill="url(#gxCyanFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="gx-card">
          <div className="gx-card-head">
            <div>
              <div className="gx-card-title">توزيع الطلبات</div>
              <div className="gx-card-sub">حسب الحالة</div>
            </div>
          </div>
          <div className="gx-chart-wrap">
            {stats.statusPie.length === 0 ? (
              <div className="gx-empty">لا توجد بيانات بعد.</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={stats.statusPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={3}>
                    {stats.statusPie.map((s, i) => <Cell key={i} fill={s.color} stroke="rgba(0,0,0,0.2)" />)}
                  </Pie>
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 11, color: "#c8ceda" }} />
                  <Tooltip contentStyle={{ background: "#0d1220", border: "1px solid rgba(0,212,255,.3)", borderRadius: 8, direction: "rtl" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="gx-lists-grid">
        <div className="gx-card">
          <div className="gx-card-head">
            <div>
              <div className="gx-card-title">أعلى المنتجات مبيعًا</div>
              <div className="gx-card-sub">خلال 30 يوم</div>
            </div>
          </div>
          {stats.topProducts.length === 0 ? (
            <div className="gx-empty">لا توجد بيانات.</div>
          ) : (
            <ol className="gx-top-list">
              {stats.topProducts.map((p, i) => (
                <li key={p.name}>
                  <span className="gx-rank">{i + 1}</span>
                  <span className="gx-top-name">{p.name}</span>
                  <span className="gx-top-qty">×{p.qty}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="gx-card">
          <div className="gx-card-head">
            <div>
              <div className="gx-card-title">أحدث الطلبات</div>
              <div className="gx-card-sub">آخر 8 طلبات</div>
            </div>
            <Link to="/admin/orders" className="gx-more">عرض الكل <ArrowUpRight size={13} /></Link>
          </div>
          {stats.recent.length === 0 ? (
            <div className="gx-empty">لا طلبات بعد.</div>
          ) : (
            <div className="gx-recent">
              {stats.recent.map((o) => (
                <div key={o.id} className="gx-recent-row">
                  <div className="gx-recent-main">
                    <div className="gx-recent-num" dir="ltr">{o.order_number}</div>
                    <div className="gx-recent-name">{o.customer_name || "زائر"}</div>
                  </div>
                  <div className="gx-recent-meta">
                    <span className={`gx-badge s-${o.status}`}>{statusLabel(o.status)}</span>
                    <span className="gx-recent-amt">{Number(o.total_jod).toFixed(2)} د.أ</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, suffix, tone, loading }: { icon: React.ReactNode; label: string; value: string; suffix?: string; tone: "cyan" | "teal" | "amber" | "green"; loading?: boolean }) {
  return (
    <div className={`gx-kpi gx-tone-${tone}`}>
      <div className="gx-kpi-icon">{icon}</div>
      <div className="gx-kpi-body">
        <div className="gx-kpi-label">{label}</div>
        <div className="gx-kpi-value">{loading ? "…" : value} {suffix && <span className="gx-kpi-suf">{suffix}</span>}</div>
      </div>
    </div>
  );
}

function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function statusLabel(s: string) {
  return ({
    pending: "قيد الانتظار",
    paid: "مدفوع",
    processing: "قيد المعالجة",
    delivered: "مكتمل",
    cancelled: "ملغى",
  } as Record<string, string>)[s] || s;
}

const dashCss = `
.gx-dash{display:flex;flex-direction:column;gap:18px;color:#e8ecf5;font-family:'Cairo','Tajawal',system-ui,sans-serif;}
.gx-dash-head{display:flex;justify-content:space-between;align-items:end;gap:14px;}
.gx-dash-title{font-size:22px;font-weight:900;letter-spacing:.3px;margin:0;background:linear-gradient(90deg,#fff,#7dfffe);-webkit-background-clip:text;background-clip:text;color:transparent;}
.gx-dash-sub{font-size:12px;color:#7a8299;margin:2px 0 0;}

.gx-kpi-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px;}
@media (max-width:1200px){.gx-kpi-grid{grid-template-columns:repeat(3,minmax(0,1fr));}}
@media (max-width:640px){.gx-kpi-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}

.gx-kpi{display:flex;align-items:center;gap:12px;padding:14px 14px;border-radius:14px;background:linear-gradient(135deg,rgba(255,255,255,.03),rgba(255,255,255,.01));border:1px solid rgba(255,255,255,.06);position:relative;overflow:hidden;transition:transform .18s,border-color .18s;}
.gx-kpi:hover{transform:translateY(-2px);border-color:rgba(0,212,255,.25);}
.gx-kpi::before{content:"";position:absolute;inset:0;background:radial-gradient(120px 60px at 100% 0%,var(--tone),transparent 60%);opacity:.12;pointer-events:none;}
.gx-tone-cyan{--tone:#00d4ff;} .gx-tone-teal{--tone:#7dfffe;} .gx-tone-amber{--tone:#f59e0b;} .gx-tone-green{--tone:#00e5b0;}
.gx-kpi-icon{width:38px;height:38px;border-radius:10px;background:color-mix(in oklab,var(--tone) 15%,transparent);color:var(--tone);display:grid;place-items:center;flex-shrink:0;box-shadow:inset 0 0 0 1px color-mix(in oklab,var(--tone) 30%,transparent);}
.gx-kpi-label{font-size:11.5px;color:#7a8299;font-weight:600;}
.gx-kpi-value{font-size:19px;font-weight:900;color:#f5f8ff;margin-top:2px;line-height:1.1;}
.gx-kpi-suf{font-size:11px;color:#8a92a8;font-weight:600;margin-inline-start:2px;}

.gx-charts-grid{display:grid;grid-template-columns:2fr 1fr;gap:14px;}
.gx-lists-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
@media (max-width:1000px){.gx-charts-grid,.gx-lists-grid{grid-template-columns:1fr;}}

.gx-card{padding:16px;border-radius:16px;background:linear-gradient(180deg,rgba(13,17,28,.7),rgba(9,12,20,.85));border:1px solid rgba(0,212,255,.1);backdrop-filter:blur(10px);}
.gx-card-head{display:flex;align-items:start;justify-content:space-between;gap:10px;margin-bottom:10px;}
.gx-card-title{font-size:14px;font-weight:800;color:#f5f8ff;}
.gx-card-sub{font-size:11px;color:#7a8299;margin-top:2px;}
.gx-chart-wrap{margin:6px -6px 0;}
.gx-empty{padding:40px 12px;text-align:center;color:#7a8299;font-size:12.5px;}

.gx-more{display:inline-flex;align-items:center;gap:4px;font-size:11.5px;color:#00d4ff;text-decoration:none;font-weight:700;padding:5px 9px;border-radius:8px;background:rgba(0,212,255,.08);border:1px solid rgba(0,212,255,.2);}
.gx-more:hover{background:rgba(0,212,255,.15);}

.gx-top-list{list-style:none;padding:0;margin:4px 0 0;display:flex;flex-direction:column;gap:6px;}
.gx-top-list li{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);}
.gx-rank{width:24px;height:24px;border-radius:7px;background:linear-gradient(135deg,#00d4ff,#7dfffe);color:#031018;display:grid;place-items:center;font-weight:900;font-size:11px;flex-shrink:0;}
.gx-top-name{flex:1;font-size:13px;color:#e8ecf5;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.gx-top-qty{font-size:12px;color:#7dfffe;font-weight:800;font-family:ui-monospace,monospace;}

.gx-recent{display:flex;flex-direction:column;gap:6px;margin-top:4px;}
.gx-recent-row{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);}
.gx-recent-main{flex:1;min-width:0;}
.gx-recent-num{font-family:ui-monospace,monospace;font-size:12px;font-weight:800;color:#7dfffe;}
.gx-recent-name{font-size:11.5px;color:#8a92a8;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.gx-recent-meta{display:flex;align-items:center;gap:8px;flex-shrink:0;}
.gx-recent-amt{font-size:12.5px;font-weight:800;color:#f5f8ff;font-family:ui-monospace,monospace;}

.gx-badge{font-size:10px;font-weight:800;padding:3px 8px;border-radius:99px;border:1px solid transparent;white-space:nowrap;}
.gx-badge.s-pending{background:rgba(245,158,11,.12);color:#fbbf24;border-color:rgba(245,158,11,.3);}
.gx-badge.s-paid{background:rgba(59,130,246,.12);color:#60a5fa;border-color:rgba(59,130,246,.3);}
.gx-badge.s-processing{background:rgba(139,92,246,.12);color:#a78bfa;border-color:rgba(139,92,246,.3);}
.gx-badge.s-delivered{background:rgba(0,212,255,.12);color:#7dfffe;border-color:rgba(0,212,255,.3);}
.gx-badge.s-cancelled{background:rgba(100,116,139,.15);color:#94a3b8;border-color:rgba(100,116,139,.3);}
`;
