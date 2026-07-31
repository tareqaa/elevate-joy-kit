import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { StoreShell } from "@/components/gx/StoreShell";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { useLang } from "@/lib/gx/i18n";
import { supabase } from "@/integrations/supabase/client";
import { GameIcon } from "@/components/gx/games/GameIcon";
import { ArenaFx } from "@/components/gx/games/ArenaFx";
import { HowToPlaySlides } from "@/components/gx/games/HowToPlaySlides";
import { formatCountdown, formatDateTime } from "@/lib/gx/games/time";
import { fetchMyLoyalty, levelName, levelProgress, type MyLoyalty } from "@/lib/gx/loyalty";

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
  const [loyalty, setLoyalty] = useState<MyLoyalty | null>(null);
  const [how, setHow] = useState(false);
  const [prizesOpen, setPrizesOpen] = useState(false);

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

  useEffect(() => {
    let alive = true;
    fetchMyLoyalty()
      .then((l) => { if (alive) setLoyalty(l); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

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

  // first visit to THIS tournament => auto-open the tutorial once
  useEffect(() => {
    if (!t) return;
    const key = `gx-htp-${t.id}`;
    try {
      if (!window.localStorage.getItem(key)) {
        setHow(true);
        window.localStorage.setItem(key, "1");
      }
    } catch { /* storage unavailable */ }
  }, [t]);

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
  const top3 = (rows ?? []).slice(0, 3);
  const rest = (rows ?? []).slice(3);
  const meInTop = !!me?.played && !!me.rank && me.rank <= 20;
  const prog = levelProgress(loyalty?.xp ?? 0, loyalty?.level ?? null, loyalty?.next_level ?? null);

  return (
    <StoreShell>
      <main dir={dir} className="container tpage arena">
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
                <b style={{ unicodeBidi: "isolate" }}>{status === "ended" ? formatDateTime(t.ends_at, ar) : formatCountdown(target, ar)}</b>
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
              <button
                type="button"
                className={"ar-cta" + (status !== "live" || !t.game_path ? " off" : "")}
                disabled={status !== "live" || !t.game_path}
                onClick={() => t.game_path && navigate({ to: t.game_path, search: { t: t.id } as never })}
              >
                ⚡ {status === "live" ? (ar ? "ابدأ اللعب" : "Start playing") : status === "ended" ? (ar ? "انتهت البطولة" : "Tournament ended") : (ar ? "لم تبدأ بعد" : "Not started yet")}
              </button>
              <button type="button" className="btn tp-how" onClick={() => setHow((v) => !v)}>
                {how ? (ar ? "إخفاء الشرح" : "Hide how to play") : (ar ? "كيف ألعب؟" : "How to play?")}
              </button>
            </div>
          </div>
        </header>

        {/* ---- player dashboard ---- */}
        <div className="adash">
          <div className="adash-c rank">
            <span>{ar ? "ترتيبك" : "Arena rank"}</span>
            <b>{me?.played && me.rank ? `#${me.rank}` : "—"}</b>
          </div>
          <div className="adash-c">
            <span>{ar ? "أفضل نتيجة" : "Best score"}</span>
            <b>{(me?.score ?? 0).toLocaleString("en-US")}</b>
          </div>
          <div className="adash-c xp">
            <span>{ar ? "المستوى" : "GX Level"}</span>
            <b>{loyalty?.level ? levelName(loyalty.level, lang) : "—"}</b>
          </div>
          <div className="adash-c xp">
            <span>GX XP</span>
            <b>{(loyalty?.xp ?? 0).toLocaleString("en-US")}</b>
          </div>
          <div className="adash-c coins">
            <span>GX Coins</span>
            <b>{(loyalty?.coins ?? 0).toLocaleString("en-US")}</b>
          </div>
        </div>

        <div className="tp-grid">
          <section className="tp-card tp-board">
            <h2>{ar ? "الترتيب المباشر" : "Live leaderboard"}</h2>
            <div className="tlb">
              {rows === null ? (
                <p className="tlb-empty">{ar ? "جارِ تحميل الترتيب…" : "Loading…"}</p>
              ) : rows.length === 0 ? (
                <p className="tlb-empty">{ar ? "لا يوجد لاعبون بعد — كن أول من يسجّل سكور!" : "No players yet."}</p>
              ) : (
                <>
                  <div className="podium">
                    {top3.map((r) => (
                      <div key={r.user_id} className={`pod p${r.rank}`} style={{ animationDelay: `${r.rank * 80}ms` }}>
                        {r.rank === 1 && <span className="crown" aria-hidden>👑</span>}
                        {r.avatar_url ? (
                          <img src={r.avatar_url} alt="" className="pod-av" loading="lazy" />
                        ) : (
                          <span className="pod-av ph">{nameOf(r).slice(0, 1)}</span>
                        )}
                        <span className="pod-medal" aria-hidden>{MEDALS[r.rank - 1]}</span>
                        <span className="pod-name">{nameOf(r)}</span>
                        <span className="pod-score" dir="ltr">{r.score.toLocaleString("en-US")}</span>
                      </div>
                    ))}
                  </div>

                  <div>
                    {rest.map((r, i) => (
                      <div
                        key={r.user_id}
                        className={"lbrow" + (me?.played && me.rank === r.rank ? " me" : "")}
                        style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
                      >
                        <span className="r">{r.rank}</span>
                        {r.avatar_url ? <img src={r.avatar_url} alt="" className="av" loading="lazy" /> : <span className="av ph">{nameOf(r).slice(0, 1)}</span>}
                        <span className="nm">{nameOf(r)}</span>
                        <b className="sc" dir="ltr">{r.score.toLocaleString("en-US")}</b>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* always-visible "you" row, even outside the top 20 */}
              <div className={"lbrow me me-sticky"}>
                {me?.played ? (
                  <>
                    <span className="r">{me.rank}</span>
                    {me.avatar_url ? <img src={me.avatar_url} alt="" className="av" /> : <span className="av ph">{ar ? "أنا" : "Me"}</span>}
                    <span className="nm">
                      {ar ? "مركزك" : "Your rank"} — {nameOf({ username: me.username ?? null, full_name: me.full_name ?? null })}
                      {meInTop ? "" : ar ? " (خارج العشرين الأوائل)" : " (outside top 20)"}
                    </span>
                    <b className="sc" dir="ltr">{(me.score ?? 0).toLocaleString("en-US")}</b>
                  </>
                ) : (
                  <span className="nm">{ar ? "لم تلعب بعد — جولة واحدة تكفي لتدخل الترتيب 💪" : "Play one round to enter the ranking 💪"}</span>
                )}
              </div>
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
                    {sortedPrizes.slice(0, 6).map((p, i) => {
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
                  {sortedPrizes.length > 6 && (
                    <button type="button" className="prz-all" onClick={() => setPrizesOpen(true)}>
                      {ar ? `عرض كل الجوائز (${sortedPrizes.length})` : `View all prizes (${sortedPrizes.length})`}
                    </button>
                  )}
                </>
              )}
              <p className="tp-winners">
                {ar ? `عدد الفائزين في هذه البطولة: ${t.prizes.length}` : `Winners in this tournament: ${t.prizes.length}`}
              </p>
            </section>


            <section className="tp-card">
              <h2>GX Journey</h2>
              <div className="jr">
                <div className="jr-top">
                  <span className="jr-lvl">
                    {loyalty?.level ? levelName(loyalty.level, lang) : ar ? "سجّل الدخول لعرض تقدمك" : "Sign in to see your progress"}
                  </span>
                  <span className="jr-hint" dir="ltr">{(loyalty?.xp ?? 0).toLocaleString("en-US")} XP</span>
                </div>
                <div className="jr-bar"><div className="jr-fill" style={{ width: `${loyalty ? prog.pct : 0}%` }} /></div>
                <p className="jr-hint">
                  {loyalty?.next_level
                    ? ar
                      ? `ينقصك ${prog.remaining.toLocaleString("en-US")} XP للوصول إلى ${levelName(loyalty.next_level, lang)}`
                      : `${prog.remaining.toLocaleString("en-US")} XP to reach ${levelName(loyalty.next_level, lang)}`
                    : ar
                      ? "اجمع XP من البطولات والطلبات لترتقي في المستويات."
                      : "Earn XP from tournaments and orders to level up."}
                </p>
                <div className="jr-perks">
                  <div className="jr-perk"><b>GX XP</b><span>{ar ? "كل جولة تقرّبك للمستوى التالي" : "Every run pushes your level"}</span></div>
                  <div className="jr-perk"><b>GX Coins</b><span>{ar ? "تُصرف كخصم على مشترياتك" : "Spend them as store discounts"}</span></div>
                  <div className="jr-perk"><b>Arena Points</b><span>{ar ? "ترتيبك الأسبوعي في الساحة" : "Your weekly arena standing"}</span></div>
                </div>
              </div>
            </section>

            <section className="tp-card tp-stats">
              <div><span>{ar ? "المشاركون" : "Players"}</span><b>{t.participants.toLocaleString("en")}</b></div>
              <div><span>{ar ? "أعلى سكور" : "Top score"}</span><b>{t.top_score.toLocaleString("en")}</b></div>
            </section>
          </aside>
        </div>

        {how && (
          <div className="tp-modal" role="dialog" aria-modal="true" onClick={() => setHow(false)}>
            <div className="tp-modal-card" onClick={(e) => e.stopPropagation()}>
              <h3 className="tp-modal-t">{ar ? `كيف تلعب في ${t.title_ar}` : `How to play ${t.title_en}`}</h3>
              <HowToPlaySlides onDone={() => setHow(false)} doneLabel={ar ? "يلا نبدأ" : "Let's go"} />
            </div>
          </div>
        )}

        {prizesOpen && (
          <div className="tp-modal" role="dialog" aria-modal="true" onClick={() => setPrizesOpen(false)}>
            <div className="tp-modal-card" onClick={(e) => e.stopPropagation()}>
              <h3 className="tp-modal-t">{ar ? "كل جوائز البطولة" : "All tournament prizes"}</h3>
              <div className="przlist scroll">
                {sortedPrizes.map((p, i) => {
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
