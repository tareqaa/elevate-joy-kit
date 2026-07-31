import { useLang } from "@/lib/gx/i18n";

/** Discount badge with plain-text wording (no minus sign) so it reads
 *  correctly in both RTL and LTR: "خصم 25%" / "25% OFF". */
export function DiscountBadge({ value }: { value: number }) {
  const { lang } = useLang();
  if (!value || value <= 0) return null;
  return (
  return (
    <span className="discount-badge" dir={lang === "ar" ? "rtl" : "ltr"}>
      {lang === "ar" ? <>خصم <bdi dir="ltr">{value}%</bdi></> : <bdi dir="ltr">{value}% OFF</bdi>}
    </span>
  );
}
