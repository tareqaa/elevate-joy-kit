import React, { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface CategoryBarItem {
  id: string;
  nameAr: string;
  nameEn: string;
  link: string;
  icon: React.ReactNode;
}

export const TOP_CATEGORIES_NAV: CategoryBarItem[] = [
  {
    id: "games",
    nameAr: "الألعاب",
    nameEn: "Games",
    link: "/category/games",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="6" y1="12" x2="10" y2="12" />
        <line x1="8" y1="10" x2="8" y2="14" />
        <line x1="15" y1="13" x2="15.01" y2="13" />
        <line x1="18" y1="11" x2="18.01" y2="11" />
        <rect x="2" y="6" width="20" height="12" rx="6" />
      </svg>
    ),
  },
  {
    id: "digital-cards",
    nameAr: "بطاقات اللعب الرقمية",
    nameEn: "Digital Game Cards",
    link: "/category/gift-cards",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="3" />
        <line x1="2" y1="10" x2="22" y2="10" />
        <path d="M6 15h2" />
        <path d="M10 15h4" />
      </svg>
    ),
  },
  {
    id: "gift-cards",
    nameAr: "بطاقات الهدايا الإلكترونية",
    nameEn: "E-Gift Cards",
    link: "/category/gift-cards",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 12 20 22 4 22 4 12" />
        <rect x="2" y="7" width="20" height="5" />
        <line x1="12" y1="22" x2="12" y2="7" />
        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
      </svg>
    ),
  },
  {
    id: "e-cash",
    nameAr: "النقود الإلكترونية",
    nameEn: "E-Money",
    link: "/category/gift-cards",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="3" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
        <path d="M12 6v6" />
        <path d="M10 8h3.5a1.5 1.5 0 0 1 0 3H10" />
      </svg>
    ),
  },
  {
    id: "steam",
    nameAr: "ستيم",
    nameEn: "Steam",
    link: "/category/pc-games",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12c0 4.41 2.87 8.14 6.84 9.47l2.84-4.14a4.48 4.48 0 0 1-.68-2.33c0-1.86 1.15-3.46 2.78-4.12l1.9-2.78A4.98 4.98 0 0 1 12 7c2.76 0 5 2.24 5 5 0 2.22-1.45 4.1-3.46 4.74l-2.73 1.87a4.49 4.49 0 0 1-2.81.99c-.43 0-.85-.06-1.25-.18l-3.32 4.84C5.07 23.36 8.35 24 12 24c6.63 0 12-5.37 12-12S18.63 2 12 2zm3 8c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z" />
      </svg>
    ),
  },
  {
    id: "steam-gift-cards",
    nameAr: "بطاقات هدايا ستيم",
    nameEn: "Steam Gift Cards",
    link: "/category/gift-cards?cat=steam",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="3" />
        <circle cx="8.5" cy="12" r="2.5" />
        <line x1="14" y1="9" x2="19" y2="9" />
        <line x1="14" y1="15" x2="17" y2="15" />
      </svg>
    ),
  },
  {
    id: "playstation",
    nameAr: "بلايستيشن نتورك",
    nameEn: "PlayStation",
    link: "/category/gift-cards?cat=playstation",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
        <path d="M9.54 3.78c-1.32.42-1.92 1.44-1.92 3.48v10.38l3.18 1.02V7.5c0-.9.36-1.32 1.08-1.56.72-.24 1.2.06 1.2.96v11.7l3.12 1.02V6.6c0-2.04-1.32-3.12-3.36-3.12-.96 0-2.1.18-3.3.3zM2.88 17.52c-.66.36-.96.84-.96 1.44 0 1.2 1.38 1.86 3.72 1.86 2.4 0 5.16-.72 7.74-2.04l-.84-2.22c-2.1 1.02-4.32 1.56-6.06 1.56-.96 0-1.5-.18-1.5-.6 0-.36.3-.6.9-1.02l-3-1.02z" />
      </svg>
    ),
  },
  {
    id: "xbox",
    nameAr: "إكس بوكس",
    nameEn: "Xbox",
    link: "/category/xbox-games",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12c0 5.52 4.48 10 10 10s10-4.48 10-10c0-5.52-4.48-10-10-10zm0 1.2c2.09 0 4.02.7 5.57 1.88-1.42 1.63-3.23 3.63-5.57 5.75-2.34-2.12-4.15-4.12-5.57-5.75A8.75 8.75 0 0 1 12 3.2zm-6.9 3.05c1.47 1.76 3.32 3.86 5.6 5.92-2.3 2.14-4.22 4.41-5.78 6.32A8.77 8.77 0 0 1 3.2 12c0-2.16.76-4.14 1.9-5.75zm13.8 0A8.77 8.77 0 0 1 20.8 12c0 2.16-.76 4.14-1.9 5.75-1.56-1.91-3.48-4.18-5.78-6.32 2.28-2.06 4.13-4.16 5.6-5.92zM12 12.3c2.2 1.95 4.06 4.09 5.53 6.13A8.74 8.74 0 0 1 12 20.8a8.74 8.74 0 0 1-5.53-2.37c1.47-2.04 3.33-4.18 5.53-6.13z" />
      </svg>
    ),
  },
  {
    id: "fifa",
    nameAr: "فيفا / FC",
    nameEn: "FIFA / FC",
    link: "/category/games?search=fc",
    icon: (
      <span style={{ fontSize: "16px", fontWeight: "900", fontFamily: "sans-serif", letterSpacing: "-0.5px" }}>
        FIFA
      </span>
    ),
  },
  {
    id: "fortnite",
    nameAr: "فورتنايت",
    nameEn: "Fortnite",
    link: "/category/fortnite",
    icon: (
      <span style={{ fontSize: "19px", fontWeight: "900", fontFamily: "sans-serif" }}>
        F
      </span>
    ),
  },
  {
    id: "amazon",
    nameAr: "أمازون",
    nameEn: "Amazon",
    link: "/category/gift-cards?cat=amazon",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
        <path d="M13.84 15.68c-2.48 1.83-6.1 2.81-9.2 2.81-4.35 0-8.27-1.6-11.24-4.29-.23-.21-.02-.5.26-.34 3.2 1.86 7.15 2.98 11.23 2.98 2.76 0 5.8-.62 8.56-1.9.42-.2.78.3.39.74zm1.26-1.55c-.32-.41-2.08-.18-2.88-.08-.24.03-.28-.18-.06-.34 1.45-1.02 3.82-.73 4.29-.16.48.59-.12 2.99-1.48 4.13-.21.18-.39.08-.29-.15.34-.78.74-2.99.42-3.4z" />
      </svg>
    ),
  },
];

export function HomeCategoriesBar() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = direction === "left" ? -240 : 240;
    scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <nav className="gx-top-categories-bar-wrap" aria-label="أقسام المتجر الرئيسية">
      <div className="gx-home-container">
        <div className="gx-top-categories-bar">
          <button
            type="button"
            className="gx-cat-bar-arrow gx-cat-bar-prev"
            onClick={() => scroll("right")}
            aria-label="السابق"
          >
            <ChevronRight size={18} strokeWidth={2.4} />
          </button>

          <div className="gx-cat-bar-scroll" ref={scrollRef}>
            {TOP_CATEGORIES_NAV.map((cat) => (
              <Link
                key={cat.id}
                to={cat.link as never}
                className="gx-cat-bar-item"
                title={cat.nameAr}
              >
                <div className="gx-cat-bar-icon">
                  {cat.icon}
                </div>
                <span className="gx-cat-bar-label">
                  {cat.nameAr}
                </span>
              </Link>
            ))}
          </div>

          <button
            type="button"
            className="gx-cat-bar-arrow gx-cat-bar-next"
            onClick={() => scroll("left")}
            aria-label="التالي"
          >
            <ChevronLeft size={18} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </nav>
  );
}
