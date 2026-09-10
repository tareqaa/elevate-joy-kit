// Section registry — the single source of truth mapping each SectionType
// to its label, icon, default data, renderer, and editor. Add a new
// section by adding one entry here.

import type { ComponentType } from "react";
import {
  Sparkles, Megaphone, GalleryHorizontal, LayoutGrid,
  Star, ShoppingBag, ShieldCheck, MessageSquare, HelpCircle, Mail,
  Clock, Gamepad2, Compass, Tag, Zap,
} from "lucide-react";
import type { SectionType } from "./types";
import {
  HeroRenderer, AnnouncementRenderer, CarouselRenderer, CategoriesRenderer,
  BestsellersRenderer, ProductsRenderer, TrustRenderer, ReviewsRenderer, FaqRenderer, NewsletterRenderer,
} from "./renderers";
import {
  HeroEditor, AnnouncementEditor, CarouselEditor, CategoriesEditor,
  BestsellersEditor, ProductsEditor, TrustEditor, ReviewsEditor, FaqEditor, NewsletterEditor,
} from "./editors";
import { RecentlyViewedSection } from "@/components/gx/RecentlyViewedSection";
import { BestSellingGamesSection } from "@/components/gx/BestSellingGamesSection";
import { DiscoverGamesCategorySection } from "@/components/gx/DiscoverGamesCategorySection";
import { DiscoverByPriceSection } from "@/components/gx/DiscoverByPriceSection";
import { BestSellingGamepointsSection } from "@/components/gx/BestSellingGamepointsSection";
import { HomeCategoriesBar } from "@/components/gx/HomeCategoriesBar";

export type SectionDef = {
  type: SectionType;
  label: string;
  description: string;
  Icon: ComponentType<{ size?: number; className?: string }>;
  defaultData: Record<string, unknown>;
  // Renderer/Editor typed loosely here — the admin/home layer passes the
  // correct data shape based on the section's `type`.
  Renderer: ComponentType<{ data: Record<string, unknown> }>;
  Editor: ComponentType<{ data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }>;
};

// Cast helper — narrows the runtime `Record<string,unknown>` to whatever the
// concrete component expects. Safe because the registry couples the two.
type AnyRenderer = ComponentType<{ data: Record<string, unknown> }>;
type AnyEditor = ComponentType<{ data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }>;
const asRenderer = <P,>(C: ComponentType<P>) => C as unknown as AnyRenderer;
const asEditor = <P,>(C: ComponentType<P>) => C as unknown as AnyEditor;

export const SECTION_REGISTRY: Record<SectionType, SectionDef> = {
  hero: {
    type: "hero", label: "الهيرو", description: "البانر الرئيسي أعلى الصفحة", Icon: Sparkles,
    defaultData: {},
    Renderer: asRenderer(HeroRenderer), Editor: asEditor(HeroEditor),
  },
  announcement: {
    type: "announcement", label: "شريط إعلان", description: "شريط رفيع لعرض إشعار أو عرض", Icon: Megaphone,
    defaultData: { text: "عرض جديد!", link: "", bg: "#0f172a", color: "#ffffff" },
    Renderer: asRenderer(AnnouncementRenderer), Editor: asEditor(AnnouncementEditor),
  },
  carousel: {
    type: "carousel", label: "سلايدر الصور", description: "شرائح تلقائية لعروض وبانرات", Icon: GalleryHorizontal,
    defaultData: { autoplay: true, interval_ms: 5000, items: [] },
    Renderer: asRenderer(CarouselRenderer), Editor: asEditor(CarouselEditor),
  },
  top_categories_bar: {
    type: "top_categories_bar", label: "شريط الأقسام السريع", description: "شريط أيقونات الأقسام الرئيسي البنفسجي", Icon: LayoutGrid,
    defaultData: {},
    Renderer: asRenderer(HomeCategoriesBar), Editor: asEditor(() => null),
  },
  categories: {
    type: "categories", label: "الأقسام", description: "شبكة الأقسام الرئيسية", Icon: LayoutGrid,
    defaultData: {},
    Renderer: asRenderer(CategoriesRenderer), Editor: asEditor(CategoriesEditor),
  },
  bestsellers: {
    type: "bestsellers", label: "الأكثر مبيعاً", description: "المنتجات المميّزة", Icon: Star,
    defaultData: {},
    Renderer: asRenderer(BestsellersRenderer), Editor: asEditor(BestsellersEditor),
  },
  products: {
    type: "products", label: "منتجات مختارة", description: "اختر منتجات محددة وترتيبها", Icon: ShoppingBag,
    defaultData: { title: "منتجات مختارة", ids: [] },
    Renderer: asRenderer(ProductsRenderer), Editor: asEditor(ProductsEditor),
  },
  trust: {
    type: "trust", label: "شارات الثقة", description: "التفعيل الفوري والعدّاد والدعم", Icon: ShieldCheck,
    defaultData: {},
    Renderer: asRenderer(TrustRenderer), Editor: asEditor(TrustEditor),
  },
  reviews: {
    type: "reviews", label: "المراجعات", description: "شريط تقييمات العملاء", Icon: MessageSquare,
    defaultData: {},
    Renderer: asRenderer(ReviewsRenderer), Editor: asEditor(ReviewsEditor),
  },
  faq: {
    type: "faq", label: "الأسئلة الشائعة", description: "قائمة أسئلة/أجوبة قابلة للطي", Icon: HelpCircle,
    defaultData: { title: "الأسئلة الشائعة", items: [] },
    Renderer: asRenderer(FaqRenderer), Editor: asEditor(FaqEditor),
  },
  newsletter: {
    type: "newsletter", label: "النشرة البريدية", description: "نموذج اشتراك بالبريد", Icon: Mail,
    defaultData: { title: "اشترك بالنشرة", subtitle: "أول من يعرف عن العروض", cta: "اشترك", placeholder: "بريدك الإلكتروني" },
    Renderer: asRenderer(NewsletterRenderer), Editor: asEditor(NewsletterEditor),
  },
  recently_viewed: {
    type: "recently_viewed", label: "شوهدت مؤخراً", description: "المنتجات التي تصفحها الزائر", Icon: Clock,
    defaultData: {},
    Renderer: asRenderer(RecentlyViewedSection), Editor: asEditor(() => null),
  },
  best_selling_games: {
    type: "best_selling_games", label: "الألعاب الأكثر مبيعاً", description: "أفضل ألعاب الكمبيوتر مع إظهار الكل", Icon: Gamepad2,
    defaultData: {},
    Renderer: asRenderer(BestSellingGamesSection), Editor: asEditor(() => null),
  },
  discover_genres: {
    type: "discover_genres", label: "اكتشف الألعاب حسب التصنيف", description: "بطاقات التصنيفات الأفقية", Icon: Compass,
    defaultData: {},
    Renderer: asRenderer(DiscoverGamesCategorySection), Editor: asEditor(() => null),
  },
  discover_price: {
    type: "discover_price", label: "اكتشف حسب السعر", description: "بطاقات التصفح حسب الميزانية", Icon: Tag,
    defaultData: {},
    Renderer: asRenderer(DiscoverByPriceSection), Editor: asEditor(() => null),
  },
  gamepoints: {
    type: "gamepoints", label: "نقاط وشحن الألعاب", description: "بطاقات ونقاط الألعاب الأكثر مبيعاً", Icon: Zap,
    defaultData: {},
    Renderer: asRenderer(BestSellingGamepointsSection), Editor: asEditor(() => null),
  },
};

export const SECTION_TYPES: SectionType[] = Object.keys(SECTION_REGISTRY) as SectionType[];
