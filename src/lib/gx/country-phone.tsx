import React, { useState, useEffect, useRef, useMemo } from "react";

export type CountryInfo = {
  code: string;
  nameAr: string;
  nameEn: string;
  dialCode: string;
  flag: string;
  localPrefix: string;
  placeholder: string;
  minLength: number;
};

export const COUNTRIES: CountryInfo[] = [
  {
    code: "JO",
    nameAr: "الأردن",
    nameEn: "Jordan",
    dialCode: "+962",
    flag: "🇯🇴",
    localPrefix: "07",
    placeholder: "07XXXXXXXX",
    minLength: 9,
  },
  {
    code: "SA",
    nameAr: "السعودية",
    nameEn: "Saudi Arabia",
    dialCode: "+966",
    flag: "🇸🇦",
    localPrefix: "05",
    placeholder: "05XXXXXXXX",
    minLength: 9,
  },
  {
    code: "AE",
    nameAr: "الإمارات",
    nameEn: "United Arab Emirates",
    dialCode: "+971",
    flag: "🇦🇪",
    localPrefix: "05",
    placeholder: "05XXXXXXXX",
    minLength: 9,
  },
  {
    code: "KW",
    nameAr: "الكويت",
    nameEn: "Kuwait",
    dialCode: "+965",
    flag: "🇰🇼",
    localPrefix: "5",
    placeholder: "5/6/9XXXXXXX",
    minLength: 8,
  },
  {
    code: "QA",
    nameAr: "قطر",
    nameEn: "Qatar",
    dialCode: "+974",
    flag: "🇶🇦",
    localPrefix: "3",
    placeholder: "3/5/6/7XXXXXXX",
    minLength: 8,
  },
  {
    code: "OM",
    nameAr: "عُمان",
    nameEn: "Oman",
    dialCode: "+968",
    flag: "🇴🇲",
    localPrefix: "9",
    placeholder: "9/7XXXXXXX",
    minLength: 8,
  },
  {
    code: "BH",
    nameAr: "البحرين",
    nameEn: "Bahrain",
    dialCode: "+973",
    flag: "🇧🇭",
    localPrefix: "3",
    placeholder: "3/6XXXXXXX",
    minLength: 8,
  },
  {
    code: "IQ",
    nameAr: "العراق",
    nameEn: "Iraq",
    dialCode: "+964",
    flag: "🇮🇶",
    localPrefix: "07",
    placeholder: "07XXXXXXXXX",
    minLength: 10,
  },
  {
    code: "EG",
    nameAr: "مصر",
    nameEn: "Egypt",
    dialCode: "+20",
    flag: "🇪🇬",
    localPrefix: "01",
    placeholder: "01XXXXXXXXX",
    minLength: 10,
  },
  {
    code: "PS",
    nameAr: "فلسطين",
    nameEn: "Palestine",
    dialCode: "+970",
    flag: "🇵🇸",
    localPrefix: "05",
    placeholder: "05XXXXXXXX",
    minLength: 9,
  },
  {
    code: "MA",
    nameAr: "المغرب",
    nameEn: "Morocco",
    dialCode: "+212",
    flag: "🇲🇦",
    localPrefix: "06",
    placeholder: "06XXXXXXXX",
    minLength: 9,
  },
  {
    code: "DZ",
    nameAr: "الجزائر",
    nameEn: "Algeria",
    dialCode: "+213",
    flag: "🇩🇿",
    localPrefix: "05",
    placeholder: "05XXXXXXXX",
    minLength: 9,
  },
  {
    code: "TN",
    nameAr: "تونس",
    nameEn: "Tunisia",
    dialCode: "+216",
    flag: "🇹🇳",
    localPrefix: "9",
    placeholder: "9XXXXXXX",
    minLength: 8,
  },
  {
    code: "TR",
    nameAr: "تركيا",
    nameEn: "Turkey",
    dialCode: "+90",
    flag: "🇹🇷",
    localPrefix: "05",
    placeholder: "05XXXXXXXXX",
    minLength: 10,
  },
  {
    code: "US",
    nameAr: "أمريكا / كندا",
    nameEn: "USA / Canada",
    dialCode: "+1",
    flag: "🇺🇸",
    localPrefix: "",
    placeholder: "(XXX) XXX-XXXX",
    minLength: 10,
  },
  {
    code: "GB",
    nameAr: "المملكة المتحدة",
    nameEn: "United Kingdom",
    dialCode: "+44",
    flag: "🇬🇧",
    localPrefix: "07",
    placeholder: "07XXXXXXXXX",
    minLength: 10,
  },
  {
    code: "OTHER",
    nameAr: "دولة أخرى",
    nameEn: "Other Country",
    dialCode: "+",
    flag: "🌐",
    localPrefix: "",
    placeholder: "XXXXXXXXXX",
    minLength: 7,
  },
];

const CURRENCY_TO_COUNTRY: Record<string, string> = {
  JOD: "JO",
  SAR: "SA",
  AED: "AE",
  KWD: "KW",
  QAR: "QA",
  OMR: "OM",
  BHD: "BH",
  IQD: "IQ",
  EGP: "EG",
  MAD: "MA",
  DZD: "DZ",
  TND: "TN",
  USD: "US",
  EUR: "JO", // Fallback to Jordan for generic EUR
};

const CACHE_COUNTRY_KEY = "gx_country_code";
const LEGACY_LANG_GEO_KEY = "gx_lang_geo_cc";
const LEGACY_PRODUCT_GEO_KEY = "gx_user_geo";
const MANUAL_USER_COUNTRY_KEY = "gx_customer_country";

let inMemoryCountryCode: string | null = null;
let inFlightCountryPromise: Promise<string | null> | null = null;

/**
 * Fast 0ms timezone heuristic to determine country without network requests.
 */
export function detectCountryFromTimezone(): string | null {
  try {
    const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone || "" : "";
    if (!tz) return null;
    if (tz.includes("Amman")) return "JO";
    if (tz.includes("Riyadh")) return "SA";
    if (tz.includes("Dubai")) return "AE";
    if (tz.includes("Kuwait")) return "KW";
    if (tz.includes("Qatar")) return "QA";
    if (tz.includes("Bahrain")) return "BH";
    if (tz.includes("Muscat")) return "OM";
    if (tz.includes("Baghdad")) return "IQ";
    if (tz.includes("Beirut")) return "LB";
    if (tz.includes("Damascus")) return "SY";
    if (tz.includes("Jerusalem") || tz.includes("Gaza") || tz.includes("Hebron")) return "PS";
    if (tz.includes("Cairo")) return "EG";
    if (tz.includes("Tripoli")) return "LY";
    if (tz.includes("Tunis")) return "TN";
    if (tz.includes("Algiers")) return "DZ";
    if (tz.includes("Casablanca")) return "MA";
    if (tz.includes("Istanbul")) return "TR";
    if (tz.includes("London")) return "GB";
    if (tz.startsWith("America/")) return "US";
  } catch {
    /* noop */
  }
  return null;
}

/**
 * Synchronously retrieves the unified country code with 0 network latency.
 * Respects manual preference > in-memory > cached IP > currency > timezone > fallback (JO).
 */
export function getUnifiedCountryCode(): string {
  if (typeof window === "undefined") return "JO";

  // 1. User manual preference wins over everything (priority 1)
  try {
    const manual = localStorage.getItem(MANUAL_USER_COUNTRY_KEY);
    if (manual) {
      const match = COUNTRIES.find((c) => c.code === manual.toUpperCase());
      if (match) return match.code;
    }
  } catch {
    /* noop */
  }

  // 2. In-memory cached country
  if (inMemoryCountryCode) return inMemoryCountryCode;

  // 3. Persistent cache from previous detection
  try {
    const saved =
      localStorage.getItem(CACHE_COUNTRY_KEY) ||
      localStorage.getItem(LEGACY_LANG_GEO_KEY);
    if (saved) {
      inMemoryCountryCode = saved.toUpperCase();
      return inMemoryCountryCode;
    }

    const sessionGeo = sessionStorage.getItem(LEGACY_PRODUCT_GEO_KEY);
    if (sessionGeo) {
      const parsed = JSON.parse(sessionGeo);
      if (parsed?.code) {
        inMemoryCountryCode = String(parsed.code).toUpperCase();
        return inMemoryCountryCode;
      }
    }
  } catch {
    /* noop */
  }

  // 4. Currency heuristic if available
  try {
    const cur = localStorage.getItem("gx_currency");
    if (cur && CURRENCY_TO_COUNTRY[cur]) {
      return CURRENCY_TO_COUNTRY[cur];
    }
  } catch {
    /* noop */
  }

  // 5. Timezone heuristic (instant 0ms)
  const tzCountry = detectCountryFromTimezone();
  if (tzCountry) {
    inMemoryCountryCode = tzCountry;
    return tzCountry;
  }

  // 6. Safe fallback (Jordan)
  return "JO";
}

/**
 * Asynchronously fetch and cache IP country ONCE across the entire application lifecycle.
 * Deduplicates in-flight calls and caches persistently, preventing repeated network requests.
 */
export async function fetchUserCountryOnce(): Promise<string> {
  if (typeof window === "undefined") return "JO";

  // If already detected and cached from IP, return immediately (0 requests)
  try {
    const cached = localStorage.getItem(CACHE_COUNTRY_KEY) || localStorage.getItem(LEGACY_LANG_GEO_KEY);
    if (cached) {
      inMemoryCountryCode = cached.toUpperCase();
      return inMemoryCountryCode;
    }
  } catch {
    /* noop */
  }

  // Deduplicate concurrent requests
  if (inFlightCountryPromise) {
    const res = await inFlightCountryPromise;
    return res || getDetectedIpCountry();
  }

  inFlightCountryPromise = (async () => {
    // 1. Client-side IP lookup via ipwho.is
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2000);
    try {
      const res = await fetch("https://ipwho.is/", { signal: ctrl.signal });
      const data = await res.json();
      if (data?.success && data?.country_code) {
        const cc = String(data.country_code).toUpperCase();
        inMemoryCountryCode = cc;
        try {
          localStorage.setItem(CACHE_COUNTRY_KEY, cc);
          localStorage.setItem(LEGACY_LANG_GEO_KEY, cc);
          const match = COUNTRIES.find((c) => c.code === cc);
          sessionStorage.setItem(
            LEGACY_PRODUCT_GEO_KEY,
            JSON.stringify({
              code: cc,
              ar: match?.nameAr || cc,
              en: match?.nameEn || cc,
            })
          );
        } catch {}
        window.dispatchEvent(new CustomEvent("gx:country-detected", { detail: cc }));
        return cc;
      }
    } catch {
      // 3. Fallback to api.country.is
      try {
        const res2 = await fetch("https://api.country.is/", { signal: ctrl.signal });
        const data2 = await res2.json();
        if (data2?.country) {
          const cc = String(data2.country).toUpperCase();
          inMemoryCountryCode = cc;
          try {
            localStorage.setItem(CACHE_COUNTRY_KEY, cc);
            localStorage.setItem(LEGACY_LANG_GEO_KEY, cc);
          } catch {}
          window.dispatchEvent(new CustomEvent("gx:country-detected", { detail: cc }));
          return cc;
        }
      } catch {}
    } finally {
      clearTimeout(timer);
      inFlightCountryPromise = null;
    }
    return null;
  })();

  const result = await inFlightCountryPromise;
  return result || getDetectedIpCountry();
}

/**
 * Synchronously returns the user's detected country code strictly from IP / timezone heuristics.
 * Independent of phone numbers or contact fields.
 */
export function getDetectedIpCountry(): string {
  if (typeof window === "undefined") return "JO";
  try {
    const cached = localStorage.getItem(CACHE_COUNTRY_KEY) || localStorage.getItem(LEGACY_LANG_GEO_KEY);
    if (cached && cached.trim()) return cached.trim().toUpperCase();
  } catch {}
  const tz = detectCountryFromTimezone();
  if (tz) return tz.toUpperCase();
  return "JO";
}

/**
 * Detect the customer's CountryInfo synchronously (0ms) using the unified caching system.
 */
export function detectUserCountry(): CountryInfo {
  const code = getUnifiedCountryCode();
  const match = COUNTRIES.find((c) => c.code === code);
  return match || COUNTRIES[0];
}

/**
 * Asynchronously warm up country detection without duplicate calls.
 */
export function warmUpCountryDetection(): void {
  void fetchUserCountryOnce();
}

/**
 * Normalizes an international phone number cleanly and deterministically.
 * Prevents double country codes (e.g. "+962 +962797192051", "+962+962...", "+962 079...")
 * and preserves explicitly selected non-Jordan dial codes (e.g. +970, +966, +971).
 */
export function getFormattedInternationalPhone(
  phone?: string | null,
  countryCode?: string | null
): string {
  if (!phone) return "";
  const raw = String(phone).trim();
  if (!raw) return "";

  let digits = raw.replace(/\D/g, "");
  if (!digits) return "";

  const dial = (countryCode || "").trim();
  const dialDigits = dial.replace(/\D/g, "");

  // Strip accidental 962 prefix before another country's code (e.g. 962970... -> 970...)
  if (digits.startsWith("962") && digits.length > 7) {
    const afterJordan = digits.slice(3);
    for (const c of COUNTRIES) {
      const cd = c.dialCode.replace(/\D/g, "");
      if (c.code !== "JO" && cd && afterJordan.startsWith(cd)) {
        digits = afterJordan;
        break;
      }
    }
  }

  // 1. If phone originally started with '+', it ALREADY has its own international dial code!
  // We must preserve it and not let a default countryCode overwrite it (e.g. +97052... should stay +970)
  if (raw.startsWith("+")) {
    // Strip accidental duplicate dial code at start if any
    if (dialDigits && digits.startsWith(dialDigits + dialDigits)) {
      while (digits.startsWith(dialDigits + dialDigits)) {
        digits = digits.slice(dialDigits.length);
      }
    }
    // Also check against all registered country dial codes
    for (const c of COUNTRIES) {
      const cd = c.dialCode.replace(/\D/g, "");
      if (cd && digits.startsWith(cd + cd)) {
        while (digits.startsWith(cd + cd)) {
          digits = digits.slice(cd.length);
        }
      }
    }
    return `+${digits}`;
  }

  // 2. If phone did not start with '+', check if digits already start with a known country dial code
  for (const c of COUNTRIES) {
    const cd = c.dialCode.replace(/\D/g, "");
    if (cd && digits.startsWith(cd)) {
      if (digits.startsWith(cd + cd)) {
        while (digits.startsWith(cd + cd)) {
          digits = digits.slice(cd.length);
        }
      }
      return `+${digits}`;
    }
  }

  // 3. If phone is a local number without dial code, strip leading zeros and attach dialDigits (or default +962)
  const localDigits = digits.replace(/^0+/, "");
  const prefix = dialDigits ? `+${dialDigits}` : "+962";
  return `${prefix}${localDigits}`;
}

/**
 * Resolves CountryInfo from a phone number string by checking international prefixes and known dial codes.
 */
export function resolveCountryFromPhone(phone?: string | null): CountryInfo | null {
  if (!phone) return null;
  let clean = String(phone).trim().replace(/[^\d+]/g, "");
  if (!clean) return null;

  // Accidental Jordan 962 prepended to another country (e.g. +962970... -> Palestine)
  if (clean.startsWith("+962") && clean.length > 7) {
    const sub = clean.slice(4);
    for (const c of COUNTRIES) {
      const cd = c.dialCode.replace(/\D/g, "");
      if (c.code !== "JO" && cd && sub.startsWith(cd)) {
        return c;
      }
    }
  } else if (clean.startsWith("962") && clean.length > 7) {
    const sub = clean.slice(3);
    for (const c of COUNTRIES) {
      const cd = c.dialCode.replace(/\D/g, "");
      if (c.code !== "JO" && cd && sub.startsWith(cd)) {
        return c;
      }
    }
  }

  const digits = clean.replace(/\D/g, "");
  for (const c of COUNTRIES) {
    const cd = c.dialCode.replace(/\D/g, "");
    if (cd && (clean.startsWith(`+${cd}`) || digits.startsWith(cd))) {
      return c;
    }
  }
  if (clean.startsWith("07") || digits.startsWith("07")) {
    return COUNTRIES.find((c) => c.code === "JO") || null;
  }
  return null;
}

/**
 * Format any user-entered number into an international WhatsApp number with dial code.
 * E.g.
 * - '0791234567' with JO (+962) => '+962791234567'
 * - '0512345678' with SA (+966) => '+966512345678'
 * - '+966512345678' with any => '+966512345678'
 */
export function formatInternationalWhatsApp(
  input: string,
  country: CountryInfo
): {
  fullInternational: string;
  cleanDigits: string;
  localDigits: string;
} {
  const raw = (input || "").trim();
  if (!raw) {
    return { fullInternational: "", cleanDigits: "", localDigits: "" };
  }

  const onlyDigits = raw.replace(/\D/g, "");

  // If user already typed with international prefix (starts with dial code without +)
  const dialDigits = country.dialCode.replace(/\D/g, "");
  if (dialDigits && onlyDigits.startsWith(dialDigits)) {
    return {
      fullInternational: `+${onlyDigits}`,
      cleanDigits: onlyDigits,
      localDigits: onlyDigits.slice(dialDigits.length),
    };
  }

  // If starts with 00 (e.g. 00962...)
  if (raw.startsWith("00")) {
    const without00 = raw.slice(2).replace(/\D/g, "");
    return {
      fullInternational: `+${without00}`,
      cleanDigits: without00,
      localDigits: without00,
    };
  }

  // Remove leading zeros for local formats (e.g. 079... -> 79... or 05... -> 5...)
  const strippedLocal = onlyDigits.replace(/^0+/, "");
  if (!strippedLocal) {
    return { fullInternational: "", cleanDigits: "", localDigits: "" };
  }

  const prefix = country.dialCode === "+" ? "" : country.dialCode;
  const full = `${prefix}${strippedLocal}`;

  return {
    fullInternational: full,
    cleanDigits: full.replace(/\D/g, ""),
    localDigits: strippedLocal,
  };
}

/**
 * Converts any international or full phone into clean local display digits (e.g. +962797192051 -> 0797192051).
 */
export function toLocalPhoneDisplay(phone?: string | null): string {
  if (!phone) return "";
  const raw = String(phone).trim();
  if (!raw) return "";

  // If already in standard local format like 079... or 05...
  if (raw.startsWith("0")) return raw;

  // Jordan
  if (raw.startsWith("+962")) {
    const rest = raw.slice(4).replace(/^0+/, "");
    return `0${rest}`;
  }
  if (raw.startsWith("00962")) {
    const rest = raw.slice(5).replace(/^0+/, "");
    return `0${rest}`;
  }
  if (raw.startsWith("962") && raw.length >= 11) {
    const rest = raw.slice(3).replace(/^0+/, "");
    return `0${rest}`;
  }

  // Saudi Arabia
  if (raw.startsWith("+966")) {
    const rest = raw.slice(4).replace(/^0+/, "");
    return `0${rest}`;
  }
  if (raw.startsWith("00966")) {
    const rest = raw.slice(5).replace(/^0+/, "");
    return `0${rest}`;
  }

  // UAE
  if (raw.startsWith("+971")) {
    const rest = raw.slice(4).replace(/^0+/, "");
    return `0${rest}`;
  }
  if (raw.startsWith("00971")) {
    const rest = raw.slice(5).replace(/^0+/, "");
    return `0${rest}`;
  }

  // Generic match by registered country dial codes
  if (raw.startsWith("+")) {
    for (const c of COUNTRIES) {
      if (c.dialCode !== "+" && raw.startsWith(c.dialCode)) {
        const rest = raw.slice(c.dialCode.length).replace(/^0+/, "");
        const prefix = c.localPrefix || "";
        return prefix && !rest.startsWith(prefix) ? `${prefix}${rest}` : rest;
      }
    }
  }

  return raw;
}

export type CountryPhoneInputProps = {
  value: string;
  country?: CountryInfo;
  onChange: (value: string, fullInternational: string, country: CountryInfo) => void;
  onCountryChange?: (country: CountryInfo) => void;
  placeholder?: string;
  isAr?: boolean;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  className?: string;
  autoFocus?: boolean;
  error?: boolean;
};

/**
 * Reusable Country Phone Input Component with auto-detected country,
 * flag pill, dropdown switcher, and dynamic prefix/placeholder.
 */
export function CountryPhoneInput({
  value,
  country,
  onChange,
  onCountryChange,
  placeholder,
  isAr = true,
  style,
  inputStyle,
  className = "",
  autoFocus = false,
  error = false,
}: CountryPhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo>(() => {
    if (country) return country;
    const fromVal = resolveCountryFromPhone(value);
    if (fromVal) return fromVal;
    return detectUserCountry();
  });

  useEffect(() => {
    if (country && country.code !== selectedCountry.code) {
      setSelectedCountry(country);
    }
  }, [country]);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Background warm-up
  useEffect(() => {
    warmUpCountryDetection();
    const handler = (e: Event) => {
      const code = (e as CustomEvent).detail;
      if (code && !localStorage.getItem("gx_customer_country")) {
        const found = COUNTRIES.find((c) => c.code === code);
        if (found) {
          setSelectedCountry(found);
          onCountryChange?.(found);
        }
      }
    };
    window.addEventListener("gx:country-detected", handler);
    return () => window.removeEventListener("gx:country-detected", handler);
  }, [onCountryChange]);

  // Close dropdown on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener("mousedown", onDocClick);
    }
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [isDropdownOpen]);

  // Filter countries for dropdown
  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return COUNTRIES;
    const q = searchQuery.toLowerCase().trim();
    return COUNTRIES.filter(
      (c) =>
        c.nameAr.includes(q) ||
        c.nameEn.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleSelectCountry = (country: CountryInfo) => {
    setSelectedCountry(country);
    onCountryChange?.(country);
    try {
      localStorage.setItem("gx_customer_country", country.code);
    } catch {
      /* noop */
    }
    setIsDropdownOpen(false);
    setSearchQuery("");

    // Re-format existing value with the new country dial code
    const formatted = formatInternationalWhatsApp(value, country);
    onChange(value, formatted.fullInternational, country);
    inputRef.current?.focus();
  };

  const handleInputChange = (rawVal: string) => {
    const formatted = formatInternationalWhatsApp(rawVal, selectedCountry);
    onChange(rawVal, formatted.fullInternational, selectedCountry);
  };

  const dynamicPlaceholder = placeholder || selectedCountry.placeholder;

  return (
    <div
      ref={dropdownRef}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "stretch",
        width: "100%",
        direction: "ltr", // Ensure uniform phone + flag alignment LTR
        ...style,
      }}
      className={`gx-country-phone-wrap ${className}`}
    >
      {/* Country Selector Trigger Pill */}
      <button
        type="button"
        onClick={() => setIsDropdownOpen((prev) => !prev)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "0 12px",
          background: "rgba(255, 255, 255, 0.06)",
          border: error ? "1.5px solid #ef4444" : "1.5px solid rgba(0, 229, 255, 0.28)",
          borderRight: "none",
          borderRadius: "12px 0 0 12px",
          color: "#f8fafc",
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: 700,
          transition: "all 0.18s ease",
          flexShrink: 0,
          userSelect: "none",
          boxSizing: "border-box",
        }}
        title={isAr ? "اضغط لتغيير الدولة ورمز الاتصال" : "Click to change country"}
        aria-label="Select Country"
      >
        <span style={{ fontSize: "16px", lineHeight: 1 }}>{selectedCountry.flag}</span>
        <span style={{ fontSize: "12.5px", color: "#00e5ff", fontWeight: 800 }} dir="ltr">
          {selectedCountry.dialCode}
        </span>
        <span style={{ fontSize: "9px", color: "#94a3b8", marginLeft: 2 }}>▼</span>
      </button>

      {/* Phone Number Input */}
      <div style={{ position: "relative", flex: 1, display: "flex" }}>
        <input
          ref={inputRef}
          type="tel"
          autoComplete="tel"
          autoFocus={autoFocus}
          placeholder={dynamicPlaceholder}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          style={{
            width: "100%",
            height: "44px",
            padding: "0 14px",
            background: "rgba(6, 11, 22, 0.75)",
            border: error ? "1.5px solid #ef4444" : "1.5px solid rgba(0, 229, 255, 0.28)",
            borderRadius: "0 12px 12px 0",
            color: "#ffffff",
            fontSize: "14px",
            fontFamily: "monospace, inherit",
            letterSpacing: "0.5px",
            outline: "none",
            boxSizing: "border-box",
            textAlign: "left",
            direction: "ltr",
            transition: "all 0.2s ease",
            ...inputStyle,
          }}
        />

        {value && (
          <button
            type="button"
            onClick={() => handleInputChange("")}
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              background: "rgba(255,255,255,0.08)",
              border: "none",
              borderRadius: "50%",
              width: 20,
              height: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#94a3b8",
              cursor: "pointer",
              fontSize: "11px",
              padding: 0,
            }}
            title={isAr ? "مسح" : "Clear"}
          >
            ✕
          </button>
        )}
      </div>

      {/* Country Dropdown Menu */}
      {isDropdownOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            width: "min(320px, 100%)",
            background: "#0c121e",
            border: "1.5px solid rgba(0, 229, 255, 0.35)",
            borderRadius: "14px",
            boxShadow: "0 20px 45px rgba(0, 0, 0, 0.85), 0 0 20px rgba(0, 229, 255, 0.2)",
            zIndex: 99999,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            direction: isAr ? "rtl" : "ltr",
            animation: "gxPop 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* Search box */}
          <div style={{ flex: "0 0 auto", padding: "8px 10px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", background: "rgba(0,0,0,0.35)" }}>
            <input
              type="text"
              autoFocus
              placeholder={isAr ? "ابحث عن الدولة أو الرمز..." : "Search country or dial code..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 10px",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#ffffff",
                fontSize: "12px",
                outline: "none",
                boxSizing: "border-box",
                direction: isAr ? "rtl" : "ltr",
              }}
            />
          </div>

          {/* List of countries */}
          <div style={{ height: "220px", maxHeight: "240px", overflowY: "auto", flex: "1 1 auto", padding: "4px 0" }}>
            {filteredCountries.length === 0 ? (
              <div style={{ padding: "20px 12px", textAlign: "center", color: "#94a3b8", fontSize: "12px" }}>
                {isAr ? "لم يتم العثور على نتائج" : "No countries found"}
              </div>
            ) : (
              filteredCountries.map((c) => {
                const isSelected = c.code === selectedCountry.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleSelectCountry(c)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      background: isSelected ? "rgba(0, 229, 255, 0.12)" : "transparent",
                      border: "none",
                      color: isSelected ? "#00e5ff" : "#e2e8f0",
                    cursor: "pointer",
                    fontSize: "12.5px",
                    fontWeight: isSelected ? 800 : 600,
                    transition: "background 0.15s ease",
                    textAlign: isAr ? "right" : "left",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "16px" }}>{c.flag}</span>
                    <span>{isAr ? c.nameAr : c.nameEn}</span>
                  </div>
                  <span
                    dir="ltr"
                    style={{
                      fontFamily: "monospace",
                      fontSize: "12px",
                      color: isSelected ? "#00e5ff" : "#94a3b8",
                      fontWeight: 700,
                    }}
                  >
                    {c.dialCode}
                  </span>
                </button>
              );
            }))}
          </div>
        </div>
      )}
    </div>
  );
}
