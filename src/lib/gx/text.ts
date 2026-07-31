const NBSP = "\u00A0";

/**
 * Makes mixed Arabic/English product titles break nicely:
 * - a line never starts with a dash or punctuation (glued to the previous word)
 * - the last word never ends up alone on its own line
 */
export function formatTitle(raw: string): string {
  if (!raw) return "";
  let s = raw.replace(/\s+/g, " ").trim();
  // glue dashes / punctuation to the preceding word
  s = s.replace(/ ([—–\-•|,.:؛،])/g, `${NBSP}$1`);
  // keep the last two words together
  const parts = s.split(" ");
  if (parts.length > 2) {
    const last = parts.pop() as string;
    const prev = parts.pop() as string;
    parts.push(`${prev}${NBSP}${last}`);
  }
  return parts.join(" ");
}
