import { createFileRoute } from "@tanstack/react-router";
import { StoreShell } from "@/components/gx/StoreShell";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { GxProfile } from "@/components/gx/GxProfile";
import { getHeadLang } from "@/lib/gx/i18n";

export const Route = createFileRoute("/leaderboard")({
  ssr: false,
  head: () => {
    const isEn = getHeadLang() === "en";
    const title = isEn
      ? "Leaderboard & Player Profiles | GX Store"
      : "ملفات اللاعبين والمتصدرين — GX Store";
    const desc = isEn
      ? "Search any player username, view tiers, XP, and rank among top players at GX Store."
      : "ابحث عن أي اسم مستخدم وشاهد المستويات و XP وترتيب أفضل لاعبي GX Store.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: STORE_HEAD_LINKS,
    };
  },
  component: () => (
    <StoreShell>
      <GxProfile />
    </StoreShell>
  ),
});
