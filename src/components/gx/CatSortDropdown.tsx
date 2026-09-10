import React, { useState, useRef, useEffect } from "react";

export interface SortOption {
  id: string;
  labelAr: string;
  labelEn: string;
}

export const SORT_OPTIONS: SortOption[] = [
  { id: "price_asc", labelAr: "السعر: من الأدنى إلى الأعلى", labelEn: "Price: Low to High" },
  { id: "price_desc", labelAr: "السعر: من الأعلى إلى الأدنى", labelEn: "Price: High to Low" },
  { id: "date_desc", labelAr: "التاريخ: الأحدث أولاً", labelEn: "Date: Newest First" },
  { id: "date_asc", labelAr: "التاريخ: الأقدم أولاً", labelEn: "Date: Oldest First" },
  { id: "popular", labelAr: "الشعبية: الأكثر شعبية", labelEn: "Popularity: Most Popular" },
  { id: "alpha_asc", labelAr: "الحروف الأبجدية: أ-ي", labelEn: "Alphabetical: A to Z" },
  { id: "alpha_desc", labelAr: "الحروف الأبجدية: ي-أ", labelEn: "Alphabetical: Z to A" },
];

export interface CatSortDropdownProps {
  sortBy: string;
  onSortChange: (newSort: string) => void;
  lang?: string;
}

export function CatSortDropdown({ sortBy, onSortChange, lang = "ar" }: CatSortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  const activeSort = SORT_OPTIONS.find((s) => s.id === sortBy) || SORT_OPTIONS[4];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const getLabel = (opt: SortOption) => (lang === "en" ? opt.labelEn : opt.labelAr);

  return (
    <div className="cat-custom-sort" ref={sortRef}>
      <button
        type="button"
        className={`cat-sort-trigger ${isOpen ? "is-open" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label={getLabel(activeSort)}
      >
        <span className="sort-chevron">{isOpen ? "^" : "⌄"}</span>
        <span className="sort-label">{getLabel(activeSort)}</span>
        <svg
          className="sort-icon"
          viewBox="0 0 24 24"
          width="17"
          height="17"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m3 16 4 4 4-4" />
          <path d="M7 20V4" />
          <path d="M11 4h10" />
          <path d="M11 8h7" />
          <path d="M11 12h4" />
        </svg>
      </button>

      {isOpen && (
        <div className="cat-sort-menu fade-in">
          <div className="cat-sort-arrow"></div>
          {SORT_OPTIONS.map((opt) => {
            const isSelected = sortBy === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                className={`cat-sort-item ${isSelected ? "selected" : ""}`}
                onClick={() => {
                  onSortChange(opt.id);
                  setIsOpen(false);
                }}
              >
                <span className="opt-check">{isSelected ? "✓" : ""}</span>
                <span className="opt-label">{getLabel(opt)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
