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
  // Must match SSR on first render to avoid hydration mismatch.
  const [lang, setLangState] = useState<Lang>("ar");

  // Saved choice wins; otherwise detect by visitor location (NOT device language)
  useEffect(() => {
    const html = typeof document !== "undefined" ? document.documentElement : null;
    const clearLangGate = () => {
      if (html) {
        html.removeAttribute("data-lang-pending");
        document.getElementById("gx-lang-gate")?.remove();
      }
    };

    const saved = readSaved();
    if (saved) {
      clearLangGate();
      setLangState(saved);
      return;
    }
    if (typeof window === "undefined") {
      clearLangGate();
      return;
    }

    // Cached country from a previous visit
    try {
      const cc = localStorage.getItem(GEO_KEY);
      if (cc) {
        clearLangGate();
        const detected = langFromCountry(cc);
        setLangState(detected);
        localStorage.setItem(STORAGE_KEY, detected);
        return;
      }
    } catch { /* noop */ }

    // Hide content briefly to avoid an AR -> EN flash on first visit
    const html = document.documentElement;
    html.setAttribute("data-lang-pending", "1");
    if (!document.getElementById("gx-lang-gate")) {
      const st = document.createElement("style");
      st.id = "gx-lang-gate";
      st.textContent = "html[data-lang-pending] body{visibility:hidden!important}";
      document.head.appendChild(st);
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1500);
    (async () => {
      try {
        const res = await fetch("https://ipwho.is/", { signal: ctrl.signal });
        const data = await res.json();
        const cc = data?.success ? String(data.country_code || "") : "";
        if (cc) {
          const detected = langFromCountry(cc);
          try {
            localStorage.setItem(GEO_KEY, cc.toUpperCase());
            localStorage.setItem(STORAGE_KEY, detected);
          } catch { /* noop */ }
          setLangState(detected);
        }
      } catch { /* silent — keep Arabic default */ }
      finally {
        clearTimeout(timer);
        html.removeAttribute("data-lang-pending");
        document.getElementById("gx-lang-gate")?.remove();
      }
    })();
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, []);


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
