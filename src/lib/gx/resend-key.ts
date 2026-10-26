/**
 * ============================================================
 * GX STORE — RESEND API KEY RESOLVER
 * Securely resolves the Resend API key:
 * 1. process.env.RESEND_API_KEY
 * 2. In-memory cache (1 minute TTL)
 * 3. Supabase RPC / site_settings (authenticated via admin caller or service role)
 * ============================================================
 */

import {
  getPublicClient,
  getVerifiedCaller,
  getUserScopedClient,
  supabaseEnv,
  supabaseFetch,
} from "@/lib/gx/supabase-request";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

let cachedKey: string | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute memory cache

/**
 * Returns the active Resend API key from env or Supabase database settings.
 * Only accessible in secure server-side execution context.
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

  // 3. Supabase RPC / site_settings query with authenticated context
  try {
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SERVICE_ROLE_KEY;

    let client: ReturnType<typeof getPublicClient> = getPublicClient();

    if (serviceKey) {
      const { url } = supabaseEnv();
      client = createClient<Database>(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { fetch: supabaseFetch(serviceKey) },
      });
    } else {
      try {
        const caller = await getVerifiedCaller();
        if (caller?.token) {
          client = getUserScopedClient(caller.token);
        }
      } catch {
        // Fallback to public client if called outside HTTP request context
      }
    }

    // Call get_resend_api_key RPC
    const { data: rpcKey, error: rpcErr } = await (client as any).rpc("get_resend_api_key");
    if (!rpcErr && rpcKey && typeof rpcKey === "string" && rpcKey.trim().startsWith("re_")) {
      cachedKey = rpcKey.trim();
      cachedAt = now;
      return cachedKey;
    }

    // Direct site_settings fallback (accessible to admin / service_role)
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
