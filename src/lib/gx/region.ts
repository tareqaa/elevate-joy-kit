/* ============================================================
   GX STORE — SINGLE SOURCE OF TRUTH FOR PRODUCT REGION LABELS
   The database `region` field always wins. Guessing from the
   product name is only a last resort and uses strict token
   matching so titles like "Euro Truck Simulator 2" are never
   mistaken for a Turkish region ("tr" inside "truck").
   ============================================================ */

export type RegionCode =
  | "global"
  | "us"
  | "tr"
  | "sa"
  | "ae"
  | "uk"
  | "jo"
  | "eu"
  | "kw"
  | "qa"
  | "bh"
  | "om"
  | "eg";

const LABELS: Record<RegionCode, { ar: string; en: string; flag: string; fullAr: string; fullEn: string }> = {
  global: { ar: "عالمي", en: "Global", flag: "🌐", fullAr: "عالمي (Global)", fullEn: "Global (Worldwide)" },
  sa: { ar: "سعودي", en: "Saudi", flag: "🇸🇦", fullAr: "سعودي (Saudi Arabia)", fullEn: "Saudi Arabia (SA)" },
  ae: { ar: "إماراتي", en: "UAE", flag: "🇦🇪", fullAr: "إماراتي (UAE)", fullEn: "United Arab Emirates (UAE)" },
  us: { ar: "أمريكي", en: "USA", flag: "🇺🇸", fullAr: "أمريكي (United States)", fullEn: "United States (US)" },
  uk: { ar: "بريطاني", en: "UK", flag: "🇬🇧", fullAr: "بريطاني (United Kingdom)", fullEn: "United Kingdom (UK)" },
  tr: { ar: "تركي", en: "Turkey", flag: "🇹🇷", fullAr: "تركي (Turkey)", fullEn: "Turkey (TR)" },
  eu: { ar: "أوروبي", en: "Europe", flag: "🇪🇺", fullAr: "أوروبي (Europe)", fullEn: "Europe (EU)" },
  kw: { ar: "كويتي", en: "Kuwait", flag: "🇰🇼", fullAr: "كويتي (Kuwait)", fullEn: "Kuwait (KW)" },
  qa: { ar: "قطري", en: "Qatar", flag: "🇶🇦", fullAr: "قطري (Qatar)", fullEn: "Qatar (QA)" },
  bh: { ar: "بحريني", en: "Bahrain", flag: "🇧🇭", fullAr: "بحريني (Bahrain)", fullEn: "Bahrain (BH)" },
  om: { ar: "عُماني", en: "Oman", flag: "🇴🇲", fullAr: "عُماني (Oman)", fullEn: "Oman (OM)" },
  jo: { ar: "أردني", en: "Jordan", flag: "🇯🇴", fullAr: "أردني (Jordan)", fullEn: "Jordan (JO)" },
  eg: { ar: "مصري", en: "Egypt", flag: "🇪🇬", fullAr: "مصري (Egypt)", fullEn: "Egypt (EG)" },
};

/** Patterns applied to an explicit region value (DB field / delivery code) — permissive. */
const EXPLICIT: Array<[RegionCode, RegExp]> = [
  ["sa", /سعود|saudi|\bksa\b|\bsa\b/i],
  ["ae", /إمارات|امارات|uae|emirates|\bae\b/i],
  ["kw", /كويت|kuwait|\bkw\b|\bkwt\b/i],
  ["qa", /قطر|qatar|\bqa\b|\bqat\b/i],
  ["bh", /بحرين|bahrain|\bbh\b|\bbhr\b/i],
  ["om", /عمان|عُمان|oman|\bom\b|\bomn\b/i],
  ["jo", /أردن|اردن|jordan|\bjo\b/i],
  ["eg", /مصر|egypt|\beg\b|\begy\b/i],
  ["us", /أمريك|امريك|\bus\b|\busa\b|united\s*states/i],
  ["uk", /بريطان|\buk\b|\bgb\b|united\s*kingdom|باوند/i],
  ["tr", /ترك|turkey|turkish|\btry\b|\btr\b/i],
  ["eu", /أوروب|اوروب|europe|\beu\b/i],
  ["global", /global|عالمي|worldwide|ww/i],
];

/** Patterns applied to free text (names, slugs, cart ids) — strict. */
const IMPLICIT: Array<[RegionCode, RegExp]> = [
  ["sa", /سعود|\bksa\b|\bsaudi\b|(^|[-_\s])sa([-_\s]|\d|$)/i],
  ["ae", /إمارات|امارات|\buae\b|\bemirates\b|(^|[-_\s])ae([-_\s]|\d|$)/i],
  ["kw", /كويت|\bkuwait\b|(^|[-_\s])kw([-_\s]|\d|$)/i],
  ["qa", /قطر|\bqatar\b|(^|[-_\s])qa([-_\s]|\d|$)/i],
  ["bh", /بحرين|\bbahrain\b|(^|[-_\s])bh([-_\s]|\d|$)/i],
  ["om", /عمان|عُمان|\boman\b|(^|[-_\s])om([-_\s]|\d|$)/i],
  ["jo", /أردن|اردن|\bjordan\b|(^|[-_\s])jo([-_\s]|\d|$)/i],
  ["eg", /مصر|\begypt\b|(^|[-_\s])eg([-_\s]|\d|$)/i],
  ["us", /أمريك|امريك|\busa\b|united\s*states|(^|[-_\s])us([-_\s]|\d|$)/i],
  ["uk", /بريطان|باوند|\buk\b|\bgb\b/i],
  ["tr", /ترك|\bturkey\b|\bturkish\b|\btry\b|(^|[-_\s])tr([-_\s]|\d|$)/i],
  ["eu", /أوروب|اوروب|\beurope\b|(^|[-_\s])eu([-_\s]|\d|$)/i],
  ["global", /global|عالمي|worldwide|\bww\b/i],
];

export function detectRegionCode(input: {
  region?: string | null;
  name?: string | null;
  cartId?: string | null;
  slug?: string | null;
  tagline?: string | null;
}): RegionCode {
  const region = (input.region || "").trim();
  if (region) {
    for (const [code, re] of EXPLICIT) if (re.test(region)) return code;
  }

  const s = (input.slug || "").toLowerCase();
  const cid = (input.cartId || "").toLowerCase();
  if (s === "tod" || s.startsWith("tod-") || cid.startsWith("tod-")) {
    return "jo";
  }
  if (s.includes("razer") || cid.includes("razer") || (input.name && /razer|ريزر/i.test(input.name))) {
    return "global";
  }

  const hay = [input.name, input.cartId, input.slug, input.tagline]
    .filter(Boolean)
    .join(" ");
  if (hay) {
    for (const [code, re] of IMPLICIT) if (re.test(hay)) return code;
    if (/global|عالمي|worldwide/i.test(hay)) return "global";
  }

  return "global";
}

export function regionLabel(
  code: RegionCode,
  lang: string,
  opts: { flag?: boolean; parens?: boolean } = {},
): string {
  const l = LABELS[code] || LABELS.global;
  const ar = lang !== "en";
  let text = ar ? l.ar : l.en;
  if (opts.parens) text = ar ? l.fullAr : l.fullEn;
  return opts.flag === false ? text : `${text} ${l.flag}`;
}

/** Convenience: detect + localize in one call. */
export function resolveRegionLabel(
  input: Parameters<typeof detectRegionCode>[0],
  lang: string,
  opts: { flag?: boolean; parens?: boolean } = {},
): string {
  return regionLabel(detectRegionCode(input), lang, opts);
}

/** Full user-facing region formatter for delivered codes, token page, and my orders */
export function formatFullRegion(
  input: Parameters<typeof detectRegionCode>[0],
  lang: string = "ar",
  opts: { withDetails?: boolean } = {}
): string {
  const code = detectRegionCode(input);
  const l = LABELS[code] || LABELS.global;
  const isAr = lang !== "en";

  if (opts.withDetails) {
    return isAr ? `${l.fullAr} ${l.flag}` : `${l.fullEn} ${l.flag}`;
  }
  return isAr ? `${l.ar} ${l.flag}` : `${l.en} ${l.flag}`;
}

export function regionFlag(code: RegionCode): string {
  return (LABELS[code] || LABELS.global).flag;
}
