/**
 * Fast synchronous language detector for document title and meta tags.
 * Works both during SSR (defaults to 'ar') and client-side (reads localStorage / cached country / timezone / browser).
 */
export function getHeadLang(): "ar" | "en" {
  if (typeof window === "undefined") return "ar";
  try {
    const s = localStorage.getItem("gx_lang");
    if (s === "en" || s === "ar") return s;

    const cachedCc = (
      localStorage.getItem("gx_country_code") ||
      localStorage.getItem("gx_lang_geo_cc") ||
      ""
    ).toUpperCase();

    const ARAB_COUNTRIES: Record<string, number> = {
      JO: 1, PS: 1, SA: 1, AE: 1, KW: 1, QA: 1, OM: 1, BH: 1, IQ: 1, EG: 1, MA: 1,
      DZ: 1, TN: 1, LB: 1, SY: 1, YE: 1, LY: 1, SD: 1, MR: 1, SO: 1, DJ: 1, KM: 1,
    };

    if (cachedCc) {
      return ARAB_COUNTRIES[cachedCc] ? "ar" : "en";
    }

    const tz =
      (typeof Intl !== "undefined" && Intl.DateTimeFormat().resolvedOptions().timeZone) || "";
    const isArabTz =
      /amman|riyadh|cairo|dubai|abu_dhabi|baghdad|kuwait|qatar|bahrain|muscat|beirut|damascus|jerusalem|gaza|hebron|khartoum|tripoli|algiers|tunis|casablanca|sanaa|aden|nouakchott|mogadishu|djibouti/i.test(
        tz
      );
    const navLang = (navigator.language || (navigator as any).userLanguage || "").toLowerCase();

    // If timezone is detected outside the Arab world, default to English
    if (tz && !isArabTz) return "en";
    if (isArabTz) return "ar";
    if (navLang.startsWith("ar")) return "ar";
    return "en";
  } catch {
    return "ar";
  }
}

