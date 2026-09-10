import React, { useState, useRef, useEffect } from "react";

export interface DeliveryTypeOption {
  id: string; // "all" | "code" | "account" | "link" | "topup"
  labelAr: string;
  labelEn: string;
  shortLabelAr: string;
  shortLabelEn: string;
  icon: string;
}

export const DELIVERY_TYPE_OPTIONS: DeliveryTypeOption[] = [
  {
    id: "all",
    labelAr: "كل أنواع المنتجات",
    labelEn: "All Types",
    shortLabelAr: "كل الأنواع",
    shortLabelEn: "All Types",
    icon: "📦",
  },
  {
    id: "code",
    labelAr: "مفتاح / كود تفعيل (Key)",
    labelEn: "Digital Key (Key)",
    shortLabelAr: "مفتاح (Key)",
    shortLabelEn: "Key",
    icon: "🔑",
  },
  {
    id: "account",
    labelAr: "حساب جاهز (Account)",
    labelEn: "Ready Account",
    shortLabelAr: "حساب (Account)",
    shortLabelEn: "Account",
    icon: "👤",
  },
  {
    id: "link",
    labelAr: "رابط تفعيل (Activation Link)",
    labelEn: "Activation Link",
    shortLabelAr: "رابط تفعيل",
    shortLabelEn: "Link",
    icon: "🔗",
  },
  {
    id: "topup",
    labelAr: "شحن مباشر (Top Up)",
    labelEn: "Direct Top-Up",
    shortLabelAr: "شحن مباشر",
    shortLabelEn: "Top Up",
    icon: "⚡",
  },
];

export interface CatDeliveryTypeDropdownProps {
  selectedType: string;
  onTypeChange: (newType: string) => void;
  lang?: string;
}

export function CatDeliveryTypeDropdown({
  selectedType,
  onTypeChange,
  lang = "ar",
}: CatDeliveryTypeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeOption =
    DELIVERY_TYPE_OPTIONS.find((o) => o.id === selectedType) || DELIVERY_TYPE_OPTIONS[0];

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

  const isCustomActive = selectedType !== "all";
  const displayLabel =
    selectedType === "all"
      ? lang === "en"
        ? "Product Type: All"
        : "نوع المنتج: الكل"
      : lang === "en"
        ? activeOption.shortLabelEn
        : activeOption.shortLabelAr;

  return (
    <div className="cat-custom-sort" ref={dropdownRef}>
      <button
        type="button"
        className={`cat-sort-trigger ${isOpen ? "is-open" : ""} ${isCustomActive ? "has-filter" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        title={lang === "en" ? "Filter by product delivery type" : "فلترة حسب نوع المنتج والتفعيل"}
      >
        <span className="sort-chevron">{isOpen ? "^" : "⌄"}</span>
        <span className="sort-label">
          {displayLabel}
        </span>
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
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      </button>

      {isOpen && (
        <div className="cat-sort-menu fade-in">
          <div className="cat-sort-arrow"></div>
          {DELIVERY_TYPE_OPTIONS.map((opt) => {
            const isSelected = selectedType === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                className={`cat-sort-item ${isSelected ? "selected" : ""}`}
                onClick={() => {
                  onTypeChange(opt.id);
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
