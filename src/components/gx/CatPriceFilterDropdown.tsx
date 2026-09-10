import React, { useState, useRef, useEffect } from "react";

export interface PricePreset {
  id: string;
  labelAr: string;
  labelEn: string;
  min?: number;
  max?: number;
}

export const PRICE_PRESETS: PricePreset[] = [
  { id: "all", labelAr: "كل الأسعار", labelEn: "All Prices" },
  { id: "under-5", labelAr: "أقل من 5 JOD", labelEn: "Under 5 JOD", max: 5 },
  { id: "5-15", labelAr: "من 5 إلى 15 JOD", labelEn: "5 – 15 JOD", min: 5, max: 15 },
  { id: "15-30", labelAr: "من 15 إلى 30 JOD", labelEn: "15 – 30 JOD", min: 15, max: 30 },
  { id: "over-30", labelAr: "أكثر من 30 JOD", labelEn: "Over 30 JOD", min: 30 },
];

export interface CatPriceFilterDropdownProps {
  selectedPreset: string;
  customMin?: string;
  customMax?: string;
  onSelectPreset: (presetId: string) => void;
  onApplyCustom: (min: string, max: string) => void;
  lang?: string;
}

export function CatPriceFilterDropdown({
  selectedPreset,
  customMin = "",
  customMax = "",
  onSelectPreset,
  onApplyCustom,
  lang = "ar",
}: CatPriceFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMin, setInputMin] = useState(customMin);
  const [inputMax, setInputMax] = useState(customMax);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputMin(customMin);
    setInputMax(customMax);
  }, [customMin, customMax]);

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

  const activePreset = PRICE_PRESETS.find((p) => p.id === selectedPreset);

  const isFilterActive = selectedPreset !== "all" || Boolean(customMin || customMax);

  let displayLabel = lang === "en" ? "Price: All" : "السعر: الكل";
  if (selectedPreset === "custom" && (customMin || customMax)) {
    if (customMin && customMax) displayLabel = `${customMin} – ${customMax} JOD`;
    else if (customMin) displayLabel = `≥ ${customMin} JOD`;
    else if (customMax) displayLabel = `≤ ${customMax} JOD`;
  } else if (activePreset && activePreset.id !== "all") {
    displayLabel = lang === "en" ? activePreset.labelEn : activePreset.labelAr;
  }

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApplyCustom(inputMin.trim(), inputMax.trim());
    setIsOpen(false);
  };

  return (
    <div className="cat-custom-sort" ref={dropdownRef}>
      <button
        type="button"
        className={`cat-sort-trigger ${isOpen ? "is-open" : ""} ${isFilterActive ? "has-filter" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        title={lang === "en" ? "Filter by price range" : "فلترة حسب نطاق السعر"}
      >
        <span className="sort-chevron">{isOpen ? "^" : "⌄"}</span>
        <span className="sort-label">{displayLabel}</span>
        <svg
          className="sort-icon"
          viewBox="0 0 24 24"
          width="17"
          height="17"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      </button>

      {isOpen && (
        <div className="cat-sort-menu cat-price-menu fade-in">
          <div className="cat-sort-arrow"></div>

          {/* Quick Presets */}
          {PRICE_PRESETS.map((p) => {
            const isSelected = selectedPreset === p.id && !customMin && !customMax;
            return (
              <button
                key={p.id}
                type="button"
                className={`cat-sort-item ${isSelected ? "selected" : ""}`}
                onClick={() => {
                  onSelectPreset(p.id);
                  setIsOpen(false);
                }}
              >
                <span className="opt-check">{isSelected ? "✓" : ""}</span>
                <span className="opt-label">
                  {lang === "en" ? p.labelEn : p.labelAr}
                </span>
              </button>
            );
          })}

          {/* Custom Range Divider & Inputs */}
          <div className="cat-price-custom-divider">
            <span>{lang === "en" ? "Or custom range:" : "أو حدد نطاق مخصص:"}</span>
          </div>

          <form onSubmit={handleCustomSubmit} className="cat-price-custom-form">
            <div className="cat-price-inputs-row">
              <input
                type="number"
                min="0"
                step="0.5"
                placeholder={lang === "en" ? "Min JOD" : "من (أدنى)"}
                value={inputMin}
                onChange={(e) => setInputMin(e.target.value)}
                className="cat-price-input"
              />
              <span className="cat-price-dash">—</span>
              <input
                type="number"
                min="0"
                step="0.5"
                placeholder={lang === "en" ? "Max JOD" : "إلى (أعلى)"}
                value={inputMax}
                onChange={(e) => setInputMax(e.target.value)}
                className="cat-price-input"
              />
            </div>

            <button type="submit" className="cat-price-apply-btn">
              {lang === "en" ? "Apply Range" : "تطبيق النطاق"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
