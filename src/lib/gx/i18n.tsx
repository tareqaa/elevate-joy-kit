import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { UI_TRANSLATIONS } from "./translations";

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

const LangContext = createContext<Ctx | null>(null);

function detectFromBrowser(): Lang | null {
  if (typeof navigator === "undefined") return null;
  const langs = (navigator.languages || [navigator.language || ""]).map((l) => l.toLowerCase());
  if (langs.some((l) => l.startsWith("ar"))) return "ar";
  if (langs.some((l) => l.startsWith("en"))) return "en";
  return null;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");

  // Load from storage or detect
  useEffect(() => {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved === "ar" || saved === "en") {
      setLangState(saved);
      return;
    }
    // Try browser first
    const browserLang = detectFromBrowser();
    if (browserLang) setLangState(browserLang);
    // Then override via IP geolocation on first-ever visit
    (async () => {
      try {
        const res = await fetch("https://ipwho.is/");
        const data = await res.json();
        if (data?.success && data.country_code) {
          const detected: Lang = ARAB_COUNTRIES.has(String(data.country_code).toUpperCase()) ? "ar" : "en";
          setLangState(detected);
        }
      } catch { /* silent */ }
    })();
  }, []);

  // Reflect on <html>
  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    html.setAttribute("lang", lang);
    html.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* noop */ }
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

export function useLang(): Ctx {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside LanguageProvider");
  return ctx;
}
