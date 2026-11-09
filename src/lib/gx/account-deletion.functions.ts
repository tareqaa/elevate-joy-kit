import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { getResendApiKey } from "./resend-key";
import { renderGxStoreEmail, escapeHtml } from "./email-theme";

import { getSupabaseUrl, getSupabasePublishableKey } from "@/integrations/supabase/config";

const SENDER_EMAIL = "GX Store <support@gxstore.me>";

function getSupabaseClient(accessToken?: string) {
  const url = getSupabaseUrl();
  const anonKey = getSupabasePublishableKey();
  return createClient(url, anonKey, {
    auth: { persistSession: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });
}

async function resolveActiveResendKey(): Promise<string> {
  try {
    const key = await getResendApiKey();
    if (key && key.trim().startsWith("re_")) return key.trim();
  } catch {}

  const envKey = process.env.RESEND_API_KEY || (process.env as any).VITE_RESEND_API_KEY;
  if (envKey && typeof envKey === "string" && envKey.trim().startsWith("re_")) {
    return envKey.trim();
  }

  return "";
}

export const scheduleAccountDeletionDirectFn = createServerFn({ method: "POST" })
  .validator((d: { accessToken?: string; reason?: string; email?: string; lang?: "ar" | "en" }) => d)
  .handler(async ({ data }) => {
    try {
      if (!data.accessToken) {
        return { ok: false, error: "يجب تسجيل الدخول أولاً" };
      }

      const client = getSupabaseClient(data.accessToken);
      const { data: rpcRes, error: rpcErr } = await (client as any).rpc("schedule_account_deletion_direct", {
        _reason: data.reason || null,
      });

      if (rpcErr) {
        console.error("[GX] schedule_account_deletion_direct RPC error:", rpcErr);
        return { ok: false, error: rpcErr.message || "تعذّر جدولة حذف الحساب" };
      }

      if (!rpcRes?.ok) {
        return { ok: false, error: rpcRes?.message || "تعذّر حذف الحساب" };
      }

      const email = rpcRes.email || data.email;
      const isArabic = data.lang === "ar";

      if (email) {
        try {
          const subject = isArabic
            ? "تم استلام طلب حذف حسابك في متجر GX Store"
            : "We've received your request to delete your GX Store account";

          const formattedDate = new Date().toLocaleDateString(isArabic ? "ar-JO" : "en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });

          const notificationHtml = isArabic
            ? renderGxStoreEmail({
                lang: "ar",
                subject,
                headline: "طلب حذف الحساب",
                greetingText: "مرحباً يا بطل،",
                bodyText:
                  "تلقينا للتو طلبك لحذف حسابك في متجر GX Store. سيتم حذف حسابك نهائياً بعد 14 يوماً، بشرط عدم تسجيل الدخول خلال هذه المدة.",
                introDetailsText:
                  "بمجرد حذف حسابك، لن تتمكن بعد الآن من الوصول إلى مجموعتك أو سجل طلباتك أو بياناتك الأخرى على متجر GX Store. وستصبح عضويتك في GX Plus (إن وجدت) غير نشطة.",
                ctaButton: {
                  text: "تسجيل الدخول للاحتفاظ بالحساب",
                  url: "https://gxstore.me/login",
                },
                meta: {
                  orderIdLabel: "نوع الطلب",
                  orderIdValue: "حذف الحساب (مهلة 14 يوماً)",
                  dateLabel: "تاريخ الطلب",
                  dateValue: formattedDate,
                  emailLabel: "البريد الإلكتروني",
                  emailValue: email,
                },
                summaryTitle: "إشعار مهلة حذف الحساب",
                notesHtml: `
<div style="font-size:13.5px;line-height:1.75;color:#e2e8f0;">
  إذا غيرت رأيك وقررت البقاء معنا، فما عليك سوى تسجيل الدخول مرة أخرى باستخدام بريدك الإلكتروني وكلمة المرور في أي وقت خلال الـ 14 يوماً لإلغاء الحذف فوراً واستعادة حسابك.
</div>
                `.trim(),
                closingMessageHtml: `
<p style="margin:0 0 12px;color:#cbd5e1;line-height:1.6;">
  شكراً لاختيارك متجرنا لمغامرتك في عالم الألعاب!
</p>
<p style="margin:0;font-weight:700;color:#ffffff;">
  أطيب التمنيات،<br>
  فريق GX Store
</p>
                `.trim(),
              })
            : renderGxStoreEmail({
                lang: "en",
                subject,
                headline: "Account Deletion Request",
                greetingText: "Hello Gamer,",
                bodyText:
                  "We've just received your request to delete your GX Store account. Your account will be permanently deleted in 14 days, provided you don't sign in during that time.",
                introDetailsText:
                  "Once your account is deleted, you will no longer have access to your collection, your order history, and other data on GX Store. Your GX Plus membership, if you have one, will become inactive.",
                ctaButton: {
                  text: "Sign In to Keep Your Account",
                  url: "https://gxstore.me/login",
                },
                meta: {
                  orderIdLabel: "REQUEST TYPE",
                  orderIdValue: "Account Deletion (14-day hold)",
                  dateLabel: "REQUEST DATE",
                  dateValue: formattedDate,
                  emailLabel: "ACCOUNT EMAIL",
                  emailValue: email,
                },
                summaryTitle: "Account Deletion Notice",
                notesHtml: `
<div style="font-size:13.5px;line-height:1.75;color:#e2e8f0;">
  If you change your mind and decide to stay, simply sign back in with your current email and password.
</div>
                `.trim(),
                closingMessageHtml: `
<p style="margin:0 0 12px;color:#cbd5e1;line-height:1.6;">
  Thanks for choosing us for your gaming adventure!
</p>
<p style="margin:0;font-weight:700;color:#ffffff;">
  Best wishes,<br>
  Team GX Store
</p>
                `.trim(),
              });

          const apiKey = await resolveActiveResendKey();
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: SENDER_EMAIL,
              to: [email],
              subject,
              html: notificationHtml,
            }),
          });
        } catch (mailErr) {
          console.error("[GX] Error sending deletion notice email:", mailErr);
        }
      }

      return {
        ok: true,
        message: "تم استلام طلب حذف الحساب بنجاح وجدولته لمدة 14 يوماً",
      };
    } catch (err: any) {
      console.error("[GX] Error in scheduleAccountDeletionDirectFn:", err);
      return { ok: false, error: err?.message || "حدث خطأ غير متوقع أثناء جدولة حذف الحساب" };
    }
  });

// Backward compatible aliases
export const requestAccountDeletionOtpFn = scheduleAccountDeletionDirectFn;
export const confirmAccountDeletionFn = scheduleAccountDeletionDirectFn;


export const adminDeleteUserPermanentlyFn = createServerFn({ method: "POST" })
  .validator((d: { accessToken?: string; targetUserId: string; adminPassword?: string }) => d)
  .handler(async ({ data }) => {
    try {
      if (!data.accessToken) return { ok: false, error: "غير مصرح" };
      const client = getSupabaseClient(data.accessToken);

      if (data.adminPassword) {
        const { data: userRes, error: userErr } = await client.auth.getUser();
        if (userErr || !userRes?.user?.email) {
          return { ok: false, error: "تعذر التحقق من جلسة المشرف، يرجى إعادة تسجيل الدخول" };
        }
        const url = getSupabaseUrl();
        const anonKey = getSupabasePublishableKey();
        const authClient = createClient(url, anonKey, { auth: { persistSession: false } });
        const { error: signInErr } = await authClient.auth.signInWithPassword({
          email: userRes.user.email,
          password: data.adminPassword,
        });
        if (signInErr) {
          return { ok: false, error: "كلمة مرور حساب المشرف غير صحيحة" };
        }
      }

      const { data: res, error } = await (client as any).rpc("admin_delete_user_permanently", {
        _target_user_id: data.targetUserId,
      });
      if (error) {
        console.error("[GX] admin_delete_user_permanently error:", error);
        return { ok: false, error: error.message };
      }
      return res;
    } catch (err: any) {
      return { ok: false, error: err?.message || "فشل حذف المستخدم" };
    }
  });
