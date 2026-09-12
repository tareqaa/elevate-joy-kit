import React, { useState, useRef, useEffect } from "react";

export interface SubtypeOption {
  id: string;
  labelAr: string;
  labelEn: string;
  shortLabelAr: string;
  shortLabelEn: string;
  icon: string;
}

export interface CatSubtypeDropdownProps {
  options: SubtypeOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  lang?: string;
  titleAr?: string;
  titleEn?: string;
}

export function CatSubtypeDropdown({
  options,
  selectedId,
  onSelect,
  lang = "ar",
  titleAr = "التصنيف",
  titleEn = "Filter",
}: CatSubtypeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeOption = options.find((o) => o.id === selectedId) || options[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const isCustomActive = selectedId !== "all";
  const displayLabel =
    selectedId === "all"
      ? (lang === "en" ? titleEn : titleAr)
      : (lang === "en" ? activeOption.shortLabelEn : activeOption.shortLabelAr);

  return (
    <div className="cat-custom-sort" ref={dropdownRef}>
      <button
        type="button"
        className={`cat-sort-trigger ${isOpen ? "is-open" : ""} ${isCustomActive ? "has-filter" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        title={lang === "en" ? titleEn : titleAr}
      >
        <span className="sort-chevron">{isOpen ? "^" : "⌄"}</span>
        <span className="sort-label">{displayLabel}</span>
        <span style={{ fontSize: 13 }}>{activeOption.icon || "🏷️"}</span>
      </button>

      {isOpen && (
        <div className="cat-sort-menu fade-in">
          <div className="cat-sort-arrow"></div>
          {options.map((opt) => {
            const isSelected = selectedId === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                className={`cat-sort-item ${isSelected ? "selected" : ""}`}
                onClick={() => {
                  onSelect(opt.id);
                  setIsOpen(false);
                }}
              >
                <span className="opt-check">{isSelected ? "✓" : ""}</span>
                <span className="opt-label">
                  <span style={{ marginInlineEnd: 8 }}>{opt.icon}</span>
                  {lang === "en" ? opt.labelEn : opt.labelAr}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
