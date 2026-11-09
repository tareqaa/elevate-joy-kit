import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Laptop,
  Smartphone,
  Tablet,
  Monitor,
  ShieldCheck,
  LogOut,
  MapPin,
  Clock,
  Globe,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useLang } from "@/lib/gx/i18n";
import { supabase } from "@/integrations/supabase/client";
import {
  getUserRegisteredDevicesServer,
  revokeUserDeviceServer,
} from "@/lib/gx/security.functions";

function getStoredDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("gx_device_id");
  if (!id) {
    id = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem("gx_device_id", id);
  }
  return id;
}

export function ActiveDevicesCard() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const qc = useQueryClient();
  const [currentDeviceId, setCurrentDeviceId] = useState<string>("");

  useEffect(() => {
    setCurrentDeviceId(getStoredDeviceId());
  }, []);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["user-registered-devices", currentDeviceId],
    queryFn: async () => {
      const res = await getUserRegisteredDevicesServer({
        data: { currentDeviceId: currentDeviceId || undefined },
      });
      return res;
    },
    enabled: typeof window !== "undefined",
    refetchInterval: 20_000,
  });

  const revokeMutation = useMutation({
    mutationFn: async ({ deviceId, revokeOthers }: { deviceId?: string; revokeOthers?: boolean }) => {
      if (revokeOthers) {
        // 1. Invalidate sessions in Supabase GoTrue
        try {
          await supabase.auth.signOut({ scope: "others" });
        } catch {}
      }

      return await revokeUserDeviceServer({
        data: {
          deviceId,
          revokeOthers,
          currentDeviceId,
        },
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["user-registered-devices"] });
      if (vars.revokeOthers) {
        toast.success(
          ar
            ? "تم تسجيل الخروج بنجاح من كافة الأجهزة الأخرى وتأمين حسابك."
            : "Successfully signed out of all other devices."
        );
      } else {
        toast.success(
          ar ? "تم إنهاء جلسة هذا الجهاز بنجاح." : "Device session revoked successfully."
        );
      }
    },
    onError: () => {
      toast.error(ar ? "حدث خطأ أثناء إنهاء الجلسة." : "Failed to revoke device session.");
    },
  });

  const devices = data?.devices ?? [];
  const otherDevices = devices.filter((d) => !d.isCurrent);

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case "mobile":
        return <Smartphone className="w-4 h-4 text-primary" />;
      case "tablet":
        return <Tablet className="w-4 h-4 text-primary" />;
      default:
        return <Laptop className="w-4 h-4 text-primary" />;
    }
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const diffMinutes = Math.floor((Date.now() - d.getTime()) / 60000);
      if (diffMinutes < 2) return ar ? "الآن" : "Just now";
      if (diffMinutes < 60) return ar ? `منذ ${diffMinutes} دقيقة` : `${diffMinutes} mins ago`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return ar ? `منذ ${diffHours} ساعة` : `${diffHours} hours ago`;
      return d.toLocaleDateString(ar ? "ar-JO" : "en-US", {
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
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>{ar ? "الأجهزة والجلسات المسجلة" : "Registered Devices & Sessions"}</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              {ar
                ? "الأجهزة التي سجلت الدخول منها لحسابك، وموقعها الجغرافي، ونشاطها الأخير"
                : "Devices you have signed in from, their location, and recent activity"}
            </CardDescription>
          </div>

          {otherDevices.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              disabled={revokeMutation.isPending}
              onClick={() => revokeMutation.mutate({ revokeOthers: true })}
              className="gap-2 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50 self-start sm:self-auto"
            >
              {revokeMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
              <span>{ar ? "تسجيل الخروج من باقي الأجهزة" : "Sign Out Other Devices"}</span>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span>{ar ? "جاري فحص الأجهزة المسجلة..." : "Loading registered devices..."}</span>
          </div>
        ) : devices.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground text-sm">
            {ar ? "لا توجد أجهزة مسجلة حالياً." : "No registered devices found."}
          </div>
        ) : (
          <div className="divide-y divide-border rounded-lg border bg-muted/20 overflow-hidden">
            {devices.map((device) => {
              const locationStr = [
                device.city,
                ar ? device.countryNameAr : device.countryNameEn,
              ]
                .filter(Boolean)
                .join("، ");

              return (
                <div
                  key={device.id}
                  className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                      {getDeviceIcon(device.deviceType)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-foreground">
                          {device.deviceName}
                        </span>
                        {device.isCurrent ? (
                          <Badge
                            variant="outline"
                            className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-[11px] gap-1.5 py-0 px-2 font-normal"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {ar ? "الجهاز الحالي (نشط الآن)" : "This Device (Active Now)"}
                          </Badge>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <span>{device.flag}</span>
                          <span>{locationStr || (ar ? "الأردن" : "Jordan")}</span>
                        </span>

                        <span className="text-border">•</span>

                        <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                          <Globe className="w-3 h-3 text-muted-foreground" />
                          <span>{device.maskedIp}</span>
                        </span>

                        <span className="text-border">•</span>

                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span>{formatTime(device.lastActiveAt)}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {!device.isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={revokeMutation.isPending}
                      onClick={() => revokeMutation.mutate({ deviceId: device.id })}
                      className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 self-end sm:self-auto gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{ar ? "إنهاء الجلسة" : "Sign Out"}</span>
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

