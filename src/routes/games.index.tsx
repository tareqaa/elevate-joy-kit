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

  return (
    <StoreShell>
      <main dir={dir} className="arena">
        <section className="container">
          <div className="arena-hero">
            <ArenaFx />
            <div className="ar-in">
              <span className="ar-kicker">GX ARENA</span>
              <h1 className="ar-title">GX ARENA</h1>
              <p className="ar-sub">GX BLAST WEEKLY CHAMPIONSHIP</p>
              <p className="ar-desc">
                {ar
                  ? "بطولة أسبوعية واحدة، ترتيب مباشر، وجوائز حقيقية: GX Coins وخصومات ونقاط XP. سجّل أعلى سكور قبل انتهاء الوقت واحجز مكانك في القمة."
                  : "One weekly championship, a live leaderboard and real rewards: GX Coins, discounts and XP. Post the highest score before the clock runs out."}
              </p>

              {featured ? (
                <>
                  <div className="ar-stats">
                    <div className="ar-stat">
                      <span>{ar ? "البطولة الحالية" : "Current event"}</span>
                      <b>{ar ? featured.title_ar : featured.title_en}</b>
                    </div>
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
                      ⚡ {ar ? "ادخل البطولة" : "Enter tournament"}
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
                <span className="ar-cta off">{ar ? "لا توجد بطولات حاليًا" : "No tournaments yet"}</span>
              )}
            </div>
          </div>
        </section>

        <section className="container">
          <h2 className="ar-sec-title">{ar ? "كل البطولات" : "All tournaments"}</h2>
          {cards.length === 0 ? (
            <p className="trn-empty">{ar ? "لا توجد بطولات حاليًا." : "No tournaments yet."}</p>
          ) : (
            <div className="ar-list">
              {cards.map((t, i) => {
                const live = t.status === "live";
                const ended = t.status === "ended";
                const pool = prizePool(t.prizes);
                return (
                  <article
                    key={t.id}
                    className={`arc is-${t.status}`}
                    style={{ animationDelay: `${Math.min(i, 6) * 70}ms` }}
                  >
                    <div className="arc-ic" aria-hidden>
                      <GameIcon slug={t.game_slug} size={46} />
                    </div>

                    <div className="arc-body">
                      <div className="arc-head">
                        <h2>{ar ? t.title_ar : t.title_en}</h2>
                        <span className={`trn-badge b-${t.status}`}>
                          {live
                            ? ar ? "نشطة الآن" : "Live now"
                            : ended
                              ? ar ? "انتهت" : "Ended"
                              : ar ? "قريبًا" : "Upcoming"}
                        </span>
                        <span className="trn-game">{t.game_slug}</span>
                      </div>

                      <div className="arc-metrics">
                        <div className="arc-m time">
                          <span>
                            {live
                              ? ar ? "ينتهي خلال" : "Ends in"
                              : ended
                                ? ar ? "انتهت في" : "Ended on"
                                : ar ? "تبدأ خلال" : "Starts in"}
                          </span>
                          <b style={{ unicodeBidi: "isolate" }}>
                            {ended
                              ? formatDateTime(t.ends_at, ar)
                              : formatCountdown((live ? t.end : t.start) - now, ar)}
                          </b>
                        </div>
                        <div className="arc-m pool">
                          <span>{ar ? "مجموع الجوائز" : "Prize pool"}</span>
                          <b>
                            {pool > 0
                              ? `${pool.toLocaleString("en")} GX`
                              : `${t.prizes.length} ${ar ? "جوائز" : "prizes"}`}
                          </b>
                        </div>
                        <div className="arc-m">
                          <span>{ar ? "اللاعبون" : "Players"}</span>
                          <b>{t.participants.toLocaleString("en")}</b>
                        </div>
                        <div className="arc-m">
                          <span>{ar ? "أفضل سكور" : "Top score"}</span>
                          <b>{t.top_score.toLocaleString("en")}</b>
                        </div>
                      </div>

                      {t.prizes.length > 0 && (
                        <ul className="trn-prizes">
                          {t.prizes.slice(0, 3).map((p, idx) => (
                            <li key={p.place ?? idx}>
                              <i aria-hidden>{MEDALS[idx] ?? "🎁"}</i>
                              <span>{ar ? p.label_ar : p.label_en}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="arc-cta">
                      {live && t.game_path ? (
                        <Link to="/games/t/$id" params={{ id: t.id }} className="btn btn-primary trn-btn">
                          {ar ? "ادخل البطولة" : "Enter tournament"}
                        </Link>
                      ) : (
                        <button type="button" className="btn trn-btn trn-btn-off" disabled>
                          {ended
                            ? ar ? "انتهت البطولة" : "Tournament ended"
                            : ar ? "لم تبدأ بعد" : "Not started yet"}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </StoreShell>
  );
}
