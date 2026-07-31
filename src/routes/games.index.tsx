import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { StoreShell } from "@/components/gx/StoreShell";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { useLang } from "@/lib/gx/i18n";
import { supabase } from "@/integrations/supabase/client";
import { GameIcon } from "@/components/gx/games/GameIcon";
import { ArenaFx } from "@/components/gx/games/ArenaFx";
import { HowToPlaySlides } from "@/components/gx/games/HowToPlaySlides";
import { formatCountdown, formatDateTime } from "@/lib/gx/games/time";
import { CarouselRow } from "@/components/gx/CarouselRow";
import { listTournaments, type TournamentRow, type TournamentPrize } from "@/lib/gx/tournaments.functions";



export const Route = createFileRoute("/games/")({
  head: () => ({
    meta: [
      { title: "GX Arena — بطولات GX Blast الأسبوعية" },
      {
        name: "description",
        content:
          "ادخل GX Arena: بطولة GX Blast الأسبوعية، ترتيب مباشر، جوائز GX Coins وخصومات، وتقدّم في مستويات GX XP.",
      },
      { property: "og:title", content: "GX ARENA — GX Blast Weekly Championship" },
      { property: "og:description", content: "بطولات أسبوعية، ليدربورد مباشر، وجوائز GX Coins و XP." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: STORE_HEAD_LINKS,
  }),
  loader: () => listTournaments(),
  errorComponent: ({ error }) => (
    <StoreShell>
      <main className="wrap" style={{ padding: "60px 0" }} role="alert">
        {error.message}
      </main>
    </StoreShell>
  ),
  notFoundComponent: () => (
    <StoreShell>
      <main className="wrap" style={{ padding: "60px 0" }}>
        لا توجد بطولات.
      </main>
    </StoreShell>
  ),
  component: GamesPage,
});

/** ticking clock anchored to server time (browser clock changes can't fake it) */
function useServerClock(serverNow: string) {
  const offset = useMemo(() => new Date(serverNow).getTime() - Date.now(), [serverNow]);
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    setNow(Date.now() + offset);
    const id = window.setInterval(() => setNow(Date.now() + offset), 1000);
    return () => window.clearInterval(id);
  }, [offset]);
  return now;
}

const MEDALS = ["🥇", "🥈", "🥉"];

/** visual only: sums the GX Coins mentioned in the prize labels for a "prize pool" figure */
export function prizePool(prizes: TournamentPrize[]): number {
  return prizes.reduce((sum, p) => {
    const text = p.label_en || p.label_ar || "";
    const m = text.match(/(\d[\d,\.]*)\s*(?:gx\s*)?(?:coins?|كوين|كوينز)/gi);

    if (!m) return sum;
    const n = m.reduce((s, chunk) => {
      const num = Number((chunk.match(/\d[\d,\.]*/)?.[0] ?? "0").replace(/[,\.]/g, ""));
      return s + (Number.isFinite(num) ? num : 0);
    }, 0);
    return sum + n;
  }, 0);
}

type TopRow = { rank: number; user_id: string; username: string | null; full_name: string | null; avatar_url: string | null; score: number };
const nameOf = (r: TopRow) => r.username || r.full_name || "GX Player";

function GamesPage() {
  const loaded = Route.useLoaderData() as { serverNow: string; tournaments: TournamentRow[]; carouselCount: number };
  const { serverNow, tournaments, carouselCount } = loaded;

  const { lang, dir } = useLang();
  const ar = lang === "ar";

  const now = useServerClock(serverNow);

  // recompute status from the SERVER-anchored clock, never the raw browser clock
  const cards = useMemo(() => {
    const rank = { live: 0, upcoming: 1, ended: 2 } as const;
    return tournaments
      .map((t) => {
        const start = new Date(t.starts_at).getTime();
        const end = new Date(t.ends_at).getTime();
        let status: TournamentRow["live_status"] = t.live_status;
        if (status !== "ended") {
          if (now >= end) status = "ended";
          else if (now < start) status = "upcoming";
          else status = "live";
        }
        return { ...t, status, start, end };
      })
      .sort((a, b) => rank[a.status] - rank[b.status] || a.start - b.start);
  }, [tournaments, now]);

  const featured = cards.find((c) => c.status === "live") ?? cards.find((c) => c.status === "upcoming") ?? cards[0];
  const fPool = featured ? prizePool(featured.prizes) : 0;
  const upcoming = cards.filter((c) => c.id !== featured?.id && c.status !== "ended");
  const past = cards.filter((c) => c.id !== featured?.id && c.status === "ended");

  // leaderboard for the featured tournament — gives a daily reason to come back
  const [top, setTop] = useState<TopRow[] | null>(null);
  const [how, setHow] = useState(false);
  const [prizesOpen, setPrizesOpen] = useState(false);

  useEffect(() => {
    if (!featured?.id) return;
    let alive = true;
    supabase
      .rpc("tournament_leaderboard", { _tournament_id: featured.id, _limit: 10 })
      .then(({ data }) => {
        if (alive) setTop(((data ?? []) as unknown as TopRow[]).map((r) => ({ ...r, rank: Number(r.rank) })));
      });
    return () => {
      alive = false;
    };
  }, [featured?.id]);

  const prizes = useMemo(
    () => [...(featured?.prizes ?? [])].sort((a, b) => (a.place ?? 99) - (b.place ?? 99)),
    [featured],
  );

  const steps = ar
    ? [
        { i: "🧩", t: "اسحب القطعة", d: "عندك ٣ قطع — اسحب أي وحدة وحطها على اللوح ٨×٨." },
        { i: "💥", t: "امسح خط", d: "كمّل صف أو عمود كامل ليختفي وتاخذ نقاط." },
        { i: "🔥", t: "اجمع كومبو", d: "امسح أكثر من خط بحركة وحدة، والنقاط تتضاعف." },
        { i: "🏆", t: "اصعد بالترتيب", d: "أعلى سكور بالبطولة بياخذ جائزة مركزه." },
      ]
    : [
        { i: "🧩", t: "Drag a piece", d: "You get 3 pieces — drop any of them on the 8×8 board." },
        { i: "💥", t: "Clear a line", d: "Fill a full row or column to clear it and score." },
        { i: "🔥", t: "Chain combos", d: "Clear multiple lines in one move to multiply points." },
        { i: "🏆", t: "Climb the ranks", d: "Your best score decides your prize placement." },
      ];

  return (
    <StoreShell>
      <main dir={dir} className="arena">
        <section className="wrap">
          <div className="arena-hero">
            <ArenaFx />
            <div className="ar-in">
              <span className="ar-kicker">GX ARENA</span>
              {featured ? (
                <>
                  <div className="ar-game">
                    <div className="ar-game-ic" aria-hidden>
                      <GameIcon slug={featured.game_slug} size={62} />
                    </div>
                    <div className="ar-game-tx">
                      <span className={`trn-badge b-${featured.status}`}>
                        {featured.status === "live"
                          ? ar ? "🔥 البطولة الحالية" : "🔥 Live now"
                          : featured.status === "upcoming"
                            ? ar ? "البطولة القادمة" : "Next up"
                            : ar ? "انتهت" : "Ended"}
                      </span>
                      <h1 className="ar-title">GX BLAST</h1>
                      <p className="ar-sub">{ar ? featured.title_ar : featured.title_en}</p>
                    </div>
                  </div>

                  <div className="ar-stats">
                    <div className="ar-stat live">
                      <span>
                        {featured.status === "live"
                          ? ar ? "ينتهي خلال" : "Ends in"
                          : featured.status === "upcoming"
                            ? ar ? "تبدأ خلال" : "Starts in"
                            : ar ? "انتهت في" : "Ended on"}
                      </span>
                      <b style={{ unicodeBidi: "isolate" }}>
                        {featured.status === "ended"
                          ? formatDateTime(featured.ends_at, ar)
                          : formatCountdown(
                              (featured.status === "live" ? featured.end : featured.start) - now,
                              ar,
                            )}
                      </b>
                    </div>
                    <div className="ar-stat">
                      <span>{ar ? "المشاركون" : "Players"}</span>
                      <b>{featured.participants.toLocaleString("en")}</b>
                    </div>
                    <div className="ar-stat gold">
                      <span>{ar ? "مجموع الجوائز" : "Prize pool"}</span>
                      <b>
                        {fPool > 0
                          ? `${fPool.toLocaleString("en")} GX`
                          : `${featured.prizes.length} ${ar ? "جوائز" : "prizes"}`}
                      </b>
                    </div>
                  </div>

                  <div className="ar-actions">
                    {featured.status === "live" ? (
                      <Link to="/games/t/$id" params={{ id: featured.id }} className="ar-cta">
                        ⚡ {ar ? "العب الآن" : "Play now"}
                      </Link>
                    ) : (
                      <span className="ar-cta off">
                        {featured.status === "ended"
                          ? ar ? "انتهت البطولة" : "Tournament ended"
                          : ar ? "لم تبدأ بعد" : "Not started yet"}
                      </span>
                    )}
                    <button type="button" className="ar-cta2" onClick={() => setHow(true)}>
                      🎮 {ar ? "كيف ألعب؟" : "How to play"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h1 className="ar-title">GX BLAST</h1>
                  <span className="ar-cta off">{ar ? "لا توجد بطولات حاليًا" : "No tournaments yet"}</span>
                </>
              )}
            </div>
          </div>
        </section>

        {featured && (
          <section className="wrap">
            <div className="ar-cols">
              {/* ---- leaderboard ---- */}
              <div className="ar-panel">
                <h2 className="ar-sec-title" style={{ marginTop: 0 }}>🏆 {ar ? "الترتيب المباشر" : "Live leaderboard"}</h2>
                <div className="tp3">
                  {top === null ? (
                    <p className="trn-empty">{ar ? "جارِ تحميل الترتيب…" : "Loading…"}</p>
                  ) : top.length === 0 ? (
                    <p className="trn-empty">{ar ? "ما في لاعبين بعد — كن أول اسم على القمة." : "No players yet — be the first."}</p>
                  ) : (
                    top.map((r) => (
                      <div key={r.user_id} className={`tp3-row m${r.rank}`}>
                        <i aria-hidden>{MEDALS[r.rank - 1] ?? `#${r.rank}`}</i>
                        {r.avatar_url ? (
                          <img src={r.avatar_url} alt="" className="tp3-av" loading="lazy" />
                        ) : (
                          <span className="tp3-av ph">{nameOf(r).slice(0, 1)}</span>
                        )}
                        <span className="tp3-nm">{nameOf(r)}</span>
                        <b className="tp3-sc" dir="ltr">{r.score.toLocaleString("en")}</b>
                      </div>
                    ))
                  )}
                  <Link to="/games/t/$id" params={{ id: featured.id }} className="tp3-all">
                    {ar ? "الترتيب الكامل" : "Full leaderboard"}
                  </Link>
                </div>
              </div>

              {/* ---- prizes ---- */}
              <div className="ar-panel">
                <h2 className="ar-sec-title" style={{ marginTop: 0 }}>🎁 {ar ? "جوائز البطولة" : "Tournament prizes"}</h2>
                <div className="tp3">
                  {prizes.length === 0 ? (
                    <p className="trn-empty">{ar ? "سيتم الإعلان عن الجوائز قريبًا." : "Prizes announced soon."}</p>
                  ) : (
                    <>
                      <div className="przlist">
                        {prizes.slice(0, 5).map((p, i) => {
                          const place = p.place ?? i + 1;
                          return (
                            <div key={place} className={`przrow g${Math.min(place, 4)}`}>
                              <i aria-hidden>{MEDALS[place - 1] ?? "🎁"}</i>
                              <b>{ar ? `المركز ${place}` : `Place ${place}`}</b>
                              <span>{ar ? p.label_ar : p.label_en}</span>
                            </div>
                          );
                        })}
                      </div>
                      {prizes.length > 5 && (
                        <button type="button" className="prz-all" onClick={() => setPrizesOpen(true)}>
                          {ar ? `عرض كل الجوائز (${prizes.length})` : `View all prizes (${prizes.length})`}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ---- how to play ---- */}
        <section className="wrap">
          <h2 className="ar-sec-title">🎮 {ar ? "كيف تلعب GX BLAST" : "How to play GX BLAST"}</h2>
          <div className="htg">
            {steps.map((s, i) => (
              <article key={s.t} className="htg-c" style={{ animationDelay: `${i * 70}ms` }}>
                <span className="htg-n">{i + 1}</span>
                <i aria-hidden>{s.i}</i>
                <b>{s.t}</b>
                <p>{s.d}</p>
              </article>
            ))}
          </div>
          <button type="button" className="prz-all" onClick={() => setHow(true)}>
            {ar ? "شاهد الشرح خطوة بخطوة" : "Watch the step-by-step guide"}
          </button>
        </section>

        <section className="wrap">
          <h2 className="ar-sec-title">{ar ? "كل البطولات" : "All tournaments"}</h2>
          {carouselItems.length === 0 ? (
            <p className="trn-empty">{ar ? "ما في بطولات حاليًا — ترقّب الأسبوع الجاي." : "Nothing scheduled yet — check back soon."}</p>
          ) : (
            <CarouselRow className="tcar">
              {carouselItems.map((t) => {
                const pool = prizePool(t.prizes);
                return (
                  <article key={t.id} className={`tcar-c is-${t.status}`}>
                    <div className="tcar-top">
                      <span className="tcar-ic" aria-hidden><GameIcon slug={t.game_slug} size={40} /></span>
                      <span className={`trn-badge b-${t.status}`}>
                        {t.status === "live"
                          ? ar ? "🔥 نشطة الآن" : "🔥 Live"
                          : t.status === "upcoming"
                            ? ar ? "قريبًا" : "Upcoming"
                            : ar ? "انتهت" : "Ended"}
                      </span>
                    </div>
                    <h3 className="tcar-nm">{ar ? t.title_ar : t.title_en}</h3>
                    <p className="tcar-time" style={{ unicodeBidi: "isolate" }}>
                      🕒 {t.status === "ended"
                        ? `${ar ? "انتهت في" : "Ended on"} ${formatDateTime(t.ends_at, ar)}`
                        : t.status === "live"
                          ? `${ar ? "ينتهي خلال" : "Ends in"} ${formatCountdown(t.end - now, ar)}`
                          : `${ar ? "تبدأ خلال" : "Starts in"} ${formatCountdown(t.start - now, ar)}`}
                    </p>
                    <div className="tcar-meta">
                      <span>🏆 {pool > 0 ? `${pool.toLocaleString("en")} GX` : `${t.prizes.length} ${ar ? "جوائز" : "prizes"}`}</span>
                      <span>👥 {t.participants.toLocaleString("en")}</span>
                    </div>
                    <Link to="/games/t/$id" params={{ id: t.id }} className="tcar-go">
                      {t.status === "live"
                        ? ar ? "🚀 سجّل والعب" : "🚀 Register & play"
                        : t.status === "upcoming"
                          ? ar ? "سجّل الآن" : "Register now"
                          : ar ? "النتائج" : "Results"}
                    </Link>
                  </article>
                );
              })}
            </CarouselRow>
          )}
        </section>


        {how && (
          <div className="tp-modal" role="dialog" aria-modal="true" onClick={() => setHow(false)}>
            <div className="tp-modal-card" onClick={(e) => e.stopPropagation()}>
              <h3 className="tp-modal-t">{ar ? "كيف تلعب GX BLAST" : "How to play GX BLAST"}</h3>
              <HowToPlaySlides onDone={() => setHow(false)} doneLabel={ar ? "تمام" : "Got it"} />
            </div>
          </div>
        )}

        {prizesOpen && (
          <div className="tp-modal" role="dialog" aria-modal="true" onClick={() => setPrizesOpen(false)}>
            <div className="tp-modal-card" onClick={(e) => e.stopPropagation()}>
              <h3 className="tp-modal-t">{ar ? "كل جوائز البطولة" : "All tournament prizes"}</h3>
              <div className="przlist scroll">
                {prizes.map((p, i) => {
                  const place = p.place ?? i + 1;
                  return (
                    <div key={place} className={`przrow g${Math.min(place, 4)}`}>
                      <i aria-hidden>{MEDALS[place - 1] ?? "🎁"}</i>
                      <b>{ar ? `المركز ${place}` : `Place ${place}`}</b>
                      <span>{ar ? p.label_ar : p.label_en}</span>
                    </div>
                  );
                })}
              </div>
              <button type="button" className="prz-all" onClick={() => setPrizesOpen(false)}>
                {ar ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        )}
      </main>
    </StoreShell>
  );
}

