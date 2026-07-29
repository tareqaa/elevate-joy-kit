// Media Library — reusable image picker + uploader for the `home-assets`
// storage bucket. Renders a compact preview button; opens a dialog with
// all previously uploaded images plus an upload input. Selecting an image
// returns its signed URL via onPick.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Upload, Image as ImageIcon, Search, Trash2, X } from "lucide-react";

const BUCKET = "home-assets";
const SIGNED_TTL = 60 * 60 * 24 * 365 * 5; // 5 years

type MediaFile = { path: string; name: string; url: string; updated_at: string | null };

async function listBucket(folder: string): Promise<MediaFile[]> {
  // list() on a folder is not recursive; we scan common folders used by editors.
  const folders = folder ? [folder] : ["hero", "banners", "misc"];
  const all: MediaFile[] = [];
  for (const f of folders) {
    const { data } = await supabase.storage.from(BUCKET).list(f, { limit: 200, sortBy: { column: "updated_at", order: "desc" } });
    if (!data) continue;
    const items = data.filter((x) => x.name && !x.name.startsWith("."));
    if (items.length === 0) continue;
    const paths = items.map((x) => `${f}/${x.name}`);
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_TTL);
    signed?.forEach((s, i) => {
      if (s.signedUrl) all.push({ path: paths[i], name: items[i].name, url: s.signedUrl, updated_at: items[i].updated_at ?? null });
    });
  }
  return all;
}

async function uploadFile(folder: string, file: File): Promise<string | null> {
  const path = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type });
  if (error) { toast.error(error.message); return null; }
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL);
  return data?.signedUrl ?? null;
}

export function MediaPicker({ value, onPick, folder = "misc", label = "اختر صورة", compact = false }: {
  value?: string | null;
  onPick: (url: string | null) => void;
  folder?: string;
  label?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (compact) {
    return (
      <>
        <button onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800 text-[10px]">
          <ImageIcon size={10} /> {value ? "تغيير" : "اختر"}
        </button>
        {open && <MediaDialog folder={folder} onClose={() => setOpen(false)} onPick={(u) => { onPick(u); setOpen(false); }} />}
      </>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {value ? (
          <div className="relative">
            <img src={value} alt="" className="h-20 rounded-lg border border-slate-800 object-cover" />
            <button onClick={() => onPick(null)}
              className="absolute -top-2 -end-2 w-6 h-6 rounded-full bg-red-500 text-white grid place-items-center">
              <Trash2 size={12} />
            </button>
          </div>
        ) : (
          <div className="h-20 w-32 rounded-lg border border-dashed border-slate-800 bg-slate-950/40 grid place-items-center text-slate-600">
            <ImageIcon size={20} />
          </div>
        )}
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}
          className="border-slate-700 text-slate-200 hover:bg-slate-800 text-xs h-8">
          <ImageIcon size={12} className="ms-1" /> {label}
        </Button>
      </div>
      {open && <MediaDialog folder={folder} onClose={() => setOpen(false)} onPick={(u) => { onPick(u); setOpen(false); }} />}
    </div>
  );
}

function MediaDialog({ folder, onClose, onPick }: { folder: string; onClose: () => void; onPick: (url: string) => void }) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [q, setQ] = useState("");

  async function refresh() {
    setLoading(true);
    try { setFiles(await listBucket("")); } finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  async function onUpload(file: File) {
    setUploading(true);
    const url = await uploadFile(folder, file);
    setUploading(false);
    if (url) {
      toast.success("تم رفع الصورة");
      await refresh();
      onPick(url);
    }
  }

  async function onDelete(f: MediaFile) {
    if (!confirm(`حذف ${f.name}؟`)) return;
    const { error } = await supabase.storage.from(BUCKET).remove([f.path]);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحذف");
    refresh();
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return files;
    return files.filter((f) => f.name.toLowerCase().includes(s) || f.path.toLowerCase().includes(s));
  }, [files, q]);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent dir="rtl" className="bg-slate-950 border-slate-800 text-slate-100 max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2"><ImageIcon size={18} /> مكتبة الوسائط</span>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200"><X size={18} /></button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute start-2 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم..."
              className="ps-8 bg-slate-900/60 border-slate-800 text-slate-100 h-9" />
          </div>
          <label className="cursor-pointer inline-flex items-center gap-1 px-3 py-2 rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs">
            <Upload size={13} /> {uploading ? "جاري الرفع..." : "رفع صورة جديدة"}
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
          </label>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {loading && <div className="text-center text-slate-500 py-10 text-sm">جارٍ التحميل...</div>}
          {!loading && filtered.length === 0 && (
            <div className="text-center text-slate-500 py-10 text-sm">
              لا توجد صور — اضغط "رفع صورة جديدة".
            </div>
          )}
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2 pt-3">
            {filtered.map((f) => (
              <div key={f.path} className="group relative rounded-lg overflow-hidden border border-slate-800 bg-slate-900 aspect-square">
                <img src={f.url} alt={f.name} className="w-full h-full object-cover" loading="lazy" />
                <button onClick={() => onPick(f.url)}
                  className="absolute inset-0 grid place-items-center bg-cyan-500/0 hover:bg-cyan-500/85 text-slate-950 font-bold text-xs opacity-0 hover:opacity-100 transition">
                  اختيار
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(f); }}
                  className="absolute top-1 end-1 w-6 h-6 rounded-full bg-red-500/90 text-white grid place-items-center opacity-0 group-hover:opacity-100">
                  <Trash2 size={11} />
                </button>
                <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 px-1.5 py-0.5 text-[10px] text-slate-300 truncate">{f.name}</div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
