import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Boxes,
  Search,
  Save,
  Check,
  AlertCircle,
  Sparkles,
  ShoppingBag,
  RotateCcw,
  Plus,
  Trash2,
  Filter,
  Bell,
  Mail,
  Send,
  Clock,
  User,
} from "lucide-react";
import { useSiteSettings, getEffectiveStockLimit } from "@/lib/gx/site-settings";
import { PRODUCTS_CATALOG } from "@/data/products";
import { sendRestockNotificationEmail } from "@/lib/gx/restock-email.functions";

type CatalogItem = {
  cartId: string;
  productSlug: string;
  nameAr: string;
  nameEn: string;
  categoryName?: string;
  priceJod?: number;
  imageUrl?: string | null;
  iconImage?: string | null;
  icon?: string | null;
};

export function StockManager() {
  const qc = useQueryClient();
  const siteSettings = useSiteSettings();
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "limited" | "soldout" | "unlimited">("all");
  const [limits, setLimits] = useState<Record<string, number | null>>({});
  const [dirty, setDirty] = useState(false);

  const [newKey, setNewKey] = useState("");
  const [newLimit, setNewLimit] = useState<number>(1);

  const [activeTab, setActiveTab] = useState<"stock" | "restock-requests">("stock");
  const [requestSearch, setRequestSearch] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);

  // Fetch Restock Requests from Supabase
  const restockQ = useQuery({
    queryKey: ["admin-restock-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_restock_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const handleSendRestockEmail = async (req: any) => {
    setSendingId(req.id);
    try {
      const prodUrl = `https://gxstore.me/product/${req.product_slug}`;
      const res = await sendRestockNotificationEmail({
        data: {
          requestId: req.id,
          email: req.customer_email,
          customerName: req.customer_name || "عميلنا العزيز",
          productName: req.product_name || "المنتج المطلوب",
          productUrl: prodUrl,
        },
      });

      if (res && (res as any).ok) {
        toast.success(`تم إرسال إشعار التوفر بنجاح إلى ${req.customer_name} (${req.customer_email})!`);
        qc.invalidateQueries({ queryKey: ["admin-restock-requests"] });
      } else {
        toast.error((res as any)?.error || "فشل إرسال الإيميل، تأكد من إعدادات Resend");
      }
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء الإرسال");
    } finally {
      setSendingId(null);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الطلب؟")) return;
    try {
      const { error } = await supabase.from("product_restock_requests").delete().eq("id", id);
      if (error) throw error;
      toast.success("تم حذف طلب الإشعار");
      qc.invalidateQueries({ queryKey: ["admin-restock-requests"] });
    } catch (err: any) {
      toast.error(err.message || "فشل الحذف");
    }
  };

  const pendingRequestsCount = useMemo(() => {
    return (restockQ.data || []).filter((r: any) => r.status === "pending").length;
  }, [restockQ.data]);

  const filteredRequests = useMemo(() => {
    const q = requestSearch.trim().toLowerCase();
    const list = restockQ.data || [];
    if (!q) return list;
    return list.filter(
      (r: any) =>
        (r.customer_name || "").toLowerCase().includes(q) ||
        (r.customer_email || "").toLowerCase().includes(q) ||
        (r.product_name || "").toLowerCase().includes(q) ||
        (r.product_slug || "").toLowerCase().includes(q)
    );
  }, [restockQ.data, requestSearch]);

  // 1. Fetch products & variants
  const catalogQ = useQuery({
    queryKey: ["admin-stock-catalog"],
    queryFn: async () => {
      const { data: prods, error: pErr } = await supabase.from("products").select("*");
      if (pErr) throw pErr;
      const { data: vars, error: vErr } = await supabase.from("product_variants").select("*");
      if (vErr) throw vErr;

      const items: CatalogItem[] = [];
      const seenCartIds = new Set<string>();

      // A. Variants from DB
      (vars ?? []).forEach((v) => {
        const p = (prods ?? []).find((pr) => pr.id === v.product_id);
        const cartId = v.cart_id || v.id;
        if (seenCartIds.has(cartId)) return;
        seenCartIds.add(cartId);

        const prodNameAr = p?.name_ar || "";
        const prodNameEn = p?.name_en || "";
        const labelAr = v.label_ar || "";
        const labelEn = v.label_en || "";

        const nameAr = prodNameAr && !labelAr.includes(prodNameAr) ? `${prodNameAr} — ${labelAr}` : labelAr || prodNameAr;
        const nameEn = prodNameEn && !labelEn.includes(prodNameEn) ? `${prodNameEn} — ${labelEn}` : labelEn || prodNameEn;

        items.push({
          cartId,
          productSlug: p?.slug || "product",
          nameAr: nameAr || "منتج",
          nameEn: nameEn || "Product",
          priceJod: v.price_jod || p?.base_price_jod || 0,
          imageUrl: p?.image_url,
          iconImage: (p as unknown as { icon_image?: string })?.icon_image || p?.image_url,
          icon: p?.icon,
        });
      });

      // B. Products without variants
      (prods ?? []).forEach((p) => {
        if (!seenCartIds.has(p.slug)) {
          seenCartIds.add(p.slug);
          items.push({
            cartId: p.slug,
            productSlug: p.slug,
            nameAr: p.name_ar,
            nameEn: p.name_en,
            priceJod: p.base_price_jod || 0,
            imageUrl: p.image_url,
            iconImage: (p as unknown as { icon_image?: string })?.icon_image || p.image_url,
            icon: p.icon,
          });
        }
      });

      // C. Catalog fallback
      Object.values(PRODUCTS_CATALOG).forEach((p) => {
        const plans = p.plans || p.variants || [];
        if (plans.length > 0) {
          plans.forEach((v) => {
            const cId = v.id || `${p.slug}-${v.label}`;
            if (!seenCartIds.has(cId)) {
              seenCartIds.add(cId);
              items.push({
                cartId: cId,
                productSlug: p.slug,
                nameAr: `${p.nameAr || p.name} — ${v.label}`,
                nameEn: `${p.name} — ${v.label}`,
                priceJod: v.price || 0,
                imageUrl: v.imageUrl || p.imageUrl || p.iconImg,
                iconImage: p.iconImg || p.imageUrl,
                icon: p.icon,
              });
            }
          });
        } else if (!seenCartIds.has(p.slug)) {
          seenCartIds.add(p.slug);
          items.push({
            cartId: p.slug,
            productSlug: p.slug,
            nameAr: p.nameAr || p.name,
            nameEn: p.name,
            priceJod: 0,
            imageUrl: p.imageUrl || p.iconImg,
            iconImage: p.iconImg || p.imageUrl,
            icon: p.icon,
          });
        }
      });

      return items;
    },
  });

  // 2. Load stock limits from site_settings query
  const settingsQ = useQuery({
    queryKey: ["site-settings-stock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "product_stock_limits")
        .maybeSingle();
      if (error) throw error;
      return (data?.value as Record<string, number | null>) || {};
    },
  });

  useEffect(() => {
    if (settingsQ.data) {
      setLimits(settingsQ.data);
      setDirty(false);
    }
  }, [settingsQ.data]);

  // Helper setters
  const setItemLimit = (key: string, limit: number | null, productSlug?: string) => {
    setLimits((prev) => {
      const next = { ...prev };
      const keysToUpdate = new Set<string>([key]);
      if (productSlug) keysToUpdate.add(productSlug);

      // Handle aliases so parent product and variants stay perfectly in sync
      if (key.includes("youtube") || productSlug?.includes("youtube")) {
        keysToUpdate.add("youtube");
        keysToUpdate.add("youtube-premium");
        keysToUpdate.add("youtube-premium-1m");
      }
      if (key.includes("snap") || productSlug?.includes("snap")) {
        keysToUpdate.add("snapchat");
        keysToUpdate.add("snap");
        keysToUpdate.add("snap-3");
        keysToUpdate.add("snap-6");
        keysToUpdate.add("snap-12");
      }
      if (key.includes("discord") || productSlug?.includes("discord")) {
        keysToUpdate.add("discord");
        keysToUpdate.add("discord-nitro");
        keysToUpdate.add("discord-nitro-3m");
      }
      if (key.includes("canva") || productSlug?.includes("canva")) {
        keysToUpdate.add("canva");
        keysToUpdate.add("canva-pro-1y");
      }

      if (limit === null || isNaN(limit) || limit < 0) {
        keysToUpdate.forEach((k) => delete next[k]);
      } else {
        keysToUpdate.forEach((k) => {
          next[k] = limit;
        });
      }
      return next;
    });
    setDirty(true);
  };

  const removeItemLimit = (key: string, productSlug?: string) => {
    setItemLimit(key, null, productSlug);
  };

  // 3. Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("site_settings").upsert(
        {
          key: "product_stock_limits",
          value: limits as never,
        },
        { onConflict: "key" }
      );
      if (error) throw error;
      await supabase.rpc("log_admin_action", {
        _action: "settings.updated",
        _entity_type: "settings",
        _entity_id: undefined as unknown as string,
        _metadata: { keys: ["product_stock_limits"], count: Object.keys(limits).length },
      });
    },
    onSuccess: () => {
      toast.success("تم حفظ إعدادات المخزون والمقاعد بنجاح!");
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      qc.invalidateQueries({ queryKey: ["site-settings-stock"] });

      // Immediate local cache update so store reflects it immediately without reload
      try {
        const raw = localStorage.getItem("gx_site_settings_v2");
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.product_stock_limits = limits;
          localStorage.setItem("gx_site_settings_v2", JSON.stringify(parsed));
        }
        localStorage.removeItem("gx_site_settings_v2_ts");
      } catch { /* noop */ }

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("gx_site_settings_changed", {
            detail: { product_stock_limits: limits },
          })
        );
        window.dispatchEvent(new CustomEvent("gx:site-settings-updated"));
      }
    },
    onError: (e: Error) => {
      toast.error(e.message || "حدث خطأ أثناء الحفظ");
    },
  });

  // Filter items
  const allItems = catalogQ.data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allItems.filter((it) => {
      const limit = limits[it.cartId] ?? (it.productSlug ? limits[it.productSlug] : undefined);
      const isConfigured = limit !== undefined && limit !== null;
      const isSoldOut = isConfigured && limit <= 0;

      if (filterMode === "limited" && !isConfigured) return false;
      if (filterMode === "soldout" && !isSoldOut) return false;
      if (filterMode === "unlimited" && isConfigured) return false;

      if (!q) return true;
      return (
        it.nameAr.toLowerCase().includes(q) ||
        it.nameEn.toLowerCase().includes(q) ||
        it.cartId.toLowerCase().includes(q) ||
        it.productSlug.toLowerCase().includes(q)
      );
    });
  }, [allItems, limits, search, filterMode]);

  const configuredCount = Object.keys(limits).length;
  const soldOutCount = Object.values(limits).filter((v) => typeof v === "number" && v <= 0).length;

  return (
    <div className="space-y-4" dir="rtl">
      {/* Top Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("stock")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all cursor-pointer ${
            activeTab === "stock"
              ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Boxes size={17} />
          <span>المخزون والمقاعد</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300">
            {configuredCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("restock-requests")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all cursor-pointer ${
            activeTab === "restock-requests"
              ? "bg-purple-500/15 text-purple-400 border border-purple-500/30 shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Bell size={17} />
          <span>طلبات الإشعار بالتوفر والعملاء</span>
          {pendingRequestsCount > 0 ? (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
              {pendingRequestsCount} بانتظار التوفر
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {(restockQ.data || []).length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "stock" ? (
        <>
          {/* Top Header Card */}
      <Card className="border-cyan-500/30 bg-gradient-to-r from-cyan-950/20 via-slate-900/60 to-purple-950/20">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 grid place-items-center">
                <Boxes size={22} className="text-cyan-400" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <span>إدارة المخزون والمقاعد المتوفرة</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-semibold">
                    {configuredCount} منتج مقيّد
                  </span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  بشكل افتراضي (By Default)، كافة التطبيقات والاشتراكات كميتها مفتوحة (Unlimited). يمكنك من هنا تحديد عدد مقاعد معين، أو جعلها مفتوحة، أو وسمها بحالة "نفدت ☹️".
                </CardDescription>
              </div>
            </div>

            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!dirty || saveMutation.isPending}
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold h-10 px-5 shadow-lg shadow-cyan-500/20"
            >
              <Save size={16} className="ml-1.5" />
              {saveMutation.isPending ? "جاري الحفظ…" : dirty ? "حفظ التغييرات *" : "محفوظ"}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Quick Presets Bar */}
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-xs">
            <span className="font-bold text-foreground">اختصارات شائعة:</span>
            <button
              type="button"
              onClick={() => { setItemLimit("youtube-premium", 1); toast.info("تم تحديد يوتيوب بريميوم (مقعد 1) — اضغط حفظ للتأكيد"); }}
              className="px-2.5 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 font-medium cursor-pointer transition-colors"
            >
              + يوتيوب بريميوم (مقعد 1)
            </button>
            <button
              type="button"
              onClick={() => { setItemLimit("youtube-premium", 0); toast.info("تم تحديد يوتيوب بريميوم كـ نفدت (0 ☹️) — اضغط حفظ للتأكيد"); }}
              className="px-2.5 py-1 rounded bg-red-950/40 text-red-300 border border-red-500/30 hover:bg-red-900/40 font-medium cursor-pointer transition-colors"
            >
              + يوتيوب (نفدت 0 ☹️)
            </button>
            <button
              type="button"
              onClick={() => { setItemLimit("linkedin-career-12m", 1); toast.info("تم تحديد لينكدإن Career (مقعد 1) — اضغط حفظ للتأكيد"); }}
              className="px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 font-medium cursor-pointer transition-colors"
            >
              + لينكدإن Career 12M (مقعد 1)
            </button>
            <button
              type="button"
              onClick={() => { setItemLimit("linkedin-business-12m", 1); toast.info("تم تحديد لينكدإن Business (مقعد 1) — اضغط حفظ للتأكيد"); }}
              className="px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 font-medium cursor-pointer transition-colors"
            >
              + لينكدإن Business 12M (مقعد 1)
            </button>
          </div>

          {/* Custom Slug / Cart ID Box */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/70">
            <div>
              <Label className="text-xs mb-1.5 block font-semibold">إضافة حد مخصص (Slug أو Cart ID)</Label>
              <Input
                dir="ltr"
                placeholder="مثال: tod-4k-1m أو snap-3m"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value.trim().toLowerCase())}
                className="h-9 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block font-semibold">الكمية المتوفرة (ضع 0 لحالة نفدت ☹️)</Label>
              <Input
                type="number"
                min={0}
                value={newLimit}
                onChange={(e) => setNewLimit(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="h-9 text-xs"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                onClick={() => {
                  if (!newKey) {
                    toast.error("يرجى إدخال معرّف المنتج أو الباقة");
                    return;
                  }
                  setItemLimit(newKey, newLimit);
                  toast.success(`تم تحديد كمية (${newKey}) إلى ${newLimit}`);
                  setNewKey("");
                }}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-semibold h-9"
              >
                <Plus size={15} className="ml-1" /> إضافة / تحديث الحد
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border bg-muted/20">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: "all", label: `كل المنتجات (${allItems.length})` },
            { id: "limited", label: `المحدودة فقط (${configuredCount})` },
            { id: "soldout", label: `نفدت بالكامل ☹️ (${soldOutCount})` },
            { id: "unlimited", label: "الكمية المفتوحة" },
          ].map((tab) => {
            const active = filterMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id as never)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  active
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في المنتجات..."
            className="pr-8 h-9 text-xs"
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-xl border overflow-hidden bg-card/60">
        {catalogQ.isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">جاري تحميل قائمة المنتجات…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3">المنتج / الباقة</th>
                  <th className="p-3">المعرّف (Cart ID / Slug)</th>
                  <th className="p-3">المقاعد المتبقية</th>
                  <th className="p-3 text-center">الحالة الحالية</th>
                  <th className="p-3 text-center">التحكم السريع في المخزون</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      لا توجد نتائج مطابقة لبحثك.
                    </td>
                  </tr>
                ) : (
                  filtered.map((it) => {
                    // Check limit on cartId or on productSlug
                    const limitVal = getEffectiveStockLimit(limits, it.cartId, it.productSlug);
                    const isConfigured = limitVal !== undefined && limitVal !== null;
                    const numVal = isConfigured ? limitVal : "";

                    return (
                      <tr key={it.cartId} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {it.iconImage ? (
                              <img src={it.iconImage} alt="" className="w-6 h-6 rounded object-contain flex-shrink-0" />
                            ) : it.icon ? (
                              <span className="text-base">{it.icon}</span>
                            ) : null}
                            <span className="font-bold text-foreground text-xs">{it.nameAr}</span>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-muted-foreground text-[11px]" dir="ltr">
                          {it.cartId}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              min={0}
                              placeholder="مفتوح"
                              value={numVal}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "") {
                                  removeItemLimit(it.cartId, it.productSlug);
                                } else {
                                  setItemLimit(it.cartId, Math.max(0, parseInt(val, 10) || 0), it.productSlug);
                                }
                              }}
                              className={`w-20 h-7 text-xs ${isConfigured ? "border-cyan-500/50 bg-cyan-950/20 font-bold" : ""}`}
                            />
                            {isConfigured && (
                              <span className="text-[10px] text-muted-foreground">مقاعد</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          {!isConfigured ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold text-[11px] inline-flex items-center gap-1">
                              <span>✓ كمية مفتوحة</span>
                            </span>
                          ) : limitVal <= 0 ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold text-[11px] inline-flex items-center gap-1 border border-red-500/30">
                              <span>نفدت بالكامل</span>
                              <span>☹️</span>
                            </span>
                          ) : limitVal === 1 ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px] inline-flex items-center gap-1">
                              <span>متبقي مقعد 1</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-bold text-[11px] inline-flex items-center gap-1">
                              <span>{limitVal} متوفر</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setItemLimit(it.cartId, 0, it.productSlug)}
                              className="px-2 py-1 rounded text-[11px] bg-red-500/10 text-red-400 hover:bg-red-500/20 font-semibold transition"
                              title="تحديد الكمية 0 لتظهر بحالة نفدت ☹️"
                            >
                              نفدت (0)
                            </button>
                            <button
                              type="button"
                              onClick={() => setItemLimit(it.cartId, 1, it.productSlug)}
                              className="px-2 py-1 rounded text-[11px] bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 font-semibold transition"
                              title="تحديد الكمية 1 مقعد فقط"
                            >
                              مقعد (1)
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItemLimit(it.cartId, it.productSlug)}
                              className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                                !isConfigured
                                  ? "bg-muted text-muted-foreground opacity-60 cursor-default"
                                  : "bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 cursor-pointer"
                              }`}
                              title="إلغاء الحد وجعل الكمية مفتوحة"
                              disabled={!isConfigured}
                            >
                              كمية مفتوحة
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  ) : (
    /* Tab 2: Restock Requests Management */
    <div className="space-y-4">
      <Card className="border-purple-500/30 bg-gradient-to-r from-purple-950/20 via-slate-900/60 to-indigo-950/20">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 grid place-items-center">
                <Bell size={22} className="text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <span>طلبات الإشعار بالتوفر والعملاء المنتظرين</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 font-semibold">
                    {(restockQ.data || []).length} طلب مسجل
                  </span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  قائمة العملاء الذين سجلوا أسماءهم وإيميلاتهم لتلقي إشعار فور توفر المنتج. يمكنك إرسال إشعار فوري جميل عبر Resend إلى بريدهم بضغطة زر عند توفير المنتج!
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => restockQ.refetch()}
                className="text-xs border-purple-500/30 hover:bg-purple-500/10 cursor-pointer"
              >
                تحديث القائمة
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="relative">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="ابحث باسم العميل أو إيميله أو اسم المنتج..."
              value={requestSearch}
              onChange={(e) => setRequestSearch(e.target.value)}
              className="pr-9 h-9 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
        {restockQ.isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">جاري تحميل طلبات الإشعار...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            لا توجد طلبات إشعار مسجلة حالياً. عندما يطلب عميل إشعاراً لمنتج نافد سيظهر هنا فوراً.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30 text-muted-foreground font-semibold">
                  <th className="p-3">اسم العميل</th>
                  <th className="p-3">البريد الإلكتروني</th>
                  <th className="p-3">المنتج المطلوب</th>
                  <th className="p-3 text-center">تاريخ الطلب</th>
                  <th className="p-3 text-center">الحالة</th>
                  <th className="p-3 text-center">إجراءات الإشعار</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredRequests.map((req: any) => {
                  const isNotified = req.status === "notified";
                  const dateStr = req.created_at
                    ? new Date(req.created_at).toLocaleString("ar-JO", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "—";

                  return (
                    <tr key={req.id} className="hover:bg-muted/15 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2 font-bold text-foreground">
                          <User size={14} className="text-purple-400" />
                          <span>{req.customer_name}</span>
                        </div>
                      </td>

                      <td className="p-3 font-mono text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Mail size={13} className="text-cyan-400" />
                          <span className="select-all">{req.customer_email}</span>
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-semibold text-foreground">{req.product_name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          /product/{req.product_slug}
                        </div>
                      </td>

                      <td className="p-3 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-1 text-[11px]">
                          <Clock size={12} />
                          <span>{dateStr}</span>
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        {isNotified ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold text-[11px] inline-flex items-center gap-1 border border-emerald-500/30">
                            <span>✓ تم الإشعار</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-bold text-[11px] inline-flex items-center gap-1 border border-amber-500/30">
                            <span>بانتظار التوفر</span>
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            disabled={sendingId === req.id}
                            onClick={() => handleSendRestockEmail(req)}
                            className={`h-7 px-3 text-xs font-bold gap-1.5 cursor-pointer ${
                              isNotified
                                ? "bg-muted text-muted-foreground hover:bg-muted/80"
                                : "bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 shadow-sm shadow-purple-500/20"
                            }`}
                          >
                            <Send size={12} />
                            <span>
                              {sendingId === req.id
                                ? "جاري الإرسال..."
                                : isNotified
                                ? "إعادة الإرسال"
                                : "إرسال إشعار التوفر"}
                            </span>
                          </Button>

                          <button
                            type="button"
                            onClick={() => handleDeleteRequest(req.id)}
                            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                            title="حذف هذا الطلب"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )}
</div>
);
}
