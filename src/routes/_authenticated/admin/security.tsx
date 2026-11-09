import React, { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldAlert,
  ShieldCheck,
  RefreshCcw,
  Search,
  AlertTriangle,
  Crown,
  Laptop,
  Smartphone,
  Tablet,
  Globe,
  Clock,
  Ban,
  CheckCircle2,
  XCircle,
  KeyRound,
  Copy,
  Check,
  Lock,
  Unlock,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  getAdminSecurityAuditServer,
  adminBlockIpServer,
  adminUnblockIpServer,
} from "@/lib/gx/security.functions";
import type { SecurityEventRecord } from "@/lib/gx/security-audit.server";

export const Route = createFileRoute("/_authenticated/admin/security")({
  head: () => ({ meta: [{ title: "الأمان ومحاولات الدخول — لوحة التحكم" }] }),
  component: AdminSecurityPage,
});

function AdminSecurityPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [range, setRange] = useState<"24h" | "7d" | "30d" | "all">("7d");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Blocked IPs dialog state
  const [blockedModalOpen, setBlockedModalOpen] = useState(false);
  const [customBlockIp, setCustomBlockIp] = useState("");
  const [customBlockReason, setCustomBlockReason] = useState("");

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["admin-security-audit", range],
    queryFn: async () => {
      return await getAdminSecurityAuditServer({
        data: { range },
      });
    },
    refetchInterval: 15_000,
  });

  const blockMutation = useMutation({
    mutationFn: async ({ ip, reason }: { ip: string; reason?: string }) => {
      return await adminBlockIpServer({ data: { ip, reason } });
    },
    onSuccess: (_, vars) => {
      toast.success(`تم حظر عنوان الـ IP (${vars.ip}) بنجاح`);
      qc.invalidateQueries({ queryKey: ["admin-security-audit"] });
      setCustomBlockIp("");
      setCustomBlockReason("");
    },
    onError: (err: any) => {
      toast.error(err.message || "فشل حظر عنوان الـ IP");
    },
  });

  const unblockMutation = useMutation({
    mutationFn: async (ip: string) => {
      return await adminUnblockIpServer({ data: { ip } });
    },
    onSuccess: (_, ip) => {
      toast.success(`تم إلغاء حظر عنوان الـ IP (${ip})`);
      qc.invalidateQueries({ queryKey: ["admin-security-audit"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "فشل إلغاء حظر عنوان الـ IP");
    },
  });

  const events: SecurityEventRecord[] = data?.events ?? [];
  const stats = data?.stats ?? { total: 0, failed: 0, resetRequests: 0, adminTargeted: 0, blockedIps: 0 };
  const blockedIps = data?.blockedIps ?? [];

  const blockedIpSet = useMemo(() => {
    return new Set(blockedIps.map((b) => b.ip.trim()));
  }, [blockedIps]);

  // Urgent target alert for admin
  const recentAdminTarget = useMemo(() => {
    return events.find(
      (e) => e.isAdminTarget && (e.type === "reset_request" || e.type === "login_failed")
    );
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      // Type filter
      if (filterType === "admin_only" && !e.isAdminTarget) return false;
      if (filterType === "reset_request" && e.type !== "reset_request") return false;
      if (filterType === "login_failed" && e.type !== "login_failed") return false;
      if (filterType === "login_success" && e.type !== "login_success") return false;

      // Search filter (email or IP)
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesEmail = e.email.toLowerCase().includes(q);
        const matchesIp = e.ip.toLowerCase().includes(q);
        const matchesCity = (e.city || "").toLowerCase().includes(q);
        const matchesCountry = (e.countryNameAr || "").toLowerCase().includes(q);
        if (!matchesEmail && !matchesIp && !matchesCity && !matchesCountry) return false;
      }

      return true;
    });
  }, [events, filterType, search]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("تم نسخ عنوان الـ IP");
    setTimeout(() => setCopiedId(null), 1800);
  };

  const getEventBadge = (type: string, status: string) => {
    switch (type) {
      case "reset_request":
        return (
          <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-xs gap-1 py-0.5 px-2">
            <KeyRound className="w-3 h-3 text-amber-400" />
            <span>طلب استعادة كلمة مرور</span>
          </Badge>
        );
      case "login_failed":
        return (
          <Badge className="bg-rose-500/15 text-rose-300 border-rose-500/30 text-xs gap-1 py-0.5 px-2">
            <XCircle className="w-3 h-3 text-rose-400" />
            <span>محاولة دخول فاشلة</span>
          </Badge>
        );
      case "login_success":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-xs gap-1 py-0.5 px-2">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>تسجيل دخول ناجح</span>
          </Badge>
        );
      case "reset_success":
        return (
          <Badge className="bg-cyan-500/15 text-cyan-300 border-cyan-500/30 text-xs gap-1 py-0.5 px-2">
            <KeyRound className="w-3 h-3 text-cyan-400" />
            <span>تم تغيير كلمة المرور</span>
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-500/15 text-slate-300 border-slate-500/30 text-xs py-0.5 px-2">
            {type}
          </Badge>
        );
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case "mobile":
        return <Smartphone className="w-4 h-4 text-slate-400" />;
      case "tablet":
        return <Tablet className="w-4 h-4 text-slate-400" />;
      default:
        return <Laptop className="w-4 h-4 text-slate-400" />;
    }
  };

  const formatRelativeTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const diffSecs = Math.floor((Date.now() - d.getTime()) / 1000);
      if (diffSecs < 60) return "الآن (قبل ثوانٍ)";
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `منذ ${diffHours} ساعة`;
      return d.toLocaleDateString("ar-JO", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(0,229,255,0.15)]">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span>الأمان ومحاولات الدخول</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium">
                مباشر
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              مراقبة محاولات تسجيل الدخول، طلبات استعادة كلمة المرور، الـ IP، والمواقع الجغرافية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBlockedModalOpen(true)}
            className="gap-2 border-white/10 hover:bg-white/5 text-xs text-slate-300"
          >
            <Ban className="w-3.5 h-3.5 text-rose-400" />
            <span>عناوين الـ IP المحظورة ({blockedIps.length})</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="gap-2 border-white/10 hover:bg-white/5 text-xs text-slate-300"
          >
            <RefreshCcw className={`w-3.5 h-3.5 text-cyan-400 ${isRefetching ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </Button>
        </div>
      </div>

      {/* Critical Alert Banner (Targeting Admin) */}
      {recentAdminTarget && (
        <div className="relative overflow-hidden rounded-2xl border border-rose-500/40 bg-gradient-to-r from-rose-950/70 via-slate-900/90 to-slate-900/90 p-4 sm:p-5 shadow-[0_0_35px_rgba(244,63,94,0.2)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 mt-0.5 animate-pulse">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm sm:text-base text-rose-200">
                    تنبيه أمني عاجل: تم رصد محاولة استهداف لحساب الأدمن!
                  </span>
                  <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40 text-[11px]">
                    {recentAdminTarget.type === "reset_request"
                      ? "طلب استعادة كلمة مرور"
                      : "محاولة تسجيل دخول"}
                  </Badge>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  الحساب المستهدف: <span className="text-white font-mono font-semibold">{recentAdminTarget.email}</span>
                  {" • "}
                  عنوان الـ IP: <span className="text-cyan-300 font-mono font-bold">{recentAdminTarget.ip}</span>
                  {" • "}
                  الموقع: <span className="text-slate-200 font-medium">{recentAdminTarget.flag} {recentAdminTarget.city ? `${recentAdminTarget.city}، ` : ""}{recentAdminTarget.countryNameAr}</span>
                  {" • "}
                  الوقت: <span className="text-slate-400 font-mono">{formatRelativeTime(recentAdminTarget.timestamp)}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
              {blockedIpSet.has(recentAdminTarget.ip) ? (
                <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40 py-1.5 px-3 gap-1.5 text-xs">
                  <Lock className="w-3.5 h-3.5" />
                  <span>تم حظر هذا الـ IP مسبقاً</span>
                </Badge>
              ) : (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={blockMutation.isPending}
                  onClick={() =>
                    blockMutation.mutate({
                      ip: recentAdminTarget.ip,
                      reason: `استهداف حساب الأدمن (${recentAdminTarget.email})`,
                    })
                  }
                  className="gap-2 bg-rose-600 hover:bg-rose-700 text-white text-xs shadow-lg shadow-rose-900/30"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>حظر هذا الـ IP فوراً</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card className="border-white/10 bg-slate-900/60 backdrop-blur-xl">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold text-slate-400">إجمالي المحاولات</CardDescription>
            <CardTitle className="text-2xl font-black text-white">{stats.total}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-rose-500/30 bg-rose-950/20 backdrop-blur-xl">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>استهداف الأدمن</span>
            </CardDescription>
            <CardTitle className="text-2xl font-black text-rose-200">{stats.adminTargeted}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-amber-500/30 bg-amber-950/20 backdrop-blur-xl">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>طلبات الاستعادة</span>
            </CardDescription>
            <CardTitle className="text-2xl font-black text-amber-200">{stats.resetRequests}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-white/10 bg-slate-900/60 backdrop-blur-xl">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold text-slate-400">محاولات فاشلة</CardDescription>
            <CardTitle className="text-2xl font-black text-rose-400">{stats.failed}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-white/10 bg-slate-900/60 backdrop-blur-xl col-span-2 lg:col-span-1">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Ban className="w-3.5 h-3.5 text-purple-400" />
              <span>عناوين IP محظورة</span>
            </CardDescription>
            <CardTitle className="text-2xl font-black text-purple-300">{stats.blockedIps}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters Toolbar */}
      <Card className="border-white/10 bg-slate-900/60 backdrop-blur-xl p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالبريد الإلكتروني، أو عنوان IP، أو المدينة..."
              className="pr-9 bg-slate-950/60 border-white/10 text-xs h-9 text-slate-200 placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-lg border border-white/5 overflow-x-auto">
              {[
                { id: "all", label: "الكل" },
                { id: "admin_only", label: "👑 استهداف الأدمن" },
                { id: "reset_request", label: "🔑 استعادة كلمة المرور" },
                { id: "login_failed", label: "❌ فاشلة" },
                { id: "login_success", label: "✅ ناجحة" },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setFilterType(pill.id)}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                    filterType === pill.id
                      ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Time range select */}
            <Select value={range} onValueChange={(val: any) => setRange(val)}>
              <SelectTrigger className="w-[120px] bg-slate-950/60 border-white/10 text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-xs">
                <SelectItem value="24h">آخر 24 ساعة</SelectItem>
                <SelectItem value="7d">آخر 7 أيام</SelectItem>
                <SelectItem value="30d">آخر 30 يوماً</SelectItem>
                <SelectItem value="all">كل الأوقات</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Events Table / List */}
      <Card className="border-white/10 bg-slate-900/60 backdrop-blur-xl overflow-hidden">
        <CardHeader className="p-4 border-b border-white/10 bg-slate-950/40">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <span>سجل المحاولات الأخير</span>
              <Badge variant="secondary" className="text-xs bg-slate-800 text-slate-300">
                {filteredEvents.length} سجل
              </Badge>
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              <RefreshCcw className="w-6 h-6 animate-spin text-cyan-400 mx-auto mb-2" />
              <span>جاري تحميل سجل المحاولات...</span>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              <ShieldCheck className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <span>لا توجد محاولات مسجلة تطابق معايير البحث.</span>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredEvents.map((evt) => {
                const isBlocked = blockedIpSet.has(evt.ip);
                const locationStr = [evt.city, evt.countryNameAr].filter(Boolean).join("، ");

                return (
                  <div
                    key={evt.id}
                    className={`p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 transition-colors ${
                      evt.isAdminTarget ? "bg-rose-950/10 hover:bg-rose-950/20" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    {/* Column 1: Account & Type */}
                    <div className="space-y-1.5 min-w-[220px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-white font-mono">
                          {evt.email}
                        </span>
                        {evt.isAdminTarget && (
                          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] gap-1 py-0.2 px-1.5">
                            <Crown className="w-3 h-3 text-amber-400" />
                            <span>حساب الأدمن</span>
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {getEventBadge(evt.type, evt.status)}
                        {evt.failureReason && (
                          <span className="text-[11px] text-slate-400">({evt.failureReason})</span>
                        )}
                      </div>
                    </div>

                    {/* Column 2: IP Address & Block Action */}
                    <div className="flex items-center gap-2 min-w-[190px]">
                      <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-white/10 font-mono text-xs text-cyan-300">
                        <Globe className="w-3 h-3 text-cyan-500 shrink-0" />
                        <span>{evt.ip}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(evt.ip, evt.id)}
                          className="text-slate-400 hover:text-white p-0.5"
                          title="نسخ عنوان IP"
                        >
                          {copiedId === evt.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>

                      {isBlocked ? (
                        <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40 text-[10px] py-1 px-2 shrink-0">
                          محظور 🔒
                        </Badge>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={blockMutation.isPending}
                          onClick={() =>
                            blockMutation.mutate({
                              ip: evt.ip,
                              reason: `محاولة مشبوهة (${evt.email})`,
                            })
                          }
                          className="h-7 text-[11px] text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 px-2 shrink-0"
                          title="حظر هذا العنوان"
                        >
                          <Ban className="w-3 h-3 mr-1" />
                          <span>حظر IP</span>
                        </Button>
                      )}
                    </div>

                    {/* Column 3: Geolocation */}
                    <div className="flex items-center gap-2 min-w-[150px] text-xs text-slate-300">
                      <span className="text-base">{evt.flag}</span>
                      <span className="truncate">{locationStr || "الأردن"}</span>
                    </div>

                    {/* Column 4: Device & Browser */}
                    <div className="flex items-center gap-2 min-w-[170px] text-xs text-slate-400">
                      {getDeviceIcon(evt.deviceType)}
                      <span className="truncate">{evt.deviceName}</span>
                    </div>

                    {/* Column 5: Time */}
                    <div className="text-left shrink-0 text-xs text-slate-400 font-mono flex items-center gap-1.5 self-end lg:self-auto">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{formatRelativeTime(evt.timestamp)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Blocked IPs Manager Dialog */}
      <Dialog open={blockedModalOpen} onOpenChange={setBlockedModalOpen}>
        <DialogContent className="max-w-lg bg-slate-900 border-white/10 text-white" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Ban className="w-4 h-4 text-rose-400" />
              <span>إدارة عناوين الـ IP المحظورة</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              العناوين المحظورة تُمنع تلقائياً من تسجيل الدخول أو إرسال أي طلبات بالمتجر.
            </DialogDescription>
          </DialogHeader>

          {/* Add IP Form */}
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                placeholder="عنوان IP المراد حظره (مثال: 192.0.2.1)"
                value={customBlockIp}
                onChange={(e) => setCustomBlockIp(e.target.value)}
                className="bg-slate-950/60 border-white/10 text-xs h-9 text-slate-200"
              />
              <Input
                placeholder="السبب (اختياري)"
                value={customBlockReason}
                onChange={(e) => setCustomBlockReason(e.target.value)}
                className="bg-slate-950/60 border-white/10 text-xs h-9 text-slate-200"
              />
            </div>
            <Button
              size="sm"
              disabled={!customBlockIp.trim() || blockMutation.isPending}
              onClick={() =>
                blockMutation.mutate({
                  ip: customBlockIp.trim(),
                  reason: customBlockReason.trim() || "حظر يدوي بواسطة الأدمن",
                })
              }
              className="w-full bg-rose-600 hover:bg-rose-700 text-white text-xs h-8"
            >
              <Ban className="w-3.5 h-3.5 mr-1" />
              <span>إضافة إلى قائمة الحظر</span>
            </Button>
          </div>

          {/* Blocked List */}
          <div className="mt-4 space-y-2">
            <h4 className="text-xs font-semibold text-slate-400">
              العناوين المحظورة حالياً ({blockedIps.length})
            </h4>

            {blockedIps.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                لا توجد عناوين IP محظورة حالياً.
              </div>
            ) : (
              <div className="max-h-[260px] overflow-y-auto divide-y divide-white/5 border border-white/10 rounded-xl bg-slate-950/40 p-1">
                {blockedIps.map((item) => (
                  <div
                    key={item.ip}
                    className="p-2.5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="font-mono font-semibold text-cyan-300">{item.ip}</div>
                      {item.reason && (
                        <div className="text-[11px] text-slate-400 mt-0.5">{item.reason}</div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={unblockMutation.isPending}
                      onClick={() => unblockMutation.mutate(item.ip)}
                      className="text-xs text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/10 h-7 px-2.5 gap-1"
                    >
                      <Unlock className="w-3 h-3" />
                      <span>إلغاء الحظر</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBlockedModalOpen(false)}
              className="border-white/10 text-xs"
            >
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

