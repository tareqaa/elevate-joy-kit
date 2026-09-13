import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { resolveSafeClientIp } from "./ip";

/* ============================================================
   ANTI-ABUSE & CACHING FOR GOOGLE TRANSLATE PROXY (SEC-04)
   - In-memory translation cache (24h TTL) absorbs repeat calls
   - Server-side rate limiting per IP (sliding window of 60s)
   - Strict batch and payload size limits
   - Zero credentials exposed
   ============================================================ */

type CacheEntry = {
  translated: string;
  from: string | null;
  expiresAt: number;
};

const translationCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_ENTRIES = 5000;

// Rate limiting: Map<IP, Array of timestamps>
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;
const MAX_TEXTS_PER_WINDOW = 60;
const rateLimitTextsMap = new Map<string, number>();

// Periodic cleanup of stale rate-limit records
function cleanupRateLimits(now: number) {
  if (rateLimitMap.size > 1000) {
    for (const [ip, times] of rateLimitMap.entries()) {
      const valid = times.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
      if (valid.length === 0) {
        rateLimitMap.delete(ip);
        rateLimitTextsMap.delete(ip);
      } else {
        rateLimitMap.set(ip, valid);
      }
    }
  }
}

function checkRateLimit(ip: string, textCount: number): boolean {
  const now = Date.now();
  cleanupRateLimits(now);

  const timestamps = rateLimitMap.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  const currentTexts = rateLimitTextsMap.get(ip) ?? 0;
  if (currentTexts + textCount > MAX_TEXTS_PER_WINDOW) {
    return false;
  }

  recent.push(now);
  rateLimitMap.set(ip, recent);
  rateLimitTextsMap.set(ip, currentTexts + textCount);

  // Reset text count after window
  setTimeout(() => {
    const existing = rateLimitTextsMap.get(ip) ?? 0;
    rateLimitTextsMap.set(ip, Math.max(0, existing - textCount));
  }, RATE_LIMIT_WINDOW_MS);

  return true;
}

/**
 * Core translation logic with in-memory caching, rate limiting, and strict input limits.
 */
export async function handleTranslateTexts(
  input: { texts: string[]; target?: string },
  callerIp?: string
): Promise<{ text: string; from: string | null }[]> {
  const target = input?.target === "ar" ? "ar" : "en";
  const rawList = Array.isArray(input?.texts) ? input.texts : [];
  if (rawList.length === 0) return [];

  // Max 20 texts per batch, max 350 chars each
  const texts = rawList.slice(0, 20).map((t) => String(t ?? "").trim().slice(0, 350));
  const totalChars = texts.reduce((acc, t) => acc + t.length, 0);

  if (totalChars > 2500) {
    throw new Error("Payload too large: maximum 2500 total characters per request");
  }

  // Rate limit check
  const ip = (callerIp || "127.0.0.1").trim();
  const allowed = checkRateLimit(ip, texts.length);
  if (!allowed) {
    throw new Error("Rate limit exceeded: too many translation requests. Please wait a moment.");
  }

  const now = Date.now();
  const out: { text: string; from: string | null }[] = [];
  const uncachedIndices: number[] = [];
  const uncachedTexts: string[] = [];

  // 1. Check cache first
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    if (!text) {
      out[i] = { text, from: null };
      continue;
    }

    const cacheKey = `${target}:${text}`;
    const cached = translationCache.get(cacheKey);

    if (cached && cached.expiresAt > now) {
      out[i] = { text: cached.translated, from: cached.from };
    } else {
      uncachedIndices.push(i);
      uncachedTexts.push(text);
    }
  }

  // If all items hit cache, return immediately
  if (uncachedTexts.length === 0) {
    return out;
  }

  // 2. Translate uncached items
  for (let j = 0; j < uncachedTexts.length; j++) {
    const text = uncachedTexts[j];
    const targetIndex = uncachedIndices[j];

    try {
      const url =
        "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=" +
        target +
        "&dt=t&q=" +
        encodeURIComponent(text);

      const res = await fetch(url);
      if (!res.ok) {
        out[targetIndex] = { text, from: null };
        continue;
      }

      const json = (await res.json()) as [Array<[string]>, unknown, string];
      const translated = (json?.[0] ?? []).map((s) => s?.[0] ?? "").join("");
      const from = typeof json?.[2] === "string" ? json[2] : null;

      const isTranslated = translated && from && from !== target;
      const finalResult = isTranslated ? { text: translated, from } : { text, from: null };

      // Save in cache
      if (translationCache.size >= MAX_CACHE_ENTRIES) {
        const firstKey = translationCache.keys().next().value;
        if (firstKey) translationCache.delete(firstKey);
      }
      translationCache.set(`${target}:${text}`, {
        translated: finalResult.text,
        from: finalResult.from,
        expiresAt: now + CACHE_TTL_MS,
      });

      out[targetIndex] = finalResult;
    } catch {
      out[targetIndex] = { text, from: null };
    }
  }

  return out;
}

/**
 * Machine translation for customer reviews through Google Translate.
 * Protected with server-side rate limiting and in-memory caching.
 */
export const translateTexts = createServerFn({ method: "POST" })
  .validator((input: { texts: string[]; target: string }) => input)
  .handler(async ({ data }) => {
    let ip = "127.0.0.1";
    try {
      ip = resolveSafeClientIp(getRequestHeader);
    } catch {
      ip = "127.0.0.1";
    }

    return handleTranslateTexts(data, ip);
  });
