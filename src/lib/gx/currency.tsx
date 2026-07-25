import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type CurrencyInfo = { label: string; flag: string; rate: number; decimals: number };

export const CURRENCIES: Record<string, CurrencyInfo> = {
  JOD: { label: "دينار أردني", flag: "🇯🇴", rate: 1, decimals: 2 },
  USD: { label: "دولار أمريكي", flag: "🇺🇸", rate: 1.41, decimals: 2 },
  EUR: { label: "يورو", flag: "🇪🇺", rate: 1.30, decimals: 2 },
  SAR: { label: "ريال سعودي", flag: "🇸🇦", rate: 5.30, decimals: 2 },
  AED: { label: "درهم إماراتي", flag: "🇦🇪", rate: 5.18, decimals: 2 },
  KWD: { label: "دينار كويتي", flag: "🇰🇼", rate: 0.435, decimals: 3 },
  QAR: { label: "ريال قطري", flag: "🇶🇦", rate: 5.14, decimals: 2 },
  OMR: { label: "ريال عماني", flag: "🇴🇲", rate: 0.543, decimals: 3 },
  BHD: { label: "دينار بحريني", flag: "🇧🇭", rate: 0.531, decimals: 3 },
  IQD: { label: "دينار عراقي", flag: "🇮🇶", rate: 1850, decimals: 0 },
  EGP: { label: "جنيه مصري", flag: "🇪🇬", rate: 69, decimals: 0 },
  MAD: { label: "درهم مغربي", flag: "🇲🇦", rate: 14, decimals: 2 },
  DZD: { label: "دينار جزائري", flag: "🇩🇿", rate: 190, decimals: 0 },
  TND: { label: "دينار تونسي", flag: "🇹🇳", rate: 4.4, decimals: 2 },
};

const STORAGE_KEY = "gx_currency";
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  JO: "JOD", PS: "JOD", SA: "SAR", AE: "AED", KW: "KWD", QA: "QAR", OM: "OMR", BH: "BHD",
  IQ: "IQD", EG: "EGP", MA: "MAD", DZ: "DZD", TN: "TND",
  US: "USD", CA: "USD", GB: "USD",
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR", BE: "EUR", AT: "EUR", GR: "EUR", PT: "EUR", IE: "EUR", FI: "EUR",
};

type Ctx = {
  currency: string;
  setCurrency: (c: string) => void;
  format: (jod: number) => string;
};

const CurrencyContext = createContext<Ctx | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<string>("JOD");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && CURRENCIES[saved]) {
      setCurrencyState(saved);
      return;
    }
    // Auto-detect via IP
    (async () => {
      try {
        const res = await fetch("https://ipwho.is/");
        const data = await res.json();
        if (data?.success && data.country_code) {
          const cur = COUNTRY_TO_CURRENCY[data.country_code];
          if (cur && CURRENCIES[cur]) setCurrencyState(cur);
        }
      } catch { /* silent */ }
    })();
  }, []);

  const setCurrency = useCallback((code: string) => {
    if (!CURRENCIES[code]) return;
    setCurrencyState(code);
    localStorage.setItem(STORAGE_KEY, code);
  }, []);

  const format = useCallback(
    (jod: number) => {
      const c = CURRENCIES[currency] || CURRENCIES.JOD;
      const val = jod * c.rate;
      const formatted = val.toLocaleString("en-US", {
        minimumFractionDigits: c.decimals,
        maximumFractionDigits: c.decimals,
      });
      return `${formatted} ${currency}`;
    },
    [currency]
  );

  const value = useMemo(() => ({ currency, setCurrency, format }), [currency, setCurrency, format]);
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): Ctx {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used inside CurrencyProvider");
  return ctx;
}
