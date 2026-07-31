import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { StoreShell } from "@/components/gx/StoreShell";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { useLang } from "@/lib/gx/i18n";
import { supabase } from "@/integrations/supabase/client";
import { GameIcon } from "@/components/gx/games/GameIcon";
import { HowToPlaySlides } from "@/components/gx/games/HowToPlaySlides";
import { formatCountdown, formatDateTime } from "@/lib/gx/games/time";

export const Route = createFileRoute("/games/t/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "البطولة الأسبوعية — ترتيب اللاعبين في GX Store" },
      { name: "description", content: "شاهد ترتيب اللاعبين في البطولة الأسبوعية داخل ساحة اللعب، تعرّف على الجوائز، وابدأ جولتك للمنافسة على المراكز الأولى." },
      { property: "og:title", content: "البطولة الأسبوعية — GX Store" },
      { property: "og:description", content: "ترتيب اللاعبين والجوائز في بطولة GX Store الأسبوعية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: STORE_HEAD_LINKS,
  }),
  component: TournamentPage,
});

type Row = { rank: number; user_id: string; username: string | null; full_name: string | null; avatar_url: string | null; score: number };
type Standing = { played: boolean; rank?: number; score?: number; username?: string | null; full_name?: string | null; avatar_url?: string | null };
type Prize = { place: number; label_ar: string; label_en: string };
type T = {
  id: string; game_slug: string; title_ar: string; title_en: string; game_path: string | null;
  starts_at: string; ends_at: string; prizes: Prize[]; live_status: "live" | "upcoming" | "ended";
  participants: number; top_score: number; server_now: string;
};

const MEDALS = ["🥇", "🥈", "🥉"];
const nameOf = (r: { username: string | null; full_name: string | null }) => r.username || r.full_name || "لاعب GX";

function TournamentPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { lang, dir } = useLang();
  const ar = lang === "ar";

  const [t, setT] = useState<T | null | undefined>(undefined);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [me, setMe] = useState<Standing | null>(null);
  const [how, setHow] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [list, lb, mine] = await Promise.all([
        supabase.rpc("list_tournaments"),
        supabase.rpc("tournament_leaderboard", { _tournament_id: id, _limit: 20 }),
        supabase.rpc("my_tournament_standing", { _tournament_id: id }),
      ]);
      if (!alive) return;
      const found = ((list.data ?? []) as unknown as T[]).find((x) => x.id === id) ?? null;
      setT(found);
      setRows(((lb.data ?? []) as unknown as Row[]).map((r) => ({ ...r, rank: Number(r.rank) })));
      setMe((mine.data ?? { played: false }) as unknown as Standing);
    })();
    return () => { alive = false; };
  }, [id]);

  const offset = useMemo(() => (t ? new Date(t.server_now).getTime() - Date.now() : 0), [t]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now() + offset);
    const iv = window.setInterval(() => setNow(Date.now() + offset), 1000);
    return () => window.clearInterval(iv);
  }, [offset]);

  const status = useMemo(() => {
    if (!t) return "ended" as const;
    if (now >= new Date(t.ends_at).getTime()) return "ended" as const;
    if (now < new Date(t.starts_at).getTime()) return "upcoming" as const;
    return "live" as const;
  }, [t, now]);

  if (t === undefined) {
    return (
      <StoreShell>
        <main dir={dir} className="container" style={{ padding: "60px 0" }}>{ar ? "جارِ تحميل البطولة…" : "Loading…"}</main>
      </StoreShell>
    );
  }
  if (!t) {
    return (
      <StoreShell>
        <main dir={dir} className="container" style={{ padding: "60px 0" }}>
          <p className="trn-empty">{ar ? "هذه البطولة غير متاحة." : "Tournament not available."}</p>
          <Link to="/games" className="btn btn-primary">{ar ? "عودة لساحة اللعب" : "Back to arena"}</Link>
        </main>
      </StoreShell>
    );
  }

  const target = status === "live" ? new Date(t.ends_at).getTime() - now : new Date(t.starts_at).getTime() - now;

  return (
    <StoreShell>
      <main dir={dir} className="container tpage">
        <header className={`tp-head is-${status}`}>
          <div className="tp-ic"><GameIcon slug={t.game_slug} size={46} /></div>
          <div className="tp-titles">
            <h1>{ar ? t.title_ar : t.title_en}</h1>
            <span className={`trn-badge b-${status}`}>
              {status === "live" ? (ar ? "نشطة الآن" : "Live now") : status === "ended" ? (ar ? "انتهت" : "Ended") : (ar ? "قريبًا" : "Upcoming")}
            </span>
          </div>
          <div className="tp-clock">
            <span>{status === "live" ? (ar ? "تنتهي بعد" : "Ends in") : status === "ended" ? (ar ? "انتهت في" : "Ended on") : (ar ? "تبدأ بعد" : "Starts in")}</span>
            <b>{status === "ended" ? formatDateTime(t.ends_at, ar) : formatCountdown(target, ar)}</b>
          </div>
        </header>

        <div className="tp-grid">
          <section className="tp-card tp-board">
            <h2>{ar ? "ترتيب اللاعبين" : "Leaderboard"}</h2>
            <div className="tlb">
              {rows === null ? (
                <p className="tlb-empty">{ar ? "جارِ تحميل الترتيب…" : "Loading…"}</p>
              ) : rows.length === 0 ? (
                <p className="tlb-empty">{ar ? "لا يوجد لاعبون بعد — كن أول من يسجّل سكور!" : "No players yet."}</p>
              ) : (
                <ol className="tlb-list">
                  {rows.map((r) => (
                    <li key={r.user_id} className={r.rank <= 3 ? `top t${r.rank}` : ""}>
                      <span className="tlb-rank">{r.rank <= 3 ? MEDALS[r.rank - 1] : r.rank}</span>
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
                    {me.avatar_url ? <img src={me.avatar_url} alt="" className="tlb-av" /> : <span className="tlb-av ph">{ar ? "أنا" : "Me"}</span>}
                    <span className="tlb-name">{ar ? "مركزك" : "Your rank"} — {nameOf({ username: me.username ?? null, full_name: me.full_name ?? null })}</span>
                    <b className="tlb-score" dir="ltr">{(me.score ?? 0).toLocaleString("en-US")}</b>
                  </>
                ) : (
                  <span className="tlb-cta">{ar ? "لم تلعب بعد — جولة واحدة تكفي لتدخل الترتيب 💪" : "Play one round to enter the ranking 💪"}</span>
                )}
              </div>
            </div>
          </section>

          <aside className="tp-side">
            <section className="tp-card">
              <h2>{ar ? "الجوائز" : "Prizes"}</h2>
              {t.prizes.length === 0 ? (
                <p className="tlb-empty">{ar ? "سيتم الإعلان عن الجوائز قريبًا." : "Prizes announced soon."}</p>
              ) : (
                <ul className="tp-prizes">
                  {t.prizes.map((p, i) => (
                    <li key={p.place ?? i}>
                      <i aria-hidden>{MEDALS[(p.place ?? i + 1) - 1] ?? "🎁"}</i>
                      <div>
                        <b>{ar ? `المركز ${p.place ?? i + 1}` : `Place ${p.place ?? i + 1}`}</b>
                        <span>{ar ? p.label_ar : p.label_en}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="tp-winners">
                {ar ? `عدد الفائزين في هذه البطولة: ${t.prizes.length}` : `Winners in this tournament: ${t.prizes.length}`}
              </p>
            </section>

            <section className="tp-card tp-stats">
              <div><span>{ar ? "المشاركون" : "Players"}</span><b>{t.participants.toLocaleString("en")}</b></div>
              <div><span>{ar ? "أعلى سكور" : "Top score"}</span><b>{t.top_score.toLocaleString("en")}</b></div>
            </section>
          </aside>
        </div>

        <div className="tp-actions">
          <button
            type="button"
            className="btn btn-primary tp-start"
            disabled={status !== "live" || !t.game_path}
            onClick={() => t.game_path && navigate({ to: t.game_path, search: { t: t.id } as never })}
          >
            {status === "live" ? (ar ? "ابدأ اللعب" : "Start playing") : status === "ended" ? (ar ? "انتهت البطولة" : "Tournament ended") : (ar ? "لم تبدأ بعد" : "Not started yet")}
          </button>
          <button type="button" className="btn tp-how" onClick={() => setHow((v) => !v)}>
            {how ? (ar ? "إخفاء الشرح" : "Hide how to play") : (ar ? "كيف ألعب؟" : "How to play?")}
          </button>
        </div>

        {how && (
          <section className="tp-card tp-howcard">
            <HowToPlaySlides />
          </section>
        )}
      </main>
    </StoreShell>
  );
}
