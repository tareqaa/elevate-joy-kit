/** RTL-friendly, human readable countdown + date helpers for tournaments. */

function arPlural(n: number, one: string, two: string, few: string, many: string) {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${n} ${few}`;
  return `${n} ${many}`;
}

/** e.g. ar: "3 أيام و 4 ساعات" · en: "3 days, 4 hours" */
export function formatCountdown(ms: number, ar: boolean): string {
  if (ms <= 0) return ar ? "انتهت" : "Ended";
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  const parts: string[] = [];
  if (ar) {
    if (d > 0) {
      parts.push(arPlural(d, "يوم واحد", "يومان", "أيام", "يومًا"));
      if (h > 0) parts.push(arPlural(h, "ساعة واحدة", "ساعتان", "ساعات", "ساعة"));
    } else if (h > 0) {
      parts.push(arPlural(h, "ساعة واحدة", "ساعتان", "ساعات", "ساعة"));
      if (m > 0) parts.push(arPlural(m, "دقيقة واحدة", "دقيقتان", "دقائق", "دقيقة"));
    } else if (m > 0) {
      parts.push(arPlural(m, "دقيقة واحدة", "دقيقتان", "دقائق", "دقيقة"));
      if (s > 0) parts.push(arPlural(s, "ثانية واحدة", "ثانيتان", "ثوانٍ", "ثانية"));
    } else {
      parts.push(arPlural(s, "ثانية واحدة", "ثانيتان", "ثوانٍ", "ثانية"));
    }
    return parts.join(" و ");
  }

  if (d > 0) {
    parts.push(`${d} ${d === 1 ? "day" : "days"}`);
    if (h > 0) parts.push(`${h} ${h === 1 ? "hour" : "hours"}`);
  } else if (h > 0) {
    parts.push(`${h} ${h === 1 ? "hour" : "hours"}`);
    if (m > 0) parts.push(`${m} min`);
  } else if (m > 0) {
    parts.push(`${m} min`);
    if (s > 0) parts.push(`${s} sec`);
  } else {
    parts.push(`${s} sec`);
  }
  return parts.join(", ");
}

/** Short numeric clock for compact spots (always LTR digits). */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const p = (n: number) => String(n).padStart(2, "0");
  const d = Math.floor(total / 86400);
  const base = `${p(Math.floor((total % 86400) / 3600))}:${p(Math.floor((total % 3600) / 60))}:${p(total % 60)}`;
  return d > 0 ? `${d}:${base}` : base;
}

export function formatDateTime(iso: string, ar: boolean): string {
  return new Date(iso).toLocaleString(ar ? "ar-JO" : "en-GB", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Precise, always-complete countdown: "يومان و3 ساعات و12 دقيقة و40 ثانية". */
export function formatCountdownFull(ms: number, ar: boolean): string {
  if (ms <= 0) return ar ? "انتهت" : "Ended";
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  const parts: string[] = [];
  if (ar) {
    if (d > 0) parts.push(arPlural(d, "يوم واحد", "يومان", "أيام", "يومًا"));
    if (h > 0 || d > 0) parts.push(arPlural(h, "ساعة واحدة", "ساعتان", "ساعات", "ساعة"));
    if (m > 0 || h > 0 || d > 0) parts.push(arPlural(m, "دقيقة واحدة", "دقيقتان", "دقائق", "دقيقة"));
    parts.push(arPlural(s, "ثانية واحدة", "ثانيتان", "ثوانٍ", "ثانية"));
    return parts.join(" و ");
  }

  if (d > 0) parts.push(`${d}d`);
  if (h > 0 || d > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0 || d > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

/** Pretty game label from a slug (gx-blast -> GX Blast). */
export function gameLabel(slug: string): string {
  if (slug === "gx-blast") return "GX Blast";
  return slug
    .split("-")
    .map((w) => (w.length <= 2 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}
