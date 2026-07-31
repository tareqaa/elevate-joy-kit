import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { StoreShell } from "@/components/gx/StoreShell";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { useLang } from "@/lib/gx/i18n";
import { GameIcon } from "@/components/gx/games/GameIcon";
import { ArenaFx } from "@/components/gx/games/ArenaFx";
import { formatCountdown, formatDateTime } from "@/lib/gx/games/time";
import { CarouselRow } from "@/components/gx/CarouselRow";
import { supabase } from "@/integrations/supabase/client";
import { listTournaments, type TournamentRow, type TournamentPrize } from "@/lib/gx/tournaments.functions";

export const Route = createFileRoute("/games/")({
  head: () => ({
    meta: [
      { title: "GX Arena — بطولات GX Blast المتاحة" },
      {
        name: "description",
        content: "شوف البطولات المتاحة في GX Arena: مدة كل بطولة، عدد المشاركين، وعدد الجوائز — وسجّل لتدخل وتلعب.",
      },
      { property: "og:title", content: "GX ARENA — البطولات المتاحة" },
      { property: "og:description", content: "بطولات GX Blast المتاحة، مواعيدها الدقيقة، وجوائزها." },
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
  const { serverNow, tournaments, carouselCount } = Route.useLoaderData() as {
    serverNow: string;
    tournaments: TournamentRow[];
    carouselCount: number;
  };

  const { lang, dir } = useLang();
  const ar = lang === "ar";
  const now = useServerClock(serverNow);

  // which tournaments the current user already joined (button label only)
  const [joined, setJoined] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user?.id;
      if (!uid) return;
      const { data } = await supabase.from("tournament_registrations").select("tournament_id").eq("user_id", uid);
      if (alive && data) setJoined(new Set(data.map((r) => r.tournament_id as string)));
    })();
    return () => { alive = false; };
  }, []);

  // recompute status from the SERVER-anchored clock, never the raw browser clock
  const cards = useMemo(() => {
    const rank = { live: 0, upcoming: 1, ended: 2 } as const;
    return tournaments
      .map((t) => {
        const start = new Date(t.starts_at).getTime();
        const end = new Date(t.ends_at).getTime();
        let status: TournamentRow["live_status"] = t.live_status;
        if (now >= end) status = "ended";
        else if (now < start) status = "upcoming";
        else status = "live";
        return { ...t, status, start, end };
      })
      .sort((a, b) => rank[a.status] - rank[b.status] || a.start - b.start);
  }, [tournaments, now]);

  const items = cards.slice(0, Math.max(1, carouselCount));
  const liveCount = cards.filter((c) => c.status === "live").length;

  return (
    <StoreShell>
      <main dir={dir} className="arena">
        <section className="wrap">
          <div className="arena-hero arena-hero-sm">
            <ArenaFx />
            <div className="ar-in">
              <span className="ar-kicker">GX ARENA</span>
              <h1 className="ar-title">GX BLAST</h1>
              <p className="ar-sub">
                {ar
                  ? "اختر بطولة، سجّل فيها، والعب بحرية طول مدتها — أعلى سكور يفوز بجائزة مركزه."
                  : "Pick a tournament, register, then play freely until it ends — the best score takes its prize."}
              </p>
              <p className="ar-sub">
                {liveCount > 0
                  ? ar
                    ? `🔥 ${liveCount} بطولة متاحة الآن`
                    : `🔥 ${liveCount} tournament(s) live now`
                  : ar
                    ? "لا توجد بطولة نشطة حاليًا"
                    : "No live tournament right now"}
              </p>
            </div>
          </div>
        </section>

        <section className="wrap">
          <h2 className="ar-sec-title">{ar ? "البطولات المتاحة" : "Available tournaments"}</h2>
          {items.length === 0 ? (
            <p className="trn-empty">{ar ? "ما في بطولات حاليًا — ترقّب الأسبوع الجاي." : "Nothing scheduled yet — check back soon."}</p>
          ) : (
            <CarouselRow className="tcar">
              {items.map((t) => {
                const pool = prizePool(t.prizes);
                return (
                  <article key={t.id} className={`tcar-c is-${t.status}`}>
                    <div className="tcar-top">
                      <span className="tcar-ic" aria-hidden><GameIcon slug={t.game_slug} size={40} /></span>
                      <span className={`trn-badge b-${t.status}`}>
                        {t.status === "live"
                          ? ar ? "🔥 متاحة الآن" : "🔥 Live"
                          : t.status === "upcoming"
                            ? ar ? "قريبًا" : "Upcoming"
                            : ar ? "انتهت" : "Ended"}
                      </span>
                    </div>

                    <h3 className="tcar-nm">{ar ? t.title_ar : t.title_en}</h3>

                    <div className="tcar-dates" style={{ unicodeBidi: "isolate" }}>
                      <span>{ar ? "تبدأ" : "Starts"}: {formatDateTime(t.starts_at, ar)}</span>
                      <span>{ar ? "تنتهي" : "Ends"}: {formatDateTime(t.ends_at, ar)}</span>
                    </div>

                    <p className="tcar-time" style={{ unicodeBidi: "isolate" }}>
                      🕒 {t.status === "ended"
                        ? ar ? "البطولة منتهية" : "Tournament finished"
                        : t.status === "live"
                          ? `${ar ? "متبقٍ" : "Time left"} ${formatCountdown(t.end - now, ar)}`
                          : `${ar ? "تبدأ بعد" : "Starts in"} ${formatCountdown(t.start - now, ar)}`}
                    </p>

                    <div className="tcar-meta">
                      <span>👥 {t.participants.toLocaleString("en")} {ar ? "مشارك" : "players"}</span>
                      <span>🎁 {pool > 0 ? `${pool.toLocaleString("en")} GX` : `${t.prizes.length} ${ar ? "جوائز" : "prizes"}`}</span>
                    </div>

                    <Link to="/games/t/$id" params={{ id: t.id }} className="tcar-go">
                      {t.status === "ended"
                        ? ar ? "شوف النتائج" : "View results"
                        : ar ? "سجّل وادخل البطولة" : "Register & enter"}
                    </Link>
                  </article>
                );
              })}
            </CarouselRow>
          )}
        </section>
      </main>
    </StoreShell>
  );
}
