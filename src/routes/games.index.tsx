import { createFileRoute } from "@tanstack/react-router";
import { StoreShell } from "@/components/gx/StoreShell";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { useLang } from "@/lib/gx/i18n";
import { MINI_GAMES } from "@/lib/gx/mini-games";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/games/")({
  head: () => ({
    meta: [
      { title: "Mini Games — ألعاب GX Store المصغّرة" },
      { name: "description", content: "جرّب الألعاب المصغّرة في GX Store، تابع التورنمنتات النشطة واربح XP و GX Coins." },
      { property: "og:title", content: "Mini Games — GX Store" },
      { property: "og:description", content: "ألعاب مصغّرة وتورنمنتات داخل متجر GX." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: STORE_HEAD_LINKS,
  }),
  component: GamesPage,
});

function GamesPage() {
  const { lang, dir } = useLang();
  const ar = lang === "ar";

  return (
    <StoreShell>
      <main dir={dir}>
        <section className="container games-hero">
          <div className="gh-in">
            <div className="gh-ic">🎮</div>
            <div>
              <h1>{ar ? "الألعاب المصغّرة" : "Mini Games"}</h1>
              <p>
                {ar
                  ? "العب، تنافس، واربح مكافآت داخل GX Store. الألعاب والتورنمنتات قريبًا."
                  : "Play, compete and earn rewards inside GX Store. Games and tournaments coming soon."}
              </p>
            </div>
          </div>
        </section>

        <section className="container">
          <div className="games-grid">
            {MINI_GAMES.map((g) => (
              <article key={g.slug} className={"game-card" + (g.status === "soon" ? " soon" : "")}>
                <div className="game-thumb" aria-hidden>{g.icon}</div>
                <h2 className="game-name">{ar ? g.name_ar : g.name_en}</h2>
                <p className="game-desc">{ar ? g.desc_ar : g.desc_en}</p>
                <div className="game-badges">
                  <span className="g-badge">
                    {g.status === "soon" ? (ar ? "قريبًا" : "Coming soon") : ar ? "متاحة" : "Available"}
                  </span>
                  {g.tournament && (
                    <span className="g-badge live">{ar ? "تورنمنت نشط" : "Live tournament"}</span>
                  )}
                </div>
                {g.status === "live" && g.path === "/games/blast" && (
                  <Link to="/games/blast" className="btn btn-primary" style={{ justifyContent: "center", textDecoration: "none" }}>
                    {ar ? "ابدأ اللعب" : "Start playing"}
                  </Link>
                )}
              </article>
            ))}
          </div>
        </section>
      </main>
    </StoreShell>
  );
}
