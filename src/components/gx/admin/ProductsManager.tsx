/* ============================================================
   GX STORE — MODERN PRODUCTS & CATALOG MANAGER (ADMIN)
   Ultra-clean, intuitive, and synchronized product management.
   Single source of truth: Supabase database (`products` & `product_variants`).
   ============================================================ */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ShoppingBag,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Star,
  Search,
  Layers,
  ExternalLink,
  ChevronLeft,
  DollarSign,
  Copy,
  Check,
  Sparkles,
  Upload,
  Globe,
  Tag,
  ArrowUpDown,
  X,
  RotateCcw,
} from "lucide-react";
import { purgeCatalogCacheFn } from "@/lib/gx/catalog.functions";
import { loadDbVariants, clearDbVariantsCache } from "@/lib/gx/db-variants";
import { PRODUCTS_CATALOG } from "@/data/products";
import { PRODUCTS_EN } from "@/lib/gx/product-locale";

type Category = { id: string; name_ar: string; name_en: string; slug: string };

type Product = {
  id: string;
  category_id: string | null;
  slug: string;
  sku: string | null;
  name_ar: string;
  name_en: string;
  tagline_ar: string | null;
  tagline_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  image_url: string | null;
  base_price_jod: number | null;
  badge: string | null;
  purchases_count: number;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
  page_template: "standard" | "multi_account" | "dual_plans" | "gift_card";
  icon: string | null;
  icon_image_url: string | null;
  thumb_bg: string | null;
  accent_color: string | null;
  card_gradient: string | null;
  delivery_type: "code" | "account" | "topup" | "manual";
  region: string | null;
  requires_player_id: boolean;
  identifier_label_ar: string | null;
  identifier_label_en: string | null;
  identifier_placeholder: string | null;
  delivery_method_ar: string | null;
  delivery_method_en: string | null;
  delivery_instructions_ar: string | null;
  delivery_instructions_en: string | null;
};

type Variant = {
  id: string;
  product_id: string;
  label_ar: string;
  label_en: string;
  price_jod: number;
  old_price_jod: number | null;
  face_value: number | null;
  face_currency: string | null;
  tag_ar: string | null;
  tag_en: string | null;
  plan_group: string | null;
  region: string | null;
  cart_id: string | null;
  delivery_type: "code" | "account" | "topup" | "manual" | null;
  is_active: boolean;
  sort_order: number;
};

const TEMPLATES = [
  { id: "standard", name: "صفحة قياسية (Standard)", desc: "مناسب لمعظم المنتجات (ألعاب، برامج، اشتراكات رقمية، ويندوز، أدوبي)" },
  { id: "dual_plans", name: "باقات متعددة (Dual Plans)", desc: "مثل فورتنايت (Crew + V-Bucks)" },
  { id: "multi_account", name: "عداد حسابات (Multi Account)", desc: "مثل سناب شات بلس مع إدخال يوزرات متعددة" },
  { id: "gift_card", name: "بطاقات شحن وهدايا (Gift Card)", desc: "اختيار الدولة والفئات والعملة" },
] as const;

const DELIVERY_TYPES = [
  { id: "code", label: "كود رقمي فوري (Digital Code)", icon: "⚡", desc: "استلام كود ومفتاح التفعيل الرقمي فوراً في الموقع" },
  { id: "account", label: "تفعيل حساب خاص (Account Activation)", icon: "👤", desc: "استلام بيانات الدخول للحساب والتفعيل المباشر" },
  { id: "topup", label: "شحن مباشر برقم اللاعب (Direct Top-up)", icon: "🎯", desc: "شحن رصيد الحساب مباشرة عبر الآيدي أو المعرف" },
  { id: "manual", label: "تسليم يدوي وتواصل (Manual Support)", icon: "💬", desc: "تسليم وتفعيل بالتنسيق المباشر مع الدعم الفني" },
] as const;

type FeatureItem = {
  id?: string;
  icon?: string;
  title_ar: string;
  title_en?: string;
  desc_ar?: string;
  desc_en?: string;
};

const DEFAULT_FEATURES: FeatureItem[] = [
  {
    icon: "★",
    title_ar: "وصول غير محدود وسريع",
    title_en: "Unlimited Fast Access",
    desc_ar: "استفادة كاملة بدون انقطاع طوال فترة الاشتراك.",
    desc_en: "Full access without interruption.",
  },
  {
    icon: "★",
    title_ar: "ضمان رسمي كامل 100%",
    title_en: "100% Official Warranty",
    desc_ar: "ضمان حقيقي يشمل الدعم الفني والاستبدال.",
    desc_en: "Comprehensive warranty with continuous support.",
  },
  {
    icon: "★",
    title_ar: "تسليم فوري ومباشر",
    title_en: "Instant Automated Delivery",
    desc_ar: "استلام بيانات التفعيل فور إتمام عملية الدفع.",
    desc_en: "Receive credentials immediately upon checkout.",
  },
  {
    icon: "★",
    title_ar: "تكامل مع مختلف الأجهزة",
    title_en: "Multi-Platform Compatibility",
    desc_ar: "يعمل على الهاتف، الحاسوب، واللوحي بسلاسة.",
    desc_en: "Works seamlessly across mobile, desktop, and web.",
  },
];

const DEFAULT_STEPS_BY_TYPE: Record<string, string[]> = {
  code: [
    "استلم كود التفعيل الرقمي فوراً في صفحة تأكيد الطلب وحسابك في الموقع.",
    "توجه إلى إعدادات النظام أو الموقع الرسمي وأدخل الكود في خانة التفعيل (Change product key).",
    "اضغط تفعيل (Activate) ليتم التحقق من الكود وتأكيد التفعيل الأصلي.",
  ],
  account: [
    "استلم بيانات الحساب (الإيميل وكلمة المرور) فور إتمام عملية الشراء.",
    "سجل الدخول عبر التطبيق أو الموقع الرسمي للمنصة.",
    "قم بتحديث كلمة المرور لبياناتك الخاصة واستمتع باشتراكك.",
  ],
  topup: [
    "أدخل معرّف أو بيانات حسابك أثناء الطلب لتوجيه الشحن بدقة.",
    "يقوم فريق العمل بتنفيذ الشحن لحسابك مباشرة خلال ثوانٍ معدودة.",
    "افتح اللعبة أو التطبيق وستجد الرصيد قد تمت إضافته بنجاح.",
  ],
  manual: [
    "بعد إتمام الدفع، ستصلك رسالة فورية عبر الواتساب لتأكيد الطلب.",
    "يقوم فريق الدعم الفني بتسليمك وتفعيل المنتج معك خطوة بخطوة.",
  ],
};

const DEFAULT_IMPORTANT_NOTES: string[] = [
  "يرجى التأكد من تطابق المنطقة (Region) ونوع الحساب المطلوب قبل إتمام عملية الدفع.",
  "المنتج رقمي ورسمي 100% ويتم تسليمه فوراً وبشكل تلقائي بعد الدفع مباشرة.",
  "ضمان ذهبي كامل وشامل طوال فترة الاشتراك مع دعم فني متواصل 24/7.",
];

const THUMB_PRESETS = [
  "linear-gradient(145deg,#12151e,#0b0d14)",
  "linear-gradient(145deg,#2a0d30,#150818)",
  "linear-gradient(145deg,#0d1a30,#080d18)",
  "linear-gradient(145deg,#3a3a10,#14150c)",
  "linear-gradient(145deg,#2a1a4a,#0e0820)",
  "linear-gradient(145deg,#10141f,#090c14)",
];

const css = `
.gx-pm { color: #e6f7ff; }
.gx-card { background: linear-gradient(180deg, rgba(16,24,32,0.85), rgba(10,15,22,0.92)); border: 1px solid rgba(0,229,255,0.14); border-radius: 18px; }
.gx-card:hover { border-color: rgba(0,229,255,0.3); }
.gx-stat-box { display: flex; align-items: center; gap: 12px; padding: 14px 18px; border-radius: 16px; background: rgba(0,0,0,0.35); border: 1px solid rgba(0,229,255,0.12); }
.gx-stat-box b { font-size: 20px; color: #00e5ff; font-family: ui-monospace, monospace; }
.gx-stat-box span { font-size: 12px; color: #7d92a8; }
.gx-input { background: rgba(0,0,0,0.4) !important; border: 1px solid rgba(0,229,255,0.2) !important; color: #e6f7ff !important; border-radius: 12px !important; height: 42px; }
.gx-input:focus-visible { outline: none; border-color: #00e5ff !important; box-shadow: 0 0 0 3px rgba(0,229,255,0.18) !important; }
.gx-btn-primary { background: linear-gradient(135deg, #00e5ff, #0091ff); color: #001018; font-weight: 700; border-radius: 12px; padding: 8px 16px; border: none; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px; font-size: 13px; }
.gx-btn-primary:hover { box-shadow: 0 4px 16px rgba(0,229,255,0.4); transform: translateY(-1px); }
.gx-btn-outline { background: rgba(0,229,255,0.06); border: 1px solid rgba(0,229,255,0.25); color: #00e5ff; font-weight: 600; border-radius: 12px; padding: 8px 14px; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; }
.gx-btn-outline:hover { background: rgba(0,229,255,0.14); border-color: #00e5ff; }
.gx-btn-danger { background: rgba(255,80,80,0.08); border: 1px solid rgba(255,80,80,0.3); color: #ff8080; font-weight: 600; border-radius: 10px; padding: 6px 10px; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 4px; font-size: 12px; }
.gx-btn-danger:hover { background: rgba(255,80,80,0.18); border-color: #ff5050; }
.gx-tab-btn { padding: 9px 18px; border-radius: 12px; font-size: 13px; font-weight: 700; border: 1px solid transparent; color: #7d92a8; background: transparent; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: all 0.18s; }
.gx-tab-btn.active { background: rgba(0,229,255,0.14); border-color: rgba(0,229,255,0.4); color: #00e5ff; }
.gx-tag { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; background: rgba(0,229,255,0.12); color: #8fe9ff; border: 1px solid rgba(0,229,255,0.25); }
.gx-price-badge { font-family: ui-monospace, monospace; font-weight: 800; color: #00e5ff; font-size: 15px; }
.gx-editor-poster {
  position: relative;
  width: 100%;
  aspect-ratio: 3/4;
  max-width: 320px;
  margin: 0 auto;
  border-radius: 22px;
  overflow: hidden;
  box-shadow: 0 16px 40px rgba(0,0,0,0.6), 0 0 30px rgba(0,229,255,0.12);
  border: 1px solid rgba(0,229,255,0.25);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 16px;
  transition: all 0.3s ease;
}
.gx-editor-var-card {
  background: rgba(14,20,30,0.7);
  border: 1px solid rgba(0,229,255,0.18);
  border-radius: 14px;
  padding: 12px 14px;
  transition: all 0.2s;
  cursor: pointer;
  position: relative;
}
.gx-editor-var-card:hover, .gx-editor-var-card.is-selected {
  border-color: #00e5ff;
  background: rgba(0,229,255,0.08);
  box-shadow: 0 4px 16px rgba(0,229,255,0.18);
}
.gx-editor-pill {
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(10,16,24,0.6);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 10px;
}
.gx-editor-pill:hover {
  border-color: rgba(0,229,255,0.4);
  background: rgba(0,229,255,0.06);
}
.gx-editor-pill.is-active {
  border-color: #00e5ff;
  background: rgba(0,229,255,0.15);
  box-shadow: 0 0 14px rgba(0,229,255,0.25);
}
.gx-gradient-swatch {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 2px solid rgba(255,255,255,0.2);
  cursor: pointer;
  transition: transform 0.15s, border-color 0.15s;
}
.gx-gradient-swatch:hover, .gx-gradient-swatch.active {
  transform: scale(1.15);
  border-color: #00e5ff;
  box-shadow: 0 0 10px rgba(0,229,255,0.4);
}
.gx-feature-card {
  background: rgba(18, 24, 38, 0.7);
  border: 1px solid rgba(0, 229, 255, 0.14);
  border-radius: 14px;
  padding: 12px 14px;
  transition: all 0.2s;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.gx-feature-card:hover {
  border-color: rgba(0, 229, 255, 0.35);
  background: rgba(18, 24, 38, 0.9);
}
.gx-step-row {
  background: rgba(18, 24, 38, 0.7);
  border: 1px solid rgba(0, 229, 255, 0.14);
  border-radius: 14px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.2s;
}
.gx-step-row:hover {
  border-color: rgba(0, 229, 255, 0.35);
}
.gx-step-num-badge {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(0, 229, 255, 0.18);
  color: #00e5ff;
  font-weight: 800;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid rgba(0, 229, 255, 0.35);
}
`;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type Props = {
  categoryId?: string;
  categoryName?: string;
  onBack?: () => void;
};

export function CategoryProducts({ categoryId = "all", categoryName = "كل المنتجات", onBack }: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>(categoryId);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "hidden" | "featured">("all");
  const [sortBy, setSortBy] = useState<"sort" | "name" | "price" | "newest">("sort");

  // Modals state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [quickPriceProduct, setQuickPriceProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // 1. Fetch Categories
  const catsQ = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name_ar, name_en, slug").order("sort_order");
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });

  // 2. Fetch Products
  const prodsQ = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });

  // 3. Fetch All Variants count/prices for overview
  const variantsQ = useQuery({
    queryKey: ["admin-all-variants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_variants").select("id, product_id, price_jod, is_active, cart_id");
      if (error) throw error;
      return (data ?? []) as { id: string; product_id: string; price_jod: number; is_active: boolean; cart_id: string | null }[];
    },
  });

  const categories = catsQ.data ?? [];
  const products = prodsQ.data ?? [];
  const allVariants = variantsQ.data ?? [];

  // Helper to map variant info per product
  const variantMap = useMemo(() => {
    const map = new Map<string, { count: number; minPrice: number; maxPrice: number }>();
    for (const v of allVariants) {
      if (!v.is_active) continue;
      const cur = map.get(v.product_id) || { count: 0, minPrice: Infinity, maxPrice: -Infinity };
      const p = Number(v.price_jod) || 0;
      cur.count += 1;
      if (p < cur.minPrice) cur.minPrice = p;
      if (p > cur.maxPrice) cur.maxPrice = p;
      map.set(v.product_id, cur);
    }
    return map;
  }, [allVariants]);

  // Filtering & Sorting
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const isAllCats = categoryFilter === "all";

    return products
      .filter((p) => {
        if (!isAllCats && p.category_id !== categoryFilter) return false;
        if (statusFilter === "active" && !p.is_active) return false;
        if (statusFilter === "hidden" && p.is_active) return false;
        if (statusFilter === "featured" && !p.is_featured) return false;

        if (q) {
          const matchAr = p.name_ar.toLowerCase().includes(q);
          const matchEn = p.name_en.toLowerCase().includes(q);
          const matchSlug = p.slug.toLowerCase().includes(q);
          const matchSku = (p.sku || "").toLowerCase().includes(q);
          return matchAr || matchEn || matchSlug || matchSku;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.name_ar.localeCompare(b.name_ar, "ar");
        if (sortBy === "price") return (Number(b.base_price_jod) || 0) - (Number(a.base_price_jod) || 0);
        if (sortBy === "newest") return new Date(b.sort_order).getTime() - new Date(a.sort_order).getTime();
        return a.sort_order - b.sort_order;
      });
  }, [products, search, categoryFilter, statusFilter, sortBy]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: products.length,
      active: products.filter((p) => p.is_active).length,
      hidden: products.filter((p) => !p.is_active).length,
      featured: products.filter((p) => p.is_featured).length,
    };
  }, [products]);

  // Quick Toggle Active Mutation
  const toggleActiveMut = useMutation({
    mutationFn: async ({ id, is_active, slug }: { id: string; is_active: boolean; slug: string }) => {
      const { error } = await supabase.from("products").update({ is_active }).eq("id", id);
      if (error) throw error;
      await purgeCatalogCacheFn({ data: { slug } });
      await loadDbVariants(true);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success(vars.is_active ? "تم تفعيل المنتج وظهوره بالمتجر" : "تم إخفاء المنتج من المتجر");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Quick Toggle Featured Mutation
  const toggleFeaturedMut = useMutation({
    mutationFn: async ({ id, is_featured, slug }: { id: string; is_featured: boolean; slug: string }) => {
      const { error } = await supabase.from("products").update({ is_featured }).eq("id", id);
      if (error) throw error;
      await purgeCatalogCacheFn({ data: { slug } });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success(vars.is_featured ? "تم تمييز المنتج في الواجهة" : "تمت إزالة التمييز");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Delete Mutation
  const deleteMut = useMutation({
    mutationFn: async ({ id, slug }: { id: string; slug: string }) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      await purgeCatalogCacheFn({ data: { slug } });
      await loadDbVariants(true);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["admin-all-variants"] });
      toast.success("تم حذف المنتج بنجاح");
      setDeletingProduct(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="gx-pm space-y-5" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button type="button" onClick={onBack} className="gx-btn-outline">
              <ChevronLeft size={16} /> العودة للأقسام
            </button>
          )}
          <div>
            <h2 className="text-xl font-bold text-cyan-100 flex items-center gap-2">
              <ShoppingBag size={20} className="text-cyan-400" />
              {categoryName}
            </h2>
            <p className="text-xs text-cyan-100/60 mt-0.5">
              إدارة المنتجات، الأسعار، الباقات، الصور والتسليم والربط المباشر مع المتجر
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.open("/admin/product-editor?new=true", "_blank")}
          className="gx-btn-primary"
        >
          <Plus size={16} /> إضافة منتج جديد
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="gx-stat-box">
          <ShoppingBag size={22} className="text-cyan-400" />
          <div>
            <b>{stats.total}</b>
            <span>إجمالي المنتجات</span>
          </div>
        </div>
        <div className="gx-stat-box">
          <Eye size={22} className="text-emerald-400" />
          <div>
            <b className="text-emerald-400">{stats.active}</b>
            <span>منتج نشط ظاهر</span>
          </div>
        </div>
        <div className="gx-stat-box">
          <EyeOff size={22} className="text-amber-400" />
          <div>
            <b className="text-amber-400">{stats.hidden}</b>
            <span>منتج مخفي</span>
          </div>
        </div>
        <div className="gx-stat-box">
          <Star size={22} className="text-yellow-400" />
          <div>
            <b className="text-yellow-400">{stats.featured}</b>
            <span>منتج مميّز</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="gx-card p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-cyan-400/60" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم العربي، الإنجليزي، أو المعرّف (slug)..."
              className="gx-input pr-10 pl-9 w-full text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400/60 hover:text-cyan-200"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Dropdown Filter */}
          <div className="w-full md:w-56">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="gx-input">
                <SelectValue placeholder="اختر القسم" />
              </SelectTrigger>
              <SelectContent dir="rtl" className="bg-[#0b1017] border-cyan-400/20 text-cyan-100">
                <SelectItem value="all">كل الأقسام ({products.length})</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name_ar}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort By */}
          <div className="w-full md:w-44">
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="gx-input">
                <div className="flex items-center gap-1.5 text-xs">
                  <ArrowUpDown size={14} className="text-cyan-400" />
                  <SelectValue placeholder="الترتيب" />
                </div>
              </SelectTrigger>
              <SelectContent dir="rtl" className="bg-[#0b1017] border-cyan-400/20 text-cyan-100">
                <SelectItem value="sort">الترتيب الافتراضي</SelectItem>
                <SelectItem value="name">الاسم أبجدياً</SelectItem>
                <SelectItem value="price">السعر (الأعلى أولاً)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-white/5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`gx-tab-btn ${statusFilter === "all" ? "active" : ""}`}
            >
              الكل ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`gx-tab-btn ${statusFilter === "active" ? "active" : ""}`}
            >
              النشطة ({stats.active})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("hidden")}
              className={`gx-tab-btn ${statusFilter === "hidden" ? "active" : ""}`}
            >
              المخفية ({stats.hidden})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("featured")}
              className={`gx-tab-btn ${statusFilter === "featured" ? "active" : ""}`}
            >
              المميزة ({stats.featured})
            </button>
          </div>

          <div className="text-xs text-cyan-100/50">
            عرض {filteredProducts.length} من أصل {products.length} منتج
          </div>
        </div>
      </div>

      {/* Products List */}
      {prodsQ.isLoading ? (
        <div className="text-center py-16 text-cyan-100/60 gx-card">
          <div className="inline-block animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full mb-3" />
          <div>جاري تحميل المنتجات من قاعدة البيانات...</div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16 text-cyan-100/60 gx-card border-dashed border-cyan-400/20">
          <ShoppingBag size={40} className="mx-auto text-cyan-400/40 mb-3" />
          <div className="text-base font-bold text-cyan-200">لا توجد منتجات تطابق البحث</div>
          <p className="text-xs text-cyan-100/50 mt-1">جرّب تغيير كلمات البحث أو الفلتر، أو أضف منتجاً جديداً</p>
          <button type="button" onClick={() => setIsCreating(true)} className="gx-btn-primary mt-4">
            <Plus size={15} /> إضافة منتج جديد
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((p) => {
            const vInfo = variantMap.get(p.id);
            const hasVariants = vInfo && vInfo.count > 0;
            const category = categories.find((c) => c.id === p.category_id);

            // Display price logic
            let priceLabel = "";
            if (hasVariants) {
              if (vInfo.minPrice === vInfo.maxPrice) {
                priceLabel = `${vInfo.minPrice.toFixed(2)} د.أ`;
              } else {
                priceLabel = `${vInfo.minPrice.toFixed(2)} - ${vInfo.maxPrice.toFixed(2)} د.أ`;
              }
            } else if (p.base_price_jod != null) {
              priceLabel = `${Number(p.base_price_jod).toFixed(2)} د.أ`;
            } else {
              priceLabel = "—";
            }

            return (
              <div
                key={p.id}
                className={`gx-card p-4 flex flex-col justify-between transition-all ${
                  !p.is_active ? "opacity-60 bg-black/40" : ""
                }`}
              >
                <div>
                  {/* Top Row: Thumbnail + Names + Status */}
                  <div className="flex items-start gap-3">
                    {/* Thumbnail */}
                    <div
                      className="w-16 h-16 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden border border-cyan-400/20 bg-black/40 relative group"
                      style={{ background: p.thumb_bg || undefined }}
                    >
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name_ar}
                          className="w-full h-full object-cover transition-transform group-hover:scale-110"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : p.icon_image_url ? (
                        <img src={p.icon_image_url} alt="" className="w-9 h-9 object-contain" />
                      ) : (
                        <span className="text-2xl">{p.icon || "🎮"}</span>
                      )}
                    </div>

                    {/* Titles */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-cyan-100 text-sm truncate">{p.name_ar}</span>
                        {p.badge && <span className="gx-tag text-[10px] py-0 px-1.5">{p.badge}</span>}
                      </div>
                      <div className="text-xs text-cyan-100/50 truncate mt-0.5" dir="ltr">
                        {p.name_en}
                      </div>

                      {/* Category & Slug tags */}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[11px]">
                        {category && (
                          <span className="text-cyan-300/80 bg-cyan-400/[0.08] px-2 py-0.5 rounded-md border border-cyan-400/15">
                            {category.name_ar}
                          </span>
                        )}
                        <span className="text-cyan-100/40 font-mono text-[10px]">
                          /{p.slug}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Price & Variants Summary */}
                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-cyan-100/60">السعر</div>
                      <div className="flex items-center gap-1.5">
                        <span className="gx-price-badge">{priceLabel}</span>
                        {/* Quick Edit Price Button */}
                        <button
                          type="button"
                          title="تعديل السعر المباشر"
                          onClick={() => setQuickPriceProduct(p)}
                          className="p-1 rounded-md text-cyan-400 hover:bg-cyan-400/15 transition"
                        >
                          <Pencil size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="text-left">
                      <div className="text-[11px] text-cyan-100/60">الباقات</div>
                      <div className="text-xs font-semibold text-cyan-200">
                        {hasVariants ? `${vInfo.count} باقة / خيار` : "سعر مباشر"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions Bottom Bar */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* Toggle Active */}
                    <button
                      type="button"
                      title={p.is_active ? "إخفاء من المتجر" : "إظهار في المتجر"}
                      onClick={() =>
                        toggleActiveMut.mutate({ id: p.id, is_active: !p.is_active, slug: p.slug })
                      }
                      className={`p-2 rounded-lg transition ${
                        p.is_active
                          ? "text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                          : "text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
                      }`}
                    >
                      {p.is_active ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>

                    {/* Toggle Featured */}
                    <button
                      type="button"
                      title={p.is_featured ? "إزالة من المنتجات المميزة" : "تمييز في واجهة المتجر"}
                      onClick={() =>
                        toggleFeaturedMut.mutate({ id: p.id, is_featured: !p.is_featured, slug: p.slug })
                      }
                      className={`p-2 rounded-lg transition ${
                        p.is_featured
                          ? "text-yellow-400 bg-yellow-500/15 hover:bg-yellow-500/25"
                          : "text-cyan-100/40 hover:text-yellow-400 hover:bg-cyan-400/10"
                      }`}
                    >
                      <Star size={15} fill={p.is_featured ? "currentColor" : "none"} />
                    </button>

                    {/* External Link to Store Page */}
                    <a
                      href={`/product/${p.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="فتح صفحة المنتج بالمتجر"
                      className="p-2 rounded-lg text-cyan-400/70 hover:text-cyan-300 hover:bg-cyan-400/10 transition"
                    >
                      <ExternalLink size={15} />
                    </a>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Full Visual Edit in New Tab */}
                    <button
                      type="button"
                      onClick={() => window.open(`/admin/product-editor?slug=${p.slug}`, "_blank")}
                      className="gx-btn-outline py-1.5 px-3 text-xs flex items-center gap-1.5 text-cyan-300 hover:text-cyan-100"
                      title="فتح محرر القالب الكامل في تبويبة جديدة"
                    >
                      <Pencil size={13} /> تعديل القالب
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => setDeletingProduct(p)}
                      className="gx-btn-danger p-1.5"
                      title="حذف المنتج"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Comprehensive Product Edit & Create Modal */}
      {(editingProduct || isCreating) && (
        <ProductModal
          product={editingProduct}
          categories={categories}
          onClose={() => {
            setEditingProduct(null);
            setIsCreating(false);
          }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin-products"] });
            qc.invalidateQueries({ queryKey: ["admin-all-variants"] });
            setEditingProduct(null);
            setIsCreating(false);
          }}
        />
      )}

      {/* Quick Price Edit Dialog */}
      {quickPriceProduct && (
        <QuickPriceDialog
          product={quickPriceProduct}
          onClose={() => setQuickPriceProduct(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin-products"] });
            qc.invalidateQueries({ queryKey: ["admin-all-variants"] });
            setQuickPriceProduct(null);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deletingProduct && (
        <Dialog open onOpenChange={() => setDeletingProduct(null)}>
          <DialogContent className="max-w-md bg-[#0d131a] border-red-500/30 text-cyan-100" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-red-400 flex items-center gap-2">
                <Trash2 size={18} /> تأكيد حذف المنتج
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm text-cyan-100/80">
              <p>
                هل أنت متأكد من رغبتك بحذف المنتج{" "}
                <b className="text-cyan-200">«{deletingProduct.name_ar}»</b>؟
              </p>
              <p className="text-xs text-red-300/70">
                سيتم حذف المنتج وجميع خياراته وأسعاره المرتبطة به نهائياً. لا يمكن التراجع عن هذه الخطوة.
              </p>
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-white/10">
              <button type="button" onClick={() => setDeletingProduct(null)} className="gx-btn-outline">
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => deleteMut.mutate({ id: deletingProduct.id, slug: deletingProduct.slug })}
                disabled={deleteMut.isPending}
                className="gx-btn-danger"
              >
                {deleteMut.isPending ? "جاري الحذف..." : "نعم، احذف المنتج"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

/**
 * ============================================================
 * BESTSELLER SNAPSHOT SYNCHRONIZER
 * Ensures immediate, end-to-end consistency across homepage
 * bestsellers, cart, and checkout whenever prices/assets change.
 * ============================================================
 */
async function syncBestsellerSnapshot(params: {
  productSlug: string;
  updatedVariants?: { cart_id: string; price_jod: number; label_ar?: string }[];
  productBasePrice?: number | null;
  imageUrl?: string | null;
  iconImageUrl?: string | null;
  nameAr?: string;
  nameEn?: string;
  badge?: string | null;
  thumbBg?: string | null;
}) {
  try {
    const { data: row } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "home_bestseller_items")
      .maybeSingle();

    if (!row || !Array.isArray(row.value)) return;

    let items = [...(row.value as any[])];
    let changed = false;

    items = items.map((snap) => {
      const matchVariant = params.updatedVariants?.find((v) => v.cart_id === snap.cartId);
      const isSlugMatch = snap.productSlug === params.productSlug || snap.cartId === params.productSlug;

      if (matchVariant || isSlugMatch) {
        changed = true;
        const newPrice = matchVariant
          ? Number(matchVariant.price_jod) || snap.priceJod
          : typeof params.productBasePrice === "number" && params.productBasePrice > 0
          ? params.productBasePrice
          : snap.priceJod;

        return {
          ...snap,
          priceJod: newPrice,
          nameAr: params.nameAr || snap.nameAr,
          nameEn: params.nameEn || snap.nameEn,
          badge: params.badge !== undefined ? params.badge : snap.badge,
          imageUrl: params.imageUrl || snap.imageUrl,
          iconImage: params.iconImageUrl || params.imageUrl || snap.iconImage,
          thumbBg: params.thumbBg || snap.thumbBg,
        };
      }
      return snap;
    });

    if (changed) {
      await supabase.from("site_settings").upsert({
        key: "home_bestseller_items",
        value: items,
      });
      if (typeof localStorage !== "undefined") {
        try {
          localStorage.removeItem("gx_site_settings_v2");
          localStorage.removeItem("gx_site_settings_v2_ts");
        } catch { /* noop */ }
      }
      window.dispatchEvent(
        new CustomEvent("gx_site_settings_changed", {
          detail: { home_bestseller_items: items },
        })
      );
      window.dispatchEvent(new Event("gx:site-settings-updated"));
    }
  } catch (err) {
    console.error("Failed to sync bestsellers snapshot:", err);
  }
}

/**
 * ============================================================
 * QUICK PRICE EDIT DIALOG
 * Allows instant, 1-click price updates with global synchronization!
 * ============================================================
 */
function QuickPriceDialog({
  product,
  onClose,
  onSaved,
}: {
  product: Product;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [price, setPrice] = useState<string>(product.base_price_jod?.toString() || "");
  const [saving, setSaving] = useState(false);

  // Fetch variants to see if this product has variants
  const { data: variants } = useQuery({
    queryKey: ["admin-variants-quick", product.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_variants")
        .select("id, label_ar, price_jod, cart_id")
        .eq("product_id", product.id)
        .order("sort_order");
      return (data ?? []) as { id: string; label_ar: string; price_jod: number; cart_id: string }[];
    },
  });

  const [variantPrices, setVariantPrices] = useState<Record<string, string>>({});

  const save = async () => {
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      toast.error("أدخل سعراً صحيحاً");
      return;
    }

    setSaving(true);
    try {
      // 1. Update product base price
      const { error: pErr } = await supabase
        .from("products")
        .update({ base_price_jod: numPrice })
        .eq("id", product.id);
      if (pErr) throw pErr;

      // 2. If it has variants, update them as configured
      const updatedVars: { cart_id: string; price_jod: number }[] = [];
      if (variants && variants.length > 0) {
        for (const v of variants) {
          const vPrice = variantPrices[v.id] ? Number(variantPrices[v.id]) : (variants.length === 1 ? numPrice : null);
          if (vPrice !== null && !isNaN(vPrice)) {
            await supabase.from("product_variants").update({ price_jod: vPrice }).eq("id", v.id);
            if (v.cart_id) {
              updatedVars.push({ cart_id: v.cart_id, price_jod: vPrice });
            }
          }
        }
      }

      // 3. Sync Bestseller snapshot in database
      await syncBestsellerSnapshot({
        productSlug: product.slug,
        updatedVariants: updatedVars,
        productBasePrice: numPrice,
        imageUrl: product.image_url,
        nameAr: product.name_ar,
      });

      // 4. Invalidate server cache & reload client registry
      await purgeCatalogCacheFn({ data: { slug: product.slug } });
      await clearDbVariantsCache();

      toast.success("تم تحديث السعر بنجاح ومزامنته في كل مكان (المتجر، الأكثر مبيعاً، والسلة)");
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "فشل التحديث");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-[#0d131a] border-cyan-400/30 text-cyan-100" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-cyan-300 flex items-center gap-2">
            <DollarSign size={18} className="text-cyan-400" /> تعديل سريع للسعر: {product.name_ar}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 my-2">
          <div>
            <Label className="text-xs text-cyan-100/70">السعر الأساسي (د.أ)</Label>
            <Input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="gx-input text-lg font-bold font-mono mt-1"
              placeholder="10.00"
              autoFocus
            />
          </div>

          {variants && variants.length > 1 && (
            <div className="space-y-2 pt-2 border-t border-white/10">
              <Label className="text-xs text-cyan-300 font-bold">تعديل أسعار باقات هذا المنتج أيضاً:</Label>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {variants.map((v) => (
                  <div key={v.id} className="flex items-center justify-between gap-3 bg-black/30 p-2 rounded-lg">
                    <span className="text-xs text-cyan-100 truncate">{v.label_ar}</span>
                    <div className="flex items-center gap-1.5 w-28">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder={v.price_jod.toString()}
                        value={variantPrices[v.id] ?? v.price_jod.toString()}
                        onChange={(e) =>
                          setVariantPrices((prev) => ({ ...prev, [v.id]: e.target.value }))
                        }
                        className="gx-input h-8 text-xs font-mono text-center"
                      />
                      <span className="text-[11px] text-cyan-100/60">د.أ</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-white/10">
          <button type="button" onClick={onClose} className="gx-btn-outline">
            إلغاء
          </button>
          <button type="button" onClick={save} disabled={saving} className="gx-btn-primary">
            {saving ? "جاري الحفظ..." : "حفظ السعر فوراً"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * ============================================================
 * VISUAL WYSIWYG PRODUCT PAGE EDITOR
 * Modeled directly after the storefront product page (`GxProductTemplate`).
 * Displays live Driffle poster preview, instant delivery pills,
 * duration/variation cards, and pre-populates all catalog texts.
 * ============================================================
 */
function ProductModal({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  // 1. Check if static catalog has texts for this product slug
  const catProd = product?.slug ? (PRODUCTS_CATALOG[product.slug] as any) : null;
  const enProd = product?.slug ? (PRODUCTS_EN[product.slug] as any) : null;

  // Basic info
  const [nameAr, setNameAr] = useState(product?.name_ar || catProd?.name || "");
  const [nameEn, setNameEn] = useState(product?.name_en || enProd?.name || catProd?.name || "");
  const [slug, setSlug] = useState(product?.slug || "");
  const [categoryId, setCategoryId] = useState<string>(product?.category_id || categories[0]?.id || "");
  const [badge, setBadge] = useState(product?.badge || "");
  const [isActive, setIsActive] = useState<boolean>(product?.is_active ?? true);
  const [isFeatured, setIsFeatured] = useState<boolean>(product?.is_featured ?? false);

  // Media & Visuals
  const [imageUrl, setImageUrl] = useState(product?.image_url || catProd?.imageUrl || catProd?.iconImg || "");
  const [iconImageUrl, setIconImageUrl] = useState(product?.icon_image_url || catProd?.iconImg || "");
  const [icon, setIcon] = useState(product?.icon || catProd?.icon || "🎮");
  const [thumbBg, setThumbBg] = useState(product?.thumb_bg || catProd?.thumbBg || THUMB_PRESETS[0]);
  const [accentColor, setAccentColor] = useState(product?.accent_color || "#00e5ff");

  // Delivery & Details
  const initialDeliveryType =
    product?.delivery_type ||
    (catProd?.identifierLabel
      ? (catProd.identifierLabel.toLowerCase().includes("email") || catProd.identifierLabel.toLowerCase().includes("إيميل")
          ? "account"
          : "topup")
      : "code");

  const [deliveryType, setDeliveryType] = useState<string>(initialDeliveryType);
  const [taglineAr, setTaglineAr] = useState(product?.tagline_ar || catProd?.tagline || "");
  const [taglineEn, setTaglineEn] = useState(product?.tagline_en || enProd?.tagline || "");
  const [descAr, setDescAr] = useState(product?.description_ar || catProd?.description || "");
  const [descEn, setDescEn] = useState(product?.description_en || enProd?.description || "");
  const [requiresPlayerId, setRequiresPlayerId] = useState<boolean>(
    product?.requires_player_id ?? Boolean(catProd?.identifierLabel)
  );
  const [idLabelAr, setIdLabelAr] = useState(product?.identifier_label_ar || catProd?.identifierLabel || "");
  const [idPlaceholder, setIdPlaceholder] = useState(product?.identifier_placeholder || catProd?.identifierPlaceholder || "");
  const [delMethodAr, setDelMethodAr] = useState(product?.delivery_method_ar || catProd?.deliveryMethod || "");
  const [delInstrAr, setDelInstrAr] = useState(product?.delivery_instructions_ar || "");

  // Base price
  const initialBasePrice =
    product?.base_price_jod?.toString() ||
    (catProd?.plans?.[0]?.price ? catProd.plans[0].price.toString() : "");
  const [basePrice, setBasePrice] = useState<string>(initialBasePrice);

  // Variants list
  const [variantsList, setVariantsList] = useState<Variant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");

  // New variant inline adder
  const [showAddVar, setShowAddVar] = useState(false);
  const [newVarLabel, setNewVarLabel] = useState("");
  const [newVarPrice, setNewVarPrice] = useState("");
  const [newVarOldPrice, setNewVarOldPrice] = useState("");
  const [newVarTag, setNewVarTag] = useState("");

  // Fetch variants from DB
  const variantsQ = useQuery({
    queryKey: ["admin-product-variants-edit", product?.id],
    queryFn: async () => {
      if (!product?.id) return [];
      const { data, error } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", product.id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Variant[];
    },
    enabled: !!product?.id,
  });

  // Populate variants: Prefer DB, but if DB has 0 variants and catalog has plans, auto-import them!
  useMemo(() => {
    if (variantsQ.data && variantsQ.data.length > 0) {
      setVariantsList(variantsQ.data);
      if (!selectedVariantId) setSelectedVariantId(variantsQ.data[0].id);
    } else if (catProd?.plans && catProd.plans.length > 0) {
      const imported: Variant[] = catProd.plans.map((pl: any, idx: number) => ({
        id: `imported-${pl.id}`,
        product_id: product?.id || "",
        label_ar: pl.label,
        label_en: pl.label,
        price_jod: pl.price,
        old_price_jod: pl.oldPrice || null,
        face_value: null,
        face_currency: null,
        tag_ar: pl.tag || null,
        tag_en: pl.tag || null,
        plan_group: null,
        region: "Global",
        cart_id: pl.id,
        delivery_type: (product?.delivery_type || "code") as any,
        is_active: true,
        sort_order: idx,
      }));
      setVariantsList(imported);
      if (!selectedVariantId && imported[0]) setSelectedVariantId(imported[0].id);
    }
  }, [variantsQ.data, catProd]);

  // Features Query & State
  const featuresQ = useQuery({
    queryKey: ["admin-product-features-edit", product?.id],
    queryFn: async () => {
      if (!product?.id) return [];
      const { data, error } = await supabase
        .from("product_features")
        .select("*")
        .eq("product_id", product.id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as FeatureItem[];
    },
    enabled: !!product?.id,
  });

  const [featuresList, setFeaturesList] = useState<FeatureItem[]>([]);

  useEffect(() => {
    if (featuresQ.data && featuresQ.data.length > 0) {
      setFeaturesList(featuresQ.data);
    } else if (catProd?.features && catProd.features.length > 0) {
      setFeaturesList(
        catProd.features.map((f: any) => ({
          icon: f.icon || "★",
          title_ar: f.titleAr || f.title_ar || f.title || "",
          title_en: f.titleEn || f.title_en || f.titleAr || "",
          desc_ar: f.descAr || f.desc_ar || f.desc || "",
          desc_en: f.descEn || f.desc_en || f.descAr || "",
        }))
      );
    } else {
      setFeaturesList(DEFAULT_FEATURES);
    }
  }, [featuresQ.data, catProd]);

  const updateFeature = (index: number, field: keyof FeatureItem, value: string) => {
    setFeaturesList((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const addFeature = () => {
    setFeaturesList((prev) => [
      ...prev,
      {
        icon: "★",
        title_ar: "ميزة جديدة",
        title_en: "New Feature",
        desc_ar: "شرح وتفاصيل الميزة للمشتري...",
        desc_en: "",
      },
    ]);
  };

  const removeFeature = (index: number) => {
    setFeaturesList((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Redeem Steps
  const [redeemStepsList, setRedeemStepsList] = useState<string[]>(() => {
    if (product?.delivery_instructions_ar) {
      try {
        const parsed = JSON.parse(product.delivery_instructions_ar);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        const lines = product.delivery_instructions_ar.split("\n").map((l: string) => l.trim()).filter(Boolean);
        if (lines.length > 0) return lines;
      }
    }
    return DEFAULT_STEPS_BY_TYPE[initialDeliveryType] || DEFAULT_STEPS_BY_TYPE.code;
  });

  const updateRedeemStep = (index: number, value: string) => {
    setRedeemStepsList((prev) =>
      prev.map((step, idx) => (idx === index ? value : step))
    );
  };

  const addRedeemStep = () => {
    setRedeemStepsList((prev) => [...prev, ""]);
  };

  const removeRedeemStep = (index: number) => {
    setRedeemStepsList((prev) => prev.filter((_, idx) => idx !== index));
  };

  const restoreDefaultSteps = () => {
    const defaults = DEFAULT_STEPS_BY_TYPE[deliveryType] || DEFAULT_STEPS_BY_TYPE.code;
    setRedeemStepsList([...defaults]);
    toast.success("تمت استعادة خطوات التفعيل الافتراضية");
  };

  // Important Notes
  const [importantNotesList, setImportantNotesList] = useState<string[]>(() => {
    if (product?.delivery_instructions_en) {
      try {
        const parsed = JSON.parse(product.delivery_instructions_en);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        const lines = product.delivery_instructions_en.split("\n").map((l: string) => l.trim()).filter(Boolean);
        if (lines.length > 0) return lines;
      }
    }
    return DEFAULT_IMPORTANT_NOTES;
  });

  const updateImportantNote = (index: number, value: string) => {
    setImportantNotesList((prev) =>
      prev.map((note, idx) => (idx === index ? value : note))
    );
  };

  const addImportantNote = () => {
    setImportantNotesList((prev) => [...prev, ""]);
  };

  const removeImportantNote = (index: number) => {
    setImportantNotesList((prev) => prev.filter((_, idx) => idx !== index));
  };

  const restoreDefaultImportantNotes = () => {
    setImportantNotesList([...DEFAULT_IMPORTANT_NOTES]);
    toast.success("تمت استعادة الملاحظات الافتراضية");
  };

  // Active variant for poster preview
  const activePreviewVariant =
    variantsList.find((v) => v.id === selectedVariantId) || variantsList[0] || null;

  // File upload helper
  const handleFileUpload = async (file: File, setter: (url: string) => void) => {
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setter(data.publicUrl);
      toast.success("تم رفع الصورة بنجاح وتحديث الغلاف");
    } catch (e: any) {
      toast.error(e.message || "فشل رفع الصورة");
    }
  };

  // Update variant field inline
  const updateVariant = (vId: string, field: keyof Variant, value: any) => {
    setVariantsList((prev) =>
      prev.map((v) => (v.id === vId ? { ...v, [field]: value } : v))
    );
  };

  // Add new variant
  const handleAddNewVariant = () => {
    if (!newVarLabel.trim()) {
      toast.error("أدخل اسم أو مدة الباقة (مثل: شهر واحد)");
      return;
    }
    const pNum = Number(newVarPrice);
    if (isNaN(pNum) || pNum < 0) {
      toast.error("أدخل سعراً صالحاً");
      return;
    }
    const currentSlug = slug.trim() || slugify(nameEn || nameAr);
    const cartIdFinal = `${currentSlug}-${variantsList.length + 1}`;

    const newV: Variant = {
      id: `temp-${Date.now()}`,
      product_id: product?.id || "",
      label_ar: newVarLabel.trim(),
      label_en: newVarLabel.trim(),
      price_jod: pNum,
      old_price_jod: newVarOldPrice ? Number(newVarOldPrice) : null,
      face_value: null,
      face_currency: null,
      tag_ar: newVarTag.trim() || null,
      tag_en: newVarTag.trim() || null,
      plan_group: null,
      region: "Global",
      cart_id: cartIdFinal,
      delivery_type: deliveryType as any,
      is_active: true,
      sort_order: variantsList.length,
    };

    setVariantsList((prev) => [...prev, newV]);
    setSelectedVariantId(newV.id);
    setNewVarLabel("");
    setNewVarPrice("");
    setNewVarOldPrice("");
    setNewVarTag("");
    setShowAddVar(false);
    toast.success("تمت إضافة الباقة");
  };

  // Delete variant
  const deleteVariant = async (vId: string) => {
    if (product?.id && !vId.startsWith("temp-") && !vId.startsWith("imported-")) {
      await supabase.from("product_variants").delete().eq("id", vId);
    }
    setVariantsList((prev) => prev.filter((v) => v.id !== vId));
    toast.success("تم حذف الباقة");
  };

  // Save product and all variants
  const saveProduct = async () => {
    if (!nameAr.trim()) {
      toast.error("اسم المنتج بالعربي مطلوب");
      return;
    }
    const finalSlug = slug.trim() || slugify(nameEn || nameAr);
    if (!finalSlug) {
      toast.error("معرّف الرابط (slug) مطلوب");
      return;
    }

    setSaving(true);
    try {
      // Resolve base price
      const parsedBasePrice =
        variantsList.length > 0
          ? variantsList[0].price_jod
          : basePrice.trim() !== ""
          ? Number(basePrice)
          : 0;

      const payload = {
        name_ar: nameAr.trim(),
        name_en: nameEn.trim() || nameAr.trim(),
        slug: finalSlug,
        category_id: categoryId || null,
        base_price_jod: parsedBasePrice,
        badge: badge.trim() || null,
        is_active: isActive,
        is_featured: isFeatured,
        image_url: imageUrl.trim() || null,
        icon_image_url: iconImageUrl.trim() || null,
        icon: icon.trim() || "🎮",
        thumb_bg: thumbBg.trim() || null,
        accent_color: accentColor.trim() || "#00e5ff",
        tagline_ar: taglineAr.trim() || null,
        tagline_en: taglineEn.trim() || null,
        description_ar: descAr.trim() || null,
        description_en: descEn.trim() || null,
        delivery_type: deliveryType as Product["delivery_type"],
        requires_player_id: requiresPlayerId,
        identifier_label_ar: idLabelAr.trim() || null,
        identifier_placeholder: idPlaceholder.trim() || null,
        delivery_method_ar: delMethodAr.trim() || null,
        delivery_instructions_ar: JSON.stringify(redeemStepsList.map((s) => s.trim()).filter(Boolean)),
        delivery_instructions_en: JSON.stringify(importantNotesList.map((s) => s.trim()).filter(Boolean)),
        delivery_details: {
          important_notes: importantNotesList.map((s) => s.trim()).filter(Boolean),
          redeem_steps: redeemStepsList.map((s) => s.trim()).filter(Boolean),
        },
      };

      let savedProdId = product?.id;

      if (product?.id) {
        // Update product
        const { error: pErr } = await supabase.from("products").update(payload).eq("id", product.id);
        if (pErr) throw pErr;
      } else {
        // Insert new product
        const { data: pNew, error: pErr } = await supabase.from("products").insert(payload).select("id").single();
        if (pErr) throw pErr;
        savedProdId = pNew.id;
      }

      // Upsert features into product_features table
      if (savedProdId) {
        await supabase.from("product_features").delete().eq("product_id", savedProdId);
        const activeFeatures = featuresList.filter((f) => f.title_ar.trim());
        if (activeFeatures.length > 0) {
          const fPayload = activeFeatures.map((f, i) => ({
            product_id: savedProdId,
            icon: f.icon || "★",
            title_ar: f.title_ar.trim(),
            title_en: f.title_en?.trim() || f.title_ar.trim(),
            desc_ar: f.desc_ar?.trim() || null,
            desc_en: f.desc_en?.trim() || f.desc_ar?.trim() || null,
            sort_order: i,
          }));
          const { error: fErr } = await supabase.from("product_features").insert(fPayload as any);
          if (fErr) console.error("Error saving features:", fErr);
        }
      }

      // Upsert variants
      const updatedVariantsForSync: { cart_id: string; price_jod: number; label_ar: string }[] = [];

      if (variantsList.length > 0) {
        for (let i = 0; i < variantsList.length; i++) {
          const v = variantsList[i];
          const vCartId = v.cart_id || `${finalSlug}-${i + 1}`;
          const vPayload = {
            product_id: savedProdId,
            label_ar: v.label_ar,
            label_en: v.label_en || v.label_ar,
            price_jod: Number(v.price_jod) || 0,
            old_price_jod: v.old_price_jod ? Number(v.old_price_jod) : null,
            cart_id: vCartId,
            tag_ar: v.tag_ar,
            tag_en: v.tag_en,
            is_active: v.is_active,
            sort_order: i,
            delivery_type: deliveryType as any,
          };

          if (v.id.startsWith("temp-") || v.id.startsWith("imported-")) {
            await supabase.from("product_variants").insert(vPayload as any);
          } else {
            await supabase.from("product_variants").update(vPayload as any).eq("id", v.id);
          }

          updatedVariantsForSync.push({
            cart_id: vCartId,
            price_jod: Number(v.price_jod) || 0,
            label_ar: v.label_ar,
          });
        }
      } else if (parsedBasePrice > 0) {
        // Single price fallback variant
        await supabase.from("product_variants").upsert({
          product_id: savedProdId,
          label_ar: nameAr.trim(),
          label_en: nameEn.trim() || nameAr.trim(),
          price_jod: parsedBasePrice,
          cart_id: finalSlug,
          is_active: true,
          sort_order: 0,
          delivery_type: deliveryType as any,
        } as any);

        updatedVariantsForSync.push({
          cart_id: finalSlug,
          price_jod: parsedBasePrice,
          label_ar: nameAr.trim(),
        });
      }

      // 3. Synchronize Bestsellers Snapshot in Database
      await syncBestsellerSnapshot({
        productSlug: finalSlug,
        updatedVariants: updatedVariantsForSync,
        productBasePrice: parsedBasePrice,
        imageUrl: imageUrl.trim() || null,
        iconImageUrl: iconImageUrl.trim() || null,
        nameAr: nameAr.trim(),
        nameEn: nameEn.trim(),
        badge: badge.trim() || null,
        thumbBg: thumbBg.trim() || null,
      });

      // 4. Purge in-memory server cache & wipe client variant cache
      await purgeCatalogCacheFn({ data: { slug: finalSlug } });
      await clearDbVariantsCache();

      qc.invalidateQueries({ queryKey: ["admin-product-features-edit", savedProdId] });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["admin-all-variants"] });

      toast.success("تم حفظ المنتج والمميزات وخطوات التفعيل بنجاح في المتجر!");
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const deliveryLabel =
    DELIVERY_TYPES.find((d) => d.id === deliveryType)?.label?.split(" (")[0] || "تسليم فوري";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className="max-w-6xl w-[96vw] max-h-[92vh] overflow-y-auto bg-[#0b1017] border border-cyan-400/30 text-cyan-100 p-6 rounded-2xl shadow-2xl"
        dir="rtl"
      >
        {/* Top Product Page Breadcrumb Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2 text-xs text-cyan-100/70">
            <span className="text-cyan-400 font-semibold">الرئيسية</span>
            <span>&gt;</span>
            <div className="w-44">
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-7 text-xs bg-black/40 border-cyan-400/30 text-cyan-200">
                  <SelectValue placeholder="اختر التصنيف" />
                </SelectTrigger>
                <SelectContent dir="rtl" className="bg-[#0b1017] border-cyan-400/20 text-cyan-100">
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name_ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span>&gt;</span>
            <span className="font-bold text-cyan-100 truncate max-w-[200px]">
              {nameAr || "منتج جديد"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {slug && (
              <a
                href={`/product/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 bg-cyan-400/10 hover:bg-cyan-400/20 px-3 py-1.5 rounded-lg border border-cyan-400/20 transition"
              >
                <ExternalLink size={13} /> عرض في المتجر
              </a>
            )}

            {/* Active Switch */}
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-bold transition ${
                isActive
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              }`}
            >
              {isActive ? "✓ مفعّل بالمتجر" : "✕ مخفي من المتجر"}
            </button>

            {/* Featured Switch */}
            <button
              type="button"
              onClick={() => setIsFeatured(!isFeatured)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-bold transition ${
                isFeatured
                  ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                  : "bg-white/5 text-cyan-100/50 border border-white/10 hover:text-yellow-400"
              }`}
            >
              <Star size={13} fill={isFeatured ? "currentColor" : "none"} />
              {isFeatured ? "مميز بالرئيسية" : "غير مميز"}
            </button>
          </div>
        </div>

        {/* MAIN PRODUCT PAGE WYSIWYG GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-4 items-start">
          {/* ============================================================ */}
          {/* LEFT: THE DRIFFLE POSTER ART (LIVE PRODUCT CARD PREVIEW)     */}
          {/* ============================================================ */}
          <div className="lg:col-span-5 space-y-4">
            <div className="text-xs font-bold text-cyan-300 flex items-center justify-between">
              <span>🖼️ غلاف وبوستر المنتج (مظهر المتجر الحقيقي)</span>
              <span className="text-[11px] text-cyan-100/50">معاينة حية ومباشرة</span>
            </div>

            {/* The Live Poster Card */}
            <div
              className="gx-editor-poster"
              style={{ background: thumbBg }}
            >
              {/* Top Logo Badge */}
              <div className="w-14 h-14 rounded-2xl bg-black/60 border border-white/20 flex items-center justify-center p-2.5 shadow-xl mx-auto backdrop-blur-md relative group">
                {iconImageUrl || imageUrl ? (
                  <img
                    src={iconImageUrl || imageUrl}
                    alt=""
                    className="w-full h-full object-contain drop-shadow"
                  />
                ) : (
                  <span className="text-2xl">{icon || "🎮"}</span>
                )}
                <label className="absolute inset-0 bg-black/70 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer text-[10px] text-cyan-300 font-bold text-center">
                  <Upload size={14} />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f, setIconImageUrl);
                    }}
                  />
                </label>
              </div>

              {/* Poster Artwork Cover */}
              <div className="w-full h-40 rounded-xl overflow-hidden my-2 flex items-center justify-center relative group bg-black/20 border border-white/10">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={nameAr}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="text-center p-4 text-cyan-100/50 text-xs">
                    <ShoppingBag size={32} className="mx-auto text-cyan-400/40 mb-1" />
                    اضغط لرفع غلاف المنتج
                  </div>
                )}
                <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer text-xs text-cyan-200 font-bold gap-1 backdrop-blur-sm">
                  <Upload size={20} className="text-cyan-400" />
                  <span>رفع صورة غلاف جديدة</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f, setImageUrl);
                    }}
                  />
                </label>
              </div>

              {/* Title on Poster */}
              <div className="text-center px-2 z-10">
                <div className="font-extrabold text-white text-base truncate drop-shadow-md">
                  {nameAr || "اسم المنتج"}
                </div>
                <div className="text-[11px] font-bold text-cyan-300 tracking-wider mt-1 uppercase">
                  {deliveryLabel} • رسمي 100%
                </div>
              </div>

              {/* Poster Footer: Active Variant Label + Region */}
              <div className="flex items-center justify-between pt-2 border-t border-white/15 text-[11px] font-bold text-white/90">
                <span className="bg-black/40 px-2.5 py-1 rounded-md border border-white/10">
                  ⏱️ {activePreviewVariant?.label_ar || "الباقة الأساسية"}
                </span>
                <span className="bg-cyan-400/20 text-cyan-300 px-2.5 py-1 rounded-md border border-cyan-400/30">
                  🌐 عالمي (Global)
                </span>
              </div>
            </div>

            {/* Poster Customization Controls */}
            <div className="gx-card p-3.5 space-y-3">
              {/* Gradient Presets Bar */}
              <div>
                <Label className="text-[11px] text-cyan-200 font-bold block mb-1.5">
                  🎨 اختر خلفية وتدرج البطاقة بنقرة واحدة:
                </Label>
                <div className="flex items-center gap-2 flex-wrap">
                  {THUMB_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setThumbBg(preset)}
                      className={`gx-gradient-swatch ${thumbBg === preset ? "active" : ""}`}
                      style={{ background: preset }}
                      title={`خيار تدرج ${idx + 1}`}
                    />
                  ))}
                  <Input
                    value={thumbBg}
                    onChange={(e) => setThumbBg(e.target.value)}
                    placeholder="linear-gradient(...)"
                    className="gx-input h-7 text-[11px] font-mono flex-1 min-w-[120px]"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Image URL Inputs */}
              <div className="grid grid-cols-1 gap-2 pt-2 border-t border-white/5">
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] text-cyan-100/70">رابط صورة الغلاف (URL):</Label>
                    <label className="text-[11px] text-cyan-400 hover:underline cursor-pointer flex items-center gap-1">
                      <Upload size={11} /> رفع ملف
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileUpload(f, setImageUrl);
                        }}
                      />
                    </label>
                  </div>
                  <Input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://... أو /app/assets/..."
                    className="gx-input h-8 text-xs font-mono mt-1"
                    dir="ltr"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] text-cyan-100/70">معرف الرابط (Slug):</Label>
                    <Input
                      value={slug}
                      onChange={(e) => setSlug(slugify(e.target.value))}
                      placeholder="adobe-cc"
                      className="gx-input h-8 text-xs font-mono mt-1 text-cyan-300 font-bold"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-cyan-100/70">شارة البوستر (Badge):</Label>
                    <Input
                      value={badge}
                      onChange={(e) => setBadge(e.target.value)}
                      placeholder="الأكثر طلباً"
                      className="gx-input h-8 text-xs mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* RIGHT: PRODUCT INFO & VARIATIONS (STOREFRONT PAGE LAYOUT)    */}
          {/* ============================================================ */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1. Header Titles & Subtitle */}
            <div className="gx-card p-4 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-cyan-300 font-bold">اسم المنتج (العنوان الرئيسي بالعربي):</Label>
                <Input
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder="مثال: اشتراك أدوبي كرييتف كلاود الرسمي"
                  className="gx-input text-base font-extrabold text-cyan-100 border-cyan-400/40"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] text-cyan-100/70">Product Name (English):</Label>
                  <Input
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="Adobe Creative Cloud"
                    className="gx-input h-8 text-xs mt-1"
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-cyan-100/70">الوصف التعريفي المختصر (Tagline):</Label>
                  <Input
                    value={taglineAr}
                    onChange={(e) => setTaglineAr(e.target.value)}
                    placeholder="كل تطبيقات Adobe باشتراك واحد رسمي"
                    className="gx-input h-8 text-xs mt-1"
                  />
                </div>
              </div>
            </div>

            {/* 2. Delivery Type Status Pills */}
            <div className="gx-card p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-cyan-300 font-bold">
                  ⚡ نوع التسليم للعميل (اختر نوع الاستلام):
                </Label>
                <span className="text-[11px] text-cyan-400 font-mono">
                  {deliveryLabel}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {DELIVERY_TYPES.map((dt) => {
                  const isCur = deliveryType === dt.id;
                  return (
                    <div
                      key={dt.id}
                      onClick={() => setDeliveryType(dt.id)}
                      className={`gx-editor-pill ${isCur ? "is-active" : ""}`}
                    >
                      <span className="text-xl">{dt.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className={`text-xs font-bold ${isCur ? "text-cyan-200" : "text-white/80"}`}>
                          {dt.label}
                        </div>
                        <div className="text-[10px] text-cyan-100/50 truncate mt-0.5">
                          {dt.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Duration & Variations Cards Selector */}
            <div className="gx-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⏱️</span>
                  <Label className="text-xs text-cyan-300 font-bold">
                    باقات وخطط المنتج والأسعار (Duration & Pricing):
                  </Label>
                  <span className="text-[11px] text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full">
                    {variantsList.length > 0 ? `${variantsList.length} باقة` : "سعر موحد"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddVar(!showAddVar)}
                  className="gx-btn-outline py-1 px-2.5 text-xs"
                >
                  <Plus size={13} /> إضافة باقة جديدة
                </button>
              </div>

              {/* Inline Variant Adder */}
              {showAddVar && (
                <div className="bg-cyan-950/40 border border-cyan-400/30 rounded-xl p-3 space-y-2">
                  <div className="text-xs font-bold text-cyan-200">إضافة خيار / باقة جديدة:</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <Label className="text-[10px] text-cyan-100/70">اسم/مدة الباقة:</Label>
                      <Input
                        value={newVarLabel}
                        onChange={(e) => setNewVarLabel(e.target.value)}
                        placeholder="شهر واحد"
                        className="gx-input h-8 text-xs mt-1"
                        autoFocus
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-cyan-100/70">السعر (د.أ):</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newVarPrice}
                        onChange={(e) => setNewVarPrice(e.target.value)}
                        placeholder="10.00"
                        className="gx-input h-8 text-xs mt-1 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-cyan-100/70">السعر قبل الخصم:</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newVarOldPrice}
                        onChange={(e) => setNewVarOldPrice(e.target.value)}
                        placeholder="15.00"
                        className="gx-input h-8 text-xs mt-1 font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-cyan-100/70">شارة ترويجية:</Label>
                      <Input
                        value={newVarTag}
                        onChange={(e) => setNewVarTag(e.target.value)}
                        placeholder="الأكثر طلباً"
                        className="gx-input h-8 text-xs mt-1"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddVar(false)}
                      className="gx-btn-outline py-1 px-3 text-xs"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={handleAddNewVariant}
                      className="gx-btn-primary py-1 px-3 text-xs"
                    >
                      حفظ الباقة
                    </button>
                  </div>
                </div>
              )}

              {/* Variations Cards Grid */}
              {variantsList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                  {variantsList.map((v) => {
                    const isSel = v.id === selectedVariantId;
                    return (
                      <div
                        key={v.id}
                        onClick={() => setSelectedVariantId(v.id)}
                        className={`gx-editor-var-card ${isSel ? "is-selected" : ""}`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <Input
                            value={v.label_ar}
                            onChange={(e) => updateVariant(v.id, "label_ar", e.target.value)}
                            className="gx-input h-7 text-xs font-bold text-cyan-100 border-none bg-transparent p-0 focus:bg-black/50 focus:p-1"
                            placeholder="اسم الباقة"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteVariant(v.id);
                            }}
                            className="text-red-400/60 hover:text-red-400 p-1 rounded transition"
                            title="حذف الباقة"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-cyan-100/60">السعر:</span>
                            <Input
                              type="number"
                              step="0.01"
                              value={v.price_jod}
                              onChange={(e) =>
                                updateVariant(v.id, "price_jod", Number(e.target.value) || 0)
                              }
                              className="gx-input h-7 w-20 text-xs font-mono font-bold text-center text-cyan-300"
                            />
                            <span className="text-[11px] font-mono text-cyan-400">د.أ</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-cyan-100/40">قبل:</span>
                            <Input
                              type="number"
                              step="0.01"
                              value={v.old_price_jod || ""}
                              onChange={(e) =>
                                updateVariant(
                                  v.id,
                                  "old_price_jod",
                                  e.target.value ? Number(e.target.value) : null
                                )
                              }
                              placeholder="-"
                              className="gx-input h-7 w-16 text-[11px] font-mono text-center text-cyan-100/50"
                            />
                          </div>
                        </div>

                        {v.tag_ar && (
                          <div className="mt-1.5 text-[10px] text-amber-300 bg-amber-400/10 px-1.5 py-0.5 rounded inline-block font-semibold">
                            {v.tag_ar}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Single Price Fallback Card */
                <div className="bg-black/30 border border-cyan-400/20 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-cyan-200">سعر موحد للمنتج</div>
                    <div className="text-[11px] text-cyan-100/60">
                      يمكنك تحديد السعر المباشر، أو إضافة خيارات وباقات متعددة بأوقات مختلفة
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                      placeholder="10.00"
                      className="gx-input h-9 w-28 text-base font-mono font-bold text-center text-cyan-300"
                    />
                    <span className="text-xs font-bold text-cyan-400">د.أ</span>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Customer Identifier (Player ID / Email) */}
            <div className="gx-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs text-cyan-300 font-bold block">
                    📝 بيانات العميل المطلوبة أثناء الطلب:
                  </Label>
                  <span className="text-[11px] text-cyan-100/60">
                    هل يتطلب هذا المنتج إدخال إيميل الحساب أو رقم اللاعب ID عند إتمام الشراء؟
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setRequiresPlayerId(!requiresPlayerId)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    requiresPlayerId
                      ? "bg-cyan-400/20 text-cyan-300 border border-cyan-400/40"
                      : "bg-white/5 text-cyan-100/40 border border-white/10"
                  }`}
                >
                  {requiresPlayerId ? "✓ مفعل (مطلوب)" : "غير مطلوب"}
                </button>
              </div>

              {requiresPlayerId && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5">
                  <div>
                    <Label className="text-[11px] text-cyan-100/70">عنوان الحقل للعميل:</Label>
                    <Input
                      value={idLabelAr}
                      onChange={(e) => setIdLabelAr(e.target.value)}
                      placeholder="إيميل Adobe ID أو رقم الآيدي"
                      className="gx-input h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-cyan-100/70">نص توضيحي (Placeholder):</Label>
                    <Input
                      value={idPlaceholder}
                      onChange={(e) => setIdPlaceholder(e.target.value)}
                      placeholder="example@email.com"
                      className="gx-input h-8 text-xs mt-1 font-mono"
                      dir="ltr"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 5. About Description & Key Features & How to Redeem */}
            <div className="gx-card p-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs text-cyan-300 font-bold flex items-center gap-1.5">
                    <span>📖</span>
                    <span>عن {nameAr || "المنتج"} (الوصف الشامل المعروض للعميل):</span>
                  </Label>
                  {!descAr && (
                    <button
                      type="button"
                      onClick={() =>
                        setDescAr(
                          `احصل على ${nameAr || "المنتج"} الأصلية بأفضل سعر من GX Store. يشمل التفعيل الرقمي المباشر والرسمي على حسابك مع تسليم فوري وتلقائي فور إتمام الدفع، وضمان ذهبي كامل طوال المدة.`
                        )
                      }
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 bg-cyan-400/10 hover:bg-cyan-400/20 px-2 py-0.5 rounded border border-cyan-400/20 transition"
                    >
                      + اقتراح نص جاهز
                    </button>
                  )}
                </div>
                <Textarea
                  value={descAr}
                  onChange={(e) => setDescAr(e.target.value)}
                  rows={3}
                  placeholder={`احصل على ${nameAr || "المنتج"} الأصلية بأفضل سعر من GX Store...`}
                  className="gx-input h-auto text-xs leading-relaxed"
                />
              </div>

              <div>
                <Label className="text-xs text-cyan-300 font-bold block mb-1">
                  🚀 ملخص وسيلة التسليم (يظهر كشريط مميز):
                </Label>
                <Input
                  value={delMethodAr}
                  onChange={(e) => setDelMethodAr(e.target.value)}
                  placeholder="تسليم رقمي فوري وتلقائي فور إتمام الطلب"
                  className="gx-input h-8 text-xs"
                />
              </div>

              {/* 6. Key Features (2x2 Grid matching storefront) */}
              <div className="space-y-3 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 text-base">★</span>
                    <Label className="text-xs text-cyan-300 font-bold">
                      المميزات والخصائص الرئيسية (Key Features):
                    </Label>
                    <span className="text-[10px] text-cyan-400/80 bg-cyan-400/10 px-2 py-0.5 rounded-full font-mono">
                      {featuresList.length} مميزات
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={addFeature}
                    className="gx-btn-outline py-1 px-2.5 text-xs"
                  >
                    <Plus size={13} /> إضافة ميزة جديدة
                  </button>
                </div>

                {/* 2x2 Feature Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {featuresList.map((f, idx) => (
                    <div
                      key={idx}
                      className="gx-feature-card group relative"
                    >
                      <div className="text-cyan-400 text-lg font-bold select-none pt-0.5 flex-shrink-0">
                        {f.icon || "★"}
                      </div>
                      <div className="flex-1 space-y-1.5 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <Input
                            value={f.title_ar}
                            onChange={(e) => updateFeature(idx, "title_ar", e.target.value)}
                            placeholder="عنوان الميزة (مثل: ضمان رسمي كامل 100%)"
                            className="gx-input h-7 text-xs font-bold text-cyan-100 border-none bg-transparent p-0 focus:bg-black/50 focus:p-1"
                          />
                          <button
                            type="button"
                            onClick={() => removeFeature(idx)}
                            className="text-red-400/50 hover:text-red-400 opacity-0 group-hover:opacity-100 p-1 rounded transition"
                            title="حذف الميزة"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <Textarea
                          value={f.desc_ar || ""}
                          onChange={(e) => updateFeature(idx, "desc_ar", e.target.value)}
                          placeholder="شرح وتفاصيل الميزة..."
                          rows={2}
                          className="gx-input h-auto text-[11.5px] text-cyan-100/70 border-none bg-transparent p-0 focus:bg-black/50 focus:p-1 leading-normal"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 7. How to Redeem Steps (Numbered pill rows) */}
              <div className="space-y-3 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 text-base">🔢</span>
                    <Label className="text-xs text-cyan-300 font-bold">
                      طريقة التفعيل والاستخدام (How to redeem?):
                    </Label>
                    <span className="text-[10px] text-cyan-400/80 bg-cyan-400/10 px-2 py-0.5 rounded-full font-mono">
                      {redeemStepsList.length} خطوات
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={restoreDefaultSteps}
                      className="text-[11px] text-cyan-400/80 hover:text-cyan-300 bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1 transition"
                      title="استعادة خطوات النموذج الافتراضي المناسب لنوع التسليم الحالي"
                    >
                      <RotateCcw size={11} /> استعادة الافتراضي
                    </button>
                    <button
                      type="button"
                      onClick={addRedeemStep}
                      className="gx-btn-outline py-1 px-2.5 text-xs"
                    >
                      <Plus size={13} /> إضافة خطوة
                    </button>
                  </div>
                </div>

                {/* Steps List */}
                <div className="space-y-2">
                  {redeemStepsList.map((step, idx) => (
                    <div key={idx} className="gx-step-row group">
                      <div className="gx-step-num-badge">
                        {idx + 1}
                      </div>
                      <Input
                        value={step}
                        onChange={(e) => updateRedeemStep(idx, e.target.value)}
                        placeholder={`أدخل نص الخطوة ${idx + 1}...`}
                        className="gx-input h-9 text-xs text-cyan-100 flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => removeRedeemStep(idx)}
                        className="text-red-400/50 hover:text-red-400 opacity-0 group-hover:opacity-100 p-1.5 rounded transition"
                        title="حذف هذه الخطوة"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}

                  {redeemStepsList.length === 0 && (
                    <div className="p-3 text-center text-xs text-cyan-100/50 bg-black/20 rounded-xl border border-dashed border-white/10">
                      لا توجد خطوات تفعيل مخصصة. اضغط "إضافة خطوة" أو "استعادة الافتراضي".
                    </div>
                  )}
                </div>
              </div>

              {/* 8. Important Notes (ملاحظات وتنبيهات هامة قبل الطلب) */}
              <div className="space-y-3 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 text-base">⚠️</span>
                    <Label className="text-xs text-amber-300 font-bold">
                      ملاحظات وتنبيهات هامة قبل الطلب (Important Notes):
                    </Label>
                    <span className="text-[10px] text-amber-400/80 bg-amber-400/10 px-2 py-0.5 rounded-full font-mono border border-amber-400/20">
                      {importantNotesList.length} ملاحظات
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={restoreDefaultImportantNotes}
                      className="text-[11px] text-amber-400/80 hover:text-amber-300 bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1 transition"
                      title="استعادة الملاحظات الافتراضية"
                    >
                      <RotateCcw size={11} /> استعادة الافتراضي
                    </button>
                    <button
                      type="button"
                      onClick={addImportantNote}
                      className="gx-btn-outline py-1 px-2.5 text-xs text-amber-300 border-amber-400/30 hover:bg-amber-400/10"
                    >
                      <Plus size={13} /> إضافة ملاحظة
                    </button>
                  </div>
                </div>

                {/* Important Notes List */}
                <div className="space-y-2">
                  {importantNotesList.map((note, idx) => (
                    <div
                      key={idx}
                      className="bg-amber-950/20 border border-amber-500/20 hover:border-amber-500/40 rounded-xl p-2.5 flex items-center gap-3 transition group"
                    >
                      <div className="w-6 h-6 rounded-md bg-amber-500/15 text-amber-400 text-xs font-bold flex items-center justify-center flex-shrink-0 border border-amber-500/30">
                        ✦
                      </div>
                      <Input
                        value={note}
                        onChange={(e) => updateImportantNote(idx, e.target.value)}
                        placeholder={`أدخل نص الملاحظة ${idx + 1}...`}
                        className="gx-input h-8 text-xs text-amber-100/90 flex-1 border-amber-500/20 focus:border-amber-400"
                      />
                      <button
                        type="button"
                        onClick={() => removeImportantNote(idx)}
                        className="text-red-400/50 hover:text-red-400 opacity-0 group-hover:opacity-100 p-1.5 rounded transition"
                        title="حذف هذه الملاحظة"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}

                  {importantNotesList.length === 0 && (
                    <div className="p-3 text-center text-xs text-amber-200/50 bg-amber-950/10 rounded-xl border border-dashed border-amber-500/20">
                      لا توجد ملاحظات هامة مخصصة. اضغط "إضافة ملاحظة" أو "استعادة الافتراضي".
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* STICKY BOTTOM ACTION BAR */}
        <div className="sticky bottom-0 bg-[#070b10]/95 backdrop-blur-md pt-3 pb-1 border-t border-cyan-400/20 flex items-center justify-between gap-4 z-20">
          <div className="flex items-center gap-3 text-xs text-cyan-100/70">
            <span>
              السعر الحالي:{" "}
              <b className="text-cyan-300 font-mono text-sm">
                {activePreviewVariant?.price_jod || basePrice || 0} د.أ
              </b>
            </span>
            <span>•</span>
            <span>
              الباقات:{" "}
              <b className="text-cyan-300">{variantsList.length || 1}</b>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="gx-btn-outline px-4 py-2 text-xs"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={saveProduct}
              disabled={saving}
              className="gx-btn-primary px-6 py-2.5 text-xs shadow-lg shadow-cyan-500/25"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#001018] border-t-transparent rounded-full animate-spin" />
                  جاري الحفظ والمزامنة الفورية...
                </>
              ) : (
                <>
                  <Check size={16} /> حفظ التعديلات في المتجر فوراً
                </>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
