import { useState, type ReactNode } from "react";

export function FeatureAccordion({ features }: { features: { icon: string; title: string; desc: string }[] }) {
  const [openMap, setOpenMap] = useState<Record<number, boolean>>({});

  const toggle = (i: number) => {
    setOpenMap((prev) => ({ ...prev, [i]: !prev[i] }));
  };

  if (!features || features.length === 0) return null;

  // Split into 2 columns for clean masonry layout without row stretching
  const col1 = features.map((f, i) => ({ f, i })).filter((_, idx) => idx % 2 === 0);
  const col2 = features.map((f, i) => ({ f, i })).filter((_, idx) => idx % 2 === 1);

  const renderCard = ({ f, i }: { f: { icon: string; title: string; desc: string }; i: number }) => {
    const isOpen = Boolean(openMap[i]);
    return (
      <div key={i} className={"feature-card" + (isOpen ? " open" : "")}>
        <div className="fhead" onClick={() => toggle(i)}>
          <div className="fleft">
            <div className="ficon">{f.icon}</div>
            <div className="ftitle">{f.title}</div>
          </div>
          <div className="chev">⌄</div>
        </div>
        <div className="fbody">
          <div className="fbody-inner">
            <p>{f.desc}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="features-grid">
      <div className="features-col">
        {col1.map(renderCard)}
      </div>
      {col2.length > 0 && (
        <div className="features-col">
          {col2.map(renderCard)}
        </div>
      )}
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
