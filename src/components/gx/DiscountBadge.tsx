import { useLang } from "@/lib/gx/i18n";

/** Discount badge with plain-text wording (no minus sign) so it reads
 *  correctly in both RTL and LTR: "خصم 25%" / "25% OFF". */
export function DiscountBadge({ value }: { value: number }) {
  const { lang } = useLang();
  if (!value || value <= 0) return null;
  return (
    <span 
      className="discount-badge inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-bold bg-[#FF2D78] text-white shadow-[0_2px_10px_rgba(255,45,120,0.4)] whitespace-nowrap" 
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      {lang === "ar" ? (
        <>
          <span className="opacity-90">خصم</span>
          <span className="text-[1.1em]">{value}%</span>
        </>
      ) : (
        <>
          <span className="text-[1.1em]">{value}%</span>
          <span className="opacity-90">OFF</span>
        </>
      )}
    </span>
  );
}
