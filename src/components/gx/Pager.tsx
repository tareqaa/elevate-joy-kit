import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Simple client-side pagination hook + UI, RTL-friendly. */
export function usePager<T>(items: T[], initialSize = 10, resetKey?: unknown) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(initialSize);

  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / size));

  useEffect(() => { setPage(1); }, [resetKey, size]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

  const slice = useMemo(() => items.slice((page - 1) * size, (page - 1) * size + size), [items, page, size]);

  return { page, setPage, size, setSize, total, pageCount, slice };
}

export function Pager({
  page, pageCount, total, size, onPage, onSize,
  sizes = [5, 10, 20, 50],
  className = "",
  lang = "ar",
}: {
  page: number;
  pageCount: number;
  total: number;
  size: number;
  onPage: (p: number) => void;
  onSize?: (s: number) => void;
  sizes?: number[];
  className?: string;
  lang?: "ar" | "en";
}) {
  if (total === 0) return null;
  const ar = lang === "ar";
  const from = (page - 1) * size + 1;
  const to = Math.min(total, page * size);

  const pages: (number | "…")[] = [];
  for (let i = 1; i <= pageCount; i++) {
    if (i === 1 || i === pageCount || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }

  const btn =
    "min-w-8 h-8 px-2 rounded-lg border border-cyan-400/20 bg-white/[0.03] text-xs font-semibold text-foreground/80 hover:bg-cyan-400/10 hover:text-cyan-200 transition disabled:opacity-35 disabled:pointer-events-none inline-flex items-center justify-center gap-1";

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 pt-3 ${className}`}>
      <div className="text-[11px] text-muted-foreground">
        {ar ? `عرض ${from}–${to} من ${total}` : `Showing ${from}–${to} of ${total}`}
      </div>
      <div className="flex items-center gap-1.5">
        {onSize && (
          <select
            value={size}
            onChange={(e) => onSize(Number(e.target.value))}
            className="h-8 rounded-lg border border-cyan-400/20 bg-background/60 px-2 text-xs text-foreground/80"
            aria-label={ar ? "عدد العناصر بالصفحة" : "Items per page"}
          >
            {sizes.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
        <button type="button" className={btn} onClick={() => onPage(page - 1)} disabled={page <= 1}>
          <ChevronRight size={13} className={ar ? "" : "hidden"} />
          <ChevronLeft size={13} className={ar ? "hidden" : ""} />
          {ar ? "السابق" : "Prev"}
        </button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="px-1 text-xs text-muted-foreground">…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPage(p)}
              className={`${btn} ${p === page ? "!bg-cyan-400/20 !border-cyan-400/50 !text-cyan-200" : ""}`}
            >
              {p}
            </button>
          ),
        )}
        <button type="button" className={btn} onClick={() => onPage(page + 1)} disabled={page >= pageCount}>
          {ar ? "التالي" : "Next"}
          <ChevronLeft size={13} className={ar ? "" : "hidden"} />
          <ChevronRight size={13} className={ar ? "hidden" : ""} />
        </button>
      </div>
    </div>
  );
}
