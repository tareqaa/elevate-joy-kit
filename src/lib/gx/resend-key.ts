/**
 * ============================================================
 * GX STORE — RESEND API KEY RESOLVER
 * Resolves the Resend API key reliably across all hosting environments:
 * 1. process.env.RESEND_API_KEY
 * 2. process.env.VITE_RESEND_API_KEY
 * 3. Supabase RPC public.get_resend_api_key() (SECURITY DEFINER)
 * 4. Supabase site_settings query ('resend_api_key')
 * ============================================================
 */

import { getPublicClient } from "@/lib/gx/supabase-request";

let cachedKey: string | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute memory cache

/**
 * Returns the active Resend API key from env or Supabase database settings.
 */
export async function getResendApiKey(): Promise<string> {
  // 1. Process environment variable (local dev or deployed container)
  const envKey = process.env.RESEND_API_KEY || (process.env as any).VITE_RESEND_API_KEY;
  if (envKey && typeof envKey === "string" && envKey.trim().startsWith("re_")) {
    return envKey.trim();
  }

  // 2. In-memory cache
  const now = Date.now();
  if (cachedKey && now - cachedAt < CACHE_TTL_MS) {
    return cachedKey;
  }

  // 3. Supabase RPC / site_settings query
  try {
    const client = getPublicClient();

    // Call get_resend_api_key RPC (runs as SECURITY DEFINER to retrieve key securely)
    const { data: rpcKey, error: rpcErr } = await (client as any).rpc("get_resend_api_key");
    if (!rpcErr && rpcKey && typeof rpcKey === "string" && rpcKey.trim().startsWith("re_")) {
      cachedKey = rpcKey.trim();
      cachedAt = now;
      return cachedKey;
    }

    // Direct site_settings fallback
    const { data: row } = await client
      .from("site_settings")
      .select("value")
      .eq("key", "resend_api_key")
      .maybeSingle();

    if (row?.value) {
      const v = row.value;
      let extracted = "";
      if (typeof v === "string") extracted = v;
      else if (typeof v === "object" && v !== null) {
        extracted = (v as any).api_key || (v as any).key || (v as any).value || "";
      }
      if (extracted && extracted.trim().startsWith("re_")) {
        cachedKey = extracted.trim();
        cachedAt = now;
        return cachedKey;
      }
    }
  } catch (err) {
    console.warn("[GX] Warning: Could not fetch resend_api_key from DB:", err);
  }

  return cachedKey || "";
}
