import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabase as defaultSupabase } from "@/integrations/supabase/client";
import { resolveSafeClientIp } from "./ip";
import { recordSecurityEvent } from "./security-audit.server";

/* ============================================================
   PASSWORD RESET SERVER HANDLER & RATE LIMITING (SEC-08)
   - Server-side IP rate limiting (5 attempts per 15 mins)
   - Authoritative database cooldown check & request logging
   - Standard Supabase GoTrue token delivery
   - Zero sensitive credentials exposed
   ============================================================ */

const ipResetRateMap = new Map<string, number[]>();
const RESET_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_RESETS_PER_IP = 5;

function checkResetIpRateLimit(ip: string): boolean {
  const now = Date.now();
  const times = ipResetRateMap.get(ip) ?? [];
  const recent = times.filter((t) => now - t < RESET_WINDOW_MS);

  if (recent.length >= MAX_RESETS_PER_IP) {
    return false;
  }

  recent.push(now);
  ipResetRateMap.set(ip, recent);
  return true;
}

export type PasswordResetHandlerResult = {
  ok: boolean;
  message?: string;
  isGuestOnly?: boolean;
};

export async function handlePasswordReset(
  data: { email: string; redirectTo?: string; lang?: "ar" | "en" },
  callerIp?: string,
  clientOverride?: typeof defaultSupabase
): Promise<PasswordResetHandlerResult> {
  const cleanEmail = data.email.trim().toLowerCase();
  const lang = data.lang || "ar";

  if (!cleanEmail || !cleanEmail.includes("@") || cleanEmail.length > 160) {
    throw new Error("Invalid email format");
  }

  // 1. IP rate limiting (anti-spam / anti-enumeration)
  const ip = (callerIp || "127.0.0.1").trim();
  if (!checkResetIpRateLimit(ip)) {
    return {
      ok: false,
      message:
        lang === "ar"
          ? "تم تجاوز الحد المسموح به لطلبات استعادة كلمة المرور. يرجى الانتظار 15 دقيقة."
          : "Too many password reset requests from this connection. Please wait 15 minutes.",
    };
  }

  const supabaseClient = clientOverride || defaultSupabase;

  // 2. Authoritative database cooldown check via RPC
  try {
    const { data: cooldown } = await (supabaseClient.rpc as any)("check_password_reset_cooldown", {
      _email: cleanEmail,
    });

    if (cooldown && cooldown.allowed === false) {
      const msg =
        (lang === "en" ? cooldown.message_en : cooldown.message_ar) ||
        (lang === "ar"
          ? `لا يمكنك إعادة إرسال رابط تعيين كلمة المرور إلا بعد مرور ساعة. يرجى الانتظار ${cooldown.remaining_minutes || 60} دقيقة.`
          : `You can only request a password reset once per hour. Please wait ${cooldown.remaining_minutes || 60} minutes.`);
      return { ok: false, message: msg };
    }
  } catch {
    // ignore cooldown check errors
  }

  // 2.2 Set user language preference in auth metadata so Supabase email template renders in the user's language
  try {
    await (supabaseClient.rpc as any)("set_user_preferred_language", {
      _email: cleanEmail,
      _lang: lang,
    });
  } catch {
    // ignore if rpc is not present
  }

  // 2.5 Check if this email is an unregistered guest purchaser
  try {
    const { data: profile } = await (supabaseClient as any)
      .from("profiles")
      .select("id")
      .ilike("email", cleanEmail)
      .maybeSingle();

    if (!profile) {
      const { data: guestOrder } = await (supabaseClient as any)
        .from("orders")
        .select("id")
        .ilike("customer_email", cleanEmail)
        .limit(1)
        .maybeSingle();

      if (guestOrder) {
        return {
          ok: false,
          isGuestOnly: true,
          message:
            lang === "ar"
              ? "هذا البريد الإلكتروني لديه طلبات شراء مسجلة كزائر، ولكنه غير مسجل كحساب بعد في المتجر. يرجى الضغط على «إنشاء حساب جديد» واستخدام نفس البريد لتفعيل حسابك واستلام طلباتك."
              : "This email has guest purchases but no account has been registered yet. Please click 'Create Account' to set a password and access your orders.",
        };
      }
    }
  } catch {}

  // 3. Trigger Supabase GoTrue password reset
  const options = data.redirectTo ? { redirectTo: data.redirectTo } : undefined;
  const { error: resetError } = await (supabaseClient.auth.resetPasswordForEmail as any)(
    cleanEmail,
    options
  );

  const genericSuccessMessage = data.redirectTo
    ? (lang === "ar"
        ? "إذا كان هذا البريد مسجلاً لدينا، فسيتم إرسال رابط استعادة كلمة المرور إليه."
        : "If this email is registered, a password reset link will be sent.")
    : (lang === "ar"
        ? "إذا كان هذا البريد مسجلاً لدينا، فسيتم إرسال رمز التحقق (OTP) المكوّن من 6 أرقام إليه."
        : "If this email is registered, a 6-digit verification code will be sent.");

  if (resetError) {
    const errMsg = (resetError.message || "").toLowerCase();
    const isRateLimited =
      errMsg.includes("rate limit") ||
      errMsg.includes("too many") ||
      (resetError as any).status === 429;

    if (isRateLimited) {
      return {
        ok: false,
        message:
          lang === "ar"
            ? "تم تجاوز الحد المسموح به لطلبات استعادة كلمة المرور. يرجى الانتظار قليلاً."
            : "Too many password reset requests. Please wait a moment.",
      };
    }

    // For "User not found" or other existence errors, return generic message to prevent account enumeration
    return { ok: true, message: genericSuccessMessage };
  }

  // 4. Authoritatively record reset request on the server
  try {
    await (supabaseClient.rpc as any)("record_password_reset_request", { _email: cleanEmail });
  } catch {
    // noop
  }

  return { ok: true, message: genericSuccessMessage };
}

export const requestPasswordResetServer = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({
      email: z.string().trim().email().max(160),
      redirectTo: z.string().max(300).optional(),
      lang: z.enum(["ar", "en"]).default("ar"),
    }).parse(data)
  )
  .handler(async ({ data }): Promise<PasswordResetHandlerResult> => {
    let ip = "127.0.0.1";
    try {
      ip = resolveSafeClientIp(getRequestHeader);
    } catch {
      ip = "127.0.0.1";
    }

    try {
      recordSecurityEvent({
        type: "reset_request",
        email: data.email,
        ip,
        userAgent: getRequestHeader("user-agent") || null,
        headers: getRequestHeader,
        status: "flagged",
      });
    } catch (err) {
      console.error("[Auth] Failed to record reset attempt:", err);
    }

    return handlePasswordReset(data, ip);
  });
