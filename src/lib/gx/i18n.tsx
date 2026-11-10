import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { UI_TRANSLATIONS } from "./translations";
import { getUnifiedCountryCode, fetchUserCountryOnce } from "./country-phone";
import { getHeadLang } from "./head-lang";

export { getHeadLang };

export type Lang = "ar" | "en";
type Dir = "rtl" | "ltr";

const STORAGE_KEY = "gx_lang";

const ARAB_COUNTRIES = new Set([
  "JO", "PS", "SA", "AE", "KW", "QA", "OM", "BH", "IQ", "EG", "MA", "DZ", "TN", "LB", "SY", "YE", "LY", "SD", "MR", "SO", "DJ", "KM",
]);

type Ctx = {
  lang: Lang;
  dir: Dir;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  pick: <T>(ar: T, en: T) => T;
};

// Keep a single context instance across HMR module replacements, otherwise a
// hot update recreates the context while the mounted provider still holds the
// old one → "useLang must be used inside LanguageProvider".
const g = globalThis as unknown as { __gxLangContext?: React.Context<Ctx | null> };
const LangContext = g.__gxLangContext ?? createContext<Ctx | null>(null);
g.__gxLangContext = LangContext;


const GEO_KEY = "gx_lang_geo_cc";

function readSaved(): Lang | null {
  if (typeof window === "undefined") return null;
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s === "ar" || s === "en") return s;
  } catch { /* noop */ }
  return null;
}

function langFromCountry(cc: string): Lang {
  return ARAB_COUNTRIES.has(cc.toUpperCase()) ? "ar" : "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "ar";
    try {
      const saved = readSaved();
      if (saved) return saved;
      const instantCc = getUnifiedCountryCode();
      if (instantCc) {
        return langFromCountry(instantCc);
      }
      const navLang = (navigator.language || (navigator as any).userLanguage || "").toLowerCase();
      const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone || "" : "";
      const isArabTz = /amman|riyadh|cairo|dubai|abu_dhabi|baghdad|kuwait|qatar|bahrain|muscat|beirut|damascus|jerusalem|gaza|hebron|khartoum|tripoli|algiers|tunis|casablanca|sanaa|aden|nouakchott|mogadishu|djibouti/i.test(tz);

      if (!navLang.startsWith("ar") && !isArabTz) {
        return "en";
      }
    } catch {
      /* noop */
    }
    return "ar";
  });

  // Saved choice wins; otherwise detect by visitor location and browser locale
  useEffect(() => {
    const saved = readSaved();
    if (saved) { setLangState(saved); return; }
    if (typeof window === "undefined") return;

    // Fast check: cached or unified detected country code (0ms)
    const instantCc = getUnifiedCountryCode();
    if (instantCc) {
      const detected = langFromCountry(instantCc);
      setLangState(detected);
    } else {
      // Check if browser language is non-Arabic and timezone is non-Arab
      const navLang = (navigator.language || (navigator as any).userLanguage || "").toLowerCase();
      const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone || "" : "";
      const isArabTz = /amman|riyadh|cairo|dubai|abu_dhabi|baghdad|kuwait|qatar|bahrain|muscat|beirut|damascus|jerusalem|gaza|hebron|khartoum|tripoli|algiers|tunis|casablanca|sanaa|aden|nouakchott|mogadishu|djibouti/i.test(tz);

      if (!navLang.startsWith("ar") && !isArabTz) {
        setLangState("en");
      } else {
        setLangState("ar");
      }
    }

    // In background, hook into single deduplicated country fetch
    void fetchUserCountryOnce().then((cc) => {
      if (cc && !localStorage.getItem("gx_lang_manual") && !readSaved()) {
        const detected = langFromCountry(cc);
        try {
          localStorage.setItem(GEO_KEY, cc.toUpperCase());
          localStorage.setItem(STORAGE_KEY, detected);
        } catch { /* noop */ }
        setLangState(detected);
      }
    });
  }, []);


  // Common title mappings between Arabic and English for browser tab
  const TITLE_MAP_AR_TO_EN: Record<string, string> = {
    "GX Store | اشتري ألعاب، بطاقات هدايا وشحن بأوفر الأسعار": "GX Store | Buy Games, Giftcard & Top ups cheaper",
    "GX Store | متجر ألعاب واشتراكات رقمية": "GX Store | Buy Games, Giftcard & Top ups cheaper",
    "متجر ألعاب واشتراكات رقمية | GX Store": "GX Store | Buy Games, Giftcard & Top ups cheaper",
    "متجر ألعاب واشتراكات رقمية": "Buy Games, Giftcard & Top ups cheaper",
    "GX Store | Digital Games & Subscriptions": "GX Store | Buy Games, Giftcard & Top ups cheaper",
    "استلام وتفعيل الطلب | متجر GX Store": "Order Delivery & Activation | GX Store",
    "GX Store | استلام وتفعيل الطلب": "GX Store | Order Delivery & Activation",
    "استلام وتفعيل الطلب": "Order Delivery & Activation",
    "بطاقات بلايستيشن": "PlayStation Gift Cards",
    "السلة": "Shopping Cart",
    "السلة | متجر GX Store": "Shopping Cart | GX Store",
    "كافة المنتجات والاشتراكات": "All Products & Subscriptions",
    "جميع المنتجات والاشتراكات": "All Products & Subscriptions",
    "جميع المنتجات والاشتراكات | متجر GX Store": "All Products & Subscriptions | GX Store",
    "الاشتراكات الرقمية": "Digital Subscriptions",
    "ألعاب وستيم": "Games & Steam",
    "بطاقات هدايا وشحن": "Gift Cards & Top-ups",
    "البرامج والتطبيقات": "Apps & Software",
    "خدمات السوشال ميديا": "Social Media Services",
    "شحن فورت نايت": "Fortnite Top-up",
    "المفضلة": "Favorites",
    "المفضلة — GX Store": "Favorites | GX Store",
    "حسابي": "My Account",
    "حسابي | متجر GX Store": "My Account | GX Store",
    "لوحة الإدارة": "Admin Dashboard",
    "لوحة الإدارة | متجر GX Store": "Admin Dashboard | GX Store",
    "تسجيل الدخول": "Sign In",
    "تسجيل الدخول / حساب جديد": "Sign In / Register",
    "تسجيل الدخول / حساب جديد | متجر GX Store": "Sign In / Register | GX Store",
    "استعادة كلمة المرور": "Reset Password",
    "استعادة كلمة المرور | متجر GX Store": "Reset Password | GX Store",
    "الأسئلة الشائعة": "FAQ",
    "الأسئلة الشائعة | متجر GX Store": "FAQ | GX Store",
    "FAQ — GX Store": "FAQ | GX Store",
    "سياسة الخصوصية": "Privacy Policy",
    "سياسة الخصوصية | متجر GX Store": "Privacy Policy | GX Store",
    "سياسة الخصوصية — متجر GX Store": "Privacy Policy | GX Store",
    "الشروط والأحكام": "Terms & Conditions",
    "الشروط والأحكام | متجر GX Store": "Terms & Conditions | GX Store",
    "الضمان والاسترجاع": "Warranty & Refunds",
    "الضمان والاسترجاع — متجر GX Store": "Warranty & Refunds | GX Store",
    "الدعم الفني": "Customer Support",
    "الدعم الفني | متجر GX Store": "Customer Support | GX Store",
    "الدعم": "Customer Support",
    "الأقسام": "Categories",
    "الأقسام | متجر GX Store": "Categories | GX Store",
    "منتج": "Product",
    "GX Rewards — الملف الشخصي ونظام الولاء": "GX Rewards — Loyalty & Profile | GX Store",
    "الملف الشخصي ونظام الولاء": "Loyalty & Profile",
    "ملفات اللاعبين والمتصدرين": "Leaderboard & Player Profiles",
    "ملفات اللاعبين والمتصدرين — GX Store": "Leaderboard & Player Profiles | GX Store",
    "لوحة المتصدرين": "Leaderboard",
    "مركز ألعاب وتحديات GX": "GX Games & Challenges",
    "اشتراك سناب بلس": "Snapchat+ Subscription",
  };

  const TITLE_MAP_EN_TO_AR: Record<string, string> = {
    "GX Store | Buy Games, Giftcard & Top ups cheaper": "GX Store | اشتري ألعاب، بطاقات هدايا وشحن بأوفر الأسعار",
    "Buy Games, Giftcard & Top ups cheaper | GX Store": "GX Store | اشتري ألعاب، بطاقات هدايا وشحن بأوفر الأسعار",
    "Buy Games, Giftcard & Top ups cheaper": "اشتري ألعاب، بطاقات هدايا وشحن بأوفر الأسعار",
    "GX Store | Digital Games & Subscriptions": "GX Store | اشتري ألعاب، بطاقات هدايا وشحن بأوفر الأسعار",
    "Digital Games & Subscriptions | GX Store": "GX Store | اشتري ألعاب، بطاقات هدايا وشحن بأوفر الأسعار",
    "Order Delivery & Activation | GX Store": "استلام وتفعيل الطلب | متجر GX Store",
    "GX Store | Order Delivery & Activation": "GX Store | استلام وتفعيل الطلب",
    "Order Delivery & Activation": "استلام وتفعيل الطلب",
    "PlayStation Gift Cards": "بطاقات بلايستيشن",
    "Shopping Cart": "السلة",
    "Shopping Cart | GX Store": "السلة | متجر GX Store",
    "All Products & Subscriptions": "جميع المنتجات والاشتراكات",
    "All Products & Subscriptions | GX Store": "جميع المنتجات والاشتراكات | متجر GX Store",
    "Digital Subscriptions": "الاشتراكات الرقمية",
    "Games & Steam": "ألعاب وستيم",
    "Gift Cards & Top-ups": "بطاقات هدايا وشحن",
    "Apps & Software": "البرامج والتطبيقات",
    "Social Media Services": "خدمات السوشال ميديا",
    "Fortnite Top-up": "شحن فورت نايت",
    "Favorites": "المفضلة",
    "Favorites | GX Store": "المفضلة | متجر GX Store",
    "My Account": "حسابي",
    "My Account | GX Store": "حسابي | متجر GX Store",
    "Admin Dashboard": "لوحة الإدارة",
    "Admin Dashboard | GX Store": "لوحة الإدارة | متجر GX Store",
    "Sign In": "تسجيل الدخول",
    "Sign In / Register": "تسجيل الدخول / حساب جديد",
    "Sign In / Register | GX Store": "تسجيل الدخول / حساب جديد | متجر GX Store",
    "Reset Password": "استعادة كلمة المرور",
    "Reset Password | GX Store": "استعادة كلمة المرور | متجر GX Store",
    "FAQ": "الأسئلة الشائعة",
    "FAQ | GX Store": "الأسئلة الشائعة | متجر GX Store",
    "Privacy Policy": "سياسة الخصوصية",
    "Privacy Policy | GX Store": "سياسة الخصوصية | متجر GX Store",
    "Terms & Conditions": "الشروط والأحكام",
    "Terms & Conditions | GX Store": "الشروط والأحكام | متجر GX Store",
    "Warranty & Refunds": "الضمان والاسترجاع",
    "Warranty & Refunds | GX Store": "الضمان والاسترجاع | متجر GX Store",
    "Customer Support": "الدعم الفني",
    "Customer Support | GX Store": "الدعم الفني | متجر GX Store",
    "Support": "الدعم الفني",
    "Categories": "الأقسام",
    "Categories | GX Store": "الأقسام | متجر GX Store",
    "Product": "منتج",
    "GX Rewards — Loyalty & Profile | GX Store": "GX Rewards — الملف الشخصي ونظام الولاء",
    "Loyalty & Profile": "الملف الشخصي ونظام الولاء",
    "Leaderboard & Player Profiles": "ملفات اللاعبين والمتصدرين",
    "Leaderboard & Player Profiles | GX Store": "ملفات اللاعبين والمتصدرين — GX Store",
    "Leaderboard": "لوحة المتصدرين",
    "GX Games & Challenges": "مركز ألعاب وتحديات GX",
    "Snapchat+ Subscription": "اشتراك سناب بلس",
  };

  // Synchronize document.title dynamically with selected language
  useEffect(() => {
    if (typeof document === "undefined") return;

    const syncTitle = () => {
      const cur = document.title ? document.title.trim() : "";
      if (!cur) {
        document.title =
          lang === "en"
            ? "GX Store | Buy Games, Giftcard & Top ups cheaper"
            : "GX Store | اشتري ألعاب، بطاقات هدايا وشحن بأوفر الأسعار";
        return;
      }

      if (lang === "en") {
        if (TITLE_MAP_AR_TO_EN[cur]) {
          document.title = TITLE_MAP_AR_TO_EN[cur];
          return;
        }

        // Strip prefix (GX Store | / GX Store —) or suffix (| متجر GX Store / | GX Store / — GX Store)
        let base = cur;
        let hadBrandWrapper = false;

        if (/^GX Store\s*[\|\-—–]\s*/i.test(cur)) {
          base = cur.replace(/^GX Store\s*[\|\-—–]\s*/i, "").trim();
          hadBrandWrapper = true;
        } else if (/\s*[\|\-—–]\s*(متجر\s*)?GX\s*Store$/i.test(cur)) {
          base = cur.replace(/\s*[\|\-—–]\s*(متجر\s*)?GX\s*Store$/i, "").trim();
          hadBrandWrapper = true;
        }

        if (TITLE_MAP_AR_TO_EN[base]) {
          const trans = TITLE_MAP_AR_TO_EN[base];
          document.title = hadBrandWrapper ? `${trans} | GX Store` : trans;
          return;
        }

        // Order number pattern: "طلب #12345" -> "Order #12345 | GX Store"
        const orderMatch = base.match(/^طلب\s*#?([A-Za-z0-9\-]+)/);
        if (orderMatch) {
          document.title = `Order #${orderMatch[1]} | GX Store`;
          return;
        }

        if (base.includes("اشتري ألعاب") || base.includes("متجر ألعاب واشتراكات") || cur === "GX Store") {
          document.title = "GX Store | Buy Games, Giftcard & Top ups cheaper";
          return;
        }

        // If title had Arabic suffix "| متجر GX Store", convert suffix to English "| GX Store"
        if (cur.includes("متجر GX Store")) {
          document.title = cur.replace(/متجر\s*GX\s*Store/g, "GX Store");
          return;
        }
      } else {
        if (TITLE_MAP_EN_TO_AR[cur]) {
          document.title = TITLE_MAP_EN_TO_AR[cur];
          return;
        }

        let base = cur;
        let hadBrandWrapper = false;

        if (/^GX Store\s*[\|\-—–]\s*/i.test(cur)) {
          base = cur.replace(/^GX Store\s*[\|\-—–]\s*/i, "").trim();
          hadBrandWrapper = true;
        } else if (/\s*[\|\-—–]\s*GX\s*Store$/i.test(cur)) {
          base = cur.replace(/\s*[\|\-—–]\s*GX\s*Store$/i, "").trim();
          hadBrandWrapper = true;
        }

        if (TITLE_MAP_EN_TO_AR[base]) {
          const trans = TITLE_MAP_EN_TO_AR[base];
          document.title = hadBrandWrapper ? `${trans} | متجر GX Store` : trans;
          return;
        }

        const orderMatchEn = base.match(/^Order\s*#?([A-Za-z0-9\-]+)/i);
        if (orderMatchEn) {
          document.title = `طلب #${orderMatchEn[1]} | متجر GX Store`;
          return;
        }

        if (base.includes("Buy Games") || base.includes("Digital Games & Subscriptions") || cur === "GX Store") {
          document.title = "GX Store | اشتري ألعاب، بطاقات هدايا وشحن بأوفر الأسعار";
          return;
        }
      }
    };

    syncTitle();

    // Observe title tag in case router replaces it
    const titleEl = document.querySelector("title");
    if (!titleEl) return;
    const observer = new MutationObserver(() => syncTitle());
    observer.observe(titleEl, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [lang]);

  // Reflect on <html> and lift the pre-hydration gate
  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    html.setAttribute("lang", lang);
    html.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    html.removeAttribute("data-lang-pending");
    const gate = document.getElementById("gx-lang-gate");
    if (gate) gate.remove();
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
      localStorage.setItem("gx_lang_manual", "1");
    } catch { /* noop */ }
  }, []);

  const t = useCallback((key: string) => {
    const dict = UI_TRANSLATIONS[lang] || UI_TRANSLATIONS.ar;
    return dict[key] ?? UI_TRANSLATIONS.ar[key] ?? key;
  }, [lang]);

  const pick = useCallback(<T,>(ar: T, en: T): T => (lang === "en" ? en : ar), [lang]);

  const dir: Dir = lang === "ar" ? "rtl" : "ltr";
  const value = useMemo(() => ({ lang, dir, setLang, t, pick }), [lang, dir, setLang, t, pick]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

const DEFAULT_LANG_CTX: Ctx = {
  lang: "ar",
  dir: "rtl",
  setLang: () => {},
  t: (key: string) => UI_TRANSLATIONS.ar[key] || key,
  pick: <T,>(ar: T, _en: T): T => ar,
};

export function useLang(): Ctx {
  const ctx = useContext(LangContext);
  if (!ctx) return DEFAULT_LANG_CTX;
  return ctx;
}
