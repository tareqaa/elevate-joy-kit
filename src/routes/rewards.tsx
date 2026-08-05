import { createFileRoute } from "@tanstack/react-router";
import { StoreShell } from "@/components/gx/StoreShell";
import { getStoreHeadLinks } from "@/lib/gx/store-head";
import { GxProfile } from "@/components/gx/GxProfile";

export const Route = createFileRoute("/rewards")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "GX Rewards — الملف الشخصي ونظام الولاء" },
      { name: "description", content: "ملفك الشخصي، XP، GX Coins، المستويات، الشارات والكوبونات — كلها في صفحة واحدة في GX Store." },
      { property: "og:title", content: "GX Rewards — الملف الشخصي ونظام الولاء" },
      { property: "og:description", content: "المستويات و XP و GX Coins والمكافآت في مكان واحد." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: getStoreHeadLinks(["home", "product"]),
  }),
  component: () => (
    <StoreShell>
      <GxProfile />
    </StoreShell>
  ),
});
