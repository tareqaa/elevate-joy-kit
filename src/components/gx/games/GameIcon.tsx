/** Crisp vector icon for mini-games (no emoji). */
export function GameIcon({ slug, size = 40 }: { slug: string; size?: number }) {
  if (slug === "gx-blast") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="GX Blast" className="gicon">
        <defs>
          <linearGradient id="gxb-a" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6ee7ff" />
            <stop offset="1" stopColor="#2f8bef" />
          </linearGradient>
          <linearGradient id="gxb-b" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd76e" />
            <stop offset="1" stopColor="#ff9a2e" />
          </linearGradient>
          <linearGradient id="gxb-c" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7bf29a" />
            <stop offset="1" stopColor="#22b341" />
          </linearGradient>
        </defs>
        <rect x="3" y="3" width="42" height="42" rx="11" fill="#1b2246" />
        <rect x="3.75" y="3.75" width="40.5" height="40.5" rx="10.25" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="1.5" />
        <rect x="9" y="9" width="13" height="13" rx="3.5" fill="url(#gxb-a)" />
        <rect x="26" y="9" width="13" height="13" rx="3.5" fill="url(#gxb-b)" />
        <rect x="9" y="26" width="13" height="13" rx="3.5" fill="url(#gxb-c)" />
        <rect x="26" y="26" width="13" height="13" rx="3.5" fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="2" strokeDasharray="4 3" />
      </svg>
    );
  }
  if (slug === "gx-flippy" || slug === "flippy") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="GX Flippy Bird" className="gicon">
        <defs>
          <linearGradient id="gxf-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fde68a" />
            <stop offset="1" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        <rect x="3" y="3" width="42" height="42" rx="11" fill="#1b2246" />
        <rect x="3.75" y="3.75" width="40.5" height="40.5" rx="10.25" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="1.5" />
        {/* body */}
        <path
          d="M13 27c0-8 6.5-14 14-14 7 0 12.5 4.5 13.5 10 1 5.5-3.5 10-10 10-2 3-6.5 5-11 3.5 2-1.5 3-3.5 2.5-5.5-5-1-9-2-9-4z"
          fill="url(#gxf-body)"
          stroke="rgba(0,0,0,.28)"
          strokeWidth="1"
        />
        {/* wing */}
        <path d="M17 25c3.5-3.5 9-4.5 12.5-1-2.5 3.5-8 5.5-12.5 1z" fill="#fff7d6" opacity="0.85" />
        {/* beak */}
        <path d="M36 21.5c3 0 5.5 1.2 5.5 3.2s-2.5 3.2-5.5 3.2z" fill="#f97316" />
        {/* eye */}
        <circle cx="28" cy="18" r="2.2" fill="#111827" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="Game" className="gicon">
      <rect x="3" y="3" width="42" height="42" rx="11" fill="#1b2246" />
      <circle cx="24" cy="24" r="10" fill="none" stroke="#6ee7ff" strokeWidth="3" />
      <circle cx="24" cy="24" r="3" fill="#ffd76e" />
    </svg>
  );
}
