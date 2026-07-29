import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/gx/i18n";
import { coinsToJod, fetchLevels, fetchMyLoyalty, levelName, levelProgress, COINS_PER_JOD_REDEEM } from "@/lib/gx/loyalty";

type PublicProfile = {
  id: string; username: string; full_name: string | null; avatar_url: string | null;
  level: number | null; xp: number | null; rank: number; created_at: string;
  level_code: string | null; orders_count: number | null;
};

/** Unified GX profile: identity + loyalty + coupons + badges + avatars + search + leaderboard. */
export function GxProfile({ username }: { username?: string }) {
  const { lang, dir } = useLang();
  const { format, formatCoins, currency } = useCurrency();
  const isAr = lang === "ar";
  const qc = useQueryClient();
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setMyId(data.session?.user.id ?? null));
  }, []);

  const profileQ = useQuery({
    enabled: !!username,
    queryKey: ["gx-profile", (username || "").toLowerCase()],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_profile", { _username: username! });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row as PublicProfile) ?? null;
    },
  });

  const isOwner = !!myId && !!profileQ.data && profileQ.data.id === myId;

  const levelsQ = useQuery({ queryKey: ["levels"], queryFn: fetchLevels });
  const loyaltyQ = useQuery({ queryKey: ["my-loyalty", myId], queryFn: fetchMyLoyalty, enabled: isOwner });

  const boardQ = useQuery({
    queryKey: ["loyalty-leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_loyalty_leaderboard", { _limit: 25 });
      if (error) throw error;
      return data ?? [];
    },
  });

  const couponsQ = useQuery({
    enabled: isOwner,
    queryKey: ["my-level-coupons", myId],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_coupons").select("*")
        .eq("user_id", myId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const badgesQ = useQuery({
    enabled: isOwner,
    queryKey: ["badges-with-mine", myId],
    queryFn: async () => {
      const [all, mine] = await Promise.all([
        supabase.from("badges").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("user_badges").select("badge_id, earned_at").eq("user_id", myId!),
      ]);
      if (all.error) throw all.error;
      if (mine.error) throw mine.error;
      const owned = new Map((mine.data ?? []).map((b) => [b.badge_id, b.earned_at]));
      return (all.data ?? []).map((b) => ({ ...b, earned_at: owned.get(b.id) ?? null }));
    },
  });

  const avatarsQ = useQuery({
    enabled: isOwner,
    queryKey: ["avatar-collections"],
    queryFn: async () => {
      const [cols, avs] = await Promise.all([
        supabase.from("avatar_collections").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("avatars").select("*").eq("is_active", true).order("sort_order"),
      ]);
      if (cols.error) throw cols.error;
      if (avs.error) throw avs.error;
      return (cols.data ?? []).map((c) => ({ ...c, avatars: (avs.data ?? []).filter((a) => a.collection_id === c.id) }));
    },
  });

  const levels = levelsQ.data ?? [];
  const p = profileQ.data;
  const lvl = useMemo(
    () => levels.find((l) => l.code === (loyaltyQ.data?.level?.code || p?.level_code)) ?? null,
    [levels, loyaltyQ.data, p],
  );
  const currentSort = lvl?.sort_order ?? 0;
  const xp = Number(loyaltyQ.data?.xp ?? p?.xp ?? 0);
  const prog = levelProgress(xp, loyaltyQ.data?.level ?? lvl, loyaltyQ.data?.next_level ?? null);

  async function pickAvatar(imageUrl: string, avatarId: string, border: string | null) {
    if (!myId) return;
    const { error } = await supabase.from("profiles")
      .update({ avatar_url: imageUrl, avatar_id: avatarId, avatar_border: border }).eq("id", myId);
    if (error) { toast.error(error.message); return; }
    toast.success(isAr ? "تم تغيير الأفاتار" : "Avatar updated");
    qc.invalidateQueries({ queryKey: ["gx-profile"] });
    qc.invalidateQueries({ queryKey: ["my-profile", myId] });
    window.dispatchEvent(new CustomEvent("gx:profile-updated"));
  }

  const avatar = p?.avatar_url || `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(p?.username || "gx")}&skinColor=f2d3b1&backgroundType=gradientLinear&backgroundColor=0b1220,12233a&radius=50`;

  return (
    <section className="section" dir={dir}>
      <div className="wrap gxp">
        <div className="gxp-grid">
          <div className="gxp-main">
            {!username && (
              <div className="gxp-card gxp-empty">
                <h2>{isAr ? "ملفات اللاعبين" : "Player profiles"}</h2>
                <p>{isAr ? "ابحث عن أي GameTag لعرض ملفه ومستواه." : "Search any GameTag to open its profile."}</p>
              </div>
            )}

            {username && profileQ.isLoading && <div className="gxp-card gxp-empty"><p>{isAr ? "جاري التحميل…" : "Loading…"}</p></div>}

            {username && !profileQ.isLoading && !p && (
              <div className="gxp-card gxp-empty">
                <h2>{isAr ? "لا يوجد لاعب بهذا الـ GameTag" : "No player with this GameTag"}</h2>
                <p dir="ltr">@{username}</p>
              </div>
            )}

            {p && (
              <>
                <div className="gxp-card gxp-hero">
                  <div className="gxp-hero-bg" style={{ background: lvl?.gradient || "linear-gradient(90deg,#00e5ff,#7c3aed)" }} />
                  <div className="gxp-hero-body">
                    <img className="gxp-av" src={avatar} alt={p.username} />
                    <div className="gxp-id">
                      <h1>{p.full_name || p.username}</h1>
                      <span className="gxp-tag" dir="ltr">@{p.username}</span>
                      <div className="gxp-chips">
                        {lvl && <span className="gxp-chip" style={{ background: lvl.gradient }}>{lvl.icon} {levelName(lvl, lang)}</span>}
                        <span className="gxp-chip ghost">🏆 #{Number(loyaltyQ.data?.rank ?? p.rank)}</span>
                        <span className="gxp-chip ghost">
                          {isAr ? "عضو منذ" : "Member since"} {new Date(p.created_at).toLocaleDateString(isAr ? "ar-EG" : "en-US", { year: "numeric", month: "long" })}
                        </span>
                      </div>
                    </div>
                    {isOwner && <Link to="/account" search={{ tab: "profile" } as never} className="btn btn-ghost gxp-edit">{isAr ? "تعديل الملف" : "Edit profile"}</Link>}
                  </div>

                  <div className="gxp-bar">
                    <div className="gxp-bar-top">
                      <b>{xp.toLocaleString("en-US")} XP</b>
                      <span>
                        {loyaltyQ.data?.next_level
                          ? (isAr ? `باقي ${prog.remaining.toLocaleString("en-US")} XP إلى ${levelName(loyaltyQ.data.next_level, lang)}`
                                  : `${prog.remaining.toLocaleString("en-US")} XP to ${levelName(loyaltyQ.data.next_level, lang)}`)
                          : (isAr ? "استمر بالتسوّق لرفع مستواك" : "Keep shopping to level up")}
                      </span>
                    </div>
                    <div className="gxp-track"><div className="gxp-fill" style={{ width: `${prog.pct}%`, background: lvl?.gradient || "#00e5ff" }} /></div>
                  </div>

                  <div className="gxp-stats">
                    <Stat label="GX Coins" value={(isOwner ? loyaltyQ.data?.coins ?? 0 : 0).toLocaleString("en-US")}
                      hint={isOwner ? `≈ ${formatCoins(loyaltyQ.data?.coins ?? 0)}` : undefined}
                      hidden={!isOwner} icon="🪙" />
                    <Stat label={isAr ? "رصيد المتجر" : "Store credit"}
                      value={format(Number(loyaltyQ.data?.store_credit ?? 0))} hint={currency}
                      hidden={!isOwner} icon="💳" />
                    <Stat label="XP" value={xp.toLocaleString("en-US")} icon="⚡" />
                    <Stat label={isAr ? "الطلبات" : "Orders"} value={String(loyaltyQ.data?.orders_count ?? p.orders_count ?? 0)} icon="📦" />
                  </div>

                  {isOwner && lvl && (
                    <p className="gxp-note">
                      {isAr
                        ? `كل 1 دينار مدفوع = 10 GX Coins × ${(1 + Number(lvl.coins_bonus_pct) / 100).toFixed(2)} (مكافأة مستواك) · ${COINS_PER_JOD_REDEEM} عملة = 1 دينار خصم (بحد أقصى 50% من الطلب)`
                        : `Every 1 JOD paid = 10 GX Coins × ${(1 + Number(lvl.coins_bonus_pct) / 100).toFixed(2)} (level bonus) · ${COINS_PER_JOD_REDEEM} coins = 1 JOD off (max 50% per order)`}
                    </p>
                  )}
                </div>

                {/* Levels ladder */}
                <div className="gxp-card">
                  <h3 className="gxp-h">{isAr ? "سلّم المستويات" : "Levels"}</h3>
                  <div className="gxp-levels">
                    {levels.map((l) => {
                      const reached = (l.sort_order ?? 0) <= currentSort;
                      return (
                        <div key={l.id} className={`gxp-level${reached ? " on" : ""}`}>
                          <div className="gxp-level-top">
                            <span className="ico">{l.icon}</span>
                            <div>
                              <b style={{ color: l.color }}>{levelName(l, lang)}</b>
                              <em>{l.min_xp.toLocaleString("en-US")} XP</em>
                            </div>
                            <span className="gxp-level-state">{reached ? "✓" : "🔒"}</span>
                          </div>
                          <div className="gxp-tags">
                            {l.reward_coins > 0 && <span className="t amber">+{l.reward_coins} Coins</span>}
                            {l.coupon_percent > 0 && <span className="t cyan">{isAr ? "كوبون" : "Coupon"} {l.coupon_percent}%</span>}
                            <span className="t violet">×{(1 + Number(l.coins_bonus_pct) / 100).toFixed(2)} Coins</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {isOwner && (
                  <>
                    {/* Avatars — only place avatars can be picked */}
                    <div className="gxp-card">
                      <h3 className="gxp-h">{isAr ? "شخصيات الأفاتار" : "Avatar characters"}</h3>
                      <div className="gxp-cols">
                        {(avatarsQ.data ?? []).map((col) => {
                          const need = levels.find((l) => l.code === col.required_level_code);
                          const unlocked = (need?.sort_order ?? 0) <= currentSort;
                          return (
                            <div key={col.id}>
                              <div className="gxp-col-head">
                                <b>{isAr ? col.name_ar : col.name_en}</b>
                                {!unlocked && <span className="t lock">🔒 {levelName(need, lang)}</span>}
                              </div>
                              <div className="gxp-avs">
                                {col.avatars.map((a) => (
                                  <button key={a.id} type="button" disabled={!unlocked}
                                    onClick={() => pickAvatar(a.image_url, a.id, col.border_css)}
                                    className={`gxp-avbtn${!unlocked ? " off" : ""}${p.avatar_url === a.image_url ? " sel" : ""}`}
                                    title={a.name}>
                                    <img src={a.image_url} alt={a.name} loading="lazy" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Coupons */}
                    <div className="gxp-card">
                      <h3 className="gxp-h">🎟️ {isAr ? "كوبوناتي" : "My coupons"}</h3>
                      {(couponsQ.data ?? []).length === 0 && (
                        <p className="gxp-muted">{isAr ? "لا يوجد كوبونات بعد — ارفع مستواك للحصول على كوبونات." : "No coupons yet — level up to earn coupons."}</p>
                      )}
                      <div className="gxp-coupons">
                        {(couponsQ.data ?? []).map((c) => {
                          const dead = !!c.used_at || new Date(c.expires_at).getTime() < Date.now();
                          return (
                            <div key={c.id} className={`gxp-coupon${dead ? " dead" : ""}`}>
                              <div>
                                <b dir="ltr">{c.code}</b>
                                <em>{isAr ? `خصم ${c.percent}%` : `${c.percent}% off`}{c.max_discount_jod ? (isAr ? ` — حتى ${c.max_discount_jod} د.أ` : ` — up to ${c.max_discount_jod} JOD`) : ""}</em>
                              </div>
                              <button type="button" className="btn btn-ghost" disabled={dead}
                                onClick={() => { navigator.clipboard?.writeText(c.code); toast.success(isAr ? "تم النسخ" : "Copied"); }}>
                                {isAr ? "نسخ" : "Copy"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="gxp-card">
                      <h3 className="gxp-h">{isAr ? "الشارات" : "Badges"}</h3>
                      <div className="gxp-badges">
                        {(badgesQ.data ?? []).map((b) => (
                          <div key={b.id} className={`gxp-badge${b.earned_at ? " on" : ""}`}>
                            <span className="ico">{b.icon}</span>
                            <b style={{ color: b.earned_at ? b.color : undefined }}>{isAr ? b.name_ar : b.name_en}</b>
                            <em>{(isAr ? b.description_ar : b.description_en) || ""}</em>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Sidebar: search + leaderboard */}
          <aside className="gxp-side">
            <div className="gxp-card">
              <h3 className="gxp-h">🔎 {isAr ? "ابحث عن لاعب" : "Find a player"}</h3>
              <PlayerSearch isAr={isAr} />
            </div>
            <div className="gxp-card">
              <h3 className="gxp-h">🏆 {isAr ? "المتصدرون" : "Leaderboard"}</h3>
              <div className="gxp-board">
                {(boardQ.data ?? []).map((r) => {
                  const rank = Number(r.rank);
                  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
                  const av = r.avatar_url || `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(r.username || "gx")}&skinColor=f2d3b1&radius=50`;
                  return (
                    <Link key={r.user_id} to="/u/$username" params={{ username: r.username || "" }}
                      className={`gxp-brow${r.username?.toLowerCase() === (username || "").toLowerCase() ? " me" : ""}`}>
                      <span className="r">{medal}</span>
                      <img src={av} alt="" loading="lazy" />
                      <span className="n">{r.full_name || r.username}</span>
                      <span className="x">{Number(r.xp).toLocaleString("en-US")}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </div>
      <style>{css}</style>
    </section>
  );
}

function Stat({ icon, label, value, hint, hidden }: { icon: string; label: string; value: string; hint?: string; hidden?: boolean }) {
  return (
    <div className="gxp-stat">
      <span className="l">{icon} {label}</span>
      <b>{hidden ? "—" : value}</b>
      {!hidden && hint && <em>{hint}</em>}
    </div>
  );
}

function PlayerSearch({ isAr }: { isAr: boolean }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Array<{ id: string; username: string; full_name: string | null; avatar_url: string | null; level: number | null }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const query = q.replace(/^@+/, "").trim();
    if (query.length < 2) { setResults([]); return; }
    setLoading(true);
    const to = setTimeout(async () => {
      const { data, error } = await supabase.rpc("search_public_profiles", { _q: query, _limit: 8 });
      setLoading(false);
      setResults(error ? [] : ((data as typeof results) ?? []));
    }, 300);
    return () => clearTimeout(to);
  }, [q]);

  return (
    <div className="gxp-search">
      <input dir="ltr" value={q} onChange={(e) => setQ(e.target.value)} placeholder="@game_tag" />
      {loading && <p className="gxp-muted">{isAr ? "جاري البحث…" : "Searching…"}</p>}
      {!loading && q.replace(/^@+/, "").trim().length >= 2 && results.length === 0 && (
        <p className="gxp-muted">{isAr ? "لا نتائج" : "No results"}</p>
      )}
      <div className="gxp-results">
        {results.map((r) => (
          <Link key={r.id} to="/u/$username" params={{ username: r.username }} className="gxp-result" onClick={() => setQ("")}>
            <img src={r.avatar_url || `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(r.username)}&skinColor=f2d3b1&radius=50`} alt="" />
            <span><b>{r.full_name || r.username}</b><em dir="ltr">@{r.username}</em></span>
          </Link>
        ))}
      </div>
    </div>
  );
}

const css = `
.gxp-grid{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:16px;align-items:start}
@media (max-width:980px){.gxp-grid{grid-template-columns:1fr}}
.gxp-main,.gxp-side{display:grid;gap:14px;min-width:0}
.gxp-card{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.02);border-radius:18px;padding:16px;overflow:hidden}
.gxp-h{margin:0 0 12px;font-size:15px;color:#e6f7ff}
.gxp-muted{color:#8b90a0;font-size:12.5px;margin:6px 0 0}
.gxp-empty{text-align:center;padding:34px 16px}
.gxp-empty h2{margin:0 0 6px;font-size:18px;color:#e6f7ff}
.gxp-empty p{margin:0;color:#8b90a0;font-size:13px}
.gxp-hero{padding:0}
.gxp-hero-bg{height:86px}
.gxp-hero-body{display:flex;gap:14px;align-items:flex-end;padding:0 16px;margin-top:-44px;flex-wrap:wrap}
.gxp-av{width:96px;height:96px;border-radius:22px;object-fit:cover;background:#12151f;border:4px solid #090b10}
.gxp-id{flex:1;min-width:180px;padding-bottom:4px}
.gxp-id h1{margin:0;font-size:22px;color:#e6f7ff}
.gxp-tag{display:block;color:#00e5ff;font-weight:800;font-size:13px}
.gxp-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.gxp-chip{font-size:11px;font-weight:800;padding:4px 10px;border-radius:99px;color:#08101a}
.gxp-chip.ghost{background:rgba(255,255,255,.06);color:#c8d6e2}
.gxp-edit{align-self:center}
.gxp-bar{padding:16px 16px 0}
.gxp-bar-top{display:flex;justify-content:space-between;gap:10px;font-size:12px;color:#8b90a0;margin-bottom:6px}
.gxp-bar-top b{color:#e6f7ff;font-size:13px}
.gxp-track{height:10px;border-radius:99px;background:rgba(255,255,255,.07);overflow:hidden}
.gxp-fill{height:100%;border-radius:99px;transition:width .4s}
.gxp-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;padding:14px 16px}
.gxp-stat{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);border-radius:14px;padding:10px 12px}
.gxp-stat .l{font-size:11px;color:#8b90a0}
.gxp-stat b{display:block;font-size:18px;color:#e6f7ff;margin-top:2px}
.gxp-stat em{font-style:normal;font-size:11px;color:#8b90a0}
.gxp-note{margin:0;padding:0 16px 16px;font-size:11.5px;color:#8b90a0;line-height:1.7}
.gxp-levels{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px}
.gxp-level{border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:11px;opacity:.6}
.gxp-level.on{opacity:1;border-color:rgba(0,229,255,.35);background:rgba(0,229,255,.05)}
.gxp-level-top{display:flex;align-items:center;gap:9px}
.gxp-level-top .ico{font-size:20px}
.gxp-level-top b{display:block;font-size:13.5px}
.gxp-level-top em{font-style:normal;font-size:11px;color:#8b90a0}
.gxp-level-state{margin-inline-start:auto;font-size:12px}
.gxp-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}
.t{font-size:10px;font-weight:800;padding:3px 8px;border-radius:99px;background:rgba(255,255,255,.06);color:#c8d6e2}
.t.amber{background:rgba(245,158,11,.15);color:#fcd34d}
.t.cyan{background:rgba(0,229,255,.15);color:#67e8f9}
.t.violet{background:rgba(139,92,246,.15);color:#c4b5fd}
.gxp-cols{display:grid;gap:14px}
.gxp-col-head{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:13px;color:#e6f7ff}
.gxp-avs{display:flex;flex-wrap:wrap;gap:9px}
.gxp-avbtn{width:58px;height:58px;border-radius:50%;overflow:hidden;border:2px solid rgba(255,255,255,.12);background:#0b1220;padding:0;cursor:pointer;transition:.16s}
.gxp-avbtn img{width:100%;height:100%;object-fit:cover;display:block}
.gxp-avbtn:hover{border-color:#00e5ff;transform:translateY(-2px)}
.gxp-avbtn.sel{border-color:#00e5ff;box-shadow:0 0 0 3px rgba(0,229,255,.25)}
.gxp-avbtn.off{opacity:.35;cursor:not-allowed}
.gxp-coupons{display:grid;gap:8px}
.gxp-coupon{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid rgba(16,185,129,.3);background:rgba(16,185,129,.05);border-radius:14px;padding:10px 12px}
.gxp-coupon.dead{opacity:.5;border-color:rgba(255,255,255,.1);background:transparent}
.gxp-coupon b{font-family:ui-monospace,monospace;letter-spacing:.08em;color:#6ee7b7}
.gxp-coupon em{display:block;font-style:normal;font-size:11px;color:#8b90a0}
.gxp-badges{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:9px}
.gxp-badge{border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:11px;text-align:center;opacity:.45}
.gxp-badge.on{opacity:1;background:rgba(255,255,255,.04)}
.gxp-badge .ico{font-size:22px}
.gxp-badge b{display:block;font-size:12px;margin-top:4px}
.gxp-badge em{font-style:normal;font-size:10.5px;color:#8b90a0;display:block;margin-top:2px}
.gxp-search input{width:100%;height:40px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.03);color:#e6f7ff;padding:0 12px;font-size:13px;outline:none}
.gxp-search input:focus{border-color:#00e5ff}
.gxp-results{display:grid;gap:6px;margin-top:8px}
.gxp-result{display:flex;align-items:center;gap:9px;padding:7px;border-radius:12px;text-decoration:none;color:inherit;border:1px solid transparent}
.gxp-result:hover{background:rgba(255,255,255,.04);border-color:rgba(0,229,255,.3)}
.gxp-result img{width:34px;height:34px;border-radius:50%;background:#0b1220}
.gxp-result b{display:block;font-size:12.5px;color:#e6f7ff}
.gxp-result em{font-style:normal;font-size:11px;color:#00e5ff}
.gxp-board{display:grid;gap:5px;max-height:520px;overflow:auto}
.gxp-brow{display:flex;align-items:center;gap:9px;padding:7px 9px;border-radius:12px;text-decoration:none;color:inherit;border:1px solid transparent}
.gxp-brow:hover{background:rgba(255,255,255,.04)}
.gxp-brow.me{border-color:rgba(0,229,255,.4);background:rgba(0,229,255,.06)}
.gxp-brow .r{width:28px;font-weight:900;font-size:12px;color:#8b90a0;text-align:center}
.gxp-brow img{width:30px;height:30px;border-radius:50%;background:#0b1220}
.gxp-brow .n{flex:1;min-width:0;font-size:12.5px;color:#e6f7ff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gxp-brow .x{font-size:11.5px;font-weight:900;color:#00e5ff}
`;
