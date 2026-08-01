/**
 * RankBadge — game-style crest: shield + faceted star (+ optional wings and banner tail).
 * Pure inline SVG (no emoji) so the badge renders identically on every device.
 */

function clamp(n: number) { return Math.max(0, Math.min(255, Math.round(n))); }

function parseHex(hex: string): [number, number, number] {
  let h = (hex || "#4aa8ff").trim().replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6) || "4aa8ff", 16);
  if (Number.isNaN(n)) return [74, 168, 255];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(hex: string, target: [number, number, number], amount: number) {
  const [r, g, b] = parseHex(hex);
  const f = (a: number, t: number) => clamp(a + (t - a) * amount);
  return `rgb(${f(r, target[0])},${f(g, target[1])},${f(b, target[2])})`;
}

const lighten = (hex: string, a: number) => mix(hex, [255, 255, 255], a);
const darken = (hex: string, a: number) => mix(hex, [0, 0, 0], a);

export type RankBadgeProps = {
  /** Base colour of the shield (level colour, or medal colour for top ranks). */
  color?: string;
  /** Accent colour for the frame, star and wings (defaults to a gold/silver derived from color). */
  accent?: string;
  /** Optional short text shown on the banner tail: level tier, rank number… */
  label?: string | number;
  size?: number;
  /** Show the side wings (higher tiers). */
  wings?: boolean;
  /** Show the banner tail under the shield. */
  banner?: boolean;
  /** Adds a soft outer glow in the badge colour. */
  glow?: boolean;
  title?: string;
  className?: string;
};

/** Medal colours for the podium, so ranks 1-3 read instantly. */
export const RANK_COLORS: Record<number, string> = {
  1: "#ffc53d",
  2: "#d9e2ee",
  3: "#ff7a45",
};

let seq = 0;

export function RankBadge({
  color = "#4aa8ff",
  accent,
  label,
  size = 34,
  wings = true,
  banner,
  glow = false,
  title,
  className,
}: RankBadgeProps) {
  const uid = `rb${(seq = (seq + 1) % 100000)}`;
  const text = String(label ?? "");
  const showBanner = banner ?? text.length > 0;

  const face = darken(color, 0.18);
  const faceDeep = darken(color, 0.58);
  const acc = accent || lighten(color, 0.72);
  const accHi = lighten(acc, 0.55);
  const accDeep = darken(acc, 0.42);

  // viewBox: 64 wide, 62 tall (shield 8..46, banner to 58)
  return (
    <svg
      className={className}
      width={size}
      height={size * (showBanner ? 0.97 : 0.8)}
      viewBox={showBanner ? "0 0 64 62" : "0 0 64 51"}
      role="img"
      aria-label={title || (text ? `rank ${text}` : "rank")}
      style={{
        display: "block",
        overflow: "visible",
        filter: glow ? `drop-shadow(0 0 7px ${mix(acc, [255, 255, 255], 0.1)}80)` : undefined,
      }}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={`${uid}f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lighten(color, 0.18)} />
          <stop offset="55%" stopColor={face} />
          <stop offset="100%" stopColor={faceDeep} />
        </linearGradient>
        <linearGradient id={`${uid}a`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor={accHi} />
          <stop offset="50%" stopColor={acc} />
          <stop offset="100%" stopColor={accDeep} />
        </linearGradient>
        <linearGradient id={`${uid}s1`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={accHi} />
          <stop offset="100%" stopColor={acc} />
        </linearGradient>
        <linearGradient id={`${uid}s2`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={acc} />
          <stop offset="100%" stopColor={accDeep} />
        </linearGradient>
        <linearGradient id={`${uid}g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* wings */}
      {wings ? (
        <g fill={`url(#${uid}a)`} stroke={accDeep} strokeWidth="0.7" strokeLinejoin="round">
          <path d="M16 17 C9 15 4 16 1 19 C6 19 9 20 11 22 C7 21 4 22 2 24 C6 24 9 25 11 27 C8 27 6 28 5 30 C9 30 13 31 16 33 Z" />
          <path d="M48 17 C55 15 60 16 63 19 C58 19 55 20 53 22 C57 21 60 22 62 24 C58 24 55 25 53 27 C56 27 58 28 59 30 C55 30 51 31 48 33 Z" />
        </g>
      ) : null}

      {/* banner tail */}
      {showBanner ? (
        <g>
          <path d="M23 38 H41 V54 L32 60 L23 54 Z" fill={`url(#${uid}a)`} stroke={accDeep} strokeWidth="1.2" strokeLinejoin="round" />
          {text ? (
            <text
              x="32" y="49" textAnchor="middle" dominantBaseline="middle"
              fontSize={text.length >= 3 ? 9 : text.length === 2 ? 11 : 13}
              fontWeight="800" fill={darken(acc, 0.62)}
              style={{ letterSpacing: "0.2px" }}
            >
              {text}
            </text>
          ) : null}
        </g>
      ) : null}

      {/* shield frame */}
      <path
        d="M32 1 L36 5 H52 C52 5 50 8 50 12 V28 C50 38 41 44 32 47 C23 44 14 38 14 28 V12 C14 8 12 5 12 5 H28 Z"
        fill={`url(#${uid}a)`}
        stroke={accDeep}
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      {/* shield face */}
      <path
        d="M32 6 L34.5 8.5 H47 C46.5 10 46.6 11 46.6 12.6 V27.8 C46.6 35.8 39.4 40.6 32 43.2 C24.6 40.6 17.4 35.8 17.4 27.8 V12.6 C17.4 11 17.5 10 17 8.5 H29.5 Z"
        fill={`url(#${uid}f)`}
        stroke={accDeep}
        strokeOpacity="0.5"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      {/* gloss */}
      <path d="M32 6 L34.5 8.5 H47 C46.5 10 46.6 11 46.6 12.6 V22 C41 25 23 25 17.4 22 V12.6 C17.4 11 17.5 10 17 8.5 H29.5 Z" fill={`url(#${uid}g)`} />

      {/* faceted star */}
      <g transform="translate(32 24) scale(1.02)">
        <path d="M0 -12 L3.6 -3.9 L11.6 -3.9 L5 1 L7.2 9.7 L0 4.6 L-7.2 9.7 L-5 1 L-11.6 -3.9 L-3.6 -3.9 Z" fill={`url(#${uid}s1)`} stroke={accDeep} strokeWidth="0.7" strokeLinejoin="round" />
        <path d="M0 -12 L0 4.6 L7.2 9.7 L5 1 L11.6 -3.9 L3.6 -3.9 Z" fill={`url(#${uid}s2)`} opacity="0.9" />
      </g>
    </svg>
  );
}

export default RankBadge;
