import { useLang } from "@/lib/gx/i18n";

/** Discount badge with plain-text wording (no minus sign) so it reads
 *  correctly in both RTL and LTR: "خصم 25%" / "25% OFF". */
export function DiscountBadge({ value }: { value: number }) {
  const { lang } = useLang();
  if (!value || value <= 0) return null;
  return (
    <span 
      className="discount-badge inline-flex items-center justify-center gap-1 px-3 py-1 rounded-full text-[13px] font-bold bg-[#FF2D78] text-white shadow-[0_2px_10px_rgba(255,45,120,0.4)] whitespace-nowrap min-w-fit leading-none" 
      dir="ltr"
    >
      <span className="text-[1.15em] tracking-tight">{value}%</span>
      <span className="opacity-90 text-[11px] uppercase tracking-wide">
        {lang === "ar" ? "خصم" : "OFF"}
      </span>
    </span>
  );
}
