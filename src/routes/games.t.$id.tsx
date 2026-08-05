import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { StoreShell } from "@/components/gx/StoreShell";
import { getStoreHeadLinks } from "@/lib/gx/store-head";
import { useLang } from "@/lib/gx/i18n";
import { supabase } from "@/integrations/supabase/client";
import { GameIcon } from "@/components/gx/games/GameIcon";
import { ArenaFx } from "@/components/gx/games/ArenaFx";
import { formatCountdownFull, formatDateTime } from "@/lib/gx/games/time";


export const Route = createFileRoute("/games/t/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "GX Blast Arena — الترتيب المباشر والجوائز" },
      { name: "description", content: "لوحة اللاعب، الترتيب المباشر، الجوائز الأسبوعية، وتقدّم GX XP داخل GX Blast Arena." },
      { property: "og:title", content: "GX BLAST ARENA — GX Store" },
      { property: "og:description", content: "ترتيب اللاعبين والجوائز وتقدّم المستويات في بطولة GX Blast." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: getStoreHeadLinks(["games"]),
  }),
  component: TournamentPageLazy,
});

function TournamentPageLazy() {
  const [Comp, setComp] = useState<any>(null);

  useEffect(() => {
    import("./games.t.$id").then(m => setComp(() => m.TournamentPage));
  }, []);

  if (!Comp) return <div className="min-h-screen bg-[#090b10] flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  return <Comp />;
}

function TournamentPage() {

type Row = {
  rank: number; user_id: string; username: string | null; full_name: string | null;
  avatar_url: string | null; score: number;
  level_code?: string | null; level_name_ar?: string | null; level_name_en?: string | null;
  level_color?: string | null; level_icon?: string | null;
};
type Standing = { played: boolean; rank?: number; total?: number; score?: number; username?: string | null; full_name?: string | null; avatar_url?: string | null };
import { placeLabel, prizeRewards, rewardIcon, rewardText, type Prize } from "@/lib/gx/tournament-prizes";
export type { Prize };
type T = {
  id: string; game_slug: string; title_ar: string; title_en: string; game_path: string | null;
  starts_at: string; ends_at: string; prizes: Prize[]; live_status: "live" | "upcoming" | "ended";
  participants: number; top_score: number; server_now: string;
};

const MEDALS = ["🥇", "🥈", "🥉"];
const nameOf = (r: { username: string | null; full_name: string | null }) => r.username || r.full_name || "لاعب GX";

function PrizeRow({ p, place, ar }: { p: Prize; place: number; ar: boolean }) {
  const rewards = prizeRewards(p);
  const isRange = !!(p.place_to && Number(p.place_to) > place);
  return (
    <div className={`przrow g${Math.min(place, 4)}`}>
      <i aria-hidden>{!isRange ? (MEDALS[place - 1] ?? "🎁") : "🎁"}</i>
      <b>{placeLabel(p, ar, place)}</b>

      <span>
        {rewards.map((r, n) => (
          <span key={n} className="prz-reward">
            {rewardIcon(r.type)} {rewardText(r, ar)}
          </span>
        ))}
      </span>
    </div>
  );
}


function TournamentPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { lang, dir } = useLang();
  const ar = lang === "ar";

  const [t, setT] = useState<T | null | undefined>(undefined);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [me, setMe] = useState<Standing | null>(null);
  
  const [prizesOpen, setPrizesOpen] = useState(false);

  useEffect(() => {
    let alive = true;

    const loadAll = async () => {
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
    };

    const loadBoard = async () => {
      const [lb, mine] = await Promise.all([
        supabase.rpc("tournament_leaderboard", { _tournament_id: id, _limit: 20 }),
        supabase.rpc("my_tournament_standing", { _tournament_id: id }),
      ]);
      if (!alive) return;
      setRows(((lb.data ?? []) as unknown as Row[]).map((r) => ({ ...r, rank: Number(r.rank) })));
      setMe((mine.data ?? { played: false }) as unknown as Standing);
    };

    void loadAll();

    // live ranking: refresh on an interval and whenever the tab regains focus
    const iv = window.setInterval(() => { if (!document.hidden) void loadBoard(); }, 10000);
    const onVis = () => { if (!document.hidden) void loadBoard(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);

    const ch = supabase
      .channel(`tbs-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_best_scores", filter: `tournament_id=eq.${id}` }, () => void loadBoard())
      .subscribe();

    return () => {
      alive = false;
      window.clearInterval(iv);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
      supabase.removeChannel(ch);
    };
  }, [id]);





  // ---- tournament registration (must join before playing) ----
  const [registered, setRegistered] = useState<boolean | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user?.id ?? null;
      if (!alive) return;
      setSignedIn(!!uid);
      if (!uid) { setRegistered(false); return; }
      const { data } = await supabase
        .from("tournament_registrations")
        .select("id")
        .eq("tournament_id", id)
        .eq("user_id", uid)
        .maybeSingle();
      if (alive) setRegistered(!!data);
    })();
    return () => { alive = false; };
  }, [id]);

  const register = async () => {
    const { data: s } = await supabase.auth.getSession();
    const uid = s.session?.user?.id;
    if (!uid) { navigate({ to: "/auth" }); return; }
    setJoining(true);
    const { error } = await supabase
      .from("tournament_registrations")
      .insert({ tournament_id: id, user_id: uid });
    setJoining(false);
    if (!error || error.code === "23505") setRegistered(true);
  };


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

  const sortedPrizes = useMemo(
    () => [...(t?.prizes ?? [])].sort((a, b) => (a.place ?? 99) - (b.place ?? 99)),
    [t],
  );

  if (t === undefined) {
    return (
      <StoreShell>
        <main dir={dir} className="wrap" style={{ padding: "60px 0" }}>{ar ? "جارِ تحميل البطولة…" : "Loading…"}</main>
      </StoreShell>
    );
  }
  if (!t) {
    return (
      <StoreShell>
        <main dir={dir} className="wrap" style={{ padding: "60px 0" }}>
          <p className="trn-empty">{ar ? "هذه البطولة غير متاحة." : "Tournament not available."}</p>
          <Link to="/games" className="btn btn-primary">{ar ? "عودة لساحة اللعب" : "Back to arena"}</Link>
        </main>
      </StoreShell>
    );
  }

  const target = status === "live" ? new Date(t.ends_at).getTime() - now : new Date(t.starts_at).getTime() - now;
  

  return (
    <StoreShell>
      <main dir={dir} className="wrap tpage arena">
        <header className={`arena-hero`} style={{ marginBottom: 18 }}>
          <ArenaFx />
          <div className="ar-in">
            <span className="ar-kicker">GX BLAST ARENA</span>
            <div className="arc-head">
              <div className="arc-ic" aria-hidden><GameIcon slug={t.game_slug} size={40} /></div>
              <h1 className="ar-title" style={{ fontSize: "clamp(24px,4.6vw,40px)" }}>{ar ? t.title_ar : t.title_en}</h1>
              <span className={`trn-badge b-${status}`}>
                {status === "live" ? (ar ? "نشطة الآن" : "Live now") : status === "ended" ? (ar ? "انتهت" : "Ended") : (ar ? "قريبًا" : "Upcoming")}
              </span>
            </div>

            <div className="ar-stats">
              <div className="ar-stat live">
                <span>{status === "live" ? (ar ? "تنتهي بعد" : "Ends in") : status === "ended" ? (ar ? "انتهت في" : "Ended on") : (ar ? "تبدأ بعد" : "Starts in")}</span>
                <b style={{ unicodeBidi: "isolate" }}>{status === "ended" ? formatDateTime(t.ends_at, ar) : formatCountdownFull(target, ar)}</b>
              </div>
              <div className="ar-stat">
                <span>{ar ? "المشاركون" : "Players"}</span>
                <b>{t.participants.toLocaleString("en")}</b>
              </div>
              <div className="ar-stat gold">
                <span>{ar ? "أفضل سكور" : "Top score"}</span>
                <b>{t.top_score.toLocaleString("en")}</b>
              </div>
              <div className="ar-stat">
                <span>{ar ? "عدد الفائزين" : "Winners"}</span>
                <b>{t.prizes.length}</b>
              </div>
            </div>

            <div className="tp-actions" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {status !== "ended" && !registered ? (
                <button type="button" className="ar-cta" disabled={joining} onClick={register}>
                  📝 {joining ? (ar ? "جارِ التسجيل…" : "Registering…") : signedIn === false ? (ar ? "سجّل دخولك للاشتراك" : "Sign in to register") : (ar ? "سجّل في البطولة" : "Register for tournament")}
                </button>
              ) : (
                <button
                  type="button"
                  className={"ar-cta" + (status !== "live" || !t.game_path ? " off" : "")}
                  disabled={status !== "live" || !t.game_path}
                  onClick={() => t.game_path && navigate({ to: t.game_path, search: { t: t.id } as never })}
                >
                  ⚡ {status === "live" ? (ar ? "ابدأ اللعب" : "Start playing") : status === "ended" ? (ar ? "انتهت البطولة" : "Tournament ended") : (ar ? "لم تبدأ بعد" : "Not started yet")}
                </button>
              )}
            </div>


          </div>
        </header>




        <div className="tp-grid">
          <section className="tp-card tp-board">
            <div className="lb-head">
              <h2>{ar ? "الترتيب المباشر" : "Live leaderboard"}</h2>
              <span className="lb-live"><i />{ar ? "مباشر" : "Live"}</span>
            </div>

            <div className="lb">
              <div className="lb-cols">
                <span className="c-r">#</span>
                <span className="c-p">{ar ? "اللاعب" : "Player"}</span>
                <span className="c-s">{ar ? "النقاط" : "Score"}</span>
              </div>

              {rows === null ? (
                <p className="tlb-empty">{ar ? "جارِ تحميل الترتيب…" : "Loading…"}</p>
              ) : rows.length === 0 ? (
                <p className="tlb-empty">{ar ? "لا يوجد لاعبون بعد — كن أول من يسجّل سكور!" : "No players yet."}</p>
              ) : (
                <div className="lb-body">
                  {rows.map((r) => {
                    const mine = me?.played && me.rank === r.rank;
                    const glow = r.level_color || "#4aa8ff";
                    const inner = (
                      <>
                        <span className={"lb-r" + (r.rank <= 3 ? ` top t${r.rank}` : "")}>
                          {r.rank}
                        </span>
                        <span className="lb-avwrap" style={{ ["--glow" as string]: glow }}>
                          {r.avatar_url
                            ? <img src={r.avatar_url} alt="" className="lb-av" loading="lazy" decoding="async" />
                            : <span className="lb-av ph">{nameOf(r).slice(0, 1)}</span>}
                        </span>

                        <span className="lb-who">
                          <b className="lb-nm">
                            {nameOf(r)}
                            {mine ? <span className="lb-youtag">{ar ? "أنت" : "You"}</span> : null}
                          </b>
                          {(ar ? r.level_name_ar : r.level_name_en) ? (
                            <em className="lb-lvlname" style={{ color: glow }}>{ar ? r.level_name_ar : r.level_name_en}</em>
                          ) : null}
                        </span>

                        <b className="lb-sc" dir="ltr">{r.score.toLocaleString("en-US")}</b>
                      </>
                    );
                    const cls = "lb-row" + (mine ? " me" : "") + (r.rank <= 3 ? ` t${r.rank}` : "");
                    return r.username ? (
                      <Link key={r.user_id} to="/u/$username" params={{ username: r.username }} className={cls}>
                        {inner}
                      </Link>
                    ) : (
                      <div key={r.user_id} className={cls}>{inner}</div>
                    );
                  })}
                </div>
              )}

              {/* "you" row only when outside the visible list */}
              {me?.played && (rows ?? []).some((r) => r.rank === me.rank) ? null : (
                <div className="lb-row me sticky">
                  {me?.played ? (
                    <>
                      <span className="lb-r">{me.rank}</span>
                      <span className="lb-avwrap">
                        {me.avatar_url ? <img src={me.avatar_url} alt="" className="lb-av" /> : <span className="lb-av ph">{ar ? "أنا" : "Me"}</span>}
                      </span>
                      <span className="lb-who">
                        <b className="lb-nm">
                          {nameOf({ username: me.username ?? null, full_name: me.full_name ?? null })}
                          <span className="lb-youtag">{ar ? "أنت" : "You"}</span>
                        </b>
                        {me.total ? <em className="lb-lvlname">{ar ? `من ${me.total} لاعب` : `of ${me.total} players`}</em> : null}
                      </span>
                      <b className="lb-sc" dir="ltr">{(me.score ?? 0).toLocaleString("en-US")}</b>
                    </>
                  ) : (
                    <span className="lb-who"><b className="lb-nm">{ar ? "لم تلعب بعد — جولة واحدة تكفي لتدخل الترتيب 💪" : "Play one round to enter the ranking 💪"}</b></span>
                  )}
                </div>
              )}

            </div>
          </section>


          <aside className="tp-side">
            <section className="tp-card">
              <h2>{ar ? "جوائز البطولة" : "Tournament prizes"}</h2>
              {t.prizes.length === 0 ? (
                <p className="tlb-empty">{ar ? "سيتم الإعلان عن الجوائز قريبًا." : "Prizes announced soon."}</p>
              ) : (
                <>
                  <div className="przlist">
                    {sortedPrizes.slice(0, 3).map((p, i) => (
                      <PrizeRow key={p.place ?? i + 1} p={p} place={p.place ?? i + 1} ar={ar} />
                    ))}

                  </div>
                  {sortedPrizes.length > 3 && (
                    <button type="button" className="prz-all" onClick={() => setPrizesOpen(true)}>
                      {ar ? `عرض كل الجوائز (${sortedPrizes.length})` : `View all prizes (${sortedPrizes.length})`}
                    </button>
                  )}
                </>
              )}
            </section>
          </aside>
        </div>

        {prizesOpen && (
          <div className="tp-modal" role="dialog" aria-modal="true" onClick={() => setPrizesOpen(false)}>
            <div className="tp-modal-card" onClick={(e) => e.stopPropagation()}>
              <h3 className="tp-modal-t">{ar ? "كل جوائز البطولة" : "All tournament prizes"}</h3>
              <div className="przlist scroll">
                {sortedPrizes.map((p, i) => (
                  <PrizeRow key={p.place ?? i + 1} p={p} place={p.place ?? i + 1} ar={ar} />
                ))}

              </div>
              <button type="button" className="btn btn-primary" onClick={() => setPrizesOpen(false)}>
                {ar ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        )}
      </main>
    </StoreShell>
  );
}
