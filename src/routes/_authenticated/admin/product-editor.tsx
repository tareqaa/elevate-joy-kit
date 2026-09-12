/* ============================================================
   GX STORE — FULL-PAGE VISUAL PRODUCT EDITOR (NEW TAB)
   Renders the EXACT storefront product template with live,
   in-place customizable controls, effortless image uploads,
   and instant synchronization to the live store.
   ============================================================ */

import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Save,
  ArrowRight,
  ExternalLink,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Plus,
  Trash2,
  Check,
  AlertTriangle,
  RotateCcw,
  Palette,
  Eye,
  EyeOff,
  Star,
  Layers,
  HelpCircle,
  X,
  ChevronDown,
} from "lucide-react";
import { purgeCatalogCacheFn } from "@/lib/gx/catalog.functions";
import { clearDbVariantsCache } from "@/lib/gx/db-variants";
import { useCurrency } from "@/lib/gx/currency";
import { getDeliveryTypeInfo } from "@/lib/gx/delivery-types";
import { AdobePoster, CanvaPoster, WindowsPoster } from "@/lib/gx/brand-icons";

export const Route = createFileRoute("/_authenticated/admin/product-editor")({
  validateSearch: (search: Record<string, unknown>): { slug?: string; new?: boolean } => ({
    slug: typeof search.slug === "string" ? search.slug : undefined,
    new: search.new === true || search.new === "true",
  }),
  head: () => ({ meta: [{ title: "محرر قالب المنتج المباشر — GX Store Admin" }] }),
  component: FullPageProductEditor,
});

type Category = { id: string; name_ar: string; name_en: string; slug: string };

type VariantItem = {
  id: string;
  cart_id: string;
  label_ar: string;
  label_en: string;
  price_jod: number;
  old_price_jod: number | null;
  tag_ar: string | null;
  tag_en: string | null;
  is_active: boolean;
  sort_order: number;
};

type FeatureItem = {
  id?: string;
  icon: string;
  title_ar: string;
  title_en: string;
  desc_ar: string;
  desc_en: string;
};

const GRADIENT_PRESETS = [
  { name: "Cyber Cyan", val: "linear-gradient(145deg, #090e1c 0%, #0d1a33 55%, #050b18 100%)", color: "#00e5ff" },
  { name: "Neon Purple", val: "linear-gradient(145deg, #1b0a2a 0%, #2e114d 55%, #10051a 100%)", color: "#a855f7" },
  { name: "Emerald Pro", val: "linear-gradient(145deg, #021a1f 0%, #00363a 55%, #011012 100%)", color: "#10b981" },
  { name: "Royal Amber", val: "linear-gradient(145deg, #2a1805 0%, #4a2908 55%, #150b02 100%)", color: "#f59e0b" },
  { name: "Crimson Red", val: "linear-gradient(145deg, #25090f 0%, #42101b 55%, #150408 100%)", color: "#ef4444" },
];

const DELIVERY_OPTIONS = [
  { id: "code", label: "كود رقمي فوري ⚡", desc: "كود تفعيل رقمي يُرسل فوراً للعميل بعد الدفع" },
  { id: "account", label: "حساب خاص جاهز 👤", desc: "حساب خاص وجديد بالكامل يتم تسليم بياناته فوراً" },
  { id: "topup", label: "شحن مباشر وفوري 💳", desc: "شحن رسمي ومباشر داخل حساب العميل" },
  { id: "link", label: "رابط تفعيل رسمي 🔗", desc: "رابط أو دعوة رسمية لتفعيل وترقية الحساب مباشرة" },
  { id: "manual", label: "تسليم يدوي 📦", desc: "معالجة وتسليم يدوي من قبل فريق الدعم الفني" },
];

const REGION_OPTIONS = [
  { id: "Global", labelAr: "عالمي (Global)", labelEn: "Global" },
  { id: "USA", labelAr: "أمريكي (USA)", labelEn: "USA" },
  { id: "Turkey", labelAr: "تركي (Turkey)", labelEn: "Turkey" },
  { id: "KSA", labelAr: "سعودي (KSA)", labelEn: "KSA" },
  { id: "UAE", labelAr: "إماراتي (UAE)", labelEn: "UAE" },
  { id: "Jordan", labelAr: "أردني (Jordan)", labelEn: "Jordan" },
];

function FullPageProductEditor() {
  const { slug: searchSlug, new: isNew } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { format } = useCurrency();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["admin-editor-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name_ar, name_en, slug")
        .order("name_ar");
      if (error) throw error;
      return (data || []) as Category[];
    },
    staleTime: 60_000,
  });

  // Load Product Data if slug provided
  const { data: rawProduct, isLoading: productLoading } = useQuery({
    queryKey: ["admin-editor-product", searchSlug],
    queryFn: async () => {
      if (!searchSlug || isNew) return null;
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("slug", searchSlug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(searchSlug && !isNew),
  });

  // Load Variants
  const { data: rawVariants = [] } = useQuery({
    queryKey: ["admin-editor-variants", rawProduct?.id],
    queryFn: async () => {
      if (!rawProduct?.id) return [];
      const { data, error } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", rawProduct.id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: Boolean(rawProduct?.id),
  });

  // Load Features
  const { data: rawFeatures = [] } = useQuery({
    queryKey: ["admin-editor-features", rawProduct?.id],
    queryFn: async () => {
      if (!rawProduct?.id) return [];
      const { data, error } = await supabase
        .from("product_features")
        .select("*")
        .eq("product_id", rawProduct.id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: Boolean(rawProduct?.id),
  });

  // Local Form State
  const [productId, setProductId] = useState<string | null>(null);
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [taglineAr, setTaglineAr] = useState("");
  const [taglineEn, setTaglineEn] = useState("");
  const [badge, setBadge] = useState("");
  const [basePrice, setBasePrice] = useState<number>(10);
  const [oldPrice, setOldPrice] = useState<number | null>(null);
  const [descriptionAr, setDescriptionAr] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [thumbBg, setThumbBg] = useState("");
  const [deliveryType, setDeliveryType] = useState<string>("code");
  const [region, setRegion] = useState("Global");
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [requiresPlayerId, setRequiresPlayerId] = useState(false);
  const [identifierLabelAr, setIdentifierLabelAr] = useState("");
  const [identifierPlaceholder, setIdentifierPlaceholder] = useState("");

  const [variantsList, setVariantsList] = useState<VariantItem[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [featuresList, setFeaturesList] = useState<FeatureItem[]>([]);
  const [redeemSteps, setRedeemSteps] = useState<string[]>([]);
  const [importantNotes, setImportantNotes] = useState<string[]>([]);
  const [showNoticeBox, setShowNoticeBox] = useState(true);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showImagePanel, setShowImagePanel] = useState(false);

  // Initialize data once fetched
  useEffect(() => {
    if (rawProduct) {
      setProductId(rawProduct.id);
      setNameAr(rawProduct.name_ar || "");
      setNameEn(rawProduct.name_en || "");
      setSlug(rawProduct.slug || "");
      setCategoryId(rawProduct.category_id || "");
      setTaglineAr(rawProduct.tagline_ar || "");
      setTaglineEn(rawProduct.tagline_en || "");
      setBadge(rawProduct.badge || "");
      setBasePrice(Number(rawProduct.base_price_jod) || 0);
      setOldPrice(rawProduct.base_price_jod ? Number((Number(rawProduct.base_price_jod) * 1.25).toFixed(2)) : null);
      setDescriptionAr(rawProduct.description_ar || "");
      setDescriptionEn(rawProduct.description_en || "");
      setImageUrl(rawProduct.image_url || "");
      setThumbBg(rawProduct.thumb_bg || "");
      setDeliveryType(rawProduct.delivery_type || "code");
      setRegion(rawProduct.region || "Global");
      setIsActive(rawProduct.is_active ?? true);
      setIsFeatured(rawProduct.is_featured ?? false);
      setRequiresPlayerId(rawProduct.requires_player_id ?? false);
      setIdentifierLabelAr(rawProduct.identifier_label_ar || "");
      setIdentifierPlaceholder(rawProduct.identifier_placeholder || "");
      setShowNoticeBox(rawProduct.delivery_details?.hide_important_notes !== true);

      // Parse redeem steps
      if (rawProduct.delivery_instructions_ar) {
        try {
          const parsed = JSON.parse(rawProduct.delivery_instructions_ar);
          if (Array.isArray(parsed) && parsed.length > 0) setRedeemSteps(parsed);
          else setRedeemSteps(rawProduct.delivery_instructions_ar.split("\n").filter(Boolean));
        } catch {
          setRedeemSteps(rawProduct.delivery_instructions_ar.split("\n").filter(Boolean));
        }
      } else if (rawProduct.delivery_details?.redeem_steps) {
        setRedeemSteps(rawProduct.delivery_details.redeem_steps);
      } else {
        setRedeemSteps(getDefaultRedeemSteps(rawProduct.delivery_type || "code"));
      }

      // Parse important notes
      if (rawProduct.delivery_details?.important_notes && Array.isArray(rawProduct.delivery_details.important_notes)) {
        setImportantNotes(rawProduct.delivery_details.important_notes);
      } else if (rawProduct.delivery_instructions_en) {
        try {
          const parsed = JSON.parse(rawProduct.delivery_instructions_en);
          if (Array.isArray(parsed)) setImportantNotes(parsed);
          else setImportantNotes(rawProduct.delivery_instructions_en.split("\n").filter(Boolean));
        } catch {
          setImportantNotes(rawProduct.delivery_instructions_en.split("\n").filter(Boolean));
        }
      } else {
        setImportantNotes(getDefaultImportantNotes());
      }
    } else if (isNew) {
      setNameAr("منتج جديد");
      setNameEn("New Product");
      setSlug("new-product-" + Math.floor(Math.random() * 900 + 100));
      setDeliveryType("code");
      setRegion("Global");
      setBasePrice(10);
      setIsActive(true);
      setShowNoticeBox(true);
      setRedeemSteps(getDefaultRedeemSteps("code"));
      setImportantNotes(getDefaultImportantNotes());
      setFeaturesList(getDefaultFeatures());
      setVariantsList([
        {
          id: "temp-1",
          cart_id: "plan-1",
          label_ar: "شهر واحد",
          label_en: "1 Month",
          price_jod: 10,
          old_price_jod: 14,
          tag_ar: null,
          tag_en: null,
          is_active: true,
          sort_order: 0,
        },
      ]);
    }
  }, [rawProduct, isNew]);

  // Sync loaded variants
  useEffect(() => {
    if (rawVariants && rawVariants.length > 0) {
      const mapped = rawVariants.map((v: any, idx: number) => ({
        id: v.id,
        cart_id: v.cart_id || `${slug}-${idx + 1}`,
        label_ar: v.label_ar || "",
        label_en: v.label_en || v.label_ar || "",
        price_jod: Number(v.price_jod) || 0,
        old_price_jod: v.old_price_jod ? Number(v.old_price_jod) : null,
        tag_ar: v.tag_ar || null,
        tag_en: v.tag_en || null,
        is_active: v.is_active ?? true,
        sort_order: v.sort_order ?? idx,
      }));
      setVariantsList(mapped);
      setSelectedVariantId(mapped[0]?.cart_id || "");
    }
  }, [rawVariants, slug]);

  // Sync loaded features
  useEffect(() => {
    if (rawFeatures && rawFeatures.length > 0) {
      setFeaturesList(
        rawFeatures.map((f: any) => ({
          id: f.id,
          icon: f.icon || "★",
          title_ar: f.title_ar || "",
          title_en: f.title_en || f.title_ar || "",
          desc_ar: f.desc_ar || "",
          desc_en: f.desc_en || f.desc_ar || "",
        }))
      );
    } else if (rawProduct && (!rawFeatures || rawFeatures.length === 0)) {
      setFeaturesList(getDefaultFeatures());
    }
  }, [rawFeatures, rawProduct]);

  // Default helpers
  function getDefaultRedeemSteps(type: string): string[] {
    if (type === "code") {
      return [
        "استلم كود التفعيل الرقمي فوراً في صفحة تأكيد الطلب وحسابك في الموقع.",
        "توجه إلى إعدادات النظام أو الموقع الرسمي وأدخل الكود في خانة التفعيل (Redeem / Product Key).",
        "اضغط تفعيل (Activate) ليتم التحقق من الكود وتأكيد التفعيل الأصلي والدائم.",
      ];
    }
    if (type === "account") {
      return [
        "استلم بيانات الحساب (الإيميل وكلمة المرور) فور إتمام عملية الشراء.",
        "سجل الدخول عبر التطبيق أو الموقع الرسمي للمنصة.",
        "قم بتحديث كلمة المرور لبياناتك الخاصة واستمتع باشتراكك.",
      ];
    }
    if (type === "topup") {
      return [
        "أدخل معرّف أو بيانات حسابك أثناء الطلب لتوجيه الشحن بدقة.",
        "يقوم فريق العمل بتنفيذ الشحن لحسابك مباشرة خلال ثوانٍ معدودة.",
        "افتح اللعبة أو التطبيق وستجد الرصيد قد أُضيف بالكامل بنجاح.",
      ];
    }
    return [
      "بعد إتمام الشراء، ستصلك رسالة فورية تتضمن رابط أو دعوة التفعيل الرسمية.",
      "افتح الرابط وقم بتسجيل الدخول إلى حسابك لتأكيد الاشتراك فوراً.",
      "استمتع بكافة مميزات وأدوات الخدمة طوال فترة الاشتراك.",
    ];
  }

  function getDefaultImportantNotes(): string[] {
    return [
      "يرجى التأكد من تطابق المنطقة (Region) والحساب المطلوب قبل إتمام عملية الدفع.",
      "المنتج رقمي ورسمي 100% ويتم تسليمه فوراً وبشكل تلقائي بعد الدفع مباشرة.",
      "ضمان ذهبي كامل وشامل طوال فترة الاشتراك مع دعم فني متواصل 24/7.",
    ];
  }

  function getDefaultFeatures(): FeatureItem[] {
    return [
      { icon: "★", title_ar: "وصول غير محدود وسريع", title_en: "Unlimited Fast Access", desc_ar: "استفادة كاملة بدون انقطاع طوال فترة الاشتراك.", desc_en: "Full access without interruption." },
      { icon: "🔒", title_ar: "ضمان رسمي كامل 100%", title_en: "100% Official Warranty", desc_ar: "ضمان حقيقي يشمل الدعم الفني والاستبدال.", desc_en: "Comprehensive warranty with continuous support." },
      { icon: "⚡", title_ar: "تسليم فوري ومباشر", title_en: "Instant Automated Delivery", desc_ar: "استلام بيانات التفعيل فور إتمام عملية الدفع.", desc_en: "Receive credentials immediately upon checkout." },
      { icon: "✨", title_ar: "تكامل مع مختلف الأجهزة", title_en: "Multi-Platform Compatibility", desc_ar: "يعمل على الهاتف، الحاسوب، واللوحي بسلاسة.", desc_en: "Works seamlessly across mobile, desktop, and web." },
    ];
  }

  // Active Variant & Pricing
  const activeVariant = useMemo(() => {
    return variantsList.find((v) => v.cart_id === selectedVariantId) || variantsList[0] || null;
  }, [variantsList, selectedVariantId]);

  const activePrice = activeVariant ? activeVariant.price_jod : basePrice;
  const activeOldPrice = activeVariant ? activeVariant.old_price_jod : oldPrice;

  const discountPercent = useMemo(() => {
    if (activeOldPrice && activeOldPrice > activePrice) {
      return Math.round(((activeOldPrice - activePrice) / activeOldPrice) * 100);
    }
    return 0;
  }, [activePrice, activeOldPrice]);

  const deliveryInfo = useMemo(() => {
    return getDeliveryTypeInfo({ slug, name: nameAr, productType: deliveryType }, "ar");
  }, [slug, nameAr, deliveryType]);

  const currentCategory = useMemo(() => {
    return categories.find((c) => c.id === categoryId) || null;
  }, [categories, categoryId]);

  // Keyboard shortcut Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    productId,
    nameAr,
    nameEn,
    slug,
    categoryId,
    taglineAr,
    taglineEn,
    badge,
    basePrice,
    descriptionAr,
    descriptionEn,
    imageUrl,
    thumbBg,
    deliveryType,
    region,
    isActive,
    isFeatured,
    requiresPlayerId,
    identifierLabelAr,
    identifierPlaceholder,
    variantsList,
    featuresList,
    redeemSteps,
    importantNotes,
    showNoticeBox,
  ]);

  // Handle local file selection and direct Supabase upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Fast local preview immediately
    const tempUrl = URL.createObjectURL(file);
    setImageUrl(tempUrl);
    setUploadingImage(true);

    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setImageUrl(data.publicUrl);
      toast.success("تم رفع الصورة بنجاح وتطبيقها على الغلاف!");
    } catch (err: any) {
      toast.error("حدث خطأ أثناء رفع الصورة: " + (err.message || ""));
    } finally {
      setUploadingImage(false);
    }
  };

  // Drag and drop image
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    const tempUrl = URL.createObjectURL(file);
    setImageUrl(tempUrl);
    setUploadingImage(true);

    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setImageUrl(data.publicUrl);
      toast.success("تم رفع الصورة بنجاح!");
    } catch (err: any) {
      toast.error("فشل رفع الصورة: " + (err.message || ""));
    } finally {
      setUploadingImage(false);
    }
  };

  // Add Variant
  const addVariant = () => {
    const nextNum = variantsList.length + 1;
    const newV: VariantItem = {
      id: `temp-${Date.now()}`,
      cart_id: `${slug || "plan"}-${nextNum}`,
      label_ar: `باقة ${nextNum}`,
      label_en: `Plan ${nextNum}`,
      price_jod: Number((basePrice * nextNum).toFixed(2)),
      old_price_jod: Number((basePrice * nextNum * 1.3).toFixed(2)),
      tag_ar: null,
      tag_en: null,
      is_active: true,
      sort_order: variantsList.length,
    };
    setVariantsList([...variantsList, newV]);
    setSelectedVariantId(newV.cart_id);
    toast.success("تمت إضافة باقة جديدة");
  };

  // Remove Variant
  const removeVariant = (id: string) => {
    if (variantsList.length <= 1) {
      toast.error("يجب أن يحتوي المنتج على باقة واحدة على الأقل أو سعر أساسي");
      return;
    }
    const updated = variantsList.filter((v) => v.id !== id);
    setVariantsList(updated);
    if (selectedVariantId === id) {
      setSelectedVariantId(updated[0]?.cart_id || "");
    }
  };

  // Update Variant
  const updateVariant = (id: string, field: keyof VariantItem, val: any) => {
    setVariantsList((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: val } : v))
    );
  };

  // Add Feature
  const addFeature = () => {
    setFeaturesList([
      ...featuresList,
      {
        icon: "★",
        title_ar: "ميزة جديدة",
        title_en: "New Feature",
        desc_ar: "شرح الميزة وتفاصيلها للمستخدم.",
        desc_en: "Feature description details.",
      },
    ]);
  };

  // Remove Feature
  const removeFeature = (idx: number) => {
    setFeaturesList(featuresList.filter((_, i) => i !== idx));
  };

  // Update Feature
  const updateFeature = (idx: number, field: keyof FeatureItem, val: string) => {
    setFeaturesList((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, [field]: val } : f))
    );
  };

  // Redeem Steps
  const addRedeemStep = () => {
    setRedeemSteps([...redeemSteps, "خطوة تفعيل جديدة تضاف هنا..."]);
  };
  const removeRedeemStep = (idx: number) => {
    setRedeemSteps(redeemSteps.filter((_, i) => i !== idx));
  };
  const updateRedeemStep = (idx: number, val: string) => {
    setRedeemSteps((prev) => prev.map((s, i) => (i === idx ? val : s)));
  };

  // Important Notes
  const addImportantNote = () => {
    setImportantNotes([...importantNotes, "ملاحظة وتنبيه هام جديد بخصوص هذا المنتج..."]);
  };
  const removeImportantNote = (idx: number) => {
    setImportantNotes(importantNotes.filter((_, i) => i !== idx));
  };
  const updateImportantNote = (idx: number, val: string) => {
    setImportantNotes((prev) => prev.map((n, i) => (i === idx ? val : n)));
  };

  // MAIN SAVE FUNCTION
  const handleSave = async () => {
    if (!nameAr.trim()) {
      toast.error("يرجى كتابة اسم المنتج بالعربية");
      return;
    }
    const finalSlug = (slug.trim() || nameEn.trim() || nameAr.trim())
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (!finalSlug) {
      toast.error("يرجى تحديد معرّف رابط (Slug) صالح للمنتج");
      return;
    }

    setSaving(true);
    try {
      const cleanRedeemSteps = redeemSteps.map((s) => s.trim()).filter(Boolean);
      const cleanNotes = importantNotes.map((n) => n.trim()).filter(Boolean);

      const payload: Record<string, any> = {
        name_ar: nameAr.trim(),
        name_en: nameEn.trim() || nameAr.trim(),
        slug: finalSlug,
        tagline_ar: taglineAr.trim() || null,
        tagline_en: taglineEn.trim() || null,
        description_ar: descriptionAr.trim() || null,
        description_en: descriptionEn.trim() || null,
        category_id: categoryId || null,
        base_price_jod: Number(activePrice) || Number(basePrice) || 0,
        badge: badge.trim() || null,
        image_url: imageUrl.trim() || null,
        thumb_bg: thumbBg.trim() || null,
        delivery_type: deliveryType,
        region: region || "Global",
        is_active: isActive,
        is_featured: isFeatured,
        requires_player_id: requiresPlayerId,
        identifier_label_ar: requiresPlayerId ? (identifierLabelAr.trim() || "معرّف أو إيميل الحساب") : null,
        identifier_placeholder: requiresPlayerId ? (identifierPlaceholder.trim() || "أدخل المعرّف هنا") : null,
        delivery_instructions_ar: JSON.stringify(cleanRedeemSteps),
        delivery_instructions_en: JSON.stringify(cleanNotes),
        delivery_details: {
          redeem_steps: cleanRedeemSteps,
          important_notes: cleanNotes,
          hide_important_notes: !showNoticeBox,
        },
        updated_at: new Date().toISOString(),
      };

      let currentId = productId;

      if (currentId) {
        // Update product in database
        const { error: updateErr } = await supabase.from("products").update(payload).eq("id", currentId);
        if (updateErr) throw updateErr;
      } else {
        // Insert new product
        const { data: newProd, error: insertErr } = await supabase.from("products").insert(payload).select("id").single();
        if (insertErr) throw insertErr;
        currentId = newProd.id;
        setProductId(currentId);
      }

      // 1. Sync Features in product_features
      if (currentId) {
        await supabase.from("product_features").delete().eq("product_id", currentId);
        const cleanFeatures = featuresList.filter((f) => f.title_ar.trim());
        if (cleanFeatures.length > 0) {
          const fPayload = cleanFeatures.map((f, i) => ({
            product_id: currentId,
            icon: f.icon || "★",
            title_ar: f.title_ar.trim(),
            title_en: f.title_en?.trim() || f.title_ar.trim(),
            desc_ar: f.desc_ar?.trim() || null,
            desc_en: f.desc_en?.trim() || f.desc_ar?.trim() || null,
            sort_order: i,
          }));
          await supabase.from("product_features").insert(fPayload as any);
        }
      }

      // 2. Sync Variants in product_variants
      const updatedVariantsForSync: { cart_id: string; price_jod: number; label_ar: string }[] = [];
      if (currentId && variantsList.length > 0) {
        // Get current existing IDs to know which to keep/delete
        const { data: existingVars } = await supabase
          .from("product_variants")
          .select("id")
          .eq("product_id", currentId);

        const currentIdsInDb = (existingVars || []).map((ev) => ev.id);
        const keepingIds = variantsList.filter((v) => !v.id.startsWith("temp-")).map((v) => v.id);
        const idsToDelete = currentIdsInDb.filter((dbId) => !keepingIds.includes(dbId));

        if (idsToDelete.length > 0) {
          await supabase.from("product_variants").delete().in("id", idsToDelete);
        }

        for (let i = 0; i < variantsList.length; i++) {
          const v = variantsList[i];
          const vCartId = v.cart_id || `${finalSlug}-${i + 1}`;
          const vPayload = {
            product_id: currentId,
            label_ar: v.label_ar.trim(),
            label_en: v.label_en.trim() || v.label_ar.trim(),
            price_jod: Number(v.price_jod) || 0,
            old_price_jod: v.old_price_jod ? Number(v.old_price_jod) : null,
            cart_id: vCartId,
            tag_ar: v.tag_ar?.trim() || null,
            tag_en: v.tag_en?.trim() || null,
            is_active: v.is_active,
            sort_order: i,
            delivery_type: deliveryType as any,
          };

          if (v.id.startsWith("temp-")) {
            const { data: insertedV } = await supabase.from("product_variants").insert(vPayload as any).select("id").single();
            if (insertedV) v.id = insertedV.id;
          } else {
            await supabase.from("product_variants").update(vPayload as any).eq("id", v.id);
          }

          updatedVariantsForSync.push({
            cart_id: vCartId,
            price_jod: Number(v.price_jod) || 0,
            label_ar: v.label_ar.trim(),
          });
        }
      }

      // 3. Sync Catalog Prices Overrides in site_settings.catalog_prices
      try {
        const { data: priceRow } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "catalog_prices")
          .maybeSingle();

        const currentPrices = (priceRow?.value && typeof priceRow.value === "object" ? priceRow.value : {}) as Record<string, any>;
        for (const v of variantsList) {
          if (v.cart_id) {
            currentPrices[v.cart_id] = {
              price: Number(v.price_jod) || 0,
              oldPrice: v.old_price_jod ? Number(v.old_price_jod) : null,
            };
          }
        }
        await supabase.from("site_settings").upsert({
          key: "catalog_prices",
          value: currentPrices,
        });
      } catch (e) {
        console.warn("Could not sync catalog_prices", e);
      }

      // 4. Sync Bestseller Snapshot
      try {
        const { data: bestRow } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "home_bestseller_items")
          .maybeSingle();

        if (bestRow && Array.isArray(bestRow.value)) {
          let items = [...(bestRow.value as any[])];
          let changed = false;
          items = items.map((snap) => {
            const matchVariant = updatedVariantsForSync.find((v) => v.cart_id === snap.cartId);
            const isSlugMatch = snap.productSlug === finalSlug || snap.cartId === finalSlug;
            if (matchVariant || isSlugMatch) {
              changed = true;
              return {
                ...snap,
                priceJod: matchVariant ? matchVariant.price_jod : (Number(basePrice) || snap.priceJod),
                nameAr: nameAr.trim(),
                nameEn: nameEn.trim() || nameAr.trim(),
                badge: badge.trim() || null,
                imageUrl: imageUrl.trim() || null,
                thumbBg: thumbBg.trim() || null,
              };
            }
            return snap;
          });

          if (changed) {
            await supabase.from("site_settings").upsert({
              key: "home_bestseller_items",
              value: items,
            });
          }
        }
      } catch (e) {
        console.warn("Could not sync bestsellers", e);
      }

      // 5. Purge Server & Client Caches immediately
      await purgeCatalogCacheFn({ data: { slug: finalSlug } });
      await clearDbVariantsCache();
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("gx_catalog_prices_v1");
          localStorage.removeItem("gx_site_settings_v2");
          localStorage.removeItem("gx_site_settings_v2_ts");
        } catch { /* noop */ }
      }

      // Invalidate queries
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["admin-all-variants"] });
      qc.invalidateQueries({ queryKey: ["admin-editor-product", finalSlug] });
      qc.invalidateQueries({ queryKey: ["admin-editor-variants", currentId] });
      qc.invalidateQueries({ queryKey: ["admin-editor-features", currentId] });

      toast.success("✅ تم حفظ ونشر المنتج وتحديثه في المتجر بنجاح!", {
        action: {
          label: "فتح بالمتجر ↗",
          onClick: () => window.open(`/product/${finalSlug}`, "_blank"),
        },
      });

      // Update URL if new or slug changed
      if (finalSlug !== searchSlug) {
        navigate({ to: "/admin/product-editor", search: { slug: finalSlug } });
      }
    } catch (err: any) {
      toast.error("فشل الحفظ: " + (err.message || "حدث خطأ غير متوقع"));
    } finally {
      setSaving(false);
    }
  };

  // Render poster artwork preview
  const renderVisualPoster = () => {
    if (slug === "windows") {
      return <WindowsPoster cartId={activeVariant?.cart_id || slug} planLabel={activeVariant?.labelAr || nameAr} />;
    }
    if (slug === "adobe") {
      return <AdobePoster />;
    }
    if (slug === "canva") {
      return <CanvaPoster />;
    }

    if (imageUrl) {
      return (
        <div className="driffle-poster-inner full-cover relative">
          <img src={imageUrl} alt={nameAr} className="driffle-cover-img w-full h-full object-cover" />
          <div className="driffle-cover-overlay">
            <div className="driffle-cover-top">
              <span className="driffle-poster-region-badge">{region}</span>
            </div>
            {activeVariant && (
              <div className="driffle-cover-bottom">
                <div className="driffle-cover-duration">{activeVariant.labelAr}</div>
                <div className="driffle-cover-sub">{deliveryInfo.label}</div>
              </div>
            )}
          </div>
        </div>
      );
    }

    const currentBg = thumbBg || GRADIENT_PRESETS[0].val;

    return (
      <div className="driffle-poster-inner" style={{ background: currentBg }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            opacity: 0.7,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: -40,
            left: "50%",
            transform: "translateX(-50%)",
            width: 220,
            height: 140,
            background: "radial-gradient(circle, rgba(0, 229, 255, 0.35) 0%, transparent 70%)",
            filter: "blur(30px)",
            pointerEvents: "none",
          }}
        />
        <div className="driffle-poster-logo-badge">
          <img src="/app/assets/img/gx-logo.png" alt="" />
        </div>
        <div style={{ zIndex: 3, textAlign: "center", padding: "0 18px" }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#ffffff", letterSpacing: 0.5 }}>
            {nameAr || "اسم المنتج"}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#00e5ff", marginTop: 4, textTransform: "uppercase" }}>
            {deliveryInfo.label} • {region}
          </div>
        </div>
        <div className="driffle-poster-footer">
          <div className="driffle-poster-duration">{activeVariant?.labelAr || "باقة قياسية"}</div>
          <span className="driffle-poster-region-badge">{region}</span>
        </div>
      </div>
    );
  };

  if (productLoading) {
    return (
      <div className="min-h-screen bg-[#070912] flex items-center justify-center text-cyan-200" dir="rtl">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm">جاري تحميل بيانات وقالب المنتج...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070912] text-[#e2e8f0] pb-24 font-['Cairo',sans-serif]" dir="rtl">
      {/* 1. TOP STICKY ADMIN BAR */}
      <header className="sticky top-0 z-50 bg-[#070913]/90 backdrop-blur-xl border-b border-cyan-400/20 px-4 py-3 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Right Section: Back + Title + Status */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => window.close()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-cyan-200/70 hover:text-cyan-200 bg-white/5 hover:bg-white/10 transition border border-white/10"
              title="إغلاق التبويبة"
            >
              <ArrowRight size={14} /> إغلاق
            </button>

            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#00e5ff]" />
              <span className="font-bold text-sm text-cyan-100 hidden sm:inline">محرر قالب المنتج التفاعلي</span>
            </div>

            {/* Active / Hidden Status Toggle */}
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition ${
                isActive
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                  : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
              }`}
            >
              {isActive ? <Eye size={13} /> : <EyeOff size={13} />}
              {isActive ? "ظاهر بالمتجر" : "مخفي مؤقتاً"}
            </button>

            {/* Featured Star Toggle */}
            <button
              type="button"
              onClick={() => setIsFeatured(!isFeatured)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                isFeatured
                  ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/40"
                  : "bg-white/5 text-slate-400 border border-white/10 hover:text-yellow-300"
              }`}
            >
              <Star size={13} fill={isFeatured ? "currentColor" : "none"} />
              {isFeatured ? "مميز بالرئيسية" : "عادي"}
            </button>

            {/* Category Selector */}
            <div className="relative">
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="bg-[#0b101d] text-cyan-200 text-xs px-3 py-1.5 rounded-xl border border-cyan-400/25 outline-none focus:border-cyan-400"
              >
                <option value="">اختر القسم والكتالوج...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_ar} ({c.name_en})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Left Section: Live Store Preview & Primary Save Button */}
          <div className="flex items-center gap-2.5">
            {slug && (
              <a
                href={`/product/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-cyan-300 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/30 transition shadow-sm"
              >
                <ExternalLink size={14} /> معاينة بالمتجر ↗
              </a>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-black bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 transition shadow-[0_0_20px_rgba(0,229,255,0.4)] disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  جاري الحفظ والمزامنة...
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>حفظ ونشر التعديلات فوراً</span>
                  <span className="text-[10px] opacity-70 font-mono hidden md:inline">(Ctrl+S)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN STOREFRONT TEMPLATE VIEW */}
      <div className="wrap driffle-page-wrap gx-page-wrap pt-6">
        {/* Breadcrumbs Navigation */}
        <nav className="driffle-breadcrumbs gx-breadcrumbs items-center flex-wrap gap-2 text-xs text-slate-400 mb-6">
          <Link to="/" className="hover:text-cyan-400">
            الرئيسية
          </Link>
          <span className="text-slate-600">&gt;</span>
          <span className="text-cyan-300">{currentCategory?.name_ar || "القسم"}</span>
          <span className="text-slate-600">&gt;</span>
          <span className="text-slate-200 font-bold">{nameAr || "اسم المنتج"}</span>
          <span className="text-cyan-400/50 font-mono text-[11px] mr-2">/product/{slug}</span>
        </nav>

        {/* 2-Column Store Layout (Left: Hero & Content, Right: Sticky Purchase Sidebar) */}
        <div className="driffle-layout gx-layout">
          {/* Main Column */}
          <main className="driffle-main gx-main">
            {/* HERO CARD */}
            <section className="driffle-hero-card gx-hero-card">
              {/* Left Box: Poster Box with Easy Upload UI */}
              <div className="driffle-poster-box gx-poster-box flex flex-col items-center">
                <div className="poster-glow" />

                {/* Poster container with drop support */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  className="w-full relative group cursor-pointer"
                  onClick={() => setShowImagePanel(!showImagePanel)}
                  title="اضغط لتغيير الصورة أو التدرج"
                >
                  {renderVisualPoster()}

                  {/* Hover Overlay Hint */}
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex flex-col items-center justify-center text-center p-4">
                    <Upload size={24} className="text-cyan-400 mb-2 animate-bounce" />
                    <span className="text-xs font-bold text-white">اضغط لتغيير صورة الغلاف</span>
                    <span className="text-[10px] text-cyan-200/80 mt-1">أو اسحب وأفلت صورة هنا</span>
                  </div>
                </div>

                {/* Easy Image Management Toolbar */}
                <div className="w-full mt-3 p-3 rounded-xl bg-[#0b101c] border border-cyan-400/25 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-cyan-200 font-bold">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon size={14} className="text-cyan-400" />
                      تخصيص غلاف المنتج
                    </span>
                    {uploadingImage && <span className="text-[10px] text-amber-300 animate-pulse">جاري الرفع...</span>}
                  </div>

                  {/* Primary Upload Button from Computer */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold bg-cyan-400/15 hover:bg-cyan-400/25 text-cyan-300 border border-cyan-400/30 transition"
                    >
                      <Upload size={14} /> اختر صورة من جهازك
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />

                    {imageUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setImageUrl("");
                          toast.info("تمت إزالة الصورة والرجوع للخلفية الملونة");
                        }}
                        className="p-2 rounded-lg text-red-400 hover:bg-red-500/15 border border-red-500/20 transition"
                        title="إزالة الصورة"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  {/* Image URL Input */}
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="أو الصق رابط صورة مباشر (URL)..."
                      className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-cyan-100 placeholder-white/30 focus:border-cyan-400/50 outline-none"
                    />
                  </div>

                  {/* Preset Gradients */}
                  <div>
                    <div className="text-[10px] text-slate-400 mb-1.5 flex items-center gap-1">
                      <Palette size={11} /> تدرجات لونية جاهزة للغلاف:
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {GRADIENT_PRESETS.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setThumbBg(p.val);
                            toast.success(`تم اختيار تدرج: ${p.name}`);
                          }}
                          className="w-6 h-6 rounded-full border border-white/20 transition transform hover:scale-110 shadow-sm"
                          style={{ background: p.val, boxShadow: thumbBg === p.val ? `0 0 10px ${p.color}` : undefined }}
                          title={p.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Box: Key Product Info (Inline Editable) */}
              <div className="driffle-info-box gx-info-box space-y-4">
                {/* Category & Slug Row */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="driffle-cat-badge gx-cat-badge">{currentCategory?.name_ar || "اختر التصنيف"}</span>
                    <span className="text-xs text-slate-500">Slug:</span>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                      className="bg-black/40 border border-cyan-400/20 rounded-md px-2 py-0.5 text-xs font-mono text-cyan-300 focus:border-cyan-400 outline-none w-36"
                      placeholder="product-slug"
                    />
                  </div>

                  {/* Promo Badge Input */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">الشارة:</span>
                    <input
                      type="text"
                      value={badge}
                      onChange={(e) => setBadge(e.target.value)}
                      placeholder="مثال: 🔥 الأكثر طلباً"
                      className="bg-black/40 border border-cyan-400/20 rounded-lg px-2.5 py-1 text-xs text-amber-300 focus:border-cyan-400 outline-none w-36"
                    />
                  </div>
                </div>

                {/* Product Titles (Editable in-place) */}
                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] text-cyan-400 font-bold block mb-1">اسم المنتج (بالعربية):</label>
                    <input
                      type="text"
                      value={nameAr}
                      onChange={(e) => setNameAr(e.target.value)}
                      className="w-full bg-black/40 border border-cyan-400/30 hover:border-cyan-400/60 focus:border-cyan-400 rounded-xl px-3 py-2 text-lg sm:text-xl font-black text-white outline-none shadow-inner transition"
                      placeholder="اسم المنتج بالعربية..."
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold block mb-1">اسم المنتج بالإنجليزية (Product Name):</label>
                    <input
                      type="text"
                      value={nameEn}
                      onChange={(e) => setNameEn(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 hover:border-white/20 focus:border-cyan-400 rounded-lg px-3 py-1.5 text-sm text-slate-200 outline-none"
                      placeholder="Product Name in English..."
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Tagline / Subtitle */}
                <div>
                  <label className="text-[11px] text-slate-400 font-semibold block mb-1">الوصف الترويجي القصير (Tagline):</label>
                  <input
                    type="text"
                    value={taglineAr}
                    onChange={(e) => setTaglineAr(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 hover:border-white/20 focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-slate-300 outline-none"
                    placeholder="وصف ترويجي قصير يظهر أسفل العنوان مباشرة..."
                  />
                </div>

                {/* Status Pills Grid */}
                <div className="driffle-status-grid gx-status-grid">
                  {/* 1. Region Selector */}
                  <div className="driffle-status-pill gx-status-pill">
                    <div className="driffle-status-icon blue">🌐</div>
                    <div className="driffle-status-text">
                      <span className="driffle-status-label">المنطقة (Region)</span>
                      <select
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        className="bg-transparent text-cyan-200 text-xs font-bold outline-none cursor-pointer"
                      >
                        {REGION_OPTIONS.map((r) => (
                          <option key={r.id} value={r.id} className="bg-[#0b101c] text-white">
                            {r.labelAr}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 2. Delivery Type Selector */}
                  <div className="driffle-status-pill gx-status-pill">
                    <div className="driffle-status-icon" style={{ background: "rgba(0, 229, 255, 0.15)", color: "#00e5ff" }}>
                      {deliveryInfo.icon}
                    </div>
                    <div className="driffle-status-text">
                      <span className="driffle-status-label">نوع التسليم</span>
                      <select
                        value={deliveryType}
                        onChange={(e) => {
                          const nextType = e.target.value;
                          setDeliveryType(nextType);
                          // Auto update steps if empty or user wants
                          if (redeemSteps.length <= 3) {
                            setRedeemSteps(getDefaultRedeemSteps(nextType));
                          }
                        }}
                        className="bg-transparent text-cyan-200 text-xs font-bold outline-none cursor-pointer"
                      >
                        {DELIVERY_OPTIONS.map((d) => (
                          <option key={d.id} value={d.id} className="bg-[#0b101c] text-white">
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Customer Identifier Toggle */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-cyan-200">
                    <input
                      type="checkbox"
                      checked={requiresPlayerId}
                      onChange={(e) => setRequiresPlayerId(e.target.checked)}
                      className="w-4 h-4 rounded border-cyan-400 text-cyan-400 focus:ring-0"
                    />
                    <span>طلب بيانات إضافية من العميل عند الشراء؟ (مثل Player ID أو الإيميل)</span>
                  </label>

                  {requiresPlayerId && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div>
                        <span className="text-[10px] text-slate-400">عنوان الحقل المطلوب:</span>
                        <input
                          type="text"
                          value={identifierLabelAr}
                          onChange={(e) => setIdentifierLabelAr(e.target.value)}
                          placeholder="مثال: Player ID أو معرف الحساب"
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-cyan-400"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400">تلميح الحقل (Placeholder):</span>
                        <input
                          type="text"
                          value={identifierPlaceholder}
                          onChange={(e) => setIdentifierPlaceholder(e.target.value)}
                          placeholder="مثال: أدخل معرف اللاعب هنا..."
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-cyan-400"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* 3. VARIATIONS / PLANS SECTION (INLINE EDITABLE CARDS) */}
            <section className="driffle-variations-box gx-variations-box mt-6">
              <div className="driffle-variations-header gx-variations-header flex items-center justify-between flex-wrap gap-2">
                <span className="driffle-var-heading gx-var-heading flex items-center gap-2">
                  <span>⏱️</span>
                  <span className="font-bold text-sm">الباقات والمدد والأسعار (Plans & Pricing)</span>
                </span>

                <button
                  type="button"
                  onClick={addVariant}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-cyan-300 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/30 transition"
                >
                  <Plus size={14} /> إضافة باقة جديدة
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                {variantsList.map((v, idx) => {
                  const isSelected = v.cart_id === selectedVariantId;
                  const vDiscount =
                    v.old_price_jod && v.old_price_jod > v.price_jod
                      ? Math.round(((v.old_price_jod - v.price_jod) / v.old_price_jod) * 100)
                      : 0;

                  return (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVariantId(v.cart_id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? "bg-cyan-500/[0.08] border-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.15)]"
                          : "bg-black/40 border-white/10 hover:border-cyan-400/40"
                      }`}
                    >
                      {/* Top bar of card */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-1">
                          <input
                            type="radio"
                            checked={isSelected}
                            onChange={() => setSelectedVariantId(v.cart_id)}
                            className="text-cyan-400"
                            title="اختيار كباقة نشطة للشريط الجانبي"
                          />
                          <input
                            type="text"
                            value={v.label_ar}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => updateVariant(v.id, "label_ar", e.target.value)}
                            placeholder="اسم الباقة (مثال: شهر واحد)"
                            className="bg-transparent font-bold text-sm text-cyan-100 border-b border-white/10 focus:border-cyan-400 outline-none w-full"
                          />
                        </div>

                        {variantsList.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeVariant(v.id);
                            }}
                            className="p-1 rounded text-red-400 hover:bg-red-500/20 transition"
                            title="حذف الباقة"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      {/* English Label & Tag */}
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div>
                          <span className="text-[10px] text-slate-500 block">بالإنجليزي:</span>
                          <input
                            type="text"
                            value={v.label_en}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => updateVariant(v.id, "label_en", e.target.value)}
                            placeholder="1 Month"
                            dir="ltr"
                            className="w-full bg-black/30 border border-white/10 rounded px-2 py-0.5 text-xs text-slate-300 outline-none"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">شارة ترويجية:</span>
                          <input
                            type="text"
                            value={v.tag_ar || ""}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => updateVariant(v.id, "tag_ar", e.target.value)}
                            placeholder="مثال: الأوفر"
                            className="w-full bg-black/30 border border-white/10 rounded px-2 py-0.5 text-xs text-amber-300 outline-none"
                          />
                        </div>
                      </div>

                      {/* Pricing Row */}
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] text-slate-400 block">السعر (د.أ):</span>
                          <input
                            type="number"
                            step="0.01"
                            value={v.price_jod}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => updateVariant(v.id, "price_jod", Number(e.target.value))}
                            className="w-20 bg-black/50 border border-cyan-400/40 rounded px-2 py-1 text-sm font-bold text-cyan-300 outline-none"
                          />
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 block">قبل الخصم:</span>
                          <input
                            type="number"
                            step="0.01"
                            value={v.old_price_jod || ""}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              updateVariant(v.id, "old_price_jod", e.target.value ? Number(e.target.value) : null)
                            }
                            placeholder="اختياري"
                            className="w-20 bg-black/50 border border-white/10 rounded px-2 py-1 text-xs text-slate-400 line-through outline-none"
                          />
                        </div>

                        {vDiscount > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            -{vDiscount}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 4. IMPORTANT NOTICE BOX (WITH TOGGLE TO HIDE/SHOW ON STOREFRONT) */}
            <section className="driffle-notice-box gx-notice-box mt-6" style={{ flexDirection: "column", gap: 16 }}>
              <div className="flex items-center justify-between flex-wrap gap-3 w-full border-b border-amber-500/20 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle size={17} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                      <span>تنبيه وتعليمات هامة (Important Notice)</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold">
                        يظهر أعلى الصفحة
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      الصندوق الإرشادي الذهبي الذي يظهر مباشرة تحت باقات المنتج. يمكنك إخفاؤه أو تخصيص بنوده.
                    </p>
                  </div>
                </div>

                {/* Admin Toggle Switch */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNoticeBox(!showNoticeBox)}
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      showNoticeBox
                        ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                        : "bg-red-500/20 border border-red-500/40 text-red-300"
                    }`}
                  >
                    {showNoticeBox ? (
                      <>
                        <Eye size={14} />
                        <span>🟢 الصندوق مفعل وظاهر بالمتجر</span>
                      </>
                    ) : (
                      <>
                        <EyeOff size={14} />
                        <span>⚪ الصندوق مخفي بالكامل من المتجر</span>
                      </>
                    )}
                  </button>

                  {showNoticeBox && (
                    <>
                      <button
                        type="button"
                        onClick={() => setImportantNotes(getDefaultImportantNotes())}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] text-slate-400 hover:text-slate-200 bg-white/5 transition"
                        title="استعادة البنود الافتراضية"
                      >
                        <RotateCcw size={12} /> الافتراضي
                      </button>
                      <button
                        type="button"
                        onClick={addImportantNote}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 transition shadow-sm"
                      >
                        <Plus size={13} /> إضافة بند تنبيه
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Notice Points Content or Disabled State */}
              {showNoticeBox ? (
                <div className="w-full space-y-2.5">
                  {importantNotes.length === 0 ? (
                    <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-center text-xs text-amber-300/80">
                      لا توجد بنود حالياً. اضغط "إضافة بند تنبيه" لكتابة ملاحظات أو استعد الافتراضي.
                    </div>
                  ) : (
                    importantNotes.map((note, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 bg-black/40 hover:bg-black/60 p-3 rounded-xl border border-white/5 hover:border-amber-500/30 transition"
                      >
                        <span className="text-amber-400 font-bold text-sm flex-shrink-0 mt-0.5">✦</span>
                        <textarea
                          value={note}
                          onChange={(e) => updateImportantNote(idx, e.target.value)}
                          rows={2}
                          className="flex-1 bg-transparent border-0 text-xs text-slate-200 outline-none leading-relaxed resize-y"
                          placeholder="اكتب تفاصيل التنبيه أو الملاحظة الهامة للمشتري..."
                        />
                        <button
                          type="button"
                          onClick={() => removeImportantNote(idx)}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 transition flex-shrink-0"
                          title="حذف هذا البند"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="w-full p-4 rounded-xl bg-black/30 border border-dashed border-white/10 text-center flex flex-col items-center justify-center gap-2">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
                    <EyeOff size={15} />
                    <span>تم إخفاء صندوق التنبيهات من صفحة المنتج للمستخدمين.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNoticeBox(true)}
                    className="text-[11px] text-cyan-400 hover:underline font-bold"
                  >
                    انقر هنا لإعادة تفعيله وإظهاره في المتجر
                  </button>
                </div>
              )}
            </section>

            {/* 5. ABOUT DESCRIPTION SECTION */}
            <section className="driffle-desc-box gx-desc-box mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="driffle-section-heading gx-section-heading text-sm font-bold flex items-center gap-2">
                  <span>📝</span>
                  <span>عن الخدمة والمنتج (Description)</span>
                </h2>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block mb-1">الوصف التفصيلي (عربي):</span>
                <textarea
                  value={descriptionAr}
                  onChange={(e) => setDescriptionAr(e.target.value)}
                  rows={3}
                  placeholder="اكتب شرحاً وافياً عن مميزات ومواصفات المنتج وطريقة الاستفادة منه..."
                  className="w-full bg-black/40 border border-white/10 hover:border-cyan-400/30 focus:border-cyan-400 rounded-xl p-3 text-xs leading-relaxed text-slate-200 outline-none"
                />
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block mb-1">الوصف بالإنجليزي (English):</span>
                <textarea
                  value={descriptionEn}
                  onChange={(e) => setDescriptionEn(e.target.value)}
                  rows={2}
                  placeholder="Detailed description in English..."
                  dir="ltr"
                  className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-xs leading-relaxed text-slate-300 outline-none"
                />
              </div>
            </section>

            {/* 5. KEY FEATURES (2X2 GRID) */}
            <section className="driffle-desc-box gx-desc-box mt-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span className="text-cyan-400">★</span>
                  <span>المميزات والخصائص الرئيسية (Key Features)</span>
                </h3>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFeaturesList(getDefaultFeatures())}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] text-slate-400 hover:text-slate-200 bg-white/5 transition"
                  >
                    <RotateCcw size={12} /> استعادة الافتراضي
                  </button>
                  <button
                    type="button"
                    onClick={addFeature}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-cyan-300 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/30 transition"
                  >
                    <Plus size={12} /> إضافة ميزة
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {featuresList.map((f, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-black/40 border border-white/10 hover:border-cyan-400/30 transition relative space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={f.icon}
                          onChange={(e) => updateFeature(idx, "icon", e.target.value)}
                          className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-400/20 text-center text-sm text-cyan-300 font-bold outline-none"
                          title="أيقونة أو إيموجي"
                        />
                        <input
                          type="text"
                          value={f.title_ar}
                          onChange={(e) => updateFeature(idx, "title_ar", e.target.value)}
                          placeholder="عنوان الميزة"
                          className="flex-1 bg-transparent font-bold text-xs text-cyan-100 border-b border-white/10 focus:border-cyan-400 outline-none pb-0.5"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFeature(idx)}
                        className="p-1 rounded text-red-400 hover:bg-red-500/20 transition"
                        title="حذف الميزة"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <textarea
                      value={f.desc_ar}
                      onChange={(e) => updateFeature(idx, "desc_ar", e.target.value)}
                      rows={2}
                      placeholder="شرح وتفاصيل الميزة للمستخدم..."
                      className="w-full bg-black/20 border border-white/5 rounded-lg p-2 text-xs text-slate-300 outline-none focus:border-cyan-400/30"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* 6. HOW TO REDEEM STEPS (NUMBERED CARDS) */}
            <section className="driffle-desc-box gx-desc-box mt-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span className="text-cyan-400 font-mono">#</span>
                  <span>طريقة التفعيل والاستخدام (How to Redeem Steps)</span>
                </h3>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRedeemSteps(getDefaultRedeemSteps(deliveryType))}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] text-slate-400 hover:text-slate-200 bg-white/5 transition"
                  >
                    <RotateCcw size={12} /> استعادة خطوات التسليم الافتراضية
                  </button>
                  <button
                    type="button"
                    onClick={addRedeemStep}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-cyan-300 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/30 transition"
                  >
                    <Plus size={12} /> إضافة خطوة
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                {redeemSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-xl bg-black/40 border border-white/10 hover:border-cyan-400/30 transition"
                  >
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 font-bold text-xs flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </div>

                    <textarea
                      value={step}
                      onChange={(e) => updateRedeemStep(idx, e.target.value)}
                      rows={2}
                      className="flex-1 bg-transparent border-0 text-xs text-slate-200 outline-none leading-relaxed resize-y"
                      placeholder={`أدخل تفاصيل الخطوة ${idx + 1}...`}
                    />

                    <button
                      type="button"
                      onClick={() => removeRedeemStep(idx)}
                      className="p-1.5 rounded text-red-400 hover:bg-red-500/20 transition flex-shrink-0"
                      title="حذف الخطوة"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </main>

          {/* RIGHT COLUMN: STICKY PURCHASE SIDEBAR */}
          <aside className="driffle-sidebar gx-sidebar">
            <div className="driffle-buy-card gx-buy-card sticky top-20">
              <div className="text-[11px] font-bold text-cyan-400/80 mb-2 flex items-center justify-between">
                <span>معاينة الشراء بالسلة</span>
                <span className="text-[10px] text-slate-500 font-normal">عرض حي تفاعلي</span>
              </div>

              {/* Price Box */}
              <div className="driffle-price-box gx-price-box">
                <span className="driffle-price-label gx-price-label">
                  {activeVariant?.labelAr || nameAr || "الباقة المحددة"}
                </span>

                <div className="driffle-price-main gx-price-main">
                  <span className="driffle-price-val gx-price-val">{format(activePrice)}</span>
                  {activeOldPrice && activeOldPrice > activePrice && (
                    <span className="driffle-price-old gx-price-old">{format(activeOldPrice)}</span>
                  )}
                  {discountPercent > 0 && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mr-2">
                      -{discountPercent}%
                    </span>
                  )}
                </div>

                <div className="driffle-price-note gx-price-note">
                  السعر النهائي شامل الضريبة والتسليم الفوري ⓘ
                </div>
              </div>

              {/* Simulated Purchase Buttons */}
              <div className="driffle-cta-row gx-cta-row">
                <button
                  type="button"
                  className="driffle-cart-btn gx-cart-btn opacity-80 cursor-default"
                  title="زر إضافة للسلة في صفحة المتجر"
                >
                  🛒
                </button>
                <button
                  type="button"
                  className="driffle-buy-now-btn gx-buy-now-btn opacity-90 cursor-default"
                  title="زر الشراء المباشر"
                >
                  <span>🛍️</span>
                  <span>شراء الآن</span>
                </button>
              </div>

              {/* Trust Box */}
              <div className="driffle-trust-box gx-trust-box">
                <div className="driffle-trust-item gx-trust-item">
                  <span className="driffle-trust-icon gx-trust-icon">⚡</span>
                  <span>تسليم فوري ومباشر بعد الدفع</span>
                </div>
                <div className="driffle-trust-item gx-trust-item">
                  <span className="driffle-trust-icon gx-trust-icon">🎧</span>
                  <span>دعم فني وخدمة عملاء 24/7</span>
                </div>
                <div className="driffle-trust-item gx-trust-item">
                  <span className="driffle-trust-icon gx-trust-icon">🛡️</span>
                  <span>بائع موثوق وضمان رسمي 100%</span>
                </div>
              </div>

              {/* Primary Floating Action Button inside Sidebar */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-black text-black bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 transition shadow-[0_0_20px_rgba(0,229,255,0.4)] disabled:opacity-50 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      جاري النشر...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>حفظ ونشر التعديلات فوراً</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
