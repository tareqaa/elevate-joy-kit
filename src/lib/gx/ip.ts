/**
 * Safe client IP extraction for server functions and rate limiters.
 *
 * Anti-spoofing principles:
 * 1. An arbitrary client can send whatever they want in `X-Forwarded-For`,
 *    `CF-Connecting-IP`, or `X-Real-IP` if the server is reached directly.
 * 2. In reverse-proxy setups (e.g. Nginx, Cloudflare, AWS ALB), proxy hops are
 *    appended to the RIGHT of `X-Forwarded-For`. Naively taking index 0 allows
 *    the client to choose their own rate-limiting identity.
 * 3. `CF-Connecting-IP` is authoritative when running on Cloudflare Pages / Workers.
 * 4. We strictly validate IP format (IPv4 / IPv6) to reject header injection.
 */

const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

function isValidIpv6(ip: string): boolean {
  if (!ip.includes(":") || ip.length > 45) return false;
  if (!/^[0-9a-fA-F:]+$/.test(ip)) return false;
  const doubleColons = ip.split("::");
  if (doubleColons.length > 2) return false;
  const segments = ip.split(":");
  if (segments.length > 8) return false;
  for (const seg of segments) {
    if (seg.length > 4) return false;
  }
  return true;
}

export function isValidIp(ip: string): boolean {
  if (!ip || typeof ip !== "string") return false;
  const trimmed = ip.trim();
  if (trimmed.length > 45) return false;
  return IPV4_REGEX.test(trimmed) || isValidIpv6(trimmed);
}

export function normalizeIp(ip: string): string {
  const trimmed = ip.trim().toLowerCase();
  if (trimmed === "::1" || trimmed === "::ffff:127.0.0.1") return "127.0.0.1";
  if (trimmed.startsWith("::ffff:")) {
    const v4 = trimmed.slice(7);
    if (IPV4_REGEX.test(v4)) return v4;
  }
  return trimmed;
}

/**
 * Extracts and sanitizes the client IP from request headers.
 * Accepts a header getter function (such as `getRequestHeader`).
 */
export function resolveSafeClientIp(
  getHeader: (name: string) => string | undefined | null
): string {
  // 1. Cloudflare edge header (authoritative on Cloudflare runtime)
  const cfIp = getHeader("cf-connecting-ip")?.trim();
  if (cfIp && isValidIp(cfIp)) {
    return normalizeIp(cfIp);
  }

  // 2. X-Real-IP (set by many reverse proxies for the direct client)
  const realIp = getHeader("x-real-ip")?.trim();
  if (realIp && isValidIp(realIp)) {
    return normalizeIp(realIp);
  }

  // 3. X-Forwarded-For:
  // Proxies append to the end. The right-most entries represent the most trusted hops.
  // We inspect from right to left to find the nearest valid IP hop.
  const xForwardedFor = getHeader("x-forwarded-for");
  if (xForwardedFor) {
    const hops = xForwardedFor.split(",").map((h) => h.trim()).filter(Boolean);
    for (let i = hops.length - 1; i >= 0; i--) {
      const candidate = hops[i];
      if (isValidIp(candidate)) {
        return normalizeIp(candidate);
      }
    }
  }

  return "127.0.0.1";
}
