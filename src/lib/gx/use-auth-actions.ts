/* ============================================================
   SHARED AUTH ACTIONS
   The actual Supabase calls behind sign-in/sign-up/reset/Google,
   shared between the full /auth page and the AuthModal popup so
   the two don't drift (they used to reimplement this separately,
   with different error handling and different post-login behavior).
   Each caller keeps its own form/UI and its own translated copy.
   ============================================================ */

import { supabase } from "@/integrations/supabase/client";
import { requestPasswordResetServer } from "@/lib/gx/auth.functions";
import { useLang } from "@/lib/gx/i18n";

export type AuthResult = {
  ok: boolean;
  error?: string;
  mfaRequired?: boolean;
  factorId?: string;
};

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
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) return { ok: false, error: error.message };

      // Check if user has 2FA (TOTP) enabled
      try {
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aalData && aalData.currentLevel === "aal1" && aalData.nextLevel === "aal2") {
          const { data: factorsData } = await supabase.auth.mfa.listFactors();
          const totpFactor = factorsData?.totp?.find((f) => f.status === "verified");
          if (totpFactor) {
            return {
              ok: true,
              mfaRequired: true,
              factorId: totpFactor.id,
            };
          }
        }
      } catch {
        // continue if MFA check fails
      }

      return { ok: true, mfaRequired: false };
    } catch (err) {
      return { ok: false, error: normalizeError(err, "Sign-in failed") };
    }
  }

  async function verify2fa(factorId: string, code: string): Promise<AuthResult> {
    try {
      const cleanCode = code.trim().replace(/\D/g, "");
      if (cleanCode.length !== 6) {
        return {
          ok: false,
          error: lang === "ar" ? "يرجى إدخال رمز التحقق المكون من 6 أرقام" : "Please enter a valid 6-digit code",
        };
      }

      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: cleanCode,
      });

      if (error) {
        return {
          ok: false,
          error:
            lang === "ar"
              ? "رمز التحقق غير صحيح، يرجى المحاولة مجدداً"
              : error.message || "Invalid verification code",
        };
      }

      if (typeof window !== "undefined") {
        try { sessionStorage.removeItem("gx_2fa_pending"); } catch { /* noop */ }
      }

      // Refresh session to elevate to AAL2 and broadcast updated auth state across the app
      try {
        const { data: refreshed } = await supabase.auth.refreshSession();
        const activeUser = refreshed.session?.user ?? (await supabase.auth.getUser()).data.user;
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("gx-auth-changed", { detail: activeUser }));
        }
      } catch {
        // noop
      }

      return { ok: true };
    } catch (err) {
      return { ok: false, error: normalizeError(err, "2FA verification failed") };
    }
  }

  async function cancel2fa(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch {
      // noop
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

      // 1. Instant local storage cooldown check (fast-path for UX)
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

      // 2. Authoritative server-side reset (SEC-08):
      //    - Server IP rate limiting
      //    - Authoritative database cooldown check & request recording
      //    - GoTrue dispatch
      try {
        const redirectTo = `${window.location.origin}/reset-password`;
        const res = await requestPasswordResetServer({
          data: {
            email: cleanEmail,
            redirectTo,
            lang: lang === "en" ? "en" : "ar",
          },
        });

        if (!res.ok) {
          return {
            ok: false,
            error:
              res.message ||
              (res as any).error ||
              (lang === "ar" ? "فشل طلب استعادة كلمة المرور" : "Password reset failed"),
          };
        }

        try {
          localStorage.setItem(localKey, String(Date.now()));
        } catch {
          // ignore localStorage write error
        }

        return { ok: true };
      } catch (serverErr) {
        return {
          ok: false,
          error:
            lang === "ar"
              ? "تعذّر إتمام طلب استعادة كلمة المرور حالياً. يرجى المحاولة بعد قليل."
              : "Unable to process password reset at this time. Please try again in a few moments.",
        };
      }
    } catch (err) {
      return {
        ok: false,
        error:
          lang === "ar"
            ? "حدث خطأ غير متوقع. يرجى المحاولة لاحقاً."
            : "An unexpected error occurred. Please try again later.",
      };
    }
  }

  async function signInWithGoogle(redirectPath?: string): Promise<AuthResult> {
    try {
      const target = redirectPath || "/account";
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent(target)}`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (err) {
      return { ok: false, error: normalizeError(err, "Google sign-in failed") };
    }
  }

  return { signIn, signUp, resetPassword, signInWithGoogle, verify2fa, cancel2fa };
}
