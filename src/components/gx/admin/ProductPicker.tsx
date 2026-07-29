import { useEffect, useMemo, useState } from "react";
import { Search, Check } from "lucide-react";
import { PRODUCTS_CATALOG, GIFT_CARDS_CATALOG } from "@/data/products";
import { supabase } from "@/integrations/supabase/client";

type Item = { slug: string; name: string; kind: string; sku?: string };

const css = `
.gx-pp{border:1px solid rgba(0,229,255,.18);border-radius:12px;background:rgba(0,0,0,.28);padding:8px}
.gx-pp-list{max-height:240px;overflow:auto;margin-top:7px;display:grid;gap:5px}
.gx-pp-it{display:flex;align-items:center;gap:9px;padding:7px 9px;border-radius:9px;background:rgba(255,255,255,.03);border:1px solid transparent;cursor:pointer;text-align:right}
.gx-pp-it:hover{background:rgba(0,229,255,.07)}
.gx-pp-it.on{border-color:rgba(0,229,255,.5);background:rgba(0,229,255,.12)}
.gx-pp-box{width:17px;height:17px;border-radius:5px;border:1.5px solid rgba(0,229,255,.45);display:grid;place-items:center;flex:0 0 auto}
.gx-pp-slug{font-family:ui-monospace,monospace;font-size:11px;color:#7fe9ff;opacity:.85}
.gx-pp-sku{font-family:ui-monospace,monospace;font-size:11px;font-weight:800;color:#c7a4ff;background:rgba(162,89,255,.12);border:1px solid rgba(162,89,255,.3);padding:1px 6px;border-radius:6px}
.gx-pp-src{width:100%;padding:7px 9px;border-radius:9px;background:rgba(0,0,0,.4);border:1px solid rgba(0,229,255,.18);color:#e6f7ff;font-size:12.5px;outline:none}
`;

export function ProductPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const [skus, setSkus] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.from("products").select("slug, sku");
      if (!alive || !data) return;
      const map: Record<string, string> = {};
      for (const r of data) if (r.sku) map[r.slug] = r.sku;
      setSkus(map);
    })();
    return () => { alive = false; };
  }, []);

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (const slug in PRODUCTS_CATALOG) out.push({ slug, name: PRODUCTS_CATALOG[slug].name, kind: "منتج", sku: skus[slug] });
    for (const slug in GIFT_CARDS_CATALOG) out.push({ slug, name: GIFT_CARDS_CATALOG[slug].name, kind: "بطاقة", sku: skus[slug] });
    return out;
  }, [skus]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((i) => i.slug.toLowerCase().includes(s) || i.name.toLowerCase().includes(s) || (i.sku || "").toLowerCase().includes(s));
  }, [items, q]);

  function toggle(slug: string) {
    onChange(selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug]);
  }

  return (
    <div className="gx-pp" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="relative">
        <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-cyan-400/70" />
        <input className="gx-pp-src pr-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو المعرّف أو رقم المنتج (SKU)" />
      </div>
      <div className="gx-pp-list">
        {filtered.map((i) => {
          const on = selected.includes(i.slug);
          return (
            <button type="button" key={i.slug} className={`gx-pp-it ${on ? "on" : ""}`} onClick={() => toggle(i.slug)}>
              <span className="gx-pp-box">{on && <Check size={12} className="text-cyan-300" />}</span>
              <span className="flex-1 text-sm text-slate-100 font-bold">{i.name}</span>
              {i.sku && <span className="gx-pp-sku">{i.sku}</span>}
              <span className="gx-pp-slug">{i.slug}</span>
              <span className="text-[10px] text-slate-400">{i.kind}</span>
            </button>
          );
        })}
        {filtered.length === 0 && <div className="text-center text-slate-500 text-xs py-4">لا نتائج</div>}
      </div>
      {selected.length > 0 && (
        <div className="text-[11px] text-cyan-300/80 mt-2">مختار: {selected.length} منتج</div>
      )}
    </div>
  );
}
