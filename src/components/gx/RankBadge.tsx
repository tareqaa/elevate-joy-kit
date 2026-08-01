/**
 * RankBadge — beveled hexagon medal (Bronze / Silver / Gold / Platinum / Emerald / Diamond style).
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

export type RankEmblem = "none" | "cube" | "hex" | "star" | "gem" | "diamond";

export type RankBadgeProps = {
  /** Base colour of the medal (level colour, or medal colour for top ranks). */
  color?: string;
  /** Kept for API compatibility — overrides the metal colour of the hexagon. */
  accent?: string;
  /** Level / rank number: also picks the centre emblem when `emblem` is not given. */
  label?: string | number;
  /** Centre emblem inside the hexagon. */
  emblem?: RankEmblem;
  size?: number;
  /** @deprecated kept for compatibility (no wings in the hexagon design). */
  wings?: boolean;
  /** @deprecated kept for compatibility. */
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

const EMBLEM_BY_TIER: RankEmblem[] = ["none", "none", "cube", "hex", "star", "gem", "diamond"];

let seq = 0;

export function RankBadge({
  color = "#4aa8ff",
  accent,
  label,
  emblem,
  size = 34,
  glow = false,
  title,
  className,
}: RankBadgeProps) {
  const uid = `rb${(seq = (seq + 1) % 100000)}`;
  const tier = Number(label);
  const em: RankEmblem =
    emblem ?? (Number.isFinite(tier) && tier > 0 ? EMBLEM_BY_TIER[Math.min(tier, EMBLEM_BY_TIER.length - 1)] : "hex");

  const base = accent || color;
  const hi = lighten(base, 0.62);
  const mid = base;
  const lo = darken(base, 0.34);
  const edge = darken(base, 0.55);

  // flat-top hexagon, centre (32,29)
  const OUT = "M2 29 L17 3 H47 L62 29 L47 55 H17 Z";
  const IN = "M13.4 29 L22.7 12.9 H41.3 L50.6 29 L41.3 45.1 H22.7 Z";

  return (
    <svg
      className={className}
      width={size}
      height={size * 0.9}
      viewBox="0 0 64 58"
      role="img"
      aria-label={title || (label != null ? `rank ${label}` : "rank")}
      style={{
        display: "block",
        overflow: "visible",
        filter: glow ? `drop-shadow(0 0 8px ${mix(base, [255, 255, 255], 0.15)}70)` : undefined,
      }}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={`${uid}m`} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor={hi} />
          <stop offset="42%" stopColor={mid} />
          <stop offset="100%" stopColor={lo} />
        </linearGradient>
        <linearGradient id={`${uid}e`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor={lighten(base, 0.8)} />
          <stop offset="55%" stopColor={lighten(base, 0.2)} />
          <stop offset="100%" stopColor={darken(base, 0.25)} />
        </linearGradient>
      </defs>

      {/* hexagon ring */}
      <path d={`${OUT} ${IN}`} fillRule="evenodd" fill={`url(#${uid}m)`} stroke={edge} strokeWidth="1" strokeLinejoin="round" />

      {/* bevel facets */}
      <g stroke="none">
        <path d="M2 29 L17 3 H47 L41.3 12.9 H22.7 L13.4 29 Z" fill="#fff" opacity="0.26" />
        <path d="M62 29 L47 55 H17 L22.7 45.1 H41.3 L50.6 29 Z" fill="#000" opacity="0.26" />
        <path d="M2 29 L13.4 29 L22.7 45.1 L17 55 Z" fill="#000" opacity="0.12" />
        <path d="M62 29 L50.6 29 L41.3 12.9 L47 3 Z" fill="#fff" opacity="0.12" />
      </g>
      {/* inner edge shadow */}
      <path d={IN} fill="none" stroke="#000" strokeOpacity="0.35" strokeWidth="1.1" strokeLinejoin="round" />

      {/* centre emblem */}
      <g transform="translate(32 29)">
        {em === "cube" ? (
          <g stroke={edge} strokeWidth="0.8" strokeLinejoin="round">
            <path d="M0 -9 L8 -4.5 V4.5 L0 9 L-8 4.5 V-4.5 Z" fill={`url(#${uid}e)`} />
            <path d="M0 -9 L8 -4.5 L0 0 L-8 -4.5 Z" fill="#fff" fillOpacity="0.3" stroke="none" />
            <path d="M0 0 L8 -4.5 V4.5 L0 9 Z" fill="#000" fillOpacity="0.22" stroke="none" />
          </g>
        ) : null}
        {em === "hex" ? (
          <path d="M0 -9.5 L8.2 -4.75 V4.75 L0 9.5 L-8.2 4.75 V-4.75 Z" fill={`url(#${uid}e)`} stroke={edge} strokeWidth="0.9" strokeLinejoin="round" />
        ) : null}
        {em === "star" ? (
          <g stroke={edge} strokeWidth="0.8" strokeLinejoin="round">
            <path d="M0 -10.5 L3.2 -3.4 L10.6 -3.4 L4.6 1.2 L6.9 8.9 L0 4.2 L-6.9 8.9 L-4.6 1.2 L-10.6 -3.4 L-3.2 -3.4 Z" fill={`url(#${uid}e)`} />
            <path d="M0 -10.5 L0 4.2 L6.9 8.9 L4.6 1.2 L10.6 -3.4 L3.2 -3.4 Z" fill="#000" fillOpacity="0.18" stroke="none" />
          </g>
        ) : null}
        {em === "gem" ? (
          <g stroke={edge} strokeWidth="0.8" strokeLinejoin="round">
            <path d="M0 -9 L6.4 -6.4 L9 0 L6.4 6.4 L0 9 L-6.4 6.4 L-9 0 L-6.4 -6.4 Z" fill={`url(#${uid}e)`} />
            <path d="M0 -5 L4.2 0 L0 5 L-4.2 0 Z" fill="#fff" fillOpacity="0.32" stroke="none" />
          </g>
        ) : null}
        {em === "diamond" ? (
          <g stroke={edge} strokeWidth="0.8" strokeLinejoin="round">
            <path d="M-8.5 -5 H8.5 L0 9.5 Z" fill={`url(#${uid}e)`} />
            <path d="M-8.5 -5 L-4.5 -8.5 H4.5 L8.5 -5 Z" fill={lighten(base, 0.55)} />
            <path d="M-3 -5 L0 9.5 L3 -5 Z" fill="#fff" fillOpacity="0.35" stroke="none" />
          </g>
        ) : null}
      </g>
    </svg>
  );
}

export default RankBadge;
