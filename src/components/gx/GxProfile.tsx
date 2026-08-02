import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/gx/i18n";
import { useCurrency } from "@/lib/gx/currency";
import { fetchLevels, fetchMyLoyalty, levelName, levelProgress } from "@/lib/gx/loyalty";
import { useLoyaltyCopy } from "@/lib/gx/loyalty-copy";
import { RankBadge } from "@/components/gx/RankBadge";
import { GxIcon, type GxIconName } from "@/components/gx/GxIcon";


type PublicProfile = {
  id: string; username: string; full_name: string | null; avatar_url: string | null;
  level: number | null; xp: number | null; rank: number; created_at: string;
  level_code: string | null; orders_count: number | null;
};

/** Badges section is temporarily hidden; flip to true to show it again. */
const SHOW_BADGES = false;

type UserCouponRow = {
  id: string; code: string; percent: number; max_discount_jod: number | null;
  expires_at: string; used_at: string | null; level_code: string | null;
};

function formatWhen(iso: string, isAr: boolean) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(isAr ? "ar-JO" : "en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(d);
}

/** One coupon card: code hidden behind dots until the eye button reveals it. */
function CouponCard({ c, dead, isAr }: { c: UserCouponRow; dead: boolean; isAr: boolean }) {
  const [shown, setShown] = useState(false);
  const expMs = new Date(c.expires_at).getTime();
  const soon = !dead && expMs - Date.now() < 24 * 60 * 60 * 1000;
  const fromWheel = (c.level_code || "").toLowerCase().includes("wheel");

  const copy = () => {
    if (!shown) { toast.error(isAr ? "اكشف الكود أولاً" : "Reveal the code first"); return; }
    navigator.clipboard?.writeText(c.code);
    toast.success(isAr ? "تم النسخ" : "Copied");
  };

  return (
    <div className={`gxp-coupon${dead ? " dead" : ""}${soon ? " soon" : ""}`}>
      <div className="gxp-coupon-top">
        <div className="gxp-coupon-off">
          {isAr ? `خصم ${c.percent}%` : `${c.percent}% OFF`}
          {c.max_discount_jod ? (
            <span className="cap">{isAr ? `حتى ${c.max_discount_jod} د.أ` : `up to ${c.max_discount_jod} JOD`}</span>
          ) : null}
        </div>
        <span className={`gxp-coupon-tag${fromWheel ? " wheel" : ""}`}>
          {fromWheel
            ? (isAr ? "🎡 عجلة الحظ" : "🎡 Lucky wheel")
            : (isAr ? "🏆 مكافأة مستوى" : "🏆 Level reward")}
        </span>
      </div>

      <div className="gxp-coupon-code">
        <b dir="ltr">{shown ? c.code : "•".repeat(Math.max(8, Math.min(14, c.code.length)))}</b>
        <button
          type="button" className="gxp-eye" onClick={() => setShown((v) => !v)}
          aria-label={shown ? (isAr ? "إخفاء الكود" : "Hide code") : (isAr ? "إظهار الكود" : "Show code")}
          title={shown ? (isAr ? "إخفاء" : "Hide") : (isAr ? "إظهار" : "Show")}
        >
          {shown ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 10 8 10 8a17.6 17.6 0 0 1-2.16 3.19M6.6 6.6A17.9 17.9 0 0 0 2 12s3 8 10 8a9 9 0 0 0 5.4-1.6" />
              <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24M2 2l20 20" />
            </svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
        <button type="button" className="btn btn-ghost gxp-copy" disabled={dead} onClick={copy}>
          {isAr ? "نسخ" : "Copy"}
        </button>
      </div>

      <div className="gxp-coupon-foot">
        {dead ? (
          <span className="gxp-coupon-dead-tag">
            {c.used_at
              ? (isAr ? "❌ مستخدم — غير صالح" : "❌ Used — no longer valid")
              : (isAr ? "❌ منتهي الصلاحية — غير صالح" : "❌ Expired — no longer valid")}
          </span>
        ) : (
          <span className={`gxp-coupon-exp${soon ? " warn" : ""}`}>
            {isAr ? "ينتهي في " : "Expires "}{formatWhen(c.expires_at, isAr)}
            {soon ? (isAr ? " — ينتهي خلال أقل من 24 ساعة!" : " — less than 24h left!") : ""}
          </span>
        )}
      </div>
    </div>
  );
}

/** Unified GX profile: identity + loyalty + coupons + badges + avatars + search + leaderboard. */
export function GxProfile({ username: usernameProp }: { username?: string }) {
  const { lang, dir } = useLang();
  const { format, formatCoins, currency } = useCurrency();
  const copy = useLoyaltyCopy();
  const isAr = lang === "ar";
  const qc = useQueryClient();
  const [myId, setMyId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setMyId(data.session?.user.id ?? null));
  }, []);

  // When no GameTag is in the URL (i.e. /rewards or /leaderboard) and the visitor
  // is signed in, open their own unified profile + loyalty page.
  const myTagQ = useQuery({
    enabled: !usernameProp && !!myId,
    queryKey: ["my-gametag", myId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("username").eq("id", myId!).maybeSingle();
      if (error) throw error;
      return data?.username ?? null;
    },
  });

  const username = usernameProp || myTagQ.data || undefined;

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
        .eq("user_id", myId!)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
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
  // Loyalty details are personal: never fall back to the signed-in user's cached
  // loyalty when viewing somebody else's profile.
  const mine = isOwner ? loyaltyQ.data : undefined;
  const lvl = useMemo(
    () => levels.find((l) => l.code === (mine?.level?.code || p?.level_code)) ?? null,
    [levels, mine, p],
  );
  const currentSort = lvl?.sort_order ?? 0;
  const xp = Number(mine?.xp ?? p?.xp ?? 0);
  const nextLevel = mine?.next_level ?? levels.find((l) => (l.sort_order ?? 0) === currentSort + 1) ?? null;
  const prog = levelProgress(xp, mine?.level ?? lvl, nextLevel);

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
          {/* Mobile: search sits at the very top, not at the bottom of the page. */}
          <div className="gxp-card gxp-search-mobile">
            <h3 className="gxp-h"><GxIcon name="search" /> {isAr ? "ابحث عن لاعب" : "Find a player"}</h3>
            <PlayerSearch isAr={isAr} />
          </div>
          <div className="gxp-main">

            {!username && (
              <div className="gxp-card gxp-empty">
                <h2>{isAr ? "ملفات اللاعبين" : "Player profiles"}</h2>
                <p>{isAr ? "ابحث عن أي اسم مستخدم لعرض ملفه ومستواه." : "Search any username to open its profile."}</p>
              </div>
            )}

            {username && profileQ.isLoading && <div className="gxp-card gxp-empty"><p>{isAr ? "جاري التحميل…" : "Loading…"}</p></div>}

            {username && !profileQ.isLoading && !p && (
              <div className="gxp-card gxp-empty">
                <h2>{isAr ? "لا يوجد لاعب بهذا الاسم" : "No player with this username"}</h2>
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
                      <h1 dir="ltr">@{p.username}</h1>
                      <div className="gxp-chips">
                        {lvl && (
                          <span className="gxp-rankchip" style={{ ["--rc" as string]: lvl.color || "#4aa8ff" }}>
                            <RankBadge color={lvl.color || "#4aa8ff"} label={lvl.sort_order ?? undefined} size={40} glow title={levelName(lvl, lang)} />
                            <span className="rc-txt">
                              <em>{isAr ? "الرتبة" : "Rank"}</em>
                              <b>{levelName(lvl, lang)}</b>
                            </span>
                          </span>
                        )}
                        <span className="gxp-chip ghost">#{Number(mine?.rank ?? p.rank)}</span>

                        <span className="gxp-chip ghost">
                          {isAr ? "عضو منذ" : "Member since"} {new Date(p.created_at).toLocaleDateString(isAr ? "ar-EG" : "en-US", { year: "numeric", month: "long" })}
                        </span>
                      </div>
                    </div>
                    {isOwner && (
                      <button type="button" className="btn btn-ghost gxp-edit" onClick={() => setEditOpen((v) => !v)}>
                        {editOpen ? (isAr ? "إغلاق التعديل" : "Close editor") : (isAr ? "تعديل الملف" : "Edit profile")}
                      </button>
                    )}
                  </div>

                  <div className="gxp-bar">
                    <div className="gxp-bar-top">
                      <b>{xp.toLocaleString("en-US")} XP</b>
                      <span>
                        {nextLevel
                          ? (isAr ? `باقي ${prog.remaining.toLocaleString("en-US")} XP إلى ${levelName(nextLevel, lang)}`
                                  : `${prog.remaining.toLocaleString("en-US")} XP to ${levelName(nextLevel, lang)}`)
                          : (isAr ? "استمر بالتسوّق لرفع مستواك" : "Keep shopping to level up")}
                      </span>
                    </div>
                    <div className="gxp-track"><div className="gxp-fill" style={{ width: `${prog.pct}%`, background: lvl?.gradient || "#00e5ff" }} /></div>
                  </div>

                  <div className="gxp-stats">
                    {/* Coins & store credit are private: only the owner sees them. */}
                    {isOwner && (
                      <>
                        <Stat label="GX Coins" value={(mine?.coins ?? 0).toLocaleString("en-US")}
                          hint={`≈ ${formatCoins(mine?.coins ?? 0)}`} icon="coin" />
                        <Stat label={isAr ? "رصيد المتجر" : "Store credit"}
                          value={format(Number(mine?.store_credit ?? 0))} hint={currency} icon="card" />
                      </>
                    )}
                    <Stat label="XP" value={xp.toLocaleString("en-US")} icon="bolt" />
                    <Stat label={isAr ? "الطلبات" : "Orders"} value={String(mine?.orders_count ?? p.orders_count ?? 0)} icon="box" />
                  </div>


                  {isOwner && lvl && (
                    <p className="gxp-note">
                      {copy.summary(lvl.coins_bonus_pct)}

                    </p>
                  )}
                </div>

                {isOwner && editOpen && (
                  <IdentityEditor
                    isAr={isAr}
                    userId={myId!}
                    currentUsername={p.username}
                    onSaved={(newTag) => {
                      setEditOpen(false);
                      qc.invalidateQueries({ queryKey: ["gx-profile"] });
                      qc.invalidateQueries({ queryKey: ["my-gametag", myId] });
                      qc.invalidateQueries({ queryKey: ["my-profile", myId] });
                      window.dispatchEvent(new CustomEvent("gx:profile-updated"));
                      if (newTag && !usernameProp) { /* stays on same page */ }
                    }}
                  />
                )}


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
                                {!unlocked && <span className="t lock"><GxIcon name="lock" size={12} /> {levelName(need, lang)}</span>}
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
                          return <CouponCard key={c.id} c={c} dead={dead} isAr={isAr} />;
                        })}
                      </div>
                    </div>

                    {/* Badges — temporarily hidden (query kept intact) */}
                    {SHOW_BADGES && (
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
                    )}
                  </>
                )}
              </>
            )}

            {/* How GX Rewards works — always visible (merged from the old /rewards page) */}
            <div className="gxp-card">
              <h3 className="gxp-h"><GxIcon name="gift" /> {isAr ? "كيف يعمل نظام GX Rewards" : "How GX Rewards works"}</h3>
              <div className="gxp-rules">
                <Rule icon="bolt" title={isAr ? "اكسب XP" : "Earn XP"} text={copy.earnXp} />
                <Rule icon="coin" title="GX Coins" text={copy.earnCoins(lvl?.coins_bonus_pct)} />
                <Rule icon="discount" title={isAr ? "استبدال العملات" : "Redeem coins"} text={copy.redeem} />
                <Rule icon="medal" title={isAr ? "مكافآت المستوى" : "Level rewards"}
                  text={isAr ? "كل مستوى يمنحك عملات وكوبون خصم وأفاتارات حصرية." : "Each level unlocks coins, a coupon and exclusive avatars."} />
              </div>
            </div>

            {/* Levels ladder */}
            <div className="gxp-card">
              <h3 className="gxp-h">{isAr ? "سلّم المستويات" : "Levels"}</h3>
              <div className="gxp-levels">
                {levels.map((l) => {
                  const reached = !!p && (l.sort_order ?? 0) <= currentSort;
                  return (
                    <div key={l.id} className={`gxp-level${reached ? " on" : ""}`}>
                      <div className="gxp-level-top">
                        <span className="ico"><RankBadge color={l.color || "#4aa8ff"} label={l.sort_order ?? undefined} size={34} glow={reached} title={levelName(l, lang)} /></span>
                        <div>
                          <b style={{ color: l.color }}>{levelName(l, lang)}</b>
                          <em>{l.min_xp.toLocaleString("en-US")} XP</em>
                        </div>
                        <span className="gxp-level-state">{reached ? <GxIcon name="check" size={14} /> : <GxIcon name="lock" size={14} />}</span>
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
          </div>


          {/* Sidebar: search + leaderboard */}
          <aside className="gxp-side">
            <div className="gxp-card gxp-search-desktop">

              <h3 className="gxp-h">🔎 {isAr ? "ابحث عن لاعب" : "Find a player"}</h3>
              <PlayerSearch isAr={isAr} />
            </div>
            <div className="gxp-card">
              <h3 className="gxp-h">{isAr ? "المتصدرون" : "Leaderboard"}</h3>
              <div className="gxp-board">
                {(boardQ.data ?? []).map((r) => {
                  const rank = Number(r.rank);
                  const av = r.avatar_url || `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(r.username || "gx")}&skinColor=f2d3b1&radius=50`;
                  return (
                    <Link key={r.user_id} to="/u/$username" params={{ username: r.username || "" }}
                      className={`gxp-brow${r.username?.toLowerCase() === (username || "").toLowerCase() ? " me" : ""}`}>
                      <span className="r">
                        <b className={`rnum${rank <= 3 ? ` t${rank}` : ""}`}>{rank}</b>
                      </span>
                      <img src={av} alt="" loading="lazy" />
                      <span className="n">{r.username}</span>
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

function Stat({ icon, label, value, hint, hidden }: { icon: GxIconName; label: string; value: string; hint?: string; hidden?: boolean }) {
  return (
    <div className="gxp-stat">
      <span className="l"><GxIcon name={icon} size={14} /> {label}</span>
      <b>{hidden ? "—" : value}</b>
      {!hidden && hint && <em>{hint}</em>}
    </div>
  );
}

function Rule({ icon, title, text }: { icon: GxIconName; title: string; text: string }) {
  return (
    <div className="gxp-rule">
      <span className="ico"><GxIcon name={icon} size={18} /></span>
      <div><b>{title}</b><em>{text}</em></div>
    </div>
  );
}

function IdentityEditor({ isAr, userId, currentUsername, onSaved }: {
  isAr: boolean; userId: string; currentUsername: string; onSaved: (tag: string) => void;
}) {
  const [tag, setTag] = useState(currentUsername);
  const [saving, setSaving] = useState(false);
  const [check, setCheck] = useState<{ s: "idle" | "checking" | "ok" | "taken" | "invalid"; m?: string }>({ s: "idle" });

  useEffect(() => {
    const v = tag.trim();
    if (v.toLowerCase() === currentUsername.toLowerCase()) { setCheck({ s: "idle" }); return; }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(v)) {
      setCheck({ s: "invalid", m: isAr ? "3-20 حرف إنجليزي/أرقام/شرطة سفلية" : "3-20 letters, numbers or underscore" });
      return;
    }
    setCheck({ s: "checking" });
    const to = setTimeout(async () => {
      const { data, error } = await supabase.from("profiles").select("id").ilike("username", v).neq("id", userId).maybeSingle();
      if (error) { setCheck({ s: "idle" }); return; }
      setCheck(data
        ? { s: "taken", m: isAr ? "اسم المستخدم محجوز" : "Username is taken" }
        : { s: "ok", m: isAr ? "متاح ✓" : "Available ✓" });
    }, 400);
    return () => clearTimeout(to);
  }, [tag, currentUsername, userId, isAr]);

  async function save() {
    const v = tag.trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(v)) { toast.error(isAr ? "اسم مستخدم غير صالح" : "Invalid username"); return; }
    if (check.s === "taken") { toast.error(isAr ? "اسم المستخدم محجوز" : "Username is taken"); return; }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ username: v }).eq("id", userId);
    if (!error) await supabase.auth.updateUser({ data: { username: v } });
    setSaving(false);
    if (error) {
      toast.error((error as { code?: string }).code === "23505"
        ? (isAr ? "اسم المستخدم محجوز" : "Username is taken")
        : error.message);
      return;
    }
    toast.success(isAr ? "تم حفظ الملف" : "Profile saved");
    onSaved(v);
  }

  return (
    <div className="gxp-card gxp-edit-card">
      <h3 className="gxp-h">✏️ {isAr ? "تعديل الملف الشخصي" : "Edit profile"}</h3>
      <div className="gxp-fields">
        <label>
          <span>{isAr ? "اسم المستخدم" : "Username"}</span>
          <input dir="ltr" value={tag} onChange={(e) => setTag(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
            maxLength={20} placeholder="your_tag" />
          {check.m && <em className={check.s === "ok" ? "ok" : check.s === "checking" ? "" : "bad"}>{check.s === "checking" ? (isAr ? "جاري التحقق…" : "Checking…") : check.m}</em>}
        </label>
      </div>
      <button type="button" className="btn btn-primary gxp-save" onClick={save}
        disabled={saving || check.s === "taken" || check.s === "invalid" || check.s === "checking"}>
        {saving ? (isAr ? "جاري الحفظ…" : "Saving…") : (isAr ? "حفظ التغييرات" : "Save changes")}
      </button>
      <p className="gxp-muted">{isAr ? "غيّر صورتك من قسم شخصيات الأفاتار بالأسفل." : "Change your picture from the avatar characters section below."}</p>
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
            <span><b>{r.username}</b><em dir="ltr">@{r.username}</em></span>
          </Link>
        ))}
      </div>
    </div>
  );
}

const css = `
.gxp-grid{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:16px;align-items:start}
.gxp-search-mobile{display:none}
@media (max-width:980px){
  .gxp-grid{grid-template-columns:1fr}
  .gxp-search-mobile{display:block;order:-1}
  .gxp-search-desktop{display:none}
}

.gxp-main,.gxp-side{display:grid;gap:14px;min-width:0}
.gxp-card{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.02);border-radius:18px;padding:16px;overflow:hidden}
.gxp-h{margin:0 0 12px;font-size:15px;color:#e6f7ff;display:flex;align-items:center;gap:7px}
.gxp-h svg{color:#00e5ff}
.gxp-stat .l{display:inline-flex;align-items:center;gap:6px}
.gxp-level-state{display:inline-flex;align-items:center;color:#8b90a0}
.gxp-level.on .gxp-level-state{color:#00e5ff}
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
.gxp-rankchip{display:inline-flex;align-items:center;gap:9px;padding:5px 12px 5px 8px;border-radius:14px;
  background:linear-gradient(180deg,color-mix(in srgb,var(--rc) 22%,transparent),color-mix(in srgb,var(--rc) 8%,transparent));
  border:1px solid color-mix(in srgb,var(--rc) 45%,transparent);
  box-shadow:0 6px 18px -12px var(--rc)}
.gxp-rankchip .rc-txt{display:flex;flex-direction:column;line-height:1.15}
.gxp-rankchip .rc-txt em{font-style:normal;font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:#9fb0c0}
.gxp-rankchip .rc-txt b{font-size:14px;font-weight:900;color:var(--rc);text-shadow:0 0 14px color-mix(in srgb,var(--rc) 45%,transparent)}

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
.gxp-rules{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px}
.gxp-rule{display:flex;gap:10px;align-items:flex-start;border:1px solid rgba(0,229,255,.18);background:linear-gradient(180deg,rgba(0,229,255,.06),rgba(0,229,255,.01));border-radius:14px;padding:12px}
.gxp-rule .ico{font-size:20px;line-height:1}
.gxp-rule b{display:block;font-size:13px;color:#e6f7ff}
.gxp-rule em{font-style:normal;display:block;font-size:11.5px;color:#a3b6c9;line-height:1.6;margin-top:3px}
.gxp-levels{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px}
.gxp-level{border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:11px;opacity:.6}
.gxp-level.on{opacity:1;border-color:rgba(0,229,255,.35);background:rgba(0,229,255,.05)}
.gxp-level-top{display:flex;align-items:center;gap:9px}
.gxp-level-top .ico{font-size:20px;display:inline-flex;align-items:center}
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
.gxp-coupon{position:relative;display:grid;gap:9px;border:1px solid rgba(16,185,129,.32);background:linear-gradient(135deg,rgba(16,185,129,.10),rgba(16,185,129,.02));border-radius:16px;padding:12px 14px;overflow:hidden}
.gxp-coupon::before{content:"";position:absolute;top:0;bottom:0;inset-inline-start:0;width:4px;background:linear-gradient(180deg,#34d399,#0ea5a4)}
.gxp-coupon.soon{border-color:rgba(245,158,11,.45);background:linear-gradient(135deg,rgba(245,158,11,.12),rgba(245,158,11,.02))}
.gxp-coupon.soon::before{background:linear-gradient(180deg,#fbbf24,#f59e0b)}
.gxp-coupon.dead{border-color:rgba(255,255,255,.10);background:rgba(255,255,255,.02);opacity:.72}
.gxp-coupon.dead::before{background:rgba(255,255,255,.14)}
.gxp-coupon-top{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.gxp-coupon-off{font-size:16px;font-weight:900;color:#eafff6;display:flex;align-items:baseline;gap:8px}
.gxp-coupon.dead .gxp-coupon-off{color:#c3c7d1}
.gxp-coupon-off .cap{font-size:11px;font-weight:700;color:#8b90a0}
.gxp-coupon-tag{font-size:10.5px;font-weight:800;padding:3px 9px;border-radius:99px;background:rgba(0,229,255,.12);color:#7fe6ff;border:1px solid rgba(0,229,255,.25);white-space:nowrap}
.gxp-coupon-tag.wheel{background:rgba(168,85,247,.14);color:#d8b4fe;border-color:rgba(168,85,247,.3)}
.gxp-coupon-code{display:flex;align-items:center;gap:8px;border:1px dashed rgba(255,255,255,.16);border-radius:12px;padding:8px 10px;background:rgba(0,0,0,.22)}
.gxp-coupon-code b{flex:1;min-width:0;font-family:ui-monospace,monospace;letter-spacing:.16em;font-size:14px;color:#6ee7b7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gxp-coupon.dead .gxp-coupon-code b{color:#9aa0ad;text-decoration:line-through}
.gxp-eye{width:32px;height:32px;flex:none;display:inline-flex;align-items:center;justify-content:center;border-radius:9px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:#cfe9ff;cursor:pointer;transition:.15s}
.gxp-eye:hover{border-color:#00e5ff;color:#00e5ff}
.gxp-copy{flex:none;padding:6px 14px;font-size:12px}
.gxp-coupon-foot{font-size:11.5px}
.gxp-coupon-exp{color:#8b90a0}
.gxp-coupon-exp.warn{color:#fbbf24;font-weight:800}
.gxp-coupon-dead-tag{color:#f87171;font-weight:800}
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
.gxp-brow .r{width:32px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:12px;color:#8b90a0}
.gxp-brow .r .rnum{font-size:13px;color:#8b90a0;font-variant-numeric:tabular-nums}
.gxp-brow .r .rnum.t1{color:#ffc53d}
.gxp-brow .r .rnum.t2{color:#d9e2ee}
.gxp-brow .r .rnum.t3{color:#ff7a45}

.gxp-brow img{width:30px;height:30px;border-radius:50%;background:#0b1220}
.gxp-brow .n{flex:1;min-width:0;font-size:12.5px;color:#e6f7ff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gxp-brow .x{font-size:11.5px;font-weight:900;color:#00e5ff}
.gxp-edit-card{border-color:rgba(0,229,255,.28);background:linear-gradient(180deg,rgba(0,229,255,.05),rgba(0,229,255,.01))}
.gxp-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.gxp-fields label{display:block;font-size:12px;color:#8b90a0}
.gxp-fields label span{display:block;margin-bottom:6px;font-weight:800;color:#c8d6e2}
.gxp-fields input{width:100%;height:42px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.03);color:#e6f7ff;padding:0 12px;font-size:13.5px;outline:none}
.gxp-fields input:focus{border-color:#00e5ff}
.gxp-fields em{font-style:normal;display:block;margin-top:5px;font-size:11.5px;color:#8b90a0}
.gxp-fields em.ok{color:#6ee7b7}
.gxp-fields em.bad{color:#fca5a5}
.gxp-save{margin-top:12px}
.gxp-save:disabled{opacity:.5;cursor:not-allowed}
`;
