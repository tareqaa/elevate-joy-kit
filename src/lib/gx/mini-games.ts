// Mini games catalog — UI/navigation only (no game logic here).
export type MiniGame = {
  slug: string;
  icon: string;
  name_ar: string;
  name_en: string;
  desc_ar: string;
  desc_en: string;
  status: "soon" | "live";
  tournament?: boolean;
};

export const MINI_GAMES: MiniGame[] = [
  {
    slug: "gx-arena",
    icon: "🎯",
    name_ar: "GX Arena",
    name_en: "GX Arena",
    desc_ar: "تحدّي سريع بين لاعبي المتجر — اجمع نقاط XP و GX Coins من كل جولة.",
    desc_en: "A fast head-to-head challenge — earn XP and GX Coins every round.",
    status: "soon",
  },
];
