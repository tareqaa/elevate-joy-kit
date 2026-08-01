import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trash2, Save, RotateCcw, EyeOff, Eye } from "lucide-react";

type ScoreRow = {
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  score: number;
  is_valid: boolean;
  updated_at: string;
};

export function TournamentScoresDialog({
  tournamentId,
  title,
  open,
  onClose,
}: {
  tournamentId: string | null;
  title: string;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [confirmReset, setConfirmReset] = useState(false);

  const scoresQ = useQuery({
    queryKey: ["admin-tournament-scores", tournamentId],
    enabled: !!tournamentId && open,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_tournament_scores", {
        _tournament_id: tournamentId!,
      });
      if (error) throw error;
      return (data ?? []) as ScoreRow[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-tournament-scores", tournamentId] });
    qc.invalidateQueries({ queryKey: ["admin-tournaments"] });
    qc.invalidateQueries({ queryKey: ["tournament-registrations"] });
  };

  const setScore = useMutation({
    mutationFn: async (v: { user_id: string; score: number; is_valid: boolean }) => {
      const { data, error } = await supabase.rpc("admin_set_tournament_score", {
        _tournament_id: tournamentId!,
        _user_id: v.user_id,
        _score: v.score,
        _is_valid: v.is_valid,
      });
      if (error) throw error;
      const res = data as { ok: boolean; error?: string };
      if (!res?.ok) throw new Error(res?.error ?? "فشل الحفظ");
    },
    onSuccess: () => {
      toast.success("تم تحديث النتيجة");
      setDrafts({});
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delScore = useMutation({
    mutationFn: async (user_id: string) => {
      const { error } = await supabase.rpc("admin_delete_tournament_score", {
        _tournament_id: tournamentId!,
        _user_id: user_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حذف نتيجة اللاعب");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetAll = useMutation({
    mutationFn: async (clearRegs: boolean) => {
      const { data, error } = await supabase.rpc("admin_reset_tournament_scores", {
        _tournament_id: tournamentId!,
        _clear_registrations: clearRegs,
      });
      if (error) throw error;
      return data as { removed?: number };
    },
    onSuccess: (d) => {
      toast.success(`تم تصفير البطولة (${d?.removed ?? 0} نتيجة)`);
      setConfirmReset(false);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = scoresQ.data ?? [];

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>نتائج البطولة — {title}</DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Badge variant="secondary">{rows.length} لاعب</Badge>
            <Button size="sm" variant="destructive" onClick={() => setConfirmReset(true)}>
              <RotateCcw className="h-4 w-4 ms-1" /> تصفير نتائج الجميع
            </Button>
          </div>

          {scoresQ.isLoading ? (
            <p className="text-sm text-muted-foreground">جارِ التحميل…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد نتائج بعد.</p>
          ) : (
            <div className="space-y-2">
              {rows.map((r, i) => {
                const draft = drafts[r.user_id];
                const value = draft !== undefined ? draft : String(r.score);
                return (
                  <div key={r.user_id} className="flex items-center gap-2 rounded-lg border p-2">
                    <span className="w-6 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
                    {r.avatar_url ? (
                      <img src={r.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <span className="h-8 w-8 rounded-full bg-muted" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{r.username || r.full_name || "لاعب GX"}</p>
                      {!r.is_valid && <span className="text-[11px] text-destructive">مستبعد من الترتيب</span>}
                    </div>
                    <Input
                      type="number"
                      min={0}
                      className="w-28"
                      value={value}
                      onChange={(e) => setDrafts((d) => ({ ...d, [r.user_id]: e.target.value }))}
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      title="حفظ النتيجة"
                      disabled={setScore.isPending}
                      onClick={() =>
                        setScore.mutate({
                          user_id: r.user_id,
                          score: Math.max(0, Number(value) || 0),
                          is_valid: r.is_valid,
                        })
                      }
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      title={r.is_valid ? "استبعاد من الترتيب" : "إعادة للترتيب"}
                      disabled={setScore.isPending}
                      onClick={() =>
                        setScore.mutate({
                          user_id: r.user_id,
                          score: Math.max(0, Number(value) || 0),
                          is_valid: !r.is_valid,
                        })
                      }
                    >
                      {r.is_valid ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      title="حذف نتيجة اللاعب"
                      disabled={delScore.isPending}
                      onClick={() => delScore.mutate(r.user_id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          <WinnersSection tournamentId={tournamentId} open={open} />



          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmReset} onOpenChange={(o) => !o && setConfirmReset(false)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تصفير نتائج البطولة</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            سيتم حذف كل نتائج اللاعبين في «{title}» ولا يمكن التراجع. اختر إن كنت تريد إبقاء التسجيلات أو حذفها أيضًا.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmReset(false)}>
              إلغاء
            </Button>
            <Button variant="destructive" disabled={resetAll.isPending} onClick={() => resetAll.mutate(false)}>
              تصفير النتائج فقط
            </Button>
            <Button variant="destructive" disabled={resetAll.isPending} onClick={() => resetAll.mutate(true)}>
              تصفير النتائج والتسجيلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
