/**
 * Currency-aware, bilingual copy for the GX Rewards economy.
 *
 * Every rule (XP per unit, coins per unit, redeem rate, discount cap) is stated
 * in the shopper's ACTIVE currency instead of a hard-coded "1 JOD", and all
 * numbers are wrapped in Unicode isolates so Arabic sentences never scramble
 * the digits / latin currency codes.
 */
import { useMemo } from "react";
import { useCurrency } from "./currency";
import { useLang } from "./i18n";
import {
  COINS_PER_JOD,
  COINS_PER_JOD_REDEEM,
  MAX_COINS_DISCOUNT_RATIO,
  XP_PER_JOD,
} from "./loyalty";

/** Wrap a number / currency chunk in a bidi isolate so RTL text stays readable. */
export const bidi = (s: string | number) => `\u2066${s}\u2069`;

const n = (v: number, d = 0) =>
  bidi(v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }));

export type LoyaltyCopy = {
  /** One "unit" of spend in the active currency, e.g. "1.00 JOD" / "7.10 SAR". */
  unit: string;
  /** Value of COINS_PER_JOD_REDEEM coins in the active currency. */
  redeemValue: string;
  maxPct: string;
  xpPerUnit: string;
  coinsPerUnit: string;
  redeemCoins: string;
  /** "Every X you spend = 100 XP" */
  earnXp: string;
  /** "Every X you pay = 10 GX Coins (×1.30 level bonus = 13 coins)" */
  earnCoins: (bonusPct?: number | null) => string;
  /** "1,000 coins = X off — coins cover up to 50% of the order" */
  redeem: string;
  /** Compact one-liner used under the profile hero. */
  summary: (bonusPct?: number | null) => string;
  /** Replaces {UNIT} {XP_PER_UNIT} {COINS_PER_UNIT} {REDEEM_COINS} {REDEEM_VALUE} {MAX_PCT} tokens. */
  fill: (text: string) => string;
};

export function useLoyaltyCopy(): LoyaltyCopy {
  const { format } = useCurrency();
  const { lang } = useLang();
  const isAr = lang !== "en";

  return useMemo(() => {
    const unit = bidi(format(1));
    const redeemValue = bidi(format(COINS_PER_JOD_REDEEM / COINS_PER_JOD_REDEEM));
    const maxPct = bidi(`${Math.round(MAX_COINS_DISCOUNT_RATIO * 100)}%`);
    const xpPerUnit = n(XP_PER_JOD);
    const coinsPerUnit = n(COINS_PER_JOD);
    const redeemCoins = n(COINS_PER_JOD_REDEEM);

    const earnXp = isAr
      ? `مقابل كل ${unit} من قيمة طلبك تكسب ${xpPerUnit} نقطة خبرة (XP).`
      : `Every ${unit} of order value earns you ${xpPerUnit} XP.`;

    const earnCoins = (bonusPct?: number | null) => {
      const pct = Number(bonusPct ?? 0);
      const mult = 1 + pct / 100;
      const total = n(Math.round(COINS_PER_JOD * mult));
      if (!pct) {
        return isAr
          ? `مقابل كل ${unit} تدفعها فعلياً تكسب ${coinsPerUnit} GX Coins.`
          : `Every ${unit} you actually pay earns you ${coinsPerUnit} GX Coins.`;
      }
      return isAr
        ? `مقابل كل ${unit} تدفعها فعلياً تكسب ${coinsPerUnit} GX Coins، ومع مكافأة مستواك ${bidi(`+${pct}%`)} تصير ${total} عملة.`
        : `Every ${unit} you actually pay earns you ${coinsPerUnit} GX Coins — with your ${bidi(`+${pct}%`)} level bonus that becomes ${total} coins.`;
    };

    const redeem = isAr
      ? `كل ${redeemCoins} عملة = خصم ${redeemValue}، والعملات تغطي حتى ${maxPct} من قيمة الطلب.`
      : `${redeemCoins} coins = ${redeemValue} off, and coins can cover up to ${maxPct} of the order.`;

    const summary = (bonusPct?: number | null) => `${earnCoins(bonusPct)} ${redeem}`;

    const fill = (text: string) =>
      text
        .replaceAll("{UNIT}", unit)
        .replaceAll("{XP_PER_UNIT}", xpPerUnit)
        .replaceAll("{COINS_PER_UNIT}", coinsPerUnit)
        .replaceAll("{REDEEM_COINS}", redeemCoins)
        .replaceAll("{REDEEM_VALUE}", redeemValue)
        .replaceAll("{MAX_PCT}", maxPct);

    return { unit, redeemValue, maxPct, xpPerUnit, coinsPerUnit, redeemCoins, earnXp, earnCoins, redeem, summary, fill };
  }, [format, isAr]);
}
