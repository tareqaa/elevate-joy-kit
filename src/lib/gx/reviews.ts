export type ReviewStatus = "pending" | "approved" | "rejected" | "hidden";

export type ReviewRow = {
  id: string;
  user_id: string | null;
  order_id: string | null;
  order_number: string | null;
  product_slug: string | null;
  product_name: string | null;
  display_name: string | null;
  rating: number;
  comment: string;
  status: ReviewStatus;
  is_featured: boolean;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

/** Words that block a review from being auto-eligible for the homepage. */
const BAD_WORDS = [
  "كلب", "حمار", "غبي", "غبية", "حقير", "نصاب", "نصابين", "حرامي", "حرامية", "قذر",
  "خرا", "زفت", "تافه", "لعنة", "يلعن", "احتيال", "سرقة", "شتيمة", "وسخ", "خنزير",
  "fuck", "shit", "bitch", "bastard", "asshole", "idiot", "stupid", "scam", "scammer",
  "fraud", "thief", "damn", "crap", "trash", "worst",
];

export function containsProfanity(text: string): boolean {
  const t = (text || "").toLowerCase();
  return BAD_WORDS.some((w) => t.includes(w));
}

/** Auto rule: 4+ stars and clean text → eligible to be published on the homepage. */
export function isAutoEligible(rating: number, comment: string): boolean {
  return rating >= 4 && !containsProfanity(comment);
}

export function statusLabel(s: ReviewStatus): string {
  return s === "pending" ? "بانتظار المراجعة"
    : s === "approved" ? "منشور"
    : s === "rejected" ? "مرفوض"
    : "مخفي";
}

export function initialOf(name: string | null | undefined): string {
  const n = (name || "").trim();
  return n ? n[0].toUpperCase() : "؟";
}

const AVATAR_COLORS = [
  "linear-gradient(135deg,#00e5ff,#0a6e8c)",
  "linear-gradient(135deg,#a259ff,#00e5ff)",
  "linear-gradient(135deg,#ffd54f,#ff9800)",
  "linear-gradient(135deg,#4ade80,#0a6e8c)",
  "linear-gradient(135deg,#fb7185,#a259ff)",
];

export function avatarColorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
