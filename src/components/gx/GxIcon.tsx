/**
 * GxIcon — tiny inline SVG icon set.
 * Replaces emoji so the UI looks identical on every OS / device.
 */

export type GxIconName =
  | "bolt" | "coin" | "discount" | "medal" | "gift" | "search" | "trophy"
  | "lock" | "check" | "card" | "box";

const PATHS: Record<GxIconName, React.ReactNode> = {
  bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />,
  coin: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M9.5 9.5h4a1.8 1.8 0 0 1 0 3.6h-3a1.8 1.8 0 0 0 0 3.6h4" />
    </>
  ),
  discount: (
    <>
      <path d="M7.5 16.5 16.5 7.5" />
      <circle cx="8.5" cy="8.5" r="1.8" />
      <circle cx="15.5" cy="15.5" r="1.8" />
      <rect x="3" y="3" width="18" height="18" rx="5" />
    </>
  ),
  medal: (
    <>
      <path d="M8 3 12 9l4-6" />
      <circle cx="12" cy="15.5" r="5.5" />
    </>
  ),
  gift: (
    <>
      <rect x="3" y="9" width="18" height="12" rx="2" />
      <path d="M3 13h18M12 9v12M12 9c-3.5 0-5-1-5-3s3-2 5 3c2-5 5-4 5-3s-1.5 3-5 3Z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M9 20h6M12 14v6" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10" width="15" height="10" rx="2.5" />
      <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
    </>
  ),
  check: <path d="m4.5 12.5 5 5 10-11" />,
  card: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="3" />
      <path d="M2.5 10h19M6 15h4" />
    </>
  ),
  box: (
    <>
      <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Z" />
      <path d="M3 7.5 12 12l9-4.5M12 12v9" />
    </>
  ),
};

export function GxIcon({ name, size = 16, className, strokeWidth = 1.9 }: {
  name: GxIconName; size?: number; className?: string; strokeWidth?: number;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ display: "inline-block", verticalAlign: "-0.15em", flex: "none" }}
    >
      {PATHS[name]}
    </svg>
  );
}

export default GxIcon;
