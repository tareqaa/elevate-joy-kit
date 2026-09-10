import React, { useRef } from "react";
import { Link } from "@tanstack/react-router";
import {
  Flame,
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
  ChevronLeft,
  ChevronRight,
  Compass,
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
    id: "action",
    nameEn: "Action",
    nameAr: "أكشن",
    icon: Flame,
    queryTerm: "action",
    color: "#ff4d4d",
  },
  {
    id: "fps",
    nameEn: "FPS",
    nameAr: "تصويب",
    icon: Crosshair,
    queryTerm: "fps",
    color: "#00e5ff",
  },
  {
    id: "simulation",
    nameEn: "Simulation",
    nameAr: "محاكاة",
    icon: Box,
    queryTerm: "simulator",
    color: "#a855f7",
  },
  {
    id: "mmo",
    nameEn: "MMO",
    nameAr: "ألعاب جماعية",
    icon: Users,
    queryTerm: "mmo",
    color: "#3b82f6",
  },
  {
    id: "platformer",
    nameEn: "Platformer",
    nameAr: "منصات",
    icon: Gamepad2,
    queryTerm: "platformer",
    color: "#eab308",
  },
  {
    id: "point-and-click",
    nameEn: "Point & Click",
    nameAr: "مغامرات ونقر",
    icon: MousePointerClick,
    queryTerm: "click",
    color: "#10b981",
  },
  {
    id: "puzzle",
    nameEn: "Puzzle",
    nameAr: "ألغاز",
    icon: Puzzle,
    queryTerm: "puzzle",
    color: "#ec4899",
  },
  {
    id: "racing",
    nameEn: "Racing",
    nameAr: "سباقات",
    icon: Gauge,
    queryTerm: "racing",
    color: "#f97316",
  },
  {
    id: "rpg",
    nameEn: "RPG",
    nameAr: "تعاقب أدوار",
    icon: Shield,
    queryTerm: "rpg",
    color: "#6366f1",
  },
  {
    id: "sports",
    nameEn: "Sports",
    nameAr: "رياضة",
    icon: Trophy,
    queryTerm: "sports",
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const mult = direction === "left" ? -1 : 1;
    scrollRef.current.scrollBy({
      left: mult * 280,
      behavior: "smooth",
    });
  };

  return (
    <section className="gx-section-modern gx-discover-categories-wrap">
      <div className="gx-home-container">
        {/* Section Header */}
        <div className="gx-section-header-row">
          <div className="gx-section-title-group">
            <div className="gx-badge-glow">
              <Compass size={14} className="gx-badge-icon" />
              <span>{ar ? "تصنيفات الألعاب" : "Game Categories"}</span>
            </div>
            <h2 className="gx-section-title">
              {ar ? "اكتشف الألعاب حسب التصنيف" : "Discover Games By Category"}
            </h2>
            <p className="gx-section-subtitle">
              {ar
                ? "اختر تصنيف لعبتك المفضل وتصفح أفضل ألعاب الكمبيوتر والإكسبوكس"
                : "Browse our wide catalog of PC & console titles by your favorite genre"}
            </p>
          </div>

          {/* Navigation Arrows */}
          <div className="gx-section-controls">
            <div className="gx-circular-arrow-group">
              <button
                type="button"
                onClick={() => scroll(ar ? "right" : "left")}
                className="gx-circular-nav-btn"
                aria-label={ar ? "السابق" : "Previous"}
              >
                {ar ? <ChevronRight size={20} strokeWidth={2.4} /> : <ChevronLeft size={20} strokeWidth={2.4} />}
              </button>
              <button
                type="button"
                onClick={() => scroll(ar ? "left" : "right")}
                className="gx-circular-nav-btn"
                aria-label={ar ? "التالي" : "Next"}
              >
                {ar ? <ChevronLeft size={20} strokeWidth={2.4} /> : <ChevronRight size={20} strokeWidth={2.4} />}
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Pills Row matching user image */}
        <div className="gx-genre-cards-scroll" ref={scrollRef}>
          {GAME_GENRES.map((genre) => {
            const IconComp = genre.icon;
            // Target link filtered by category games and search query
            const targetUrl = `/products?category=games&search=${encodeURIComponent(genre.queryTerm)}`;

            return (
              <Link
                key={genre.id}
                to={targetUrl as never}
                className="gx-genre-pill-card"
                style={{ ["--genre-color" as string]: genre.color || "#00e5ff" } as React.CSSProperties}
              >
                <div className="gx-genre-icon-box">
                  <IconComp size={24} strokeWidth={2} />
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
