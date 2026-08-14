/* ============================================================
   GX STORE — SHARED SERVER-SIDE SUPABASE REQUEST HELPERS
   Anon-key clients for server functions: a plain public reader,
   and a caller-scoped variant that forwards the caller's own
   bearer token so RLS / SECURITY DEFINER RPCs see the real,
   verified auth.uid() — never a client-supplied user id.
   ============================================================ */

import { createClient } from "@supabase/supabase-js";
import { getRequestHeader } from "@tanstack/react-start/server";
import type { Database } from "@/integrations/supabase/types";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

/** Strips a stale `Authorization: Bearer <anon key>` header and always sets `apikey`. */
export function supabaseFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, k) => headers.set(k, value));
    }
    if (isNewSupabaseApiKey(key) && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

function supabaseEnv() {
  // In the dev/worker runtime only VITE_* vars are injected into import.meta.env,
  // while deployed servers expose the unprefixed ones on process.env. Check both.
  const env = import.meta.env as Record<string, string | undefined>;
  const url =
    process.env["SUPABASE_URL"] ||
    process.env["VITE_SUPABASE_URL"] ||
    env["VITE_SUPABASE_URL"];
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) {
    throw new Error(
      "Backend is not configured: missing SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY in the server environment.",
    );
  }
  return { url, key };
}


/** Anon-key client for public, unauthenticated reads. No identity, no RLS bypass. */
export function getPublicClient() {
  const { url, key } = supabaseEnv();
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: { fetch: supabaseFetch(key) },
  });
}

/**
 * Anon-key client that forwards the given bearer token, so RLS and
 * SECURITY DEFINER functions resolve auth.uid() to that real user.
 * Only ever call this with a token returned by getVerifiedCaller().
 */
export function getUserScopedClient(token: string) {
  const { url, key } = supabaseEnv();
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: { fetch: supabaseFetch(key), headers: { Authorization: `Bearer ${token}` } },
  });
}

/**
 * Extracts and verifies the caller's bearer token from the current request.
 * Returns null on anything short of a valid, live Supabase session —
 * never throws, so callers can just treat null as "not signed in".
 *
 * SECURITY: this is the only legitimate source of a caller's identity in a
 * server function. Never trust a userId passed in the request body.
 */
export async function getVerifiedCaller(): Promise<{ userId: string; token: string } | null> {
  const authHeader = getRequestHeader("authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;
  try {
    const { data, error } = await getPublicClient().auth.getUser(token);
    if (error || !data.user) return null;
    return { userId: data.user.id, token };
  } catch {
    return null;
  }
}
