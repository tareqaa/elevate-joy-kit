import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getPublicClient, assertAdminCaller } from "@/lib/gx/supabase-request";

const SENDER_EMAIL = "GX Store <support@gxstore.me>";

async function getResendApiKey(): Promise<string> {
  const envKey = process.env.RESEND_API_KEY;
  if (envKey && envKey.trim()) return envKey.trim();
  return "";
}

export type SendCreditEmailInput = {
  email: string;
  amountJod: number;
  reason?: string;
  isRegistered?: boolean;
  username?: string;
  coins?: number;
  xp?: number;
  customSubject?: string;
  customTitle?: string;
  customMessage?: string;
};

export const sendCreditNotificationEmail = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        email: z.string().trim().email(),
        amountJod: z.number().positive(),
        reason: z.string().optional(),
        isRegistered: z.boolean().default(false),
        username: z.string().optional(),
        coins: z.number().optional(),
        xp: z.number().optional(),
        customSubject: z.string().optional(),
        customTitle: z.string().optional(),
        customMessage: z.string().optional(),
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    try {
      await assertAdminCaller();
      const {
        email,
        amountJod,
        reason,
        isRegistered,
        username,
        coins,
        xp,
        customSubject,
        customTitle,
        customMessage,
      } = data;
      const formattedAmount = `${Number(amountJod).toFixed(2)} د.أ`;
      const cleanReason = (reason || "").trim() || "إيداع رصيد من إدارة المتجر";

      // Detect if the reason is compensation, refund, or general deposit vs a gift/reward
      const isCompensation = /تعويض|استرجاع|إرجاع|بدل|حل مشكلة|شكوى|تأخير/i.test(cleanReason);
      const isGift = /هدية|مكافأة|فوز|مسابقة|ترقية|بونص/i.test(cleanReason);

      // Determine subject: prioritize explicit custom subject, then compensation/neutral, then general
      const subject =
        customSubject?.trim() ||
        (isCompensation
          ? `إشعار إيداع رصيد بقيمة ${formattedAmount} لحسابكم (${cleanReason}) — متجر GX Store`
          : isGift
          ? `🎁 مكافأة رصيد بقيمة ${formattedAmount} لحسابك — متجر GX Store`
          : isRegistered
          ? `إشعار إيداع رصيد بقيمة ${formattedAmount} في محفظتك — متجر GX Store`
          : `إشعار تخصيص رصيد بقيمة ${formattedAmount} لبريدك الإلكتروني — متجر GX Store`);

      const headerTitle =
        customTitle?.trim() ||
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
        customMessage?.trim() ||
        (isCompensation
          ? `نحيطك علماً بأنه تم إيداع رصيد مالي بقيمة <strong>${formattedAmount}</strong> لحسابكم تقديراً لتعاملكم و${cleanReason}:`
          : isRegistered
          ? "يسرنا إعلامك بأنه تم شحن محفظتك في متجر <strong>GX Store</strong> برصيد جديد يمكنك استخدامه مباشرة عند الشراء:"
          : `يسعدنا إعلامك بأنه تم تخصيص وإيداع رصيد بقيمة <strong>${formattedAmount}</strong> لبريدك الإلكتروني، وهو محجوز لك حالياً وبانتظار تسجيلك بالموقع:`);

      const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#070a13;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f1f5f9;direction:rtl;text-align:right;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#070a13;width:100%;padding:30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:linear-gradient(180deg,#111827 0%,#0c121e 100%);border:1px solid #1e293b;border-radius:18px;overflow:hidden;box-shadow:0 15px 35px rgba(0,0,0,0.5);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg,rgba(0,229,255,0.15) 0%,rgba(0,112,240,0.2) 100%);padding:28px 24px 22px;border-bottom:1px solid rgba(0,229,255,0.15);text-align:center;">
              <div style="display:inline-block;padding:6px 14px;background:rgba(0,0,0,0.4);border:1px solid rgba(0,229,255,0.3);border-radius:30px;margin-bottom:12px;">
                <span style="font-size:12px;font-weight:700;letter-spacing:1px;color:#00e5ff;text-transform:uppercase;">⚡ GX STORE</span>
              </div>
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;line-height:1.4;">
                ${headerTitle}
              </h1>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding:28px 24px;">
              <p style="margin:0 0 18px;font-size:15px;line-height:1.8;color:#cbd5e1;">
                مرحباً بك${username ? ` <strong style="color:#00e5ff;">@${username}</strong>` : ""}،
                <br>
                ${introText}
              </p>

              <!-- Amount Highlight Box -->
              <div style="background:linear-gradient(145deg,rgba(0,229,255,0.08),rgba(14,165,233,0.03));border:1px solid rgba(0,229,255,0.25);border-radius:14px;padding:22px;text-align:center;margin:22px 0;">
                <div style="font-size:12px;color:#94a3b8;font-weight:600;margin-bottom:6px;">قيمة الرصيد المضاف</div>
                <div style="font-size:36px;font-weight:900;color:#38bdf8;letter-spacing:-0.5px;">
                  ${formattedAmount}
                </div>
                ${
                  (coins || 0) > 0 || (xp || 0) > 0
                    ? `<div style="margin-top:8px;font-size:12px;color:#fbbf24;font-weight:600;">
                        ${(coins || 0) > 0 ? `+${coins} عملة GX Coins ` : ""}
                        ${(xp || 0) > 0 ? `+${xp} XP ` : ""}
                       </div>`
                    : ""
                }
              </div>

              <!-- Details Info Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:10px;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.05);color:#94a3b8;font-size:13px;width:35%;">البريد الإلكتروني</td>
                  <td style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.05);color:#ffffff;font-size:13px;font-family:monospace;" dir="ltr">${email}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;color:#94a3b8;font-size:13px;">سبب الإيداع / البيان</td>
                  <td style="padding:12px 16px;color:#38bdf8;font-size:13px;font-weight:600;">${cleanReason}</td>
                </tr>
              </table>

              <!-- Notice Box for Unregistered -->
              ${
                !isRegistered
                  ? `<div style="background:rgba(0,229,255,0.05);border:1px dashed rgba(0,229,255,0.3);border-radius:10px;padding:14px 16px;margin-bottom:24px;">
                      <div style="font-size:13px;font-weight:700;color:#00e5ff;margin-bottom:4px;">💡 كيف تستفيد من الرصيد؟</div>
                      <div style="font-size:12px;color:#cbd5e1;line-height:1.6;">
                        تم ربط هذا الرصيد ببريدك الإلكتروني (<strong>${email}</strong>). إذا لم يكن لديك حساب مسجل بعد، يمكنك فتح حساب جديد بنفس هذا البريد لتجد الرصيد متاحاً في محفظتك تلقائياً وجاهزاً للاستخدام عند الشراء فوراً!
                      </div>
                    </div>`
                  : ""
              }

              <!-- Action CTA Button -->
              <div style="text-align:center;margin:28px 0 16px;">
                <a href="${actionUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#00e5ff 0%,#0070f0 100%);color:#070a13;text-decoration:none;font-size:14px;font-weight:800;padding:14px 32px;border-radius:10px;box-shadow:0 4px 15px rgba(0,229,255,0.35);">
                  ${actionButtonText}
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#090d16;padding:20px 24px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:#64748b;line-height:1.6;">
                متجر <strong>GX Store</strong> — وجهتك الأولى للألعاب والاشتراكات والبطاقات الرقمية.
              </p>
              <p style="margin:0;font-size:11px;color:#475569;">
                الدعم الفني متواجد لمساعدتك دائماً عبر: <a href="mailto:support@gxstore.me" style="color:#38bdf8;text-decoration:none;">support@gxstore.me</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

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
          to: [email],
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
