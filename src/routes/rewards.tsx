import { createFileRoute } from "@tanstack/react-router";
import { StoreShell } from "@/components/gx/StoreShell";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { GxProfile } from "@/components/gx/GxProfile";
import { getHeadLang } from "@/lib/gx/i18n";

export const Route = createFileRoute("/rewards")({
  ssr: false,
  head: () => {
    const isEn = getHeadLang() === "en";
    const title = isEn
      ? "GX Rewards — Loyalty & Profile | GX Store"
      : "GX Rewards — الملف الشخصي ونظام الولاء";
    const desc = isEn
      ? "Your gamer profile, XP, GX Coins, tiers, badges and discount coupons — all in one place at GX Store."
      : "ملفك الشخصي، XP، GX Coins، المستويات، الشارات والكوبونات — كلها في صفحة واحدة في GX Store.";
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
