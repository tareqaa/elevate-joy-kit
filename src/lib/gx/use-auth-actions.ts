/* ============================================================
   SHARED AUTH ACTIONS
   The actual Supabase calls behind sign-in/sign-up/reset/Google,
   shared between the full /auth page and the AuthModal popup so
   the two don't drift (they used to reimplement this separately,
   with different error handling and different post-login behavior).
   Each caller keeps its own form/UI and its own translated copy.
   ============================================================ */

import { supabase } from "@/integrations/supabase/client";

import { useLang } from "@/lib/gx/i18n";

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
  const { lang } = useLang();

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
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes("@")) {
        return {
          ok: false,
          error: lang === "ar" ? "يرجى إدخال بريد إلكتروني صالح" : "Please enter a valid email address",
        };
      }

      // 1. Instant local storage cooldown check (fast-path)
      const localKey = `gx_pw_reset_${cleanEmail}`;
      try {
        const lastTimestamp = Number(localStorage.getItem(localKey));
        if (lastTimestamp && Date.now() - lastTimestamp < 3600 * 1000) {
          const remainingMinutes = Math.max(1, Math.ceil((3600 * 1000 - (Date.now() - lastTimestamp)) / 60000));
          return {
            ok: false,
            error:
              lang === "ar"
                ? remainingMinutes <= 1
                  ? "لا يمكنك إعادة إرسال رابط تعيين كلمة المرور إلا بعد مرور ساعة. يرجى الانتظار أقل من دقيقة."
                  : `لا يمكنك إعادة إرسال رابط تعيين كلمة المرور إلا بعد مرور ساعة. يرجى الانتظار ${remainingMinutes} دقيقة.`
                : `You can only request a password reset once per hour. Please wait ${remainingMinutes} minutes.`,
          };
        }
      } catch {
        // ignore localStorage access error
      }

      // 2. Server & database cooldown check via Supabase RPC
      try {
        const { data: cooldown } = await (supabase.rpc as any)("check_password_reset_cooldown", {
          _email: cleanEmail,
        });

        if (cooldown && cooldown.allowed === false) {
          const msg =
            (lang === "en" ? cooldown.message_en : cooldown.message_ar) ||
            (lang === "ar"
              ? `لا يمكنك إعادة إرسال رابط تعيين كلمة المرور إلا بعد مرور ساعة. يرجى الانتظار ${cooldown.remaining_minutes || 60} دقيقة.`
              : `You can only request a password reset once per hour. Please wait ${cooldown.remaining_minutes || 60} minutes.`);
          return { ok: false, error: msg };
        }
      } catch {
        // continue if RPC is unreachable
      }

      // 3. Request Supabase password reset email
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        return { ok: false, error: error.message };
      }

      // 4. Record successful reset request in Database and LocalStorage
      try {
        await (supabase.rpc as any)("record_password_reset_request", { _email: cleanEmail });
      } catch {
        // noop
      }

      try {
        localStorage.setItem(localKey, String(Date.now()));
      } catch {
        // ignore localStorage write error
      }

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
