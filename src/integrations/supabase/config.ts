/**
 * Shared Supabase configuration with safe project fallbacks.
 *
 * In Lovable Cloud and preview/serverless environments, system environment
 * variables like SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY may not be injected
 * directly into the SSR node process or worker runtime.
 * We resolve in this order:
 * 1. process.env (runtime server / container env)
 * 2. import.meta.env (Vite bundled client/SSR build env)
 * 3. Default GX Store Supabase project credentials (public anon client)
 */

export const DEFAULT_SUPABASE_URL = "https://pvwsktauvvxvmdpdzqrb.supabase.co";

export const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2d3NrdGF1dnZ4dm1kcGR6cXJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNjM1NjUsImV4cCI6MjEwMDkzOTU2NX0.iqwL3MJAcKJsmPceBm0ZyFEQa4m3wjcsisv31I9sgO4";

export function getSupabaseUrl(): string {
  const env = (typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {}) as Record<
    string,
    string | undefined
  >;
  const proc = (typeof process !== "undefined" ? process.env : {}) as Record<
    string,
    string | undefined
  >;

  return (
    proc["SUPABASE_URL"] ||
    proc["VITE_SUPABASE_URL"] ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
    env["VITE_SUPABASE_URL"] ||
    DEFAULT_SUPABASE_URL
  );
}

export function getSupabasePublishableKey(): string {
  const env = (typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {}) as Record<
    string,
    string | undefined
  >;
  const proc = (typeof process !== "undefined" ? process.env : {}) as Record<
    string,
    string | undefined
  >;

  return (
    proc["SUPABASE_PUBLISHABLE_KEY"] ||
    proc["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    proc["SUPABASE_ANON_KEY"] ||
    proc["VITE_SUPABASE_ANON_KEY"] ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY) ||
    env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    DEFAULT_SUPABASE_PUBLISHABLE_KEY
  );
}
