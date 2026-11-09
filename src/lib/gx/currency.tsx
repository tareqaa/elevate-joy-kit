import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getUnifiedCountryCode, fetchUserCountryOnce } from "./country-phone";

type CurrencyInfo = {
  label: string;
  labelAr: string;
  labelEn: string;
  flag: string;
  rate: number;
  decimals: number;
};

export const CURRENCIES: Record<string, CurrencyInfo> = {
  JOD: { label: "دينار أردني", labelAr: "دينار أردني", labelEn: "Jordanian Dinar", flag: "🇯🇴", rate: 1, decimals: 2 },
  USD: { label: "دولار أمريكي", labelAr: "دولار أمريكي", labelEn: "US Dollar", flag: "🇺🇸", rate: 1.41, decimals: 2 },
  EUR: { label: "يورو", labelAr: "يورو", labelEn: "Euro", flag: "🇪🇺", rate: 1.30, decimals: 2 },
  SAR: { label: "ريال سعودي", labelAr: "ريال سعودي", labelEn: "Saudi Riyal", flag: "🇸🇦", rate: 5.30, decimals: 2 },
  AED: { label: "درهم إماراتي", labelAr: "درهم إماراتي", labelEn: "UAE Dirham", flag: "🇦🇪", rate: 5.18, decimals: 2 },
  KWD: { label: "دينار كويتي", labelAr: "دينار كويتي", labelEn: "Kuwaiti Dinar", flag: "🇰🇼", rate: 0.435, decimals: 3 },
  QAR: { label: "ريال قطري", labelAr: "ريال قطري", labelEn: "Qatari Riyal", flag: "🇶🇦", rate: 5.14, decimals: 2 },
  OMR: { label: "ريال عماني", labelAr: "ريال عماني", labelEn: "Omani Rial", flag: "🇴🇲", rate: 0.543, decimals: 3 },
  BHD: { label: "دينار بحريني", labelAr: "دينار بحريني", labelEn: "Bahraini Dinar", flag: "🇧🇭", rate: 0.531, decimals: 3 },
  IQD: { label: "دينار عراقي", labelAr: "دينار عراقي", labelEn: "Iraqi Dinar", flag: "🇮🇶", rate: 1850, decimals: 0 },
  EGP: { label: "جنيه مصري", labelAr: "جنيه مصري", labelEn: "Egyptian Pound", flag: "🇪🇬", rate: 69, decimals: 0 },
  MAD: { label: "درهم مغربي", labelAr: "درهم مغربي", labelEn: "Moroccan Dirham", flag: "🇲🇦", rate: 14, decimals: 2 },
  DZD: { label: "دينار جزائري", labelAr: "دينار جزائري", labelEn: "Algerian Dinar", flag: "🇩🇿", rate: 190, decimals: 0 },
  TND: { label: "دينار تونسي", labelAr: "دينار تونسي", labelEn: "Tunisian Dinar", flag: "🇹🇳", rate: 4.4, decimals: 2 },
};

const STORAGE_KEY = "gx_currency";
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  JO: "JOD", PS: "JOD", SA: "SAR", AE: "AED", KW: "KWD", QA: "QAR", OM: "OMR", BH: "BHD",
  IQ: "IQD", EG: "EGP", MA: "MAD", DZ: "DZD", TN: "TND",
  US: "USD", CA: "USD", GB: "USD",
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR", BE: "EUR", AT: "EUR", GR: "EUR", PT: "EUR", IE: "EUR", FI: "EUR",
};

/**
 * Resolves the default currency for a country.
 * - Jordan and Palestine -> JOD
 * - Supported regional countries -> mapped local currency (SAR, AED, KWD, etc.)
 * - Supported Eurozone countries -> EUR
 * - ANY OTHER country whose currency is not supported in the store (e.g. Turkey, international) -> USD
 */
export function resolveDefaultCurrencyForCountry(countryCode?: string | null): string {
  if (!countryCode) return "USD";
  const cc = countryCode.trim().toUpperCase();
  if (cc === "JO" || cc === "PS") return "JOD";
  const mapped = COUNTRY_TO_CURRENCY[cc];
  if (mapped && CURRENCIES[mapped]) return mapped;
  return "USD";
}

type Ctx = {
  currency: string;
  setCurrency: (c: string) => void;
  format: (jod: number) => string;
  /** 1000 GX Coins = 1 JOD, formatted in the active currency. */
  formatCoins: (coins: number) => string;
  /** Live market rate for 1 JOD in the active currency. */
  rate: number;
};

// Keep a single context instance across HMR module replacements, otherwise a
// hot update recreates the context while the mounted provider still holds the
// old one → "useCurrency must be used inside CurrencyProvider".
const g = globalThis as unknown as { __gxCurrencyContext?: React.Context<Ctx | null> };
const CurrencyContext = g.__gxCurrencyContext ?? createContext<Ctx | null>(null);
g.__gxCurrencyContext = CurrencyContext;

const DEFAULT_CURRENCY_CTX: Ctx = {
  currency: "USD",
  setCurrency: () => {},
  format: (jod: number) => {
    const val = (Number(jod) || 0) * 1.41;
    return `${val.toFixed(2)} USD`;
  },
  formatCoins: (coins: number) => {
    const val = ((Number(coins) || 0) / 1000) * 1.41;
    return `${val.toFixed(2)} USD`;
  },
  rate: 1.41,
};

const RATES_CACHE_KEY = "gx_fx_rates_v1";
const RATES_TTL_MS = 6 * 60 * 60 * 1000; // refresh live market rates every 6h

function readCachedRates(): { at: number; rates: Record<string, number> } | null {
  try {
    const raw = localStorage.getItem(RATES_CACHE_KEY);
    const v = raw ? JSON.parse(raw) : null;
    return v && typeof v === "object" && v.rates ? v : null;
  } catch { return null; }
}

/** Live market rates (base JOD), via our own server proxy — never the third
 *  party directly from the browser. Falls back silently to the built-in table. */
async function fetchLiveRates(): Promise<Record<string, number> | null> {
  try {
    const { getFxRatesServer } = await import("./currency.server");
    const rates = await getFxRatesServer();
    if (!rates) return null;
    const out: Record<string, number> = {};
    for (const code of Object.keys(CURRENCIES)) {
      const r = Number(rates[code]);
      if (Number.isFinite(r) && r > 0) out[code] = r;
    }
    out.JOD = 1;
    return Object.keys(out).length > 1 ? out : null;
  } catch { return null; }
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<string>(() => {
    if (typeof window === "undefined") return "JOD";
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && CURRENCIES[saved]) return saved;
      const cc = getUnifiedCountryCode();
      return resolveDefaultCurrencyForCountry(cc);
    } catch {
      return "JOD";
    }
  });
  const [rates, setRates] = useState<Record<string, number>>({});

  useEffect(() => {
    const cached = readCachedRates();
    if (cached?.rates) setRates(cached.rates);
    if (cached && Date.now() - cached.at < RATES_TTL_MS) return;
    let alive = true;
    (async () => {
      const live = await fetchLiveRates();
      if (!live || !alive) return;
      setRates(live);
      try { localStorage.setItem(RATES_CACHE_KEY, JSON.stringify({ at: Date.now(), rates: live })); } catch { /* noop */ }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && CURRENCIES[saved]) {
      setCurrencyState(saved);
      return;
    }
    // Auto-detect currency via unified country detection (instant 0ms)
    const cc = getUnifiedCountryCode();
    setCurrencyState(resolveDefaultCurrencyForCountry(cc));

    // Connect to shared singleton country fetch (0 duplicate network requests)
    void fetchUserCountryOnce().then((liveCc) => {
      if (liveCc && !localStorage.getItem("gx_currency_manual") && !localStorage.getItem(STORAGE_KEY)) {
        setCurrencyState(resolveDefaultCurrencyForCountry(liveCc));
      }
    });
  }, []);

  const setCurrency = useCallback((code: string) => {
    if (!CURRENCIES[code]) return;
    setCurrencyState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
      localStorage.setItem("gx_currency_manual", "1");
    } catch { /* noop */ }
  }, []);

  const rate = useMemo(() => {
    const live = rates[currency];
    if (Number.isFinite(live) && live > 0) return live;
    return (CURRENCIES[currency] || CURRENCIES.JOD).rate;
  }, [rates, currency]);

  const format = useCallback(
    (jod: number) => {
      const c = CURRENCIES[currency] || CURRENCIES.JOD;
      const val = jod * rate;
      const formatted = val.toLocaleString("en-US", {
        minimumFractionDigits: c.decimals,
        maximumFractionDigits: c.decimals,
      });
      return `${formatted} ${currency}`;
    },
    [currency, rate]
  );

  /** GX Coins are stored as coins; 1000 coins = 1 JOD, shown in the active currency. */
  const formatCoins = useCallback((coins: number) => format((Number(coins) || 0) / 1000), [format]);

  const value = useMemo(
    () => ({ currency, setCurrency, format, formatCoins, rate }),
    [currency, setCurrency, format, formatCoins, rate]
  );
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): Ctx {
  const ctx = useContext(CurrencyContext);
  if (!ctx) return DEFAULT_CURRENCY_CTX;
  return ctx;
}
