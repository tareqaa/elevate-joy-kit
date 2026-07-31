import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { StoreShell } from "@/components/gx/StoreShell";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { useLang } from "@/lib/gx/i18n";
import { GameIcon } from "@/components/gx/games/GameIcon";
import { ArenaFx } from "@/components/gx/games/ArenaFx";
import { formatCountdown, formatDateTime } from "@/lib/gx/games/time";
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
      <main className="container" style={{ padding: "60px 0" }} role="alert">
        {error.message}
      </main>
    </StoreShell>
  ),
  notFoundComponent: () => (
    <StoreShell>
      <main className="container" style={{ padding: "60px 0" }}>
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
  const loaded = Route.useLoaderData() as { serverNow: string; tournaments: TournamentRow[] };
  const { serverNow, tournaments } = loaded;
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

  // small "top players" board for the featured tournament — gives a daily reason to come back
  const [top, setTop] = useState<TopRow[] | null>(null);
  useEffect(() => {
    if (!featured?.id) return;
    let alive = true;
    supabase
      .rpc("tournament_leaderboard", { _tournament_id: featured.id, _limit: 3 })
      .then(({ data }) => {
        if (alive) setTop(((data ?? []) as unknown as TopRow[]).map((r) => ({ ...r, rank: Number(r.rank) })));
      });
    return () => {
      alive = false;
    };
  }, [featured?.id]);

  return (
    <StoreShell>
      <main dir={dir} className="arena">
        <section className="container">
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
                      <h1 className="ar-title">{ar ? featured.title_ar : featured.title_en}</h1>
                      <p className="ar-sub">{featured.game_slug.toUpperCase()} · GX ARENA</p>
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
                </>
              ) : (
                <>
                  <h1 className="ar-title">GX ARENA</h1>
                  <span className="ar-cta off">{ar ? "لا توجد بطولات حاليًا" : "No tournaments yet"}</span>
                </>
              )}
            </div>
          </div>
        </section>

        {featured && (
          <section className="container">
            <h2 className="ar-sec-title">🏆 {ar ? "أفضل اللاعبين" : "Top players"}</h2>
            <div className="tp3">
              {top === null ? (
                <p className="trn-empty">{ar ? "جارِ تحميل الترتيب…" : "Loading…"}</p>
              ) : top.length === 0 ? (
                <p className="trn-empty">{ar ? "ما في لاعبين بعد — كن أول اسم على القمة." : "No players yet — be the first."}</p>
              ) : (
                top.map((r) => (
                  <div key={r.user_id} className={`tp3-row m${r.rank}`}>
                    <i aria-hidden>{MEDALS[r.rank - 1] ?? "🎮"}</i>
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
          </section>
        )}

        <section className="container">
          <h2 className="ar-sec-title">{ar ? "البطولات القادمة" : "Upcoming tournaments"}</h2>
          {upcoming.length === 0 ? (
            <p className="trn-empty">{ar ? "ما في بطولات قادمة حاليًا — ترقّب الأسبوع الجاي." : "Nothing scheduled yet — check back soon."}</p>
          ) : (
            <ul className="uplist">
              {upcoming.map((t, i) => {
                const pool = prizePool(t.prizes);
                return (
                  <li key={t.id} className={`uprow is-${t.status}`} style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}>
                    <span className="up-ic" aria-hidden><GameIcon slug={t.game_slug} size={34} /></span>
                    <span className="up-nm">{ar ? t.title_ar : t.title_en}</span>
                    <span className="up-time" style={{ unicodeBidi: "isolate" }}>
                      🕒 {t.status === "live"
                        ? `${ar ? "ينتهي خلال" : "Ends in"} ${formatCountdown(t.end - now, ar)}`
                        : `${ar ? "تبدأ خلال" : "Starts in"} ${formatCountdown(t.start - now, ar)}`}
                    </span>
                    <span className="up-prz">
                      🏆 {pool > 0 ? `${pool.toLocaleString("en")} GX Coin` : `${t.prizes.length} ${ar ? "جوائز" : "prizes"}`}
                    </span>
                    <Link to="/games/t/$id" params={{ id: t.id }} className="up-go">
                      {t.status === "live" ? (ar ? "🚀 العب الآن" : "🚀 Play now") : ar ? "التفاصيل" : "Details"}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {past.length > 0 && (
          <section className="container">
            <h2 className="ar-sec-title">{ar ? "سجل البطولات" : "Past tournaments"}</h2>
            <ul className="uplist past">
              {past.map((t) => (
                <li key={t.id} className="uprow is-ended">
                  <span className="up-ic" aria-hidden><GameIcon slug={t.game_slug} size={34} /></span>
                  <span className="up-nm">{ar ? t.title_ar : t.title_en}</span>
                  <span className="up-time" style={{ unicodeBidi: "isolate" }}>
                    {ar ? "انتهت في" : "Ended on"} {formatDateTime(t.ends_at, ar)}
                  </span>
                  <span className="up-prz">👥 {t.participants.toLocaleString("en")}</span>
                  <Link to="/games/t/$id" params={{ id: t.id }} className="up-go ghost">
                    {ar ? "النتائج" : "Results"}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </StoreShell>
  );
}
