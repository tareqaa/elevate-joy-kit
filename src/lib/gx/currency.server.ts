/* ============================================================
   LIVE FX RATES — server-side proxy
   Browsers used to call open.er-api.com directly on every visit.
   Centralizing the fetch here means only our own server ever talks
   to the third party, with a short in-memory cache so a burst of
   visitors doesn't turn into a burst of outbound requests.
   ============================================================ */

import { createServerFn } from "@tanstack/react-start";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h, matches the client-side cache window
const FETCH_TIMEOUT_MS = 4000;

let cache: { at: number; rates: Record<string, number> } | null = null;

async function fetchLiveRates(): Promise<Record<string, number> | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/JOD", { signal: ctrl.signal });
    const data = await res.json();
    if (data?.result !== "success" || !data?.rates || typeof data.rates !== "object") return null;
    const out: Record<string, number> = { JOD: 1 };
    for (const [code, value] of Object.entries(data.rates as Record<string, unknown>)) {
      const r = Number(value);
      if (Number.isFinite(r) && r > 0) out[code] = r;
    }
    return out;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export const getFxRatesServer = createServerFn({ method: "GET" }).handler(
  async (): Promise<Record<string, number> | null> => {
    if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.rates;

    const live = await fetchLiveRates();
    if (live) {
      cache = { at: Date.now(), rates: live };
      return live;
    }
    // Serve a stale cache over nothing if the upstream call failed.
    return cache?.rates ?? null;
  },
);
