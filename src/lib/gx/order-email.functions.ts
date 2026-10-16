import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getPublicClient } from "@/lib/gx/supabase-request";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv, supabaseFetch } from "@/lib/gx/supabase-request";
import type { Database } from "@/integrations/supabase/types";

const SENDER_EMAIL = "GX Store <noreply@gxstore.me>";

async function getResendApiKey(): Promise<string> {
  const envKey = process.env.RESEND_API_KEY;
  if (envKey && envKey.trim()) return envKey.trim();
  try {
    const supabase = getPublicClient();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "resend_api_key")
      .maybeSingle();
    const val = data?.value as any;
    if (val?.api_key) return String(val.api_key);
  } catch (e) {
    console.error("Failed to fetch resend_api_key setting:", e);
  }
  return "";
}

function getServerServiceClient() {
  const { url, key: defaultKey } = supabaseEnv();
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SERVICE_ROLE_KEY;
  const key = serviceKey || defaultKey;
  return createClient<Database>(url, key, {
    global: { fetch: supabaseFetch(key) },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export type OrderItemEmail = {
  name: string;
  qty?: number;
  price?: number;
  image?: string;
  region?: string;
  variant?: string;
};

export type SendOrderStatusEmailInput = {
  orderNumber: string;
  status: "delivered" | "cancelled";
  customerEmail: string;
  customerName?: string;
  totalJod: number;
  subtotalJod?: number;
  discountJod?: number;
  paymentMethod?: string;
  items?: OrderItemEmail[];
  notes?: string;
  createdAt?: string;
};

export const sendOrderStatusEmail = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        orderNumber: z.string().trim().min(1),
        status: z.enum(["delivered", "cancelled"]),
        customerEmail: z.string().trim().email(),
        customerName: z.string().optional(),
        totalJod: z.number(),
        subtotalJod: z.number().optional(),
        discountJod: z.number().optional(),
        paymentMethod: z.string().optional(),
        items: z
          .array(
            z.object({
              name: z.string(),
              qty: z.number().optional(),
              price: z.number().optional(),
              image: z.string().optional(),
              region: z.string().optional(),
              variant: z.string().optional(),
            })
          )
          .optional(),
        notes: z.string().optional(),
        createdAt: z.string().optional(),
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    try {
      const {
        orderNumber,
        status,
        customerEmail,
        customerName,
        totalJod,
        subtotalJod,
        discountJod,
        paymentMethod,
        items = [],
        notes,
        createdAt,
      } = data;

      const isDelivered = status === "delivered";
      const formattedTotal = `${Number(totalJod).toFixed(2)} د.أ`;
      const formattedSubtotal = `${Number(subtotalJod ?? totalJod).toFixed(2)} د.أ`;
      const formattedDiscount = discountJod && discountJod > 0 ? `-${Number(discountJod).toFixed(2)} د.أ` : null;

      const dateObj = createdAt ? new Date(createdAt) : new Date();
      const dateFormatted = dateObj.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      const orderUrl = `https://gxstore.me/order/${encodeURIComponent(orderNumber)}`;

      const subject = isDelivered
        ? `Order #${orderNumber} Confirmed & Delivered — GX Store`
        : `Order #${orderNumber} Update / إشعار بشأن طلبك — GX Store`;

      const paymentMethodLabel = (() => {
        const pm = (paymentMethod || "").toLowerCase();
        if (pm === "cliq") return "CliQ 🇯🇴 (خدمة كليك)";
        if (pm === "gx_wallet") return "GX Wallet 🌐 (محفظة المتجر)";
        if (pm === "card") return "Credit / Debit Card 💳 (بطاقة بنكية)";
        return "Electronic Payment / دفع إلكتروني";
      })();

      const greetingName = customerName && customerName.trim() ? customerName.trim() : "Valued Customer";

      // Render product items table matching Driffle style
      const itemsHtml = items.length > 0
        ? items
            .map((item) => {
              const qty = item.qty || 1;
              const price = item.price != null ? `${Number(item.price).toFixed(2)} د.أ` : "";
              const imgTag = item.image
                ? `<img src="${item.image}" alt="${item.name}" width="58" height="58" style="width:58px;height:58px;border-radius:10px;object-fit:cover;border:1px solid rgba(255,255,255,0.1);display:block;">`
                : `<div style="width:58px;height:58px;border-radius:10px;background:#1e293b;border:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;color:#38bdf8;font-size:22px;text-align:center;line-height:58px;">🎮</div>`;

              return `
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:16px;">
                  <tr>
                    <td width="68" valign="top" style="padding-right:12px;">
                      ${imgTag}
                    </td>
                    <td valign="top" style="padding-right:12px;">
                      <div style="color:#ffffff;font-size:14px;font-weight:700;line-height:1.4;margin-bottom:4px;">
                        ${item.name}
                      </div>
                      <div style="color:#94a3b8;font-size:12px;margin-bottom:2px;">
                        ${item.region ? `Order Region: <strong>${item.region}</strong>` : "Digital Product (Global)"}
                      </div>
                      ${qty > 1 ? `<div style="color:#64748b;font-size:11px;">Quantity: x${qty}</div>` : ""}
                    </td>
                    <td width="90" valign="top" align="right" style="color:#ffffff;font-size:14px;font-weight:700;font-family:ui-monospace,Menlo,monospace;white-space:nowrap;">
                      ${price}
                    </td>
                  </tr>
                </table>
              `;
            })
            .join("")
        : `
          <div style="color:#cbd5e1;font-size:13px;padding:8px 0;">
            طلب رقم <strong>${orderNumber}</strong> (${formattedTotal})
          </div>
        `;

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#0c0f17;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f1f5f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0c0f17;width:100%;padding:32px 14px;">
    <tr>
      <td align="center">
        <!-- Main Container Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#111622;border:1px solid #1e293b;border-radius:18px;overflow:hidden;box-shadow:0 20px 45px rgba(0,0,0,0.65);">
          
          <!-- Brand Logo Header -->
          <tr>
            <td style="padding:28px 28px 20px;border-bottom:1px solid rgba(255,255,255,0.06);text-align:center;">
              <div style="display:inline-block;padding:6px 16px;background:rgba(0,229,255,0.08);border:1px solid rgba(0,229,255,0.3);border-radius:999px;">
                <span style="font-size:13px;font-weight:900;letter-spacing:1.5px;color:#00e5ff;text-transform:uppercase;">⚡ GX STORE</span>
              </div>
            </td>
          </tr>

          <!-- Header Title & Hero Greeting -->
          <tr>
            <td style="padding:28px 28px 18px;">
              <h1 style="margin:0 0 16px;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.4px;">
                ${isDelivered ? "Thank you for your purchase" : "Order Cancellation Notice"}
              </h1>
              <p style="margin:0 0 8px;font-size:14px;color:#cbd5e1;line-height:1.6;">
                Hey <strong style="color:#ffffff;">${greetingName}</strong>,
              </p>
              <p style="margin:0 0 18px;font-size:14px;color:#cbd5e1;line-height:1.6;">
                ${
                  isDelivered
                    ? "Thank you for choosing GX Store. We are pleased to inform you that your order has been confirmed and delivered!"
                    : "We are writing to inform you that your order has been cancelled. If you have already paid or need assistance, our support team is available immediately."
                }
              </p>

              ${
                notes && notes.trim()
                  ? `<div style="background:rgba(0,229,255,0.05);border:1px solid rgba(0,229,255,0.25);border-radius:10px;padding:12px 14px;margin-bottom:20px;font-size:13px;color:#38bdf8;line-height:1.5;">
                      <strong>ملاحظات الطلب والتفعيل:</strong><br>${notes.trim()}
                    </div>`
                  : ""
              }

              <p style="margin:0 0 20px;font-size:14px;color:#94a3b8;">
                Here are your order details:
              </p>

              <!-- Prominent CTA Button -->
              <div style="text-align:center;margin:18px 0 28px;">
                <a href="${orderUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#0070f0 0%,#00c3ff 100%);color:#ffffff;text-decoration:none;font-size:15px;font-weight:800;padding:14px 36px;border-radius:10px;box-shadow:0 6px 20px rgba(0,112,240,0.45);letter-spacing:0.3px;">
                  ${isDelivered ? "Redeem product / استلام وتفعيل الطلب 🎮" : "View Order / عرض تفاصيل الطلب"}
                </a>
              </div>

              <!-- Metadata Divider -->
              <div style="border-top:1px solid #1e293b;margin:24px 0 20px;"></div>

              <!-- Order Metadata Info -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:20px;">
                <tr>
                  <td width="33%" valign="top" style="padding-bottom:12px;">
                    <div style="font-size:11px;color:#64748b;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">ORDER ID</div>
                    <div style="font-size:14px;color:#ffffff;font-weight:800;font-family:ui-monospace,Menlo,monospace;margin-top:4px;">#${orderNumber}</div>
                  </td>
                  <td width="33%" valign="top" style="padding-bottom:12px;">
                    <div style="font-size:11px;color:#64748b;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">ORDER DATE</div>
                    <div style="font-size:13px;color:#cbd5e1;font-weight:600;margin-top:4px;">${dateFormatted}</div>
                  </td>
                  <td width="34%" valign="top" style="padding-bottom:12px;">
                    <div style="font-size:11px;color:#64748b;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">EMAIL ID</div>
                    <div style="font-size:12px;color:#38bdf8;font-weight:600;word-break:break-all;margin-top:4px;">${customerEmail}</div>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <div style="border-top:1px solid #1e293b;margin:10px 0 24px;"></div>

              <!-- Section: ORDER SUMMARY -->
              <div style="font-size:12px;color:#94a3b8;font-weight:800;letter-spacing:1px;text-transform:uppercase;margin-bottom:18px;">
                ORDER SUMMARY
              </div>

              <!-- Items List -->
              ${itemsHtml}

              <!-- Divider -->
              <div style="border-top:1px solid #1e293b;margin:16px 0 16px;"></div>

              <!-- Financial Breakdown -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:8px;">
                <tr>
                  <td style="color:#94a3b8;font-size:13px;padding:4px 0;">Order Amount</td>
                  <td align="right" style="color:#cbd5e1;font-size:13px;font-family:ui-monospace,Menlo,monospace;">${formattedSubtotal}</td>
                </tr>
                ${
                  formattedDiscount
                    ? `<tr>
                        <td style="color:#10b981;font-size:13px;padding:4px 0;">Discount / Credits</td>
                        <td align="right" style="color:#10b981;font-size:13px;font-family:ui-monospace,Menlo,monospace;">${formattedDiscount}</td>
                      </tr>`
                    : ""
                }
                <tr>
                  <td style="color:#ffffff;font-size:15px;font-weight:800;padding:12px 0 8px;">ORDER TOTAL</td>
                  <td align="right" style="color:#00e5ff;font-size:17px;font-weight:900;font-family:ui-monospace,Menlo,monospace;padding:12px 0 8px;">${formattedTotal}</td>
                </tr>
              </table>

              <!-- Divider -->
              <div style="border-top:1px solid #1e293b;margin:12px 0 18px;"></div>

              <!-- Payment Method Section -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:26px;">
                <tr>
                  <td style="color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">YOU PAID USING</td>
                  <td align="right" style="color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">AMOUNT</td>
                </tr>
                <tr>
                  <td style="color:#ffffff;font-size:13px;font-weight:700;padding-top:4px;">${paymentMethodLabel}</td>
                  <td align="right" style="color:#ffffff;font-size:14px;font-weight:800;font-family:ui-monospace,Menlo,monospace;padding-top:4px;">${formattedTotal}</td>
                </tr>
              </table>

              <!-- Support Note (Driffle style) -->
              <div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;font-size:13px;color:#cbd5e1;line-height:1.7;">
                <p style="margin:0 0 14px;">
                  We hope you enjoy your purchase, and if you have any questions, feel free to reach out to our support team anytime!
                </p>
                <p style="margin:0 0 14px;font-weight:700;color:#ffffff;">
                  We're always here to help!
                </p>
                <p style="margin:0 0 4px;color:#00e5ff;font-weight:800;">
                  Happy gaming!
                </p>
                <p style="margin:0;color:#94a3b8;font-weight:700;">
                  Team GX Store
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer with Noreply Disclaimer -->
          <tr>
            <td style="background-color:#090d16;padding:18px 24px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
              <p style="margin:0 0 4px;font-size:11px;color:#64748b;">
                *This email has been generated automatically from noreply@gxstore.me. Please do not reply to it.*
              </p>
              <p style="margin:0;font-size:11px;color:#475569;direction:rtl;">
                *تم إنشاء هذه الرسالة تلقائياً من noreply@gxstore.me. يرجى عدم الرد عليها مباشرة.*
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
          to: [customerEmail],
          subject,
          html,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        console.error("Resend order status email error:", result);
        return {
          ok: false,
          error: result?.message || "Failed to send email via Resend",
        };
      }

      return { ok: true, emailId: result?.id };
    } catch (err: any) {
      console.error("Error sending order status email:", err);
      return { ok: false, error: err?.message || "Internal error sending email" };
    }
  });

/**
 * Server function to fetch an order by its order_number for the public /order/$orderNumber page.
 * Uses the service client to bypass RLS so guest buyers can see their order details safely.
 */
export const getOrderByNumberFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        orderNumber: z.string().trim().min(1),
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    try {
      const supabase = getServerServiceClient();
      const num = data.orderNumber.trim().toUpperCase();
      const { data: order, error } = await supabase
        .from("orders")
        .select("*")
        .or(`order_number.eq.${num},order_number.ilike.${num}`)
        .maybeSingle();

      if (error || !order) {
        return { ok: false, error: "Order not found" };
      }

      return { ok: true, order };
    } catch (err: any) {
      return { ok: false, error: err?.message || "Failed to load order" };
    }
  });
