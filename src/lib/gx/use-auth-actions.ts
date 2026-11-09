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
import { recordAuthAttemptServer } from "@/lib/gx/security.functions";
import { useLang } from "@/lib/gx/i18n";
import { linkMyPastOrders } from "@/lib/gx/loyalty";
import { toast } from "sonner";

export type AuthResult = {
  ok: boolean;
  error?: string;
  mfaRequired?: boolean;
  factorId?: string;
  isGuestOnly?: boolean;
  requiresOtp?: boolean;
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
      if (error) {
        void recordAuthAttemptServer({
          data: {
            email: email.trim(),
            type: "login_failed",
            status: "failed",
            failureReason: error.message,
          },
        }).catch(() => {});
        return { ok: false, error: error.message };
      }

      // Record successful login & register device session
      void recordAuthAttemptServer({
        data: {
          email: email.trim(),
          type: "login_success",
          status: "success",
          userId: data?.user?.id,
        },
      }).catch(() => {});

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

      void linkMyPastOrders();
      try {
        const { data: cancelRes } = await (supabase.rpc as any)("cancel_scheduled_deletion");
        if ((cancelRes as any)?.reactivated) {
          toast.success(
            lang === "ar"
              ? "🎉 أهلاً بعودتك! تم إلغاء طلب حذف الحساب واستعادة حسابك بنجاح."
              : "🎉 Welcome back! Your account deletion was cancelled and reactivated."
          );
        }
        if (data?.user?.id) {
          await supabase
            .from("profiles")
            .update({ scheduled_deletion_at: null, deletion_reason: null } as any)
            .eq("id", data.user.id);
        }
      } catch {}
      return { ok: true, mfaRequired: false };
    } catch (err) {
      // Safety fallback: if an event subscriber threw an uncaught error during signIn,
      // but the session was actually established successfully:
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          void linkMyPastOrders();
          try {
            const { data: cancelRes } = await (supabase.rpc as any)("cancel_scheduled_deletion");
            if ((cancelRes as any)?.reactivated) {
              toast.success(
                lang === "ar"
                  ? "🎉 أهلاً بعودتك! تم إلغاء طلب حذف الحساب واستعادة حسابك بنجاح."
                  : "🎉 Welcome back! Your account deletion was cancelled and reactivated."
              );
            }
            await supabase
              .from("profiles")
              .update({ scheduled_deletion_at: null, deletion_reason: null } as any)
              .eq("id", sessionData.session.user.id);
          } catch {}
          return { ok: true, mfaRequired: false };
        }
      } catch {
        // continue
      }
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

      void linkMyPastOrders();
      try {
        void (supabase.rpc as any)("cancel_scheduled_deletion").then(({ data }: any) => {
          if ((data as any)?.reactivated) {
            toast.success(
              lang === "ar"
                ? "🎉 أهلاً بعودتك! تم إلغاء طلب حذف الحساب واستعادة حسابك بنجاح."
                : "🎉 Welcome back! Your account deletion was cancelled and reactivated."
            );
          }
        });
      } catch {}
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
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${redirectPath}`,
          data: { username: username.trim(), lang },
        },
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true, requiresOtp: !data?.session };
    } catch (err) {
      return { ok: false, error: normalizeError(err, "Sign-up failed") };
    }
  }

  async function verifyPasswordResetOtp(
    email: string,
    code: string,
    newPassword?: string
  ): Promise<AuthResult> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim().replace(/\D/g, "");
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return {
        ok: false,
        error: lang === "ar" ? "البريد الإلكتروني غير صالح" : "Invalid email address",
      };
    }
    if (cleanCode.length < 6 || cleanCode.length > 10) {
      return {
        ok: false,
        error: lang === "ar" ? "يرجى إدخال رمز التحقق بشكل صحيح" : "Please enter a valid verification code",
      };
    }
    if (newPassword !== undefined && newPassword.length < 6) {
      return {
        ok: false,
        error: lang === "ar" ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters",
      };
    }

    try {
      // 1. Verify OTP with Supabase GoTrue
      let verifyRes = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanCode,
        type: "recovery",
      });

      if (verifyRes.error) {
        // Fallback check with type 'email'
        const fbRes = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanCode,
          type: "email",
        });
        if (!fbRes.error && fbRes.data?.session) {
          verifyRes = fbRes;
        }
      }

      if (verifyRes.error || !verifyRes.data?.session) {
        return {
          ok: false,
          error:
            lang === "ar"
              ? "رمز التحقق غير صحيح أو انتهت صلاحيته. يرجى التأكد من الرمز والمحاولة مجدداً."
              : "Invalid or expired verification code. Please check and try again.",
        };
      }

      // 2. Set new password if provided
      if (newPassword) {
        const { data: updateData, error: updateError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (updateError) {
          return { ok: false, error: updateError.message };
        }

        // 3. Record security audit event
        try {
          void recordAuthAttemptServer({
            data: {
              email: cleanEmail,
              type: "reset_success",
              status: "success",
              userId: updateData?.user?.id || verifyRes.data.user?.id,
            },
          }).catch(() => {});
        } catch {}
      }

      return { ok: true };
    } catch (err) {
      return { ok: false, error: normalizeError(err, "Verification failed") };
    }
  }

  async function updatePassword(newPassword: string): Promise<AuthResult> {
    if (!newPassword || newPassword.length < 6) {
      return {
        ok: false,
        error: lang === "ar" ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters",
      };
    }
    try {
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) {
        return { ok: false, error: updateError.message };
      }
      try {
        const userEmail = updateData?.user?.email;
        if (userEmail) {
          void recordAuthAttemptServer({
            data: {
              email: userEmail,
              type: "reset_success",
              status: "success",
              userId: updateData?.user?.id,
            },
          }).catch(() => {});
        }
      } catch {}
      return { ok: true };
    } catch (err) {
      return { ok: false, error: normalizeError(err, "Password update failed") };
    }
  }

  async function verifySignUpOtp(email: string, code: string): Promise<AuthResult> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim().replace(/\D/g, "");
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return {
        ok: false,
        error: lang === "ar" ? "البريد الإلكتروني غير صالح" : "Invalid email address",
      };
    }
    if (cleanCode.length < 6 || cleanCode.length > 10) {
      return {
        ok: false,
        error: lang === "ar" ? "يرجى إدخال رمز التحقق بشكل صحيح" : "Please enter a valid verification code",
      };
    }

    try {
      let verifyRes = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanCode,
        type: "signup",
      });

      if (verifyRes.error) {
        const fbRes = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanCode,
          type: "email",
        });
        if (!fbRes.error && fbRes.data?.session) {
          verifyRes = fbRes;
        }
      }

      if (verifyRes.error || !verifyRes.data?.user) {
        return {
          ok: false,
          error:
            lang === "ar"
              ? "رمز التحقق غير صحيح أو انتهت صلاحيته. يرجى التأكد من الرمز والمحاولة مجدداً."
              : "Invalid or expired verification code. Please check and try again.",
        };
      }

      try {
        void recordAuthAttemptServer({
          data: {
            email: cleanEmail,
            type: "login_success",
            status: "success",
            userId: verifyRes.data.user.id,
          },
        }).catch(() => {});
      } catch {}

      return { ok: true };
    } catch (err) {
      return { ok: false, error: normalizeError(err, "Sign-up verification failed") };
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

      // Clear any legacy 1-hour cooldown from local storage
      const localKey = `gx_pw_reset_${cleanEmail}`;
      try {
        localStorage.removeItem(localKey);
      } catch {}

      // Authoritative server-side reset (SEC-08):
      //    - GoTrue dispatch (OTP mode: NO redirectTo so numeric code is sent)
      try {
        const res = await requestPasswordResetServer({
          data: {
            email: cleanEmail,
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
            isGuestOnly: Boolean((res as any).isGuestOnly),
          };
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

  return {
    signIn,
    signUp,
    resetPassword,
    verifyPasswordResetOtp,
    updatePassword,
    verifySignUpOtp,
    signInWithGoogle,
    verify2fa,
    cancel2fa,
  };
}
