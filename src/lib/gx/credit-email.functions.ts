import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assertAdminCaller, getUserScopedClient } from "@/lib/gx/supabase-request";
import { getResendApiKey } from "./resend-key";
import { renderDriffleEmail } from "./email-theme";

const SENDER_EMAIL = "GX Store <support@gxstore.me>";

/** A notice may only be sent for a credit this admin recorded in the last few minutes. */
const CREDIT_NOTICE_WINDOW_MS = 15 * 60 * 1000;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type SendCreditEmailInput = {
  email: string;
  amountJod: number;
  reason?: string;
  isRegistered?: boolean;
  username?: string;
  coins?: number;
  xp?: number;
};

type VerifiedCredit = {
  email: string;
  amountJod: number;
  reason: string;
  isRegistered: boolean;
  username?: string;
  coins: number;
  xp: number;
};

/**
 * Binds the email to a real credit operation recorded server-side by the calling
 * admin. Recipient, amount and reason all come from the database record, never
 * from the request, so the endpoint cannot be used to email arbitrary people
 * arbitrary text in the store's name.
 */
async function loadRecentCredit(
  token: string,
  adminId: string,
  email: string,
  amountJod: number,
): Promise<VerifiedCredit | null> {
  const db = getUserScopedClient(token) as any;
  const since = new Date(Date.now() - CREDIT_NOTICE_WINDOW_MS).toISOString();
  const normEmail = email.trim().toLowerCase();

  // Registered customer: credit was added straight to their wallet.
  const { data: profile } = await db
    .from("profiles")
    .select("id, username, email")
    .ilike("email", normEmail.replace(/[\\%_]/g, (c) => `\\${c}`))
    .maybeSingle();
  if (profile?.id) {
    const { data: tx } = await db
      .from("store_credit_transactions")
      .select("amount_jod, reason, created_at")
      .eq("user_id", profile.id)
      .eq("actor_id", adminId)
      .gt("amount_jod", 0)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(10);
    const match = (tx ?? []).find(
      (r: any) => Math.abs(Number(r.amount_jod) - amountJod) < 0.0001,
    );
    if (!match) return null;
    return {
      email: String(profile.email || normEmail).toLowerCase(),
      amountJod: Number(match.amount_jod),
      reason: String(match.reason || ""),
      isRegistered: true,
      username: profile.username || undefined,
      coins: 0,
      xp: 0,
    };
  }

  // Not registered yet: credit is parked against the email until sign-up.
  const { data: pending } = await db
    .from("pending_email_credits")
    .select("email, amount_jod, coins, xp, reason, created_at")
    .eq("email", normEmail)
    .eq("created_by", adminId)
    .eq("status", "pending")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(10);
  const match = (pending ?? []).find(
    (r: any) => Math.abs(Number(r.amount_jod) - amountJod) < 0.0001,
  );
  if (!match) return null;
  return {
    email: String(match.email).toLowerCase(),
    amountJod: Number(match.amount_jod),
    reason: String(match.reason || ""),
    isRegistered: false,
    coins: Number(match.coins || 0),
    xp: Number(match.xp || 0),
  };
}

export const sendCreditNotificationEmail = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        email: z.string().trim().email().max(254),
        amountJod: z.number().positive().max(100000),
        reason: z.string().max(500).optional(),
        isRegistered: z.boolean().default(false),
        username: z.string().max(100).optional(),
        coins: z.number().optional(),
        xp: z.number().optional(),
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    try {
      const caller = await assertAdminCaller();
      const verified = await loadRecentCredit(caller.token, caller.userId, data.email, data.amountJod);
      if (!verified) {
        return { ok: false, error: "لا يوجد رصيد مسجّل حديثاً لهذا البريد لإرسال إشعار عنه" };
      }
      const email = escapeHtml(verified.email);
      const amountJod = verified.amountJod;
      const isRegistered = verified.isRegistered;
      const username = verified.username ? escapeHtml(verified.username) : undefined;
      // Loyalty extras for registered users are logged separately; only show what the admin entered alongside this credit.
      const coins = isRegistered ? Math.max(0, Math.floor(Number(data.coins || 0))) : verified.coins;
      const xp = isRegistered ? Math.max(0, Math.floor(Number(data.xp || 0))) : verified.xp;
      const formattedAmount = `${Number(amountJod).toFixed(2)} د.أ`;
      const rawReason = verified.reason.trim() || "إيداع رصيد من إدارة المتجر";
      const cleanReason = escapeHtml(rawReason);

      // Detect if the reason is compensation, refund, or general deposit vs a gift/reward
      const isCompensation = /تعويض|استرجاع|إرجاع|بدل|حل مشكلة|شكوى|تأخير/i.test(rawReason);
      const isGift = /هدية|مكافأة|فوز|مسابقة|ترقية|بونص/i.test(rawReason);

      // Subject is plain text (not HTML), so it uses the raw reason.
      const subject =
        (isCompensation
          ? `إشعار إيداع رصيد بقيمة ${formattedAmount} لحسابكم (${rawReason}) — متجر GX Store`
          : isGift
          ? `🎁 مكافأة رصيد بقيمة ${formattedAmount} لحسابك — متجر GX Store`
          : isRegistered
          ? `إشعار إيداع رصيد بقيمة ${formattedAmount} في محفظتك — متجر GX Store`
          : `إشعار تخصيص رصيد بقيمة ${formattedAmount} لبريدك الإلكتروني — متجر GX Store`);

      const headerTitle =
        (isCompensation
          ? `إشعار إيداع رصيد (${cleanReason})`
          : isGift
          ? "تمت إضافة رصيد مكافأة لحسابك!"
          : isRegistered
          ? "إشعار إيداع رصيد جديد بالمحفظة"
          : "إشعار إيداع وتخصيص رصيد لحسابك");

      const actionUrl = isRegistered
        ? "https://gxstore.me"
        : "https://gxstore.me/auth";

      const actionButtonText = isRegistered
        ? "🛍️ تصفح المتجر والمحفظة"
        : "✨ تسجيل الدخول وتفعيل الرصيد فوراً";

      const introText =
        (isCompensation
          ? `نحيطك علماً بأنه تم إيداع رصيد مالي بقيمة <strong>${formattedAmount}</strong> لحسابكم تقديراً لتعاملكم و${cleanReason}:`
          : isRegistered
          ? "يسرنا إعلامك بأنه تم شحن محفظتك في متجر <strong>GX Store</strong> برصيد جديد يمكنك استخدامه مباشرة عند الشراء:"
          : `يسعدنا إعلامك بأنه تم تخصيص وإيداع رصيد بقيمة <strong>${formattedAmount}</strong> لبريدك الإلكتروني، وهو محجوز لك حالياً وبانتظار تسجيلك بالموقع:`);

      const customCreditCard = `
        <div style="background:#18181b;border:1px solid #27272a;border-radius:14px;padding:24px 20px;text-align:center;margin:0 auto 20px;max-width:380px;">
          <div style="font-size:12px;color:#71717a;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">
            ${isCompensation ? "قيمة رصيد التعويض المضاف" : "قيمة الرصيد المضاف بالمحفظة"}
          </div>
          <div style="font-size:36px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;direction:ltr;unicode-bidi:isolate;">
            ${formattedAmount}
          </div>
          ${
            (coins || 0) > 0 || (xp || 0) > 0
              ? `<div style="margin-top:10px;font-size:12.5px;color:#fbbf24;font-weight:700;">
                  ${(coins || 0) > 0 ? `+${coins} عملة GX Coins ` : ""}
                  ${(xp || 0) > 0 ? `+${xp} XP ` : ""}
                 </div>`
              : ""
          }
          <div style="border-top:1px solid #27272a;margin:16px 0 12px;"></div>
          <div style="font-size:13px;color:#a1a1aa;">
            البيان / سبب الإيداع: <strong style="color:#ffffff;">${cleanReason}</strong>
          </div>
        </div>
      `;

      const cleanIntro = introText.replace(/<[^>]+>/g, " ");

      const html = renderDriffleEmail({
        lang: "ar",
        subject,
        headline: headerTitle,
        greetingText: `مرحباً بك${username ? ` (@${username})` : " عزيزنا العميل"} 👋،`,
        bodyText: cleanIntro,
        introDetailsText: "إليك تفاصيل الرصيد المودع:",
        ctaButton: {
          text: actionButtonText,
          url: actionUrl,
        },
        meta: {
          orderIdLabel: "نوع المعاملة (TRANSACTION)",
          orderIdValue: isCompensation ? "إيداع تعويض (Compensation)" : "إيداع رصيد (Store Credit)",
          dateLabel: "تاريخ العملية (DATE)",
          dateValue: new Date().toLocaleDateString("ar-JO"),
          emailLabel: "البريد الإلكتروني (EMAIL ID)",
          emailValue: email,
        },
        summaryTitle: "تفاصيل الرصيد المودع (CREDIT SUMMARY)",
        customSummaryHtml: customCreditCard,
        notesHtml: !isRegistered
          ? `<div style="font-size:13px;color:#e4e4e7;line-height:1.7;">💡 <strong>كيف تستفيد من الرصيد؟</strong> تم ربط هذا الرصيد ببريدك الإلكتروني (${email}). يمكنك تسجيل الدخول بنفس البريد لتجد الرصيد متاحاً في محفظتك تلقائياً وجاهزاً للاستخدام عند الشراء فوراً!</div>`
          : undefined,
        closingMessageHtml: `<p style="margin:0 0 12px;">يمكنك استخدام رصيدك في أي وقت لشراء أي من منتجات أو اشتراكات المتجر بضغطة زر عند الدفع.</p><p style="margin:0 0 14px;color:#38bdf8;font-weight:700;">نحن دائماً هنا لمساعدتك!</p><p style="margin:0;font-weight:700;color:#ffffff;">مع أطيب التحيات،<br>فريق عمل GX Store</p>`,
      });

      const apiKey = await getResendApiKey();
      if (!apiKey) {
        console.error("Resend API key is not configured.");
        return { ok: false, error: "Resend API key is not configured" };
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: SENDER_EMAIL,
          to: [verified.email],
          subject,
          html,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        console.error("Resend send error:", result);
        return {
          ok: false,
          error: result?.message || "Failed to send email via Resend",
        };
      }

      return { ok: true, emailId: result?.id };
    } catch (err: any) {
      console.error("Error sending credit email:", err);
      return { ok: false, error: err?.message || "Internal error sending email" };
    }
  });
