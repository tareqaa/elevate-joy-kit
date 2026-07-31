/** Lightweight decorative layer: floating GX Blast blocks + coins.
 *  Deterministic values (no Math.random) so SSR and hydration match. */
const COLORS = ["#4aa8ff", "#ffd76e", "#34e78c", "#c4a2ff", "#ff8a8a"];

const BITS = Array.from({ length: 14 }, (_, i) => {
  const left = (i * 137) % 97; // spread deterministically
  const size = 10 + ((i * 7) % 14);
  const dur = 9 + ((i * 3) % 8);
  const delay = (i * 1.3) % 9;
  return {
    coin: i % 3 === 0,
    left,
    size,
    dur,
    delay,
    color: COLORS[i % COLORS.length],
    top: 30 + ((i * 23) % 60),
  };
});

export function ArenaFx() {
  return (
    <div className="ar-fx" aria-hidden>
      {BITS.map((b, i) => (
        <i
          key={i}
          className={b.coin ? "coin" : ""}
          style={{
            left: `${b.left}%`,
            top: `${b.top}%`,
            width: b.size,
            height: b.size,
            background: b.coin ? undefined : b.color,
            animationDuration: `${b.dur}s`,
            animationDelay: `${b.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
