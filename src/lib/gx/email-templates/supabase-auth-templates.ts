import { renderGxAuthOtpEmail } from "../email-theme";

/**
 * Pre-rendered HTML templates for Supabase Dashboard > Authentication > Email Templates.
 * Replace placeholders like {{ .Token }} when rendered inside Supabase GoTrue.
 */

export function getSupabaseResetPasswordTemplate(): string {
  // Pass '{{ .Token }}' literally so GoTrue replaces it with the 6-digit numeric OTP
  return renderGxAuthOtpEmail({
    lang: "ar",
    purpose: "reset",
    otpCode: "{{ .Token }}",
    email: "{{ .Email }}",
  });
}

export function getSupabaseSignupConfirmationTemplate(): string {
  // Pass '{{ .Token }}' literally so GoTrue replaces it with the 6-digit numeric OTP
  return renderGxAuthOtpEmail({
    lang: "ar",
    purpose: "signup",
    otpCode: "{{ .Token }}",
    email: "{{ .Email }}",
  });
}

