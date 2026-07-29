import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { FolderTree, Plus, Pencil, Trash2, Eye, EyeOff, ChevronDown, ChevronLeft, Home, Palette } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  head: () => ({ meta: [{ title: "الأقسام — لوحة التحكم" }] }),
  component: CategoriesAdmin,
});

type Category = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  icon_url: string | null;
  sort_order: number;
  is_active: boolean;
  parent_id: string | null;
  is_main: boolean;
  accent_color: string | null;
  theme_gradient: string | null;
  description_ar: string | null;
  description_en: string | null;
};

const PRESET_GRADIENTS = [
  { label: "سماوي", value: "linear-gradient(135deg,#00e5ff,#0091ff)" },
  { label: "بنفسجي", value: "linear-gradient(135deg,#8b5cf6,#ec4899)" },
  { label: "ذهبي", value: "linear-gradient(135deg,#f59e0b,#ef4444)" },
  { label: "أخضر", value: "linear-gradient(135deg,#10b981,#06b6d4)" },
  { label: "أزرق ملكي", value: "linear-gradient(135deg,#1e40af,#7c3aed)" },
  { label: "وردي", value: "linear-gradient(135deg,#f472b6,#a855f7)" },
];

const css = `
.gx-cats{color:#e6f7ff}
.gx-tree{display:flex;flex-direction:column;gap:6px}
.gx-row{background:linear-gradient(180deg,rgba(16,24,32,.85),rgba(10,15,22,.9));border:1px solid rgba(0,229,255,.15);border-radius:14px;transition:all .18s}
.gx-row:hover{border-color:rgba(0,229,255,.35)}
.gx-row.off{opacity:.55}
.gx-row-inner{display:flex;align-items:center;gap:10px;padding:10px 12px}
.gx-row-icon{width:40px;height:40px;border-radius:10px;background:rgba(0,229,255,.08);display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid rgba(0,229,255,.2);flex-shrink:0}
.gx-row-icon img{width:100%;height:100%;object-fit:cover}
.gx-row-title{font-weight:800;color:#e6f7ff;font-size:14px}
.gx-row-meta{font-size:11px;color:#7d92a8;font-family:ui-monospace,monospace;direction:ltr}
.gx-chip{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700}
.gx-chip.main{background:rgba(0,229,255,.15);color:#00e5ff;border:1px solid rgba(0,229,255,.35)}
.gx-chip.sub{background:rgba(139,92,246,.15);color:#c4b5fd;border:1px solid rgba(139,92,246,.35)}
.gx-swatch{width:18px;height:18px;border-radius:6px;border:1px solid rgba(255,255,255,.15);flex-shrink:0}
.gx-caret{background:none;border:none;color:#7d92a8;cursor:pointer;padding:4px;display:flex;align-items:center;transition:transform .15s}
.gx-caret.open{transform:rotate(90deg)}
.gx-caret[data-dir="ltr"].open{transform:rotate(90deg)}
.gx-children{padding-inline-start:28px;border-inline-start:2px dashed rgba(0,229,255,.15);margin-inline-start:14px}
.gx-btn{display:inline-flex;align-items:center;gap:5px;padding:6px 10px;border-radius:8px;font-size:11px;font-weight:600;cursor:pointer;transition:all .15s;border:1px solid transparent;white-space:nowrap}
.gx-btn.primary{background:linear-gradient(135deg,#00e5ff,#0091ff);color:#001018}
.gx-btn.primary:hover{box-shadow:0 4px 14px rgba(0,229,255,.35)}
.gx-btn.outline{border-color:rgba(0,229,255,.28);color:#00e5ff;background:transparent}
.gx-btn.outline:hover{background:rgba(0,229,255,.08)}
.gx-btn.danger{border-color:rgba(255,80,80,.35);color:#ff8080;background:transparent}
.gx-btn.danger:hover{background:rgba(255,80,80,.1)}
.gx-btn.ghost{color:#7d92a8;background:transparent}
.gx-btn.ghost:hover{color:#00e5ff;background:rgba(0,229,255,.05)}
.gx-adm-input{background:rgba(0,0,0,.35)!important;border:1px solid rgba(0,229,255,.18)!important;color:#e6f7ff!important;border-radius:10px!important;height:38px}
.gx-adm-input:focus-visible{outline:none;border-color:rgba(0,229,255,.55)!important;box-shadow:0 0 0 3px rgba(0,229,255,.15)!important}
.gx-grad-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.gx-grad{height:44px;border-radius:10px;cursor:pointer;border:2px solid transparent;position:relative;color:#001018;font-weight:800;font-size:11px;display:flex;align-items:center;justify-content:center;text-shadow:0 1px 2px rgba(255,255,255,.4)}
.gx-grad.selected{border-color:#00e5ff;box-shadow:0 0 0 3px rgba(0,229,255,.25)}
.gx-tabs{display:flex;gap:2px;background:rgba(0,0,0,.3);padding:4px;border-radius:10px;border:1px solid rgba(0,229,255,.15)}
.gx-tab{flex:1;padding:8px 12px;border-radius:7px;background:transparent;border:none;color:#7d92a8;font-weight:600;font-size:13px;cursor:pointer}
.gx-tab.active{background:rgba(0,229,255,.12);color:#00e5ff}
.gx-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
@media(max-width:760px){.gx-stats{grid-template-columns:repeat(2,1fr)}}
.gx-stat{background:linear-gradient(180deg,rgba(16,24,32,.85),rgba(10,15,22,.9));border:1px solid rgba(0,229,255,.15);border-radius:14px;padding:12px 14px}
.gx-stat b{display:block;font-size:22px;color:#00e5ff;line-height:1.2}
.gx-stat span{font-size:11px;color:#7d92a8;font-weight:700}
.gx-count{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;background:rgba(255,255,255,.06);color:#9fb4c7;border:1px solid rgba(255,255,255,.08)}
.gx-skel{height:62px;border-radius:14px;background:linear-gradient(90deg,rgba(255,255,255,.04),rgba(255,255,255,.09),rgba(255,255,255,.04));background-size:200% 100%;animation:gxsk 1.2s linear infinite}
@keyframes gxsk{0%{background-position:200% 0}100%{background-position:-200% 0}}
.gx-ord{display:flex;flex-direction:column;gap:2px}
.gx-ord button{background:rgba(0,229,255,.06);border:1px solid rgba(0,229,255,.18);color:#00e5ff;border-radius:6px;width:22px;height:16px;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0}
.gx-ord button:disabled{opacity:.25;cursor:not-allowed}
`;


function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .trim();
}

function CategoriesAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState<{ parentId: string | null } | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"tree" | "flat">("tree");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "hidden" | "main">("all");

  const q = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order")
        .order("name_ar");
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });

  const countsQ = useQuery({
    queryKey: ["admin-categories-product-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("category_id");
      if (error) throw error;
      const m: Record<string, number> = {};
      for (const r of (data ?? []) as { category_id: string | null }[]) {
        if (r.category_id) m[r.category_id] = (m[r.category_id] ?? 0) + 1;
      }
      return m;
    },
  });
  const counts = countsQ.data ?? {};

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["admin-categories"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("categories").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-categories"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const reorderMut = useMutation({
    mutationFn: async ({ a, b }: { a: Category; b: Category }) => {
      const aOrder = a.sort_order;
      const bOrder = b.sort_order === aOrder ? aOrder + 1 : b.sort_order;
      const r1 = await supabase.from("categories").update({ sort_order: bOrder }).eq("id", a.id);
      if (r1.error) throw r1.error;
      const r2 = await supabase.from("categories").update({ sort_order: aOrder }).eq("id", b.id);
      if (r2.error) throw r2.error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-categories"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicateMut = useMutation({
    mutationFn: async (c: Category) => {
      const { error } = await supabase.from("categories").insert({
        slug: `${c.slug}-copy-${Math.random().toString(36).slice(2, 6)}`,
        name_ar: `${c.name_ar} (نسخة)`,
        name_en: `${c.name_en} (copy)`,
        icon_url: c.icon_url,
        sort_order: c.sort_order + 1,
        is_active: false,
        parent_id: c.parent_id,
        is_main: false,
        accent_color: c.accent_color,
        theme_gradient: c.theme_gradient,
        description_ar: c.description_ar,
        description_en: c.description_en,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("تم إنشاء نسخة (مخفية)"); qc.invalidateQueries({ queryKey: ["admin-categories"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const all = q.data ?? [];

  const stats = useMemo(() => ({
    total: all.length,
    main: all.filter((c) => c.is_main).length,
    active: all.filter((c) => c.is_active).length,
    hidden: all.filter((c) => !c.is_active).length,
  }), [all]);

  const matches = useMemo(() => {
    const s = norm(search);
    return (c: Category) => {
      if (filter === "active" && !c.is_active) return false;
      if (filter === "hidden" && c.is_active) return false;
      if (filter === "main" && !c.is_main) return false;
      if (!s) return true;
      return norm(c.name_ar).includes(s) || norm(c.name_en).includes(s) || norm(c.slug).includes(s);
    };
  }, [search, filter]);

  const filteredFlat = useMemo(() => all.filter(matches), [all, matches]);

  // Keep ancestors of matched nodes visible in tree view
  const visibleIds = useMemo(() => {
    if (!search.trim() && filter === "all") return null;
    const byId = new Map(all.map((c) => [c.id, c]));
    const keep = new Set<string>();
    for (const c of filteredFlat) {
      let cur: Category | undefined = c;
      const guard = new Set<string>();
      while (cur && !guard.has(cur.id)) {
        guard.add(cur.id);
        keep.add(cur.id);
        cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
      }
    }
    return keep;
  }, [all, filteredFlat, search, filter]);

  const byParent = useMemo(() => {
    const map = new Map<string | "root", Category[]>();
    for (const c of all) {
      if (visibleIds && !visibleIds.has(c.id)) continue;
      const k = c.parent_id ?? "root";
      const arr = map.get(k) ?? [];
      arr.push(c);
      map.set(k, arr);
    }
    return map;
  }, [all, visibleIds]);

  const roots = byParent.get("root") ?? [];

  function toggle(id: string) {
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function move(node: Category, dir: -1 | 1) {
    const siblings = (all.filter((c) => (c.parent_id ?? null) === (node.parent_id ?? null)));
    const idx = siblings.findIndex((c) => c.id === node.id);
    const target = siblings[idx + dir];
    if (!target) return;
    reorderMut.mutate({ a: node, b: target });
  }

  function siblingBounds(node: Category) {
    const siblings = all.filter((c) => (c.parent_id ?? null) === (node.parent_id ?? null));
    const idx = siblings.findIndex((c) => c.id === node.id);
    return { first: idx <= 0, last: idx === siblings.length - 1 };
  }

  function expandAll() { setExpanded(new Set(all.map((c) => c.id))); }
  function collapseAll() { setExpanded(new Set()); }


  return (
    <div className="gx-cats space-y-4" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-cyan-100 flex items-center gap-2">
            <FolderTree size={22} className="text-cyan-400" /> الأقسام
          </h1>
          <p className="text-sm text-cyan-100/60 mt-1">
            بنية هرمية حتى 3 مستويات — قسم رئيسي (يظهر بالواجهة) → فرعي → فرعي داخلي. اختر ثيماً ولوناً لكل قسم.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tab === "tree" && (
            <>
              <button className="gx-btn ghost" onClick={expandAll}>توسيع الكل</button>
              <button className="gx-btn ghost" onClick={collapseAll}>طيّ الكل</button>
            </>
          )}
          <button className="gx-btn primary" onClick={() => setCreating({ parentId: null })}>
            <Plus size={13} /> قسم رئيسي جديد
          </button>
        </div>
      </div>

      <div className="gx-stats">
        <div className="gx-stat"><b>{stats.total}</b><span>إجمالي الأقسام</span></div>
        <div className="gx-stat"><b>{stats.main}</b><span>أقسام رئيسية بالواجهة</span></div>
        <div className="gx-stat"><b>{stats.active}</b><span>مفعّلة</span></div>
        <div className="gx-stat"><b>{stats.hidden}</b><span>مخفية</span></div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="gx-tabs" style={{ maxWidth: 260 }}>
          <button className={`gx-tab ${tab === "tree" ? "active" : ""}`} onClick={() => setTab("tree")}>عرض شجري</button>
          <button className={`gx-tab ${tab === "flat" ? "active" : ""}`} onClick={() => setTab("flat")}>عرض كامل</button>
        </div>
        <div className="gx-tabs" style={{ maxWidth: 380 }}>
          {([["all", "الكل"], ["active", "مفعّلة"], ["hidden", "مخفية"], ["main", "رئيسية"]] as const).map(([k, label]) => (
            <button key={k} className={`gx-tab ${filter === k ? "active" : ""}`} onClick={() => setFilter(k)}>{label}</button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute top-1/2 -translate-y-1/2 right-3 text-cyan-100/40" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو المعرّف..."
            className="gx-adm-input"
            style={{ paddingInlineStart: 34 }}
          />
        </div>
      </div>

      {q.isLoading ? (
        <div className="gx-tree">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="gx-skel" />)}
        </div>
      ) : all.length === 0 ? (
        <div className="text-center py-20 text-cyan-100/60">
          <FolderTree size={48} className="mx-auto opacity-30 mb-3" />
          <p>لا يوجد أقسام بعد. ابدأ بإضافة قسم رئيسي.</p>
        </div>
      ) : (tab === "tree" ? roots.length === 0 : filteredFlat.length === 0) ? (
        <div className="text-center py-16 text-cyan-100/60">لا توجد نتائج مطابقة.</div>
      ) : tab === "tree" ? (
        <div className="gx-tree">
          {roots.map((c) => (
            <TreeNode
              key={c.id}
              node={c}
              byParent={byParent}
              expanded={expanded}
              counts={counts}
              onToggle={toggle}
              onEdit={setEditing}
              onAddChild={(parentId) => setCreating({ parentId })}
              onDelete={(id, name) => { if (confirm(`حذف "${name}" وكل الأقسام الفرعية داخله؟`)) deleteMut.mutate(id); }}
              onToggleActive={(id, next) => toggleMut.mutate({ id, is_active: next })}
              onDuplicate={(n) => duplicateMut.mutate(n)}
              onMove={move}
              bounds={siblingBounds}
              depth={0}
            />
          ))}
        </div>
      ) : (
        <div className="gx-tree">
          {filteredFlat.map((c) => (
            <FlatRow
              key={c.id}
              node={c}
              count={counts[c.id] ?? 0}
              parent={all.find((x) => x.id === c.parent_id) ?? null}
              onEdit={setEditing}
              onDelete={(id, name) => { if (confirm(`حذف "${name}"؟`)) deleteMut.mutate(id); }}
              onToggleActive={(id, next) => toggleMut.mutate({ id, is_active: next })}
              onDuplicate={(n) => duplicateMut.mutate(n)}
            />
          ))}
        </div>

      )}

      {(editing || creating) && (
        <CategoryDialog
          category={editing}
          defaultParentId={creating?.parentId ?? null}
          allCategories={all}
          onClose={() => { setEditing(null); setCreating(null); }}
          onSaved={() => { setEditing(null); setCreating(null); qc.invalidateQueries({ queryKey: ["admin-categories"] }); }}
        />
      )}
    </div>
  );
}

function TreeNode({
  node, byParent, expanded, counts, onToggle, onEdit, onAddChild, onDelete, onToggleActive, onDuplicate, onMove, bounds, depth,
}: {
  node: Category;
  byParent: Map<string | "root", Category[]>;
  expanded: Set<string>;
  counts: Record<string, number>;
  onToggle: (id: string) => void;
  onEdit: (c: Category) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (id: string, name: string) => void;
  onToggleActive: (id: string, next: boolean) => void;
  onDuplicate: (c: Category) => void;
  onMove: (c: Category, dir: -1 | 1) => void;
  bounds: (c: Category) => { first: boolean; last: boolean };
  depth: number;
}) {
  const children = byParent.get(node.id) ?? [];
  const isOpen = expanded.has(node.id);
  const canHaveChildren = depth < 2;
  const b = bounds(node);
  const productCount = counts[node.id] ?? 0;

  return (
    <div>
      <div className={`gx-row ${node.is_active ? "" : "off"}`}>
        <div className="gx-row-inner">
          <div className="gx-ord">
            <button disabled={b.first} onClick={() => onMove(node, -1)} title="تقديم"><ChevronUp size={11} /></button>
            <button disabled={b.last} onClick={() => onMove(node, 1)} title="تأخير"><ChevronDown size={11} /></button>
          </div>

          {children.length > 0 ? (
            <button className={`gx-caret ${isOpen ? "open" : ""}`} data-dir="rtl" onClick={() => onToggle(node.id)} aria-label="فتح">
              <ChevronLeft size={16} />
            </button>
          ) : (
            <span style={{ width: 24 }} />
          )}

          <div className="gx-swatch" style={{ background: node.theme_gradient || node.accent_color || "rgba(0,229,255,.15)" }} />

          <div className="gx-row-icon">
            {node.icon_url ? <img src={node.icon_url} alt="" /> : <FolderTree size={18} className="text-cyan-400/70" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="gx-row-title">{node.name_ar}</span>
              <span className="text-xs text-cyan-100/60">— {node.name_en}</span>
              {node.is_main && <span className="gx-chip main"><Home size={9} /> رئيسي بالواجهة</span>}
              {depth > 0 && <span className="gx-chip sub">L{depth + 1}</span>}
              <span className="gx-count"><Package size={9} /> {productCount} منتج</span>
              {children.length > 0 && <span className="gx-count"><FolderTree size={9} /> {children.length} فرعي</span>}
            </div>
            <div className="gx-row-meta">/{node.slug} · ترتيب: {node.sort_order}</div>
          </div>

          <div className="flex items-center gap-1">
            {canHaveChildren && (
              <button className="gx-btn outline" onClick={() => onAddChild(node.id)} title="إضافة قسم فرعي">
                <Plus size={11} /> فرعي
              </button>
            )}
            <button className="gx-btn outline" onClick={() => onEdit(node)} title="تعديل"><Pencil size={11} /></button>
            <button className="gx-btn ghost" onClick={() => onDuplicate(node)} title="نسخ"><Copy size={11} /></button>
            <button className="gx-btn outline" onClick={() => onToggleActive(node.id, !node.is_active)} title={node.is_active ? "إخفاء" : "إظهار"}>
              {node.is_active ? <Eye size={11} /> : <EyeOff size={11} />}
            </button>
            <button className="gx-btn danger" onClick={() => onDelete(node.id, node.name_ar)} title="حذف"><Trash2 size={11} /></button>
          </div>
        </div>
      </div>

      {isOpen && children.length > 0 && (
        <div className="gx-children mt-1.5 space-y-1.5">
          {children.map((c) => (
            <TreeNode
              key={c.id} node={c} byParent={byParent} expanded={expanded} counts={counts}
              onToggle={onToggle} onEdit={onEdit} onAddChild={onAddChild}
              onDelete={onDelete} onToggleActive={onToggleActive}
              onDuplicate={onDuplicate} onMove={onMove} bounds={bounds} depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}


function FlatRow({
  node, parent, onEdit, onDelete, onToggleActive,
}: {
  node: Category;
  parent: Category | null;
  onEdit: (c: Category) => void;
  onDelete: (id: string, name: string) => void;
  onToggleActive: (id: string, next: boolean) => void;
}) {
  return (
    <div className={`gx-row ${node.is_active ? "" : "off"}`}>
      <div className="gx-row-inner">
        <div className="gx-swatch" style={{ background: node.theme_gradient || node.accent_color || "rgba(0,229,255,.15)" }} />
        <div className="gx-row-icon">
          {node.icon_url ? <img src={node.icon_url} alt="" /> : <FolderTree size={18} className="text-cyan-400/70" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {parent && <span className="text-xs text-cyan-100/50">{parent.name_ar} ›</span>}
            <span className="gx-row-title">{node.name_ar}</span>
            {node.is_main && <span className="gx-chip main"><Home size={9} /> رئيسي</span>}
          </div>
          <div className="gx-row-meta">/{node.slug}</div>
        </div>
        <div className="flex items-center gap-1">
          <button className="gx-btn outline" onClick={() => onEdit(node)}><Pencil size={11} /></button>
          <button className="gx-btn outline" onClick={() => onToggleActive(node.id, !node.is_active)}>
            {node.is_active ? <Eye size={11} /> : <EyeOff size={11} />}
          </button>
          <button className="gx-btn danger" onClick={() => onDelete(node.id, node.name_ar)}><Trash2 size={11} /></button>
        </div>
      </div>
    </div>
  );
}

function pathOf(cat: Category, all: Category[]): string {
  const path: string[] = [];
  let cur: Category | undefined = cat;
  const guard = new Set<string>();
  while (cur && !guard.has(cur.id)) {
    guard.add(cur.id);
    path.unshift(cur.name_ar);
    cur = cur.parent_id ? all.find((x) => x.id === cur!.parent_id) : undefined;
  }
  return path.join(" › ");
}

function depthOf(catId: string | null, all: Category[]): number {
  if (!catId) return 0;
  let d = 0;
  let cur = all.find((x) => x.id === catId);
  const guard = new Set<string>();
  while (cur && cur.parent_id && !guard.has(cur.id)) {
    guard.add(cur.id);
    d += 1;
    cur = all.find((x) => x.id === cur!.parent_id);
  }
  return d;
}

function CategoryDialog({
  category, defaultParentId, allCategories, onClose, onSaved,
}: {
  category: Category | null;
  defaultParentId: string | null;
  allCategories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nameAr, setNameAr] = useState(category?.name_ar ?? "");
  const [nameEn, setNameEn] = useState(category?.name_en ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [iconUrl, setIconUrl] = useState(category?.icon_url ?? "");
  const [sortOrder, setSortOrder] = useState<number>(category?.sort_order ?? 0);
  const [isActive, setIsActive] = useState<boolean>(category?.is_active ?? true);
  const [parentId, setParentId] = useState<string>(category?.parent_id ?? defaultParentId ?? "__root__");
  const [isMain, setIsMain] = useState<boolean>(category?.is_main ?? (defaultParentId === null && !category));
  const [accentColor, setAccentColor] = useState<string>(category?.accent_color ?? "#00e5ff");
  const [themeGradient, setThemeGradient] = useState<string>(category?.theme_gradient ?? PRESET_GRADIENTS[0].value);
  const [descAr, setDescAr] = useState(category?.description_ar ?? "");
  const [descEn, setDescEn] = useState(category?.description_en ?? "");
  const [saving, setSaving] = useState(false);

  // Prevent picking self or descendant as parent when editing
  const forbiddenIds = useMemo(() => {
    if (!category) return new Set<string>();
    const s = new Set<string>([category.id]);
    let added = true;
    while (added) {
      added = false;
      for (const c of allCategories) {
        if (c.parent_id && s.has(c.parent_id) && !s.has(c.id)) { s.add(c.id); added = true; }
      }
    }
    return s;
  }, [category, allCategories]);

  const parentDepth = parentId === "__root__" ? -1 : depthOf(parentId, allCategories);
  const finalDepth = parentDepth + 1;
  const parentsAvailable = allCategories.filter((c) => !forbiddenIds.has(c.id) && depthOf(c.id, allCategories) < 2);

  async function save() {
    if (!nameAr.trim() || !nameEn.trim()) { toast.error("الاسم بالعربي والإنجليزي مطلوبين"); return; }
    const finalSlug = slug.trim() || slugify(nameEn);
    if (!finalSlug) { toast.error("المعرّف (slug) مطلوب"); return; }
    if (finalDepth > 2) { toast.error("لا يمكن إنشاء أكثر من 3 مستويات"); return; }
    setSaving(true);
    try {
      const payload = {
        slug: finalSlug,
        name_ar: nameAr.trim(),
        name_en: nameEn.trim(),
        icon_url: iconUrl.trim() || null,
        sort_order: sortOrder,
        is_active: isActive,
        parent_id: parentId === "__root__" ? null : parentId,
        is_main: parentId === "__root__" ? isMain : false,
        accent_color: accentColor || null,
        theme_gradient: themeGradient || null,
        description_ar: descAr.trim() || null,
        description_en: descEn.trim() || null,
      };
      if (category) {
        const { error } = await supabase.from("categories").update(payload).eq("id", category.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert(payload);
        if (error) throw error;
      }
      toast.success(category ? "تم التحديث" : "تمت الإضافة");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  }

  async function upload(file: File) {
    const ext = file.name.split(".").pop();
    const path = `categories/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    setIconUrl(data.publicUrl);
    toast.success("تم رفع الأيقونة");
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{category ? "تعديل قسم" : parentId === "__root__" ? "قسم رئيسي جديد" : "قسم فرعي جديد"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Names */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>الاسم (عربي)</Label>
              <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="gx-adm-input" placeholder="الألعاب" />
            </div>
            <div>
              <Label>الاسم (English)</Label>
              <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="gx-adm-input" dir="ltr" placeholder="Games" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>المعرّف (slug)</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={slugify(nameEn) || "games"} className="gx-adm-input" dir="ltr" />
            </div>
            <div>
              <Label>القسم الأب</Label>
              <Select value={parentId} onValueChange={(v) => { setParentId(v); if (v !== "__root__") setIsMain(false); }}>
                <SelectTrigger className="gx-adm-input"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__root__">— لا يوجد (قسم رئيسي)</SelectItem>
                  {parentsAvailable.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{pathOf(c, allCategories)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-cyan-100/50 mt-1">
                المستوى الحالي: <b>L{finalDepth + 1}</b> (الحد الأقصى 3 مستويات)
              </p>
            </div>
          </div>

          {/* Descriptions */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>وصف (عربي) — اختياري</Label>
              <Textarea value={descAr} onChange={(e) => setDescAr(e.target.value)} rows={2} className="gx-adm-input" style={{ height: "auto" }} />
            </div>
            <div>
              <Label>وصف (English) — optional</Label>
              <Textarea value={descEn} onChange={(e) => setDescEn(e.target.value)} rows={2} dir="ltr" className="gx-adm-input" style={{ height: "auto" }} />
            </div>
          </div>

          {/* Icon */}
          <div>
            <Label>الأيقونة</Label>
            <div className="flex items-center gap-3">
              {iconUrl && <img src={iconUrl} alt="" className="w-14 h-14 rounded-lg object-cover border border-cyan-400/20" />}
              <div className="flex-1 space-y-2">
                <Input value={iconUrl} onChange={(e) => setIconUrl(e.target.value)} placeholder="رابط الصورة أو ارفع ملف" className="gx-adm-input" dir="ltr" />
                <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} className="text-xs text-cyan-100/70" />
              </div>
            </div>
          </div>

          {/* Theme */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Palette size={13} /> الثيم واللون</Label>
            <div className="gx-grad-grid">
              {PRESET_GRADIENTS.map((g) => (
                <button key={g.value} type="button" onClick={() => setThemeGradient(g.value)}
                  className={`gx-grad ${themeGradient === g.value ? "selected" : ""}`}
                  style={{ background: g.value }}>
                  {g.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">تدرّج مخصص (CSS)</Label>
                <Input value={themeGradient} onChange={(e) => setThemeGradient(e.target.value)} className="gx-adm-input" dir="ltr" placeholder="linear-gradient(135deg,#…,#…)" />
              </div>
              <div>
                <Label className="text-xs">اللون الأساسي</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-10 h-10 rounded-lg bg-transparent border border-cyan-400/20 cursor-pointer" />
                  <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="gx-adm-input flex-1" dir="ltr" />
                </div>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/5">
            <div>
              <Label>ترتيب الظهور</Label>
              <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value) || 0)} className="gx-adm-input" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer mt-6">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-cyan-400 w-4 h-4" />
              <span className="text-sm">مفعّل</span>
            </label>
            <label className={`flex items-center gap-2 cursor-pointer mt-6 ${parentId !== "__root__" ? "opacity-40" : ""}`}>
              <input
                type="checkbox"
                checked={isMain}
                disabled={parentId !== "__root__"}
                onChange={(e) => setIsMain(e.target.checked)}
                className="accent-cyan-400 w-4 h-4"
              />
              <span className="text-sm flex items-center gap-1"><Home size={12} /> يظهر بالواجهة الرئيسية</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
            <button className="gx-btn outline" onClick={onClose}>إلغاء</button>
            <button className="gx-btn primary" onClick={save} disabled={saving}>{saving ? "جاري الحفظ..." : "حفظ"}</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
