import { useLang } from "@/lib/gx/i18n";

/** Discount badge with plain-text wording (no minus sign) so it reads
 *  correctly in both RTL and LTR: "خصم 25%" / "25% OFF". */
export function DiscountBadge({ discount, value }: { discount?: number; value?: number }) {
  const { lang } = useLang();
  const v = discount ?? value ?? 0;
  if (!v || v <= 0) return null;
  return (
    <span className="discount-badge" dir={lang === "ar" ? "rtl" : "ltr"}>
      {lang === "ar" ? <>خصم <bdi dir="ltr">{v}%</bdi></> : <bdi dir="ltr">{v}% OFF</bdi>}
    </span>
  );
}
