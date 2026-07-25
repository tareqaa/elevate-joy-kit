import { useCurrency } from "@/lib/gx/currency";

export function PriceRow({ price, oldPrice }: { price: number; oldPrice?: number }) {
  const { format } = useCurrency();
  return (
    <div className="prod-prices">
      {oldPrice ? <span className="prod-old">{format(oldPrice)}</span> : null}
      <span className="prod-new">{format(price)}</span>
    </div>
  );
}
