import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { StoreShell } from "@/components/gx/StoreShell";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/gx/i18n";
import { fetchLevels, levelName } from "@/lib/gx/loyalty";

export const Route = createFileRoute("/leaderboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "لوحة المتصدرين — GX Store" },
      { name: "description", content: "أفضل لاعبي GX Store حسب نقاط الخبرة والمستوى." },
      { property: "og:title", content: "لوحة المتصدرين — GX Store" },
      { property: "og:description", content: "شاهد ترتيب أفضل اللاعبين في متجر GX." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: STORE_HEAD_LINKS,
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { lang } = useLang();
  const isAr = lang === "ar";

  const levelsQ = useQuery({ queryKey: ["levels"], queryFn: fetchLevels });
  const boardQ = useQuery({
    queryKey: ["loyalty-leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_loyalty_leaderboard", { _limit: 50 });
      if (error) throw error;
      return data ?? [];
    },
  });

  const levelOf = (code: string) => levelsQ.data?.find((l) => l.code === code) ?? null;

  return (
    <StoreShell>
      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <span className="k">GX Loyalty</span>
              <h1>{isAr ? "لوحة المتصدرين" : "Leaderboard"}</h1>
            </div>
            <Link to="/rewards" className="btn btn-ghost">{isAr ? "كيف أكسب النقاط؟" : "How to earn XP"}</Link>
          </div>

          <div className="gxl-list">
            {boardQ.isLoading && <p className="gxl-empty">{isAr ? "جاري التحميل…" : "Loading…"}</p>}
            {!boardQ.isLoading && (boardQ.data ?? []).length === 0 && (
              <p className="gxl-empty">{isAr ? "لا يوجد لاعبون بعد." : "No players yet."}</p>
            )}
            {(boardQ.data ?? []).map((r) => {
              const lvl = levelOf(r.level_code);
              const rank = Number(r.rank);
              const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
              const avatar = r.avatar_url || `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(r.username || "gx")}`;
              return (
                <Link key={r.user_id} to="/u/$username" params={{ username: r.username || "" }} className={`gxl-row ${rank <= 3 ? "top" : ""}`}>
                  <span className="gxl-rank">{medal || `#${rank}`}</span>
                  <img className="gxl-av" src={avatar} alt="" loading="lazy" />
                  <span className="gxl-name">
                    <b>{r.full_name || r.username}</b>
                    <em dir="ltr">@{r.username}</em>
                  </span>
                  {lvl && (
                    <span className="gxl-level" style={{ background: lvl.gradient }}>
                      {lvl.icon} {levelName(lvl, lang)}
                    </span>
                  )}
                  <span className="gxl-xp">{Number(r.xp).toLocaleString("en-US")} XP</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
      <style>{css}</style>
    </StoreShell>
  );
}

const css = `
.gxl-list{display:grid;gap:8px}
.gxl-empty{color:#8b90a0;text-align:center;padding:40px 0}
.gxl-row{display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.02);text-decoration:none;color:inherit;transition:.16s}
.gxl-row:hover{border-color:rgba(0,229,255,.4);transform:translateY(-1px)}
.gxl-row.top{border-color:rgba(255,196,0,.35);background:linear-gradient(90deg,rgba(255,196,0,.08),transparent)}
.gxl-rank{width:42px;font-weight:900;font-size:15px;color:#8b90a0;text-align:center}
.gxl-av{width:40px;height:40px;border-radius:50%;object-fit:cover;background:#12151f;border:1px solid rgba(255,255,255,.1)}
.gxl-name{display:flex;flex-direction:column;flex:1;min-width:0}
.gxl-name b{font-size:14px;color:#e6f7ff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gxl-name em{font-style:normal;font-size:11.5px;color:#00e5ff}
.gxl-level{font-size:11px;font-weight:800;padding:4px 10px;border-radius:99px;color:#08101a;white-space:nowrap}
.gxl-xp{font-size:13px;font-weight:900;color:#e6f7ff;white-space:nowrap}
@media (max-width:560px){.gxl-level{display:none}}
`;
