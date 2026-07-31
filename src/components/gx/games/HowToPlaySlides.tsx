import { useCallback, useRef, useState } from "react";

type Slide = { title: string; text: string; art: React.ReactNode };

const CELL = (x: number, y: number, fill: string, o = 1) => (
  <rect key={`${x}-${y}-${fill}`} x={x} y={y} width="16" height="16" rx="4" fill={fill} opacity={o} />
);

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 120 90" className="htp-art" aria-hidden>
      <rect x="2" y="2" width="116" height="86" rx="12" fill="#1b2246" />
      {children}
    </svg>
  );
}

export const HOWTO_SLIDES: Slide[] = [
  {
    title: "الهدف",
    text: "اسحب القطع إلى اللوح، واملأ صفًا أو عمودًا كاملًا ليختفي وتكسب نقاطًا.",
    art: (
      <Frame>
        {[0, 1, 2, 3, 4].map((i) => CELL(12 + i * 19, 36, "#2f8bef"))}
        {CELL(12 + 5 * 19, 36, "#ffd76e", 0.55)}
        <rect x="8" y="32" width="106" height="24" rx="8" fill="none" stroke="#7bf29a" strokeWidth="2" strokeDasharray="5 4" />
      </Frame>
    ),
  },
  {
    title: "بدون تدوير",
    text: "لا يمكن تدوير القطع، والقطع لا تسقط بعد المسح — تبقى مكانها.",
    art: (
      <Frame>
        {CELL(24, 22, "#22b341")}
        {CELL(42, 22, "#22b341")}
        {CELL(24, 40, "#22b341")}
        {CELL(78, 22, "#ff9a2e", 0.5)}
        {CELL(78, 52, "#ff9a2e", 0.5)}
        <path d="M62 34 h-14 M62 34 l-6 -5 M62 34 l-6 5" stroke="#ff6b6b" strokeWidth="3" fill="none" strokeLinecap="round" />
      </Frame>
    ),
  },
  {
    title: "الوقت",
    text: "لكل حركة وقت محدود يقلّ كلما ارتفعت نقاطك. تنتهي الجولة إذا نفد الوقت أو لم يبقَ مكان لأي قطعة.",
    art: (
      <Frame>
        <rect x="14" y="40" width="92" height="10" rx="5" fill="#2a3157" />
        <rect x="14" y="40" width="46" height="10" rx="5" fill="#ff6b6b" />
        <circle cx="60" cy="22" r="10" fill="none" stroke="#ffd76e" strokeWidth="3" />
        <path d="M60 16 v6 l4 3" stroke="#ffd76e" strokeWidth="3" fill="none" strokeLinecap="round" />
      </Frame>
    ),
  },
  {
    title: "ضاعف نقاطك",
    text: "امسح أكثر من خط بحركة واحدة، أو امسح في حركات متتالية، لتضاعف نقاطك.",
    art: (
      <Frame>
        {[0, 1, 2, 3, 4].map((i) => CELL(12 + i * 19, 24, "#2f8bef"))}
        {[0, 1, 2, 3, 4].map((i) => CELL(12 + i * 19, 48, "#22b341"))}
        <text x="60" y="82" textAnchor="middle" fill="#ffd76e" fontSize="14" fontWeight="700">×3</text>
      </Frame>
    ),
  },
];

export function HowToPlaySlides({ onDone, doneLabel = "تخطي" }: { onDone?: () => void; doneLabel?: string }) {
  const [i, setI] = useState(0);
  const drag = useRef({ x: 0, down: false });
  const go = useCallback((n: number) => setI((c) => Math.min(HOWTO_SLIDES.length - 1, Math.max(0, c + n))), []);

  return (
    <div className="htp">
      <div
        className="htp-view"
        onPointerDown={(e) => { drag.current = { x: e.clientX, down: true }; }}
        onPointerUp={(e) => {
          if (!drag.current.down) return;
          const dx = e.clientX - drag.current.x;
          drag.current.down = false;
          if (Math.abs(dx) > 40) go(dx > 0 ? 1 : -1); // RTL: swipe right => next
        }}
        onPointerLeave={() => { drag.current.down = false; }}
      >
        <div className="htp-track" style={{ transform: `translate3d(${i * 100}%,0,0)` }}>
          {HOWTO_SLIDES.map((s, n) => (
            <div className="htp-slide" key={n}>
              {s.art}
              <h4>{s.title}</h4>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="htp-nav">
        <button type="button" className="htp-arrow" onClick={() => go(1)} disabled={i === HOWTO_SLIDES.length - 1} aria-label="التالي">‹</button>
        <div className="htp-dots" role="tablist">
          {HOWTO_SLIDES.map((_, n) => (
            <button
              key={n}
              type="button"
              className={"htp-dot" + (n === i ? " on" : "")}
              aria-label={`شريحة ${n + 1}`}
              aria-selected={n === i}
              role="tab"
              onClick={() => setI(n)}
            />
          ))}
        </div>
        <button type="button" className="htp-arrow" onClick={() => go(-1)} disabled={i === 0} aria-label="السابق">›</button>
      </div>

      {onDone && (
        <button type="button" className="htp-skip" onClick={onDone}>{doneLabel}</button>
      )}
    </div>
  );
}
