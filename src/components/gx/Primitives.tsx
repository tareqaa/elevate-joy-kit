import { useState, type ReactNode } from "react";

export function FeatureAccordion({ features }: { features: { icon: string; title: string; desc: string }[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <div className="features-grid">
      {features.map((f, i) => (
        <div key={i} className={"feature-card" + (openIdx === i ? " open" : "")}>
          <div className="fhead" onClick={() => setOpenIdx(openIdx === i ? null : i)}>
            <div className="fleft">
              <div className="ficon">{f.icon}</div>
              <div className="ftitle">{f.title}</div>
            </div>
            <div className="chev">⌄</div>
          </div>
          <div className="fbody">
            <div className="fbody-inner"><p>{f.desc}</p></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SectionHead({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  return (
    <div className="section-head">
      <div>
        {eyebrow && <span className="k">{eyebrow}</span>}
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
    </div>
  );
}

export function DeliveryBox({ method, identifierLabel, children }: { method?: string; identifierLabel?: string; children?: ReactNode }) {
  return (
    <div className="delivery-box fade-in">
      <div className="dic">🔒</div>
      <div>
        <h3>كيف توصلك الباقة؟</h3>
        {method && <p>{method}</p>}
        {identifierLabel ? (
          <div className="identifier-note">📌 كل ما نحتاجه منك هو <strong>{identifierLabel}</strong> — بدون أي باسورد.</div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
