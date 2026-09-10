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
    id: "all-products",
    nameAr: "عرض الكل",
    nameEn: "All Products",
    link: "/products",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
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
    id: "pc-games",
    nameAr: "ألعاب PC",
    nameEn: "PC Games",
    link: "/category/pc-games",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    id: "xbox-games",
    nameAr: "ألعاب Xbox",
    nameEn: "Xbox Games",
    link: "/category/xbox-games",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12c0 5.52 4.48 10 10 10s10-4.48 10-10c0-5.52-4.48-10-10-10zm0 1.2c2.09 0 4.02.7 5.57 1.88-1.42 1.63-3.23 3.63-5.57 5.75-2.34-2.12-4.15-4.12-5.57-5.75A8.75 8.75 0 0 1 12 3.2zm-6.9 3.05c1.47 1.76 3.32 3.86 5.6 5.92-2.3 2.14-4.22 4.41-5.78 6.32A8.77 8.77 0 0 1 3.2 12c0-2.16.76-4.14 1.9-5.75zm13.8 0A8.77 8.77 0 0 1 20.8 12c0 2.16-.76 4.14-1.9 5.75-1.56-1.91-3.48-4.18-5.78-6.32 2.28-2.06 4.13-4.16 5.6-5.92zM12 12.3c2.2 1.95 4.06 4.09 5.53 6.13A8.74 8.74 0 0 1 12 20.8a8.74 8.74 0 0 1-5.53-2.37c1.47-2.04 3.33-4.18 5.53-6.13z" />
      </svg>
    ),
  },
  {
    id: "sony-games",
    nameAr: "ألعاب PlayStation",
    nameEn: "PlayStation Games",
    link: "/category/sony",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
        <path d="M9.54 3.78c-1.32.42-1.92 1.44-1.92 3.48v10.38l3.18 1.02V7.5c0-.9.36-1.32 1.08-1.56.72-.24 1.2.06 1.2.96v11.7l3.12 1.02V6.6c0-2.04-1.32-3.12-3.36-3.12-.96 0-2.1.18-3.3.3zM2.88 17.52c-.66.36-.96.84-.96 1.44 0 1.2 1.38 1.86 3.72 1.86 2.4 0 5.16-.72 7.74-2.04l-.84-2.22c-2.1 1.02-4.32 1.56-6.06 1.56-.96 0-1.5-.18-1.5-.6 0-.36.3-.6.9-1.02l-3-1.02z" />
      </svg>
    ),
  },
  {
    id: "gift-cards",
    nameAr: "بطاقات الهدايا",
    nameEn: "Gift Cards",
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
    id: "playstation",
    nameAr: "بطاقات بلايستيشن",
    nameEn: "PlayStation Cards",
    link: "/product/playstation",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
        <path d="M9.54 3.78c-1.32.42-1.92 1.44-1.92 3.48v10.38l3.18 1.02V7.5c0-.9.36-1.32 1.08-1.56.72-.24 1.2.06 1.2.96v11.7l3.12 1.02V6.6c0-2.04-1.32-3.12-3.36-3.12-.96 0-2.1.18-3.3.3zM2.88 17.52c-.66.36-.96.84-.96 1.44 0 1.2 1.38 1.86 3.72 1.86 2.4 0 5.16-.72 7.74-2.04l-.84-2.22c-2.1 1.02-4.32 1.56-6.06 1.56-.96 0-1.5-.18-1.5-.6 0-.36.3-.6.9-1.02l-3-1.02z" />
      </svg>
    ),
  },
  {
    id: "xbox-cards",
    nameAr: "بطاقات إكسبوكس",
    nameEn: "Xbox Cards",
    link: "/product/xbox",
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
    id: "steam-gift-cards",
    nameAr: "بطاقات هدايا ستيم",
    nameEn: "Steam Gift Cards",
    link: "/category/gift-cards?cat=steam",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12c0 4.41 2.87 8.14 6.84 9.47l2.84-4.14a4.48 4.48 0 0 1-.68-2.33c0-1.86 1.15-3.46 2.78-4.12l1.9-2.78A4.98 4.98 0 0 1 12 7c2.76 0 5 2.24 5 5 0 2.22-1.45 4.1-3.46 4.74l-2.73 1.87a4.49 4.49 0 0 1-2.81.99c-.43 0-.85-.06-1.25-.18l-3.32 4.84C5.07 23.36 8.35 24 12 24c6.63 0 12-5.37 12-12S18.63 2 12 2zm3 8c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z" />
      </svg>
    ),
  },
  {
    id: "itunes",
    nameAr: "بطاقات آبل وآيتونز",
    nameEn: "Apple & iTunes Cards",
    link: "/product/itunes",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.54c.64-.78 1.08-1.86.96-2.94-.93.04-2.05.62-2.71 1.4-.58.67-1.09 1.77-.95 2.83 1.04.08 2.06-.51 2.7-1.29z" />
      </svg>
    ),
  },
  {
    id: "google-play",
    nameAr: "بطاقات جوجل بلاي",
    nameEn: "Google Play Cards",
    link: "/product/google-play",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
  },
  {
    id: "fifa",
    nameAr: "فيفا / FC",
    nameEn: "FIFA / FC",
    link: "/category/games?search=fc",
    icon: (
      <span style={{ fontSize: "15px", fontWeight: "900", fontFamily: "sans-serif", letterSpacing: "-0.5px" }}>
        FC
      </span>
    ),
  },
  {
    id: "fortnite",
    nameAr: "فورتنايت",
    nameEn: "Fortnite",
    link: "/category/fortnite",
    icon: (
      <span style={{ fontSize: "18px", fontWeight: "900", fontFamily: "sans-serif" }}>
        F
      </span>
    ),
  },
  {
    id: "subscriptions",
    nameAr: "الاشتراكات",
    nameEn: "Subscriptions",
    link: "/category/subscriptions",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    id: "design",
    nameAr: "البرامج والتطبيقات",
    nameEn: "Apps & Software",
    link: "/category/design",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
      </svg>
    ),
  },
  {
    id: "windows-keys",
    nameAr: "مفاتيح Windows",
    nameEn: "Windows Keys",
    link: "/category/windows-keys",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
        <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
      </svg>
    ),
  },
  {
    id: "snapchat",
    nameAr: "سناب بلس",
    nameEn: "Snapchat Plus",
    link: "/product/snapchat",
    icon: (
      <span style={{ fontSize: "16px" }}>👻</span>
    ),
  },
  {
    id: "ai",
    nameAr: "الذكاء الاصطناعي",
    nameEn: "AI Tools",
    link: "/category/ai",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    ),
  },
  {
    id: "services",
    nameAr: "الخدمات",
    nameEn: "Services",
    link: "/category/services",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
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
