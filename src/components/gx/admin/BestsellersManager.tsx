import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Flame, ArrowUp, ArrowDown, Trash2, Plus, Search, Check, ShoppingBag, RefreshCw } from "lucide-react";
import { useSiteSettings } from "@/lib/gx/site-settings";
import { PRODUCTS_CATALOG, getFeaturedItems } from "@/data/products";

type CatalogItem = {
  cartId: string;
  productSlug: string;
  nameAr: string;
  nameEn: string;
  priceJod: number;
  oldPriceJod?: number | null;
  imageUrl?: string | null;
  icon?: string | null;
  badge?: string | null;
};

export function BestsellersManager() {
  const qc = useQueryClient();
  const siteSettings = useSiteSettings();
  const [search, setSearch] = useState("");
  const [order, setOrder] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);

  // 1. Fetch products & variants from Supabase
  const catalogQ = useQuery({
    queryKey: ["admin-bestsellers-catalog"],
    queryFn: async () => {
      const { data: prods, error: pErr } = await supabase.from("products").select("*");
      if (pErr) throw pErr;
      const { data: vars, error: vErr } = await supabase.from("product_variants").select("*");
      if (vErr) throw vErr;

      const items: CatalogItem[] = [];

      // Add database variants
      (vars ?? []).forEach((v) => {
        const p = (prods ?? []).find((pr) => pr.id === v.product_id);
        const cartId = v.cart_id || v.id;
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
          priceJod: Number(v.price_jod) || 0,
          oldPriceJod: v.old_price_jod ? Number(v.old_price_jod) : null,
          imageUrl: p?.image_url || p?.icon_image_url,
          icon: p?.icon || "🎮",
          badge: v.tag_ar || p?.badge,
        });
      });

      // Add fallback static items from data/products.ts if not present
      const staticFeatured = getFeaturedItems();
      staticFeatured.forEach((f) => {
        if (!items.some((it) => it.cartId === f.cartId)) {
          const p = PRODUCTS_CATALOG[f.product];
          items.push({
            cartId: f.cartId,
            productSlug: f.product,
            nameAr: f.name,
            nameEn: f.name,
            priceJod: f.price,
            oldPriceJod: f.oldPrice,
            imageUrl: p?.iconImg,
            icon: p?.icon || "🎮",
          });
        }
      });

      return items;
    },
  });

  // 2. Initialize order from site_settings or default featured items
  useEffect(() => {
    const raw = siteSettings.home_bestseller_order;
    const sanitized: string[] = Array.isArray(raw)
      ? raw
          .map((x) => {
            if (typeof x === "string") return x;
            if (x && typeof x === "object") {
              const obj = x as Record<string, unknown>;
              if (typeof obj.cartId === "string") return obj.cartId;
              if (typeof obj.id === "string") return obj.id;
            }
            return "";
          })
          .filter(Boolean)
      : [];

    if (sanitized.length > 0) {
      setOrder(sanitized);
    } else {
      const defaults = getFeaturedItems().map((f) => f.cartId);
      setOrder(defaults);
    }
    setDirty(false);
  }, [siteSettings.home_bestseller_order]);

  // Save mutation
  const saveMut = useMutation({
    mutationFn: async (newOrder: string[]) => {
      const { error } = await supabase.from("site_settings").upsert({
        key: "home_bestseller_order",
        value: newOrder as never,
      }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حفظ قائمة وترتيب المنتجات الأكثر مبيعاً بنجاح! 🎉");
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      qc.invalidateQueries({ queryKey: ["home-layout"] });
      setDirty(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const catalogItems = catalogQ.data ?? [];
  const catalogMap = new Map(catalogItems.map((it) => [it.cartId, it]));

  // Selected items in order
  const activeItems = order.map((cartId) => catalogMap.get(cartId) || {
    cartId,
    productSlug: "product",
    nameAr: cartId,
    nameEn: cartId,
    priceJod: 0,
  });

  function move(index: number, dir: -1 | 1) {
    const nextIndex = index + dir;
    if (nextIndex < 0 || nextIndex >= order.length) return;
    const next = [...order];
    const temp = next[index];
    next[index] = next[nextIndex];
    next[nextIndex] = temp;
    setOrder(next);
    setDirty(true);
  }

  function removeItem(cartId: string) {
    setOrder(order.filter((id) => id !== cartId));
    setDirty(true);
  }

  function addItem(cartId: string) {
    if (order.includes(cartId)) {
      toast.info("المنتج موجود بالفعل في قائمة الأكثر مبيعاً");
      return;
    }
    setOrder([...order, cartId]);
    setDirty(true);
  }

  function resetToDefault() {
    const defaults = getFeaturedItems().map((f) => f.cartId);
    setOrder(defaults);
    setDirty(true);
  }

  // Unselected items for adding
  const availableToAdd = catalogItems.filter((it) => !order.includes(it.cartId)).filter((it) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return it.nameAr.toLowerCase().includes(q) || it.nameEn.toLowerCase().includes(q) || it.cartId.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header card */}
      <div className="flex items-center justify-between flex-wrap gap-3 p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 to-cyan-900/20 border border-cyan-500/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-400/10 border border-cyan-400/30 grid place-items-center">
            <Flame size={20} className="text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-cyan-100">إدارة المنتجات الأكثر مبيعاً (الصفحة الرئيسية)</h2>
            <p className="text-xs text-cyan-100/60">حدد المنتجات المعروضة في قسم الأكثر مبيعاً ورتّب أسبقيتها بسهولة</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="px-3 py-2 rounded-xl text-xs font-bold border border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/10 flex items-center gap-1.5"
            onClick={resetToDefault}
          >
            <RefreshCw size={13} /> استعادة الافتراضي
          </button>
          <button
            type="button"
            className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              dirty
                ? "bg-cyan-400 text-black shadow-lg shadow-cyan-400/20 hover:bg-cyan-300"
                : "bg-cyan-950/40 text-cyan-400/50 border border-cyan-400/20"
            }`}
            disabled={!dirty || saveMut.isPending}
            onClick={() => saveMut.mutate(order)}
          >
            <Check size={14} />
            {saveMut.isPending ? "جاري الحفظ..." : dirty ? "حفظ الترتيب والمنتجات ✓" : "محفوظ"}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left / Top: Active ordered bestsellers list */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-cyan-200 flex items-center gap-1.5">
              <Flame size={15} className="text-amber-400" /> القائمة المعتمدة حالياً ({order.length} منتج)
            </h3>
            <span className="text-xs text-cyan-100/50">استخدم الأسهم للترتيب</span>
          </div>

          {activeItems.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-cyan-400/20 rounded-2xl text-cyan-100/50 text-sm">
              لم تقم بإضافة أي منتج إلى الأكثر مبيعاً بعد. اختر من القائمة المجاورة.
            </div>
          ) : (
            <div className="space-y-2">
              {activeItems.map((it, idx) => (
                <div
                  key={it.cartId}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-black/40 border border-cyan-400/20 hover:border-cyan-400/40 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-cyan-400/10 text-cyan-300 text-xs font-mono font-bold grid place-items-center flex-shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="w-10 h-10 rounded-lg bg-black/50 border border-white/10 flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {it.imageUrl ? (
                        <img src={it.imageUrl} alt="" className="w-full h-full object-contain p-1" />
                      ) : (
                        <span className="text-lg">{it.icon || "🎮"}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-cyan-100 truncate">{it.nameAr}</div>
                      <div className="text-[11px] text-cyan-100/60 font-mono mt-0.5">
                        {it.priceJod > 0 ? `${it.priceJod.toFixed(2)} د.أ` : "—"}
                        <span className="mr-2 text-cyan-400/70">#{it.cartId}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => move(idx, -1)}
                      className="p-1.5 rounded-lg border border-white/10 text-cyan-300 hover:bg-cyan-400/10 disabled:opacity-30"
                      title="للأعلى"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === order.length - 1}
                      onClick={() => move(idx, 1)}
                      className="p-1.5 rounded-lg border border-white/10 text-cyan-300 hover:bg-cyan-400/10 disabled:opacity-30"
                      title="للأسفل"
                    >
                      <ArrowDown size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(it.cartId)}
                      className="p-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 mr-1"
                      title="إزالة من الأكثر مبيعاً"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right / Bottom: Available products to add */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-sm font-bold text-cyan-200 flex items-center gap-1.5">
            <ShoppingBag size={15} className="text-cyan-400" /> إضافة منتج إلى الأكثر مبيعاً
          </h3>

          <div className="relative">
            <Search size={14} className="absolute right-3 top-3 text-cyan-100/40" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن منتج أو خيار..."
              className="pr-9 text-xs bg-black/40 border-cyan-400/20 text-cyan-100 placeholder:text-cyan-100/40"
            />
          </div>

          <div className="max-h-[440px] overflow-y-auto space-y-2 pr-1">
            {availableToAdd.length === 0 ? (
              <div className="text-center py-8 text-xs text-cyan-100/50 border border-dashed border-cyan-400/15 rounded-xl">
                {search.trim() ? "لا توجد نتائج تطابق بحثك" : "جميع المنتجات مضافة بالفعل إلى الأكثر مبيعاً"}
              </div>
            ) : (
              availableToAdd.map((it) => (
                <div
                  key={it.cartId}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-black/20 border border-white/10 hover:border-cyan-400/30 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/10 flex-shrink-0 overflow-hidden flex items-center justify-center text-sm">
                      {it.imageUrl ? <img src={it.imageUrl} alt="" className="w-full h-full object-contain p-0.5" /> : (it.icon || "🎮")}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-cyan-100 truncate">{it.nameAr}</div>
                      <div className="text-[10px] text-cyan-100/50 font-mono">{it.priceJod > 0 ? `${it.priceJod.toFixed(2)} د.أ` : "—"}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => addItem(it.cartId)}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-400/15 text-cyan-200 border border-cyan-400/30 hover:bg-cyan-400/30 flex items-center gap-1 flex-shrink-0"
                  >
                    <Plus size={12} /> إضافة
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
