import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Flame, ArrowUp, ArrowDown, Trash2, Plus, Search, Check, ShoppingBag, RefreshCw } from "lucide-react";
import { useSiteSettings } from "@/lib/gx/site-settings";
import { PRODUCTS_CATALOG, GIFT_CARDS_CATALOG, getFeaturedItems, findPlanByCartId } from "@/data/products";
import { INITIAL_REAL_GAMES } from "@/components/gx/BestSellingGamesSection";

type CatalogItem = {
  cartId: string;
  productSlug: string;
  nameAr: string;
  nameEn: string;
  priceJod: number;
  oldPriceJod?: number | null;
  imageUrl?: string | null;
  iconImage?: string | null;
  thumbBg?: string | null;
  icon?: string | null;
  badge?: string | null;
};

export function BestsellersManager() {
  const qc = useQueryClient();
  const siteSettings = useSiteSettings();
  const [search, setSearch] = useState("");
  const [order, setOrder] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);

  // 1. Fetch products & variants from Supabase and build complete platform catalog
  const catalogQ = useQuery({
    queryKey: ["admin-bestsellers-catalog"],
    queryFn: async () => {
      const { data: prods, error: pErr } = await supabase.from("products").select("*");
      if (pErr) throw pErr;
      const { data: vars, error: vErr } = await supabase.from("product_variants").select("*");
      if (vErr) throw vErr;

      const items: CatalogItem[] = [];

      // A. Add database variants
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
          oldPriceJod: (v as Record<string, any>).old_price_jod ? Number((v as Record<string, any>).old_price_jod) : null,
          imageUrl: p?.image_url || p?.icon_image_url,
          iconImage: p?.icon_image_url || p?.image_url,
          thumbBg: null,
          icon: p?.icon || "🎮",
          badge: v.tag_ar || p?.badge,
        });
      });

      // B. Add standalone products from database (like games or digital keys)
      (prods ?? []).forEach((p) => {
        if (!items.some((it) => it.cartId === p.slug)) {
          items.push({
            cartId: p.slug,
            productSlug: p.slug,
            nameAr: p.name_ar || p.slug,
            nameEn: p.name_en || p.slug,
            priceJod: Number(p.base_price_jod) || 0,
            oldPriceJod: (p as Record<string, any>).old_price_jod ? Number((p as Record<string, any>).old_price_jod) : null,
            imageUrl: p.image_url || p.icon_image_url,
            iconImage: p.icon_image_url || p.image_url,
            thumbBg: null,
            icon: p.icon || "🎮",
            badge: p.badge || null,
          });
        }
      });

      // C. Add all subscription plans from PRODUCTS_CATALOG
      for (const catKey in PRODUCTS_CATALOG) {
        const prod = PRODUCTS_CATALOG[catKey];
        const allPlans = [...(prod.plans || []), ...(prod.crewPlans || []), ...(prod.vbucksPlans || [])];
        for (const pl of allPlans) {
          if (!items.some((it) => it.cartId === pl.id)) {
            items.push({
              cartId: pl.id,
              productSlug: catKey,
              nameAr: `${prod.name} — ${pl.label}`,
              nameEn: `${prod.name} — ${pl.label}`,
              priceJod: pl.price,
              oldPriceJod: pl.oldPrice || null,
              imageUrl: pl.imageUrl || prod.imageUrl || prod.iconImg || null,
              iconImage: prod.iconImg || pl.imageUrl || prod.imageUrl || null,
              thumbBg: prod.thumbBg || null,
              icon: prod.icon || "🎮",
              badge: pl.tag || null,
            });
          }
        }
      }

      // D. Add gift card denominations from GIFT_CARDS_CATALOG
      for (const gKey in GIFT_CARDS_CATALOG) {
        const gCat = GIFT_CARDS_CATALOG[gKey];
        for (const reg of gCat.regions) {
          for (const den of reg.denominations) {
            if (!items.some((it) => it.cartId === den.id)) {
              items.push({
                cartId: den.id,
                productSlug: gKey,
                nameAr: `${gCat.name} (${reg.name}) — ${den.value}`,
                nameEn: `${gCat.name} (${reg.name}) — ${den.value}`,
                priceJod: den.price,
                oldPriceJod: null,
                imageUrl: gCat.iconImg || null,
                iconImage: gCat.iconImg || null,
                thumbBg: gCat.cardGradient || null,
                icon: "🎁",
              });
            }
          }
        }
      }

      // E. Add all games from INITIAL_REAL_GAMES
      INITIAL_REAL_GAMES.forEach((g) => {
        if (!items.some((it) => it.cartId === g.slug)) {
          items.push({
            cartId: g.slug,
            productSlug: g.slug,
            nameAr: g.name_ar,
            nameEn: g.name_en || g.name_ar,
            priceJod: g.base_price_jod,
            oldPriceJod: g.old_price_jod || null,
            imageUrl: g.image_url,
            iconImage: g.image_url,
            thumbBg: "linear-gradient(145deg,#10141f,#090c14)",
            icon: "🎮",
          });
        }
      });

      return items;
    },
  });

  // 2. Initialize order & labels from site_settings or defaults
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

  const catalogItems = catalogQ.data ?? [];
  const catalogMap = new Map(catalogItems.map((it) => [it.cartId, it]));

  function resolveItem(cartId: string): CatalogItem {
    // 1. Live database catalog has highest priority for fresh prices and details!
    const it = catalogMap.get(cartId);
    const prevSnap = (siteSettings.home_bestseller_items || []).find((s) => s.cartId === cartId);

    if (it && it.priceJod > 0) {
      return {
        ...it,
        nameAr: prevSnap?.nameAr || it.nameAr,
        nameEn: prevSnap?.nameEn || it.nameEn,
        badge: prevSnap?.badge || it.badge,
        imageUrl: it.imageUrl || prevSnap?.imageUrl || null,
        iconImage: it.iconImage || prevSnap?.iconImage || null,
      };
    }

    if (prevSnap && prevSnap.priceJod > 0 && prevSnap.nameAr) {
      return {
        cartId: prevSnap.cartId,
        productSlug: prevSnap.productSlug || "product",
        nameAr: prevSnap.nameAr,
        nameEn: prevSnap.nameEn || prevSnap.nameAr,
        priceJod: prevSnap.priceJod,
        oldPriceJod: prevSnap.oldPriceJod ?? null,
        imageUrl: prevSnap.imageUrl ?? null,
        iconImage: prevSnap.iconImage ?? prevSnap.imageUrl ?? null,
        icon: prevSnap.icon ?? "🎮",
        badge: prevSnap.badge ?? null,
        thumbBg: prevSnap.thumbBg ?? null,
      };
    }

    const plan = findPlanByCartId(cartId);
    if (plan) {
      return {
        cartId: plan.cartId,
        productSlug: plan.product,
        nameAr: plan.name,
        nameEn: plan.name,
        priceJod: plan.price,
        oldPriceJod: null,
        imageUrl: plan.imageUrl,
        iconImage: plan.iconImage || plan.imageUrl,
        thumbBg: plan.bg,
        icon: plan.icon,
      };
    }
    const game = INITIAL_REAL_GAMES.find((g) => g.slug === cartId);
    if (game) {
      return {
        cartId: game.slug,
        productSlug: game.slug,
        nameAr: game.name_ar,
        nameEn: game.name_en || game.name_ar,
        priceJod: game.base_price_jod,
        oldPriceJod: game.old_price_jod || null,
        imageUrl: game.image_url,
        iconImage: game.image_url,
        thumbBg: "linear-gradient(145deg,#10141f,#090c14)",
        icon: "🎮",
      };
    }
    if (it) return it;

    return {
      cartId,
      productSlug: "product",
      nameAr: cartId,
      nameEn: cartId,
      priceJod: 0,
    };
  }

  // Selected items in order
  const activeItems = order.map(resolveItem);

  // Save mutation
  const saveMut = useMutation({
    mutationFn: async () => {
      const itemsSnapshot = order.map((cartId) => {
        const it = resolveItem(cartId);
        return {
          cartId: it.cartId,
          productSlug: it.productSlug,
          nameAr: it.nameAr,
          nameEn: it.nameEn,
          priceJod: it.priceJod,
          oldPriceJod: it.oldPriceJod ?? null,
          imageUrl: it.imageUrl ?? null,
          iconImage: (it as any).iconImage ?? it.imageUrl ?? null,
          icon: it.icon ?? "🎮",
          badge: it.badge ?? null,
          thumbBg: (it as any).thumbBg ?? null,
        };
      });

      // 1. Save order
      const { error: errOrder } = await supabase.from("site_settings").upsert({
        key: "home_bestseller_order",
        value: order as never,
      }, { onConflict: "key" });
      if (errOrder) throw errOrder;

      // 2. Save full items snapshot for instant 0ms home page loading
      const { error: errItems } = await supabase.from("site_settings").upsert({
        key: "home_bestseller_items",
        value: itemsSnapshot as never,
      }, { onConflict: "key" });
      if (errItems) throw errItems;

      // 3. Atomically sync home_layout sec_bestsellers
      try {
        const { data: layoutRow } = await supabase.from("site_settings").select("value").eq("key", "home_layout").maybeSingle();
        if (layoutRow && layoutRow.value && Array.isArray((layoutRow.value as any).sections)) {
          const layoutObj = layoutRow.value as any;
          const bSec = layoutObj.sections.find((s: any) => s.type === "bestsellers");
          if (bSec) {
            bSec.data = { ...(bSec.data || {}), order };
            await supabase.from("site_settings").upsert({
              key: "home_layout",
              value: layoutObj as never,
            }, { onConflict: "key" });
          }
        }
      } catch { /* noop */ }

      // 4. Immediately update client-side cache and broadcast event
      try {
        const raw = localStorage.getItem("gx_site_settings_v2");
        const parsed = raw ? JSON.parse(raw) : {};
        parsed.home_bestseller_order = order;
        parsed.home_bestseller_items = itemsSnapshot;
        if (parsed.home_layout?.sections) {
          const bSec = parsed.home_layout.sections.find((s: any) => s.type === "bestsellers");
          if (bSec) bSec.data = { ...(bSec.data || {}), order };
        }
        localStorage.setItem("gx_site_settings_v2", JSON.stringify(parsed));
        localStorage.setItem("gx_site_settings_v2_ts", String(Date.now()));
        window.dispatchEvent(new CustomEvent("gx_site_settings_changed", { detail: parsed }));
      } catch { /* noop */ }
    },
    onSuccess: () => {
      toast.success("تم حفظ قائمة وترتيب الأكثر مبيعاً بنجاح! 🎉");
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      qc.invalidateQueries({ queryKey: ["home-layout"] });
      setDirty(false);
    },
    onError: (e: Error) => toast.error(e.message),
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
            onClick={() => saveMut.mutate()}
          >
            <Check size={14} />
            {saveMut.isPending ? "جاري الحفظ..." : dirty ? "حفظ الترتيب ✓" : "محفوظ"}
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
            <span className="text-xs text-cyan-100/50">استخدم الأسهم لترتيب ظهور المنتجات في الصفحة الرئيسية</span>
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
