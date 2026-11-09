/* ============================================================
   GX STORE – SERVER-SIDE CALLER & ROLE VERIFICATION
   Dedicated server module for extracting and verifying bearer tokens
   and asserting admin roles in server-side request context.
   ============================================================ */

import { getRequestHeader } from "@tanstack/react-start/server";
import { getPublicClient, getUserScopedClient } from "./supabase-request";

/**
 * Extracts and verifies the caller's bearer token from the current request.
 * Returns null on anything short of a valid, live Supabase session –
 * never throws, so callers can just treat null as "not signed in".
 *
 * SECURITY: this is the only legitimate source of a caller's identity in a
 * server function. Never trust a userId passed in the request body.
 */
export async function getVerifiedCaller(explicitToken?: string | null): Promise<{ userId: string; token: string } | null> {
  let token = explicitToken?.trim() || null;
  if (!token && typeof window === "undefined") {
    try {
      const authHeader = getRequestHeader("authorization");
      if (authHeader?.toLowerCase().startsWith("bearer ")) {
        token = authHeader.slice(7).trim();
      }
    } catch {
      // getRequestHeader unavailable outside active server request context
    }
  }
  if (!token) return null;
  try {
    const { data, error } = await getPublicClient().auth.getUser(token);
    if (error || !data.user) return null;
    return { userId: data.user.id, token };
  } catch {
    return null;
  }
}

/**
 * Ensures the caller is authenticated AND has the 'admin' app role in Supabase.
 * Throws an Error if unauthenticated or not an admin.
 */
export async function assertAdminCaller(explicitToken?: string | null): Promise<{ userId: string; token: string }> {
  const caller = await getVerifiedCaller(explicitToken);
  if (!caller) {
    throw new Error("Unauthorized: authentication required");
  }
  const client = getUserScopedClient(caller.token);
  const { data: isAdmin } = await (client as any).rpc("has_role", {
    _user_id: caller.userId,
    _role: "admin",
  });
  if (isAdmin !== true) {
    throw new Error("Forbidden: admin role required");
  }
  return caller;
}

