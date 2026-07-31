import { useCallback, useEffect, useRef, useState } from "react";

type Slide = { title: string; text: string; art: React.ReactNode };

const CELL = (x: number, y: number, fill: string, o = 1, cls = "") => (
  <rect key={`${x}-${y}-${fill}-${cls}`} className={cls} x={x} y={y} width="16" height="16" rx="4" fill={fill} opacity={o} />
);

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 120 90" className="htp-art" aria-hidden>
      <rect x="2" y="2" width="116" height="86" rx="12" fill="#1b2246" />
      <g opacity=".22" stroke="#7f8ac9" strokeWidth=".6">
        {[22, 40, 58, 76].map((y) => <line key={y} x1="8" y1={y} x2="112" y2={y} />)}
      </g>
      {children}
    </svg>
  );
}

export const HOWTO_SLIDES: Slide[] = [
  {
    title: "١ · اسحب القطعة",
    text: "امسك أي قطعة من الصينية بالأسفل واسحبها بإصبعك إلى اللوح 8×8.",
    art: (
      <Frame>
        {CELL(20, 56, "#22b341")}
        {CELL(38, 56, "#22b341")}
        {CELL(56, 56, "#22b341")}
        <g className="htp-drag">
          {CELL(20, 22, "#2fc4f0")}
          {CELL(38, 22, "#2fc4f0")}
          {CELL(56, 22, "#2fc4f0")}
        </g>
        <path className="htp-hand" d="M84 30 l0 16" stroke="#ffd76e" strokeWidth="3" strokeLinecap="round" />
      </Frame>
    ),
  },
  {
    title: "٢ · اكمل الصف",
    text: "املأ صفًا أو عمودًا كاملًا (٨ خانات) ليختفي فورًا وتكسب نقاطًا.",
    art: (
      <Frame>
        {[0, 1, 2, 3, 4, 5].map((i) => CELL(10 + i * 17, 38, "#2f6bef", 1, "htp-row"))}
        {CELL(112 - 15, 38, "#ffd76e", 0.85, "htp-fit")}
        <rect className="htp-flash" x="6" y="34" width="108" height="24" rx="8" fill="#ffffff" opacity="0" />
      </Frame>
    ),
  },
  {
    title: "٣ · لا تدوير",
    text: "لا يمكنك تدوير القطع، ولا تسقط القطع بعد المسح — كل قطعة تبقى مكانها.",
    art: (
      <Frame>
        {CELL(26, 26, "#9a55dd")}
        {CELL(44, 26, "#9a55dd")}
        {CELL(26, 44, "#9a55dd")}
        <g className="htp-no">
          <circle cx="82" cy="42" r="16" fill="none" stroke="#ff6b6b" strokeWidth="3" />
          <line x1="71" y1="53" x2="93" y2="31" stroke="#ff6b6b" strokeWidth="3" strokeLinecap="round" />
        </g>
      </Frame>
    ),
  },
  {
    title: "٤ · انتبه للوقت",
    text: "لكل حركة مؤقّت يقصر كلما ارتفع سكورك. تنتهي الجولة إذا نفد الوقت أو لم يعد هناك مكان لأي قطعة.",
    art: (
      <Frame>
        <rect x="14" y="44" width="92" height="10" rx="5" fill="#2a3157" />
        <rect className="htp-bar" x="14" y="44" width="92" height="10" rx="5" fill="#ff6b6b" />
        <circle cx="60" cy="24" r="11" fill="none" stroke="#ffd76e" strokeWidth="3" />
        <path className="htp-tick" d="M60 24 v-7" stroke="#ffd76e" strokeWidth="3" strokeLinecap="round" />
      </Frame>
    ),
  },
  {
    title: "٥ · ضاعف نقاطك",
    text: "امسح أكثر من خط بحركة واحدة، أو امسح في حركات متتالية، لتحصل على مضاعِف ونقاط أعلى بكثير.",
    art: (
      <Frame>
        {[0, 1, 2, 3, 4, 5].map((i) => CELL(10 + i * 17, 24, "#2f6bef"))}
        {[0, 1, 2, 3, 4, 5].map((i) => CELL(10 + i * 17, 48, "#22b341"))}
        <text className="htp-x" x="60" y="82" textAnchor="middle" fill="#ffd76e" fontSize="15" fontWeight="700">×3</text>
      </Frame>
    ),
  },
];

export function HowToPlaySlides({ onDone, doneLabel = "تخطي" }: { onDone?: () => void; doneLabel?: string }) {
  const [i, setI] = useState(0);
  const drag = useRef({ x: 0, down: false });
  const go = useCallback(
    (n: number) => setI((c) => (c + n + HOWTO_SLIDES.length) % HOWTO_SLIDES.length),
    [],
  );

  // gentle autoplay so the explanation feels alive; pauses on interaction
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto) return;
    const id = window.setInterval(() => setI((c) => (c + 1) % HOWTO_SLIDES.length), 5200);
    return () => window.clearInterval(id);
  }, [auto]);

  const stop = () => setAuto(false);

  return (
    <div className="htp">
      <div
        className="htp-view"
        onPointerDown={(e) => { stop(); drag.current = { x: e.clientX, down: true }; }}
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
            <div className={"htp-slide" + (n === i ? " on" : "")} key={n} aria-hidden={n !== i}>
              <div className="htp-stage">{s.art}</div>
              <h4>{s.title}</h4>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="htp-nav">
        <button type="button" className="htp-arrow" onClick={() => { stop(); go(1); }} aria-label="التالي">‹</button>
        <div className="htp-dots" role="tablist">
          {HOWTO_SLIDES.map((_, n) => (
            <button
              key={n}
              type="button"
              className={"htp-dot" + (n === i ? " on" : "")}
              aria-label={`شريحة ${n + 1}`}
              aria-selected={n === i}
              role="tab"
              onClick={() => { stop(); setI(n); }}
            />
          ))}
        </div>
        <button type="button" className="htp-arrow" onClick={() => { stop(); go(-1); }} aria-label="السابق">›</button>
      </div>

      {onDone && (
        <button type="button" className="htp-skip" onClick={onDone}>{doneLabel}</button>
      )}
    </div>
  );
}
