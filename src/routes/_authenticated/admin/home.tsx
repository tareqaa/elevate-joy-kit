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
import { toast } from "sonner";
import {
  Save, Home as HomeIcon, GripVertical, Trash2, Plus, Eye,
  History, RotateCcw, Settings2, ExternalLink, ChevronLeft,
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
import { DEFAULT_HOME_LAYOUT, type HomeLayout, type Section, type SectionType } from "@/lib/gx/sections/types";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";

export const Route = createFileRoute("/_authenticated/admin/home")({
  head: () => ({ meta: [{ title: "محرر الصفحة الرئيسية — لوحة التحكم" }], links: STORE_HEAD_LINKS }),
  component: HomeBuilder,
});

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

  const [draft, setDraft] = useState<HomeLayout>(DEFAULT_HOME_LAYOUT);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<"builder" | "history">("builder");

  useEffect(() => { if (q.data) { setDraft(q.data); setDirty(false); } }, [q.data]);

  const selected = useMemo(() => draft.sections.find((s) => s.id === selectedId) ?? null, [draft.sections, selectedId]);

  function updateSection(id: string, patch: Partial<Section>) {
    setDraft((d) => ({ ...d, sections: d.sections.map((s) => s.id === id ? { ...s, ...patch } : s) }));
    setDirty(true);
  }
  function updateSectionData(id: string, data: Record<string, unknown>) {
    setDraft((d) => ({ ...d, sections: d.sections.map((s) => s.id === id ? { ...s, data } : s) }));
    setDirty(true);
  }
  function removeSection(id: string) {
    setDraft((d) => ({ ...d, sections: d.sections.filter((s) => s.id !== id) }));
    if (selectedId === id) setSelectedId(null);
    setDirty(true);
  }
  function addSection(type: SectionType) {
    const def = SECTION_REGISTRY[type];
    const s: Section = { id: `sec_${crypto.randomUUID().slice(0, 8)}`, type, enabled: true, data: { ...def.defaultData } };
    setDraft((d) => ({ ...d, sections: [...d.sections, s] }));
    setSelectedId(s.id);
    setDirty(true);
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setDraft((d) => {
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
          <TabsTrigger value="history"><History size={13} className="ms-2" /> السجل</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="mt-3">
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
                          onSelect={() => setSelectedId(s.id)}
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
                    <CardTitle className="text-sm text-slate-100">
                      تعديل: {SECTION_REGISTRY[selected.type]?.label ?? selected.type}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EditorPanel section={selected} onChange={(data) => updateSectionData(selected.id, data)} />
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right: live preview */}
            <Card className="bg-slate-900/40 border-slate-800 overflow-hidden">
              <CardHeader className="pb-2 border-b border-slate-800 bg-slate-950/60">
                <CardTitle className="text-xs text-slate-400 flex items-center gap-2">
                  <Eye size={12} /> معاينة مباشرة
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <LivePreview layout={draft} onSectionClick={setSelectedId} selectedId={selectedId} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-3">
          <HistoryTab
            onRestore={(v) => { setDraft(v); setDirty(true); setTab("builder"); toast.success("تمت الاستعادة — اضغط نشر للتطبيق"); }}
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
  // "Singleton" sections (hero/carousel/categories/etc) should ideally exist once — allow duplicates but hint disabled state visually.
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

/* ------------------------------- PREVIEW --------------------------------- */

function LivePreview({ layout, onSectionClick, selectedId }: {
  layout: HomeLayout;
  onSectionClick: (id: string) => void;
  selectedId: string | null;
}) {
  const enabled = layout.sections.filter((s) => s.enabled);
  return (
    <div className="bg-[var(--bg,#0b0f1a)] text-white max-h-[calc(100vh-260px)] overflow-y-auto">
      {enabled.length === 0 && (
        <div className="text-center text-slate-500 py-16 text-sm">لا توجد أقسام مفعّلة — فعّل قسماً من القائمة على اليمين.</div>
      )}
      {enabled.map((s) => {
        const def = SECTION_REGISTRY[s.type]; if (!def) return null;
        const { Renderer } = def;
        const isSel = selectedId === s.id;
        return (
          <div key={s.id} onClick={() => onSectionClick(s.id)}
            className={`relative cursor-pointer transition-all ${isSel ? "ring-2 ring-cyan-500 ring-inset" : "hover:ring-2 hover:ring-cyan-500/40 hover:ring-inset"}`}>
            <div className="pointer-events-none">
              <Renderer data={s.data} />
            </div>
            <div className={`absolute top-2 start-2 px-2 py-0.5 rounded text-[10px] font-bold ${isSel ? "bg-cyan-500 text-slate-950" : "bg-slate-950/80 text-cyan-400 opacity-0 group-hover:opacity-100"}`}>
              {def.label}
            </div>
          </div>
        );
      })}
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
              <Button size="sm" variant="outline" className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10"
                onClick={() => {
                  if (!v || !Array.isArray(v.sections)) { toast.error("نسخة غير صالحة"); return; }
                  if (confirm("تحميل هذه النسخة إلى المحرّر؟ (لن تُنشر إلا عند الضغط على نشر)")) onRestore(v);
                }}>
                <RotateCcw size={12} className="ms-1" /> تحميل
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
