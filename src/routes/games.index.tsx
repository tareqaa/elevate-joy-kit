import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { StoreShell } from "@/components/gx/StoreShell";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { useLang } from "@/lib/gx/i18n";
import { GameIcon } from "@/components/gx/games/GameIcon";
import { GxIcon } from "@/components/gx/GxIcon";
import { ArenaFx } from "@/components/gx/games/ArenaFx";
import { gameLabel } from "@/lib/gx/games/time";
import { CarouselRow } from "@/components/gx/CarouselRow";
import { supabase } from "@/integrations/supabase/client";
import { listTournaments, type TournamentRow, type TournamentPrize } from "@/lib/gx/tournaments.functions";
import { prizeRewards, type Prize as PrizeModel } from "@/lib/gx/tournament-prizes";
import { listMiniGames, type MiniGameRow } from "@/lib/gx/mini-games.functions";


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
  loader: () => Promise.all([listTournaments(), listMiniGames()]),
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

/** visual only: sums the GX Coins across all rewards for a "prize pool" figure */
export function prizePool(prizes: TournamentPrize[]): number {
  return prizes.reduce((sum, p) => {
    const rewards = prizeRewards(p as unknown as PrizeModel);
    const fromRewards = rewards
      .filter((r) => r.type === "coins")
      .reduce((s, r) => s + (Number(r.value ?? 0) || 0), 0);
    if (fromRewards > 0) return sum + fromRewards;

    const text = rewards.map((r) => r.label_en || r.label_ar || "").join(" ");
    const m = text.match(/(\d[\d,\.]*)\s*(?:gx\s*)?(?:coins?|كوين|كوينز)/gi);
    if (!m) return sum;
    const n = m.reduce((s, chunk) => {
      const num = Number((chunk.match(/\d[\d,\.]*/)?.[0] ?? "0").replace(/[,\.]/g, ""));
      return s + (Number.isFinite(num) ? num : 0);
    }, 0);
    return sum + n;
  }, 0);
}


/** clean segmented countdown: days / hours / minutes / seconds */
function Countdown({ ms, ar }: { ms: number; ar: boolean }) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const units = [
    { n: Math.floor(total / 86400), l: ar ? "يوم" : "days" },
    { n: Math.floor((total % 86400) / 3600), l: ar ? "ساعة" : "hrs" },
    { n: Math.floor((total % 3600) / 60), l: ar ? "دقيقة" : "min" },
    { n: total % 60, l: ar ? "ثانية" : "sec" },
  ];
  return (
    <div className="tcd" dir={ar ? "rtl" : "ltr"}>
      {units.map((u, i) => (
        <div className="tcd-u" key={i}>
          <span className="tcd-n" dir="ltr">{String(u.n).padStart(2, "0")}</span>
          <span className="tcd-l">{u.l}</span>
        </div>
      ))}
    </div>
  );
}

function GamesPage() {
  const [{ serverNow, tournaments, carouselCount }, miniGames] = Route.useLoaderData() as [
    { serverNow: string; tournaments: TournamentRow[]; carouselCount: number },
    MiniGameRow[],
  ];

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

  return (
    <StoreShell>
      <main dir={dir} className="arena">
        <section className="wrap">
          <div className="arena-hero arena-hero-sm">
            <ArenaFx />
            <div className="ar-in">
              <span className="ar-kicker">{ar ? "ساحة اللعب" : "PLAY ARENA"}</span>
              <h1 className="ar-title">GX ARENA</h1>
              <p className="ar-sub">
                {ar
                  ? "سجّل في البطولة، العب، واصعد بالترتيب — أعلى النتائج تاخذ الجوائز."
                  : "Join a tournament, play, and climb the ranks — top scores take the prizes."}
              </p>
              <div className="ar-perks">
                <span className="ar-perk"><GxIcon name="coin" size={14} />{ar ? "GX Coins للرصيد" : "GX Coins balance"}</span>
                <span className="ar-perk"><i aria-hidden>🎟️</i>{ar ? "كوبونات خصم" : "Discount coupons"}</span>
                <span className="ar-perk"><i aria-hidden>🎮</i>{ar ? "منتجات رقمية مجانية" : "Free digital products"}</span>
              </div>
            </div>
          </div>
        </section>


        {miniGames.length > 0 && (
          <section className="wrap mb-12">
            <h2 className="ar-sec-title">{ar ? "الألعاب المصغرة" : "Mini Games"}</h2>
            <p className="text-sm text-slate-400 -mt-2 mb-3">
              {ar
                ? "لعب حر بدون ارتباط بالبطولات — متاح دائمًا حتى بدون بطولة نشطة."
                : "Casual play, no tournament connection — always available, even with no live tournament."}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {miniGames.map((g) => (
                // Plain <a>, not <Link>: TanStack Router's structured `search`
                // prop JSON-serializes string values (?practice=%221%22),
                // which validateSearch wouldn't recognize. A real href keeps
                // the query string exactly ?practice=1, unambiguously.
                <a
                  key={g.id}
                  href={`${g.path}?practice=1`}
                  className="flex items-center gap-6 p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-primary/50 hover:bg-slate-800 transition-all group"
                >
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-4xl shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform">
                    {g.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{ar ? g.nameAr : g.nameEn}</h3>
                    <p className="text-slate-400 text-sm">{ar ? g.descAr : g.descEn}</p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        <section className="wrap">
          <h2 className="ar-sec-title">{ar ? "البطولات" : "Tournaments"}</h2>
          {items.length === 0 ? (
            <p className="trn-empty">{ar ? "ما في بطولات حاليًا — ترقّب الأسبوع الجاي." : "Nothing scheduled yet — check back soon."}</p>
          ) : (
            <CarouselRow className="tcar">
              {items.map((t) => {
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

                    <span className="tcar-game">🎮 {gameLabel(t.game_slug)}</span>
                    <h3 className="tcar-nm">{ar ? t.title_ar : t.title_en}</h3>

                    {t.status === "ended" ? (
                      <p className="tcd-lbl">🕒 {ar ? "انتهت البطولة" : "Finished"}</p>
                    ) : (
                      <>
                        <p className="tcd-lbl">
                          🕒 {t.status === "live" ? (ar ? "المتبقي على النهاية" : "Time left") : ar ? "تبدأ بعد" : "Starts in"}
                        </p>
                        <Countdown ms={(t.status === "live" ? t.end : t.start) - now} ar={ar} />
                      </>
                    )}

                    <div className="tcar-meta">
                      <span>👥 {ar ? "المشاركون" : "Players"}: {t.participants.toLocaleString("en")}</span>
                      <span>🎁 {ar ? "عدد الجوائز" : "Prizes"}: {t.prizes.length}</span>
                    </div>

                    <Link to="/games/t/$id" params={{ id: t.id }} className="tcar-go">
                      {t.status === "ended"
                        ? ar ? "النتائج" : "Results"
                        : joined.has(t.id)
                          ? ar ? "ادخل البطولة" : "Enter tournament"
                          : ar ? "سجّل الآن" : "Register now"}
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
