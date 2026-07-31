// Mini games catalog — UI/navigation only (no game logic here).
export type MiniGame = {
  slug: string;
  icon: string;
  name_ar: string;
  name_en: string;
  desc_ar: string;
  desc_en: string;
  status: "soon" | "live";
  /** route to open when the game is live */
  path?: string;
  tournament?: boolean;
};

export const MINI_GAMES: MiniGame[] = [
  {
    slug: "gx-blast",
    icon: "\ud83e\udde9",
    name_ar: "GX Blast",
    name_en: "GX Blast",
    desc_ar: "\u0644\u0648\u062d 8\u00d78 \u2014 \u0636\u0639 \u0627\u0644\u0642\u0637\u0639\u060c \u0627\u0645\u0633\u062d \u0627\u0644\u0635\u0641\u0648\u0641 \u0648\u0627\u0644\u0623\u0639\u0645\u062f\u0629\u060c \u0648\u0627\u062c\u0645\u0639 \u0643\u0648\u0645\u0628\u0648 \u0648\u0633\u062a\u0631\u064a\u0643.",
    desc_en: "An 8\u00d78 board \u2014 drop blocks, clear full rows and columns, and chain combos.",
    status: "live",
    path: "/games/blast",
  },
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
