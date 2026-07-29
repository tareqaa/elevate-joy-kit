import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { StoreShell } from "@/components/gx/StoreShell";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { useLang } from "@/lib/gx/i18n";
import { fetchLevels, levelName, COINS_PER_JOD_REDEEM, XP_PER_JOD } from "@/lib/gx/loyalty";

export const Route = createFileRoute("/rewards")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "GX Rewards — نظام الولاء والمكافآت" },
      { name: "description", content: "اكسب XP و GX Coins مع كل طلب، ارفع مستواك واحصل على كوبونات وأفاتارات حصرية في GX Store." },
      { property: "og:title", content: "GX Rewards — نظام الولاء والمكافآت" },
      { property: "og:description", content: "نظام مستويات ونقاط ومكافآت لعملاء GX Store." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: STORE_HEAD_LINKS,
  }),
  component: RewardsPage,
});

function RewardsPage() {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const levelsQ = useQuery({ queryKey: ["levels"], queryFn: fetchLevels });

  return (
    <StoreShell>
      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <span className="k">GX Loyalty</span>
              <h1>{isAr ? "المكافآت والمستويات" : "Rewards & Levels"}</h1>
            </div>
          </div>

          <div className="gxr-rules">
            <RuleCard icon="⚡" title={isAr ? "اكسب XP" : "Earn XP"}
              text={isAr ? `كل 1 دينار تنفقه = ${XP_PER_JOD} نقطة خبرة.` : `Every 1 JOD spent = ${XP_PER_JOD} XP.`} />
            <RuleCard icon="🪙" title="GX Coins"
              text={isAr ? "كل قرش تنفقه = 1 عملة GX تُضاف بعد اكتمال الطلب." : "Every 0.01 JOD spent = 1 GX Coin after your order is completed."} />
            <RuleCard icon="💸" title={isAr ? "استبدال العملات" : "Redeem coins"}
              text={isAr ? `${COINS_PER_JOD_REDEEM} عملة = 1 دينار خصم عند الدفع.` : `${COINS_PER_JOD_REDEEM} coins = 1 JOD off at checkout.`} />
            <RuleCard icon="🎁" title={isAr ? "مكافآت المستوى" : "Level rewards"}
              text={isAr ? "كل مستوى جديد يمنحك عملات وكوبون خصم وأفاتارات حصرية." : "Each new level unlocks coins, a discount coupon and exclusive avatars."} />
          </div>

          <div className="gxr-levels">
            {(levelsQ.data ?? []).map((l) => (
              <div key={l.id} className="gxr-level" style={{ borderColor: `${l.color}55` }}>
                <div className="gxr-level-top" style={{ background: l.gradient }}>
                  <span className="gxr-ico">{l.icon}</span>
                </div>
                <div className="gxr-level-body">
                  <h3 style={{ color: l.color }}>{levelName(l, lang)}</h3>
                  <div className="gxr-xp">{l.min_xp.toLocaleString("en-US")} XP</div>
                  <ul>
                    {l.reward_coins > 0 && <li>🪙 {l.reward_coins.toLocaleString("en-US")} {isAr ? "عملة هدية" : "bonus coins"}</li>}
                    {l.coupon_percent > 0 && (
                      <li>🎟️ {isAr ? `كوبون خصم ${l.coupon_percent}%` : `${l.coupon_percent}% coupon`}
                        {l.coupon_max_discount_jod ? (isAr ? ` (حتى ${l.coupon_max_discount_jod} د.أ)` : ` (max ${l.coupon_max_discount_jod} JOD)`) : ""}</li>
                    )}
                    {l.coins_bonus_pct > 0 && <li>🚀 +{l.coins_bonus_pct}% {isAr ? "عملات إضافية دائمة" : "extra coins forever"}</li>}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <style>{css}</style>
    </StoreShell>
  );
}

function RuleCard({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="gxr-rule">
      <div className="gxr-rule-ico">{icon}</div>
      <div>
        <h4>{title}</h4>
        <p>{text}</p>
      </div>
    </div>
  );
}

const css = `
.gxr-rules{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin-bottom:26px}
.gxr-rule{display:flex;gap:12px;padding:16px;border-radius:16px;border:1px solid rgba(0,229,255,.18);background:linear-gradient(180deg,rgba(0,229,255,.06),rgba(0,229,255,.01))}
.gxr-rule-ico{font-size:26px;line-height:1}
.gxr-rule h4{margin:0 0 4px;font-size:15px;color:#e6f7ff}
.gxr-rule p{margin:0;font-size:13px;color:#a3b6c9;line-height:1.6}
.gxr-levels{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
.gxr-level{border:1px solid rgba(255,255,255,.1);border-radius:18px;overflow:hidden;background:rgba(255,255,255,.02)}
.gxr-level-top{height:74px;display:grid;place-items:center}
.gxr-ico{font-size:32px}
.gxr-level-body{padding:14px}
.gxr-level-body h3{margin:0;font-size:17px}
.gxr-xp{font-size:12px;color:#8b90a0;margin:2px 0 10px;font-weight:700}
.gxr-level-body ul{margin:0;padding:0;list-style:none;display:grid;gap:6px}
.gxr-level-body li{font-size:12.5px;color:#c8d6e2}
`;
