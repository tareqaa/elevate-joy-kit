import { createFileRoute } from "@tanstack/react-router";
import { StoreShell } from "@/components/gx/StoreShell";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { GxProfile } from "@/components/gx/GxProfile";

export const Route = createFileRoute("/u/$username")({
  ssr: false,
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — ملف اللاعب في GX Store` },
      { name: "description", content: `المستوى والترتيب و GX Coins والشارات للاعب @${params.username} في متجر GX.` },
      { property: "og:title", content: `@${params.username} — GX Store` },
      { property: "og:description", content: `شاهد المستوى والرتبة والترتيب للاعب @${params.username}.` },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
    links: STORE_HEAD_LINKS,
  }),
  component: () => {
    const { username } = Route.useParams();
    return (
      <StoreShell>
        <GxProfile username={username} />
      </StoreShell>
    );
  },
});
