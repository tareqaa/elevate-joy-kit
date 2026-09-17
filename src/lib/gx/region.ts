/* ============================================================
   GX STORE — SINGLE SOURCE OF TRUTH FOR PRODUCT REGION LABELS
   The database `region` field always wins. Guessing from the
   product name is only a last resort and uses strict token
   matching so titles like "Euro Truck Simulator 2" are never
   mistaken for a Turkish region ("tr" inside "truck").
   ============================================================ */

export type RegionCode = "global" | "us" | "tr" | "sa" | "ae" | "uk" | "jo" | "eu";

const LABELS: Record<RegionCode, { ar: string; en: string; flag: string }> = {
  global: { ar: "عالمي", en: "Global", flag: "🌐" },
  us: { ar: "أمريكي", en: "USA", flag: "🇺🇸" },
  tr: { ar: "تركي", en: "Turkey", flag: "🇹🇷" },
  sa: { ar: "سعودي", en: "Saudi", flag: "🇸🇦" },
  ae: { ar: "إماراتي", en: "UAE", flag: "🇦🇪" },
  uk: { ar: "بريطاني", en: "UK", flag: "🇬🇧" },
  jo: { ar: "الأردن", en: "Jordan", flag: "🇯🇴" },
  eu: { ar: "أوروبي", en: "Europe", flag: "🇪🇺" },
};

/** Patterns applied to an explicit region value (DB field) — permissive. */
const EXPLICIT: Array<[RegionCode, RegExp]> = [
  ["global", /global|عالمي|worldwide|ww/i],
  ["us", /أمريك|\bus\b|\busa\b|united\s*states/i],
  ["tr", /ترك|turkey|turkish|\btry\b|\btr\b/i],
  ["sa", /سعود|saudi|\bksa\b|\bsa\b/i],
  ["ae", /إمارات|امارات|uae|emirates|\bae\b/i],
  ["uk", /بريطان|\buk\b|\bgb\b|united\s*kingdom|باوند/i],
  ["jo", /أردن|اردن|jordan|\bjo\b/i],
  ["eu", /أوروب|اوروب|europe|\beu\b/i],
];

/** Patterns applied to free text (names, slugs, cart ids) — strict. */
const IMPLICIT: Array<[RegionCode, RegExp]> = [
  ["us", /أمريك|\busa\b|united\s*states|(^|[-_\s])us([-_\s]|\d|$)/i],
  ["tr", /ترك|\bturkey\b|\bturkish\b|\btry\b|(^|[-_\s])tr([-_\s]|\d|$)/i],
  ["sa", /سعود|\bksa\b|\bsaudi\b|(^|[-_\s])sa([-_\s]|\d|$)/i],
  ["ae", /إمارات|امارات|\buae\b|\bemirates\b|(^|[-_\s])ae([-_\s]|\d|$)/i],
  ["uk", /بريطان|باوند|\buk\b|\bgb\b/i],
  ["jo", /أردن|اردن|\bjordan\b|(^|[-_\s])jo([-_\s]|\d|$)/i],
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

  const hay = [input.name, input.cartId, input.slug, input.tagline]
    .filter(Boolean)
    .join(" ");
  if (hay) {
    if (/global|عالمي|worldwide/i.test(hay)) return "global";
    for (const [code, re] of IMPLICIT) if (re.test(hay)) return code;
  }

  return "global";
}

export function regionLabel(
  code: RegionCode,
  lang: string,
  opts: { flag?: boolean; parens?: boolean } = {},
): string {
  const l = LABELS[code];
  const ar = lang !== "en";
  let text = ar ? l.ar : l.en;
  if (opts.parens && ar && code !== "global") text = `${l.ar} (${l.en})`;
  else if (opts.parens && ar) text = `${l.ar} (${l.en})`;
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

export function regionFlag(code: RegionCode): string {
  return LABELS[code].flag;
}
