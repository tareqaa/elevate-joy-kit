import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { StoreShell } from "@/components/gx/StoreShell";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { useLang } from "@/lib/gx/i18n";
import { GameIcon } from "@/components/gx/games/GameIcon";
import { TournamentEntryModal } from "@/components/gx/games/TournamentEntryModal";
import { listTournaments, type TournamentRow } from "@/lib/gx/tournaments.functions";

export const Route = createFileRoute("/games/")({
  head: () => ({
    meta: [
      { title: "البطولات النشطة — ساحة اللعب في GX Store" },
      {
        name: "description",
        content:
          "تابع بطولات GX Store النشطة والقادمة، شاهد عدد المشاركين وأعلى سكور والجوائز، وادخل التحدي واربح GX Coins و XP.",
      },
      { property: "og:title", content: "ساحة اللعب — بطولات GX Store" },
      { property: "og:description", content: "بطولات نشطة وقادمة مع جوائز GX Coins و XP." },
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

function fmtLeft(ms: number, ar: boolean) {
  if (ms <= 0) return ar ? "انتهت" : "Ended";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  if (d > 0) return `${d}${ar ? "ي" : "d"} ${p(h)}:${p(m)}:${p(sec)}`;
  return `${p(h)}:${p(m)}:${p(sec)}`;
}

const MEDALS = ["🥇", "🥈", "🥉"];

function GamesPage() {
  const loaded = Route.useLoaderData() as {
    serverNow: string;
    tournaments: TournamentRow[];
  };
  const { serverNow, tournaments } = loaded;
  const { lang, dir } = useLang();
  const ar = lang === "ar";
  const [openId, setOpenId] = useState<string | null>(null);

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

  return (
    <StoreShell>
      <main dir={dir}>
        <section className="container games-hero">
          <div className="gh-in">
            <div className="gh-ic">🏆</div>
            <div>
              <h1>{ar ? "ساحة اللعب — البطولات" : "Arena — Tournaments"}</h1>
              <p>
                {ar
                  ? "تابع البطولات النشطة الآن، شارك قبل انتهاء الوقت، واربح GX Coins و XP وخصومات."
                  : "Follow the live tournaments, join before time runs out, and win GX Coins, XP and discounts."}
              </p>
            </div>
          </div>
        </section>

        <section className="container">
          {cards.length === 0 ? (
            <p className="trn-empty">{ar ? "لا توجد بطولات حاليًا." : "No tournaments yet."}</p>
          ) : (
            <div className="trn-grid">
              {cards.map((t) => {
                const live = t.status === "live";
                const ended = t.status === "ended";
                return (
                  <article key={t.id} className={`trn-card is-${t.status}`}>
                    <header className="trn-top">
                      <div className="trn-ic" aria-hidden>
                        <GameIcon slug={t.game_slug} size={40} />
                      </div>
                      <div className="trn-titles">
                        <h2>{ar ? t.title_ar : t.title_en}</h2>
                        <span className="trn-game">{t.game_slug}</span>
                      </div>
                      <span className={`trn-badge b-${t.status}`}>
                        {live
                          ? ar
                            ? "نشطة الآن"
                            : "Live now"
                          : ended
                            ? ar
                              ? "انتهت"
                              : "Ended"
                            : ar
                              ? "قريبًا"
                              : "Upcoming"}
                      </span>
                    </header>

                    <div className={`trn-timer ${live ? "on" : ""}`}>
                      <span>
                        {live
                          ? ar
                            ? "ينتهي خلال"
                            : "Ends in"
                          : ended
                            ? ar
                              ? "انتهت في"
                              : "Ended on"
                            : ar
                              ? "تبدأ خلال"
                              : "Starts in"}
                      </span>
                      <b dir="ltr" style={{ unicodeBidi: "isolate" }}>
                        {live
                          ? fmtLeft(t.end - now, ar)
                          : ended
                            ? new Date(t.ends_at).toLocaleDateString("en-GB")
                            : fmtLeft(t.start - now, ar)}
                      </b>
                    </div>

                    <div className="trn-stats">
                      <div className="trn-stat">
                        <span>{ar ? "المشاركون" : "Players"}</span>
                        <b>{t.participants.toLocaleString("en")}</b>
                      </div>
                      <div className="trn-stat">
                        <span>{ar ? "أعلى سكور" : "Top score"}</span>
                        <b>{t.top_score.toLocaleString("en")}</b>
                      </div>
                    </div>

                    {t.prizes.length > 0 && (
                      <ul className="trn-prizes">
                        {t.prizes.slice(0, 3).map((p, i) => (
                          <li key={p.place ?? i}>
                            <i aria-hidden>{MEDALS[i] ?? "🎁"}</i>
                            <span>{ar ? p.label_ar : p.label_en}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {live && t.game_path ? (
                      <button type="button" className="btn btn-primary trn-btn" onClick={() => setOpenId(t.id)}>
                        {ar ? "ادخل البطولة" : "Enter tournament"}
                      </button>
                    ) : (
                      <button type="button" className="btn trn-btn trn-btn-off" disabled>
                        {ended
                          ? ar
                            ? "انتهت البطولة"
                            : "Tournament ended"
                          : ar
                            ? "لم تبدأ بعد"
                            : "Not started yet"}
                      </button>
                    )}
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
