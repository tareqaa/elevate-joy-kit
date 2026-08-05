import { createFileRoute } from "@tanstack/react-router";
import { StoreShell } from "@/components/gx/StoreShell";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { GxProfile } from "@/components/gx/GxProfile";

export const Route = createFileRoute("/leaderboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ملفات اللاعبين والمتصدرين — GX Store" },
      { name: "description", content: "ابحث عن أي اسم مستخدم وشاهد المستويات و XP وترتيب أفضل لاعبي GX Store." },
      { property: "og:title", content: "ملفات اللاعبين والمتصدرين — GX Store" },
      { property: "og:description", content: "بحث أسماء المستخدمين، المستويات، GX Coins، ولوحة المتصدرين في متجر GX." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: STORE_HEAD_LINKS,
  }),
  component: () => (
    <StoreShell>
      <GxProfile />
    </StoreShell>
  ),
});
