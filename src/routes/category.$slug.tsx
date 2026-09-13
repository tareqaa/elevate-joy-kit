import { useState, useMemo, useEffect, useRef } from "react";
import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { StoreShell } from "@/components/gx/StoreShell";
import {
  getCatalogCategory,
  getAllCatalogProducts,
  type CatalogCategoryChild,
  type CatalogStoreProduct,
} from "@/lib/gx/catalog.functions";
import { useLang } from "@/lib/gx/i18n";
import { useCurrency } from "@/lib/gx/currency";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { StoreProductCard } from "@/components/gx/StoreProductCard";
import { CatalogFilterBar } from "@/components/gx/CatalogFilterBar";
import { CatSortDropdown, SORT_OPTIONS } from "@/components/gx/CatSortDropdown";
import { CatPagination } from "@/components/gx/CatPagination";
import { CatDeliveryTypeDropdown, DELIVERY_TYPE_OPTIONS } from "@/components/gx/CatDeliveryTypeDropdown";
import { CatPriceFilterDropdown, PRICE_PRESETS } from "@/components/gx/CatPriceFilterDropdown";
import { CatSubtypeDropdown, type SubtypeOption } from "@/components/gx/CatSubtypeDropdown";
import { resolveStrictDeliveryType } from "@/lib/gx/delivery-types";
import { trackRecentlyViewed } from "@/lib/gx/recently-viewed";

export const SOCIAL_SUBTYPES: SubtypeOption[] = [
  {
    id: "all",
    labelAr: "كل الخدمات",
    labelEn: "All Services",
    shortLabelAr: "الكل",
    shortLabelEn: "All",
    icon: "🌟",
  },
  {
    id: "follow",
    labelAr: "متابعين",
    labelEn: "Followers",
    shortLabelAr: "متابعين",
    shortLabelEn: "Followers",
    icon: "👤",
  },
  {
    id: "likes",
    labelAr: "لايكات وتفاعل",
    labelEn: "Likes & Engagement",
    shortLabelAr: "لايكات",
    shortLabelEn: "Likes",
    icon: "❤️",
  },
];

export const GAMING_GENRES: SubtypeOption[] = [
  {
    id: "all",
    labelAr: "كل التصنيفات",
    labelEn: "All Genres",
    shortLabelAr: "كل التصنيفات",
    shortLabelEn: "All Genres",
    icon: "🌟",
  },
  {
    id: "adventure",
    labelAr: "مغامرات",
    labelEn: "Adventure",
    shortLabelAr: "مغامرات",
    shortLabelEn: "Adventure",
    icon: "🗺️",
  },
  {
    id: "fighting",
    labelAr: "ألعاب قتال",
    labelEn: "Fighting",
    shortLabelAr: "قتال",
    shortLabelEn: "Fighting",
    icon: "🥊",
  },
  {
    id: "fps",
    labelAr: "تصويب (FPS)",
    labelEn: "FPS",
    shortLabelAr: "تصويب",
    shortLabelEn: "FPS",
    icon: "🎯",
  },
  {
    id: "simulation",
    labelAr: "محاكاة",
    labelEn: "Simulation",
    shortLabelAr: "محاكاة",
    shortLabelEn: "Simulation",
    icon: "📦",
  },
  {
    id: "mmo",
    labelAr: "ألعاب جماعية (MMO)",
    labelEn: "MMO",
    shortLabelAr: "ألعاب جماعية",
    shortLabelEn: "MMO",
    icon: "👥",
  },
  {
    id: "platformer",
    labelAr: "ألعاب منصات (Platformer)",
    labelEn: "Platformer",
    shortLabelAr: "منصات",
    shortLabelEn: "Platformer",
    icon: "🎮",
  },
  {
    id: "point-and-click",
    labelAr: "ألغاز وتفاعل (Point & Click)",
    labelEn: "Point & Click",
    shortLabelAr: "تفاعل",
    shortLabelEn: "Point & Click",
    icon: "🖱️",
  },
  {
    id: "puzzle",
    labelAr: "ألغاز",
    labelEn: "Puzzle",
    shortLabelAr: "ألغاز",
    shortLabelEn: "Puzzle",
    icon: "🧩",
  },
  {
    id: "racing",
    labelAr: "سباقات",
    labelEn: "Racing",
    shortLabelAr: "سباقات",
    shortLabelEn: "Racing",
    icon: "🏎️",
  },
  {
    id: "sports",
    labelAr: "رياضة",
    labelEn: "Sports",
    shortLabelAr: "رياضة",
    shortLabelEn: "Sports",
    icon: "⚽",
  },
  {
    id: "horror",
    labelAr: "رعب وبقاء",
    labelEn: "Horror",
    shortLabelAr: "رعب",
    shortLabelEn: "Horror",
    icon: "🧟",
  },
  {
    id: "rpg",
    labelAr: "ألعاب RPG و Souls",
    labelEn: "RPG & Souls",
    shortLabelAr: "RPG",
    shortLabelEn: "RPG",
    icon: "⚔️",
  },
  {
    id: "open-world",
    labelAr: "عالم مفتوح",
    labelEn: "Open World",
    shortLabelAr: "عالم مفتوح",
    shortLabelEn: "Open World",
    icon: "🌍",
  },
];


/**
 * الكاتجوريات التي يتم تفعيل شريط الفلتر (Filter Bar) فيها.
 * بشكل افتراضي الفلتر ملغي من صفحات الكاتجوري، وفقط الكاتجوريات المضافة هنا (أو التي تحوي hasFilter) يظهر فيها الفلتر.
 */
export const FILTER_ENABLED_CATEGORIES = new Set<string>([
  // أضف slugs الكاتجوري هنا إذا رغبت بتفعيل الفلتر لها مستقبلاً، مثال: "pc-games"
]);

import {
  getCategoryTheme,
  renderCategoryVectorIcon,
  SoftwareSuiteIcon,
  GamingHeroIcon,
  SubscriptionsHeroIcon,
} from "@/lib/gx/category-themes";


/**
 * حساب عدد العروض المتاحة للقسم الفرعي
 */
function getSubcatOfferCount(slug: string, allProducts: CatalogStoreProduct[]) {
  return allProducts.filter(
    (p) => p.categorySlug === slug || p.slug === slug || (p.cartId && p.cartId.startsWith(slug))
  ).length;
}

/**
 * صياغة عدد العروض المتوفرة بدقة لغوية
 */
function formatOfferCount(count: number, lang: "ar" | "en") {
  if (count === 0) return lang === "en" ? "Coming Soon" : "قريباً";
  if (lang === "en") {
    return count === 1 ? "1 Offer" : `${count} Offers`;
  }
  if (count === 1) return "عرض واحد";
  if (count === 2) return "عرضان";
  if (count >= 3 && count <= 10) return `${count} عروض`;
  if (count > 10) return `${count} عرض`;
  return `${count}`;
}

export const Route = createFileRoute("/category/$slug")({
  loader: async ({ params }) => {
    if (params.slug === "products" || params.slug === "all") {
      throw redirect({ to: "/products" });
    }
    if (params.slug === "game-pass" || params.slug === "gamepass" || params.slug === "xbox-game-pass") {
      throw redirect({ to: "/category/$slug", params: { slug: "subscriptions" }, replace: true });
    }
    if (params.slug === "linkedin") {
      throw redirect({ to: "/category/$slug", params: { slug: "linkedin-premium" }, replace: true });
    }
    if (params.slug === "windows") {
      throw redirect({ to: "/category/$slug", params: { slug: "windows-keys" }, replace: true });
    }
    if (params.slug === "steam") {
      throw redirect({ to: "/category/$slug", params: { slug: "pc-games" }, replace: true });
    }
    const [category, allProducts] = await Promise.all([
      getCatalogCategory({ data: { slug: params.slug } }),
      getAllCatalogProducts(),
    ]);
    if (!category) throw notFound();

    const childSlugs = new Set((category.children ?? []).map((c) => c.slug));

    // جمع كافة المنتجات المتطابقة مع الكاتجوري أو أي قسم فرعي تابع له
    let categoryProducts: CatalogStoreProduct[] = [];

    if (category.slug === "subscriptions") {
      categoryProducts = allProducts.filter(
        (p) =>
          p.categorySlug === "subscriptions" ||
          p.parentCategorySlug === "subscriptions" ||
          (p.slug || "").includes("game-pass")
      );
    } else {
      const matchingAll = allProducts.filter(
        (p) =>
          p.categorySlug === category.slug ||
          p.parentCategorySlug === category.slug ||
          p.slug === category.slug ||
          (p.categorySlug && childSlugs.has(p.categorySlug))
      );

      const directProducts = (category.products ?? []).map((cp) => {
        const full = allProducts.find((ap) => ap.id === cp.id || ap.slug === cp.slug);
        return {
          ...cp,
          ...(full || {}),
          nameAr: cp.nameAr || full?.nameAr || "",
          nameEn: cp.nameEn || full?.nameEn || "",
        } as CatalogStoreProduct;
      });

      categoryProducts = matchingAll.length > 0 ? matchingAll : directProducts;
    }

    return { category, products: categoryProducts, allProducts };
  },
  head: ({ loaderData }) => {
    const c = loaderData?.category;
    const catName = c?.nameAr || c?.nameEn || "الأقسام";
    const title = c ? `${catName} | متجر GX Store` : "الأقسام | متجر GX Store";
    const desc =
      c?.taglineAr ||
      c?.taglineEn ||
      `تصفح عروض ومنتجات قسم ${catName} في متجر GX Store بأفضل الأسعار والتفعيل الفوري في الأردن والشرق الأوسط.`;
    const canonical = c ? `https://gxstore.me/category/${c.slug}` : "https://gxstore.me/products";
    const img = c?.iconImage
      ? c.iconImage.startsWith("http")
        ? c.iconImage
        : `https://gxstore.me${c.iconImage}`
      : "https://gxstore.me/app/assets/img/gx-logo-hires.jpg";

    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:site_name", content: "GX Store" },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { property: "og:url", content: canonical },
        { property: "og:image", content: img },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        { name: "twitter:image", content: img },
        {
          name: "robots",
          content: "index, follow, max-image-preview:large, max-snippet:-1",
        },
      ],
      links: [
        ...STORE_HEAD_LINKS,
        { rel: "canonical", href: canonical },
      ],
    };
  },
  errorComponent: ({ error }) => (
    <StoreShell><section className="section"><div className="wrap"><h1>{error.message}</h1></div></section></StoreShell>
  ),
  notFoundComponent: () => (
    <StoreShell><section className="section"><div className="wrap"><h1>404</h1></div></section></StoreShell>
  ),
  component: CategoryPage,
});

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="#ffffff">
      <path d="M20.3 4.4C18.8 3.7 17.2 3.2 15.5 3c-.2.4-.4.8-.6 1.2-1.7-.3-3.4-.3-5.1 0-.2-.4-.4-.8-.6-1.2-1.7.2-3.3.7-4.8 1.4-3 4.5-3.8 8.9-3.4 13.2 2 1.5 3.9 2.4 5.8 3 .5-.6.9-1.3 1.3-2-1-.4-2-.9-2.9-1.6.2-.2.5-.3.7-.5 3.8 1.8 8 1.8 11.8 0 .2.2.5.3.7.5-.9.7-1.9 1.2-2.9 1.6.4.7.8 1.4 1.3 2 1.9-.6 3.8-1.5 5.8-3 .5-5-.7-9.3-3.4-13.2zM8.5 14.5c-1.1 0-2-1-2-2.3s.9-2.3 2-2.3c1.1 0 2 1 2 2.3s-.9 2.3-2 2.3zm7 0c-1.1 0-2-1-2-2.3s.9-2.3 2-2.3c1.1 0 2 1 2 2.3s-.9 2.3-2 2.3z" />
    </svg>
  );
}

function CapCutIcon() {
  return (
    <svg viewBox="0 0 40 40" width="32" height="32" fill="none">
      <rect width="40" height="40" rx="10" fill="#000000" />
      <path d="M10 12.5L20 20L10 27.5V12.5Z" fill="#00e5ff" />
      <path d="M30 12.5L20 20L30 27.5V12.5Z" fill="#ffffff" />
      <circle cx="20" cy="20" r="2.5" fill="#00e5ff" />
    </svg>
  );
}

function SurfsharkIcon() {
  return (
    <svg viewBox="0 0 40 40" width="32" height="32" fill="none">
      <rect width="40" height="40" rx="10" fill="rgba(0, 209, 143, 0.15)" stroke="#00d18f" strokeWidth="1.5" />
      <path d="M20 9C14.5 9 10 13.5 10 18.5C10 24.5 17 25.5 17 29C17 30.5 15.5 31.5 14 31.5C12 31.5 10.5 30.5 10.5 30.5L9 34C9 34 11.5 35.5 14 35.5C19 35.5 22.5 32 22.5 27C22.5 21 15.5 20 15.5 16.5C15.5 15 17 14 19 14C21.5 14 23 15 23 15L24.5 11.5C24.5 11.5 22.5 9 20 9Z" fill="#00d18f" />
      <path d="M26 19.5L31 14.5V29.5L26 24.5V19.5Z" fill="#00d18f" />
    </svg>
  );
}

function ExpressVpnIcon() {
  return (
    <svg viewBox="0 0 40 40" width="32" height="32" fill="none">
      <rect width="40" height="40" rx="10" fill="#da3941" />
      <path d="M12 13L20 28L28 13H23L20 19L17 13H12Z" fill="#ffffff" />
    </svg>
  );
}

function SecurityShieldIcon() {
  return (
    <svg viewBox="0 0 40 40" width="32" height="32" fill="none">
      <rect width="40" height="40" rx="10" fill="rgba(255, 102, 0, 0.15)" stroke="#ff6600" strokeWidth="1.5" />
      <path d="M20 9L29 13V20C29 25.5 25 30.5 20 32C15 30.5 11 25.5 11 20V13L20 9Z" fill="#ff6600" />
      <path d="M18.5 21.5L15.5 18.5L14 20L18.5 24.5L26 17L24.5 15.5L18.5 21.5Z" fill="#ffffff" />
    </svg>
  );
}

function AllPlatformsIcon() {
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 12,
        background: "linear-gradient(135deg, rgba(0, 229, 255, 0.25), rgba(168, 85, 247, 0.25))",
        border: "1.5px solid rgba(0, 229, 255, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
      }}
    >
      🌟
    </div>
  );
}



export type CategoryPlatformItem = {
  id: string;
  nameAr: string;
  nameEn: string;
  color: string;
  glow: string;
  logoSrc?: string;
  renderLogo?: () => React.ReactNode;
  count: number;
  match: (product: CatalogStoreProduct) => boolean;
  directLink?: string;
};

function CategoryPage() {
  const { category, products, allProducts } = Route.useLoaderData();
  const { lang, t } = useLang();
  const { format } = useCurrency();
  const pick = (ar?: string | null, en?: string | null) => (lang === "en" ? en || ar : ar || en) || "";

  const catName = pick(category.nameAr, category.nameEn);
  const theme = getCategoryTheme(category.slug);
  const hasChildren = (category.children ?? []).length > 0;
  const isSoftwareCategory =
    category.slug === "design" ||
    category.slug === "apps" ||
    category.slug === "software";

  const isGamingCategory =
    category.slug === "games" ||
    category.slug === "pc-games" ||
    category.slug === "xbox-games" ||
    category.slug === "sony";

  const isSubscriptionsCategory =
    category.slug === "subscriptions";

  const isSocialCategory =
    category.slug === "social-media" ||
    category.slug === "instagram" ||
    category.slug === "facebook";

  const showcaseBrands = useMemo(() => {
    if (isSoftwareCategory) {
      return [
        { name: "Canva", logo: "/app/assets/img/canva-logo.png" },
        { name: "Adobe", logo: "/app/assets/img/adobe-cc.webp" },
        { name: "Windows", logo: "/app/assets/img/windows-logo.svg" },
        { name: "Microsoft 365", logo: "/app/assets/img/microsoft365-logo.svg" },
      ];
    }
    if (isGamingCategory) {
      return [
        { name: "Steam", logo: "/app/assets/img/steam-logo.svg" },
        { name: "Xbox", logo: "/app/assets/img/xbox-logo.svg" },
        { name: "PlayStation", logo: "/app/assets/img/playstation-logo.svg" },
        { name: "Fortnite", logo: "/app/assets/img/fortnite-f-icon.jpg" },
      ];
    }
    if (isSubscriptionsCategory) {
      return [
        { name: "Xbox Game Pass", logo: "/app/assets/img/xbox-logo.svg" },
      ];
    }
    return [];
  }, [isSoftwareCategory, isGamingCategory, isSubscriptionsCategory]);

  // State for active platform selection, search, sort, and modal
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [selectedSubtype, setSelectedSubtype] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("popular");
  const [selectedDeliveryType, setSelectedDeliveryType] = useState<string>("all");
  const [selectedPricePreset, setSelectedPricePreset] = useState<string>("all");
  const [customMinPrice, setCustomMinPrice] = useState<string>("");
  const [customMaxPrice, setCustomMaxPrice] = useState<string>("");
  const [isAllPlatformsModalOpen, setIsAllPlatformsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    let initialPlatform = "all";
    let initialSubtype = "all";
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const g = sp.get("genre") || sp.get("subtype");
      if (g) initialSubtype = g;
      const p = sp.get("platform");
      if (p) initialPlatform = p;
    }
    setSelectedPlatform(initialPlatform);
    setSelectedSubtype(initialSubtype);
  }, [category.slug]);


  // Gift Cards category state
  const isGiftCardCategory = category.slug === "gift-cards" || category.slug.startsWith("gc-");

  useEffect(() => {
    if (!isAllPlatformsModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsAllPlatformsModalOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAllPlatformsModalOpen]);

  // Track gift card categories in Recently Viewed with lowest variant price
  useEffect(() => {
    const GIFT_CARD_MAP: Record<string, { slug: string; nameAr: string; nameEn: string; price: number; iconImage: string }> = {
      "gc-playstation": { slug: "playstation", nameAr: "بطاقات بلايستيشن", nameEn: "PlayStation Cards", price: 7.0, iconImage: "/app/assets/img/playstation-logo.svg" },
      "playstation": { slug: "playstation", nameAr: "بطاقات بلايستيشن", nameEn: "PlayStation Cards", price: 7.0, iconImage: "/app/assets/img/playstation-logo.svg" },
      "gc-xbox": { slug: "xbox", nameAr: "بطاقات إكسبوكس", nameEn: "Xbox Cards", price: 1.15, iconImage: "/app/assets/img/xbox-logo.svg" },
      "xbox": { slug: "xbox", nameAr: "بطاقات إكسبوكس", nameEn: "Xbox Cards", price: 1.15, iconImage: "/app/assets/img/xbox-logo.svg" },
      "gc-itunes": { slug: "itunes", nameAr: "بطاقات آبل وآيتونز", nameEn: "iTunes Cards", price: 2.22, iconImage: "/app/assets/img/itunes-logo.svg" },
      "itunes": { slug: "itunes", nameAr: "بطاقات آبل وآيتونز", nameEn: "iTunes Cards", price: 2.22, iconImage: "/app/assets/img/itunes-logo.svg" },
      "gc-google-play": { slug: "google-play", nameAr: "بطاقات جوجل بلاي", nameEn: "Google Play Cards", price: 4.5, iconImage: "/app/assets/img/googleplay-logo.png" },
      "google-play": { slug: "google-play", nameAr: "بطاقات جوجل بلاي", nameEn: "Google Play Cards", price: 4.5, iconImage: "/app/assets/img/googleplay-logo.png" },
    };

    const matchedGc = GIFT_CARD_MAP[category.slug];
    if (matchedGc) {
      trackRecentlyViewed({
        slug: matchedGc.slug,
        nameAr: matchedGc.nameAr,
        nameEn: matchedGc.nameEn,
        price: matchedGc.price,
        imageUrl: matchedGc.iconImage,
        categorySlug: "gift-cards",
      });
    }
  }, [category.slug]);

  // Platforms for software/design category
  const softwarePlatforms: CategoryPlatformItem[] = useMemo(() => {
    const defs = [
      {
        id: "all",
        nameAr: "كل المنصات",
        nameEn: "All Platforms",
        color: "#00e5ff",
        glow: "rgba(0, 229, 255, 0.45)",
        renderLogo: () => <AllPlatformsIcon />,
        match: () => true,
      },
      {
        id: "canva",
        nameAr: "Canva",
        nameEn: "Canva",
        color: "#00c4cc",
        glow: "rgba(0, 196, 204, 0.45)",
        logoSrc: "/app/assets/img/canva-logo.png",
        match: (p: CatalogStoreProduct) =>
          (p.slug || "").includes("canva") || (p.categorySlug || "") === "canva",
      },
      {
        id: "adobe",
        nameAr: "Adobe",
        nameEn: "Adobe",
        color: "#eb1000",
        glow: "rgba(235, 16, 0, 0.45)",
        logoSrc: "/app/assets/img/adobe-cc.webp",
        match: (p: CatalogStoreProduct) =>
          (p.slug || "").includes("adobe") || (p.categorySlug || "") === "adobe",
      },
      {
        id: "windows",
        nameAr: "Windows",
        nameEn: "Windows",
        color: "#0078d4",
        glow: "rgba(0, 120, 212, 0.45)",
        logoSrc: "/app/assets/img/windows-logo.svg",
        match: (p: CatalogStoreProduct) =>
          (p.slug || "").includes("windows") || (p.categorySlug || "") === "windows-keys",
      },
      {
        id: "microsoft",
        nameAr: "Microsoft 365",
        nameEn: "Microsoft 365",
        color: "#f25022",
        glow: "rgba(242, 80, 34, 0.45)",
        logoSrc: "/app/assets/img/microsoft365-logo.svg",
        match: (p: CatalogStoreProduct) =>
          (p.slug || "").includes("microsoft") ||
          (p.slug || "").includes("office") ||
          (p.slug || "").includes("365") ||
          (p.categorySlug || "") === "microsoft365",
      },
      {
        id: "discord",
        nameAr: "Discord",
        nameEn: "Discord",
        color: "#5865F2",
        glow: "rgba(88, 101, 242, 0.45)",
        renderLogo: () => (
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "#5865F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <DiscordIcon />
          </div>
        ),
        match: (p: CatalogStoreProduct) =>
          (p.slug || "").includes("discord") ||
          (p.nameAr || "").toLowerCase().includes("discord") ||
          (p.nameAr || "").includes("ديسكورد"),
      },
      {
        id: "capcut",
        nameAr: "CapCut",
        nameEn: "CapCut",
        color: "#00e5ff",
        glow: "rgba(0, 229, 255, 0.45)",
        renderLogo: () => <CapCutIcon />,
        match: (p: CatalogStoreProduct) => (p.slug || "").includes("capcut"),
      },
      {
        id: "autodesk",
        nameAr: "Autodesk",
        nameEn: "Autodesk",
        color: "#0696d7",
        glow: "rgba(6, 150, 215, 0.45)",
        logoSrc: "/app/assets/img/autodesk-logo.svg",
        match: (p: CatalogStoreProduct) =>
          (p.slug || "").includes("autodesk") || (p.categorySlug || "") === "autodesk",
      },
      {
        id: "surfshark",
        nameAr: "Surfshark",
        nameEn: "Surfshark",
        color: "#00d18f",
        glow: "rgba(0, 209, 143, 0.45)",
        renderLogo: () => <SurfsharkIcon />,
        match: (p: CatalogStoreProduct) => (p.slug || "").includes("surfshark"),
      },
      {
        id: "expressvpn",
        nameAr: "ExpressVPN",
        nameEn: "ExpressVPN",
        color: "#da3941",
        glow: "rgba(218, 57, 65, 0.45)",
        renderLogo: () => <ExpressVpnIcon />,
        match: (p: CatalogStoreProduct) => (p.slug || "").includes("expressvpn"),
      },
      {
        id: "linkedin",
        nameAr: "LinkedIn",
        nameEn: "LinkedIn",
        color: "#0a66c2",
        glow: "rgba(10, 102, 194, 0.45)",
        logoSrc: "/app/assets/img/linkedin-logo.svg",
        match: (p: CatalogStoreProduct) =>
          (p.slug || "").includes("linkedin") || (p.categorySlug || "") === "linkedin-premium",
      },
      {
        id: "security",
        nameAr: "Avast & AVG",
        nameEn: "Avast & AVG",
        color: "#ff6600",
        glow: "rgba(255, 102, 0, 0.45)",
        renderLogo: () => <SecurityShieldIcon />,
        match: (p: CatalogStoreProduct) =>
          (p.slug || "").includes("avast") || (p.slug || "").includes("avg"),
      },
    ];

    return defs
      .map((d) => ({
        ...d,
        count: d.id === "all" ? products.length : products.filter(d.match).length,
      }))
      .filter((d) => d.id === "all" || d.count > 0);
  }, [products]);

  // Social Media Platforms (/category/social-media, /category/instagram, /category/facebook)
  // Platforms are strictly real platforms: Instagram and Facebook (no subcategories/types)
  const socialMediaPlatforms: CategoryPlatformItem[] = useMemo(() => {
    const defs = [
      {
        id: "all",
        nameAr: "كل المنصات",
        nameEn: "All Platforms",
        color: "#00e5ff",
        glow: "rgba(0, 229, 255, 0.45)",
        renderLogo: () => <AllPlatformsIcon />,
        match: () => true,
      },
      {
        id: "instagram",
        nameAr: "إنستقرام",
        nameEn: "Instagram",
        color: "#e1306c",
        glow: "rgba(225, 48, 108, 0.45)",
        logoSrc: "/app/assets/img/instagram-logo.svg",
        match: (p: CatalogStoreProduct) =>
          (p.slug || "").includes("instagram") || (p.categorySlug || "") === "instagram",
      },
      {
        id: "facebook",
        nameAr: "فيسبوك",
        nameEn: "Facebook",
        color: "#1877f2",
        glow: "rgba(24, 119, 242, 0.45)",
        logoSrc: "/app/assets/img/facebook-logo.svg",
        match: (p: CatalogStoreProduct) =>
          (p.slug || "").includes("facebook") || (p.categorySlug || "") === "facebook",
      },
    ];

    return defs
      .map((d) => ({
        ...d,
        count: d.id === "all" ? products.length : products.filter(d.match).length,
      }))
      .filter((d) => d.id === "all" || d.count > 0);
  }, [products]);

  // Platforms for main gaming category (/category/games)
  // Platforms are strictly real platforms: PC, Xbox, PlayStation, Fortnite (no genres here)
  const gamingPlatforms: CategoryPlatformItem[] = useMemo(() => {
    const defs = [
      {
        id: "all",
        nameAr: "كل الألعاب",
        nameEn: "All Games",
        color: "#00e5ff",
        glow: "rgba(0, 229, 255, 0.45)",
        renderLogo: () => <AllPlatformsIcon />,
        match: () => true,
      },
      {
        id: "pc-games",
        nameAr: "العاب PC",
        nameEn: "PC Games",
        color: "#00e5ff",
        glow: "rgba(0, 229, 255, 0.45)",
        logoSrc: "/app/assets/img/steam-logo.svg",
        match: (p: CatalogStoreProduct) =>
          p.categorySlug === "pc-games" ||
          p.parentCategorySlug === "pc-games" ||
          (p.slug || "").endsWith("-pc") ||
          (p.nameAr || "").toLowerCase().includes("(pc)") ||
          p.platform === "PC" ||
          p.platform === "Steam",
      },
      {
        id: "xbox-games",
        nameAr: "ألعاب Xbox",
        nameEn: "Xbox Games",
        color: "#107c41",
        glow: "rgba(16, 124, 65, 0.45)",
        logoSrc: "/app/assets/img/xbox-logo.svg",
        match: (p: CatalogStoreProduct) =>
          p.categorySlug === "xbox-games" ||
          (p.slug || "").includes("xbox") ||
          (p.nameAr || "").toLowerCase().includes("xbox") ||
          p.platform === "Xbox",
      },
      {
        id: "sony",
        nameAr: "ألعاب PlayStation (PSN)",
        nameEn: "PlayStation (PSN)",
        color: "#0070d1",
        glow: "rgba(0, 112, 209, 0.45)",
        logoSrc: "/app/assets/img/playstation-logo.svg",
        match: (p: CatalogStoreProduct) =>
          p.categorySlug === "sony" ||
          p.categorySlug === "gc-playstation" ||
          (p.slug || "").includes("playstation") ||
          (p.slug || "").includes("sony") ||
          (p.nameAr || "").includes("بلايستيشن") ||
          p.platform === "PlayStation",
      },
      {
        id: "fortnite",
        nameAr: "فورت نايت",
        nameEn: "Fortnite",
        color: "#a855f7",
        glow: "rgba(168, 85, 247, 0.45)",
        logoSrc: "/app/assets/img/fortnite-f-icon.jpg",
        directLink: "/product/fortnite",
        match: (p: CatalogStoreProduct) =>
          p.categorySlug === "fortnite" ||
          (p.slug || "").includes("fortnite") ||
          (p.nameAr || "").includes("فورت نايت"),
      },
    ];

    return defs
      .map((d) => ({
        ...d,
        count: d.id === "all" ? products.length : products.filter(d.match).length,
      }))
      .filter((d) => d.id === "all" || d.id === "sony" || d.count > 0);
  }, [products]);

  // Launchers for PC Games subcategory (/category/pc-games)
  // Strictly real launchers: Steam, Rockstar, EA, Minecraft (no genres here)
  const pcGamesLaunchers: CategoryPlatformItem[] = useMemo(() => {
    const defs = [
      {
        id: "all",
        nameAr: "كل ألعاب PC",
        nameEn: "All PC Games",
        color: "#00e5ff",
        glow: "rgba(0, 229, 255, 0.45)",
        renderLogo: () => <AllPlatformsIcon />,
        match: () => true,
      },
      {
        id: "steam",
        nameAr: "Steam",
        nameEn: "Steam",
        color: "#66c0f4",
        glow: "rgba(102, 192, 244, 0.45)",
        logoSrc: "/app/assets/img/steam-logo.svg",
        match: (p: CatalogStoreProduct) =>
          (p.nameAr || "").includes("ستيم") ||
          (p.slug || "").includes("steam") ||
          (!p.slug.includes("gta") && !p.slug.includes("red-dead") && !p.slug.includes("minecraft")),
      },
      {
        id: "rockstar",
        nameAr: "Rockstar Launcher",
        nameEn: "Rockstar Launcher",
        color: "#fcaf17",
        glow: "rgba(252, 175, 23, 0.45)",
        logoSrc: "/app/assets/img/gx-logo.png",
        match: (p: CatalogStoreProduct) =>
          (p.slug || "").includes("gta") ||
          (p.slug || "").includes("red-dead") ||
          (p.nameAr || "").toLowerCase().includes("rockstar") ||
          (p.nameAr || "").includes("روكستار"),
      },
      {
        id: "ea",
        nameAr: "EA Sports (FC)",
        nameEn: "EA Sports (FC)",
        color: "#00e5ff",
        glow: "rgba(0, 229, 255, 0.45)",
        logoSrc: "/app/assets/img/steam-logo.svg",
        match: (p: CatalogStoreProduct) =>
          (p.slug || "").includes("fc-") ||
          (p.nameAr || "").toLowerCase().includes("ea sports") ||
          (p.nameAr || "").includes("fc 2"),
      },
      {
        id: "minecraft",
        nameAr: "Minecraft Launcher",
        nameEn: "Minecraft",
        color: "#107c41",
        glow: "rgba(16, 124, 65, 0.45)",
        logoSrc: "/app/assets/img/xbox-logo.svg",
        match: (p: CatalogStoreProduct) =>
          (p.slug || "").includes("minecraft") ||
          (p.nameAr || "").includes("ماينكرافت"),
      },
    ];

    return defs
      .map((d) => ({
        ...d,
        count: d.id === "all" ? products.length : products.filter(d.match).length,
      }))
      .filter((d) => d.id === "all" || d.count > 0);
  }, [products]);

  // Platforms for subscriptions category (/category/subscriptions)
  const subscriptionPlatforms: CategoryPlatformItem[] = useMemo(() => {
    const defs = [
      {
        id: "all",
        nameAr: "كل الاشتراكات",
        nameEn: "All Subscriptions",
        color: "#f59e0b",
        glow: "rgba(245, 158, 11, 0.45)",
        renderLogo: () => <AllPlatformsIcon />,
        match: () => true,
      },
      {
        id: "gamepass",
        nameAr: "Xbox Game Pass",
        nameEn: "Xbox Game Pass",
        color: "#107c41",
        glow: "rgba(16, 124, 65, 0.45)",
        logoSrc: "/app/assets/img/xbox-logo.svg",
        match: (p: CatalogStoreProduct) =>
          (p.slug || "").includes("game-pass") ||
          (p.nameAr || "").toLowerCase().includes("game pass") ||
          (p.nameAr || "").includes("جيم باس"),
      },
      {
        id: "entertainment",
        nameAr: "اشتراكات ترفيه ومشاهدة",
        nameEn: "Entertainment",
        color: "#e50914",
        glow: "rgba(229, 9, 20, 0.45)",
        renderLogo: () => <span style={{ fontSize: 24 }}>🎬</span>,
        match: (p: CatalogStoreProduct) =>
          ["netflix", "shahid", "youtube", "spotify", "iptv", "disney", "osn", "watch"].some((k) =>
            (p.slug || "").includes(k) || (p.nameAr || "").toLowerCase().includes(k)
          ),
      },
    ];

    return defs
      .map((d) => ({
        ...d,
        count: d.id === "all" ? products.length : products.filter(d.match).length,
      }))
      .filter((d) => d.id === "all" || d.count > 0);
  }, [products]);

  // Platforms for gift cards category
  const giftCardPlatforms: CategoryPlatformItem[] = useMemo(() => {
    return [
      {
        id: "all",
        nameAr: "كل البطاقات",
        nameEn: "All Gift Cards",
        color: "#ff2d78",
        glow: "rgba(255, 45, 120, 0.45)",
        renderLogo: () => <AllPlatformsIcon />,
        count: 35,
        match: () => true,
      },
      {
        id: "playstation",
        nameAr: "PlayStation",
        nameEn: "PlayStation",
        color: "#0070d1",
        glow: "rgba(0, 112, 209, 0.45)",
        logoSrc: "/app/assets/img/playstation-logo.svg",
        directLink: "/product/playstation",
        count: 16,
        match: (p: CatalogStoreProduct) =>
          (p.slug || "").includes("playstation") || (p.categorySlug || "") === "gc-playstation",
      },
      {
        id: "xbox",
        nameAr: "Xbox",
        nameEn: "Xbox",
        color: "#107c41",
        glow: "rgba(16, 124, 65, 0.45)",
        logoSrc: "/app/assets/img/xbox-logo.svg",
        directLink: "/product/xbox",
        count: 9,
        match: (p: CatalogStoreProduct) =>
          (p.slug || "").includes("xbox") || (p.categorySlug || "") === "gc-xbox",
      },
      {
        id: "googleplay",
        nameAr: "Google Play",
        nameEn: "Google Play",
        color: "#00e5ff",
        glow: "rgba(0, 229, 255, 0.45)",
        logoSrc: "/app/assets/img/googleplay-logo.png",
        directLink: "/product/google-play",
        count: 5,
        match: (p: CatalogStoreProduct) =>
          (p.slug || "").includes("google") || (p.categorySlug || "") === "gc-google-play",
      },
      {
        id: "itunes",
        nameAr: "iTunes & Apple",
        nameEn: "iTunes",
        color: "#ffffff",
        glow: "rgba(255, 255, 255, 0.4)",
        logoSrc: "/app/assets/img/itunes-logo.svg",
        directLink: "/product/itunes",
        count: 5,
        match: (p: CatalogStoreProduct) =>
          (p.slug || "").includes("itunes") ||
          (p.slug || "").includes("apple") ||
          (p.categorySlug || "") === "gc-itunes",
      },
    ];
  }, []);

  // Generic platforms for other categories with children
  const genericPlatforms: CategoryPlatformItem[] = useMemo(() => {
    if (!hasChildren) return [];
    const list: CategoryPlatformItem[] = [
      {
        id: "all",
        nameAr: lang === "en" ? "All Sections" : "كل الأقسام",
        nameEn: "All Sections",
        color: "#00e5ff",
        glow: "rgba(0, 229, 255, 0.45)",
        renderLogo: () => <AllPlatformsIcon />,
        count: products.length,
        match: () => true,
      },
    ];
    for (const ch of category.children) {
      const matchFn = (p: CatalogStoreProduct) =>
        p.categorySlug === ch.slug || p.slug === ch.slug;
      const count = products.filter(matchFn).length;
      if (count > 0) {
        list.push({
          id: ch.slug,
          nameAr: pick(ch.nameAr, ch.nameEn),
          nameEn: pick(ch.nameEn, ch.nameAr),
          color: "#00e5ff",
          glow: "rgba(0, 229, 255, 0.35)",
          logoSrc: ch.iconImage || undefined,
          renderLogo: ch.icon ? () => <span style={{ fontSize: 24 }}>{ch.icon}</span> : undefined,
          count,
          match: matchFn,
        });
      }
    }
    return list;
  }, [hasChildren, category.children, products, lang]);

  const platformsList = useMemo(() => {
    if (isSocialCategory) return socialMediaPlatforms;
    if (category.slug === "subscriptions") return subscriptionPlatforms;
    if (isSoftwareCategory) return softwarePlatforms;
    if (category.slug === "gift-cards" || category.slug.startsWith("gc-")) return giftCardPlatforms;
    if (category.slug === "pc-games") return pcGamesLaunchers;
    if (category.slug === "games") return gamingPlatforms;
    return genericPlatforms;
  }, [
    isSocialCategory,
    category.slug,
    isSoftwareCategory,
    socialMediaPlatforms,
    subscriptionPlatforms,
    softwarePlatforms,
    giftCardPlatforms,
    pcGamesLaunchers,
    gamingPlatforms,
    genericPlatforms,
  ]);

  // Infinite Marquee Items (duplicated array for seamless continuous looping)
  const marqueeItems = useMemo(() => {
    if (platformsList.length <= 1) return platformsList;
    return [...platformsList, ...platformsList];
  }, [platformsList]);

  // Active platform object
  const activePlatformObj = useMemo(() => {
    return platformsList.find((p) => p.id === selectedPlatform) || null;
  }, [platformsList, selectedPlatform]);

  const handleSelectPlatform = (platId: string) => {
    if (selectedPlatform === platId && platId !== "all") {
      setSelectedPlatform("all");
    } else {
      setSelectedPlatform(platId);
    }
  };

  // Filter and sort products
  const displayedProducts = useMemo(() => {
    let list = [...products];

    // 0. Subtype / Service / Genre filter (Social Media: follow vs likes | Gaming: RPG, Action, etc.)
    if (selectedSubtype !== "all") {
      if (isSocialCategory) {
        if (selectedSubtype === "follow") {
          list = list.filter(
            (p) =>
              (p.slug || "").includes("follow") ||
              (p.nameAr || "").includes("متابعين") ||
              (p.nameEn || "").toLowerCase().includes("follower")
          );
        } else if (selectedSubtype === "likes") {
          list = list.filter(
            (p) =>
              (p.slug || "").includes("like") ||
              (p.nameAr || "").includes("لايكات") ||
              (p.nameEn || "").toLowerCase().includes("like")
          );
        }
      } else if (isGamingCategory) {
        list = list.filter((p) => {
          const s = `${p.slug} ${p.nameAr} ${p.nameEn} ${p.taglineAr || ""} ${p.taglineEn || ""}`.toLowerCase();
          if (selectedSubtype === "adventure") {
            return (
              s.includes("batman") ||
              s.includes("assassin") ||
              s.includes("uncharted") ||
              s.includes("tomb") ||
              s.includes("control") ||
              s.includes("spider") ||
              s.includes("horizon") ||
              s.includes("ratchet") ||
              s.includes("adventure") ||
              s.includes("مغامر")
            );
          }
          if (selectedSubtype === "fighting") {
            return (
              s.includes("mortal") ||
              s.includes("kombat") ||
              s.includes("tekken") ||
              s.includes("fighter") ||
              s.includes("street") ||
              s.includes("قتال")
            );
          }
          if (selectedSubtype === "fps") {
            return (
              s.includes("helldivers") ||
              s.includes("cod") ||
              s.includes("duty") ||
              s.includes("battlefield") ||
              s.includes("doom") ||
              s.includes("wolfenstein") ||
              s.includes("far-cry") ||
              s.includes("shooter") ||
              s.includes("fps") ||
              s.includes("تصويب")
            );
          }
          if (selectedSubtype === "simulation") {
            return (
              s.includes("minecraft") ||
              s.includes("simulat") ||
              s.includes("truck") ||
              s.includes("farm") ||
              s.includes("flight") ||
              s.includes("city") ||
              s.includes("محاك")
            );
          }
          if (selectedSubtype === "mmo") {
            return (
              s.includes("raiders") ||
              s.includes("arc-raiders") ||
              s.includes("destiny") ||
              s.includes("mmo") ||
              s.includes("fortnite") ||
              s.includes("جماع")
            );
          }
          if (selectedSubtype === "platformer") {
            return (
              s.includes("hollow") ||
              s.includes("silksong") ||
              s.includes("ori") ||
              s.includes("crash") ||
              s.includes("spyro") ||
              s.includes("cuphead") ||
              s.includes("platform") ||
              s.includes("منصات")
            );
          }
          if (selectedSubtype === "point-and-click") {
            return (
              s.includes("human") ||
              s.includes("click") ||
              s.includes("detroit") ||
              s.includes("تفاعل")
            );
          }
          if (selectedSubtype === "puzzle") {
            return (
              s.includes("puzzle") ||
              s.includes("human") ||
              s.includes("portal") ||
              s.includes("talos") ||
              s.includes("limbo") ||
              s.includes("inside") ||
              s.includes("ألغاز")
            );
          }
          if (selectedSubtype === "racing") {
            return (
              s.includes("forza") ||
              s.includes("nfs") ||
              s.includes("speed") ||
              s.includes("f1") ||
              s.includes("grid") ||
              s.includes("crew") ||
              s.includes("rally") ||
              s.includes("سباق")
            );
          }
          if (selectedSubtype === "sports") {
            return (
              s.includes("fc-") ||
              s.includes("fc 2") ||
              s.includes("fifa") ||
              s.includes("nba") ||
              s.includes("wwe") ||
              s.includes("رياض")
            );
          }
          if (selectedSubtype === "horror") {
            return (
              s.includes("resident") ||
              s.includes("bioshock") ||
              s.includes("silent") ||
              s.includes("outlast") ||
              s.includes("dead-space") ||
              s.includes("amnesia") ||
              s.includes("evil") ||
              s.includes("alan-wake") ||
              s.includes("رعب")
            );
          }
          if (selectedSubtype === "rpg") {
            return (
              s.includes("souls") ||
              s.includes("elden") ||
              s.includes("rpg") ||
              s.includes("witcher") ||
              s.includes("mordor") ||
              s.includes("war") ||
              s.includes("mount") ||
              s.includes("blade") ||
              s.includes("skyrim") ||
              s.includes("cyberpunk") ||
              s.includes("تعاقب")
            );
          }
          if (selectedSubtype === "open-world") {
            return (
              s.includes("gta") ||
              s.includes("red-dead") ||
              s.includes("rdr") ||
              s.includes("witcher") ||
              s.includes("cyberpunk") ||
              s.includes("mafia") ||
              s.includes("horizon") ||
              s.includes("forza-horizon") ||
              s.includes("عالم مفتوح")
            );
          }
          return true;
        });
      }
    }

    // 1. Platform filter
    if (selectedPlatform !== "all") {
      const plat = platformsList.find((p) => p.id === selectedPlatform);
      if (plat) {
        list = list.filter(plat.match);
      }
    }

    // 2. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => {
        const arName = (p.nameAr || "").toLowerCase();
        const enName = (p.nameEn || "").toLowerCase();
        const arTag = (p.taglineAr || "").toLowerCase();
        const enTag = (p.taglineEn || "").toLowerCase();
        return arName.includes(q) || enName.includes(q) || arTag.includes(q) || enTag.includes(q);
      });
    }

    // 3. Delivery Type filter (Key, Account, Activation Link, Top Up)
    if (selectedDeliveryType !== "all") {
      list = list.filter((p) => {
        const itemType = resolveStrictDeliveryType(p);
        return itemType === selectedDeliveryType;
      });
    }

    // 4. Price range filter
    if (customMinPrice !== "") {
      const minVal = parseFloat(customMinPrice);
      if (!isNaN(minVal)) list = list.filter((p) => (p.basePriceJod || 0) >= minVal);
    } else if (selectedPricePreset !== "all") {
      const preset = PRICE_PRESETS.find((pr) => pr.id === selectedPricePreset);
      if (preset?.min !== undefined) {
        list = list.filter((p) => (p.basePriceJod || 0) >= preset.min!);
      }
    }

    if (customMaxPrice !== "") {
      const maxVal = parseFloat(customMaxPrice);
      if (!isNaN(maxVal)) list = list.filter((p) => (p.basePriceJod || 0) <= maxVal);
    } else if (selectedPricePreset !== "all") {
      const preset = PRICE_PRESETS.find((pr) => pr.id === selectedPricePreset);
      if (preset?.max !== undefined) {
        list = list.filter((p) => (p.basePriceJod || 0) <= preset.max!);
      }
    }

    // 5. Sorting (Matches Image 3 options)
    list.sort((a, b) => {
      const priceA = typeof a.basePriceJod === "number" ? a.basePriceJod : 0;
      const priceB = typeof b.basePriceJod === "number" ? b.basePriceJod : 0;
      const nameA = (a.nameAr || a.nameEn || "").trim();
      const nameB = (b.nameAr || b.nameEn || "").trim();
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;

      if (sortBy === "price_asc") return priceA - priceB;
      if (sortBy === "price_desc") return priceB - priceA;
      if (sortBy === "date_desc") return dateB - dateA;
      if (sortBy === "date_asc") return dateA - dateB;
      if (sortBy === "alpha_asc") return nameA.localeCompare(nameB, "ar");
      if (sortBy === "alpha_desc") return nameB.localeCompare(nameA, "ar");
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });

    return list;
  }, [
    products,
    selectedSubtype,
    selectedPlatform,
    platformsList,
    searchQuery,
    selectedDeliveryType,
    selectedPricePreset,
    customMinPrice,
    customMaxPrice,
    sortBy,
  ]);

  // 5x5 Pagination (25 items per page for lightning fast page loading)
  const ITEMS_PER_PAGE = 25;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset pagination to page 1 whenever any filter, search, or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [
    category.slug,
    selectedPlatform,
    selectedSubtype,
    searchQuery,
    selectedDeliveryType,
    selectedPricePreset,
    customMinPrice,
    customMaxPrice,
    sortBy,
  ]);

  const totalPages = Math.max(1, Math.ceil(displayedProducts.length / ITEMS_PER_PAGE));

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return displayedProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [displayedProducts, currentPage]);

  // Platform card rendering helper (renders a Link for directLink items like Fortnite, or a button for filtering)
  const isStaticPlatforms = platformsList.length <= 6;

  const renderPlatformCard = (plat: CategoryPlatformItem, key: string, inModal = false) => {
    const isActive = selectedPlatform === plat.id;
    const cardContent = (
      <>
        <div className="platform-square-logo">
          {plat.logoSrc ? (
            <img src={plat.logoSrc} alt={pick(plat.nameAr, plat.nameEn)} loading="lazy" />
          ) : plat.renderLogo ? (
            plat.renderLogo()
          ) : (
            <span style={{ fontSize: 24 }}>📁</span>
          )}
        </div>
        <div className="platform-square-name">
          {pick(plat.nameAr, plat.nameEn)}
        </div>
        <div className="platform-square-badge">
          {plat.id === "all"
            ? (lang === "en" ? "All" : "الكل")
            : formatOfferCount(plat.count, lang)}
        </div>
      </>
    );

    const styleObj = {
      ['--plat-color' as any]: plat.color,
      ['--plat-glow' as any]: plat.glow,
    };

    if (plat.directLink) {
      return (
        <Link
          key={key}
          to={plat.directLink as any}
          className={`platform-square-card ${inModal ? "in-modal" : ""}`}
          style={styleObj}
          onClick={() => {
            if (inModal) setIsAllPlatformsModalOpen(false);
          }}
          title={pick(plat.nameAr, plat.nameEn)}
        >
          {cardContent}
        </Link>
      );
    }

    return (
      <button
        key={key}
        type="button"
        className={`platform-square-card ${inModal ? "in-modal" : ""} ${isActive ? "is-active" : ""}`}
        style={styleObj}
        onClick={() => {
          handleSelectPlatform(plat.id);
          if (inModal) setIsAllPlatformsModalOpen(false);
        }}
        title={pick(plat.nameAr, plat.nameEn)}
      >
        {cardContent}
      </button>
    );
  };

  // Sibling switcher pills (when on subcategory like Canva or Windows)
  const navPills: Array<{
    slug: string;
    name: string;
    icon: React.ReactNode;
    to: string;
    params: { slug: string };
    active: boolean;
  }> = [];

  if (category.parent && (category.siblings || []).length > 0) {
    navPills.push({
      slug: category.parent.slug,
      name: pick(category.parent.nameAr, category.parent.nameEn),
      icon: <span className="pill-icon">🧩</span>,
      to: "/category/$slug",
      params: { slug: category.parent.slug },
      active: false,
    });
    (category.siblings || []).forEach((sib) => {
      navPills.push({
        slug: sib.slug,
        name: pick(sib.nameAr, sib.nameEn),
        icon: sib.iconImage ? (
          <img src={sib.iconImage} alt="" style={{ width: 18, height: 18, objectFit: "contain" }} />
        ) : (
          <span className="pill-icon">{sib.icon || "📂"}</span>
        ),
        to: "/category/$slug",
        params: { slug: sib.slug },
        active: sib.slug === category.slug,
      });
    });
  }

  // Render product card helper
  const renderProductCard = (p: CatalogStoreProduct) => {
    if (p.isGiftCardMaster || isGiftCardCategory) {
      const ar = lang === "ar";
      const name = ar ? p.nameAr : (p.nameEn || p.nameAr);
      const desc = ar ? p.taglineAr : (p.taglineEn || p.taglineAr);
      const link = p.viewOfferLink || `/product/${p.slug}`;
      const price = p.basePriceJod || 0;

      return (
        <Link
          key={p.cartId ? `${p.id}-${p.cartId}` : p.id}
          to={link as never}
          className="gx-gamepoint-card"
          style={{
            background: p.thumbBg || "linear-gradient(135deg, rgba(0, 112, 209, 0.22), rgba(0, 60, 150, 0.12))",
            textDecoration: "none",
          }}
          onClick={() => {
            trackRecentlyViewed({
              slug: p.slug,
              nameAr: p.nameAr,
              nameEn: p.nameEn,
              taglineAr: p.taglineAr || undefined,
              taglineEn: p.taglineEn || undefined,
              price,
              imageUrl: p.imageUrl || undefined,
              icon: p.icon || undefined,
              categorySlug: "gift-cards",
            });
          }}
        >
          <div className="gx-gamepoint-card-top">
            <div className="gx-gamepoint-icon-box">
              <img
                src={p.iconImage || p.imageUrl || "/app/assets/img/playstation-logo.svg"}
                alt={name}
                className="gx-gamepoint-icon-img"
                loading="lazy"
                decoding="async"
              />
            </div>
            <span className="gx-gamepoint-badge">
              {ar ? (p.badge || "كود تفعيل") : (p.badge === "كود تفعيل" || !p.badge ? "Digital Code" : p.badge)}
            </span>
          </div>

          <div className="gx-gamepoint-card-body">
            <h3 className="gx-gamepoint-title">{name}</h3>
            <p className="gx-gamepoint-desc">{desc}</p>
          </div>

          <div className="gx-gamepoint-card-footer">
            <div className="gx-gamepoint-price-box">
              <span className="gx-gamepoint-price-label">
                {ar ? "يبدأ من" : "Starts at"}
              </span>
              <span className="gx-gamepoint-price-val">
                {format(price)}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--cyan, #00e5ff)" }}>
                {ar ? "عرض العروض" : "View Offers"}
              </span>
              <div className="gx-gamepoint-arrow-btn">
                {ar ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
              </div>
            </div>
          </div>
        </Link>
      );
    }

    const name = pick(p.nameAr, p.nameEn);
    const tagline = pick(p.taglineAr, p.taglineEn);
    const defaultLink = p.slug
      ? (p.slug.startsWith("/")
          ? p.slug
          : `/product/${p.slug}${p.cartId && p.cartId !== p.slug ? `?plan=${p.cartId}` : ""}`)
      : undefined;
    const linkTarget = p.isGiftCardMaster && p.viewOfferLink ? p.viewOfferLink : defaultLink;

    return (
      <StoreProductCard
        key={p.cartId ? `${p.id}-${p.cartId}` : p.id}
        slug={p.slug}
        cartId={p.cartId || p.slug}
        name={name}
        link={linkTarget}
        price={p.basePriceJod}
        oldPrice={p.oldPriceJod}
        tagline={tagline}
        region={p.region}
        productType={p.productType}
        badge={p.badge}
        imageUrl={p.imageUrl}
        iconImage={p.iconImage}
        icon={p.icon}
        thumbBg={p.thumbBg}
        snapDuration={p.snapDuration || undefined}
        categoryName={category.nameAr}
        categorySlug={category.slug}
        customPlatform={p.platform || undefined}
        showFromLabel={Boolean(p.isGiftCardMaster)}
        isGiftCardMaster={Boolean(p.isGiftCardMaster)}
      />
    );
  };

  const breadcrumbListSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: lang === "en" ? "Home" : "الرئيسية",
        item: "https://gxstore.me/",
      },
      ...(category.parent
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: pick(category.parent.nameAr, category.parent.nameEn),
              item: `https://gxstore.me/category/${category.parent.slug}`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: catName,
              item: `https://gxstore.me/category/${category.slug}`,
            },
          ]
        : [
            {
              "@type": "ListItem",
              position: 2,
              name: catName,
              item: `https://gxstore.me/category/${category.slug}`,
            },
          ]),
    ],
  };

  const collectionPageSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${catName} | متجر GX Store`,
    description:
      category.taglineAr ||
      category.taglineEn ||
      `تصفح عروض ومنتجات قسم ${catName} في متجر GX Store بأفضل الأسعار.`,
    url: `https://gxstore.me/category/${category.slug}`,
    isPartOf: {
      "@type": "WebSite",
      name: "GX Store",
      url: "https://gxstore.me/",
    },
  };

  return (
    <StoreShell>
      {/* Structured Data: BreadcrumbList & CollectionPage Schemas */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbListSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageSchema) }}
      />

      {/* 1. Dynamic Integrated Category Stage (Hero + Moving Platforms) */}
      <section
        className="category-hero"
        style={{
          ['--cat-glow' as any]: theme.glow,
          ['--cat-ambient' as any]: theme.ambient,
        }}
      >
        <div className="wrap">
          <div className="category-stage-card fade-in">
            {/* Stage Top Bar: Breadcrumb, Title, and View All Platforms Button */}
            <div className="cat-stage-top">
              <div className="cat-stage-info">
                <nav className="cat-breadcrumb" aria-label="مسار التصفح">
                  <Link to="/">
                    <span className="home-dot"></span>
                    {lang === "en" ? "Home" : "الرئيسية"}
                  </Link>
                  <span className="sep">/</span>
                  {category.parent && (
                    <>
                      <Link to="/category/$slug" params={{ slug: category.parent.slug }}>
                        {pick(category.parent.nameAr, category.parent.nameEn)}
                      </Link>
                      <span className="sep">/</span>
                    </>
                  )}
                  <span className="current">{catName}</span>
                </nav>

                <div className="cat-stage-heading">
                  <div className="cat-stage-badge">
                    {category.iconImage ? (
                      <img src={category.iconImage} alt={catName} />
                    ) : (
                      renderCategoryVectorIcon(category.slug, 40)
                    )}
                  </div>

                  <div className="cat-stage-title-wrap">
                    <h1>{catName}</h1>
                    {pick(category.taglineAr, category.taglineEn) ? (
                      <p className="cat-stage-desc">{pick(category.taglineAr, category.taglineEn)}</p>
                    ) : category.slug === "subscriptions" ? (
                      <p className="cat-stage-desc">
                        {lang === "en"
                          ? "Official digital gaming, entertainment, and streaming subscriptions at competitive prices with instant delivery."
                          : "اشتراكات الألعاب والترفيه الرقمي الرسمية والمضمونة بأفضل الأسعار والتسليم الفوري."}
                      </p>
                    ) : (
                      <p className="cat-stage-desc">
                        {lang === "en"
                          ? `Explore the best official deals and subscriptions for ${catName} at GX Store.`
                          : `استكشف أفضل العروض والاشتراكات الرسمية المعتمدة لـ ${catName} بأفضل الأسعار وأعلى سرعة تسليم.`}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* View All Platforms Button in Header (if > 6 platforms) */}
              {!isStaticPlatforms && platformsList.length > 1 && (
                <button
                  type="button"
                  className="platform-open-all-btn cat-stage-all-btn"
                  onClick={() => setIsAllPlatformsModalOpen(true)}
                  title={lang === "en" ? "Open all platforms in a window" : "عرض جميع المنصات في نافذة واحدة"}
                >
                  <span className="btn-icon">⊞</span>
                  <span>{lang === "en" ? "View All Platforms" : "عرض كل المنصات"}</span>
                </button>
              )}
            </div>

            {/* Sibling Switcher Bar for Subcategories (e.g. Canva, Windows) */}
            {navPills.length > 0 && (
              <div className="cat-pills-bar-wrap">
                <div className="cat-pills-bar">
                  {navPills.map((pill) => (
                    <Link
                      key={pill.slug}
                      to={pill.to as any}
                      params={pill.params as any}
                      className={`cat-pill-item ${pill.active ? "active" : ""}`}
                    >
                      {pill.icon}
                      <span>{pill.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Moving Platforms Track (or Static Grid if <= 6) directly in the Stage */}
            {platformsList.length > 1 && (
              <div className="cat-stage-platforms">
                {isStaticPlatforms ? (
                  <div className="platform-static-grid">
                    {platformsList.map((plat) => renderPlatformCard(plat, plat.id))}
                  </div>
                ) : (
                  <div className="platform-marquee-wrap">
                    <div className="platform-marquee-track">
                      {marqueeItems.map((plat, idx) =>
                        renderPlatformCard(plat, `${plat.id}-${idx}`)
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. Main Products Section */}
      <section className="section" style={{ background: "var(--bg2)", paddingTop: 20, minHeight: 450 }}>
        <div className="wrap">
          {/* Clean Modern Products Header Toolbar */}
          <div className="cat-products-toolbar">
            <div className="cat-toolbar-start">
              <div className="cat-toolbar-count">
                <span className="count-num">{displayedProducts.length}</span>
                <span className="count-label">{lang === "en" ? "Products" : "منتج متوفر"}</span>
              </div>

              {/* Active Platform Pill */}
              {activePlatformObj && activePlatformObj.id !== "all" && (
                <div
                  className="cat-toolbar-filter-pill"
                  style={{
                    borderColor: activePlatformObj.color,
                    background: `${activePlatformObj.color}15`,
                  }}
                >
                  <span style={{ color: activePlatformObj.color }}>⚡ {lang === "en" ? "Platform:" : "المنصة:"}</span>
                  <span style={{ fontWeight: 800 }}>{pick(activePlatformObj.nameAr, activePlatformObj.nameEn)}</span>
                  <button
                    type="button"
                    className="reset-btn"
                    onClick={() => setSelectedPlatform("all")}
                    title={lang === "en" ? "Clear platform filter" : "إلغاء فلتر المنصة"}
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Active Subtype / Service / Genre Pill */}
              {selectedSubtype !== "all" && (
                <div
                  className="cat-toolbar-filter-pill"
                  style={{ borderColor: "#a855f7", background: "rgba(168, 85, 247, 0.12)" }}
                >
                  <span style={{ color: "#c084fc" }}>
                    {isSocialCategory ? "✨ " : "🎮 "}
                    {isSocialCategory
                      ? lang === "en"
                        ? "Service:"
                        : "الخدمة:"
                      : lang === "en"
                        ? "Genre:"
                        : "التصنيف:"}
                  </span>
                  <span style={{ fontWeight: 800 }}>
                    {(() => {
                      const opts = isSocialCategory ? SOCIAL_SUBTYPES : GAMING_GENRES;
                      const opt = opts.find((o) => o.id === selectedSubtype);
                      return opt
                        ? lang === "en"
                          ? opt.shortLabelEn
                          : opt.shortLabelAr
                        : selectedSubtype;
                    })()}
                  </span>
                  <button
                    type="button"
                    className="reset-btn"
                    onClick={() => setSelectedSubtype("all")}
                    title={lang === "en" ? "Clear filter" : "إلغاء الفلتر"}
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Active Delivery Type Pill */}
              {selectedDeliveryType !== "all" && (
                <div
                  className="cat-toolbar-filter-pill"
                  style={{ borderColor: "#00f5a0", background: "rgba(0, 245, 160, 0.1)" }}
                >
                  <span style={{ color: "#00f5a0" }}>📦 {lang === "en" ? "Type:" : "النوع:"}</span>
                  <span style={{ fontWeight: 800 }}>
                    {DELIVERY_TYPE_OPTIONS.find((o) => o.id === selectedDeliveryType)?.shortLabelAr || selectedDeliveryType}
                  </span>
                  <button
                    type="button"
                    className="reset-btn"
                    onClick={() => setSelectedDeliveryType("all")}
                    title={lang === "en" ? "Clear type filter" : "إلغاء فلتر النوع"}
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Active Price Range Pill */}
              {(selectedPricePreset !== "all" || customMinPrice || customMaxPrice) && (
                <div
                  className="cat-toolbar-filter-pill"
                  style={{ borderColor: "#38bdf8", background: "rgba(56, 189, 248, 0.1)" }}
                >
                  <span style={{ color: "#38bdf8" }}>🏷️ {lang === "en" ? "Price:" : "السعر:"}</span>
                  <span style={{ fontWeight: 800 }}>
                    {selectedPricePreset === "custom"
                      ? `${customMinPrice || "0"} – ${customMaxPrice || "∞"} JOD`
                      : PRICE_PRESETS.find((p) => p.id === selectedPricePreset)?.labelAr || selectedPricePreset}
                  </span>
                  <button
                    type="button"
                    className="reset-btn"
                    onClick={() => {
                      setSelectedPricePreset("all");
                      setCustomMinPrice("");
                      setCustomMaxPrice("");
                    }}
                    title={lang === "en" ? "Clear price filter" : "إلغاء فلتر السعر"}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            <div className="cat-toolbar-end">
              {/* Category-specific Subtype / Service / Genre Dropdown */}
              {(isSocialCategory || isGamingCategory) && (
                <CatSubtypeDropdown
                  options={isSocialCategory ? SOCIAL_SUBTYPES : GAMING_GENRES}
                  selectedId={selectedSubtype}
                  onSelect={setSelectedSubtype}
                  lang={lang}
                  titleAr={isSocialCategory ? "نوع الخدمة" : "التصنيف"}
                  titleEn={isSocialCategory ? "Service" : "Genre"}
                />
              )}

              {/* Product Delivery Type Filter Dropdown */}
              <CatDeliveryTypeDropdown
                selectedType={selectedDeliveryType}
                onTypeChange={setSelectedDeliveryType}
                lang={lang}
              />

              {/* Price Range Filter Dropdown */}
              <CatPriceFilterDropdown
                selectedPreset={selectedPricePreset}
                customMin={customMinPrice}
                customMax={customMaxPrice}
                onSelectPreset={(p) => {
                  setSelectedPricePreset(p);
                  setCustomMinPrice("");
                  setCustomMaxPrice("");
                }}
                onApplyCustom={(min, max) => {
                  setSelectedPricePreset("custom");
                  setCustomMinPrice(min);
                  setCustomMaxPrice(max);
                }}
                lang={lang}
              />

              {/* Custom Sort Dropdown */}
              <CatSortDropdown
                sortBy={sortBy}
                onSortChange={setSortBy}
                lang={lang}
              />
            </div>
          </div>

          {/* Product Cards Grid (5x5 Adaptive Grid with Pagination) */}
          {displayedProducts.length > 0 ? (
            <>
              <div className={`cat-adaptive-grid ${isGiftCardCategory ? "cat-giftcards-grid" : ""}`}>
                {paginatedProducts.map((p) => renderProductCard(p))}
              </div>

              <CatPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={displayedProducts.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
                lang={lang}
                scrollSelector=".cat-products-toolbar"
              />
            </>
          ) : selectedPlatform === "sony" ? (
            <div
              style={{
                textAlign: "center",
                padding: "48px 24px",
                background: "linear-gradient(145deg, rgba(0, 112, 209, 0.1) 0%, rgba(10, 14, 24, 0.85) 100%)",
                border: "1.5px dashed rgba(0, 112, 209, 0.4)",
                borderRadius: 22,
                boxShadow: "0 12px 32px rgba(0, 0, 0, 0.35)",
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  margin: "0 auto 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 20,
                  background: "rgba(0, 112, 209, 0.18)",
                  border: "1px solid rgba(0, 112, 209, 0.4)",
                }}
              >
                <img
                  src="/app/assets/img/playstation-logo.svg"
                  alt="PlayStation"
                  style={{ width: 44, height: 44, objectFit: "contain" }}
                />
              </div>
              <h3 style={{ color: "#ffffff", fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
                {lang === "en" ? "PlayStation Games Library (PSN)" : "مكتبة ألعاب PlayStation (PSN)"}
              </h3>
              <p style={{ fontSize: 14, color: "#94a3b8", maxWidth: 520, margin: "0 auto 20px", lineHeight: 1.6 }}>
                {lang === "en"
                  ? "We are actively curating and adding verified PlayStation digital keys and accounts at the best prices. In the meantime, official PlayStation Store gift cards are available with instant delivery!"
                  : "يتم حالياً تجهيز وإضافة مكتبة أكواد وحسابات ألعاب بلايستيشن الرسمية بأفضل الأسعار. بإمكانك شحن حسابك مباشرة عبر بطاقات بلايستيشن المتوفرة بالتسليم الفوري!"}
              </p>
              <Link
                to="/product/$slug"
                params={{ slug: "playstation" }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 24px",
                  borderRadius: 99,
                  background: "linear-gradient(135deg, #0070d1, #005bb5)",
                  color: "#ffffff",
                  fontWeight: 800,
                  fontSize: 14,
                  textDecoration: "none",
                  boxShadow: "0 4px 18px rgba(0, 112, 209, 0.45)",
                }}
              >
                <span>🎁 {lang === "en" ? "Browse PlayStation Gift Cards" : "تصفح بطاقات شحن بلايستيشن المعتمدة"}</span>
                <span>{lang === "en" ? "→" : "←"}</span>
              </Link>
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "48px 20px",
                background: "rgba(13, 17, 26, 0.5)",
                border: "1px dashed rgba(255, 255, 255, 0.12)",
                borderRadius: 18,
                color: "#94a3b8",
              }}
            >
              <div style={{ fontSize: 42, marginBottom: 12 }}>🔍</div>
              <h3 style={{ color: "#ffffff", fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
                {lang === "en" ? "No matching products found" : "لا توجد نتائج مطابقة لبحثك"}
              </h3>
              <p style={{ fontSize: 14, color: "#64748b" }}>
                {lang === "en"
                  ? "Try searching with different keywords or switch categories."
                  : "جرب البحث بكلمات أخرى أو اختر قسماً آخر من التبويبات أعلاه."}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedPlatform("all");
                }}
                style={{
                  marginTop: 16,
                  padding: "8px 20px",
                  borderRadius: 99,
                  background: "rgba(0, 229, 255, 0.15)",
                  border: "1px solid #00e5ff",
                  color: "#00e5ff",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {lang === "en" ? "Reset filters" : "إعادة ضبط الفلتر"}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 4. Modal Popup: View All Platforms in a Grid */}
      {isAllPlatformsModalOpen && (
        <div className="platform-modal-backdrop" onClick={() => setIsAllPlatformsModalOpen(false)}>
          <div className="platform-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="platform-modal-header">
              <div>
                <h3 className="platform-modal-title">
                  <span>⚡</span>
                  <span>{lang === "en" ? "All Platforms & Brands" : "جميع المنصات والبراندات"}</span>
                </h3>
                <p className="platform-modal-sub">
                  {lang === "en"
                    ? "Pick any platform to instantly browse all its official products and subscriptions"
                    : "اختر أي منصة لاستعراض كافة عروضها واشتراكاتها المعتمدة فوراً دون انتظار"}
                </p>
              </div>
              <button
                type="button"
                className="platform-modal-close"
                onClick={() => setIsAllPlatformsModalOpen(false)}
                title={lang === "en" ? "Close" : "إغلاق"}
              >
                ✕
              </button>
            </div>

            <div className="platform-modal-grid">
              {platformsList.map((plat) =>
                renderPlatformCard(plat, `modal-${plat.id}`, true)
              )}
            </div>
          </div>
        </div>
      )}
    </StoreShell>
  );
}
