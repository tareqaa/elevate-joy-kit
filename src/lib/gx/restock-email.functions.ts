import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getPublicClient, assertAdminCaller } from "@/lib/gx/supabase-request";
import { getResendApiKey } from "./resend-key";
import { renderDriffleEmail, escapeHtml } from "./email-theme";
import { resolveProductEmailImage } from "./order-email.functions";

const SENDER_EMAIL = "GX Store <support@gxstore.me>";

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
      const subject = `أصبح متوفراً الآن! [${productName}] جاهز للطلب — متجر GX Store`;

      const introText =
        customMessage?.trim() ||
        `يسرنا إعلامك بأن المنتج / الاشتراك الذي طلبت إشعاراً عند توفره (${productName}) أصبح متاحاً الآن في متجر GX Store وجاهزاً للتفعيل والشراء الفوري.`;

      const supabase = getPublicClient();
      const resolvedImg = await resolveProductEmailImage(supabase, { name: productName });

      const html = renderDriffleEmail({
        lang: "ar",
        subject,
        headline: "🎉 أصبح متوفراً الآن!",
        greetingText: "عميلنا العزيز،",
        bodyText: introText,
        introDetailsText: "إليك تفاصيل المنتج المتوفر:",
        ctaButton: {
          text: "🛍️ اطلب وشاهد المنتج الآن",
          url: actionUrl,
        },
        meta: {
          orderIdLabel: "المنتج (PRODUCT)",
          orderIdValue: productName,
          dateLabel: "حالة التوفر (STATUS)",
          dateValue: "✓ متوفر وجاهز للتسليم",
          emailLabel: "البريد الإلكتروني (EMAIL ID)",
          emailValue: email,
        },
        summaryTitle: "تفاصيل المنتج (PRODUCT SUMMARY)",
        products: [
          {
            name: productName,
            image: resolvedImg,
            region: "متوفر الآن في المتجر للتسليم الفوري",
          },
        ],
        notesHtml: `<div style="text-align:center;color:#38bdf8;font-size:13px;font-weight:700;">⚡ الكميات والمقاعد المتاحة قد تكون محدودة، ننصح بإتمام طلبك الآن لتأكيد طلبك فوراً!</div>`,
        closingMessageHtml: `<p style="margin:0 0 12px;">يسعدنا دائماً خدمتك وتوفير أفضل الاشتراكات والألعاب الرقمية لك بأفضل الأسعار وضمان كامل.</p><p style="margin:0 0 14px;color:#38bdf8;font-weight:700;">نحن دائماً هنا لمساعدتك!</p><p style="margin:0;font-weight:700;color:#ffffff;">مع أطيب التحيات،<br>فريق عمل GX Store</p>`,
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
