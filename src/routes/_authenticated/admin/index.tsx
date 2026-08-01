import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, Clock, Users, CheckCircle2, ArrowUpRight,
  RefreshCw, Coins, Wallet, Star, ShoppingBag, AlertTriangle, Package, Ticket,
  MessageSquare, Trophy, Download, Minus,
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
  paid_jod: number | null;
  discount_jod: number | null;
  coins_used: number | null;
  coins_discount_jod: number | null;
  customer_name: string | null;
  user_id: string | null;
  items: unknown;
  created_at: string;
};

type RangeKey = 7 | 30 | 90;

const PAID_LIKE = new Set(["paid", "processing", "delivered"]);

function AdminOverview() {
  const [range, setRange] = useState<RangeKey>(30);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-dashboard-v3", range],
    queryFn: async () => {
      const spanMs = range * 86400_000;
      const since = new Date(Date.now() - spanMs * 2).toISOString();
      const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();

      const [ordersRes, usersRes, weekUsersRes, pendingReviewsRes, activeCouponsRes, productsRes, topUsersRes] =
        await Promise.all([
          supabase.from("orders")
            .select("id, order_number, status, total_jod, paid_jod, discount_jod, coins_used, coins_discount_jod, customer_name, user_id, items, created_at")
            .gte("created_at", since)
            .order("created_at", { ascending: false }),
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
          supabase.from("reviews").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("coupons").select("id", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("profiles")
            .select("id, full_name, username, avatar_url, total_spent, orders_count, level_code")
            .order("total_spent", { ascending: false })
            .limit(5),
        ]);

      return {
        orders: (ordersRes.data ?? []) as OrderRow[],
        totalUsers: usersRes.count ?? 0,
        weekUsers: weekUsersRes.count ?? 0,
        pendingReviews: pendingReviewsRes.count ?? 0,
        activeCoupons: activeCouponsRes.count ?? 0,
        activeProducts: productsRes.count ?? 0,
        topUsers: topUsersRes.data ?? [],
      };
    },
    refetchInterval: 60_000,
  });

  const stats = useMemo(() => {
    const orders = data?.orders ?? [];
    const now = Date.now();
    const spanMs = range * 86400_000;
    const curFrom = now - spanMs;
    const prevFrom = now - spanMs * 2;

    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);

    let today = 0, month = 0, pending = 0, delivered = 0, cancelled = 0, processing = 0, paid = 0, refunded = 0;
    let curRevenue = 0, prevRevenue = 0, curOrders = 0, prevOrders = 0;
    let coinsUsed = 0, discountTotal = 0, refundedAmount = 0;
    const buyers = new Set<string>();

    for (const o of orders) {
      const t = new Date(o.created_at).getTime();
      const amt = Number(o.paid_jod ?? o.total_jod ?? 0);
      const isPaid = PAID_LIKE.has(o.status);
      const inCurrent = t >= curFrom;
      const inPrev = t >= prevFrom && t < curFrom;

      if (inCurrent) {
        curOrders++;
        if (isPaid) {
          curRevenue += amt;
          coinsUsed += Number(o.coins_used || 0);
          discountTotal += Number(o.discount_jod || 0) + Number(o.coins_discount_jod || 0);
          if (o.user_id) buyers.add(o.user_id);
        }
        if (o.status === "pending") pending++;
        else if (o.status === "delivered") delivered++;
        else if (o.status === "cancelled") cancelled++;
        else if (o.status === "processing") processing++;
        else if (o.status === "paid") paid++;
        else if (o.status === "refunded") { refunded++; refundedAmount += Number(o.total_jod || 0); }
      } else if (inPrev) {
        prevOrders++;
        if (isPaid) prevRevenue += amt;
      }

      if (isPaid) {
        if (t >= startOfDay.getTime()) today += amt;
        if (t >= startOfMonth.getTime()) month += amt;
      }
    }

    // Daily series for the selected range
    const days: { day: string; label: string; sales: number; count: number }[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(now - i * 86400_000);
      const key = d.toISOString().slice(0, 10);
      days.push({ day: key, label: `${d.getDate()}/${d.getMonth() + 1}`, sales: 0, count: 0 });
    }
    const map = new Map(days.map((d) => [d.day, d]));
    for (const o of orders) {
      const row = map.get(o.created_at.slice(0, 10));
      if (!row) continue;
      row.count += 1;
      if (PAID_LIKE.has(o.status)) row.sales += Number(o.paid_jod ?? o.total_jod ?? 0);
    }

    // Top products
    const productCounts = new Map<string, { name: string; qty: number; total: number }>();
    for (const o of orders) {
      if (new Date(o.created_at).getTime() < curFrom) continue;
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
    const topProducts = [...productCounts.values()].sort((a, b) => b.qty - a.qty).slice(0, 6);

    const statusPie = [
      { name: "قيد الانتظار", value: pending, color: "#f59e0b" },
      { name: "مدفوع", value: paid, color: "#3b82f6" },
      { name: "قيد المعالجة", value: processing, color: "#8b5cf6" },
      { name: "مكتمل", value: delivered, color: "#00d4ff" },
      { name: "ملغى", value: cancelled, color: "#64748b" },
      { name: "مسترجع", value: refunded, color: "#ef4444" },
    ].filter((s) => s.value > 0);

    const totalClosed = delivered + cancelled + refunded;
    const conversion = totalClosed > 0 ? (delivered / totalClosed) * 100 : 0;
    const aov = curOrders > 0 ? curRevenue / Math.max(1, delivered + paid + processing) : 0;

    return {
      today, month, pending, delivered, cancelled, refunded, days, topProducts, statusPie,
      recent: orders.filter((o) => new Date(o.created_at).getTime() >= curFrom).slice(0, 8),
      pendingList: orders.filter((o) => o.status === "pending").slice(0, 5),
      curRevenue, prevRevenue, curOrders, prevOrders,
      coinsUsed, discountTotal, refundedAmount, conversion, aov,
      uniqueBuyers: buyers.size,
    };
  }, [data, range]);

  const totalUsers = data?.totalUsers ?? 0;
  const weekUsers = data?.weekUsers ?? 0;

  const revenueDelta = pct(stats.curRevenue, stats.prevRevenue);
  const ordersDelta = pct(stats.curOrders, stats.prevOrders);

  function exportCsv() {
    const rows = [["اليوم", "المبيعات", "عدد الطلبات"], ...stats.days.map((d) => [d.day, d.sales.toFixed(2), String(d.count)])];
    const csv = "\uFEFF" + rows.map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `gx-dashboard-${range}d.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="gx-dash">
      <style>{dashCss}</style>

      <div className="gx-dash-head">
        <div>
          <h1 className="gx-dash-title">نظرة عامة</h1>
          <p className="gx-dash-sub">
            آخر تحديث: {new Date().toLocaleString("ar-JO", { hour: "2-digit", minute: "2-digit" })}
            {isFetching && <span className="gx-live"> • يتم التحديث…</span>}
          </p>
        </div>
        <div className="gx-head-tools">
          <div className="gx-range">
            {([7, 30, 90] as RangeKey[]).map((r) => (
              <button key={r} className={range === r ? "on" : ""} onClick={() => setRange(r)}>{r} يوم</button>
            ))}
          </div>
          <button className="gx-ghost-btn" onClick={() => refetch()} title="تحديث">
            <RefreshCw size={14} className={isFetching ? "gx-spin" : ""} />
          </button>
          <button className="gx-ghost-btn" onClick={exportCsv} title="تصدير CSV">
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* Alerts */}
      {(stats.pending > 0 || (data?.pendingReviews ?? 0) > 0) && (
        <div className="gx-alerts">
          {stats.pending > 0 && (
            <Link to="/admin/orders" className="gx-alert warn">
              <AlertTriangle size={15} />
              <span>لديك <b>{stats.pending}</b> طلب بانتظار المعالجة</span>
              <ArrowUpRight size={13} />
            </Link>
          )}
          {(data?.pendingReviews ?? 0) > 0 && (
            <Link to="/admin/reviews" className="gx-alert info">
              <MessageSquare size={15} />
              <span><b>{data?.pendingReviews}</b> مراجعة بانتظار المراجعة</span>
              <ArrowUpRight size={13} />
            </Link>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="gx-kpi-grid">
        <Kpi icon={<DollarSign size={18} />} label="إيرادات الفترة" value={fmt(stats.curRevenue)} suffix="د.أ" tone="cyan" loading={isLoading} delta={revenueDelta} />
        <Kpi icon={<ShoppingBag size={18} />} label="طلبات الفترة" value={String(stats.curOrders)} tone="teal" loading={isLoading} delta={ordersDelta} />
        <Kpi icon={<TrendingUp size={18} />} label="متوسط قيمة الطلب" value={fmt(stats.aov)} suffix="د.أ" tone="green" loading={isLoading} />
        <Kpi icon={<Clock size={18} />} label="طلبات معلّقة" value={String(stats.pending)} tone="amber" loading={isLoading} />
        <Kpi icon={<CheckCircle2 size={18} />} label="نسبة الإتمام" value={`${stats.conversion.toFixed(0)}%`} tone="green" loading={isLoading} />
        <Kpi icon={<Users size={18} />} label="مشترون فريدون" value={String(stats.uniqueBuyers)} tone="cyan" loading={isLoading} />
      </div>

      <div className="gx-kpi-grid">
        <Kpi icon={<DollarSign size={18} />} label="مبيعات اليوم" value={fmt(stats.today)} suffix="د.أ" tone="cyan" loading={isLoading} />
        <Kpi icon={<TrendingUp size={18} />} label="مبيعات الشهر" value={fmt(stats.month)} suffix="د.أ" tone="teal" loading={isLoading} />
        <Kpi icon={<Coins size={18} />} label="عملات مستخدمة" value={stats.coinsUsed.toLocaleString("en-US")} tone="amber" loading={isLoading} />
        <Kpi icon={<Wallet size={18} />} label="إجمالي الخصومات" value={fmt(stats.discountTotal)} suffix="د.أ" tone="amber" loading={isLoading} />
        <Kpi icon={<RefreshCw size={18} />} label="مبالغ مسترجعة" value={fmt(stats.refundedAmount)} suffix="د.أ" tone="red" loading={isLoading} />
        <Kpi icon={<Users size={18} />} label="مستخدمون جدد (٧ أيام)" value={`+${weekUsers}`} tone="green" loading={isLoading} />
      </div>

      {/* Quick actions */}
      <div className="gx-quick">
        <QuickLink to="/admin/orders" icon={<ShoppingBag size={16} />} label="الطلبات" hint={`${stats.pending} معلّق`} />
        <QuickLink to="/admin/products" icon={<Package size={16} />} label="المنتجات" hint={`${data?.activeProducts ?? 0} نشِط`} />
        <QuickLink to="/admin/coupons" icon={<Ticket size={16} />} label="الكوبونات" hint={`${data?.activeCoupons ?? 0} فعّال`} />
        <QuickLink to="/admin/reviews" icon={<Star size={16} />} label="المراجعات" hint={`${data?.pendingReviews ?? 0} بالانتظار`} />
        <QuickLink to="/admin/users" icon={<Users size={16} />} label="العملاء" hint={`${totalUsers} مستخدم`} />
        <QuickLink to="/admin/leaderboard" icon={<Trophy size={16} />} label="المتصدرون" hint="الترتيب" />
      </div>

      {/* Charts */}
      <div className="gx-charts-grid">
        <div className="gx-card gx-card-xl">
          <div className="gx-card-head">
            <div>
              <div className="gx-card-title">المبيعات خلال {range} يوم</div>
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
                <XAxis dataKey="label" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} minTickGap={16} />
                <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tipStyle} labelStyle={{ color: "#7dfffe" }} formatter={(v: number) => [`${v.toFixed(2)} د.أ`, "المبيعات"]} />
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
                  <Tooltip contentStyle={tipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="gx-charts-grid">
        <div className="gx-card gx-card-xl">
          <div className="gx-card-head">
            <div>
              <div className="gx-card-title">عدد الطلبات اليومي</div>
              <div className="gx-card-sub">آخر {range} يوم</div>
            </div>
          </div>
          <div className="gx-chart-wrap">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.days} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="label" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} minTickGap={16} />
                <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: "rgba(0,212,255,.06)" }} contentStyle={tipStyle} formatter={(v: number) => [`${v} طلب`, "الطلبات"]} />
                <Bar dataKey="count" fill="#7dfffe" radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="gx-card">
          <div className="gx-card-head">
            <div>
              <div className="gx-card-title">أفضل العملاء</div>
              <div className="gx-card-sub">حسب إجمالي الإنفاق</div>
            </div>
            <Link to="/admin/users" className="gx-more">عرض الكل <ArrowUpRight size={13} /></Link>
          </div>
          {(data?.topUsers ?? []).length === 0 ? (
            <div className="gx-empty">لا يوجد عملاء بعد.</div>
          ) : (
            <div className="gx-recent">
              {(data?.topUsers ?? []).map((u, i) => (
                <div key={u.id} className="gx-recent-row">
                  <span className="gx-rank">{i + 1}</span>
                  <div className="gx-recent-main">
                    <div className="gx-recent-name-strong">{u.full_name || u.username || "لاعب"}</div>
                    <div className="gx-recent-name">{u.orders_count ?? 0} طلب • {u.level_code}</div>
                  </div>
                  <span className="gx-recent-amt">{Number(u.total_spent || 0).toFixed(2)} د.أ</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lists */}
      <div className="gx-lists-grid">
        <div className="gx-card">
          <div className="gx-card-head">
            <div>
              <div className="gx-card-title">أعلى المنتجات مبيعًا</div>
              <div className="gx-card-sub">خلال {range} يوم</div>
            </div>
          </div>
          {stats.topProducts.length === 0 ? (
            <div className="gx-empty">لا توجد بيانات.</div>
          ) : (
            <ol className="gx-top-list">
              {stats.topProducts.map((p, i) => {
                const max = stats.topProducts[0].qty || 1;
                return (
                  <li key={p.name}>
                    <span className="gx-rank">{i + 1}</span>
                    <div className="gx-top-body">
                      <div className="gx-top-row">
                        <span className="gx-top-name">{p.name}</span>
                        <span className="gx-top-qty">×{p.qty}</span>
                      </div>
                      <div className="gx-bar"><i style={{ width: `${(p.qty / max) * 100}%` }} /></div>
                    </div>
                  </li>
                );
              })}
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
                <Link key={o.id} to="/admin/orders" className="gx-recent-row gx-clickable">
                  <div className="gx-recent-main">
                    <div className="gx-recent-num" dir="ltr">{o.order_number}</div>
                    <div className="gx-recent-name">{o.customer_name || "زائر"} • {timeAgo(o.created_at)}</div>
                  </div>
                  <div className="gx-recent-meta">
                    <span className={`gx-badge s-${o.status}`}>{statusLabel(o.status)}</span>
                    <span className="gx-recent-amt">{Number(o.total_jod).toFixed(2)} د.أ</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {stats.pendingList.length > 0 && (
        <div className="gx-card">
          <div className="gx-card-head">
            <div>
              <div className="gx-card-title">بحاجة إلى إجراء الآن</div>
              <div className="gx-card-sub">طلبات معلّقة تنتظر التنفيذ</div>
            </div>
            <Link to="/admin/orders" className="gx-more">إدارة الطلبات <ArrowUpRight size={13} /></Link>
          </div>
          <div className="gx-recent">
            {stats.pendingList.map((o) => (
              <Link key={o.id} to="/admin/orders" className="gx-recent-row gx-clickable gx-pending-row">
                <div className="gx-recent-main">
                  <div className="gx-recent-num" dir="ltr">{o.order_number}</div>
                  <div className="gx-recent-name">{o.customer_name || "زائر"} • {timeAgo(o.created_at)}</div>
                </div>
                <span className="gx-recent-amt">{Number(o.total_jod).toFixed(2)} د.أ</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QuickLink({ to, icon, label, hint }: { to: string; icon: React.ReactNode; label: string; hint: string }) {
  return (
    <Link to={to} className="gx-quick-item">
      <span className="gx-quick-icon">{icon}</span>
      <span className="gx-quick-body">
        <span className="gx-quick-label">{label}</span>
        <span className="gx-quick-hint">{hint}</span>
      </span>
      <ArrowUpRight size={13} className="gx-quick-arrow" />
    </Link>
  );
}

function Kpi({ icon, label, value, suffix, tone, loading, delta }: {
  icon: React.ReactNode; label: string; value: string; suffix?: string;
  tone: "cyan" | "teal" | "amber" | "green" | "red"; loading?: boolean; delta?: number | null;
}) {
  return (
    <div className={`gx-kpi gx-tone-${tone}`}>
      <div className="gx-kpi-icon">{icon}</div>
      <div className="gx-kpi-body">
        <div className="gx-kpi-label">{label}</div>
        <div className="gx-kpi-value">{loading ? "…" : value} {suffix && <span className="gx-kpi-suf">{suffix}</span>}</div>
        {delta != null && !loading && (
          <div className={`gx-delta ${delta > 0 ? "up" : delta < 0 ? "down" : "flat"}`}>
            {delta > 0 ? <TrendingUp size={11} /> : delta < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
            {Math.abs(delta).toFixed(0)}% مقارنة بالفترة السابقة
          </div>
        )}
      </div>
    </div>
  );
}

function pct(cur: number, prev: number): number | null {
  if (!prev) return cur > 0 ? 100 : null;
  return ((cur - prev) / prev) * 100;
}

function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `قبل ${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `قبل ${h} س`;
  return `قبل ${Math.floor(h / 24)} يوم`;
}

function statusLabel(s: string) {
  return ({
    pending: "قيد الانتظار",
    paid: "مدفوع",
    processing: "قيد المعالجة",
    delivered: "مكتمل",
    cancelled: "ملغى",
    refunded: "مسترجع",
  } as Record<string, string>)[s] || s;
}

const tipStyle = { background: "#0d1220", border: "1px solid rgba(0,212,255,.3)", borderRadius: 8, direction: "rtl" } as const;

const dashCss = `
.gx-dash{display:flex;flex-direction:column;gap:18px;color:#e8ecf5;font-family:'Cairo','Tajawal',system-ui,sans-serif;}
.gx-dash-head{display:flex;justify-content:space-between;align-items:end;gap:14px;flex-wrap:wrap;}
.gx-dash-title{font-size:22px;font-weight:900;letter-spacing:.3px;margin:0;background:linear-gradient(90deg,#fff,#7dfffe);-webkit-background-clip:text;background-clip:text;color:transparent;}
.gx-dash-sub{font-size:12px;color:#7a8299;margin:2px 0 0;}
.gx-live{color:#00d4ff;}
.gx-head-tools{display:flex;align-items:center;gap:8px;}
.gx-range{display:flex;gap:4px;padding:4px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);}
.gx-range button{border:0;background:transparent;color:#8a92a8;font-size:12px;font-weight:700;padding:6px 12px;border-radius:9px;cursor:pointer;font-family:inherit;transition:.15s;}
.gx-range button:hover{color:#e8ecf5;}
.gx-range button.on{background:linear-gradient(135deg,#00d4ff,#7dfffe);color:#031018;}
.gx-ghost-btn{width:34px;height:34px;display:grid;place-items:center;border-radius:10px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);color:#8a92a8;cursor:pointer;transition:.15s;}
.gx-ghost-btn:hover{color:#00d4ff;border-color:rgba(0,212,255,.3);}
.gx-spin{animation:gxspin 1s linear infinite;}
@keyframes gxspin{to{transform:rotate(360deg);}}

.gx-alerts{display:flex;gap:10px;flex-wrap:wrap;}
.gx-alert{display:inline-flex;align-items:center;gap:8px;padding:10px 14px;border-radius:12px;font-size:12.5px;font-weight:700;text-decoration:none;transition:.15s;}
.gx-alert b{font-weight:900;}
.gx-alert.warn{background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);color:#fbbf24;}
.gx-alert.info{background:rgba(0,212,255,.08);border:1px solid rgba(0,212,255,.25);color:#7dfffe;}
.gx-alert:hover{transform:translateY(-1px);filter:brightness(1.15);}

.gx-kpi-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px;}
@media (max-width:1200px){.gx-kpi-grid{grid-template-columns:repeat(3,minmax(0,1fr));}}
@media (max-width:640px){.gx-kpi-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}

.gx-kpi{display:flex;align-items:flex-start;gap:12px;padding:14px;border-radius:14px;background:linear-gradient(135deg,rgba(255,255,255,.03),rgba(255,255,255,.01));border:1px solid rgba(255,255,255,.06);position:relative;overflow:hidden;transition:transform .18s,border-color .18s;}
.gx-kpi:hover{transform:translateY(-2px);border-color:rgba(0,212,255,.25);}
.gx-kpi::before{content:"";position:absolute;inset:0;background:radial-gradient(120px 60px at 100% 0%,var(--tone),transparent 60%);opacity:.12;pointer-events:none;}
.gx-tone-cyan{--tone:#00d4ff;} .gx-tone-teal{--tone:#7dfffe;} .gx-tone-amber{--tone:#f59e0b;} .gx-tone-green{--tone:#00e5b0;} .gx-tone-red{--tone:#ef4444;}
.gx-kpi-icon{width:38px;height:38px;border-radius:10px;background:color-mix(in oklab,var(--tone) 15%,transparent);color:var(--tone);display:grid;place-items:center;flex-shrink:0;box-shadow:inset 0 0 0 1px color-mix(in oklab,var(--tone) 30%,transparent);}
.gx-kpi-body{min-width:0;}
.gx-kpi-label{font-size:11.5px;color:#7a8299;font-weight:600;}
.gx-kpi-value{font-size:19px;font-weight:900;color:#f5f8ff;margin-top:2px;line-height:1.1;}
.gx-kpi-suf{font-size:11px;color:#8a92a8;font-weight:600;margin-inline-start:2px;}
.gx-delta{display:flex;align-items:center;gap:3px;font-size:10.5px;font-weight:700;margin-top:5px;}
.gx-delta.up{color:#00e5b0;} .gx-delta.down{color:#f87171;} .gx-delta.flat{color:#7a8299;}

.gx-quick{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;}
@media (max-width:1200px){.gx-quick{grid-template-columns:repeat(3,minmax(0,1fr));}}
@media (max-width:640px){.gx-quick{grid-template-columns:repeat(2,minmax(0,1fr));}}
.gx-quick-item{display:flex;align-items:center;gap:9px;padding:11px 12px;border-radius:13px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);text-decoration:none;transition:.16s;}
.gx-quick-item:hover{border-color:rgba(0,212,255,.35);background:rgba(0,212,255,.05);transform:translateY(-2px);}
.gx-quick-icon{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;background:rgba(0,212,255,.1);color:#7dfffe;flex-shrink:0;}
.gx-quick-body{display:flex;flex-direction:column;min-width:0;flex:1;}
.gx-quick-label{font-size:12.5px;font-weight:800;color:#e8ecf5;}
.gx-quick-hint{font-size:10.5px;color:#7a8299;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.gx-quick-arrow{color:#4b5569;flex-shrink:0;}

.gx-charts-grid{display:grid;grid-template-columns:2fr 1fr;gap:14px;}
.gx-lists-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
@media (max-width:1000px){.gx-charts-grid,.gx-lists-grid{grid-template-columns:1fr;}}

.gx-card{padding:16px;border-radius:16px;background:linear-gradient(180deg,rgba(13,17,28,.7),rgba(9,12,20,.85));border:1px solid rgba(0,212,255,.1);backdrop-filter:blur(10px);}
.gx-card-head{display:flex;align-items:start;justify-content:space-between;gap:10px;margin-bottom:10px;}
.gx-card-title{font-size:14px;font-weight:800;color:#f5f8ff;}
.gx-card-sub{font-size:11px;color:#7a8299;margin-top:2px;}
.gx-chart-wrap{margin:6px -6px 0;}
.gx-empty{padding:40px 12px;text-align:center;color:#7a8299;font-size:12.5px;}

.gx-more{display:inline-flex;align-items:center;gap:4px;font-size:11.5px;color:#00d4ff;text-decoration:none;font-weight:700;padding:5px 9px;border-radius:8px;background:rgba(0,212,255,.08);border:1px solid rgba(0,212,255,.2);white-space:nowrap;}
.gx-more:hover{background:rgba(0,212,255,.15);}

.gx-top-list{list-style:none;padding:0;margin:4px 0 0;display:flex;flex-direction:column;gap:6px;}
.gx-top-list li{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);}
.gx-rank{width:24px;height:24px;border-radius:7px;background:linear-gradient(135deg,#00d4ff,#7dfffe);color:#031018;display:grid;place-items:center;font-weight:900;font-size:11px;flex-shrink:0;}
.gx-top-body{flex:1;min-width:0;}
.gx-top-row{display:flex;align-items:center;justify-content:space-between;gap:8px;}
.gx-top-name{flex:1;font-size:13px;color:#e8ecf5;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.gx-top-qty{font-size:12px;color:#7dfffe;font-weight:800;font-family:ui-monospace,monospace;}
.gx-bar{height:4px;border-radius:99px;background:rgba(255,255,255,.06);margin-top:6px;overflow:hidden;}
.gx-bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#00d4ff,#7dfffe);}

.gx-recent{display:flex;flex-direction:column;gap:6px;margin-top:4px;}
.gx-recent-row{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);text-decoration:none;}
.gx-clickable{transition:.15s;}
.gx-clickable:hover{border-color:rgba(0,212,255,.3);background:rgba(0,212,255,.05);}
.gx-pending-row{border-color:rgba(245,158,11,.22);}
.gx-recent-main{flex:1;min-width:0;}
.gx-recent-num{font-family:ui-monospace,monospace;font-size:12px;font-weight:800;color:#7dfffe;}
.gx-recent-name-strong{font-size:12.5px;font-weight:800;color:#e8ecf5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.gx-recent-name{font-size:11.5px;color:#8a92a8;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.gx-recent-meta{display:flex;align-items:center;gap:8px;flex-shrink:0;}
.gx-recent-amt{font-size:12.5px;font-weight:800;color:#f5f8ff;font-family:ui-monospace,monospace;flex-shrink:0;}

.gx-badge{font-size:10px;font-weight:800;padding:3px 8px;border-radius:99px;border:1px solid transparent;white-space:nowrap;}
.gx-badge.s-pending{background:rgba(245,158,11,.12);color:#fbbf24;border-color:rgba(245,158,11,.3);}
.gx-badge.s-paid{background:rgba(59,130,246,.12);color:#60a5fa;border-color:rgba(59,130,246,.3);}
.gx-badge.s-processing{background:rgba(139,92,246,.12);color:#a78bfa;border-color:rgba(139,92,246,.3);}
.gx-badge.s-delivered{background:rgba(0,212,255,.12);color:#7dfffe;border-color:rgba(0,212,255,.3);}
.gx-badge.s-cancelled{background:rgba(100,116,139,.15);color:#94a3b8;border-color:rgba(100,116,139,.3);}
.gx-badge.s-refunded{background:rgba(239,68,68,.12);color:#f87171;border-color:rgba(239,68,68,.3);}

/* ---- Phones: keep the dashboard fully inside the viewport -------------- */
@media (max-width:640px){
  .gx-dash{gap:12px;}
  .gx-dash-head{align-items:stretch;gap:10px;}
  .gx-dash-title{font-size:18px;}
  .gx-head-tools{width:100%;justify-content:space-between;}
  .gx-range{flex:1;justify-content:space-between;}
  .gx-range button{flex:1;padding:6px 4px;font-size:11.5px;}
  .gx-alerts{gap:8px;}
  .gx-alert{width:100%;font-size:11.5px;padding:9px 11px;}
  .gx-kpi-grid,.gx-quick{gap:8px;}
  .gx-card{padding:12px;border-radius:14px;}
  .gx-chart-wrap{margin:6px -10px 0;}
  .gx-recent-row,.gx-top-list li{padding:8px;gap:8px;}
  .gx-recent-meta{gap:6px;}
  .gx-recent-amt{font-size:11.5px;}
}
@media (max-width:420px){
  .gx-kpi-grid{grid-template-columns:1fr;}
  .gx-quick{grid-template-columns:1fr 1fr;}
}
`;
