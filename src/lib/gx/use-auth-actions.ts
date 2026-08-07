/* ============================================================
   SHARED AUTH ACTIONS
   The actual Supabase calls behind sign-in/sign-up/reset/Google,
   shared between the full /auth page and the AuthModal popup so
   the two don't drift (they used to reimplement this separately,
   with different error handling and different post-login behavior).
   Each caller keeps its own form/UI and its own translated copy.
   ============================================================ */

import { supabase } from "@/integrations/supabase/client";

export type AuthResult = { ok: boolean; error?: string };

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

function normalizeError(err: unknown, fallback: string): string {
  if (
    err &&
    typeof err === "object" &&
    "message" in err &&
    typeof (err as { message?: unknown }).message === "string"
  ) {
    return (err as { message: string }).message || fallback;
  }
  return fallback;
}

export function useAuthActions() {
  async function signIn(email: string, password: string): Promise<AuthResult> {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (err) {
      return { ok: false, error: normalizeError(err, "Sign-in failed") };
    }
  }

  /** `redirectPath` is where Supabase sends the confirmation-email link back to. */
  async function signUp(
    email: string,
    password: string,
    username: string,
    redirectPath: string,
  ): Promise<AuthResult> {
    if (!USERNAME_PATTERN.test(username.trim())) {
      return { ok: false, error: "invalid_username" };
    }
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${redirectPath}`,
          data: { username: username.trim() },
        },
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (err) {
      return { ok: false, error: normalizeError(err, "Sign-up failed") };
    }
  }

  async function resetPassword(email: string): Promise<AuthResult> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (err) {
      return { ok: false, error: normalizeError(err, "Reset failed") };
    }
  }

  async function signInWithGoogle(redirectPath: string): Promise<AuthResult> {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}${redirectPath}`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (err) {
      return { ok: false, error: normalizeError(err, "Google sign-in failed") };
    }
  }

  return { signIn, signUp, resetPassword, signInWithGoogle };
}
