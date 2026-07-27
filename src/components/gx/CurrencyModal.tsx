import { useState, useEffect } from "react";
import { CURRENCIES, useCurrency } from "@/lib/gx/currency";
import { useLang, type Lang } from "@/lib/gx/i18n";

export function CurrencyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { currency, setCurrency } = useCurrency();
  const { lang, setLang, t } = useLang();
  const [value, setValue] = useState(currency);
  const [langValue, setLangValue] = useState<Lang>(lang);
  useEffect(() => { if (open) { setValue(currency); setLangValue(lang); } }, [open, currency, lang]);

  return (
    <div
      className={"currency-modal-overlay" + (open ? " open" : "")}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="currency-modal">
        <div className="cm-head">
          <h3>{t("common.language")} / {t("common.currency")}</h3>
          <div className="cm-close" onClick={onClose}>✕</div>
        </div>
        <p className="cm-sub">{t("common.pick_language_desc")}</p>
        <div className="cm-select-wrap">
          <select value={langValue} onChange={(e) => setLangValue(e.target.value as Lang)}>
            <option value="ar">{t("common.arabic")} — AR</option>
            <option value="en">{t("common.english")} — EN</option>
          </select>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M6 9l6 6 6-6" /></svg>
        </div>
        <p className="cm-sub" style={{ marginTop: 6 }}>{t("common.pick_currency_desc")}</p>
        <div className="cm-select-wrap">
          <select value={value} onChange={(e) => setValue(e.target.value)}>
            {Object.entries(CURRENCIES).map(([code, info]) => (
              <option key={code} value={code}>{code} — {info.label}</option>
            ))}
          </select>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M6 9l6 6 6-6" /></svg>
        </div>
        <button className="btn btn-primary btn-block" onClick={() => { setCurrency(value); setLang(langValue); onClose(); }}>{t("common.ok")}</button>
      </div>
    </div>
  );
}
