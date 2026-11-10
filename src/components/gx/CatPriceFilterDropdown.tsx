import React, { useState, useRef, useEffect, useMemo } from "react";
import { useCurrency } from "@/lib/gx/currency";

export interface PricePreset {
  id: string;
  labelAr: string;
  labelEn: string;
  min?: number;
  max?: number;
}

const CURRENCY_TIERS: Record<string, [number, number, number]> = {
  JOD: [5, 15, 30],
  SAR: [25, 75, 150],
  AED: [25, 75, 150],
  QAR: [25, 75, 150],
  USD: [10, 25, 50],
  EUR: [10, 25, 50],
  KWD: [2, 5, 10],
  BHD: [2, 5, 10],
  OMR: [2, 5, 10],
  EGP: [250, 750, 1500],
  IQD: [10000, 25000, 50000],
  MAD: [50, 150, 300],
  DZD: [1000, 2500, 5000],
  TND: [20, 50, 100],
  PS: [25, 60, 120],
  ILS: [25, 60, 120],
};

export const AR_CURRENCY_SYMBOL: Record<string, string> = {
  JOD: "د.أ",
  SAR: "ر.س",
  AED: "د.إ",
  USD: "$",
  EUR: "€",
  KWD: "د.ك",
  QAR: "ر.ق",
  OMR: "ر.ع",
  BHD: "د.ب",
  EGP: "ج.م",
  IQD: "د.ع",
  MAD: "د.م",
  DZD: "د.ج",
  TND: "د.ت",
  PS: "شيكل",
  ILS: "شيكل",
};

export function getPricePresetsForCurrency(currency: string = "JOD", rate: number = 1): PricePreset[] {
  const code = (currency || "JOD").toUpperCase().trim();
  const tiers = CURRENCY_TIERS[code] || [
    Math.round(5 * (rate || 1)),
    Math.round(15 * (rate || 1)),
    Math.round(30 * (rate || 1)),
  ];
  const [t1, t2, t3] = tiers;
  const symAr = AR_CURRENCY_SYMBOL[code] || code;

  return [
    { id: "all", labelAr: "كل الأسعار", labelEn: "All Prices" },
    {
      id: "tier-1",
      max: t1,
      labelAr: `أقل من ${t1.toLocaleString("en-US")} ${symAr}`,
      labelEn: `Under ${t1.toLocaleString("en-US")} ${code}`,
    },
    {
      id: "tier-2",
      min: t1,
      max: t2,
      labelAr: `من ${t1.toLocaleString("en-US")} إلى ${t2.toLocaleString("en-US")} ${symAr}`,
      labelEn: `${t1.toLocaleString("en-US")} – ${t2.toLocaleString("en-US")} ${code}`,
    },
    {
      id: "tier-3",
      min: t2,
      max: t3,
      labelAr: `من ${t2.toLocaleString("en-US")} إلى ${t3.toLocaleString("en-US")} ${symAr}`,
      labelEn: `${t2.toLocaleString("en-US")} – ${t3.toLocaleString("en-US")} ${code}`,
    },
    {
      id: "tier-4",
      min: t3,
      labelAr: `أكثر من ${t3.toLocaleString("en-US")} ${symAr}`,
      labelEn: `Over ${t3.toLocaleString("en-US")} ${code}`,
    },
  ];
}

// Fallback constant for backwards compatibility
export const PRICE_PRESETS: PricePreset[] = getPricePresetsForCurrency("JOD", 1);

export function getPresetLabel(
  preset: PricePreset,
  _format?: (amountJod: number) => string,
  lang: string = "ar"
): string {
  if (preset.id === "all") return lang === "en" ? "All Prices" : "كل الأسعار";
  return lang === "en" ? preset.labelEn : preset.labelAr;
}

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
  const { currency, rate } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMin, setInputMin] = useState(customMin);
  const [inputMax, setInputMax] = useState(customMax);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const presets = useMemo(() => getPricePresetsForCurrency(currency, rate), [currency, rate]);

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

  const activePreset = presets.find((p) => p.id === selectedPreset);
  const isFilterActive = (selectedPreset !== "all" && selectedPreset !== "") || Boolean(customMin || customMax);

  const isAr = lang === "ar";
  const symAr = AR_CURRENCY_SYMBOL[currency] || currency;
  let displayLabel = isAr ? "السعر: الكل" : "Price: All";
  if (customMin || customMax) {
    if (customMin && customMax) {
      displayLabel = `${customMin} – ${customMax} ${isAr ? symAr : currency}`;
    } else if (customMin) {
      displayLabel = isAr ? `أكثر من ${customMin} ${symAr}` : `Over ${customMin} ${currency}`;
    } else if (customMax) {
      displayLabel = isAr ? `أقل من ${customMax} ${symAr}` : `Under ${customMax} ${currency}`;
    }
  } else if (activePreset && activePreset.id !== "all") {
    displayLabel = isAr ? activePreset.labelAr : activePreset.labelEn;
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
          {presets.map((p) => {
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
                step="any"
                placeholder={lang === "en" ? `Min (${currency})` : `من (${currency})`}
                value={inputMin}
                onChange={(e) => setInputMin(e.target.value)}
                className="cat-price-input"
              />
              <span className="cat-price-dash">—</span>
              <input
                type="number"
                min="0"
                step="any"
                placeholder={lang === "en" ? `Max (${currency})` : `إلى (${currency})`}
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
