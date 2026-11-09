/* ============================================================
   GEO-IP & COUNTRY/CITY RESOLUTION
   Resolves country, city, and flag emojis from request headers
   (Cloudflare / Vercel) with safe fallbacks and localization.
   ============================================================ */

export type GeoLocation = {
  countryCode: string | null;
  countryNameAr: string;
  countryNameEn: string;
  city: string | null;
  flag: string;
};

const COUNTRY_NAMES: Record<string, { ar: string; en: string }> = {
  JO: { ar: "الأردن", en: "Jordan" },
  SA: { ar: "السعودية", en: "Saudi Arabia" },
  AE: { ar: "الإمارات", en: "UAE" },
  EG: { ar: "مصر", en: "Egypt" },
  TR: { ar: "تركيا", en: "Turkey" },
  KW: { ar: "الكويت", en: "Kuwait" },
  QA: { ar: "قطر", en: "Qatar" },
  OM: { ar: "عمان", en: "Oman" },
  BH: { ar: "البحرين", en: "Bahrain" },
  IQ: { ar: "العراق", en: "Iraq" },
  PS: { ar: "فلسطين", en: "Palestine" },
  LB: { ar: "لبنان", en: "Lebanon" },
  SY: { ar: "سوريا", en: "Syria" },
  US: { ar: "الولايات المتحدة", en: "United States" },
  GB: { ar: "المملكة المتحدة", en: "United Kingdom" },
  DE: { ar: "ألمانيا", en: "Germany" },
  FR: { ar: "فرنسا", en: "France" },
  CA: { ar: "كندا", en: "Canada" },
  NL: { ar: "هولندا", en: "Netherlands" },
  SE: { ar: "السويد", en: "Sweden" },
  RU: { ar: "روسيا", en: "Russia" },
  IN: { ar: "الهند", en: "India" },
  MA: { ar: "المغرب", en: "Morocco" },
  DZ: { ar: "الجزائر", en: "Algeria" },
  TN: { ar: "تونس", en: "Tunisia" },
  LY: { ar: "ليبيا", en: "Libya" },
  YE: { ar: "اليمن", en: "Yemen" },
};

export function getFlagEmoji(countryCode?: string | null): string {
  if (!countryCode || countryCode.length !== 2) return "🌐";
  const code = countryCode.toUpperCase();
  if (code === "XX" || code === "T1") return "🌐";
  try {
    return String.fromCodePoint(...code.split("").map((c) => 127397 + c.charCodeAt(0)));
  } catch {
    return "🌐";
  }
}

export function isLocalOrPrivateIp(ip?: string | null): boolean {
  if (!ip) return true;
  const clean = ip.trim();
  return (
    clean === "127.0.0.1" ||
    clean === "::1" ||
    clean.startsWith("192.168.") ||
    clean.startsWith("10.") ||
    clean.startsWith("172.16.") ||
    clean.startsWith("172.17.") ||
    clean.startsWith("172.18.") ||
    clean.startsWith("172.19.") ||
    clean.startsWith("172.2") ||
    clean.startsWith("172.30.") ||
    clean.startsWith("172.31.") ||
    clean === "localhost"
  );
}

/**
 * Resolves geolocation from server request headers or client IP.
 */
export function resolveGeoLocation(
  headers: (name: string) => string | undefined | null,
  ip?: string | null
): GeoLocation {
  // 1. Cloudflare / Vercel Edge Headers
  const countryHeader = (
    headers("cf-ipcountry") ||
    headers("x-vercel-ip-country") ||
    headers("x-country-code")
  )?.trim().toUpperCase() || null;

  const cityHeader = (
    headers("cf-ipcity") ||
    headers("x-vercel-ip-city") ||
    headers("x-city")
  )?.trim() || null;

  if (countryHeader && countryHeader !== "XX" && countryHeader.length === 2) {
    const info = COUNTRY_NAMES[countryHeader] || { ar: countryHeader, en: countryHeader };
    return {
      countryCode: countryHeader,
      countryNameAr: info.ar,
      countryNameEn: info.en,
      city: cityHeader ? decodeURIComponent(cityHeader) : null,
      flag: getFlagEmoji(countryHeader),
    };
  }

  // 2. Localhost / Private network detection
  if (isLocalOrPrivateIp(ip)) {
    return {
      countryCode: "JO",
      countryNameAr: "الأردن (اتصال محلي)",
      countryNameEn: "Jordan (Local Network)",
      city: "عمان",
      flag: "🇯🇴",
    };
  }

  // 3. Fallback generic
  return {
    countryCode: null,
    countryNameAr: "غير محدد",
    countryNameEn: "Unknown",
    city: null,
    flag: "🌐",
  };
}

