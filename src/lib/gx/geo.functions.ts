import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

/**
 * Returns the client's country code (e.g. 'JO', 'SA', 'AE', 'US') strictly from authoritative edge proxy IP headers.
 * Resolves with 0 third-party overhead on production Cloudflare deployments.
 */
export const getClientCountryFn = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const cf = getRequestHeader("cf-ipcountry")?.trim().toUpperCase();
    if (cf && cf.length === 2 && cf !== "XX" && cf !== "T1") {
      return { countryCode: cf };
    }
    const vercel = getRequestHeader("x-vercel-ip-country")?.trim().toUpperCase();
    if (vercel && vercel.length === 2) {
      return { countryCode: vercel };
    }
  } catch {
    /* fallback to client geo */
  }
  return { countryCode: null };
});
