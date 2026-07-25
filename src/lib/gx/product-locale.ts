/* ============================================================
   GX STORE — PRODUCT / CATEGORY / PLAN LOCALIZATION
   Given an original Arabic product/plan/etc., return an English
   version. Falls back to Arabic when no translation is provided.
   ============================================================ */

import type { Lang } from "./i18n";
import type { CategoryLink, GiftCard, Plan, Product, Region, Subcategory, Feature } from "@/data/products";

/* --- Product-level EN overrides (name, tagline, description, category, delivery, identifier) --- */
type ProductI18n = {
  name?: string;
  tagline?: string;
  description?: string;
  category?: string;
  identifierLabel?: string;
  deliveryMethod?: string;
};

const PRODUCTS_EN: Record<string, ProductI18n> = {
  snapchat: {
    name: "Snapchat+",
    tagline: "Activate Snapchat+ the easiest, fastest way",
    description:
      "Pick the duration, choose the number of accounts, and enter each account's username — official 100% activation via Snapchat's in-app gift feature.",
    category: "Snapchat+ Subscription",
    identifierLabel: "Snapchat username",
    deliveryMethod:
      'We top up your subscription directly using Snapchat\'s official "Gift Subscription" feature — only your username is needed, we never ask for your password or log into your account.',
  },
  adobe: {
    name: "Adobe Creative Cloud",
    tagline: "All Adobe apps in one subscription",
    description: "Photoshop, Illustrator, Premiere Pro and more — an official subscription on your own account at the best price.",
    category: "Software & Apps",
    identifierLabel: "Adobe ID email",
    deliveryMethod: "We activate the subscription directly on your Adobe ID via email, without asking for your password — you'll receive an official activation message from Adobe.",
  },
  canva: {
    name: "Canva Pro",
    tagline: "Canva Pro for a full year",
    description: "All Canva Pro features on your personal account — premium templates, backgrounds, fonts and background removal.",
    category: "Software & Apps",
    identifierLabel: "Canva account email",
    deliveryMethod: "We activate Canva Pro directly on your personal account — just send us your email and you'll get an official invite from Canva.",
  },
  linkedin: {
    name: "LinkedIn Premium Business",
    tagline: "LinkedIn Premium Business for a full year",
    description: "InMail access, detailed company insights and LinkedIn Learning courses on your personal account.",
    category: "Software & Apps",
    identifierLabel: "LinkedIn account email",
    deliveryMethod: "We activate LinkedIn Premium (Business) on your personal account directly — all we need is the email registered on LinkedIn.",
  },
  microsoft365: {
    name: "Microsoft 365",
    tagline: "Microsoft 365 — multiple options",
    description: "Word, Excel, PowerPoint, Outlook and more — pick what suits you: an account from us, a personal key, or a family plan for 5 users.",
    category: "Software & Apps",
    deliveryMethod: "Depending on the option: we either provide a ready account or send an official Product Key to activate on your personal account.",
  },
  autodesk: {
    name: "Autodesk All Apps",
    tagline: "All Autodesk apps for a full year",
    description: "AutoCAD, 3ds Max, Maya, Revit, Fusion 360 and 20+ apps — an official subscription on your personal account.",
    category: "Software & Apps",
    identifierLabel: "Autodesk account email",
    deliveryMethod: "We activate the official All Apps plan on your Autodesk account via email, without asking for your password.",
  },
  gemini: {
    name: "Gemini Pro",
    tagline: "Gemini Pro for 18 months",
    description: "Access to Gemini Advanced models, higher usage limits and Google apps integration — all on your personal account.",
    category: "Artificial Intelligence",
    identifierLabel: "Google account email",
    deliveryMethod: "We send you an activation link for your personal Google account — click it and the subscription activates instantly without asking for your password.",
  },
  windows: {
    name: "Windows Activation",
    tagline: "Official activation keys for Windows 10 & 11",
    description: "Choose the edition (Pro or Home) and binding method (OEM to device or Account) — official lifetime activation.",
    category: "Software & Apps",
    deliveryMethod: "We send the official Product Key with detailed activation steps. OEM keys bind to the motherboard; Account keys bind to your Microsoft account.",
  },
  fortnite: {
    name: "Fortnite",
    tagline: "Monthly Crew and instant V-Bucks top-up",
    description: "Subscribe to monthly Crew or top up V-Bucks directly to your Epic Games account.",
    category: "Games",
  },
};

/* --- Plan label translations by plan.id --- */
const PLAN_LABELS_EN: Record<string, string> = {
  "snap-3": "3 months",
  "snap-6": "6 months",
  "snap-12": "12 months",
  "adobe-1": "1 month",
  "adobe-4": "4 months",
  "canva-12": "12 months",
  "linkedin-12": "12 months",
  "ms365-acct-12": "Account from us — 12 months",
  "ms365-key-12": "Personal key + 1TB OneDrive — 12 months",
  "ms365-fam-12": "Family plan (5 users) — 12 months",
  "autodesk-12": "12 months — All Apps",
  "gemini-18": "18 months",
  "win-pro-oem": "Windows 10/11 Pro — OEM (Motherboard)",
  "win-pro-acct": "Windows 10/11 Pro — Account",
  "win-home-oem": "Windows 10/11 Home — OEM (Motherboard)",
  "win-home-acct": "Windows 10/11 Home — Account",
  "fn-crew": "Fortnite Crew — 1 month",
  "fn-crew-3": "Fortnite Crew — 3 months",
  "fn-vb-800": "800 V-Bucks",
  "fn-vb-2400": "2400 V-Bucks",
  "fn-vb-4500": "4500 V-Bucks",
  "fn-vb-12500": "12500 V-Bucks",
};

/* --- Plan.tag translations --- */
const PLAN_TAGS_EN: Record<string, string> = {
  "الأكثر طلبًا": "Most popular",
  "الأفضل قيمة": "Best value",
  "الأوفر": "Best deal",
  "عرض خاص": "Special offer",
  "يشمل V-Bucks شهرية": "Includes monthly V-Bucks",
};

/* --- Category translations --- */
const CATEGORY_LINKS_EN: Record<string, { name: string; desc: string }> = {
  snapchat: { name: "Snapchat+", desc: "Exclusive icon, chat colors and more" },
  design: { name: "Software & Apps", desc: "Adobe, Canva, Microsoft 365, Autodesk & more" },
  ai: { name: "Artificial Intelligence", desc: "Gemini Pro subscriptions and other AI tools" },
  games: { name: "Games", desc: "Fortnite, PlayStation, Xbox" },
  "gift-cards": { name: "Gift Cards", desc: "PlayStation, Xbox, Google Play, iTunes" },
};

const CATEGORY_META_EN: Record<string, { name: string; tagline: string }> = {
  design: { name: "Software & Apps", tagline: "Professional design software and apps at competitive prices" },
  ai: { name: "Artificial Intelligence", tagline: "The most powerful AI tools at exclusive prices" },
  games: { name: "Games", tagline: "Subscriptions, currency and top-up cards for the biggest gaming platforms" },
  "gift-cards": { name: "Gift Cards", tagline: "Digital top-up cards for the biggest platforms — denominations & prices coming soon" },
};

const SUBCATEGORY_NAMES_EN: Record<string, string> = {
  adobe: "Adobe Creative Cloud",
  canva: "Canva Pro",
  microsoft365: "Microsoft 365",
  windows: "Windows Activation",
  autodesk: "Autodesk",
  linkedin: "LinkedIn Premium",
  gemini: "Gemini Pro",
  fortnite: "Fortnite",
  steam: "Steam Games",
  sony: "PlayStation Games",
  xbox: "Xbox Games",
  playstation: "PlayStation Gift Cards",
  "xbox-gc": "Xbox Gift Cards",
  "google-play": "Google Play Gift Cards",
  itunes: "iTunes Gift Cards",
};

/* --- Region names EN --- */
const REGION_NAMES_EN: Record<string, string> = {
  us: "United States (USA)",
  ae: "United Arab Emirates (UAE)",
  sa: "Saudi Arabia (KSA)",
  tr: "Turkey",
};

/* --- Gift Card names (already English mostly) & regions --- */

/* --- Features translations (indexed by original Arabic title) --- */
const FEATURE_MAP_EN: Record<string, { title: string; desc: string }> = {
  // Snapchat
  "أيقونة حصرية للتطبيق": { title: "Exclusive app icon", desc: "Change your Snapchat home-screen icon to exclusive designs not available to regular users." },
  "ألوان دردشة مخصصة": { title: "Custom chat colors", desc: "Change your chat bubble color so friends can spot you in every conversation." },
  "أفضل صديق مثبّت": { title: "Pinned best friend", desc: "Pin a person to the top of your friends list permanently, no matter how activity changes." },
  "مشاهدة القصة مرة ثانية": { title: "Story rewatch insights", desc: "See exactly who re-watched your story and how many times each person did." },
  "لمحة سريعة": { title: "Peek preview", desc: "See if a friend is typing or reading your message before you get their reply." },
  "250 جيجا تخزين سحابي": { title: "250 GB cloud storage", desc: "Save all your memories and old snaps with a huge storage space that lasts a long time." },
  // Adobe
  "كل تطبيقات Adobe": { title: "All Adobe apps", desc: "Photoshop, Illustrator, Premiere Pro, InDesign and 20+ apps in the same subscription." },
  "100 جيجا تخزين سحابي": { title: "100 GB cloud storage", desc: "Save your projects and assets safely and reach them from any device you sign in on." },
  "مكتبة Adobe Fonts": { title: "Adobe Fonts library", desc: "Thousands of professional fonts ready to use directly across all apps." },
  "تفعيل على أكثر من جهاز": { title: "Multi-device activation", desc: "Use your account on desktop and mobile at the same time." },
  // Canva
  "قوالب بريميوم": { title: "Premium templates", desc: "Full access to 100M+ premium templates, images and videos." },
  "إزالة الخلفية بضغطة": { title: "One-click background removal", desc: "The pro Background Remover tool is available inside the app." },
  "مكتبة خطوط ضخمة": { title: "Massive font library", desc: "Thousands of professional Arabic and English fonts." },
  "1 تيرا تخزين سحابي": { title: "1 TB cloud storage", desc: "Save all your designs and projects safely with plenty of room." },
  // LinkedIn
  "InMail Messages": { title: "InMail Messages", desc: "Message anyone on LinkedIn even if they're not in your network." },
  "رؤى الشركات والوظائف": { title: "Company & job insights", desc: "See applicant details and compare yourself with other applicants." },
  "LinkedIn Learning": { title: "LinkedIn Learning", desc: "Full access to thousands of professional courses with certified diplomas." },
  "مين شاف بروفايلك": { title: "Who viewed your profile", desc: "See the full list of people who visited your profile in the last 90 days." },
  // Microsoft 365
  "كل تطبيقات Office": { title: "All Office apps", desc: "Word, Excel, PowerPoint, Outlook, OneNote — full versions for desktop and mobile." },
  "1 تيرا OneDrive": { title: "1 TB OneDrive", desc: "1TB cloud storage with the personal key and family plans." },
  "يشتغل لكل الأجهزة": { title: "Works on every device", desc: "Windows, Mac, iOS, Android — same account." },
  "تفعيل رسمي 100%": { title: "100% official activation", desc: "Genuine Microsoft keys and legitimate accounts." },
  // Autodesk
  "AutoCAD & Revit": { title: "AutoCAD & Revit", desc: "The world-leading engineering and architectural design tools." },
  "Maya & 3ds Max": { title: "Maya & 3ds Max", desc: "The best 3D animation and visual effects software." },
  "Fusion 360": { title: "Fusion 360", desc: "Integrated CAD/CAM/CAE for mechanical design." },
  "+20 تطبيق آخر": { title: "20+ more apps", desc: "Full access to every Autodesk app under one subscription." },
  // Gemini
  "Gemini Advanced": { title: "Gemini Advanced", desc: "Access to Google's most capable models for complex tasks." },
  "حدود استخدام أعلى": { title: "Higher usage limits", desc: "Many more messages and conversations than the free version." },
  "رفع ملفات وصور": { title: "Upload files and images", desc: "Analyze PDFs, documents and images directly inside the chat." },
  "تكامل مع Google": { title: "Google integration", desc: "Works within Gmail, Docs and Sheets to save you time." },
  // Windows
  "مفاتيح رسمية 100%": { title: "100% official keys", desc: "Every key is genuine and activated straight from Microsoft's servers." },
  "تفعيل مدى الحياة": { title: "Lifetime activation", desc: "The key is permanent — no monthly or yearly renewal." },
  "ربط بالمذربورد أو الحساب": { title: "OEM or account binding", desc: "OEM binds to the device; Account binds to your Microsoft account for device switching." },
  "ضمان استبدال": { title: "Replacement guarantee", desc: "If the key has any issue within the warranty period, we replace it immediately." },
  // Fortnite Crew
  "طقم Crew Pack حصري شهريًا": { title: "Exclusive monthly Crew Pack", desc: "An exclusive outfit and accessories that refresh every month and can't be bought separately anywhere else." },
  "Battle Pass الموسم الحالي": { title: "Current-season Battle Pass", desc: "Your subscription automatically includes the current season's Battle Pass while active." },
  "1000 وحدة V-Bucks شهريًا": { title: "1000 monthly V-Bucks", desc: "V-Bucks credit is added to your account every month and you can spend it on anything in the store." },
};

/* --- Delivery block for Fortnite --- */
const FORTNITE_DELIVERY_EN = {
  intro: "After confirming your order, we'll need the following info to activate the Crew or top up V-Bucks directly on your account:",
  requirements: [
    "Epic Games account email and password",
    "2FA verification code if prompted during sign-in",
    "Be signed out of Fortnite and don't sign in until we complete the order",
  ],
  safety: [
    "100% official top-up via approved payment methods",
    "Used across thousands of successful orders",
    "Zero risk of account ban",
    "Sign-in data is permanently deleted right after order completion",
  ],
  platformNotes: [
    "The chosen V-Bucks amount is added directly to your account",
    "Works on every platform (PC, PlayStation, Xbox) except Nintendo Switch",
    "Works in every region worldwide",
  ],
};

/* --- FAQ translations --- */
export const FAQ_EN = [
  { icon: "🛒", title: "How do I order from the store?", desc: "Pick the right product, add it to cart, then press \"Checkout via WhatsApp\". We'll review the order, confirm availability, price and payment method before starting." },
  { icon: "⏱️", title: "How long does delivery take?", desc: "Order processing begins after payment is confirmed. Most digital orders are delivered within minutes to a couple of hours, depending on the product type, availability and region." },
  { icon: "✅", title: "How do I know my order is confirmed?", desc: "We send a WhatsApp confirmation after reviewing the order and receiving proof of payment. Keep the order message until delivery is complete." },
  { icon: "💰", title: "Are the displayed prices final?", desc: "Prices shown are updated as much as possible. Final price and availability are confirmed on WhatsApp before payment, especially for special or region-dependent orders." },
  { icon: "🆘", title: "What if I have an issue with my order?", desc: "Contact us on WhatsApp directly with your order number or a screenshot of the chat. We'll review and provide a fix as soon as possible." },
  { icon: "🛡️", title: "What's the warranty & refund policy?", desc: "We have a dedicated page that explains warranty and returns step by step. Open the warranty page from the menu." },
];

/* --- Policy translations --- */
export const POLICY_EN = [
  { id: "duration", icon: "⏳", title: "Warranty duration", listKind: "covered" as const, items: [
    "Digital subscriptions: covered by warranty for the full subscription duration unless otherwise stated.",
    "Other products (codes, cards, currency, services): covered until the product is delivered successfully.",
  ]},
  { id: "mechanism", icon: "🛠️", title: "Warranty mechanism", body: "If a customer experiences any issue with a product, please contact support with the order and issue details. We'll review the case and provide the appropriate solution.", listKind: "covered" as const, items: [
    "Receiving a product that doesn't match the order.",
    "An issue with the product on receipt.",
    "The product or service not working because of an error on our side.",
    "Subscription or service stops working because of a delivery or activation issue on our side.",
  ]},
  { id: "returns", icon: "↩️", title: "Refund policy", body: "All payments are considered final once the order is executed or the product is delivered, due to its digital nature.", listKind: "excluded" as const, items: [
    "After the code or product data has been sent.",
    "After the subscription is activated or the product used.",
    "After service execution has begun.",
  ], note: "If a proven issue is on our side and we can't provide a suitable replacement, the customer is compensated based on product condition." },
  { id: "compensation", icon: "🔁", title: "Compensation & replacement", body: "If there's a defect in the product, one of the following solutions is offered depending on the case:", listKind: "process" as const, items: [
    "Replace the product with an equivalent one.",
    "Re-execute the service.",
    "Compensate the customer for the remaining subscription time if there's an active subscription.",
  ]},
  { id: "excluded", icon: "🚫", title: "Cases not covered by warranty", body: "The warranty doesn't cover issues caused by:", listKind: "excluded" as const, items: [
    "Incorrect data entered by the customer.",
    "Choosing a product that doesn't match the account region or platform.",
    "Internet or device issues.",
    "Successful product use or activation.",
    "Any changes or restrictions imposed by the service or game owners.",
    "Violation of the service provider's terms of use.",
  ]},
  { id: "activated", icon: "🔓", title: "Activated products", body: "Once a subscription is activated or a product used successfully, it cannot be replaced or refunded." },
  { id: "delay", icon: "⏰", title: "Delivery delays", body: "We strive to deliver all orders as fast as possible. If a delay happens on our side, the customer is entitled to request an appropriate resolution." },
  { id: "support", icon: "💬", title: "Support", body: "We're available to help customers and resolve any order-related issue 24/7 via WhatsApp." },
];

/* --- Localizer functions --- */

export function localizedProduct(p: Product, lang: Lang): Product {
  if (lang !== "en") return p;
  const en = PRODUCTS_EN[p.slug];
  const localizedPlans = (plans?: Plan[]) => plans?.map((pl) => ({
    ...pl,
    label: PLAN_LABELS_EN[pl.id] || pl.label,
    tag: pl.tag ? (PLAN_TAGS_EN[pl.tag] || pl.tag) : pl.tag,
  }));
  const localizedFeatures = (feats?: Feature[]) => feats?.map((f) => {
    const t = FEATURE_MAP_EN[f.title];
    return t ? { ...f, title: t.title, desc: t.desc } : f;
  });
  return {
    ...p,
    name: en?.name ?? p.name,
    tagline: en?.tagline ?? p.tagline,
    description: en?.description ?? p.description,
    category: en?.category ?? p.category,
    identifierLabel: en?.identifierLabel ?? p.identifierLabel,
    deliveryMethod: en?.deliveryMethod ?? p.deliveryMethod,
    plans: localizedPlans(p.plans),
    crewPlans: localizedPlans(p.crewPlans),
    vbucksPlans: localizedPlans(p.vbucksPlans),
    features: localizedFeatures(p.features),
    delivery: p.slug === "fortnite" && p.delivery ? FORTNITE_DELIVERY_EN : p.delivery,
  };
}

export function localizedPlanLabel(planId: string, fallback: string, lang: Lang): string {
  if (lang !== "en") return fallback;
  return PLAN_LABELS_EN[planId] || fallback;
}

export function localizedPlanTag(tag: string | null | undefined, lang: Lang): string | null | undefined {
  if (!tag || lang !== "en") return tag;
  return PLAN_TAGS_EN[tag] || tag;
}

export function localizedCategoryLink(c: CategoryLink, lang: Lang): CategoryLink {
  if (lang !== "en") return c;
  const en = CATEGORY_LINKS_EN[c.slug];
  return en ? { ...c, name: en.name, desc: en.desc } : c;
}

export function localizedCategoryMeta(slug: string, meta: { name: string; icon: string; tagline: string }, lang: Lang) {
  if (lang !== "en") return meta;
  const en = CATEGORY_META_EN[slug];
  return en ? { ...meta, name: en.name, tagline: en.tagline } : meta;
}

export function localizedSubcategory(s: Subcategory, lang: Lang): Subcategory {
  if (lang !== "en") return s;
  const key = s.slug === "xbox" && !s.product ? "xbox" : s.slug;
  const en = SUBCATEGORY_NAMES_EN[key];
  return en ? { ...s, name: en } : s;
}

export function localizedRegion(r: Region, lang: Lang): Region {
  if (lang !== "en") return r;
  const en = REGION_NAMES_EN[r.code];
  return en ? { ...r, name: en } : r;
}

export function localizedGiftCard(g: GiftCard, lang: Lang): GiftCard {
  if (lang !== "en") return g;
  return { ...g, regions: g.regions.map((r) => localizedRegion(r, lang)) };
}

/* Localize a resolved cart item name that may already contain plan label / region */
export function localizeResolvedName(name: string, lang: Lang): string {
  if (lang !== "en") return name;
  let out = name;
  // Replace Arabic product names with English equivalents when they appear
  const productNameMap: Record<string, string> = {
    "سناب بلس": "Snapchat+",
    "تفعيل ويندوز": "Windows Activation",
    "فورت نايت": "Fortnite",
  };
  for (const [ar, en] of Object.entries(productNameMap)) out = out.split(ar).join(en);
  // Plan labels
  for (const [ar, en] of Object.entries({
    "3 أشهر": "3 months",
    "6 أشهر": "6 months",
    "12 شهر": "12 months",
    "شهر واحد": "1 month",
    "4 أشهر": "4 months",
    "18 شهر": "18 months",
    "حساب من عندنا — 12 شهر": "Account from us — 12 months",
    "مفتاح شخصي + 1TB OneDrive — 12 شهر": "Personal key + 1TB OneDrive — 12 months",
    "باقة عائلية 5 مستخدمين — 12 شهر": "Family plan (5 users) — 12 months",
    "12 شهر — كل البرامج": "12 months — All Apps",
    "Fortnite Crew — شهر": "Fortnite Crew — 1 month",
    "Fortnite Crew — 3 أشهر": "Fortnite Crew — 3 months",
    "800 وحدة V-Bucks": "800 V-Bucks",
    "2400 وحدة V-Bucks": "2400 V-Bucks",
    "4500 وحدة V-Bucks": "4500 V-Bucks",
    "12500 وحدة V-Bucks": "12500 V-Bucks",
    "أمريكا (USA)": "United States (USA)",
    "الإمارات (UAE)": "UAE",
    "السعودية (KSA)": "Saudi Arabia",
    "تركيا (Turkey)": "Turkey",
  })) out = out.split(ar).join(en);
  return out;
}
