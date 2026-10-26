import { resolveRegionLabel } from "@/lib/gx/region";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { CatalogProduct, CatalogVariant } from "@/lib/gx/catalog.functions";
import { useCurrency } from "@/lib/gx/currency";
import { useCart } from "@/lib/gx/cart";
import { useLang } from "@/lib/gx/i18n";
import { CART_ADDED_EVENT } from "./AddedToCartModal";
import { getDeliveryTypeInfo } from "@/lib/gx/delivery-types";
import { AdobePoster, CanvaPoster, WindowsPoster, TodPoster } from "@/lib/gx/brand-icons";
import { useSiteSettings, getEffectiveStockLimit } from "@/lib/gx/site-settings";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  resolveProductRequirementType,
  getRememberedWhatsApp,
  setRememberedWhatsApp,
  getRememberedEmail,
  setRememberedEmail,
  isRememberContactEnabled,
  setRememberContactEnabled,
} from "@/lib/gx/contact-storage";
import { CountryPhoneInput, detectUserCountry, fetchUserCountryOnce, COUNTRIES } from "@/lib/gx/country-phone";

function renderStepContent(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "var(--cyan, #00e5ff)",
            textDecoration: "underline",
            fontWeight: 700,
            wordBreak: "break-all",
            margin: "0 4px",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {part} ↗
        </a>
      );
    }
    return part;
  });
}

/* ============================================================
   COUNTRY GEO DETECTION & LOCALIZATION
   ============================================================ */
const COUNTRY_MAP: Record<string, { ar: string; en: string }> = {
  QA: { ar: "قطر", en: "Qatar" },
  JO: { ar: "الأردن", en: "Jordan" },
  SA: { ar: "السعودية", en: "Saudi Arabia" },
  AE: { ar: "الإمارات", en: "UAE" },
  KW: { ar: "الكويت", en: "Kuwait" },
  BH: { ar: "البحرين", en: "Bahrain" },
  OM: { ar: "عُمان", en: "Oman" },
  IQ: { ar: "العراق", en: "Iraq" },
  LB: { ar: "لبنان", en: "Lebanon" },
  SY: { ar: "سوريا", en: "Syria" },
  PS: { ar: "فلسطين", en: "Palestine" },
  EG: { ar: "مصر", en: "Egypt" },
  LY: { ar: "ليبيا", en: "Libya" },
  TN: { ar: "تونس", en: "Tunisia" },
  DZ: { ar: "الجزائر", en: "Algeria" },
  MA: { ar: "المغرب", en: "Morocco" },
  TR: { ar: "تركيا", en: "Turkey" },
  US: { ar: "أمريكا", en: "USA" },
  GB: { ar: "بريطانيا", en: "UK" },
};


function useUserCountry() {
  const [geo, setGeo] = useState<{ code: string; ar: string; en: string }>(() => {
    const c = detectUserCountry();
    return {
      code: c.code,
      ar: c.nameAr,
      en: c.nameEn,
    };
  });

  useEffect(() => {
    void fetchUserCountryOnce().then((code) => {
      if (code) {
        const c = COUNTRIES.find((x) => x.code === code);
        if (c) {
          setGeo({ code: c.code, ar: c.nameAr, en: c.nameEn });
        }
      }
    });

    const handler = (e: Event) => {
      const code = (e as CustomEvent).detail;
      if (code) {
        const c = COUNTRIES.find((x) => x.code === code);
        if (c) {
          setGeo({ code: c.code, ar: c.nameAr, en: c.nameEn });
        }
      }
    };
    window.addEventListener("gx:country-detected", handler);
    return () => window.removeEventListener("gx:country-detected", handler);
  }, []);

  return geo;
}

export function GxProductTemplate({
  product,
  initialVariant,
}: {
  product: CatalogProduct;
  initialVariant?: string;
}) {
  const { lang, t } = useLang();
  const ar = lang === "ar";
  const { format } = useCurrency();
  const cart = useCart();
  const navigate = useNavigate();
  const siteSettings = useSiteSettings();

  const pick = (arText?: string | null, enText?: string | null) =>
    (ar ? arText || enText : enText || arText) || "";

  const name = pick(product.nameAr, product.nameEn);
  const tagline = pick(product.taglineAr, product.taglineEn);
  const description = pick(product.descriptionAr, product.descriptionEn);
  const rawCat = pick(product.categoryNameAr, product.categoryNameEn);
  const isAiProduct =
    product.slug.includes("gemini") ||
    product.slug.includes("lovable") ||
    product.slug.includes("notion") ||
    product.slug.includes("chatgpt") ||
    product.slug.includes("ai");

  const isStreamingProduct =
    product.slug.includes("tod") ||
    product.slug.includes("youtube") ||
    product.categorySlug === "streaming";

  const categoryName = rawCat && rawCat.toLowerCase() !== name.toLowerCase()
    ? rawCat
    : (isAiProduct
        ? (ar ? "البرامج والتطبيقات" : "Apps & Software")
        : (isStreamingProduct
            ? (ar ? "اشتراكات المشاهدة" : "Streaming Subscriptions")
            : (ar ? "الاشتراكات والبرامج" : "Subscriptions & Software")));

  const variants = useMemo(() => {
    if (product.variants && product.variants.length > 0) {
      return product.variants;
    }
    const fallbackPrice =
      typeof product.basePriceJod === "number" && product.basePriceJod > 0
        ? product.basePriceJod
        : 0;
    const fallbackOldPrice =
      typeof product.oldPriceJod === "number" && product.oldPriceJod > 0
        ? product.oldPriceJod
        : fallbackPrice > 0
        ? Number((fallbackPrice * 1.25).toFixed(2))
        : null;

    return [
      {
        cartId: product.slug,
        labelAr: product.nameAr,
        labelEn: product.nameEn,
        price: fallbackPrice,
        oldPrice: fallbackOldPrice,
        tagAr: null,
        tagEn: null,
        planGroup: null,
        region: product.region || "Global",
        deliveryType: product.deliveryType,
      },
    ];
  }, [product, ar]);

  const resolveTargetVariantId = (target?: string | null): string | null => {
    if (!target) return null;
    const clean = decodeURIComponent(target).trim().replace(/^#/, "");
    if (!clean) return null;

    // 1. Exact cartId match
    const exact = variants.find((v) => v.cartId === clean);
    if (exact) return exact.cartId;

    // 2. Case-insensitive cartId match
    const lower = clean.toLowerCase();
    const caseMatch = variants.find((v) => v.cartId.toLowerCase() === lower);
    if (caseMatch) return caseMatch.cartId;

    // 3. Substring match (e.g. "gpu-2m" matches "gpu-2m-acct")
    const subMatch = variants.find(
      (v) =>
        v.cartId.toLowerCase().includes(lower) ||
        lower.includes(v.cartId.toLowerCase()),
    );
    if (subMatch) return subMatch.cartId;

    // 4. Label match (e.g. "شهرين" or "2 months")
    const labelMatch = variants.find((v) => {
      const la = (v.labelAr || "").toLowerCase();
      const le = (v.labelEn || "").toLowerCase();
      return (
        (la && (la.includes(lower) || lower.includes(la))) ||
        (le && (le.includes(lower) || lower.includes(le)))
      );
    });
    if (labelMatch) return labelMatch.cartId;

    return null;
  };

  const getUrlTargetVariant = (): string | null => {
    if (initialVariant) {
      const match = resolveTargetVariantId(initialVariant);
      if (match) return match;
    }
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const candidates = [
        params.get("variant"),
        params.get("cartId"),
        params.get("plan"),
        params.get("id"),
        params.get("v"),
        window.location.hash ? window.location.hash.replace("#", "") : null,
      ];
      for (const cand of candidates) {
        const match = resolveTargetVariantId(cand);
        if (match) return match;
      }
    }
    return null;
  };

  const initialVariantId = useMemo(() => {
    return getUrlTargetVariant() || variants[0]?.cartId || "";
  }, [variants, initialVariant]);

  const [selectedVariantId, setSelectedVariantId] = useState<string>(initialVariantId);

  // Keep state in sync with URL and initialVariant
  useEffect(() => {
    const target = getUrlTargetVariant();
    if (target && target !== selectedVariantId) {
      setSelectedVariantId(target);
    }

    const handleUrlChange = () => {
      const nextTarget = getUrlTargetVariant();
      if (nextTarget) {
        setSelectedVariantId(nextTarget);
      }
    };

    window.addEventListener("popstate", handleUrlChange);
    window.addEventListener("hashchange", handleUrlChange);
    return () => {
      window.removeEventListener("popstate", handleUrlChange);
      window.removeEventListener("hashchange", handleUrlChange);
    };
  }, [variants, initialVariant]);

  const handleSelectVariant = (cartId: string) => {
    setSelectedVariantId(cartId);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("variant", cartId);
      window.history.replaceState(null, "", url.toString());
    }
  };
  const [isWishlisted, setIsWishlisted] = useState<boolean>(false);
  const [tooltipOpen, setTooltipOpen] = useState<boolean>(false);
  const [addedCart, setAddedCart] = useState<boolean>(false);
  const [todFilterGroup, setTodFilterGroup] = useState<string>("all");
  const requirementType = useMemo(() => {
    return resolveProductRequirementType({
      slug: product.slug,
      name: product.nameEn,
      nameAr: product.nameAr,
      deliveryType: product.deliveryType,
      identifierLabelAr: product.identifierLabelAr,
      requiresPlayerId: product.requiresPlayerId,
    });
  }, [product.slug, product.nameEn, product.nameAr, product.deliveryType, product.identifierLabelAr, product.requiresPlayerId]);

  const [rememberMe, setRememberMe] = useState<boolean>(() => isRememberContactEnabled());
  const [targetInput, setTargetInput] = useState<string>(() => {
    const req = resolveProductRequirementType({
      slug: product.slug,
      name: product.nameEn,
      nameAr: product.nameAr,
      deliveryType: product.deliveryType,
      identifierLabelAr: product.identifierLabelAr,
      requiresPlayerId: product.requiresPlayerId,
    });
    if (req === "whatsapp") return getRememberedWhatsApp();
    return "";
  });
  const [inputError, setInputError] = useState<boolean>(false);
  const [formattedWhatsApp, setFormattedWhatsApp] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep targetInput in sync if remembered WhatsApp updates
  useEffect(() => {
    if (!targetInput && requirementType === "whatsapp") {
      const ph = getRememberedWhatsApp();
      if (ph) setTargetInput(ph);
    }
  }, [requirementType]);

  // Social & Link Input Detection
  const isLikeProduct = useMemo(() => {
    const s = (product.slug || "").toLowerCase();
    const n = (product.nameAr || "").toLowerCase();
    return s.includes("like") || n.includes("لايك");
  }, [product.slug, product.nameAr]);

  const isFollowerProduct = useMemo(() => {
    const s = (product.slug || "").toLowerCase();
    const n = (product.nameAr || "").toLowerCase();
    return s.includes("follow") || n.includes("متابع");
  }, [product.slug, product.nameAr]);

  const isSocialProduct = useMemo(() => {
    const s = (product.slug || "").toLowerCase();
    const c = (categoryName || "").toLowerCase();
    return (
      s.includes("instagram") ||
      s.includes("facebook") ||
      s.includes("tiktok") ||
      s.includes("twitter") ||
      c.includes("social") ||
      c.includes("سوشال") ||
      isLikeProduct ||
      isFollowerProduct
    );
  }, [product.slug, categoryName, isLikeProduct, isFollowerProduct]);

  const isTod = useMemo(() => {
    const s = (product.slug || "").toLowerCase();
    const n = (product.nameAr || "").toLowerCase();
    return s === "tod" || s.startsWith("tod-") || n.includes("تود") || n.startsWith("tod");
  }, [product.slug, product.nameAr]);

  const requiresCustomerInput = useMemo(() => {
    if (isTod || product.deliveryType === "code" || product.deliveryType === "key") {
      return false;
    }
    return (
      requirementType !== "none" ||
      Boolean(
        product.requiresPlayerId ||
        (product.identifierLabelAr && requirementType !== "none") ||
        isSocialProduct
      )
    );
  }, [isTod, product.deliveryType, requirementType, product.requiresPlayerId, product.identifierLabelAr, isSocialProduct]);

  const targetLabel = useMemo(() => {
    if (requirementType === "whatsapp") {
      return ar
        ? "رقم الواتساب للتواصل والتفعيل *"
        : "WhatsApp Phone Number *";
    }
    if (requirementType === "email") {
      return ar
        ? "الإيميل المراد تفعيل الاشتراك عليه *"
        : "Email for Activation *";
    }
    if (isLikeProduct) {
      return ar
        ? "رابط المنشور أو الريلز (Post / Reel Link) *"
        : "Post or Reel Link *";
    }
    if (isFollowerProduct || isSocialProduct) {
      return ar
        ? "رابط الحساب أو الصفحة (Profile / Page Link) *"
        : "Profile or Page Link *";
    }
    return (
      pick(product.identifierLabelAr, product.identifierLabelEn) ||
      (ar ? "معرّف الحساب أو الرابط المطلوب *" : "Account ID or Link *")
    );
  }, [requirementType, isLikeProduct, isFollowerProduct, isSocialProduct, product.identifierLabelAr, product.identifierLabelEn, ar]);

  const targetPlaceholder = useMemo(() => {
    if (requirementType === "whatsapp") {
      return "07XXXXXXXX";
    }
    if (requirementType === "email") {
      return "name@example.com";
    }
    if (isLikeProduct) {
      return ar
        ? "https://www.instagram.com/p/... أو رابط المنشور العام"
        : "https://www.instagram.com/p/... or public post link";
    }
    if (isFollowerProduct || isSocialProduct) {
      return ar
        ? "https://www.instagram.com/... أو @username أو رابط الحساب"
        : "https://... or @username or profile link";
    }
    return (
      product.identifierPlaceholder ||
      (ar ? "أدخل المعرّف أو الرابط المطلوب هنا" : "Enter requested identifier or link")
    );
  }, [requirementType, isLikeProduct, isFollowerProduct, isSocialProduct, product.identifierPlaceholder, ar]);

  const targetHint = useMemo(() => {
    if (requirementType === "whatsapp") {
      return ar
        ? "سيتواصل معك فريقنا لتفعيل اشتراكك بأسرع وقت."
        : "Our team will contact you to activate your subscription as soon as possible.";
    }
    if (requirementType === "email") {
      return ar
        ? "اكتب الإيميل الذي ترغب بتفعيل الاشتراك عليه، حيث ستصلك دعوة تفعيل رسمية."
        : "Enter the email to receive the official activation invitation.";
    }
    if (isLikeProduct) {
      return ar
        ? "⚠️ تأكد أن الحساب والمنشور عام (Public) لتصل اللايكات بنجاح ودون أي تأخير."
        : "⚠️ Ensure account & post are Public for delivery to succeed without delays.";
    }
    if (isFollowerProduct || isSocialProduct) {
      return ar
        ? "⚠️ يجب أن يكون الحساب عام (Public) ولا تقم بتغيير اسم المستخدم أثناء فترة التنفيذ."
        : "⚠️ Profile must be Public. Do not change username during processing.";
    }
    return null;
  }, [requirementType, isLikeProduct, isFollowerProduct, isSocialProduct, ar]);

  const activeVariant: CatalogVariant =
    variants.find((v) => v.cartId === selectedVariantId) || variants[0];

  const activePrice = activeVariant.price || 0;

  // Stock limit & Quantity resolution
  const stockLimit = useMemo(() => {
    return getEffectiveStockLimit(
      siteSettings?.product_stock_limits,
      activeVariant?.cartId,
      product?.slug
    );
  }, [siteSettings?.product_stock_limits, activeVariant?.cartId, product?.slug]);

  const isOutOfStock = stockLimit !== null && stockLimit <= 0;

  const [quantity, setQuantity] = useState<number>(1);

  // Restock Notification State
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  const [notifyName, setNotifyName] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifySubmitting, setNotifySubmitting] = useState(false);
  const [notifySubmitted, setNotifySubmitted] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        if (data.user.email) setNotifyEmail(data.user.email);
        const metaName = data.user.user_metadata?.full_name || data.user.user_metadata?.name;
        if (metaName) setNotifyName(metaName);
      }
    });
  }, []);

  const handleRestockNotifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = notifyName.trim();
    const cleanEmail = notifyEmail.trim().toLowerCase();

    if (!cleanName) {
      toast.error(ar ? "يرجى كتابة اسمك الكريم" : "Please enter your name");
      return;
    }
    if (!cleanEmail || !cleanEmail.includes("@")) {
      toast.error(ar ? "يرجى إدخال بريد إلكتروني صحيح" : "Please enter a valid email");
      return;
    }

    setNotifySubmitting(true);
    try {
      const { error } = await supabase.from("product_restock_requests").insert({
        product_slug: product.slug,
        variant_cart_id: activeVariant?.cartId || product.slug,
        product_name: name,
        customer_name: cleanName,
        customer_email: cleanEmail,
        status: "pending",
      });

      if (error) {
        console.error("Restock request error:", error);
        toast.error(ar ? "حدث خطأ أثناء حفظ الطلب" : "Failed to submit request");
      } else {
        setNotifySubmitted(true);
        toast.success(
          ar
            ? "تم تسجيل طلبك بنجاح! سنقوم بإشعارك عبر الإيميل فور توفره."
            : "Request submitted! We will email you once it's back in stock."
        );
        setTimeout(() => {
          setNotifyModalOpen(false);
          setNotifySubmitted(false);
        }, 2200);
      }
    } catch (err) {
      console.error(err);
      toast.error(ar ? "حدث خطأ غير متوقع" : "Unexpected error");
    } finally {
      setNotifySubmitting(false);
    }
  };

  useEffect(() => {
    setQuantity(1);
  }, [selectedVariantId]);

  const handleDecreaseQuantity = () => {
    setQuantity((q) => Math.max(1, q - 1));
  };

  const handleIncreaseQuantity = () => {
    setQuantity((q) => {
      if (stockLimit !== null && q >= stockLimit) {
        return q;
      }
      return q + 1;
    });
  };

  // Delivery type info
  const deliveryInfo = getDeliveryTypeInfo(
    {
      slug: product.slug,
      cartId: activeVariant.cartId,
      name: activeVariant.labelAr || activeVariant.labelEn,
      productType: activeVariant.deliveryType || product.deliveryType,
    },
    lang
  );

  // Platform resolution
  const platform = useMemo(() => {
    const s = (product.slug || "").toLowerCase();
    const c = (categoryName || "").toLowerCase();
    if (s.includes("youtube")) return "YouTube";
    if (s.includes("gemini") || s.includes("google")) return "Google Gemini";
    if (s.includes("windows") || s.includes("office") || s.includes("microsoft")) return "Microsoft";
    if (s.includes("adobe")) return "Adobe Creative Cloud";
    if (s.includes("canva")) return "Canva";
    if (s.includes("valorant")) return "Riot Games / PC";
    if (s.includes("fortnite")) return "Epic Games / All Platforms";
    if (s.includes("steam") || s.includes("fc-27") || c.includes("game")) return "Steam / PC";
    if (s.includes("playstation")) return "PlayStation Network";
    if (s.includes("xbox")) return "Xbox Live";
    return "Official Platform";
  }, [product.slug, categoryName]);

  // Region resolution
  const cleanRegion = useMemo(
    () =>
      resolveRegionLabel(
        { region: activeVariant.region || product.region, slug: product.slug },
        ar ? "ar" : "en",
        { flag: false, parens: true },
      ),
    [activeVariant.region, product.region, product.slug, ar],
  );

  // Dynamic Geo Detection for Activation Status
  const userCountry = useUserCountry();
  const countryDisplayName = ar ? userCountry.ar : userCountry.en;

  const canActivate = useMemo(() => {
    const r = (activeVariant.region || product.region || "global").toLowerCase();
    if (r.includes("global") || r.includes("عالم") || r === "" || !activeVariant.region) {
      return true;
    }
    if (r.includes("us") || r.includes("أمريك")) {
      return userCountry.code === "US";
    }
    if (r.includes("turkey") || r.includes("تركي") || r.includes("try")) {
      return userCountry.code === "TR";
    }
    if (r.includes("ksa") || r.includes("سعود")) {
      return userCountry.code === "SA";
    }
    if (r.includes("uae") || r.includes("إمارات")) {
      return userCountry.code === "AE";
    }
    if (r.includes("jordan") || r.includes("أردن")) {
      return userCountry.code === "JO";
    }
    return true;
  }, [activeVariant.region, product.region, userCountry.code]);

  // Poster Component
  const renderPoster = () => {
    if (product.slug === "windows") {
      return <WindowsPoster cartId={activeVariant.cartId} planLabel={pick(activeVariant.labelAr, activeVariant.labelEn)} />;
    }
    if (product.slug === "adobe") {
      return <AdobePoster />;
    }
    if (product.slug === "canva") {
      return <CanvaPoster />;
    }
    if (isTod || product.slug === "tod" || product.slug.startsWith("tod-")) {
      return (
        <div style={{ width: "100%", height: "100%", borderRadius: 12, overflow: "hidden" }}>
          <TodPoster cartId={activeVariant.cartId} name={pick(activeVariant.labelAr, activeVariant.labelEn)} />
        </div>
      );
    }

    // Software apps that specifically use their SVG logos instead of full cover artwork
    const isSvgApp = ["autodesk", "microsoft365", "linkedin", "gemini"].includes(product.slug);
    
    const todImageMap: Record<string, string> = {
      "tod-total-1d": "/app/assets/img/catalog/one_day.webp",
      "tod-total-1w": "/app/assets/img/catalog/one_week_2.webp",
      "tod-mobile-1m": "/app/assets/img/catalog/1-01.webp",
      "tod-total-1m": "/app/assets/img/catalog/1-03.webp",
      "tod-4k-1m": "/app/assets/img/catalog/1-02.webp",
      "tod-mobile-6m": "/app/assets/img/catalog/tod_mobile_6_months_1.webp",
      "tod-tv-6m": "/app/assets/img/catalog/total_6_months.webp",
      "tod-mobile-1y": "/app/assets/img/catalog/tod_mobile_-one_year.webp",
      "tod-tv-1y": "/app/assets/img/catalog/tod_total_one_year.webp",
      "tod-4k-1y": "/app/assets/img/catalog/4k_.png",
    };
    const coverSrc =
      isTod && activeVariant.cartId && todImageMap[activeVariant.cartId]
        ? todImageMap[activeVariant.cartId]
        : product.imageUrl || product.iconImage;

    // Full Cover Poster (for all games, subscriptions, and catalog items with cover art)
    if (!isSvgApp && coverSrc) {
      return (
        <div className="driffle-poster-inner full-cover" style={isTod ? { background: "linear-gradient(145deg, #2b1154, #120626)" } : undefined}>
          <img
            src={coverSrc}
            alt={name}
            className="driffle-cover-img"
            style={isTod ? { objectFit: "contain", padding: 6 } : undefined}
          />
          <div className="driffle-cover-overlay">
            <div className="driffle-cover-top">
              <span className="driffle-poster-region-badge">{cleanRegion}</span>
            </div>
            {product.variants.length > 1 && activeVariant.labelAr && !activeVariant.labelAr.includes(product.nameAr) && (
              <div className="driffle-cover-bottom">
                <div className="driffle-cover-duration">
                  {pick(activeVariant.labelAr, activeVariant.labelEn)}
                </div>
                {deliveryInfo.label && (
                  <div className="driffle-cover-sub">
                    {deliveryInfo.label}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Modern Graphic Poster for SVG Software Brands
    const brandBgMap: Record<string, string> = {
      gemini: "linear-gradient(145deg, #090e1c 0%, #0d1a33 55%, #050b18 100%)",
      linkedin: "linear-gradient(145deg, #001f3f 0%, #004182 55%, #001224 100%)",
      autodesk: "linear-gradient(145deg, #021a1f 0%, #00363a 55%, #011012 100%)",
      microsoft365: "linear-gradient(145deg, #1b0a2a 0%, #2e114d 55%, #10051a 100%)",
    };
    const brandBg = brandBgMap[product.slug] || product.thumbBg || "linear-gradient(145deg, #0a1120 0%, #111f38 55%, #070d18 100%)";

    const brandLogoMap: Record<string, string> = {
      gemini: "/app/assets/img/gemini-logo.svg",
      linkedin: "/app/assets/img/linkedin-logo.svg",
      autodesk: "/app/assets/img/autodesk-logo.svg",
      microsoft365: "/app/assets/img/microsoft365-logo.svg",
    };
    const brandLogo = product.iconImage || product.imageUrl || brandLogoMap[product.slug] || "/app/assets/img/microsoft365-logo.svg";

    return (
      <div className="driffle-poster-inner" style={{ background: brandBg }}>
        {/* Subtle grid pattern background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
            opacity: 0.7,
            pointerEvents: "none",
          }}
        />

        {/* Ambient Top Glow */}
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

        {/* Brand Logo Floating Card */}
        <div className="driffle-poster-logo-badge">
          <img
            src={brandLogo}
            alt={name}
            onError={(e) => {
              const target = e.currentTarget;
              if (product.iconImage && target.src !== product.iconImage) {
                target.src = product.iconImage;
              } else if (product.imageUrl && target.src !== product.imageUrl) {
                target.src = product.imageUrl;
              } else {
                target.src = "/app/assets/img/gx-logo.png";
              }
            }}
          />
        </div>

        {/* Brand Title in Poster */}
        <div style={{ zIndex: 3, textAlign: "center", padding: "0 18px" }}>
          <div style={{ fontSize: 21, fontWeight: 900, color: "#ffffff", letterSpacing: 0.5 }}>
            {product.slug === "gemini" ? "Google Gemini Advanced" : name}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#00e5ff", marginTop: 4, letterSpacing: 1, textTransform: "uppercase" }}>
            {deliveryInfo.label} • {platform}
          </div>
        </div>

        {/* Poster Footer: Active Plan Label + Region */}
        <div className="driffle-poster-footer">
          <div className="driffle-poster-duration">
            {pick(activeVariant.labelAr, activeVariant.labelEn)}
          </div>
          <span className="driffle-poster-region-badge">
            {cleanRegion}
          </span>
        </div>
      </div>
    );
  };

  // Actions
  const validateTargetInput = () => {
    if (requiresCustomerInput && !isOutOfStock) {
      const trimmed = targetInput.trim();
      if (!trimmed) {
        setInputError(true);
        const mobileEl = typeof document !== "undefined" ? document.getElementById("driffle-target-input-mobile") : null;
        const desktopEl = typeof document !== "undefined" ? document.getElementById("driffle-target-input-desktop") : null;
        const targetEl = (typeof window !== "undefined" && window.innerWidth <= 1024 ? mobileEl : desktopEl) || inputRef.current || mobileEl || desktopEl;
        targetEl?.focus();
        targetEl?.scrollIntoView({ behavior: "smooth", block: "center" });
        return false;
      }
    }
    return true;
  };

  const handleAddToCart = () => {
    if (isOutOfStock) {
      alert(ar ? "عذراً، لقد نفدت كمية هذا المنتج حالياً" : "Sorry, this product is currently sold out");
      return;
    }
    if (!validateTargetInput()) return;
    setInputError(false);
    const trimmedInput = targetInput.trim();
    const finalVal = requirementType === "whatsapp" ? (formattedWhatsApp || trimmedInput) : trimmedInput;
    if (finalVal) {
      if (requirementType === "whatsapp") {
        setRememberedWhatsApp(finalVal, rememberMe);
        setRememberContactEnabled(rememberMe);
        cart.setContact({ phone: finalVal, type: "whatsapp" });
      }
    }
    if (stockLimit !== null) {
      const existingInCart = cart.items.find((i) => i.cartId === activeVariant.cartId)?.qty || 0;
      if (existingInCart + quantity > stockLimit) {
        alert(
          ar
            ? `عذراً، أقصى كمية متاحة لهذا المنتج هي ${stockLimit} فقط (لديك ${existingInCart} في السلة)`
            : `Sorry, maximum available for this product is ${stockLimit} (${existingInCart} already in cart)`
        );
        return;
      }
    }
    const variantLabel = pick(activeVariant.labelAr, activeVariant.labelEn);
    const itemName = variantLabel && !name.includes(variantLabel) ? `${name} — ${variantLabel}` : name;
    cart.add(activeVariant.cartId, quantity, {
      price: activePrice,
      name: itemName,
      product: product.slug,
      icon: product.icon || "✨",
      iconImage: product.iconImage || product.imageUrl,
      imageUrl: product.imageUrl || product.iconImage,
      bg: product.thumbBg,
      usernames: finalVal ? [finalVal] : undefined,
    });
    setAddedCart(true);
    window.dispatchEvent(new CustomEvent(CART_ADDED_EVENT));
    setTimeout(() => setAddedCart(false), 1400);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) {
      alert(ar ? "عذراً، لقد نفدت كمية هذا المنتج حالياً" : "Sorry, this product is currently sold out");
      return;
    }
    if (!validateTargetInput()) return;
    setInputError(false);
    const trimmedInput = targetInput.trim();
    const finalVal = requirementType === "whatsapp" ? (formattedWhatsApp || trimmedInput) : trimmedInput;
    if (finalVal) {
      if (requirementType === "whatsapp") {
        setRememberedWhatsApp(finalVal, rememberMe);
        setRememberContactEnabled(rememberMe);
        cart.setContact({ phone: finalVal, type: "whatsapp" });
      }
    }
    if (stockLimit !== null && quantity > stockLimit) {
      alert(
        ar
          ? `عذراً، أقصى كمية متاحة لهذا المنتج هي ${stockLimit} فقط`
          : `Sorry, maximum available for this product is ${stockLimit}`
      );
      return;
    }
    const variantLabel = pick(activeVariant.labelAr, activeVariant.labelEn);
    const itemName = variantLabel && !name.includes(variantLabel) ? `${name} — ${variantLabel}` : name;
    cart.buyNow(activeVariant.cartId, quantity, {
      price: activePrice,
      name: itemName,
      product: product.slug,
      icon: product.icon || "✨",
      iconImage: product.iconImage || product.imageUrl,
      imageUrl: product.imageUrl || product.iconImage,
      bg: product.thumbBg,
      usernames: finalVal ? [finalVal] : undefined,
    });
    navigate({ to: "/cart" });
  };

  // Configured bundles: Opt-in only. If not configured, this section is completely hidden.
  const CONFIGURED_BUNDLES: Record<
    string,
    { slug: string; nameAr: string; nameEn: string; cartId: string; price: number; thumb: string }
  > = {};

  const configuredBundle = CONFIGURED_BUNDLES[product.slug] || null;

  const bundleTotal = configuredBundle
    ? Number((activePrice + configuredBundle.price * 0.9).toFixed(2))
    : 0;

  const handleBuyBundle = () => {
    if (!configuredBundle) return;
    const variantLabel = pick(activeVariant.labelAr, activeVariant.labelEn);
    const itemName = variantLabel && !name.includes(variantLabel) ? `${name} — ${variantLabel}` : name;
    cart.add(activeVariant.cartId, 1, {
      price: activePrice,
      name: itemName,
      product: product.slug,
      icon: product.icon || "✨",
      iconImage: product.iconImage || product.imageUrl,
      imageUrl: product.imageUrl || product.iconImage,
      bg: product.thumbBg,
    });
    cart.add(configuredBundle.cartId, 1, {
      price: Number((configuredBundle.price * 0.9).toFixed(2)),
      name: pick(configuredBundle.nameAr, configuredBundle.nameEn),
      product: configuredBundle.slug,
      icon: "✨",
      iconImage: configuredBundle.thumb,
      imageUrl: configuredBundle.thumb,
    });
    navigate({ to: "/cart" });
  };

  const categorySlug = useMemo<string | null>(() => {
    if (isStreamingProduct) return "streaming";
    if (isAiProduct) return "design";
    const c = ((product.categorySlug || "") + " " + (categoryName || "")).toLowerCase();
    if (c.includes("مشاهد") || c.includes("stream")) return "streaming";
    if (c.includes("اشتراك") || c.includes("subscrip")) return "subscriptions";
    if (c.includes("لعب") || c.includes("game")) return "games";
    if (c.includes("برامج") || c.includes("soft") || c.includes("design") || c.includes("ذكاء") || c.includes("ai")) return "design";
    if (c.includes("بطاق") || c.includes("card")) return "gift-cards";
    return null;
  }, [categoryName, product.categorySlug, isStreamingProduct, isAiProduct]);

  // Steam Game Account detection:
  const isSteamGameAccount = useMemo(() => {
    const pPlatform = ((product.platform || "") + " " + (product.categoryNameEn || "") + " " + (product.categoryNameAr || "")).toLowerCase();
    const pName = ((product.nameAr || "") + " " + (product.nameEn || "")).toLowerCase();
    const isSteam = pPlatform.includes("steam") || pName.includes("ستيم") || pName.includes("steam");
    const isAccount = deliveryInfo.type === "account" || (product.deliveryType || "").toLowerCase() === "account";
    const isGame = (product.categorySlug || "").includes("game") || (categorySlug || "").includes("game") || pPlatform.includes("game") || pPlatform.includes("لعب");
    return isSteam && isAccount && isGame;
  }, [product, deliveryInfo.type, categorySlug]);

  // YouTube Family Invite detection:
  const isYouTube = useMemo(() => {
    return product.slug === "youtube-premium" || (product.slug || "").includes("youtube");
  }, [product.slug]);

  // Fortnite & Valorant detection:
  const isFortnite = useMemo(() => {
    return product.slug === "fortnite" || (product.slug || "").includes("fortnite");
  }, [product.slug]);

  const isValorant = useMemo(() => {
    return product.slug === "valorant" || (product.slug || "").includes("valorant");
  }, [product.slug]);

  // Contextual Notice Points
  const noticePoints = useMemo(() => {
    if (isValorant) {
      return [
        ar
          ? "🇹🇷 كود رقمي معتمد للحسابات التركية: هذا الكود مخصص حصرياً لشحن حسابات فالورانت التركية (Turkey Region)."
          : "🇹🇷 Turkey Region Exclusive: Official code strictly valid for Turkish region Valorant accounts.",
        ar
          ? "⚡ تسليم فوري للأكواد: يظهر كود التفعيل الرقمي فور إتمام الدفع في صفحة تأكيد الطلب وحسابك في الموقع."
          : "⚡ Instant Digital Delivery: Activation code appears immediately on your order confirmation page.",
        ar
          ? "🛡️ شحن رسمي وآمن 100%: أكواد شحن نقاط Riot Games أصلية ومعتمدة بدون أي مخاطر حظر على حسابك."
          : "🛡️ 100% Genuine & Safe: Official Riot Games Valorant Points codes with zero ban risk.",
      ];
    }
    if (isFortnite) {
      return [
        ar
          ? "🔒 شحن رسمي وآمن 100%: شحن مباشر معتمد عبر Epic Games بصفر مخاطرة حظر (بان) على حسابك، ويتم حذف بيانات الدخول نهائياً فور اكتمال الطلب."
          : "🔒 100% Safe & Official: Direct official charge via Epic Games with zero ban risk; credentials permanently deleted upon completion.",
        ar
          ? "🎮 دعم جميع المنصات والمناطق: الرصيد أو اشتراك Crew يعمل عالمياً على PC، بلايستيشن، وإكسبوكس (ما عدا Nintendo Switch)."
          : "🎮 Multi-Platform Support: Works globally on PC, PlayStation, and Xbox (except Nintendo Switch).",
        ar
          ? "⚡ سرعة التنفيذ: يتم شحن الحساب أو تفعيل اشتراك Crew في وقت قياسي بمجرد استلام معلومات الطلب والتحقق."
          : "⚡ Fast Fulfillment: Charged or Crew activated promptly once credentials and verification are received.",
      ];
    }
    if (isTod) {
      return [
        ar
          ? "⚡ كود رقمي أصلي 100%: استلام كود التفعيل فوراً بعد الدفع لتفعيله مباشرة على حسابك الشخصي في TOD عبر tod.tv."
          : "⚡ 100% Genuine Digital Voucher: Receive your voucher code instantly to activate on your own TOD account via tod.tv.",
        ar
          ? "🛡️ ضمان كامل مدة الاشتراك: نضمن لك استمرار وتفعيل الاشتراك طوال المدة المحددة بالكامل مع دعم فني متواصل."
          : "🛡️ Full Duration Warranty: 100% guaranteed uninterrupted access for the entire subscription period.",
        ar
          ? "📱 باقة TOD Mobile: مخصصة للاستخدام على جهاز واحد فقط (هاتف ذكي أو جهاز لوحي). تشمل جميع الحقوق الرياضية المباشرة (مثل الدوري الإنجليزي، دوري أبطال أوروبا، الإسباني) بالإضافة إلى المسلسلات، الأفلام، وإنتاجات TOD Originals وقنوات beIN الترفيهية."
          : "📱 TOD Mobile: For 1 device only (smartphone or tablet). Includes all live sports (Premier League, Champions League, La Liga), plus series, movies, TOD Originals, and beIN entertainment channels.",
        ar
          ? "📺 باقة TOD: تدعم المشاهدة بدقة عالية Full HD على ما يصل إلى جهازين في نفس الوقت (تشتغل على الشاشات الذكية، الكمبيوتر، والأجهزة الذكية الأخرى). تشمل كامل المحتوى الرياضي والترفيهي وقنوات البث المباشر."
          : "📺 TOD Plan: Full HD streaming on up to 2 devices simultaneously (Smart TVs, PC, smart devices). Includes all sports, entertainment, and live channels.",
        ar
          ? "🌟 باقة TOD 4K: تدعم المشاهدة بأعلى دقة 4K Ultra HD على ما يصل إلى جهازين في نفس الوقت عبر الأجهزة والشاشات المدعومة. تشمل التغطية الرياضية الشاملة والمحتوى الترفيهي بالكامل."
          : "🌟 TOD 4K: 4K Ultra HD streaming on up to 2 devices simultaneously on supported 4K screens/devices. Comprehensive sports coverage and full entertainment.",
      ];
    }
    if (isYouTube) {
      return [
        ar
          ? "📧 دعوة رسمية على الإيميل: يصلك الاشتراك كدعوة رسمية من Google على بريدك الإلكتروني (Gmail)."
          : "📧 Official Email Invite: Delivered directly as an official Google invitation to your Gmail.",
        ar
          ? "⚠️ شرط أساسي وإلزامي: يجب أن لا يكون حسابك منضماً حالياً إلى أي مجموعة عائلية أخرى في Google لتتمكن من قبول الدعوة بنجاح."
          : "⚠️ Mandatory Requirement: Your Google account must NOT be part of any other Google family group to accept the invite.",
        ar
          ? "👥 الانضمام للمجموعة العائلية: بمجرد وصول الإيميل، تفتح الرسالة وتضغط على 'الانضمام للعائلة' ليتم تفعيل مزايا YouTube Premium فوراً."
          : "👥 Join Family Group: Simply open the email and click to join the family group to activate your Premium benefits immediately.",
        ar
          ? "✨ مزايا بريميوم كاملة: مشاهدة بدون إعلانات نهائياً، تشغيل في الخلفية عند قفل الشاشة، تنزيل الفيديوهات بدون نت، واشتراك YouTube Music كامل."
          : "✨ Full Premium Access: 100% ad-free videos, background playback, offline downloads, and full YouTube Music included.",
      ];
    }
    if (isSteamGameAccount) {
      return [
        ar
          ? "قد لا يتم تضمين مكافآت الطلب المسبق (Pre-order bonuses) أو قد تختلف عن العروض الأخرى. سيتم إرسال المفتاح/الحساب فور الإصدار الرسمي في حال كان المنتج طلباً مسبقاً."
          : "Pre-order bonuses may not be included or differ from other offers. Your game key will be sent on the official release date.",
        ar
          ? "هذا ليس مفتاح منتج (Product Key). سيتم إنشاء وتجهيز حساب جديد مخصص لك، وسيكون المحتوى المشترى متاحاً من خلال هذا الحساب. يمكنك تسجيل الدخول باستخدام البيانات المرسلة لك في تفاصيل طلبك (Inventory)."
          : "This is not a product key. A new account will be created for you, and the purchased content will be accessible through that account. You can log in using the credentials provided in your Inventory.",
        ar
          ? "يُرجى تجنب إجراء أي تغييرات على الحساب المشترى — مثل إضافة وسائل دفع أو تعديل منطقة الحساب (الريجون) — حيث قد يؤدي ذلك إلى حظر الحساب أو تعليقه. لن يتم استرداد أي مبالغ في مثل هذه الحالات (No refunds)."
          : "Please avoid making any changes to the purchased account — such as adding payment methods or modifying the region — as this may lead to the account being suspended. No refunds will be issued in such cases.",
      ];
    }
    if (isSocialProduct || isFollowerProduct || isLikeProduct) {
      return [
        ar
          ? "⚡ مدة التنفيذ: تبدأ معالجة الطلب فوراً ويتم التسليم والإنجاز بالكامل خلال مدة تتراوح بين ساعة إلى 24 ساعة كحد أقصى."
          : "⚡ Execution Duration: Processing starts immediately; delivered and fully completed within 1 to 24 hours max.",
        ar
          ? "⚠️ تنبيه الانخفاض (Drop): قد يطرأ انخفاض طبيعي في عدد المتابعين مع مرور الوقت بسبب التحديثات الدورية لخوارزميات منصات التواصل."
          : "⚠️ Natural Drop Notice: A natural drop in followers may occur over time due to periodic platform algorithm updates.",
        ar
          ? "🛡️ ضمان ذهبي لمدة 30 يوماً: نضمن لك الخدمة لمدة 30 يوماً كاملة؛ أي انخفاض أو Drop يحدث خلال هذه الفترة نقوم بتعويضه فوراً وبشكل مجاني."
          : "🛡️ 30-Day Golden Guarantee: We guarantee 30 full days; any drop occurring during this period is refilled immediately and freely.",
        ar
          ? "🔒 أمان وخصوصية تامة: نحتاج فقط رابط الحساب أو المنشور العام (Public) لتنفيذ الخدمة بأعلى معايير الأمان."
          : "🔒 100% Safe & Private: Only your public profile or post link is required to complete the service safely.",
      ];
    }
    if (deliveryInfo.type === "link") {
      return [
        ar
          ? "هذا المنتج مخصص للتفعيل الفوري عبر رابط رسمي معتمد ومباشر."
          : "This product is activated directly via an official and direct activation link.",
        ar
          ? "لا يُستخدم هذا المنتج لتمديد اشتراك قائم؛ يُشترط التفعيل عند انتهاء اشتراكك الحالي أو على حساب مؤهل."
          : "Cannot be used to extend an active subscription. Redeem after current plan expires.",
        ar
          ? "يُرجى فتح الرابط واستكمال التفعيل خلال 24 ساعة من استلام الطلب لضمان الصلاحية التامة."
          : "Redeem within 24 hours of delivery as the activation link expires after this period.",
        ar
          ? "الاشتراك رسمي ويدعم الوصول لجميع المزايا والأدوات المتقدمة في المنصة دون أي قيود."
          : "Eligible for personal accounts with full uninterrupted access to all pro features.",
      ];
    }
    if (deliveryInfo.type === "code") {
      return [
        ar
          ? "مفتاح تفعيل رقمي أصلي 100% يتم إرساله لك فوراً بعد إتمام الدفع."
          : "100% genuine digital activation key delivered instantly after payment.",
        ar
          ? "المفتاح صالح للاستخدام والتنشيط الدائم على جهاز واحد أو حسب ترخيص المنتج."
          : "Key is valid for permanent activation on one PC or as specified by product license.",
        ar
          ? "يمكنك ربط الترخيص بحسابك الشخصي على المنصة الرسمية لسهولة إعادة التثبيت مستقبلاً."
          : "Can be bound to your personal account on the official portal for easy reinstall.",
      ];
    }
    if (deliveryInfo.type === "account") {
      return [
        ar
          ? "حساب خاص وجديد بالكامل يتم تسليم بياناته (إيميل وباسورد) فور إتمام الطلب."
          : "Fresh dedicated account delivered with full credentials immediately.",
        ar
          ? "يمكنك تغيير كلمة المرور والبريد الاحتياطي لتأمين الحساب باسمك وبياناتك الخاصة."
          : "You can freely change password and recovery settings to secure it.",
        ar
          ? "ضمان رسمي طوال فترة الاشتراك مع دعم فني مستمر لمعالجة أي استفسارات."
          : "Full warranty covering the entire duration with 24/7 technical support.",
      ];
    }
    return [
      ar
        ? "شحن رسمي ومباشر داخل حسابك بأعلى معايير الأمان والحماية."
        : "Direct safe top-up into your official account with maximum security.",
      ar
        ? "يتم التنفيذ السريع في غضون دقائق معدودة عبر فريق العمل المتخصص."
        : "Processed rapidly within minutes by our dedicated support agents.",
    ];
  }, [deliveryInfo.type, isSteamGameAccount, isSocialProduct, isFollowerProduct, isLikeProduct, isValorant, isFortnite, ar]);

  const isNoticeHidden = useMemo(() => {
    return (
      Boolean(product.deliveryDetails && (product.deliveryDetails as any).hide_important_notes) ||
      (Array.isArray(product.importantNotes) && product.importantNotes.length === 0)
    );
  }, [product.deliveryDetails, product.importantNotes]);

  const displayNoticeList = useMemo(() => {
    if (isSteamGameAccount) {
      return noticePoints;
    }
    if (product.importantNotes && product.importantNotes.length > 0) {
      return product.importantNotes;
    }
    return noticePoints;
  }, [isSteamGameAccount, product.importantNotes, noticePoints]);

  // Contextual Redeem Steps
  const redeemSteps = useMemo(() => {
    // 1. Steam Game Account has top priority to guarantee dedicated 5-step guidance:
    if (isSteamGameAccount) {
      return [
        ar
          ? "استلم بيانات حساب Steam المخصص لك (اسم المستخدم، كلمة المرور، وبيانات البريد الإلكتروني الأساسي للحساب) فوراً في صفحة تفاصيل طلبك."
          : "Receive your dedicated Steam account credentials (username, password, and linked email access) instantly on your order page.",
        ar
          ? "افتح تطبيق Steam على جهاز الكمبيوتر (PC) وسجّل الدخول باستخدام اسم المستخدم وكلمة المرور المستلمة."
          : "Open the Steam desktop client on PC and log in using the provided username and password.",
        ar
          ? "أدخل رمز التحقق (Steam Guard Code) المرسل إلى بريد الحساب المستلم لتأكيد الدخول بنجاح."
          : "Enter the verification code sent to the provided account email to confirm login.",
        ar
          ? "قم بتغيير كلمة المرور وتفعيل حماية Steam Guard على هاتفك الشخصي لضمان أمان حسابك 100% (مع تجنب تغيير الريجون أو إضافة وسائل دفع بنكية مختلفة لمنع تعليق الحساب)."
          : "Update the password and enable Steam Guard on your mobile device for full personal security (avoid changing region or adding external payment methods).",
        ar
          ? "توجه إلى مكتبة ألعابك (Library) في Steam وابدأ بتحميل اللعبة والاستمتاع بكافة ميزات اللعب الفردي والجماعي والتحديثات الرسمية."
          : "Go to your Steam Library, install the game, and enjoy full online and single-player features.",
      ];
    }

    if (isSocialProduct || isFollowerProduct || isLikeProduct) {
      return [
        ar
          ? (isLikeProduct
              ? "انسخ رابط المنشور أو الريلز وتأكد أن حسابك ومنشورك عام (Public)."
              : "انسخ رابط حسابك الشخصي أو اسم المستخدم وتأكد أن الحساب عام (Public).")
          : (isLikeProduct
              ? "Copy the link to your public post or reel."
              : "Copy your public profile link or username."),
        ar
          ? "ضع الرابط في خانة الطلب ثم اضغط على زر 'شراء الآن' أو إضافة للسلة."
          : "Paste the link into the order box and click 'Buy now'.",
        ar
          ? "أكمل عملية الدفع الآمنة عبر وسيلة الدفع التي تناسبك."
          : "Complete your secure payment via your preferred method.",
        ar
          ? "تبدأ المعالجة مباشرة ويتم الإنجاز بالكامل خلال مدة من ساعة إلى 24 ساعة مع ضمان 30 يوماً ضد أي انخفاض."
          : "Processing starts immediately; completed within 1 to 24 hours with a 30-day refill guarantee.",
      ];
    }

    if (isYouTube) {
      return [
        ar
          ? "أدخل إيميل حسابك في Google / Gmail في خانة الطلب لتصلك الدعوة عليه."
          : "Enter your personal Google / Gmail email in the order field to receive your invitation.",
        ar
          ? "تأكد تماماً أن حسابك غير منضم لأي مجموعة عائلية أخرى في Google حتى نتمكن من إرسال الدعوة لك بدون أي عائق."
          : "Make sure your Google account is not currently joined to any other family group.",
        ar
          ? "افتح بريدك الإلكتروني (Gmail)، ستصلك رسالة دعوة رسمية من Google، اضغط على زر 'قبول الدعوة' (Accept Invitation) وانضم للمجموعة العائلية."
          : "Open your email inbox, find the official Google invitation, and click accept to join the family group.",
        ar
          ? "مبروك! يتم تفعيل اشتراك YouTube Premium و YouTube Music على حسابك الشخصي فوراً وبدون أي إعلانات."
          : "Congratulations! YouTube Premium and YouTube Music are now fully active on your personal account.",
      ];
    }

    if (isValorant) {
      return [
        ar
          ? "استلم كود شحن Valorant Points الرقمي فوراً في صفحة الطلب بعد إتمام الدفع."
          : "Receive your digital Valorant Points code immediately on the order confirmation screen.",
        ar
          ? "افتح لعبة Valorant على جهاز الكمبيوتر (PC) وتأكد من تسجيل الدخول بحسابك التركي."
          : "Launch Valorant on your PC and ensure you are logged into your Turkish account.",
        ar
          ? "اضغط على أيقونة نقاط فالورانت (VP) في الزاوية العلوية اليمنى بجانب رصيدك."
          : "Click the Valorant Points (VP) icon in the top right corner next to your balance.",
        ar
          ? "اختر وسيلة الدفع 'Prepaid Cards & Codes' (بطاقات الدفع المسبق والأكواد)."
          : "Select 'Prepaid Cards & Codes' payment method.",
        ar
          ? "أدخل كود التفعيل واضغط تأكيد (Submit / Redeem) لتتم إضافة نقاط VP إلى رصيدك فوراً وبشكل دائم."
          : "Enter your digital code and click Submit / Redeem to instantly receive your VP balance.",
      ];
    }

    if (isFortnite) {
      return [
        ar
          ? "أدخل بيانات حسابك في Epic Games (الإيميل وكلمة المرور) أو رقم الواتساب للمتابعة والتأكيد أثناء إتمام الطلب."
          : "Provide your Epic Games account credentials (email and password) or WhatsApp for follow-up at checkout.",
        ar
          ? "تأكد من تسجيل الخروج من لعبة فورت نايت وعدم تسجيل الدخول حتى يتم إشعارك بانتهاء الطلب."
          : "Ensure you are logged out of Fortnite and remain offline until notified of completion.",
        ar
          ? "في حال كان التحقق بخطوتين (2FA) مفعلاً، سيتواصل معك فريق الدعم لطلب رمز التأكيد لإتمام الشحن بأمان."
          : "If 2FA is enabled, our support team will prompt you for the verification code to complete the top-up safely.",
        ar
          ? "مبروك! فور انتهاء الطلب ستجد رصيد V-Bucks أو اشتراك Fortnite Crew مضافاً ومفعلاً مباشرة داخل لعبتك."
          : "Congratulations! Your V-Bucks or Crew subscription will be immediately active in your account.",
      ];
    }

    // Custom instructions from DB (if not generic placeholder):
    if (product.deliveryInstructionsAr && !product.deliveryInstructionsAr.includes("إعدادات النظام")) {
      try {
        const parsed = JSON.parse(product.deliveryInstructionsAr);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        const lines = product.deliveryInstructionsAr.split("\n").map((l: string) => l.trim()).filter(Boolean);
        if (lines.length > 0) return lines;
      }
    }

    if (deliveryInfo.type === "link") {
      return [
        ar
          ? "بعد إتمام الشراء، ستصلك رسالة فورية تتضمن رابط التفعيل الرسمي المخصص لك."
          : "After purchase, you will receive your personal official activation link.",
        ar
          ? "افتح الرابط وقم بتسجيل الدخول إلى حسابك الشخصي على المنصة."
          : "Open the link and sign in to your personal Google / platform account.",
        ar
          ? "اضغط على زر تأكيد وتفعيل الاشتراك؛ سيتم ترقية حسابك إلى الباقة المطلوبة فوراً."
          : "Click confirm to activate; your account will be upgraded instantly.",
        ar
          ? "استمتع بكافة مميزات الذكاء الاصطناعي والأدوات الحصرية طوال فترة الاشتراك."
          : "Enjoy full premium access and advanced tools throughout the subscription period.",
      ];
    }

    if (deliveryInfo.type === "code") {
      const platformLower = ((product.platform || "") + " " + (product.slug || "") + " " + (product.nameAr || "") + " " + (product.nameEn || "")).toLowerCase();
      const isRockstar = platformLower.includes("rockstar") || platformLower.includes("روكستار") || platformLower.includes("gta") || platformLower.includes("red dead") || platformLower.includes("rdr");
      const isSteam = platformLower.includes("steam") || platformLower.includes("ستيم");
      const isXbox = platformLower.includes("xbox") || platformLower.includes("مايكروسوفت") || platformLower.includes("microsoft") || platformLower.includes("windows store");
      const isPlaystation = platformLower.includes("playstation") || platformLower.includes("بلايستيشن") || platformLower.includes("psn") || platformLower.includes("سوني") || platformLower.includes("sony");
      const isGooglePlay = platformLower.includes("google play") || platformLower.includes("جوجل بلاي") || platformLower.includes("قوقل بلاي");
      const isApple = platformLower.includes("apple") || platformLower.includes("itunes") || platformLower.includes("ايتونز") || platformLower.includes("آبل");
      const isWindowsKey = (product.slug === "windows" || platformLower.includes("windows")) && !platformLower.includes("store");
      const isOffice = product.slug === "microsoft365" || platformLower.includes("office") || platformLower.includes("365");
      const isDiscord = platformLower.includes("discord") || product.slug.includes("discord");
      if (isTod) {
        return [
          ar
            ? "توجه إلى الموقع الرسمي المعتمد لمنصة TOD عبر الرابط المباشر: https://www.tod.tv"
            : "Visit the official TOD website at: https://www.tod.tv",
          ar
            ? "سجّل الدخول إلى حسابك الحالي في TOD، أو أنشئ حساباً جديداً بالبريد الإلكتروني في حال كنت مستخدماً جديداً للمنصة."
            : "Sign in to your existing TOD account, or create a new account using your email if you are a new user.",
          ar
            ? "انتقل إلى صفحة الخطط والاشتراكات أو خانة تفعيل الرمز / القسيمة (Promo / Voucher Code)."
            : "Navigate to the Plans section or enter the Voucher / Promo Code entry field.",
          ar
            ? "أدخل كود التفعيل الرقمي المستلم من متجر GX Store واضغط على تطبيق (Apply / Redeem) لتطبيق الخصم بنسبة 100%."
            : "Enter your digital voucher code received from GX Store and click Apply / Redeem for 100% full discount.",
          ar
            ? "أكمل خطوة تأكيد وسيلة الدفع النظامية المعتمدة لدى TOD دون أن يتم خصم أي مبالغ إضافية طوال مدة اشتراكك."
            : "Complete the standard payment verification required by TOD (no additional charges will occur during your voucher period).",
          ar
            ? "مبروك! تم تفعيل اشتراكك رسمياً، ويمكنك الآن الاستمتاع بكافة المباريات والأفلام والمسلسلات فوراً بضمان كامل مدة الاشتراك."
            : "Congratulations! Your subscription is fully activated. Enjoy sports and entertainment streaming with full warranty.",
        ];
      }

      if (isRockstar) {
        return [
          ar
            ? "قم بتنزيل وتثبيت Rockstar Games Launcher، ثم سجّل الدخول عبر الرابط التالي: https://socialclub.rockstargames.com/rockstar-games-launcher"
            : "Download and install Rockstar Games Launcher, then sign in at: https://socialclub.rockstargames.com/rockstar-games-launcher",
          ar
            ? "اضغط على زر القائمة الموجود في الزاوية العلوية اليمنى، ثم اختر استرداد الرمز (Redeem Code)."
            : "Click the profile menu in the top right corner, then choose Redeem Code.",
          ar
            ? "أدخل الرمز الخاص بك، والذي يظهر في صفحة الطلب (Order) على موقع gxstore، ثم اتبع التعليمات لتفعيل الرمز وتنزيل اللعبة."
            : "Enter your code shown on your GX Store order screen, then follow prompts to activate and install.",
        ];
      }

      if (isSteam) {
        return [
          ar
            ? "عبر المتصفح: سجل الدخول وفعّل الكود مباشرة عبر الرابط الرسمي: https://store.steampowered.com/account/registerkey"
            : "Via Web Browser: Sign in and redeem your product code directly at: https://store.steampowered.com/account/registerkey",
          ar
            ? "أو عبر تطبيق Steam للكمبيوتر: افتح التطبيق، من القائمة العلوية اضغط Games ثم اختر Activate a Product on Steam..."
            : "Or via Steam PC Client: Open Steam, click 'Games' from the top menu, then select 'Activate a Product on Steam...'",
          ar
            ? "أدخل كود اللعبة الرقمي واضغط متابعة (Next) لتتم إضافة اللعبة فوراً وبشكل دائم إلى مكتبتك (Library)."
            : "Enter the product key and click Next to permanently add the game to your Steam Library.",
        ];
      }

      if (isXbox) {
        return [
          ar
            ? "عبر المتصفح: سجل الدخول بحساب مايكروسوفت عبر الرابط الرسمي: https://redeem.microsoft.com"
            : "Via Web Browser: Sign in to your Microsoft account at: https://redeem.microsoft.com",
          ar
            ? "أو عبر جهاز Xbox: افتح متجر Store، اضغط زر القائمة (View) واختر استرداد (Redeem)."
            : "Or via Xbox Console: Open the Store app, press the View button, and select Redeem.",
          ar
            ? "أدخل كود التفعيل المكون من 25 حرفاً واضغط تأكيد (Confirm) لإضافة اللعبة أو الاشتراك لحسابك فوراً."
            : "Enter your 25-character code and select Confirm to add the game or subscription to your account.",
        ];
      }

      if (isPlaystation) {
        return [
          ar
            ? "عبر المتصفح: سجل الدخول عبر PlayStation Store على https://store.playstation.com واضغط على صورة حسابك ثم اختر استرداد الرمز (Redeem Code)."
            : "Via Web Browser: Sign in to PlayStation Store at https://store.playstation.com click your avatar and select Redeem Code.",
          ar
            ? "أو عبر جهاز PS4 / PS5: ادخل إلى PlayStation Store، اضغط أيقونة الخيارات (...) في الزاوية العلوية ثم اختر استرداد الرمز (Redeem Code)."
            : "Or via PS4/PS5: Open PlayStation Store, select the (...) menu icon at the top, and choose Redeem Code.",
          ar
            ? "أدخل الرمز المكون من 12 رقماً/حرفاً واضغط استرداد (Redeem) ليتم شحن الرصيد في محفظتك فوراً."
            : "Enter your 12-digit voucher code and select Redeem to immediately credit your wallet balance.",
        ];
      }

      if (isGooglePlay) {
        return [
          ar
            ? "عبر المتصفح: توجه إلى الرابط المباشر لاسترداد بطاقات جوجل بلاي: https://play.google.com/redeem"
            : "Via Web Browser: Go to the direct redemption portal at: https://play.google.com/redeem",
          ar
            ? "أو عبر الهاتف: افتح متجر Google Play، اضغط على صورة ملفك الشخصي > المدفوعات والاشتراكات > استخدام رمز الهدية."
            : "Or via Phone App: Open Google Play, tap your profile icon > Payments & subscriptions > Redeem code.",
          ar
            ? "أدخل رمز البطاقة واضغط استرداد (Redeem) لشحن رصيد Google Play فوراً."
            : "Enter your gift card code and tap Redeem to apply the balance to your Google Play account.",
        ];
      }

      if (isApple) {
        return [
          ar
            ? "افتح متجر App Store على جهاز iPhone أو iPad أو Mac، أو عبر الرابط: https://apps.apple.com/redeem"
            : "Open App Store on iPhone, iPad, or Mac, or visit: https://apps.apple.com/redeem",
          ar
            ? "اضغط على صورة حسابك في أعلى الشاشة، ثم اختر تحصيل بطاقة هدية أو رمز (Redeem Gift Card or Code)."
            : "Tap your account avatar at the top of the screen, then tap 'Redeem Gift Card or Code'.",
          ar
            ? "أدخل الرمز الرقمي واضغط تحصيل لإضافة الرصيد إلى رصيد حساب Apple الخاص بك فوراً."
            : "Enter the code and tap Redeem to instantly add the balance to your Apple Account.",
        ];
      }

      if (isWindowsKey) {
        return [
          ar
            ? "استلم مفتاح التفعيل الرقمي الأصلي (Windows Product Key) المكون من 25 حرفاً فور إتمام الشراء."
            : "Receive your genuine 25-character Windows product key instantly on your order page.",
          ar
            ? "على جهاز الكمبيوتر: افتح الإعدادات (Settings) > النظام (System) > التنشيط (Activation)."
            : "On your PC, open Settings > System > Activation.",
          ar
            ? "اضغط على خيار 'تغيير مفتاح المنتج' (Change product key) وأدخل الكود المكوّن من 25 خانة."
            : "Click 'Change product key' and enter the 25-character key.",
          ar
            ? "اضغط تنشيط (Activate) ليتم التحقق عبر خوادم مايكروسوفت وتأكيد التنشيط الأصلي الدائم مدى الحياة."
            : "Click Activate to authenticate with official Microsoft servers for lifetime genuine activation.",
        ];
      }

      if (isOffice) {
        return [
          ar
            ? "استلم بيانات الحساب أو مفتاح التفعيل الرسمي المعتمد فور إتمام الدفع."
            : "Receive your official Microsoft 365 credentials or license key immediately after payment.",
          ar
            ? "توجه إلى بوابة مايكروسوفت الرسمية: https://setup.office.com أو https://account.microsoft.com"
            : "Visit the official Microsoft portal at: https://setup.office.com or https://account.microsoft.com",
          ar
            ? "سجّل الدخول وقم بتنزيل حزمة تطبيقات Office الأصلية (Word, Excel, PowerPoint, Outlook) وتفعيل مساحة 1TB سحابية على OneDrive."
            : "Sign in, download the authentic Office suite (Word, Excel, PowerPoint, Outlook), and activate your 1TB OneDrive cloud storage.",
        ];
      }

      if (isDiscord) {
        return [
          ar
            ? "استلم رابط أو كود التفعيل الرقمي فوراً في صفحة الطلب وحسابك في الموقع."
            : "Receive your digital activation link or promo code instantly on your order page.",
          ar
            ? "افتح الرابط عبر المتصفح أو تطبيق Discord وسجّل الدخول بحسابك الشخصي."
            : "Open the link in your browser or Discord app and sign in with your personal account.",
          ar
            ? "اضغط على زر 'قبول الهدية' أو 'تأكيد التفعيل' ليتم تطبيق مزايا Discord Nitro أو البوست (Boost) فوراً على حسابك."
            : "Click 'Accept Gift' or 'Confirm' to apply Nitro benefits or Server Boosts instantly to your account.",
        ];
      }

      return [
        ar
          ? "استلم كود التفعيل الرقمي فوراً في صفحة تأكيد الطلب وحسابك في الموقع."
          : "Receive the digital key instantly on the order confirmation screen.",
        ar
          ? "توجه إلى إعدادات النظام أو الموقع الرسمي وأدخل الكود في خانة التفعيل (Redeem / Product Key)."
          : "Go to system settings or the official portal and enter the key.",
        ar
          ? "اضغط تفعيل (Activate) ليتم التحقق من الكود وتأكيد التفعيل الأصلي."
          : "Click Activate to verify and permanently license your software.",
      ];
    }

    if (deliveryInfo.type === "account") {
      const isAdobe = (product.slug || "").includes("adobe") || (product.nameAr || "").includes("Adobe");
      if (isAdobe) {
        return [
          ar
            ? "استلم بيانات الحساب (الإيميل وكلمة المرور) فور إتمام عملية الشراء في صفحة تفاصيل طلبك."
            : "Receive account credentials (email and password) instantly on your order page.",
          ar
            ? "سجّل الدخول عبر موقع أدوبي الرسمي: https://creativecloud.adobe.com أو تطبيق Creative Cloud للكمبيوتر."
            : "Log in via the official Adobe website at https://creativecloud.adobe.com or the Creative Cloud desktop client.",
          ar
            ? "استمتع بالوصول الكامل لجميع برامج أدوبي الأصلية (Photoshop, Illustrator, Premiere Pro والمزيد) مع التحديثات الرسمية."
            : "Enjoy full access to all official Adobe apps (Photoshop, Illustrator, Premiere Pro, etc.) with official updates.",
        ];
      }

      return [
        ar
          ? "استلم بيانات الحساب (الإيميل وكلمة المرور) فور إتمام عملية الشراء في تفاصيل طلبك."
          : "Receive account credentials (email and password) instantly on your order page.",
        ar
          ? "سجل الدخول عبر التطبيق أو الموقع الرسمي للمنصة."
          : "Log in via the official website or client application.",
        ar
          ? "قم بتحديث كلمة المرور لبياناتك الخاصة واستمتع باشتراكك."
          : "Update credentials to your preferences and enjoy full access.",
      ];
    }

    return [
      ar
        ? "أدخل معرّف أو بيانات حسابك أثناء الطلب لتوجيه الشحن بدقة."
        : "Provide your account ID/tag at checkout for accurate top-up.",
      ar
        ? "يقوم فريق العمل بتنفيذ الشحن لحسابك مباشرة وتأكيد العملية فوراً."
        : "Our team executes the balance charge directly within moments.",
    ];
  }, [product, deliveryInfo.type, isSocialProduct, isFollowerProduct, isLikeProduct, isSteamGameAccount, isYouTube, isValorant, isFortnite, ar]);

  const renderBuyCard = (isDesktop: boolean) => {
    const inputId = isDesktop ? "driffle-target-input-desktop" : "driffle-target-input-mobile";
    return (
      <div className={`driffle-buy-card gx-buy-card ${isDesktop ? "is-desktop" : "is-mobile"} ${isOutOfStock ? "is-sold-out" : ""}`}>
        {/* Clean, Direct Price Box (Only shown when product/variant is in stock) */}
        {!isOutOfStock && (
          <div className="driffle-price-box gx-price-box">
            <span className="driffle-price-label gx-price-label">
              {pick(activeVariant.labelAr, activeVariant.labelEn)}
            </span>
            <div className="driffle-price-main gx-price-main">
              <span className="driffle-price-val gx-price-val">{format(activePrice)}</span>
              {activeVariant.oldPrice && activeVariant.oldPrice > activePrice && (
                <span className="driffle-price-old gx-price-old">{format(activeVariant.oldPrice)}</span>
              )}
            </div>
            {(isSocialProduct || isFollowerProduct || isLikeProduct) && (
              <div className="driffle-price-note gx-price-note">
                {ar ? "⚡ تنفيذ من ساعة إلى 24 ساعة • ضمان 30 يوماً ضد النقص ⓘ" : "⚡ 1-24h Delivery • 30-Day Drop Refill Guarantee ⓘ"}
              </div>
            )}
          </div>
        )}

        {/* Target Link or Username Input Box (Only shown when product/variant is in stock) */}
        {!isOutOfStock && requiresCustomerInput && (
          <div className={`driffle-target-input-box ${inputError ? "has-error" : ""}`}>
            <label className="driffle-target-label" htmlFor={inputId}>
              <span className="driffle-target-label-icon">
                {requirementType === "whatsapp" ? "💬" : requirementType === "email" ? "✉️" : isLikeProduct ? "❤️" : "🔗"}
              </span>
              <span>{targetLabel}</span>
            </label>
            {requirementType === "whatsapp" ? (
              <CountryPhoneInput
                value={targetInput}
                onChange={(val, fullInt) => {
                  setTargetInput(val);
                  setFormattedWhatsApp(fullInt);
                  if (inputError && val.trim()) setInputError(false);
                }}
                isAr={ar}
                error={inputError}
                autoFocus={false}
              />
            ) : (
              <div className="driffle-target-field-wrap">
                <input
                  ref={isDesktop ? inputRef : undefined}
                  id={inputId}
                  type={requirementType === "email" ? "email" : "text"}
                  dir="auto"
                  className="driffle-target-input"
                  placeholder={targetPlaceholder}
                  value={targetInput}
                  onChange={(e) => {
                    setTargetInput(e.target.value);
                    if (inputError && e.target.value.trim()) {
                      setInputError(false);
                    }
                  }}
                />
                {targetInput && (
                  <button
                    type="button"
                    className="driffle-target-clear-btn"
                    onClick={() => setTargetInput("")}
                    title={ar ? "مسح" : "Clear"}
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
            {inputError && (
              <div className="driffle-input-error-msg">
                <span>⚠️</span>
                <span>
                  {requirementType === "whatsapp"
                    ? (ar ? "يرجى وضع رقم الواتساب الخاص بك للمتابعة" : "Please provide your WhatsApp number to proceed")
                    : requirementType === "email"
                    ? (ar ? "يرجى وضع البريد الإلكتروني للمتابعة" : "Please provide your email to proceed")
                    : isLikeProduct
                    ? (ar ? "يرجى وضع رابط المنشور أو الريلز قبل إتمام الشراء" : "Please provide the post link before purchasing")
                    : (ar ? "يرجى وضع رابط الحساب أو اسم المستخدم للمتابعة" : "Please provide the profile link or username to proceed")}
                </span>
              </div>
            )}
            {targetHint && !inputError && (
              <div className="driffle-target-hint">{targetHint}</div>
            )}
            {requirementType === "whatsapp" && (
              <label
                className="driffle-remember-contact-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 10,
                  fontSize: "0.82rem",
                  color: "#cbd5e1",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => {
                    setRememberMe(e.target.checked);
                    setRememberContactEnabled(e.target.checked);
                  }}
                  style={{
                    accentColor: "#10b981",
                    width: 15,
                    height: 15,
                    cursor: "pointer",
                  }}
                />
                <span>
                  {ar
                    ? "تذكر رقمي للطلبات القادمة (حفظ تلقائي لعدم إدخاله كل مرة)"
                    : "Remember my number for future orders"}
                </span>
              </label>
            )}
          </div>
        )}

        {/* Out of Stock Notice & Notify Button OR Quantity Stepper & Buy Buttons */}
        {stockLimit !== null && stockLimit <= 0 ? (
          <div
            style={{
              background: "linear-gradient(145deg, rgba(24, 28, 38, 0.95) 0%, rgba(16, 19, 28, 0.98) 100%)",
              border: "1.5px solid rgba(0, 229, 255, 0.22)",
              borderRadius: 14,
              padding: "24px 20px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              margin: isOutOfStock ? "0 0 14px" : "18px 0 14px",
              boxShadow: "0 12px 32px -10px rgba(0, 229, 255, 0.12), 0 8px 24px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 900, color: "#ffffff", letterSpacing: "-0.02em", fontFamily: "'Tajawal', sans-serif" }}>
              {ar ? "عذراً، لقد نفدت :(" : "Sorry, Sold Out :("}
            </div>

            <p
              style={{
                fontSize: 13.5,
                color: "#94a3b8",
                lineHeight: 1.6,
                margin: 0,
                maxWidth: 320,
              }}
            >
              {ar
                ? "هل تريد هذا المنتج؟ يمكننا إخطارك عبر البريد الإلكتروني عندما يتوفر المنتج مرة أخرى."
                : "Want this product? We can notify you via email as soon as it is back in stock."}
            </p>

            <button
              type="button"
              onClick={() => setNotifyModalOpen(true)}
              style={{
                marginTop: 6,
                width: "100%",
                maxWidth: 290,
                padding: "11px 20px",
                borderRadius: 9,
                border: "1.5px solid rgba(0, 229, 255, 0.45)",
                background: "linear-gradient(135deg, rgba(0, 229, 255, 0.14) 0%, rgba(0, 229, 255, 0.04) 100%)",
                color: "#00e5ff",
                fontSize: 15,
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "all 0.2s ease",
                boxShadow: "0 4px 16px rgba(0, 229, 255, 0.18)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--cyan, #00e5ff)";
                e.currentTarget.style.color = "#05060a";
                e.currentTarget.style.boxShadow = "0 6px 22px rgba(0, 229, 255, 0.4)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, rgba(0, 229, 255, 0.14) 0%, rgba(0, 229, 255, 0.04) 100%)";
                e.currentTarget.style.color = "#00e5ff";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 229, 255, 0.18)";
                e.currentTarget.style.transform = "none";
              }}
            >
              <Bell size={18} strokeWidth={2.4} />
              <span>{ar ? "الإشعار" : "Notify me"}</span>
            </button>
          </div>
        ) : (
          <>
            {/* Quantity Stepper */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, margin: "14px 0 12px" }}>
              {stockLimit !== null && stockLimit > 0 ? (
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: stockLimit <= 3 ? "#ff2d78" : "var(--cyan, #00e5ff)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: stockLimit <= 3 ? "rgba(255, 45, 120, 0.12)" : "rgba(0, 229, 255, 0.08)",
                    border: `1px solid ${stockLimit <= 3 ? "rgba(255, 45, 120, 0.3)" : "rgba(0, 229, 255, 0.22)"}`,
                    borderRadius: 999,
                    padding: "3px 12px",
                    letterSpacing: "0.2px",
                  }}
                >
                  {stockLimit <= 5 && <span style={{ fontSize: 12 }}>⚡</span>}
                  <span>{ar ? `متبقي ${stockLimit}` : `${stockLimit} Available`}</span>
                </div>
              ) : (
                <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8" }}>
                  <span>{ar ? "الكمية المطلوبة" : "Quantity"}</span>
                </div>
              )}

              {/* Capsule Pill Stepper */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: 155,
                  background: "rgba(18, 21, 30, 0.9)",
                  border: "1.5px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 30,
                  padding: "4px 8px",
                  boxShadow: "0 4px 14px rgba(0, 0, 0, 0.35)",
                }}
              >
                <button
                  type="button"
                  onClick={handleDecreaseQuantity}
                  disabled={quantity <= 1}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: quantity <= 1 ? "rgba(255, 255, 255, 0.25)" : "#ffffff",
                    fontSize: 20,
                    fontWeight: 700,
                    cursor: quantity <= 1 ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.15s ease",
                  }}
                  title={ar ? "تقليل" : "Decrease"}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: "#ffffff",
                    minWidth: 32,
                    textAlign: "center",
                    userSelect: "none",
                    fontFamily: "'Tajawal', sans-serif",
                  }}
                >
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={handleIncreaseQuantity}
                  disabled={stockLimit !== null && quantity >= stockLimit}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    border: "none",
                    background: stockLimit !== null && quantity >= stockLimit ? "rgba(255, 255, 255, 0.08)" : "var(--cyan, #00e5ff)",
                    color: stockLimit !== null && quantity >= stockLimit ? "rgba(255, 255, 255, 0.3)" : "#05060a",
                    fontSize: 20,
                    fontWeight: 900,
                    cursor: stockLimit !== null && quantity >= stockLimit ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.15s ease",
                    boxShadow: stockLimit !== null && quantity >= stockLimit ? "none" : "0 2px 10px rgba(0, 229, 255, 0.4)",
                  }}
                  title={stockLimit !== null && quantity >= stockLimit ? (ar ? `أقصى كمية هي ${stockLimit}` : `Max is ${stockLimit}`) : (ar ? "زيادة" : "Increase")}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="driffle-cta-row gx-cta-row">
              <button
                type="button"
                className="driffle-cart-btn gx-cart-btn"
                onClick={handleAddToCart}
                title={ar ? "إضافة إلى السلة" : "Add to Cart"}
                aria-label={ar ? "إضافة إلى السلة" : "Add to Cart"}
              >
                {addedCart ? "✓" : "🛒"}
              </button>

              <button
                type="button"
                className="driffle-buy-now-btn gx-buy-now-btn"
                onClick={handleBuyNow}
              >
                <span>🛍️</span>
                <span>{ar ? "شراء الآن" : "Buy now"}</span>
              </button>
            </div>
          </>
        )}

        {/* Trust Highlights */}
        <div className="driffle-trust-box gx-trust-box">
          {isSocialProduct || isFollowerProduct || isLikeProduct ? (
            <>
              <div className="driffle-trust-item gx-trust-item" style={{ color: "#00e5ff" }}>
                <span className="driffle-trust-icon gx-trust-icon">⚡</span>
                <span>{ar ? "تنفيذ وتسليم خلال ساعة إلى 24 ساعة" : "Delivery within 1 to 24 hours"}</span>
              </div>
              <div className="driffle-trust-item gx-trust-item" style={{ color: "#10b981" }}>
                <span className="driffle-trust-icon gx-trust-icon">🛡️</span>
                <span>{ar ? "ضمان 30 يوماً تعويض كامل لأي Drop أو نقص" : "30-Day Guarantee: Free Refill for Any Drop"}</span>
              </div>
              <div className="driffle-trust-item gx-trust-item" style={{ color: "#f59e0b" }}>
                <span className="driffle-trust-icon gx-trust-icon">⚠️</span>
                <span>{ar ? "قد يطرأ انخفاض طبيعي (Drop) ونضمن تعويضه" : "Natural Drop May Occur & Is 100% Compensated"}</span>
              </div>
              <div className="driffle-trust-item gx-trust-item">
                <span className="driffle-trust-icon gx-trust-icon">🔒</span>
                <span>{ar ? "أمان وتفعيل رسمي 100%" : "100% Safe & Official"}</span>
              </div>
            </>
          ) : (
            <>
              <div className="driffle-trust-item gx-trust-item">
                <span className="driffle-trust-icon gx-trust-icon">⚡</span>
                <span>{ar ? "تسليم فوري ومباشر بعد الدفع" : "Instant Delivery within seconds"}</span>
              </div>
              <div className="driffle-trust-item gx-trust-item">
                <span className="driffle-trust-icon gx-trust-icon">🎧</span>
                <span>{ar ? "دعم فني وخدمة عملاء 24/7" : "24/7 Support & Live Assistance"}</span>
              </div>
              <div className="driffle-trust-item gx-trust-item">
                <span className="driffle-trust-icon gx-trust-icon">🛡️</span>
                <span>{ar ? "بائع موثوق وضمان رسمي 100%" : "Verified Seller & Official Warranty"}</span>
              </div>
            </>
          )}
        </div>

        {/* Only show other-offers-hint when multiple variants exist (> 1) and in desktop */}
        {variants.length > 1 && (
          <div
            className="driffle-other-offers-hint gx-other-offers-hint"
            onClick={() => {
              const el = document.querySelector(".driffle-variations-box, .gx-variations-box");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            +{variants.length - 1} {ar ? "خيارات وفئات إضافية متاحة لهذا المنتج" : "more options available"}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="wrap driffle-page-wrap gx-page-wrap">
      {/* 1. Breadcrumbs */}
      <nav className="driffle-breadcrumbs gx-breadcrumbs" aria-label="Breadcrumbs">
        <Link to="/">{ar ? "الرئيسية" : "Home"}</Link>
        <span className="sep">&gt;</span>
        {categorySlug ? (
          <Link to="/category/$slug" params={{ slug: categorySlug }}>
            {categoryName}
          </Link>
        ) : (
          <Link to="/products">{categoryName}</Link>
        )}
        <span className="sep">&gt;</span>
        <span className="cur">{name}</span>
      </nav>

      {/* 2. Main Layout (Left: Hero & Details, Right: Sticky Purchase Sidebar) */}
      <div className="driffle-layout gx-layout">
        {/* Left Column */}
        <main className="driffle-main gx-main">
          {/* Hero Section */}
          <section className="driffle-hero-card gx-hero-card">
            {/* Left Box: Visual Poster Art */}
            <div className="driffle-poster-box gx-poster-box">
              <div className="poster-glow" />
              {renderPoster()}
            </div>

            {/* Right Box: Key Product Info */}
            <div className="driffle-info-box gx-info-box">
              <div className="driffle-top-meta gx-top-meta">
                <div className="driffle-meta-left gx-meta-left">
                  <span className="driffle-cat-badge gx-cat-badge">{categoryName}</span>
                </div>

                {/* Wishlist Icon */}
                <button
                  type="button"
                  aria-label="Wishlist"
                  className={`driffle-wishlist-btn gx-wishlist-btn ${isWishlisted ? "active" : ""}`}
                  onClick={() => setIsWishlisted(!isWishlisted)}
                >
                  {isWishlisted ? "♥" : "♡"}
                </button>
              </div>

              {/* Product Title */}
              <h1 className="driffle-title gx-title">
                {name}
                {product.variants.length > 1 &&
                pick(activeVariant.labelAr, activeVariant.labelEn) &&
                !name.includes(pick(activeVariant.labelAr, activeVariant.labelEn))
                  ? ` - ${pick(activeVariant.labelAr, activeVariant.labelEn)}`
                  : ""}
                <span style={{ fontWeight: 500, color: "#94a3b8", fontSize: "0.82em", marginInlineStart: 8 }}>
                  • {cleanRegion} • {deliveryInfo.label}
                </span>
              </h1>

              {tagline && <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>{tagline}</p>}

              {/* Status Badges Row */}
              <div className="driffle-status-grid gx-status-grid">
                {/* 1. Activation Status */}
                {canActivate ? (
                  <div className="driffle-status-pill gx-status-pill">
                    <div className="driffle-status-icon green">✓</div>
                    <div className="driffle-status-text">
                      <span className="driffle-status-label">{ar ? "صلاحية التفعيل" : "Activation"}</span>
                      <span className="driffle-status-value">
                        {ar ? `يمكن التفعيل في: ` : `Can activate in: `}
                        <strong style={{ color: "#00f5a0" }}>{countryDisplayName}</strong>
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="driffle-status-pill danger gx-status-pill">
                    <div className="driffle-status-icon red">✕</div>
                    <div className="driffle-status-text">
                      <span className="driffle-status-label">{ar ? "صلاحية التفعيل" : "Activation"}</span>
                      <span className="driffle-status-value">
                        {ar ? `لا يعمل مباشرة في: ` : `Cannot activate in: `}
                        <strong style={{ color: "#ff4d6d" }}>{countryDisplayName}</strong>
                      </span>
                    </div>
                  </div>
                )}

                {/* 2. Region Badge */}
                <div className="driffle-status-pill gx-status-pill">
                  <div className="driffle-status-icon blue">🌐</div>
                  <div className="driffle-status-text">
                    <span className="driffle-status-label">{ar ? "المنطقة" : "Region"}</span>
                    <span className="driffle-status-value">{cleanRegion}</span>
                  </div>
                </div>

                {/* 3. Platform Badge */}
                <div className="driffle-status-pill gx-status-pill">
                  <div className="driffle-status-icon">🎮</div>
                  <div className="driffle-status-text">
                    <span className="driffle-status-label">{ar ? "المنصة" : "Platform"}</span>
                    <span className="driffle-status-value">{platform}</span>
                  </div>
                </div>

                {/* 4. Delivery Type Pill with Tooltip */}
                <div
                  className="driffle-status-pill gx-status-pill"
                  style={{ cursor: "pointer" }}
                  onClick={() => setTooltipOpen(!tooltipOpen)}
                >
                  <div className="driffle-status-icon" style={{ background: "rgba(0, 229, 255, 0.15)", color: "#00e5ff" }}>
                    {deliveryInfo.icon}
                  </div>
                  <div className="driffle-status-text">
                    <span className="driffle-status-label">{ar ? "نوع التسليم" : "Delivery Type"}</span>
                    <span className="driffle-status-value" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {deliveryInfo.label}
                      <span style={{ fontSize: 11, color: "#00e5ff" }}>ⓘ</span>
                    </span>
                  </div>

                  {/* Tooltip */}
                  {tooltipOpen && (
                    <div
                      className="prod-type-tooltip is-visible"
                      style={{ bottom: "110%", top: "auto", left: 0, right: "auto" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="prod-type-tooltip-title">
                        <span>{deliveryInfo.icon}</span>
                        <span>{deliveryInfo.label}</span>
                      </div>
                      <div className="prod-type-tooltip-desc">{deliveryInfo.desc}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Variations / Duration Cards Selector: Only when multiple variants exist (> 1) */}
          {variants.length > 1 && (
            <section className="driffle-variations-box gx-variations-box">
              <div className="driffle-variations-header gx-variations-header">
                <span className="driffle-var-heading gx-var-heading">
                  <span>⏱️</span>
                  <span>{ar ? "اختر الباقة / المدة" : "Select Duration / Plan"}</span>
                </span>
                <span className="driffle-var-region-tag gx-var-region-tag">{cleanRegion}</span>
              </div>

              {/* TOD Categorized Filter Tabs (TOD / TOD Mobile / TOD 4K) */}
              {isTod && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "4px 0 16px 0" }}>
                  {[
                    { id: "all", label: ar ? "✨ كل الباقات (10)" : "All Plans (10)", count: variants.length },
                    { id: "tod-total", label: ar ? "📺 باقة TOD (شاشات وأجهزة ذكية)" : "TOD (Smart TVs & Devices)", count: variants.filter((x) => x.planGroup === "tod-total").length },
                    { id: "tod-mobile", label: ar ? "📱 باقة TOD Mobile (موبايل وتابلت)" : "TOD Mobile (Phone & Tablet)", count: variants.filter((x) => x.planGroup === "tod-mobile").length },
                    { id: "tod-4k", label: ar ? "🌟 باقة TOD 4K (أعلى دقة 4K)" : "TOD 4K Ultra HD", count: variants.filter((x) => x.planGroup === "tod-4k").length },
                  ].map((tab) => {
                    const isTabActive = todFilterGroup === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setTodFilterGroup(tab.id)}
                        style={{
                          padding: "7px 14px",
                          borderRadius: 22,
                          border: isTabActive ? "1.5px solid #f59e0b" : "1px solid rgba(255, 255, 255, 0.12)",
                          background: isTabActive ? "rgba(245, 158, 11, 0.18)" : "rgba(255, 255, 255, 0.04)",
                          color: isTabActive ? "#fbbf24" : "#cbd5e1",
                          fontSize: 12.5,
                          fontWeight: isTabActive ? 750 : 500,
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="driffle-var-grid gx-var-grid">
                {variants
                  .filter((v) => {
                    if (!isTod || todFilterGroup === "all") return true;
                    return v.planGroup === todFilterGroup;
                  })
                  .map((v) => {
                    const isActive = v.cartId === activeVariant.cartId;
                    const vLabel = pick(v.labelAr, v.labelEn);
                    const vLimit = getEffectiveStockLimit(
                      siteSettings?.product_stock_limits,
                      v.cartId,
                      product.slug
                    );
                    const vIsOutOfStock = vLimit !== null && vLimit <= 0;
                    return (
                      <button
                        key={v.cartId}
                        type="button"
                        className={`driffle-var-card gx-var-card ${isActive ? "is-active" : ""} ${vIsOutOfStock ? "is-sold-out" : ""}`}
                        onClick={() => handleSelectVariant(v.cartId)}
                      >
                        <div className="driffle-var-top gx-var-top">
                          <span className="driffle-var-name gx-var-name">{vLabel}</span>
                          <div className="driffle-var-radio gx-var-radio" />
                        </div>
                        {v.tagAr ? (
                          <div style={{ margin: "4px 0" }}>
                            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", fontWeight: 700 }}>
                              {v.tagAr}
                            </span>
                          </div>
                        ) : vIsOutOfStock ? (
                          <div style={{ margin: "4px 0" }}>
                            <span style={{ fontSize: 10.5, padding: "2px 7px", borderRadius: 10, background: "rgba(255, 59, 113, 0.15)", color: "#ff3b71", fontWeight: 800 }}>
                              {ar ? "نفدت" : "Sold Out"}
                            </span>
                          </div>
                        ) : null}
                        <div className="driffle-var-price gx-var-price">
                          {vIsOutOfStock ? (
                            <span style={{ color: "#ff3b71", fontWeight: 800, fontSize: 12 }}>
                              {ar ? "نفدت الكمية" : "Sold Out"}
                            </span>
                          ) : (
                            <>
                              <span>{ar ? "السعر:" : "Price:"} </span>
                              <strong>{format(v.price)}</strong>
                              {v.oldPrice && v.oldPrice > v.price && (
                                <span style={{ textDecoration: "line-through", color: "#64748b", fontSize: 11, marginInlineStart: 6 }}>
                                  {format(v.oldPrice)}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </section>
          )}

          {/* Official TOD Comparison Table & Guarantee (Only on TOD product) */}
          {isTod && (
            <section
              className="gx-tod-comparison-section"
              style={{
                margin: "18px 0 24px 0",
                padding: "20px 22px",
                background: "linear-gradient(135deg, rgba(43, 17, 84, 0.42), rgba(18, 6, 38, 0.65))",
                borderRadius: 16,
                border: "1px solid rgba(245, 158, 11, 0.28)",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 24 }}>⚖️</span>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: "#f8fafc", margin: 0 }}>
                  {ar ? "دليل المقارنة الرسمي بين باقات TOD (معلومات رسمية 100%)" : "Official TOD Packages Comparison"}
                </h3>
              </div>

              <p style={{ fontSize: 13.5, color: "#cbd5e1", lineHeight: 1.7, margin: "0 0 16px 0" }}>
                {ar
                  ? "جميع باقات TOD تمنحك وصولاً كاملاً وغير محدود لقنوات beIN Sports الرياضية وأضخم مكتبة أفلام ومسلسلات. يوضح الجدول التالي الفرق بين الباقات الرسمية لتختار الباقة الأنسب لجهازك:"
                  : "All TOD plans provide complete access to beIN Sports and cinema libraries. See the breakdown below:"}
              </p>

              <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                    textAlign: ar ? "right" : "left",
                    minWidth: 540,
                  }}
                >
                  <thead>
                    <tr style={{ background: "rgba(255, 255, 255, 0.06)", borderBottom: "1px solid rgba(255, 255, 255, 0.12)" }}>
                      <th style={{ padding: "10px 14px", color: "#94a3b8", fontWeight: 700 }}>{ar ? "الميزة" : "Feature"}</th>
                      <th style={{ padding: "10px 14px", color: "#38bdf8", fontWeight: 800 }}>📱 TOD Mobile</th>
                      <th style={{ padding: "10px 14px", color: "#c084fc", fontWeight: 800 }}>📺 TOD Total / TV</th>
                      <th style={{ padding: "10px 14px", color: "#f59e0b", fontWeight: 800 }}>🌟 TOD 4K Ultra HD</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 700, color: "#e2e8f0" }}>{ar ? "الأجهزة المدعومة" : "Devices"}</td>
                      <td style={{ padding: "10px 14px", color: "#cbd5e1" }}>{ar ? "الموبايل والتابلت فقط (iOS / Android) — لا يدعم التلفزيون" : "Smartphones & Tablets only (No TV support)"}</td>
                      <td style={{ padding: "10px 14px", color: "#cbd5e1" }}>{ar ? "الشاشات الذكية (Smart TV)، الكمبيوتر، والموبايل" : "Smart TVs, PC/Mac, and Mobile/Tablets"}</td>
                      <td style={{ padding: "10px 14px", color: "#cbd5e1" }}>{ar ? "شاشات 4K الذكية، أجهزة البث، وجميع الأجهزة" : "4K Smart TVs, streaming boxes, PC/Mac, Mobile"}</td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 700, color: "#e2e8f0" }}>{ar ? "الشاشات المتزامنة" : "Simultaneous Screens"}</td>
                      <td style={{ padding: "10px 14px", color: "#cbd5e1" }}>{ar ? "شاشة واحدة فقط (1 Screen)" : "1 Screen only"}</td>
                      <td style={{ padding: "10px 14px", color: "#cbd5e1" }}>{ar ? "شاشتان في نفس الوقت (2 Screens)" : "2 Screens simultaneously"}</td>
                      <td style={{ padding: "10px 14px", color: "#cbd5e1" }}>{ar ? "شاشتان في نفس الوقت (2 Screens)" : "2 Screens simultaneously"}</td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 700, color: "#e2e8f0" }}>{ar ? "أقصى دقة بث" : "Max Resolution"}</td>
                      <td style={{ padding: "10px 14px", color: "#cbd5e1" }}>{ar ? "دقة SD / HD (حتى 720p)" : "SD / HD (Up to 720p)"}</td>
                      <td style={{ padding: "10px 14px", color: "#cbd5e1" }}>{ar ? "Full HD عالية الوضوح (1080p)" : "Full HD (1080p)"}</td>
                      <td style={{ padding: "10px 14px", color: "#f59e0b", fontWeight: 700 }}>{ar ? "Ultra HD 4K فائقة الوضوح + صوت Dolby" : "4K Ultra HD + Dolby Audio"}</td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 700, color: "#e2e8f0" }}>{ar ? "المحتوى والبطولات" : "Content & Sports"}</td>
                      <td style={{ padding: "10px 14px", color: "#cbd5e1" }}>{ar ? "دوري أبطال أوروبا، الإنجليزي، الإسباني + أفلام ومسلسلات" : "beIN Sports UCL, EPL, LaLiga + Movies"}</td>
                      <td style={{ padding: "10px 14px", color: "#cbd5e1" }}>{ar ? "دوري أبطال أوروبا، الإنجليزي، الإسباني + أفلام ومسلسلات" : "beIN Sports UCL, EPL, LaLiga + Movies"}</td>
                      <td style={{ padding: "10px 14px", color: "#cbd5e1" }}>{ar ? "كافة الدوريات + بث 4K للمباريات الكبرى ومكتبة أفلام 4K" : "All sports + live 4K marquee feeds & 4K cinema"}</td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 700, color: "#e2e8f0" }}>{ar ? "نوع الاشتراك" : "Delivery"}</td>
                      <td style={{ padding: "10px 14px", color: "#10b981", fontWeight: 700 }} colSpan={3}>
                        {ar ? "كود وقسيمة رقمية أصلية ورسمية 100% لتفعيلها مباشرة على حسابك الشخصي في TOD" : "100% Genuine Digital Voucher Code activated on your own TOD account"}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "10px 14px", fontWeight: 700, color: "#e2e8f0" }}>{ar ? "الضمان" : "Warranty"}</td>
                      <td style={{ padding: "10px 14px", color: "#10b981", fontWeight: 700 }} colSpan={3}>
                        {ar ? "🛡️ ضمان كامل ومستمر طوال فترة الاشتراك المحددة 100%" : "🛡️ Full 100% warranty covering the entire duration"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Golden Guarantee Badge Box */}
              <div
                style={{
                  marginTop: 16,
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: "rgba(16, 185, 129, 0.12)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 24 }}>🛡️</span>
                <div style={{ fontSize: 13, color: "#d1fae5", lineHeight: 1.6 }}>
                  <strong>{ar ? "ضمان GX Store المعتمد:" : "GX Store Official Warranty:"}</strong>{" "}
                  {ar
                    ? "جميع أكواد TOD المتوفرة في متجرنا رسمية ومصدرها معتمد في الأردن والشرق الأوسط، ومشمولة بضمان كامل 100% طوال مدة الاشتراك مع دعم فني متواصل."
                    : "All TOD vouchers sold in our store are 100% official and authorized in Jordan & MENA, backed by a full duration guarantee and continuous customer support."}
                </div>
              </div>
            </section>
          )}

          {/* Mobile-Only Purchase Card: Placed directly at the top of the mobile screen under Hero/Variations */}
          <div className="gx-mobile-buy-box">
            {renderBuyCard(false)}
          </div>

          {/* Important Notice Box (Single top box, can be hidden from admin) */}
          {!isNoticeHidden && displayNoticeList.length > 0 && (
            <section className="driffle-notice-box gx-notice-box" style={isSteamGameAccount ? { borderColor: "rgba(0, 229, 255, 0.45)", background: "linear-gradient(135deg, rgba(23, 29, 43, 0.95), rgba(15, 23, 42, 0.92))" } : undefined}>
              <div className="driffle-notice-icon gx-notice-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div className="driffle-notice-content gx-notice-content">
                <div className="driffle-notice-title gx-notice-title">
                  <span>{isSteamGameAccount ? (ar ? "تنبيه هام (حساب ستيم)" : "Important Notice") : (ar ? "تنبيه وتعليمات هامة" : "Important Notice")}</span>
                  <span className="driffle-notice-badge" style={isSteamGameAccount ? { background: "rgba(0, 229, 255, 0.15)", color: "var(--cyan, #00e5ff)", borderColor: "rgba(0, 229, 255, 0.3)" } : isYouTube ? { background: "rgba(255, 0, 0, 0.15)", color: "#ff4b4b", borderColor: "rgba(255, 0, 0, 0.35)" } : undefined}>
                    {isSteamGameAccount ? "Steam Account" : isYouTube ? (ar ? "دعوة عائلية على الإيميل" : "Email Family Invite") : (ar ? "معلومات هامة" : "Verified Info")}
                  </span>
                </div>
                <div className="driffle-notice-items-grid">
                  {displayNoticeList.map((pt: string, idx: number) => (
                    <div key={idx} className="driffle-notice-item">
                      <span className="driffle-notice-bullet">✦</span>
                      <span className="driffle-notice-text">{pt}</span>
                    </div>
                  ))}
                </div>

                {isSteamGameAccount && !ar && (
                  <div style={{ marginTop: 14, padding: "12px 14px", background: "rgba(0,0,0,0.38)", borderRadius: 10, fontSize: 13, color: "#cbd5e1", lineHeight: 1.65, borderLeft: "3px solid var(--cyan, #00e5ff)" }}>
                    <strong style={{ color: "var(--cyan, #00e5ff)", display: "block", marginBottom: 6, fontSize: 13.5 }}>Important Notice:</strong>
                    <p style={{ margin: "0 0 6px" }}>Pre-order bonuses may not be included or differ from other offers. Your game key will be sent on the official release date.</p>
                    <p style={{ margin: "0 0 6px" }}>This is not a product key. A new account will be created for you, and the purchased content will be accessible through that account. You can log in using the credentials provided in your Inventory.</p>
                    <p style={{ margin: 0 }}>Please avoid making any changes to the purchased account — such as adding payment methods or modifying the region — as this may lead to the account being suspended. No refunds will be issued in such cases.</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Frequently Bought Together: Only renders when configured with real catalog products */}
          {configuredBundle && (
            <section className="driffle-bundle-box gx-bundle-box">
              <h2 className="driffle-section-heading gx-section-heading">
                {ar ? "غالباً ما يُشترى معاً" : "Frequently Bought Together"}
              </h2>

              <div className="driffle-bundle-items-row gx-bundle-items-row">
                {/* Item 1 */}
                <div className="driffle-bundle-card gx-bundle-card">
                  <img
                    src={product.imageUrl || product.iconImage || "/app/assets/img/gemini-logo.svg"}
                    alt={name}
                    className="driffle-bundle-thumb"
                  />
                  <div className="driffle-bundle-info gx-bundle-info">
                    <span className="driffle-bundle-name gx-bundle-name">{name}</span>
                    <span className="driffle-bundle-price gx-bundle-price">{format(activePrice)}</span>
                  </div>
                </div>

                {/* Plus Sign */}
                <div className="driffle-bundle-plus">+</div>

                {/* Item 2 */}
                <div className="driffle-bundle-card gx-bundle-card">
                  <img src={configuredBundle.thumb} alt={pick(configuredBundle.nameAr, configuredBundle.nameEn)} className="driffle-bundle-thumb" />
                  <div className="driffle-bundle-info gx-bundle-info">
                    <span className="driffle-bundle-name gx-bundle-name">{pick(configuredBundle.nameAr, configuredBundle.nameEn)}</span>
                    <span className="driffle-bundle-price gx-bundle-price">{format(configuredBundle.price)}</span>
                  </div>
                </div>
              </div>

              <div className="driffle-bundle-footer gx-bundle-footer">
                <div className="driffle-bundle-total gx-bundle-total">
                  <span>{ar ? "احصل على الباقة معاً بسعر: " : "Get this bundle for: "}</span>
                  <strong>{format(bundleTotal)}</strong>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: "10px 22px", borderRadius: 12 }}
                  onClick={handleBuyBundle}
                >
                  {ar ? "شراء الباقة معاً" : "Buy bundle"}
                </button>
              </div>
            </section>
          )}

          {/* Description & Key Features */}
          <section className="driffle-desc-box gx-desc-box">
            <div>
              <h2 className="driffle-section-heading gx-section-heading" style={{ marginBottom: 12 }}>
                {ar ? `عن ${name}` : `About ${name}`}
              </h2>
              <div className="driffle-desc-text gx-desc-text">
                <p>
                  {description ||
                    (ar
                      ? `احصل على أقصى درجات الإنتاجية والإبداع الرقمي مع ${name}. اشتراك أصلي 100% يوفر لك وصولاً كاملاً وغير محدود لأقوى النماذج والأدوات البرمجية المتطورة على مدار الساعة.`
                      : `Unlock advanced capabilities with ${name}. 100% genuine subscription providing full uninterrupted access to state-of-the-art tools and features.`)}
                </p>
              </div>
            </div>

            {/* Key Features */}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#f8fafc", marginBottom: 10 }}>
                {ar ? "المميزات والخصائص الرئيسية:" : "Key Features:"}
              </h3>
              <div className="driffle-features-list gx-features-list">
                {(product.features && product.features.length > 0
                  ? product.features
                  : [
                      { icon: null as string | null, titleAr: "وصول غير محدود وسريع", titleEn: "Unlimited Fast Access", descAr: "استفادة كاملة بدون انقطاع طوال فترة الاشتراك.", descEn: "Full access without interruption." },
                      { icon: null as string | null, titleAr: "ضمان رسمي كامل 100%", titleEn: "100% Official Warranty", descAr: "ضمان حقيقي يشمل الدعم الفني والاستبدال.", descEn: "Comprehensive warranty with continuous support." },
                      { icon: null as string | null, titleAr: "تسليم فوري ومباشر", titleEn: "Instant Automated Delivery", descAr: "استلام بيانات التفعيل فور إتمام عملية الدفع.", descEn: "Receive credentials immediately upon checkout." },
                      { icon: null as string | null, titleAr: "تكامل مع مختلف الأجهزة", titleEn: "Multi-Platform Compatibility", descAr: "يعمل على الهاتف، الحاسوب، واللوحي بسلاسة.", descEn: "Works seamlessly across mobile, desktop, and web." },
                    ]
                ).map((f, i) => (
                  <div key={i} className="driffle-feature-item gx-feature-item">
                    <span className="feat-icon">{f.icon || "★"}</span>
                    <div>
                      <div className="feat-title">{pick(f.titleAr, f.titleEn)}</div>
                      <div className="feat-desc">{pick(f.descAr, f.descEn)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* How to Redeem Steps */}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#f8fafc", marginBottom: 10 }}>
                {ar ? "طريقة التفعيل والاستخدام (How to redeem?):" : "How to redeem?"}
              </h3>
              <div className="driffle-steps-grid gx-steps-grid">
                {redeemSteps.map((step, idx) => (
                  <div key={idx} className="driffle-step-card gx-step-card">
                    <div className="driffle-step-num gx-step-num">{idx + 1}</div>
                    <div className="driffle-step-body gx-step-body">{renderStepContent(step)}</div>
                  </div>
                ))}
              </div>
            </div>


          </section>
        </main>

        {/* Right Column: Sticky Purchase Sidebar (Desktop Only) */}
        <aside className="driffle-sidebar gx-sidebar gx-desktop-sidebar">
          {renderBuyCard(true)}
        </aside>
      </div>

      {/* 3. Sticky Mobile Bottom Floating Action Bar */}
      <div className="gx-mobile-sticky-buy-bar">
        <div className="gx-sticky-bar-info">
          <div className="gx-sticky-bar-title">
            {name}
            {product.variants.length > 1 && pick(activeVariant.labelAr, activeVariant.labelEn) && (
              <span className="gx-sticky-bar-variant"> • {pick(activeVariant.labelAr, activeVariant.labelEn)}</span>
            )}
          </div>
          <div className="gx-sticky-bar-price">
            {isOutOfStock ? (
              <span style={{ color: "#ff3b71", fontWeight: 800, fontSize: 14 }}>
                {ar ? "نفدت الكمية" : "Sold Out"}
              </span>
            ) : (
              <>
                <strong>{format(activePrice)}</strong>
                {activeVariant.oldPrice && activeVariant.oldPrice > activePrice && (
                  <span className="gx-sticky-bar-old">{format(activeVariant.oldPrice)}</span>
                )}
              </>
            )}
          </div>
        </div>
        <div className="gx-sticky-bar-actions">
          {stockLimit !== null && stockLimit <= 0 ? (
            <button
              type="button"
              onClick={() => setNotifyModalOpen(true)}
              style={{
                padding: "10px 18px",
                borderRadius: 9,
                border: "1.5px solid rgba(0, 229, 255, 0.45)",
                background: "linear-gradient(135deg, rgba(0, 229, 255, 0.18) 0%, rgba(0, 229, 255, 0.06) 100%)",
                color: "#00e5ff",
                fontSize: 13,
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
                boxShadow: "0 2px 10px rgba(0, 229, 255, 0.2)",
              }}
            >
              <Bell size={15} strokeWidth={2.4} />
              <span>{ar ? "الإشعار عند التوفر" : "Notify me"}</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                className="gx-sticky-cart-btn"
                onClick={handleAddToCart}
                title={ar ? "إضافة إلى السلة" : "Add to Cart"}
                aria-label={ar ? "إضافة إلى السلة" : "Add to Cart"}
              >
                {addedCart ? "✓" : "🛒"}
              </button>
              <button
                type="button"
                className="gx-sticky-buy-btn"
                onClick={handleBuyNow}
              >
                <span>🛍️</span>
                <span>{ar ? "شراء الآن" : "Buy now"}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Restock Notification Dialog */}
      <Dialog open={notifyModalOpen} onOpenChange={setNotifyModalOpen}>
        <DialogContent
          className="gx-notify-modal-content"
          style={{
            maxWidth: 440,
            background: "#0c0d14",
            border: "1.5px solid rgba(0, 229, 255, 0.28)",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 229, 255, 0.12)",
            color: "#ffffff",
            direction: ar ? "rtl" : "ltr",
            borderRadius: 18,
            padding: "24px 22px",
          }}
        >
          <DialogHeader>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "rgba(0, 229, 255, 0.12)",
                border: "1.5px solid rgba(0, 229, 255, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 8px",
                color: "#00e5ff",
                boxShadow: "0 0 16px rgba(0, 229, 255, 0.25)",
              }}
            >
              <Bell size={24} strokeWidth={2.4} />
            </div>
            <DialogTitle
              style={{
                textAlign: "center",
                fontSize: 19,
                fontWeight: 900,
                color: "#ffffff",
                fontFamily: "'Tajawal', sans-serif",
              }}
            >
              {ar ? "طلب إشعار عند التوفر" : "Restock Notification"}
            </DialogTitle>
          </DialogHeader>

          <p
            style={{
              textAlign: "center",
              fontSize: 13.5,
              color: "#94a3b8",
              marginTop: 4,
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            {ar
              ? `أدخل اسمك وبريدك الإلكتروني، وسنرسل لك إشعاراً فور توفر ${name} مباشرة!`
              : `Enter your details to receive an instant email notification once ${name} is back in stock!`}
          </p>

          <form onSubmit={handleRestockNotifySubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "#e2e8f0" }}>
                {ar ? "الاسم الكريم *" : "Your Name *"}
              </label>
              <input
                type="text"
                required
                value={notifyName}
                onChange={(e) => setNotifyName(e.target.value)}
                placeholder={ar ? "مثال: أحمد الزبن" : "e.g. John Doe"}
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: 10,
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.14)",
                  color: "#ffffff",
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "#e2e8f0" }}>
                {ar ? "البريد الإلكتروني للإشعار *" : "Notification Email *"}
              </label>
              <input
                type="email"
                required
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                placeholder="name@example.com"
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: 10,
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.14)",
                  color: "#ffffff",
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={notifySubmitting || notifySubmitted}
              style={{
                marginTop: 8,
                width: "100%",
                padding: "12px",
                borderRadius: 10,
                border: "none",
                background: notifySubmitted
                  ? "#10b981"
                  : "linear-gradient(135deg, var(--cyan, #00e5ff) 0%, #00b8d4 100%)",
                color: notifySubmitted ? "#ffffff" : "#05060a",
                fontSize: 15,
                fontWeight: 900,
                cursor: notifySubmitting || notifySubmitted ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 4px 18px rgba(0, 229, 255, 0.35)",
                transition: "all 0.2s ease",
              }}
            >
              {notifySubmitting ? (
                <span>{ar ? "جاري الإرسال..." : "Submitting..."}</span>
              ) : notifySubmitted ? (
                <span>{ar ? "✓ تم تسجيل طلبك بنجاح" : "✓ Subscribed Successfully"}</span>
              ) : (
                <span>{ar ? "🔔 إخطاري عند توفر المنتج" : "🔔 Notify Me When Available"}</span>
              )}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
