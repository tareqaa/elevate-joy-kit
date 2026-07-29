import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tag, Search, Save, RotateCcw, Copy, Check } from "lucide-react";
import {
  listPriceRows,
  applyCatalogPrices,
  cacheCatalogPrices,
  CATALOG_PRICES_KEY,
  type CatalogPrices,
} from "@/lib/gx/catalog-prices";

const css = `
.gx-cp-wrap{background:linear-gradient(180deg,rgba(16,24,32,.85),rgba(10,15,22,.9));border:1px solid rgba(0,229,255,.14);border-radius:16px;padding:16px}
.gx-cp-in{width:110px;padding:7px 9px;border-radius:9px;background:rgba(0,0,0,.4);border:1px solid rgba(0,229,255,.18);color:#e6f7ff;font-size:13px;font-family:ui-monospace,monospace}
.gx-cp-in:focus{outline:none;border-color:rgba(0,229,255,.55)}
.gx-cp-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:9px 10px;border-radius:11px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.05)}
.gx-cp-row+.gx-cp-row{margin-top:6px}
.gx-cp-code{font-family:ui-monospace,monospace;font-size:11.5px;font-weight:800;color:#00e5ff;background:rgba(0,229,255,.1);border:1px dashed rgba(0,229,255,.35);border-radius:8px;padding:3px 8px;cursor:pointer}
.gx-cp-grp{font-size:12px;font-weight:800;color:#a3b6c9;margin:14px 0 7px}
`;

type Draft = Record<string, { price: string; oldPrice: string }>;

export function CatalogPrices() {
  const rows = useMemo(() => listPriceRows(), []);
  const [map, setMap] = useState<CatalogPrices>({});
  const [draft, setDraft] = useState<Draft>({});
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_settings").select("value").eq("key", CATALOG_PRICES_KEY).maybeSingle();
      const v = (data?.value as CatalogPrices) || {};
      setMap(v && typeof v === "object" ? v : {});
    })().catch(() => {});
  }, []);

  const value = (code: string, field: "price" | "oldPrice") => {
    const d = draft[code]?.[field];
    if (d !== undefined) return d;
    const row = rows.find((r) => r.code === code)!;
    const o = map[code];
    if (field === "price") return String(o?.price ?? row.basePrice);
    const old = o && "oldPrice" in o ? o.oldPrice : row.baseOldPrice;
    return old == null ? "" : String(old);
  };

  const setField = (code: string, field: "price" | "oldPrice", v: string) =>
    setDraft((d) => {
      const base = d[code] ?? { price: value(code, "price"), oldPrice: value(code, "oldPrice") };
      return { ...d, [code]: { ...base, [field]: v } };
    });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      r.code.toLowerCase().includes(s) ||
      r.productName.toLowerCase().includes(s) ||
      r.label.toLowerCase().includes(s) ||
      r.productSlug.toLowerCase().includes(s));
  }, [rows, search]);

  const grouped = useMemo(() => {
    const g = new Map<string, typeof rows>();
    for (const r of filtered) {
      const key = `${r.productName} — ${r.group}`;
      if (!g.has(key)) g.set(key, []);
      g.get(key)!.push(r);
    }
    return Array.from(g.entries());
  }, [filtered]);

  const dirty = Object.keys(draft).length;

  async function save() {
    setSaving(true);
    const next: CatalogPrices = { ...map };
    for (const [code, d] of Object.entries(draft)) {
      const row = rows.find((r) => r.code === code);
      if (!row) continue;
      const price = Number(d.price);
      const old = d.oldPrice.trim() === "" ? null : Number(d.oldPrice);
      if (!Number.isFinite(price) || price < 0) { toast.error(`سعر غير صالح: ${code}`); setSaving(false); return; }
      next[code] = { price, oldPrice: old != null && Number.isFinite(old) && old > 0 ? old : null };
    }
    const { error } = await supabase.from("site_settings")
      .upsert({ key: CATALOG_PRICES_KEY, value: next as never }, { onConflict: "key" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setMap(next);
    setDraft({});
    applyCatalogPrices(next);
    cacheCatalogPrices(next);
    toast.success("تم حفظ الأسعار — انعكست على المتجر والسلة مباشرة");
  }

  function resetRow(code: string) {
    const next = { ...map };
    delete next[code];
    setMap(next);
    setDraft((d) => { const n = { ...d }; delete n[code]; return n; });
    supabase.from("site_settings")
      .upsert({ key: CATALOG_PRICES_KEY, value: next as never }, { onConflict: "key" })
      .then(({ error }) => {
        if (error) { toast.error(error.message); return; }
        applyCatalogPrices(next);
        cacheCatalogPrices(next);
        toast.success("رجّعنا السعر الأصلي");
      });
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(null), 1200);
    } catch { /* noop */ }
  }

  return (
    <div className="gx-cp-wrap" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-lg font-bold text-cyan-100 flex items-center gap-2">
            <Tag size={18} className="text-cyan-400" /> أسعار المتجر الحيّة
          </div>
          <div className="text-xs text-slate-400 mt-1">
            عدّل السعر أو السعر المشطوب — يتحدّث فوراً بالصفحات والسلة لكل المستخدمين. كود كل منتج يُستخدم بالكوبونات.
          </div>
        </div>
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-slate-950 font-bold text-sm disabled:opacity-40"
        >
          <Save size={15} /> {saving ? "جاري الحفظ..." : dirty ? `حفظ (${dirty})` : "لا تغييرات"}
        </button>
      </div>

      <div className="relative mt-3">
        <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400/70" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث باسم المنتج أو الكود"
          className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-black/35 border border-cyan-500/20 text-cyan-50 text-sm outline-none"
        />
      </div>

      <div className="mt-2 max-h-[520px] overflow-auto pl-1">
        {grouped.map(([title, list]) => (
          <div key={title}>
            <div className="gx-cp-grp">{title}</div>
            {list.map((r) => (
              <div key={r.code} className="gx-cp-row">
                <span className="gx-cp-code" onClick={() => copyCode(r.code)} title="نسخ الكود">
                  {copied === r.code ? <Check size={11} className="inline" /> : <Copy size={11} className="inline" />} {r.code}
                </span>
                <span className="text-sm text-slate-200 font-bold flex-1 min-w-[120px]">{r.label}</span>
                <label className="text-[11px] text-slate-400">السعر
                  <input className="gx-cp-in mr-2" type="number" step="0.01"
                    value={value(r.code, "price")}
                    onChange={(e) => setField(r.code, "price", e.target.value)} />
                </label>
                <label className="text-[11px] text-slate-400">المشطوب
                  <input className="gx-cp-in mr-2" type="number" step="0.01" placeholder="—"
                    value={value(r.code, "oldPrice")}
                    onChange={(e) => setField(r.code, "oldPrice", e.target.value)} />
                </label>
                {map[r.code] && (
                  <button onClick={() => resetRow(r.code)} title="استعادة السعر الأصلي"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10">
                    <RotateCcw size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        ))}
        {grouped.length === 0 && <div className="text-center text-slate-500 text-sm py-8">لا نتائج</div>}
      </div>
    </div>
  );
}
