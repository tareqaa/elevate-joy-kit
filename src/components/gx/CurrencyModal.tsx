import { useState, useEffect } from "react";
import { CURRENCIES, useCurrency } from "@/lib/gx/currency";

export function CurrencyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { currency, setCurrency } = useCurrency();
  const [value, setValue] = useState(currency);
  useEffect(() => { if (open) setValue(currency); }, [open, currency]);

  return (
    <div
      className={"currency-modal-overlay" + (open ? " open" : "")}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="currency-modal">
        <div className="cm-head">
          <h3>العملة</h3>
          <div className="cm-close" onClick={onClose}>✕</div>
        </div>
        <p className="cm-sub">اختار العملة اللي بتفضل تشوف الأسعار فيها بكل الموقع.</p>
        <div className="cm-select-wrap">
          <select value={value} onChange={(e) => setValue(e.target.value)}>
            {Object.entries(CURRENCIES).map(([code, info]) => (
              <option key={code} value={code}>{info.flag} {code} — {info.label}</option>
            ))}
          </select>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M6 9l6 6 6-6" /></svg>
        </div>
        <button className="btn btn-primary btn-block" onClick={() => { setCurrency(value); onClose(); }}>موافق</button>
      </div>
    </div>
  );
}
