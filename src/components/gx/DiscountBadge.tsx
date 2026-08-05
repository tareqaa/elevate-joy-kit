import { useLang } from "@/lib/gx/i18n";

/** Discount badge with plain-text wording (no minus sign) so it reads
 *  correctly in both RTL and LTR: "خصم 25%" / "25% OFF". */
export function DiscountBadge({ value }: { value: number }) {
  const { lang } = useLang();
  if (!value || value <= 0) return null;
  return (
    <span 
      className="discount-badge inline-flex items-center justify-center gap-1 px-3 py-1 rounded-full text-[13px] font-bold bg-[#FF2D78] text-white shadow-[0_2px_10px_rgba(255,45,120,0.4)] whitespace-nowrap min-w-fit leading-none" 
      dir={lang === "ar" ? "rtl" : "ltr"}
      style={{ isolation: 'isolate', flexWrap: 'nowrap' }}
    >
      {lang === "ar" ? (
        <div className="flex items-center gap-1" style={{ flexDirection: 'row-reverse' }}>
          <span className="opacity-90 inline-block">خصم</span>
          <span className="text-[1.1em] inline-block leading-none">{value}%</span>
        </div>
      ) : (
        <>
          <span className="text-[1.1em] inline-block align-middle leading-none">{value}%</span>
          <span className="opacity-90 inline-block align-middle">OFF</span>
        </>
      )}
    </span>
  );
}
