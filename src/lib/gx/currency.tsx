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
  /** 1000 GX Coins = 1 JOD, formatted in the active currency. */
  formatCoins: (coins: number) => string;
  /** Live market rate for 1 JOD in the active currency. */
  rate: number;
};

const CurrencyContext = createContext<Ctx | null>(null);

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
  const [currency, setCurrencyState] = useState<string>("JOD");
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
    // Auto-detect via IP
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1500);
    (async () => {
      try {
        const res = await fetch("https://ipwho.is/", { signal: ctrl.signal });
        const data = await res.json();
        if (data?.success && data.country_code) {
          const cur = COUNTRY_TO_CURRENCY[data.country_code];
          if (cur && CURRENCIES[cur]) setCurrencyState(cur);
        }
      } catch { /* silent */ }
      finally { clearTimeout(timer); }
    })();
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, []);

  const setCurrency = useCallback((code: string) => {
    if (!CURRENCIES[code]) return;
    setCurrencyState(code);
    localStorage.setItem(STORAGE_KEY, code);
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
  if (!ctx) throw new Error("useCurrency must be used inside CurrencyProvider");
  return ctx;
}
