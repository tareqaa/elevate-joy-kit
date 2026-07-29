import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tag, Search, Save, RotateCcw, Copy, Check, ChevronDown } from "lucide-react";
import {
  listPriceRows,
  applyCatalogPrices,
  cacheCatalogPrices,
  CATALOG_PRICES_KEY,
  type CatalogPrices,
  type PriceRow,
} from "@/lib/gx/catalog-prices";

const css = `
.gx-cp-wrap{background:linear-gradient(180deg,rgba(16,24,32,.85),rgba(10,15,22,.92));border:1px solid rgba(0,229,255,.14);border-radius:18px;overflow:hidden}
.gx-cp-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:16px 18px;border-bottom:1px solid rgba(255,255,255,.06)}
.gx-cp-tools{display:flex;gap:10px;flex-wrap:wrap;align-items:center;padding:12px 18px;background:rgba(0,0,0,.22);border-bottom:1px solid rgba(255,255,255,.05)}
.gx-cp-body{max-height:600px;overflow:auto;padding:12px 14px}
.gx-cp-prod{border:1px solid rgba(255,255,255,.07);border-radius:14px;background:rgba(0,0,0,.22);overflow:hidden}
.gx-cp-prod+.gx-cp-prod{margin-top:10px}
.gx-cp-prod-head{display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;background:rgba(0,229,255,.04);cursor:pointer;text-align:start}
.gx-cp-prod-head:hover{background:rgba(0,229,255,.08)}
.gx-cp-ava{width:42px;height:42px;border-radius:12px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;font-size:20px;background:rgba(0,229,255,.09);border:1px solid rgba(0,229,255,.18);overflow:hidden}
.gx-cp-ava img{width:100%;height:100%;object-fit:contain;padding:5px}
.gx-cp-chip{font-size:11px;font-weight:800;padding:3px 9px;border-radius:999px;border:1px solid rgba(0,229,255,.25);color:#8fe9ff;background:rgba(0,229,255,.08)}
.gx-cp-chip.warn{border-color:rgba(255,196,0,.3);color:#ffd166;background:rgba(255,196,0,.1)}
.gx-cp-grp{font-size:11.5px;font-weight:800;color:#7d92a8;padding:10px 14px 4px;letter-spacing:.2px}
.gx-cp-table{padding:0 10px 10px}
.gx-cp-th,.gx-cp-tr{display:grid;grid-template-columns:minmax(140px,1.4fr) 128px 128px 74px 36px;gap:10px;align-items:center;padding:8px 10px}
.gx-cp-th{font-size:11px;color:#6e849a;font-weight:700;padding-bottom:2px}
.gx-cp-tr{border-radius:11px;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.05)}
.gx-cp-tr+.gx-cp-tr{margin-top:6px}
.gx-cp-tr.edited{border-color:rgba(0,229,255,.35);background:rgba(0,229,255,.06)}
.gx-cp-label{font-size:13.5px;font-weight:800;color:#e6f7ff;display:flex;flex-direction:column;gap:4px;min-width:0}
.gx-cp-code{font-family:ui-monospace,monospace;font-size:10.5px;font-weight:700;color:#00e5ff;background:rgba(0,229,255,.09);border:1px dashed rgba(0,229,255,.3);border-radius:7px;padding:2px 7px;cursor:pointer;width:fit-content;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gx-cp-in{width:100%;padding:8px 10px;border-radius:10px;background:rgba(0,0,0,.45);border:1px solid rgba(0,229,255,.16);color:#e6f7ff;font-size:13px;font-family:ui-monospace,monospace}
.gx-cp-in:focus{outline:none;border-color:rgba(0,229,255,.55);box-shadow:0 0 0 3px rgba(0,229,255,.12)}
.gx-cp-in.old{color:#93a7bb}
.gx-cp-off{font-size:11px;font-weight:800;color:#6ee7b7;background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.25);border-radius:8px;padding:4px 6px;text-align:center}
.gx-cp-off.none{color:#5b6b7c;background:transparent;border-color:transparent}
@media(max-width:760px){.gx-cp-th{display:none}.gx-cp-tr{grid-template-columns:1fr 1fr;gap:8px}}
`;

type Draft = Record<string, { price: string; oldPrice: string }>;

export function CatalogPrices() {
  const rows = useMemo(() => listPriceRows(), []);
  const [map, setMap] = useState<CatalogPrices>({});
  const [draft, setDraft] = useState<Draft>({});
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<"all" | "plan" | "giftcard">("all");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

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
    return rows.filter((r) => {
      if (kind !== "all" && r.productKind !== kind) return false;
      if (!s) return true;
      return r.code.toLowerCase().includes(s) ||
        r.productName.toLowerCase().includes(s) ||
        r.label.toLowerCase().includes(s) ||
        r.productSlug.toLowerCase().includes(s);
    });
  }, [rows, search, kind]);

  // Product → groups → rows
  const products = useMemo(() => {
    const byProduct = new Map<string, { row: PriceRow; groups: Map<string, PriceRow[]> }>();
    for (const r of filtered) {
      let p = byProduct.get(r.productSlug);
      if (!p) { p = { row: r, groups: new Map() }; byProduct.set(r.productSlug, p); }
      if (!p.groups.has(r.group)) p.groups.set(r.group, []);
      p.groups.get(r.group)!.push(r);
    }
    return Array.from(byProduct.entries());
  }, [filtered]);

  const dirty = Object.keys(draft).length;
  const overridden = Object.keys(map).length;

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

  function discount(code: string) {
    const p = Number(value(code, "price"));
    const o = Number(value(code, "oldPrice"));
    if (!Number.isFinite(p) || !Number.isFinite(o) || o <= p || o <= 0) return null;
    return Math.round(((o - p) / o) * 100);
  }

  return (
    <div className="gx-cp-wrap" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="gx-cp-head">
        <div>
          <div className="text-base font-bold text-cyan-100 flex items-center gap-2">
            <Tag size={17} className="text-cyan-400" /> أسعار المتجر الحيّة
          </div>
          <div className="text-xs text-slate-400 mt-1">
            عدّل السعر أو المشطوب — ينعكس فوراً بالصفحات والسلة. الكود يُستخدم بالكوبونات.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="gx-cp-chip">{rows.length} سعر</span>
          {overridden > 0 && <span className="gx-cp-chip warn">{overridden} معدّل</span>}
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-slate-950 font-bold text-sm disabled:opacity-40"
          >
            <Save size={15} /> {saving ? "جاري الحفظ..." : dirty ? `حفظ (${dirty})` : "لا تغييرات"}
          </button>
        </div>
      </div>

      <div className="gx-cp-tools">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400/70" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم المنتج أو المدة أو الكود"
            className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-black/35 border border-cyan-500/20 text-cyan-50 text-sm outline-none"
          />
        </div>
        {([["all", "الكل"], ["plan", "اشتراكات"], ["giftcard", "بطاقات هدايا"]] as const).map(([k, lbl]) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
              kind === k
                ? "bg-cyan-500/15 border-cyan-400/40 text-cyan-200"
                : "bg-transparent border-white/10 text-slate-400 hover:text-cyan-200"
            }`}
          >{lbl}</button>
        ))}
      </div>

      <div className="gx-cp-body">
        {products.map(([slug, p]) => {
          const total = Array.from(p.groups.values()).reduce((n, l) => n + l.length, 0);
          const isOpen = !collapsed[slug];
          const edits = Array.from(p.groups.values()).flat().filter((r) => map[r.code]).length;
          return (
            <div key={slug} className="gx-cp-prod">
              <button className="gx-cp-prod-head" onClick={() => setCollapsed((c) => ({ ...c, [slug]: isOpen }))}>
                <span className="gx-cp-ava">
                  {p.row.productImg ? <img src={p.row.productImg} alt="" /> : p.row.productIcon}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-extrabold text-cyan-50 truncate">{p.row.productName}</span>
                  <span className="block text-[11px] text-slate-500 font-mono truncate">{slug}</span>
                </span>
                <span className="gx-cp-chip">{total} سعر</span>
                {edits > 0 && <span className="gx-cp-chip warn">{edits} معدّل</span>}
                <ChevronDown size={16} className={`text-cyan-300/70 transition ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {isOpen && Array.from(p.groups.entries()).map(([group, list]) => (
                <div key={group}>
                  <div className="gx-cp-grp">{group}</div>
                  <div className="gx-cp-table">
                    <div className="gx-cp-th">
                      <span>المدة / الفئة</span><span>السعر (د.أ)</span><span>المشطوب</span><span>الخصم</span><span />
                    </div>
                    {list.map((r) => {
                      const off = discount(r.code);
                      return (
                        <div key={r.code} className={`gx-cp-tr ${draft[r.code] ? "edited" : ""}`}>
                          <span className="gx-cp-label">
                            <span className="truncate">{r.label}</span>
                            <span className="gx-cp-code" onClick={() => copyCode(r.code)} title="نسخ الكود">
                              {copied === r.code ? <Check size={10} className="inline" /> : <Copy size={10} className="inline" />} {r.code}
                            </span>
                          </span>
                          <input className="gx-cp-in" type="number" step="0.01"
                            value={value(r.code, "price")}
                            onChange={(e) => setField(r.code, "price", e.target.value)} />
                          <input className="gx-cp-in old" type="number" step="0.01" placeholder="—"
                            value={value(r.code, "oldPrice")}
                            onChange={(e) => setField(r.code, "oldPrice", e.target.value)} />
                          <span className={`gx-cp-off ${off == null ? "none" : ""}`}>{off == null ? "—" : `${off}%-`}</span>
                          {map[r.code] ? (
                            <button onClick={() => resetRow(r.code)} title="استعادة السعر الأصلي"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10">
                              <RotateCcw size={14} />
                            </button>
                          ) : <span />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
        {products.length === 0 && <div className="text-center text-slate-500 text-sm py-10">لا نتائج</div>}
      </div>
    </div>
  );
}
