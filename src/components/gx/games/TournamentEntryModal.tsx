import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { HowToPlaySlides } from "./HowToPlaySlides";
import { GameIcon } from "./GameIcon";

export const HOWTO_SEEN_KEY = "gx_blast_howto_seen_v1";

type Row = { rank: number; user_id: string; username: string | null; full_name: string | null; avatar_url: string | null; score: number };
type Standing = { played: boolean; rank?: number; score?: number; username?: string | null; full_name?: string | null; avatar_url?: string | null };

function fmtLeft(ms: number) {
  if (ms <= 0) return "انتهت";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const p = (n: number) => String(n).padStart(2, "0");
  const t = `${p(Math.floor((s % 86400) / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
  return d > 0 ? `${d} يوم · ${t}` : t;
}

function nameOf(r: { username: string | null; full_name: string | null }) {
  return r.username || r.full_name || "لاعب GX";
}

export function TournamentEntryModal({
  tournamentId,
  title,
  gameSlug,
  gamePath,
  endsAt,
  serverNow,
  onClose,
}: {
  tournamentId: string;
  title: string;
  gameSlug: string;
  gamePath: string;
  endsAt: string;
  serverNow: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"how" | "board">(() => {
    if (typeof window === "undefined") return "how";
    try { return localStorage.getItem(HOWTO_SEEN_KEY) ? "board" : "how"; } catch { return "how"; }
  });
  const [rows, setRows] = useState<Row[] | null>(null);
  const [me, setMe] = useState<Standing | null>(null);

  const offset = useMemo(() => new Date(serverNow).getTime() - Date.now(), [serverNow]);
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now() + offset), 1000);
    return () => window.clearInterval(id);
  }, [offset]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [lb, mine] = await Promise.all([
        supabase.rpc("tournament_leaderboard", { _tournament_id: tournamentId, _limit: 10 }),
        supabase.rpc("my_tournament_standing", { _tournament_id: tournamentId }),
      ]);
      if (!alive) return;
      setRows(((lb.data ?? []) as unknown as Row[]).map((r) => ({ ...r, rank: Number(r.rank) })));
      setMe((mine.data ?? { played: false }) as unknown as Standing);
    })();
    return () => { alive = false; };
  }, [tournamentId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const start = () => {
    try { localStorage.setItem(HOWTO_SEEN_KEY, "1"); } catch { /* ignore */ }
    navigate({ to: gamePath, search: { t: tournamentId } as never });
  };

  return (
    <div className="tem-back" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="tem" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <header className="tem-head">
          <GameIcon slug={gameSlug} size={38} />
          <div className="tem-titles">
            <h3>{title}</h3>
            <span className="tem-left">ينتهي خلال <b dir="ltr">{fmtLeft(new Date(endsAt).getTime() - now)}</b></span>
          </div>
          <button type="button" className="tem-x" onClick={onClose} aria-label="إغلاق">×</button>
        </header>

        <div className="tem-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "how"} className={tab === "how" ? "on" : ""} onClick={() => setTab("how")}>كيف ألعب؟</button>
          <button type="button" role="tab" aria-selected={tab === "board"} className={tab === "board" ? "on" : ""} onClick={() => setTab("board")}>الترتيب</button>
        </div>

        <div className="tem-body">
          {tab === "how" ? (
            <HowToPlaySlides onDone={() => setTab("board")} doneLabel="تخطي الشرح" />
          ) : (
            <div className="tlb">
              {rows === null ? (
                <p className="tlb-empty">جارِ تحميل الترتيب…</p>
              ) : rows.length === 0 ? (
                <p className="tlb-empty">لا يوجد لاعبون بعد — كن أول من يسجّل سكور!</p>
              ) : (
                <ol className="tlb-list">
                  {rows.map((r) => (
                    <li key={r.user_id} className={r.rank <= 3 ? `top t${r.rank}` : ""}>
                      <span className="tlb-rank">{r.rank}</span>
                      {r.avatar_url ? <img src={r.avatar_url} alt="" className="tlb-av" loading="lazy" /> : <span className="tlb-av ph">{nameOf(r).slice(0, 1)}</span>}
                      <span className="tlb-name">{nameOf(r)}</span>
                      <b className="tlb-score" dir="ltr">{r.score.toLocaleString("en-US")}</b>
                    </li>
                  ))}
                </ol>
              )}

              <div className="tlb-me">
                {me?.played ? (
                  <>
                    <span className="tlb-rank">{me.rank}</span>
                    {me.avatar_url ? <img src={me.avatar_url} alt="" className="tlb-av" /> : <span className="tlb-av ph">أنا</span>}
                    <span className="tlb-name">مركزك — {nameOf({ username: me.username ?? null, full_name: me.full_name ?? null })}</span>
                    <b className="tlb-score" dir="ltr">{(me.score ?? 0).toLocaleString("en-US")}</b>
                  </>
                ) : (
                  <span className="tlb-cta">لم تلعب بعد — جولة واحدة تكفي لتدخل الترتيب 💪</span>
                )}
              </div>
            </div>
          )}
        </div>

        <footer className="tem-foot">
          <button type="button" className="btn btn-primary tem-start" onClick={start}>ابدأ اللعب</button>
        </footer>
      </div>
    </div>
  );
}
