/**
 * RankBadge — winged hexagon shield used everywhere a rank / level is shown.
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
  /** Short text inside the shield: level tier, rank number, initials… */
  label?: string | number;
  size?: number;
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

export function RankBadge({ color = "#4aa8ff", label, size = 34, glow = false, title, className }: RankBadgeProps) {
  const uid = `rb${String(color).replace(/[^a-z0-9]/gi, "")}${size}${String(label ?? "")}`.slice(0, 40);
  const light = lighten(color, 0.55);
  const mid = lighten(color, 0.12);
  const deep = darken(color, 0.4);
  const wing = lighten(color, 0.3);
  const wingDeep = darken(color, 0.2);
  const text = String(label ?? "");
  const fs = text.length >= 3 ? 8.5 : text.length === 2 ? 11 : 13;

  return (
    <svg
      className={className}
      width={size}
      height={size * 0.72}
      viewBox="0 0 64 46"
      role="img"
      aria-label={title || `rank ${text}`}
      style={{ display: "block", overflow: "visible", filter: glow ? `drop-shadow(0 0 8px ${mix(color, [255, 255, 255], 0.1)}66)` : undefined }}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={`${uid}f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={light} />
          <stop offset="45%" stopColor={mid} />
          <stop offset="100%" stopColor={deep} />
        </linearGradient>
        <linearGradient id={`${uid}w`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={wing} />
          <stop offset="100%" stopColor={wingDeep} />
        </linearGradient>
        <linearGradient id={`${uid}g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#fff" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* wings */}
      <g fill={`url(#${uid}w)`} stroke={deep} strokeWidth="0.6" strokeLinejoin="round">
        <path d="M20 16 L3 12 L9 20 L2 21 L10 27 L5 30 L20 31 Z" />
        <path d="M44 16 L61 12 L55 20 L62 21 L54 27 L59 30 L44 31 Z" />
      </g>

      {/* shield */}
      <path
        d="M32 2 L52 10 V28 L32 44 L12 28 V10 Z"
        fill={`url(#${uid}f)`}
        stroke={deep}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M32 6.5 L48 12.9 V26.4 L32 39.2 L16 26.4 V12.9 Z"
        fill="none"
        stroke={lighten(color, 0.8)}
        strokeOpacity="0.55"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      {/* gloss */}
      <path d="M32 6.5 L48 12.9 V20 L32 25 L16 20 V12.9 Z" fill={`url(#${uid}g)`} />

      {text ? (
        <text
          x="32"
          y="25"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={fs}
          fontWeight="800"
          fill={darken(color, 0.62)}
          style={{ paintOrder: "stroke", letterSpacing: "0.3px" }}
          stroke={lighten(color, 0.85)}
          strokeWidth="0.7"
        >
          {text}
        </text>
      ) : null}
    </svg>
  );
}

export default RankBadge;
