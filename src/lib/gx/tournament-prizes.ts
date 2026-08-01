/** Shared tournament prize model: each place can hold multiple rewards. */

export type RewardType =
  | "coupon_percent"
  | "coupon_fixed"
  | "coupon_product"
  | "coins"
  | "xp"
  | "custom";

export type Reward = {
  type: RewardType;
  /** percent (%), fixed amount (JOD), coins or xp count */
  value?: number | null;
  /** for coupon_product: the product this coupon is limited to */
  product_slug?: string | null;
  product_name?: string | null;
  /** coupon_percent / coupon_product cap in JOD */
  max_discount_jod?: number | null;
  /** free-text override, used for "custom" and as a fallback label */
  label_ar?: string | null;
  label_en?: string | null;
};

export type Prize = {
  place: number;
  /** optional range end: prize covers places `place`..`place_to` */
  place_to?: number | null;
  label_ar?: string | null;
  label_en?: string | null;
  rewards?: Reward[];
  /** legacy single-reward fields (kept for old rows) */
  reward_type?: string | null;
  reward_value?: number | null;
};

export const REWARD_TYPES: { v: RewardType; label_ar: string; icon: string }[] = [
  { v: "coupon_percent", label_ar: "كوبون خصم %", icon: "🎟️" },
  { v: "coupon_fixed", label_ar: "كوبون خصم بقيمة (د.أ)", icon: "💵" },
  { v: "coupon_product", label_ar: "كوبون لمنتج محدد", icon: "🛍️" },
  { v: "coins", label_ar: "GX Coins", icon: "💰" },
  { v: "xp", label_ar: "XP", icon: "⚡" },
  { v: "custom", label_ar: "جائزة مخصصة", icon: "🎁" },
];

export const rewardIcon = (t: RewardType | string | null | undefined) =>
  REWARD_TYPES.find((r) => r.v === t)?.icon ?? "🎁";

const num = (v: unknown) => Number(v ?? 0) || 0;

/** Human label for one reward. */
export function rewardText(r: Reward, ar: boolean): string {
  const v = num(r.value);
  const cap = r.max_discount_jod ? (ar ? ` (حتى ${r.max_discount_jod} د.أ)` : ` (up to ${r.max_discount_jod} JOD)`) : "";
  const product = r.product_name || r.product_slug || "";
  switch (r.type) {
    case "coupon_percent":
      return v ? (ar ? `كوبون خصم ${v}%${cap}` : `${v}% discount coupon${cap}`) : fallback(r, ar);
    case "coupon_fixed":
      return v ? (ar ? `كوبون خصم ${v} د.أ` : `${v} JOD discount coupon`) : fallback(r, ar);
    case "coupon_product":
      return v
        ? ar
          ? `كوبون ${v}% على ${product}${cap}`
          : `${v}% coupon on ${product}${cap}`
        : ar
          ? `كوبون على ${product}`
          : `Coupon on ${product}`;
    case "coins":
      return v ? `${v.toLocaleString("en-US")} GX Coins` : fallback(r, ar);
    case "xp":
      return v ? `${v.toLocaleString("en-US")} XP` : fallback(r, ar);
    default:
      return fallback(r, ar);
  }
}

function fallback(r: Reward, ar: boolean) {
  return (ar ? r.label_ar : r.label_en) || r.label_ar || r.label_en || (ar ? "جائزة" : "Prize");
}

/** Reads a prize in either the new (rewards[]) or the legacy shape. */
export function prizeRewards(p: Prize): Reward[] {
  if (Array.isArray(p.rewards) && p.rewards.length > 0) return p.rewards;
  const legacyMap: Record<string, RewardType> = {
    coupon: "coupon_percent",
    coins: "coins",
    xp: "xp",
    custom: "custom",
  };
  const type = legacyMap[p.reward_type ?? "custom"] ?? "custom";
  return [{ type, value: p.reward_value ?? null, label_ar: p.label_ar, label_en: p.label_en }];
}

/** One-line summary of every reward on a place. */
export function prizeSummary(p: Prize, ar: boolean): string {
  return prizeRewards(p)
    .map((r) => `${rewardIcon(r.type)} ${rewardText(r, ar)}`)
    .join(ar ? " + " : " + ");
}

/** Label for a place or a range of places (e.g. "المراكز 20 - 50"). */
export function placeLabel(p: Prize, ar: boolean, fallbackPlace?: number): string {
  const from = p.place ?? fallbackPlace ?? 1;
  const to = p.place_to && Number(p.place_to) > from ? Number(p.place_to) : null;
  if (to) return ar ? `المراكز ${from} - ${to}` : `Places ${from} - ${to}`;
  return ar ? `المركز ${from}` : `Place ${from}`;
}
