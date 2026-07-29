// Visual page builder for the homepage. Split layout:
//   [ sections list — drag/drop, toggle, delete ] | [ live preview ]
// Selecting a section opens its editor panel; edits update local draft
// and re-render the preview instantly. Save persists to site_settings
// and snapshots the previous value into home_settings_history.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Save, Home as HomeIcon, GripVertical, Trash2, Plus, Eye,
  History, RotateCcw, Settings2, ExternalLink, ChevronLeft,
  Palette, Monitor, Tablet, Smartphone, SlidersHorizontal, Undo2, Redo2,
} from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { SECTION_REGISTRY, SECTION_TYPES } from "@/lib/gx/sections/registry";
import {
  DEFAULT_HOME_LAYOUT, DEFAULT_THEME,
  containerMaxWidth, sectionWrapperStyle, themeToCssVars,
  type HomeLayout, type Section, type SectionType, type SectionStyle, type ThemeConfig,
} from "@/lib/gx/sections/types";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";

export const Route = createFileRoute("/_authenticated/admin/home")({
  head: () => ({ meta: [{ title: "محرر الصفحة الرئيسية — لوحة التحكم" }], links: STORE_HEAD_LINKS }),
  component: HomeBuilder,
});

type Device = "desktop" | "tablet" | "mobile";
const DEVICE_WIDTH: Record<Device, number | null> = { desktop: null, tablet: 820, mobile: 390 };
const DRAFT_KEY = "gx_home_layout_draft_v1";
const MAX_HISTORY = 50;

function HomeBuilder() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["home-layout"],
    queryFn: async (): Promise<HomeLayout> => {
      const { data, error } = await supabase.from("site_settings").select("value").eq("key", "home_layout").maybeSingle();
      if (error) throw error;
      const v = data?.value as unknown;
      if (v && typeof v === "object" && Array.isArray((v as HomeLayout).sections)) return v as HomeLayout;
      return DEFAULT_HOME_LAYOUT;
    },
  });

  const [draft, setDraftState] = useState<HomeLayout>(DEFAULT_HOME_LAYOUT);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<"builder" | "theme" | "history">("builder");
  const [device, setDevice] = useState<Device>("desktop");
  const [rightTab, setRightTab] = useState<"content" | "style">("content");

  // Undo/redo stacks — snapshots of full HomeLayout.
  const [past, setPast] = useState<HomeLayout[]>([]);
  const [future, setFuture] = useState<HomeLayout[]>([]);
  const [restorable, setRestorable] = useState<HomeLayout | null>(null);

  // History-aware setter: any user edit pushes prev draft to `past`.
  function pushDraft(next: HomeLayout | ((d: HomeLayout) => HomeLayout)) {
    setDraftState((prev) => {
      const val = typeof next === "function" ? (next as (d: HomeLayout) => HomeLayout)(prev) : next;
      setPast((p) => [...p.slice(-MAX_HISTORY + 1), prev]);
      setFuture([]);
      return val;
    });
    setDirty(true);
  }
  function undo() {
    setPast((p) => {
      if (p.length === 0) return p;
      const prev = p[p.length - 1];
      setFuture((f) => [draft, ...f].slice(0, MAX_HISTORY));
      setDraftState(prev);
      setDirty(true);
      return p.slice(0, -1);
    });
  }
  function redo() {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0];
      setPast((p) => [...p, draft].slice(-MAX_HISTORY));
      setDraftState(next);
      setDirty(true);
      return f.slice(1);
    });
  }

  useEffect(() => {
    if (!q.data) return;
    const server: HomeLayout = { ...q.data, theme: { ...DEFAULT_THEME, ...(q.data.theme || {}) } };
    // Restore an unsaved draft if it differs from server data.
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as HomeLayout;
        if (JSON.stringify(saved) !== JSON.stringify(server) && Array.isArray(saved.sections)) {
          setRestorable(saved);
        }
      }
    } catch { /* noop */ }
    setDraftState(server);
    setPast([]); setFuture([]);
    setDirty(false);
  }, [q.data]);

  // Autosave draft to localStorage (debounced).
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* noop */ }
    }, 400);
    return () => clearTimeout(t);
  }, [draft, dirty]);

  // Keyboard shortcuts.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((e.key === "y") || (e.key === "z" && e.shiftKey)) { e.preventDefault(); redo(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [draft, past, future]);


  const selected = useMemo(() => draft.sections.find((s) => s.id === selectedId) ?? null, [draft.sections, selectedId]);

  function updateSection(id: string, patch: Partial<Section>) {
    pushDraft((d: HomeLayout) => ({ ...d, sections: d.sections.map((s) => s.id === id ? { ...s, ...patch } : s) }));
    setDirty(true);
  }
  function updateSectionData(id: string, data: Record<string, unknown>) {
    pushDraft((d: HomeLayout) => ({ ...d, sections: d.sections.map((s) => s.id === id ? { ...s, data } : s) }));
    setDirty(true);
  }
  function updateSectionStyle(id: string, style: SectionStyle) {
    pushDraft((d: HomeLayout) => ({ ...d, sections: d.sections.map((s) => s.id === id ? { ...s, style } : s) }));
    setDirty(true);
  }
  function removeSection(id: string) {
    pushDraft((d: HomeLayout) => ({ ...d, sections: d.sections.filter((s) => s.id !== id) }));
    if (selectedId === id) setSelectedId(null);
    setDirty(true);
  }
  function addSection(type: SectionType) {
    const def = SECTION_REGISTRY[type];
    const s: Section = { id: `sec_${crypto.randomUUID().slice(0, 8)}`, type, enabled: true, data: { ...def.defaultData } };
    pushDraft((d: HomeLayout) => ({ ...d, sections: [...d.sections, s] }));
    setSelectedId(s.id);
    setDirty(true);
  }
  function updateTheme(patch: Partial<ThemeConfig>) {
    pushDraft((d: HomeLayout) => ({ ...d, theme: { ...DEFAULT_THEME, ...(d.theme || {}), ...patch } }));
    setDirty(true);
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    pushDraft((d: HomeLayout) => {
      const oldIndex = d.sections.findIndex((s) => s.id === active.id);
      const newIndex = d.sections.findIndex((s) => s.id === over.id);
      return { ...d, sections: arrayMove(d.sections, oldIndex, newIndex) };
    });
    setDirty(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      const { data: cur } = await supabase.from("site_settings").select("value").eq("key", "home_layout").maybeSingle();
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id ?? null;
      const email = sess.session?.user?.email ?? null;
      if (cur) {
        await supabase.from("home_settings_history").insert({
          key: "home_layout", value: cur.value as never, actor_id: uid, actor_email: email, note: "snapshot before save",
        });
      }
      const { error } = await supabase.from("site_settings").upsert({ key: "home_layout", value: draft as never }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم نشر التغييرات");
      qc.invalidateQueries({ queryKey: ["home-layout"] });
      qc.invalidateQueries({ queryKey: ["home-layout-history"] });
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* noop */ }
      setRestorable(null);
      setDirty(false);
    },
    onError: (e: Error) => toast.error(e.message || "فشل الحفظ"),
  });


  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 -m-4 sm:-m-6 lg:-m-8">
      {/* Top bar */}
      <div className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur px-4 py-3 flex items-center gap-3 flex-wrap">
        <Link to="/admin" className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-sm">
          <ChevronLeft size={16} /> رجوع
        </Link>
        <div className="w-9 h-9 rounded-lg bg-cyan-500/15 border border-cyan-500/30 grid place-items-center">
          <HomeIcon className="text-cyan-400" size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-slate-100 font-black text-lg leading-tight">محرر الصفحة الرئيسية</div>
          <div className="text-xs text-slate-500">اسحب لإعادة الترتيب • اضغط قسم للتعديل • كل تعديل يظهر مباشرة</div>
        <div className="flex items-center gap-0.5 rounded-md border border-slate-800 bg-slate-900/60 p-0.5">
          <button onClick={undo} disabled={past.length === 0} title="تراجع (Ctrl+Z)"
            className="p-1.5 rounded text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed">
            <Undo2 size={14} />
          </button>
          <button onClick={redo} disabled={future.length === 0} title="إعادة (Ctrl+Y)"
            className="p-1.5 rounded text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed">
            <Redo2 size={14} />
          </button>
        </div>
        <div className="hidden md:flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900/60 p-0.5">
          {(["desktop", "tablet", "mobile"] as const).map((d) => {
            const Ic = d === "desktop" ? Monitor : d === "tablet" ? Tablet : Smartphone;
            return (
              <button key={d} onClick={() => setDevice(d)}
                className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 transition ${device === d ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-slate-200"}`}>
                <Ic size={12} /> {d === "desktop" ? "سطح المكتب" : d === "tablet" ? "تابلت" : "جوال"}
              </button>
            );
          })}
        </div>
        <a href="/" target="_blank" rel="noreferrer" className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-800 text-slate-300 hover:bg-slate-900 text-xs">
          <ExternalLink size={12} /> فتح الموقع
        </a>
        <Button onClick={() => save.mutate()} disabled={!dirty || save.isPending}
          className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold">
          <Save size={15} className="ms-2" /> {save.isPending ? "..." : "نشر"} {dirty && <span className="ms-1 w-2 h-2 rounded-full bg-slate-950/60" />}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="px-4 pt-3">
        <TabsList className="bg-slate-900/60 border border-slate-800">
          <TabsTrigger value="builder"><Settings2 size={13} className="ms-2" /> البنّاء</TabsTrigger>
          <TabsTrigger value="theme"><Palette size={13} className="ms-2" /> الثيم</TabsTrigger>
          <TabsTrigger value="history"><History size={13} className="ms-2" /> السجل</TabsTrigger>
        </TabsList>

      {restorable && (
        <div className="mx-4 mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 flex items-center justify-between gap-2">
          <div className="text-xs text-amber-200">
            هناك مسودة غير محفوظة من جلسة سابقة — هل تريد استعادتها؟
          </div>
          <div className="flex gap-1">
            <Button size="sm" onClick={() => { pushDraft(restorable); setRestorable(null); toast.success("تمت استعادة المسودة"); }}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 h-7 text-xs">استعادة</Button>
            <Button size="sm" variant="outline" onClick={() => { try { localStorage.removeItem(DRAFT_KEY); } catch { /* noop */ } setRestorable(null); }}
              className="border-slate-700 text-slate-300 h-7 text-xs">تجاهل</Button>
          </div>
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="px-4 pt-3">
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-3">
            {/* Left: sections list */}
            <div className="space-y-3">
              <Card className="bg-slate-900/60 border-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-100 flex items-center gap-2">
                    <Eye size={14} /> أقسام الصفحة ({draft.sections.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                    <SortableContext items={draft.sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                      {draft.sections.map((s) => (
                        <SortableSectionRow key={s.id} section={s}
                          selected={selectedId === s.id}
                          onSelect={() => { setSelectedId(s.id); setRightTab("content"); }}
                          onToggle={(v) => updateSection(s.id, { enabled: v })}
                          onRemove={() => { if (confirm("حذف هذا القسم؟")) removeSection(s.id); }} />
                      ))}
                    </SortableContext>
                  </DndContext>
                </CardContent>
              </Card>

              <AddSectionCard onAdd={addSection} existing={draft.sections.map((s) => s.type)} />

              {selected && (
                <Card className="bg-slate-900/60 border-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-100 flex items-center justify-between">
                      <span>تعديل: {SECTION_REGISTRY[selected.type]?.label ?? selected.type}</span>
                    </CardTitle>
                    <div className="flex gap-1 mt-2 rounded-md bg-slate-950/60 border border-slate-800 p-0.5">
                      <button onClick={() => setRightTab("content")}
                        className={`flex-1 px-2 py-1 rounded text-xs flex items-center justify-center gap-1 ${rightTab === "content" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400"}`}>
                        <Settings2 size={11} /> المحتوى
                      </button>
                      <button onClick={() => setRightTab("style")}
                        className={`flex-1 px-2 py-1 rounded text-xs flex items-center justify-center gap-1 ${rightTab === "style" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400"}`}>
                        <SlidersHorizontal size={11} /> التنسيق
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {rightTab === "content"
                      ? <EditorPanel section={selected} onChange={(data) => updateSectionData(selected.id, data)} />
                      : <StylePanel style={selected.style} onChange={(st) => updateSectionStyle(selected.id, st)} />
                    }
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right: live preview */}
            <Card className="bg-slate-900/40 border-slate-800 overflow-hidden">
              <CardHeader className="pb-2 border-b border-slate-800 bg-slate-950/60">
                <CardTitle className="text-xs text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-2"><Eye size={12} /> معاينة مباشرة</span>
                  <span className="text-[10px] uppercase">{device}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <LivePreview layout={draft} device={device} onSectionClick={(id) => { setSelectedId(id); setRightTab("content"); }} selectedId={selectedId} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="theme" className="mt-3">
          <ThemeEditor theme={draft.theme || DEFAULT_THEME} onChange={updateTheme} />
        </TabsContent>

        <TabsContent value="history" className="mt-3">
          <HistoryTab
            onRestore={(v) => { pushDraft(v); setDirty(true); setTab("builder"); toast.success("تمت الاستعادة — اضغط نشر للتطبيق"); }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------------------------- ROW ---------------------------------- */

function SortableSectionRow({ section, selected, onSelect, onToggle, onRemove }: {
  section: Section;
  selected: boolean;
  onSelect: () => void;
  onToggle: (v: boolean) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const def = SECTION_REGISTRY[section.type];
  if (!def) return null;
  const Icon = def.Icon;
  return (
    <div ref={setNodeRef} style={style}
      className={`flex items-center gap-2 rounded-lg border p-2 cursor-pointer ${selected ? "border-cyan-500 bg-cyan-500/5" : "border-slate-800 bg-slate-950/40 hover:border-slate-700"}`}
      onClick={onSelect}>
      <button {...attributes} {...listeners} className="text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing" onClick={(e) => e.stopPropagation()}>
        <GripVertical size={15} />
      </button>
      <div className={`w-7 h-7 rounded-md grid place-items-center shrink-0 ${section.enabled ? "bg-cyan-500/15 text-cyan-400" : "bg-slate-800 text-slate-600"}`}>
        <Icon size={13} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-xs font-bold truncate ${section.enabled ? "text-slate-100" : "text-slate-500"}`}>{def.label}</div>
        <div className="text-[10px] text-slate-500 truncate">{def.description}</div>
      </div>
      <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 shrink-0">
        <Switch checked={section.enabled} onCheckedChange={onToggle} className="scale-75" />
        <button onClick={onRemove} className="text-slate-500 hover:text-red-400 p-1"><Trash2 size={12} /></button>
      </div>
    </div>
  );
}

/* ------------------------------- ADD SECTION ----------------------------- */

function AddSectionCard({ onAdd, existing }: { onAdd: (t: SectionType) => void; existing: SectionType[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="bg-slate-900/60 border-slate-800">
      <CardContent className="p-3">
        <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}
          className="w-full border-dashed border-slate-700 text-slate-300 hover:bg-slate-800/50">
          <Plus size={13} className="ms-2" /> إضافة قسم
        </Button>
        {open && (
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {SECTION_TYPES.map((t) => {
              const def = SECTION_REGISTRY[t]; const Icon = def.Icon;
              const already = existing.includes(t);
              return (
                <button key={t} onClick={() => { onAdd(t); setOpen(false); }}
                  className="flex flex-col items-start gap-1 p-2 rounded-md border border-slate-800 bg-slate-950/40 hover:border-cyan-500/50 hover:bg-cyan-500/5 text-start">
                  <div className="flex items-center gap-1.5 w-full">
                    <Icon size={12} className="text-cyan-400" />
                    <span className="text-xs font-bold text-slate-100">{def.label}</span>
                    {already && <span className="ms-auto text-[9px] text-slate-500">مضاف</span>}
                  </div>
                  <span className="text-[10px] text-slate-500 line-clamp-1">{def.description}</span>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* --------------------------------- EDITOR -------------------------------- */

function EditorPanel({ section, onChange }: { section: Section; onChange: (d: Record<string, unknown>) => void }) {
  const def = SECTION_REGISTRY[section.type];
  if (!def) return <div className="text-slate-500 text-xs">نوع قسم غير معروف</div>;
  const { Editor } = def;
  return <Editor data={section.data} onChange={onChange} />;
}

/* ---------------------------- SECTION STYLE PANEL ------------------------ */

function StylePanel({ style, onChange }: { style?: SectionStyle; onChange: (s: SectionStyle) => void }) {
  const s: SectionStyle = style || {};
  function patch(p: Partial<SectionStyle>) { onChange({ ...s, ...p }); }
  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-slate-400">مسافة علوية (px)</Label>
          <Input type="number" value={s.padding_top ?? ""} placeholder="افتراضي"
            onChange={(e) => patch({ padding_top: e.target.value === "" ? undefined : Number(e.target.value) })}
            className="bg-slate-950 border-slate-800 text-slate-100 h-8" />
        </div>
        <div>
          <Label className="text-xs text-slate-400">مسافة سفلية (px)</Label>
          <Input type="number" value={s.padding_bottom ?? ""} placeholder="افتراضي"
            onChange={(e) => patch({ padding_bottom: e.target.value === "" ? undefined : Number(e.target.value) })}
            className="bg-slate-950 border-slate-800 text-slate-100 h-8" />
        </div>
      </div>

      <div>
        <Label className="text-xs text-slate-400">خلفية القسم</Label>
        <div className="flex gap-2 items-center">
          <input type="color" value={s.bg && /^#[0-9a-f]{6}$/i.test(s.bg) ? s.bg : "#0b0f1a"}
            onChange={(e) => patch({ bg: e.target.value })}
            className="w-10 h-8 rounded border border-slate-800 bg-slate-950 cursor-pointer" />
          <Input value={s.bg ?? ""} placeholder="#0b0f1a أو gradient(...)"
            onChange={(e) => patch({ bg: e.target.value || null })}
            className="bg-slate-950 border-slate-800 text-slate-100 h-8 flex-1 text-xs" />
          <Button size="sm" variant="ghost" className="h-8 text-xs text-slate-400" onClick={() => patch({ bg: null })}>
            <RotateCcw size={11} />
          </Button>
        </div>
      </div>

      <div>
        <Label className="text-xs text-slate-400 block mb-1">عرض الحاوية</Label>
        <div className="grid grid-cols-4 gap-1">
          {(["narrow", "normal", "wide", "full"] as const).map((c) => (
            <button key={c} onClick={() => patch({ container: c })}
              className={`px-2 py-1.5 rounded text-[11px] border ${s.container === c || (!s.container && c === "normal") ? "bg-cyan-500 border-cyan-500 text-slate-950 font-bold" : "bg-slate-950/60 border-slate-800 text-slate-400"}`}>
              {c === "narrow" ? "ضيقة" : c === "normal" ? "عادية" : c === "wide" ? "واسعة" : "كامل"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs text-slate-400 block mb-1">محاذاة النص</Label>
        <div className="grid grid-cols-3 gap-1">
          {(["start", "center", "end"] as const).map((a) => (
            <button key={a} onClick={() => patch({ align: a })}
              className={`px-2 py-1.5 rounded text-[11px] border ${s.align === a || (!s.align && a === "center") ? "bg-cyan-500 border-cyan-500 text-slate-950 font-bold" : "bg-slate-950/60 border-slate-800 text-slate-400"}`}>
              {a === "start" ? "بداية" : a === "center" ? "وسط" : "نهاية"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- THEME ---------------------------------- */

const THEME_PRESETS: { name: string; theme: ThemeConfig }[] = [
  { name: "Cyan (الافتراضي)", theme: DEFAULT_THEME },
  { name: "Purple Night",     theme: { ...DEFAULT_THEME, primary: "#a855f7", bg: "#0a0714", surface: "#1a1030" } },
  { name: "Emerald",          theme: { ...DEFAULT_THEME, primary: "#10b981", bg: "#071410", surface: "#0f2a20" } },
  { name: "Rose Gold",        theme: { ...DEFAULT_THEME, primary: "#f43f5e", bg: "#140a0e", surface: "#2a1520" } },
  { name: "Amber Sun",        theme: { ...DEFAULT_THEME, primary: "#f59e0b", bg: "#14100a", surface: "#2a2015" } },
  { name: "Light",            theme: { ...DEFAULT_THEME, primary: "#0ea5e9", bg: "#f8fafc", surface: "#ffffff", text: "#0f172a", muted: "#64748b" } },
];

function ThemeEditor({ theme, onChange }: { theme: ThemeConfig; onChange: (p: Partial<ThemeConfig>) => void }) {
  const t = { ...DEFAULT_THEME, ...theme };
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-3">
      <Card className="bg-slate-900/60 border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-100 flex items-center gap-2"><Palette size={14} /> ثيم المتجر</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-slate-400 block mb-2">قوالب جاهزة</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {THEME_PRESETS.map((p) => (
                <button key={p.name} onClick={() => onChange(p.theme)}
                  className="rounded-lg border border-slate-800 bg-slate-950/40 hover:border-cyan-500/50 p-2 text-start">
                  <div className="flex gap-1 mb-1.5">
                    {[p.theme.primary, p.theme.bg, p.theme.surface, p.theme.text].map((c, i) => (
                      <span key={i} className="w-6 h-6 rounded" style={{ background: c || "#000" }} />
                    ))}
                  </div>
                  <div className="text-xs text-slate-100 font-bold">{p.name}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ColorRow label="اللون الرئيسي" value={t.primary!} onChange={(v) => onChange({ primary: v })} />
            <ColorRow label="خلفية الصفحة" value={t.bg!} onChange={(v) => onChange({ bg: v })} />
            <ColorRow label="خلفية البطاقات" value={t.surface!} onChange={(v) => onChange({ surface: v })} />
            <ColorRow label="لون النص" value={t.text!} onChange={(v) => onChange({ text: v })} />
            <ColorRow label="نص ثانوي" value={t.muted!} onChange={(v) => onChange({ muted: v })} />
            <div>
              <Label className="text-xs text-slate-400">تدوير الحواف (px)</Label>
              <Input type="number" value={t.radius ?? 14} onChange={(e) => onChange({ radius: Number(e.target.value) })}
                className="bg-slate-950 border-slate-800 text-slate-100 h-8" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-slate-400 block mb-1">الخط</Label>
            <div className="grid grid-cols-3 gap-1">
              {(["sans", "display", "mono"] as const).map((f) => (
                <button key={f} onClick={() => onChange({ font: f })}
                  className={`px-2 py-2 rounded text-xs border ${t.font === f ? "bg-cyan-500 border-cyan-500 text-slate-950 font-bold" : "bg-slate-950/60 border-slate-800 text-slate-300"}`}>
                  {f === "sans" ? "قياسي" : f === "display" ? "عريض" : "أحادي"}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/40 border-slate-800">
        <CardHeader className="pb-2 border-b border-slate-800"><CardTitle className="text-xs text-slate-400">معاينة</CardTitle></CardHeader>
        <CardContent className="p-4">
          <div className="rounded-xl p-5" style={themeToCssVars(t) as React.CSSProperties}>
            <div style={{ background: "var(--gx-bg)", color: "var(--gx-text)", fontFamily: "var(--gx-font)", borderRadius: "var(--gx-radius)", padding: 20 }}>
              <div style={{ color: "var(--gx-primary)", fontSize: 12, fontWeight: 900, marginBottom: 6 }}>EYEBROW</div>
              <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>عنوان تجريبي رئيسي</div>
              <div style={{ color: "var(--gx-muted)", fontSize: 13, marginBottom: 14 }}>هذا نص فرعي يوضّح كيف يبدو الثيم على المتجر.</div>
              <div style={{ background: "var(--gx-surface)", borderRadius: "var(--gx-radius)", padding: 12, marginBottom: 12 }}>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>بطاقة منتج</div>
                <div style={{ color: "var(--gx-muted)", fontSize: 12 }}>1.99 د.أ</div>
              </div>
              <button style={{ background: "var(--gx-primary)", color: "#0b0f1a", fontWeight: 900, padding: "10px 18px", borderRadius: "var(--gx-radius)", border: 0 }}>
                زر رئيسي
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const safe = /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
  return (
    <div>
      <Label className="text-xs text-slate-400">{label}</Label>
      <div className="flex gap-2 items-center">
        <input type="color" value={safe} onChange={(e) => onChange(e.target.value)}
          className="w-10 h-8 rounded border border-slate-800 bg-slate-950 cursor-pointer" />
        <Input value={value} onChange={(e) => onChange(e.target.value)}
          className="bg-slate-950 border-slate-800 text-slate-100 h-8 flex-1 text-xs" />
      </div>
    </div>
  );
}

/* ------------------------------- PREVIEW --------------------------------- */

function LivePreview({ layout, device, onSectionClick, selectedId }: {
  layout: HomeLayout;
  device: Device;
  onSectionClick: (id: string) => void;
  selectedId: string | null;
}) {
  const enabled = layout.sections.filter((s) => s.enabled);
  const themeVars = themeToCssVars(layout.theme);
  const w = DEVICE_WIDTH[device];
  return (
    <div className="bg-slate-950/70 max-h-[calc(100vh-260px)] overflow-y-auto p-3">
      <div style={{ maxWidth: w ?? "100%", margin: "0 auto", boxShadow: w ? "0 0 0 1px rgba(148,163,184,.15)" : undefined, borderRadius: w ? 12 : 0, overflow: "hidden" }}>
        <div className="gx-home-root" style={{ ...themeVars, background: "var(--gx-bg)", color: "var(--gx-text)", fontFamily: "var(--gx-font)" }}>
          {enabled.length === 0 && (
            <div className="text-center text-slate-500 py-16 text-sm">لا توجد أقسام مفعّلة — فعّل قسماً من القائمة.</div>
          )}
          {enabled.map((s) => {
            const def = SECTION_REGISTRY[s.type]; if (!def) return null;
            const { Renderer } = def;
            const isSel = selectedId === s.id;
            const wrapStyle = sectionWrapperStyle(s.style);
            const maxW = containerMaxWidth(s.style?.container);
            return (
              <div key={s.id} onClick={() => onSectionClick(s.id)}
                className={`relative cursor-pointer transition-all ${isSel ? "ring-2 ring-cyan-500 ring-inset" : "hover:ring-2 hover:ring-cyan-500/40 hover:ring-inset"}`}
                style={wrapStyle}>
                <div className="pointer-events-none" style={{ maxWidth: maxW, margin: "0 auto", width: "100%" }}>
                  <Renderer data={s.data} />
                </div>
                <div className={`absolute top-2 start-2 px-2 py-0.5 rounded text-[10px] font-bold ${isSel ? "bg-cyan-500 text-slate-950" : "bg-slate-950/80 text-cyan-400"}`}>
                  {def.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- HISTORY -------------------------------- */

type HistoryRow = { id: string; value: unknown; actor_email: string | null; created_at: string };

function HistoryTab({ onRestore }: { onRestore: (v: HomeLayout) => void }) {
  const q = useQuery({
    queryKey: ["home-layout-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_settings_history")
        .select("id,value,actor_email,created_at")
        .eq("key", "home_layout")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as HistoryRow[];
    },
  });

  return (
    <Card className="bg-slate-900/60 border-slate-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-slate-100">آخر النسخ المحفوظة</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {q.isLoading && <div className="text-center text-slate-500 text-sm py-6">جارٍ التحميل...</div>}
        {!q.isLoading && (q.data?.length ?? 0) === 0 && (
          <div className="text-center text-slate-500 text-sm py-8">لا يوجد سجل — سيُخزّن كل نشر هنا تلقائياً.</div>
        )}
        {q.data?.map((row) => {
          const v = row.value as HomeLayout;
          const count = Array.isArray(v?.sections) ? v.sections.length : 0;
          return (
            <div key={row.id} className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <div className="w-10 h-10 rounded-md bg-cyan-500/10 border border-cyan-500/25 grid place-items-center shrink-0">
                <History size={16} className="text-cyan-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-slate-100 font-bold text-sm">{count} أقسام</div>
                <div className="text-xs text-slate-500">
                  {formatDistanceToNow(new Date(row.created_at), { addSuffix: true, locale: ar })}
                  {row.actor_email && <> — {row.actor_email}</>}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => onRestore(v)}
                className="border-slate-700 text-slate-200 hover:bg-slate-800">
                <RotateCcw size={12} className="ms-2" /> تحميل
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
