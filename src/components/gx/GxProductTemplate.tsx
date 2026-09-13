import React, { useState, useMemo, useEffect, useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { CatalogProduct, CatalogVariant } from "@/lib/gx/catalog.functions";
import { useCurrency } from "@/lib/gx/currency";
import { useCart } from "@/lib/gx/cart";
import { useLang } from "@/lib/gx/i18n";
import { CART_ADDED_EVENT } from "./AddedToCartModal";
import { getDeliveryTypeInfo } from "@/lib/gx/delivery-types";
import { AdobePoster, CanvaPoster, WindowsPoster } from "@/lib/gx/brand-icons";

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

function detectCountryFromTimezone(): { code: string; ar: string; en: string } {
  try {
    const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone || "" : "";
    if (tz.includes("Qatar")) return { code: "QA", ar: "قطر", en: "Qatar" };
    if (tz.includes("Amman")) return { code: "JO", ar: "الأردن", en: "Jordan" };
    if (tz.includes("Riyadh")) return { code: "SA", ar: "السعودية", en: "Saudi Arabia" };
    if (tz.includes("Dubai")) return { code: "AE", ar: "الإمارات", en: "UAE" };
    if (tz.includes("Kuwait")) return { code: "KW", ar: "الكويت", en: "Kuwait" };
    if (tz.includes("Bahrain")) return { code: "BH", ar: "البحرين", en: "Bahrain" };
    if (tz.includes("Muscat")) return { code: "OM", ar: "عُمان", en: "Oman" };
    if (tz.includes("Baghdad")) return { code: "IQ", ar: "العراق", en: "Iraq" };
    if (tz.includes("Beirut")) return { code: "LB", ar: "لبنان", en: "Lebanon" };
    if (tz.includes("Damascus")) return { code: "SY", ar: "سوريا", en: "Syria" };
    if (tz.includes("Jerusalem") || tz.includes("Gaza") || tz.includes("Hebron")) return { code: "PS", ar: "فلسطين", en: "Palestine" };
    if (tz.includes("Cairo")) return { code: "EG", ar: "مصر", en: "Egypt" };
    if (tz.includes("Tripoli")) return { code: "LY", ar: "ليبيا", en: "Libya" };
    if (tz.includes("Tunis")) return { code: "TN", ar: "تونس", en: "Tunisia" };
    if (tz.includes("Algiers")) return { code: "DZ", ar: "الجزائر", en: "Algeria" };
    if (tz.includes("Casablanca")) return { code: "MA", ar: "المغرب", en: "Morocco" };
    if (tz.includes("Istanbul")) return { code: "TR", ar: "تركيا", en: "Turkey" };
    if (tz.includes("London")) return { code: "GB", ar: "بريطانيا", en: "UK" };
    if (tz.startsWith("America/")) return { code: "US", ar: "أمريكا", en: "USA" };
  } catch (e) {
    // ignore
  }
  return { code: "JO", ar: "الأردن", en: "Jordan" };
}

function useUserCountry() {
  const [geo, setGeo] = useState<{ code: string; ar: string; en: string }>(detectCountryFromTimezone);

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem("gx_user_geo");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.code && parsed?.ar) {
          setGeo(parsed);
          return;
        }
      }
    } catch (e) {}

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    fetch("https://api.country.is", { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        clearTimeout(timeoutId);
        if (data?.country && COUNTRY_MAP[data.country]) {
          const resolved = {
            code: data.country,
            ar: COUNTRY_MAP[data.country].ar,
            en: COUNTRY_MAP[data.country].en,
          };
          setGeo(resolved);
          try {
            sessionStorage.setItem("gx_user_geo", JSON.stringify(resolved));
          } catch (e) {}
        }
      })
      .catch(() => {
        // Fallback to timezone already set
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  return geo;
}

export function GxProductTemplate({ product }: { product: CatalogProduct }) {
  const { lang, t } = useLang();
  const ar = lang === "ar";
  const { format } = useCurrency();
  const cart = useCart();
  const navigate = useNavigate();

  const pick = (arText?: string | null, enText?: string | null) =>
    (ar ? arText || enText : enText || arText) || "";

  const name = pick(product.nameAr, product.nameEn);
  const tagline = pick(product.taglineAr, product.taglineEn);
  const description = pick(product.descriptionAr, product.descriptionEn);
  const rawCat = pick(product.categoryNameAr, product.categoryNameEn);
  const categoryName = rawCat && rawCat.toLowerCase() !== name.toLowerCase()
    ? rawCat
    : (product.slug.includes("gemini")
        ? (ar ? "الاشتراكات الرقمية والذكاء الاصطناعي" : "AI & Digital Subscriptions")
        : (ar ? "الاشتراكات والبرامج" : "Subscriptions & Software"));

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

  const initialVariantId = useMemo(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("plan");
      if (p && variants.some((v) => v.cartId === p)) return p;
    }
    return variants[0]?.cartId || "";
  }, [variants]);

  const [selectedVariantId, setSelectedVariantId] = useState<string>(initialVariantId);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("plan");
      if (p && variants.some((v) => v.cartId === p)) {
        setSelectedVariantId(p);
      }
    }
  }, [variants]);
  const [isWishlisted, setIsWishlisted] = useState<boolean>(false);
  const [tooltipOpen, setTooltipOpen] = useState<boolean>(false);
  const [addedCart, setAddedCart] = useState<boolean>(false);
  const [targetInput, setTargetInput] = useState<string>("");
  const [inputError, setInputError] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const requiresCustomerInput = useMemo(() => {
    return Boolean(
      product.requiresPlayerId ||
      product.identifierLabelAr ||
      isSocialProduct
    );
  }, [product.requiresPlayerId, product.identifierLabelAr, isSocialProduct]);

  const targetLabel = useMemo(() => {
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
  }, [isLikeProduct, isFollowerProduct, isSocialProduct, product.identifierLabelAr, product.identifierLabelEn, ar]);

  const targetPlaceholder = useMemo(() => {
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
  }, [isLikeProduct, isFollowerProduct, isSocialProduct, product.identifierPlaceholder, ar]);

  const targetHint = useMemo(() => {
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
  }, [isLikeProduct, isFollowerProduct, isSocialProduct, ar]);

  const activeVariant: CatalogVariant =
    variants.find((v) => v.cartId === selectedVariantId) || variants[0];

  const activePrice = activeVariant.price || 0;

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
    if (s.includes("gemini") || s.includes("google")) return "Google Gemini";
    if (s.includes("windows") || s.includes("office") || s.includes("microsoft")) return "Microsoft";
    if (s.includes("adobe")) return "Adobe Creative Cloud";
    if (s.includes("canva")) return "Canva";
    if (s.includes("steam") || s.includes("fc-27") || c.includes("game")) return "Steam / PC";
    if (s.includes("playstation")) return "PlayStation Network";
    if (s.includes("xbox")) return "Xbox Live";
    return "Official Platform";
  }, [product.slug, categoryName]);

  // Region resolution
  const cleanRegion = useMemo(() => {
    const r = (activeVariant.region || product.region || "").toLowerCase();
    if (r.includes("us") || r.includes("أمريك")) return ar ? "أمريكي (USA)" : "USA";
    if (r.includes("turkey") || r.includes("تركي")) return ar ? "تركي (Turkey)" : "Turkey";
    if (r.includes("ksa") || r.includes("سعود")) return ar ? "سعودي (KSA)" : "KSA";
    return ar ? "عالمي (Global)" : "Global";
  }, [activeVariant.region, product.region, ar]);

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

    // Software apps that specifically use their SVG logos instead of full cover artwork
    const isSvgApp = ["autodesk", "microsoft365", "linkedin", "gemini"].includes(product.slug);
    const coverSrc = product.imageUrl || product.iconImage;

    // Full Cover Poster (for all games, subscriptions, and catalog items with cover art)
    if (!isSvgApp && coverSrc) {
      return (
        <div className="driffle-poster-inner full-cover">
          <img
            src={coverSrc}
            alt={name}
            className="driffle-cover-img"
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
    if (requiresCustomerInput) {
      const trimmed = targetInput.trim();
      if (!trimmed) {
        setInputError(true);
        inputRef.current?.focus();
        inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        return false;
      }
    }
    return true;
  };

  const handleAddToCart = () => {
    if (!validateTargetInput()) return;
    setInputError(false);
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
      usernames: targetInput.trim() ? [targetInput.trim()] : undefined,
    });
    setAddedCart(true);
    window.dispatchEvent(new CustomEvent(CART_ADDED_EVENT));
    setTimeout(() => setAddedCart(false), 1400);
  };

  const handleBuyNow = () => {
    if (!validateTargetInput()) return;
    setInputError(false);
    const variantLabel = pick(activeVariant.labelAr, activeVariant.labelEn);
    const itemName = variantLabel && !name.includes(variantLabel) ? `${name} — ${variantLabel}` : name;
    cart.buyNow(activeVariant.cartId, 1, {
      price: activePrice,
      name: itemName,
      product: product.slug,
      icon: product.icon || "✨",
      iconImage: product.iconImage || product.imageUrl,
      imageUrl: product.imageUrl || product.iconImage,
      bg: product.thumbBg,
      usernames: targetInput.trim() ? [targetInput.trim()] : undefined,
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

  // Contextual Notice Points
  const noticePoints = useMemo(() => {
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
          ? "🔒 أمان وخصوصية تامة: لا نطلب كلمة مرور حسابك إطلاقاً؛ نحتاج فقط رابط الحساب أو المنشور العام (Public)."
          : "🔒 100% Safe & Private: We never ask for your password; only your public profile or post link is required.",
      ];
    }
    if (deliveryInfo.type === "link") {
      return [
        ar
          ? "هذا المنتج مخصص للتفعيل الفوري عبر رابط رسمي معتمد؛ لن تحتاج لمشاركة أي كلمات مرور حساسة."
          : "This product is activated directly via an official activation link; no sensitive passwords required.",
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
  }, [deliveryInfo.type, isSocialProduct, isFollowerProduct, isLikeProduct, ar]);

  const isNoticeHidden = useMemo(() => {
    return (
      Boolean(product.deliveryDetails && (product.deliveryDetails as any).hide_important_notes) ||
      (Array.isArray(product.importantNotes) && product.importantNotes.length === 0)
    );
  }, [product.deliveryDetails, product.importantNotes]);

  const displayNoticeList = useMemo(() => {
    if (product.importantNotes && product.importantNotes.length > 0) {
      return product.importantNotes;
    }
    return noticePoints;
  }, [product.importantNotes, noticePoints]);

  // Contextual Redeem Steps
  const redeemSteps = useMemo(() => {
    if (product.deliveryInstructionsAr) {
      try {
        const parsed = JSON.parse(product.deliveryInstructionsAr);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        const lines = product.deliveryInstructionsAr.split("\n").map((l: string) => l.trim()).filter(Boolean);
        if (lines.length > 0) return lines;
      }
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
          ? "ضع الرابط في خانة الطلب الجانبية ثم اضغط على زر 'شراء الآن' أو إضافة للسلة."
          : "Paste the link into the order box and click 'Buy now'.",
        ar
          ? "أكمل عملية الدفع الآمنة عبر وسيلة الدفع التي تناسبك."
          : "Complete your secure payment via your preferred method.",
        ar
          ? "تبدأ المعالجة مباشرة ويتم الإنجاز بالكامل خلال مدة من ساعة إلى 24 ساعة مع ضمان 30 يوماً ضد أي Drop."
          : "Processing starts immediately; completed within 1 to 24 hours with a 30-day refill guarantee.",
      ];
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
      return [
        ar
          ? "استلم كود التفعيل الرقمي فوراً في صفحة تأكيد الطلب وحسابك في الموقع."
          : "Receive the digital key instantly on the order confirmation screen.",
        ar
          ? "توجه إلى إعدادات النظام أو الموقع الرسمي وأدخل الكود في خانة التفعيل (Change product key)."
          : "Go to system settings or the official portal and enter the key.",
        ar
          ? "اضغط تفعيل (Activate) ليتم التحقق من الكود وتأكيد التفعيل الأصلي."
          : "Click Activate to verify and permanently license your software.",
      ];
    }
    if (deliveryInfo.type === "account") {
      return [
        ar
          ? "استلم بيانات الحساب (الإيميل وكلمة المرور) فور إتمام عملية الشراء."
          : "Receive account credentials (email and password) instantly.",
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
        ? "يقوم فريق العمل بتنفيذ الشحن لحسابك مباشرة خلال ثوانٍ معدودة."
        : "Our team executes the balance charge directly within moments.",
    ];
  }, [deliveryInfo.type, ar]);

  const categorySlug = useMemo<string | null>(() => {
    const c = (categoryName || "").toLowerCase();
    if (c.includes("اشتراك") || c.includes("subscrip")) return "subscriptions";
    if (c.includes("لعب") || c.includes("game")) return "games";
    if (c.includes("برامج") || c.includes("soft") || c.includes("design")) return "design";
    if (c.includes("بطاق") || c.includes("card")) return "gift-cards";
    return null;
  }, [categoryName]);

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

              <div className="driffle-var-grid gx-var-grid">
                {variants.map((v) => {
                  const isActive = v.cartId === activeVariant.cartId;
                  const vLabel = pick(v.labelAr, v.labelEn);
                  return (
                    <button
                      key={v.cartId}
                      type="button"
                      className={`driffle-var-card gx-var-card ${isActive ? "is-active" : ""}`}
                      onClick={() => setSelectedVariantId(v.cartId)}
                    >
                      <div className="driffle-var-top gx-var-top">
                        <span className="driffle-var-name gx-var-name">{vLabel}</span>
                        <div className="driffle-var-radio gx-var-radio" />
                      </div>
                      <div className="driffle-var-price gx-var-price">
                        <span>{ar ? "من" : "from"} </span>
                        <strong>{format(v.price)}</strong>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Important Notice Box (Single top box, can be hidden from admin) */}
          {!isNoticeHidden && displayNoticeList.length > 0 && (
            <section className="driffle-notice-box gx-notice-box">
              <div className="driffle-notice-icon gx-notice-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div className="driffle-notice-content gx-notice-content">
                <div className="driffle-notice-title gx-notice-title">
                  <span>{ar ? "تنبيه وتعليمات هامة" : "Important Notice"}</span>
                  <span className="driffle-notice-badge">{ar ? "معلومات هامة" : "Verified Info"}</span>
                </div>
                <div className="driffle-notice-items-grid">
                  {displayNoticeList.map((pt: string, idx: number) => (
                    <div key={idx} className="driffle-notice-item">
                      <span className="driffle-notice-bullet">✦</span>
                      <span className="driffle-notice-text">{pt}</span>
                    </div>
                  ))}
                </div>
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
                    <div className="driffle-step-body gx-step-body">{step}</div>
                  </div>
                ))}
              </div>
            </div>


          </section>
        </main>

        {/* Right Column: Sticky Purchase Sidebar */}
        <aside className="driffle-sidebar gx-sidebar">
          <div className="driffle-buy-card gx-buy-card">
            {/* Clean, Direct Price Box */}
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
              <div className="driffle-price-note gx-price-note">
                {isSocialProduct || isFollowerProduct || isLikeProduct
                  ? (ar ? "⚡ تنفيذ من ساعة إلى 24 ساعة • ضمان 30 يوماً ضد النقص ⓘ" : "⚡ 1-24h Delivery • 30-Day Drop Refill Guarantee ⓘ")
                  : (ar ? "السعر النهائي شامل الضريبة والتسليم الفوري ⓘ" : "FINAL PRICE INCLUDES TAX & INSTANT DELIVERY ⓘ")}
              </div>
            </div>

            {/* Target Link or Username Input Box */}
            {requiresCustomerInput && (
              <div className={`driffle-target-input-box ${inputError ? "has-error" : ""}`}>
                <label className="driffle-target-label" htmlFor="driffle-target-input">
                  <span className="driffle-target-label-icon">{isLikeProduct ? "❤️" : "🔗"}</span>
                  <span>{targetLabel}</span>
                </label>
                <div className="driffle-target-field-wrap">
                  <input
                    ref={inputRef}
                    id="driffle-target-input"
                    type="text"
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
                {inputError && (
                  <div className="driffle-input-error-msg">
                    <span>⚠️</span>
                    <span>
                      {isLikeProduct
                        ? (ar ? "يرجى وضع رابط المنشور أو الريلز قبل إتمام الشراء" : "Please provide the post link before purchasing")
                        : (ar ? "يرجى وضع رابط الحساب أو اسم المستخدم للمتابعة" : "Please provide the profile link or username to proceed")}
                    </span>
                  </div>
                )}
                {targetHint && !inputError && (
                  <div className="driffle-target-hint">{targetHint}</div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="driffle-cta-row gx-cta-row">
              <button
                type="button"
                className="driffle-cart-btn gx-cart-btn"
                onClick={handleAddToCart}
                title={ar ? "إضافة إلى السلة" : "Add to Cart"}
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
                    <span>{ar ? "أمان 100% بدون الحاجة لكلمة المرور" : "100% Safe — No Password Needed"}</span>
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

            {/* Only show other-offers-hint when multiple variants exist (> 1) */}
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
        </aside>
      </div>
    </div>
  );
}
