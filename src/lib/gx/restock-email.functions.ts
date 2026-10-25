import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getPublicClient, assertAdminCaller } from "@/lib/gx/supabase-request";

const SENDER_EMAIL = "GX Store <support@gxstore.me>";

async function getResendApiKey(): Promise<string> {
  const envKey = process.env.RESEND_API_KEY;
  if (envKey && envKey.trim()) return envKey.trim();
  return "";
}

export type SendRestockEmailInput = {
  requestId?: string;
  email: string;
  customerName: string;
  productName: string;
  productUrl?: string;
  customMessage?: string;
};

export const sendRestockNotificationEmail = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        requestId: z.string().optional(),
        email: z.string().trim().email(),
        customerName: z.string().trim().min(1),
        productName: z.string().trim().min(1),
        productUrl: z.string().optional(),
        customMessage: z.string().optional(),
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    try {
      await assertAdminCaller();
      const { requestId, email, customerName, productName, productUrl, customMessage } = data;

      const actionUrl = productUrl || "https://gxstore.me";
      const subject = `🎉 أصبح متوفراً الآن! [${productName}] جاهز للطلب — متجر GX Store`;

      const introText =
        customMessage?.trim() ||
        `يسرنا إعلامك بأن المنتج / الاشتراك الذي طلبت إشعاراً عند توفره (<strong>${productName}</strong>) أصبح متاحاً الآن في متجر <strong>GX Store</strong> وجاهزاً للتفعيل والشراء الفوري:`;

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
            <td style="background:linear-gradient(135deg,rgba(0,229,255,0.18) 0%,rgba(0,112,240,0.25) 100%);padding:28px 24px 22px;border-bottom:1px solid rgba(0,229,255,0.2);text-align:center;">
              <div style="display:inline-block;padding:6px 14px;background:rgba(0,0,0,0.4);border:1px solid rgba(0,229,255,0.3);border-radius:30px;margin-bottom:12px;">
                <span style="font-size:12px;font-weight:700;letter-spacing:1px;color:#00e5ff;text-transform:uppercase;">⚡ GX STORE • إشعار التوفر</span>
              </div>
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;line-height:1.4;">
                🎉 وفرنا المنتج الذي طلبته!
              </h1>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding:28px 24px;">
              <p style="margin:0 0 18px;font-size:15px;line-height:1.8;color:#cbd5e1;">
                مرحباً بك عزيزنا <strong style="color:#00e5ff;">${customerName}</strong>،
                <br>
                ${introText}
              </p>

              <!-- Product Highlight Box -->
              <div style="background:linear-gradient(145deg,rgba(0,229,255,0.1),rgba(14,165,233,0.04));border:1.5px solid rgba(0,229,255,0.35);border-radius:14px;padding:22px;text-align:center;margin:22px 0;">
                <div style="font-size:12px;color:#94a3b8;font-weight:600;margin-bottom:6px;">المنتج المطلوب متوفر الآن</div>
                <div style="font-size:22px;font-weight:900;color:#38bdf8;line-height:1.4;">
                  ${productName}
                </div>
                <div style="display:inline-block;margin-top:10px;padding:4px 12px;border-radius:999px;background:rgba(52,211,153,0.15);border:1px solid rgba(52,211,153,0.35);color:#34d399;font-size:12px;font-weight:800;">
                  ✓ متوفر وجاهز للتسليم الفوري
                </div>
              </div>

              <!-- Notice Box -->
              <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:14px 16px;margin-bottom:24px;">
                <div style="font-size:13px;font-weight:700;color:#38bdf8;margin-bottom:4px;">⚡ سارع بالطلب قبل نفاد الكمية!</div>
                <div style="font-size:12px;color:#94a3b8;line-height:1.6;">
                  الكميات والمقاعد المتاحة قد تكون محدودة. ننصح بإتمام طلبك الآن لتأكيد اشتراكك فوراً وبأفضل سعر وضمان كامل.
                </div>
              </div>

              <!-- Action CTA Button -->
              <div style="text-align:center;margin:28px 0 16px;">
                <a href="${actionUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#00e5ff 0%,#0070f0 100%);color:#070a13;text-decoration:none;font-size:15px;font-weight:800;padding:15px 36px;border-radius:12px;box-shadow:0 6px 20px rgba(0,229,255,0.4);">
                  🛍️ اطلب وشاهد المنتج الآن
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

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Resend API error:", errorText);
        return { ok: false, error: errorText };
      }

      const resData = (await response.json()) as { id?: string };

      // Update status in product_restock_requests if requestId provided
      if (requestId) {
        try {
          const supabase = getPublicClient();
          await supabase
            .from("product_restock_requests")
            .update({
              status: "notified",
              notified_at: new Date().toISOString(),
            })
            .eq("id", requestId);
        } catch (dbErr) {
          console.error("Failed to update restock request status in DB:", dbErr);
        }
      }

      return { ok: true, id: resData?.id };
    } catch (err: any) {
      console.error("Error sending restock notification email:", err);
      return { ok: false, error: err.message || "Failed to send email" };
    }
  });
