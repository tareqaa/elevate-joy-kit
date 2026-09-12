import React from "react";
import { Link } from "@tanstack/react-router";
import {
  Compass,
  Crosshair,
  Box,
  Users,
  Gamepad2,
  MousePointerClick,
  Puzzle,
  Gauge,
  Shield,
  Trophy,
  Skull,
  Globe,
  Swords,
  MapPin,
} from "lucide-react";
import { useLang } from "@/lib/gx/i18n";

export interface GameCategoryGenre {
  id: string;
  nameEn: string;
  nameAr: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  queryTerm: string;
  color?: string;
}

export const GAME_GENRES: GameCategoryGenre[] = [
  {
    id: "adventure",
    nameEn: "Adventure",
    nameAr: "مغامرات",
    icon: MapPin,
    queryTerm: "batman",
    color: "#00e5ff",
  },
  {
    id: "fighting",
    nameEn: "Fighting",
    nameAr: "قتال",
    icon: Swords,
    queryTerm: "mortal",
    color: "#ff4d4d",
  },
  {
    id: "fps",
    nameEn: "FPS",
    nameAr: "تصويب",
    icon: Crosshair,
    queryTerm: "helldivers",
    color: "#38bdf8",
  },
  {
    id: "simulation",
    nameEn: "Simulation",
    nameAr: "محاكاة",
    icon: Box,
    queryTerm: "minecraft",
    color: "#a855f7",
  },
  {
    id: "mmo",
    nameEn: "MMO",
    nameAr: "ألعاب جماعية",
    icon: Users,
    queryTerm: "raiders",
    color: "#3b82f6",
  },
  {
    id: "platformer",
    nameEn: "Platformer",
    nameAr: "منصات",
    icon: Gamepad2,
    queryTerm: "hollow",
    color: "#eab308",
  },
  {
    id: "point-and-click",
    nameEn: "Point & Click",
    nameAr: "ألغاز وتفاعل",
    icon: MousePointerClick,
    queryTerm: "human",
    color: "#10b981",
  },
  {
    id: "puzzle",
    nameEn: "Puzzle",
    nameAr: "ألغاز",
    icon: Puzzle,
    queryTerm: "human",
    color: "#ec4899",
  },
  {
    id: "racing",
    nameEn: "Racing",
    nameAr: "سباقات",
    icon: Gauge,
    queryTerm: "forza",
    color: "#f97316",
  },
  {
    id: "sports",
    nameEn: "Sports",
    nameAr: "رياضة",
    icon: Trophy,
    queryTerm: "fc",
    color: "#14b8a6",
  },
  {
    id: "horror",
    nameEn: "Horror",
    nameAr: "رعب وبقاء",
    icon: Skull,
    queryTerm: "resident",
    color: "#ef4444",
  },
  {
    id: "rpg",
    nameEn: "RPG",
    nameAr: "تعاقب أدوار",
    icon: Shield,
    queryTerm: "souls",
    color: "#6366f1",
  },
  {
    id: "open-world",
    nameEn: "Open World",
    nameAr: "عالم مفتوح",
    icon: Globe,
    queryTerm: "gta",
    color: "#8b5cf6",
  },
];

export function DiscoverGamesCategorySection() {
  const { lang } = useLang();
  const ar = lang === "ar";

  // Double the list for infinite seamless marquee loop
  const marqueeItems = [...GAME_GENRES, ...GAME_GENRES];

  return (
    <section className="section gx-discover-categories-wrap" style={{ paddingTop: 28, paddingBottom: 24, overflow: "hidden" }}>
      <div className="wrap">
        {/* Section Header */}
        <div className="section-head" style={{ marginBottom: 18 }}>
          <div>
            <span className="k" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Compass size={14} style={{ color: "var(--cyan, #00e5ff)" }} />
              {ar ? "تصنيفات الألعاب" : "Game Categories"}
            </span>
            <h2 style={{ fontSize: 24, fontWeight: 900 }}>
              {ar ? "اكتشف الألعاب حسب التصنيف" : "Discover Games By Category"}
            </h2>
          </div>
        </div>
      </div>

      {/* Full-width continuous auto-scrolling marquee track */}
      <div className="gx-auto-scroll-marquee-container">
        <div className="gx-auto-scroll-marquee-track">
          {marqueeItems.map((genre, idx) => {
            const IconComp = genre.icon;
            const targetUrl = `/category/games?genre=${genre.id}`;

            return (
              <Link
                key={`${genre.id}-${idx}`}
                to={targetUrl as never}
                className="gx-genre-pill-card"
                style={{ ["--genre-color" as string]: genre.color || "#00e5ff" } as React.CSSProperties}
              >
                <div className="gx-genre-icon-box">
                  <IconComp size={22} strokeWidth={2.2} />
                </div>
                <span className="gx-genre-name">
                  {ar ? genre.nameAr : genre.nameEn}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
