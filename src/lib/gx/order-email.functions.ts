import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getPublicClient } from "@/lib/gx/supabase-request";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv, supabaseFetch } from "@/lib/gx/supabase-request";
import type { Database } from "@/integrations/supabase/types";

const SENDER_EMAIL = "GX Store <noreply@gxstore.me>";
const OFFICIAL_LOGO_URL = "https://gxstore.me/app/assets/img/gx-logo.png";

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

function toAbsoluteUrl(url?: string | null): string {
  if (!url || !url.trim()) return "";
  const clean = url.trim();
  if (clean.startsWith("http://") || clean.startsWith("https://")) return clean;
  if (clean.startsWith("/")) return `https://gxstore.me${clean}`;
  return `https://gxstore.me/${clean}`;
}

export type OrderItemEmail = {
  name: string;
  qty?: number;
  price?: number;
  image?: string;
  region?: string;
  variant?: string;
  slug?: string;
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
  lang?: "ar" | "en";
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
              slug: z.string().optional(),
            })
          )
          .optional(),
        notes: z.string().optional(),
        createdAt: z.string().optional(),
        lang: z.enum(["ar", "en"]).default("ar"),
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
        lang = "ar",
      } = data;

      const isAr = lang === "ar";
      const isDelivered = status === "delivered";

      const formattedTotal = `${Number(totalJod).toFixed(2)} د.أ`;
      const formattedTotalEn = `${Number(totalJod).toFixed(2)} JOD`;
      const formattedSubtotal = `${Number(subtotalJod ?? totalJod).toFixed(2)} د.أ`;
      const formattedSubtotalEn = `${Number(subtotalJod ?? totalJod).toFixed(2)} JOD`;
      const formattedDiscount = discountJod && discountJod > 0 ? `-${Number(discountJod).toFixed(2)} د.أ` : null;
      const formattedDiscountEn = discountJod && discountJod > 0 ? `-${Number(discountJod).toFixed(2)} JOD` : null;

      const dateObj = createdAt ? new Date(createdAt) : new Date();
      const dateFormattedEn = dateObj.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const dateFormattedAr = dateObj.toLocaleDateString("ar-JO", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const orderUrl = `https://gxstore.me/order/${encodeURIComponent(orderNumber)}`;
      const myOrdersUrl = `https://gxstore.me/account?tab=orders`;

      // Resolve product images from database if missing
      const resolvedItems: OrderItemEmail[] = [];
      const supabase = getServerServiceClient();

      for (const it of items) {
        let finalImage = toAbsoluteUrl(it.image);
        if (!finalImage) {
          try {
            const { data: prod } = await (supabase as any)
              .from("products")
              .select("image_url, icon_image_url")
              .or(`name_ar.eq.${it.name},name_en.eq.${it.name},slug.eq.${it.slug || ""}`)
              .limit(1)
              .maybeSingle();
            if (prod) {
              finalImage = toAbsoluteUrl(prod.image_url || prod.icon_image_url);
            }
          } catch { /* noop */ }
        }
        resolvedItems.push({
          ...it,
          image: finalImage,
        });
      }

      // Payment method localized
      const pm = (paymentMethod || "").toLowerCase();
      const pmLabel = isAr
        ? pm === "cliq"
          ? "خدمة كليك (CliQ) 🇯🇴"
          : pm === "gx_wallet"
          ? "محفظة GX Wallet 🌐"
          : pm === "card"
          ? "بطاقة بنكية (Visa / MasterCard) 💳"
          : "دفع إلكتروني مباشر"
        : pm === "cliq"
        ? "CliQ (Jordan) 🇯🇴"
        : pm === "gx_wallet"
        ? "GX Wallet 🌐"
        : pm === "card"
        ? "Credit / Debit Card 💳"
        : "Electronic Payment";

      // Subject line
      const subject = isAr
        ? isDelivered
          ? `🎮 تم تسليم وتأكيد طلبك بنجاح #${orderNumber} — متجر GX Store`
          : `⚠️ إشعار بشأن إلغاء طلبك #${orderNumber} — متجر GX Store`
        : isDelivered
        ? `🎮 Order #${orderNumber} Completed & Delivered — GX Store`
        : `⚠️ Order #${orderNumber} Cancellation Notice — GX Store`;

      const greetingName = (customerName && customerName.trim()) || (isAr ? "عميلنا العزيز" : "Valued Customer");

      // Items list HTML
      const itemsHtml = resolvedItems.length > 0
        ? resolvedItems
            .map((item) => {
              const qty = item.qty || 1;
              const priceFormatted = item.price != null
                ? `${Number(item.price).toFixed(2)} ${isAr ? "د.أ" : "JOD"}`
                : "";
              const imgTag = item.image
                ? `<img src="${item.image}" alt="${item.name}" width="64" height="64" style="width:64px;height:64px;border-radius:12px;object-fit:cover;border:1px solid rgba(255,255,255,0.12);display:block;background:#0d121c;">`
                : `<div style="width:64px;height:64px;border-radius:12px;background:#141b27;border:1px solid rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;color:#00e5ff;font-size:24px;text-align:center;line-height:64px;">🎮</div>`;

              return `
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:18px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:14px;padding:12px;">
                  <tr>
                    <td width="74" valign="middle" style="${isAr ? "padding-left:14px;" : "padding-right:14px;"}">
                      ${imgTag}
                    </td>
                    <td valign="middle">
                      <div style="color:#ffffff;font-size:14px;font-weight:800;line-height:1.4;margin-bottom:4px;">
                        ${item.name}
                      </div>
                      <div style="color:#94a3b8;font-size:12px;margin-bottom:3px;">
                        ${isAr ? "المنطقة / الريجون:" : "Region:"} <strong style="color:#38bdf8;">${item.region || (isAr ? "عالمي (Global)" : "Global")}</strong>
                      </div>
                      ${qty > 1 ? `<div style="color:#64748b;font-size:11px;">${isAr ? "الكمية:" : "Quantity:"} x${qty}</div>` : ""}
                    </td>
                    <td width="90" valign="middle" align="${isAr ? "left" : "right"}" style="color:#00e5ff;font-size:15px;font-weight:900;font-family:ui-monospace,Menlo,monospace;white-space:nowrap;">
                      ${priceFormatted}
                    </td>
                  </tr>
                </table>
              `;
            })
            .join("")
        : `
          <div style="color:#cbd5e1;font-size:13px;padding:12px 0;">
            ${isAr ? `طلب رقم #${orderNumber} بقيمة ${formattedTotal}` : `Order #${orderNumber} (${formattedTotalEn})`}
          </div>
        `;

      // ARABIC HTML TEMPLATE (Gamivo + Driffle Style with Logo, Products, Stepper, and My Orders Link)
      const arabicHtml = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#080b12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f1f5f9;direction:rtl;text-align:right;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#080b12;width:100%;padding:32px 14px;">
    <tr>
      <td align="center">
        <!-- Main Container Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:580px;background:linear-gradient(180deg,#121724 0%,#0c0f18 100%);border:1px solid #1e283d;border-radius:20px;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.7);">
          
          <!-- Brand Logo Header (GAMIVO & DRIFFLE STYLE) -->
          <tr>
            <td style="background:#090d16;padding:22px 28px;border-bottom:1px solid rgba(255,255,255,0.06);text-align:center;">
              <a href="https://gxstore.me" target="_blank" style="text-decoration:none;display:inline-block;">
                <img src="${OFFICIAL_LOGO_URL}" alt="GX Store" width="140" height="auto" style="max-width:140px;height:auto;display:block;margin:0 auto;" />
              </a>
              <div style="margin-top:12px;font-size:11px;color:#64748b;letter-spacing:0.5px;">
                <a href="https://gxstore.me" style="color:#94a3b8;text-decoration:none;margin:0 8px;">الألعاب والاشتراكات</a> •
                <a href="https://gxstore.me" style="color:#94a3b8;text-decoration:none;margin:0 8px;">البطاقات الرقمية</a> •
                <a href="https://gxstore.me" style="color:#94a3b8;text-decoration:none;margin:0 8px;">الشحن المباشر</a>
              </div>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding:32px 28px 20px;">
              
              <!-- Title Badge -->
              <div style="display:inline-block;padding:5px 14px;background:rgba(0,229,255,0.08);border:1px solid rgba(0,229,255,0.25);border-radius:30px;margin-bottom:16px;">
                <span style="font-size:12px;font-weight:800;color:#00e5ff;">
                  ${isDelivered ? "✓ تم اكتمال وتسليم الطلب" : "✕ تم إلغاء الطلب"}
                </span>
              </div>

              <h1 style="margin:0 0 14px;color:#ffffff;font-size:24px;font-weight:900;line-height:1.3;">
                ${isDelivered ? "تم تأكيد وتسليم طلبك بنجاح! 🎮" : "إشعار بشأن إلغاء طلبك"}
              </h1>

              <p style="margin:0 0 10px;font-size:15px;color:#e2e8f0;line-height:1.7;">
                مرحباً بك <strong style="color:#00e5ff;">${greetingName}</strong>،
              </p>

              <p style="margin:0 0 22px;font-size:14px;color:#cbd5e1;line-height:1.8;">
                ${
                  isDelivered
                    ? "شكراً لتسوقك من <strong>GX Store</strong>. يسعدنا إعلامك بأنه تم تأكيد استلام الدفع وتسليم منتجات طلبك بالكامل، وجاهزة الآن لاستلامها وتفعيلها!"
                    : "نحيطك علماً بأنه تم إلغاء طلبك من قِبل إدارة المتجر. إذا قمت بالدفع مسبقاً أو كان لديك أي استفسار، فإن فريق الدعم جاهز لمساعدتك فوراً."
                }
              </p>

              ${
                notes && notes.trim()
                  ? `<div style="background:rgba(0,229,255,0.06);border:1px dashed rgba(0,229,255,0.3);border-radius:12px;padding:14px 16px;margin-bottom:24px;font-size:13px;color:#e0f2fe;line-height:1.7;">
                      <div style="font-weight:800;color:#00e5ff;margin-bottom:4px;">💡 تعليمات وملاحظات الطلب:</div>
                      <div>${notes.trim()}</div>
                    </div>`
                  : ""
              }

              <!-- Big Vibrant Action CTA Button (Driffle/Gamivo Style) -->
              <div style="text-align:center;margin:28px 0 14px;">
                <a href="${orderUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#ff7700 0%,#ff5500 100%);background-color:#ff6600;color:#ffffff;text-decoration:none;font-size:16px;font-weight:900;padding:16px 42px;border-radius:12px;box-shadow:0 8px 25px rgba(255,102,0,0.45);letter-spacing:0.5px;">
                  ${isDelivered ? "استلام وتفعيل الطلب كود / حساب 🎮" : "عرض تفاصيل الطلب"}
                </a>
              </div>

              <!-- Reassurance Note: My Orders Page (USER EXPLICIT REQUIREMENT) -->
              <div style="text-align:center;margin-bottom:28px;">
                <p style="margin:0;font-size:12.5px;color:#94a3b8;line-height:1.6;">
                  ✨ يمكنك دائماً رؤية منتجاتك ورموز التفعيل والرجوع إليها في أي وقت عبر:
                  <br>
                  <a href="${myOrdersUrl}" target="_blank" style="color:#00e5ff;font-weight:800;text-decoration:underline;">
                    صفحة طلباتي في حسابك (My Orders)
                  </a>
                </p>
              </div>

              <!-- Divider -->
              <div style="border-top:1px solid #1e283d;margin:24px 0 20px;"></div>

              <!-- Order Metadata Grid -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:20px;">
                <tr>
                  <td width="33%" valign="top" style="padding-bottom:12px;">
                    <div style="font-size:11px;color:#64748b;font-weight:700;">رقم الطلب (ORDER ID)</div>
                    <div style="font-size:14px;color:#ffffff;font-weight:900;font-family:ui-monospace,Menlo,monospace;margin-top:4px;" dir="ltr">#${orderNumber}</div>
                  </td>
                  <td width="33%" valign="top" style="padding-bottom:12px;">
                    <div style="font-size:11px;color:#64748b;font-weight:700;">تاريخ الطلب</div>
                    <div style="font-size:13px;color:#cbd5e1;font-weight:700;margin-top:4px;">${dateFormattedAr}</div>
                  </td>
                  <td width="34%" valign="top" style="padding-bottom:12px;">
                    <div style="font-size:11px;color:#64748b;font-weight:700;">البريد الإلكتروني</div>
                    <div style="font-size:12px;color:#38bdf8;font-weight:700;word-break:break-all;margin-top:4px;" dir="ltr">${customerEmail}</div>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <div style="border-top:1px solid #1e283d;margin:10px 0 22px;"></div>

              <!-- Section: ملخص المنتجات (ORDER SUMMARY) -->
              <div style="font-size:12px;color:#94a3b8;font-weight:800;letter-spacing:1px;margin-bottom:16px;">
                ملخص المنتجات المطلوبة (ORDER SUMMARY)
              </div>

              <!-- Real Items with Images and Details -->
              ${itemsHtml}

              <!-- Financial Breakdown -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:16px;background:rgba(0,0,0,0.3);border-radius:12px;padding:14px;">
                <tr>
                  <td style="color:#94a3b8;font-size:13px;padding:5px 0;">المجموع الفرعي</td>
                  <td align="left" style="color:#cbd5e1;font-size:13px;font-family:ui-monospace,Menlo,monospace;">${formattedSubtotal}</td>
                </tr>
                ${
                  formattedDiscount
                    ? `<tr>
                        <td style="color:#10b981;font-size:13px;padding:5px 0;">الخصم المطبق / رصيد</td>
                        <td align="left" style="color:#10b981;font-size:13px;font-family:ui-monospace,Menlo,monospace;">${formattedDiscount}</td>
                      </tr>`
                    : ""
                }
                <tr>
                  <td style="color:#ffffff;font-size:15px;font-weight:900;padding:12px 0 4px;border-top:1px solid rgba(255,255,255,0.08);">المبلغ الإجمالي المدفوع</td>
                  <td align="left" style="color:#00e5ff;font-size:18px;font-weight:900;font-family:ui-monospace,Menlo,monospace;padding:12px 0 4px;border-top:1px solid rgba(255,255,255,0.08);">${formattedTotal}</td>
                </tr>
              </table>

              <!-- Payment Method Section -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0 26px;">
                <tr>
                  <td style="color:#64748b;font-size:11px;font-weight:700;">طريقة الدفع (YOU PAID USING)</td>
                  <td align="left" style="color:#64748b;font-size:11px;font-weight:700;">المبلغ</td>
                </tr>
                <tr>
                  <td style="color:#ffffff;font-size:13px;font-weight:800;padding-top:4px;">${pmLabel}</td>
                  <td align="left" style="color:#ffffff;font-size:14px;font-weight:900;font-family:ui-monospace,Menlo,monospace;padding-top:4px;">${formattedTotal}</td>
                </tr>
              </table>

              <!-- Support Note (Gamivo/Driffle style) -->
              <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:18px;font-size:13px;color:#cbd5e1;line-height:1.8;">
                <p style="margin:0 0 10px;font-weight:800;color:#ffffff;">
                  هل تحتاج لمساعدة أو لديك استفسار بشأن التفعيل؟
                </p>
                <p style="margin:0 0 12px;font-size:12.5px;color:#94a3b8;">
                  فريق دعم <strong>GX Store</strong> جاهز لخدمتك عبر واتساب أو ديسكورد لحل أي مشكلة فوراً.
                </p>
                <div style="margin-top:10px;">
                  <a href="https://wa.me/962776252313?text=${encodeURIComponent(`مرحباً، أود المساعدة بشأن طلبي رقم #${orderNumber}`)}" target="_blank" style="display:inline-block;background:#25D366;color:#051c14;padding:8px 16px;border-radius:8px;font-weight:800;font-size:12px;text-decoration:none;margin-left:8px;">
                    واتساب الدعم الفني
                  </a>
                  <a href="https://discord.gg/DvkUd5PgqV" target="_blank" style="display:inline-block;background:#5865F2;color:#ffffff;padding:8px 16px;border-radius:8px;font-weight:800;font-size:12px;text-decoration:none;">
                    سيرفر ديسكورد
                  </a>
                </div>
              </div>

            </td>
          </tr>

          <!-- Footer with Noreply Disclaimer -->
          <tr>
            <td style="background-color:#070a12;padding:20px 24px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#64748b;">
                مع تحيات فريق عمل متجر <strong>GX Store</strong> — وجهتك الأولى للألعاب والاشتراكات.
              </p>
              <p style="margin:0;font-size:11px;color:#475569;">
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

      // ENGLISH HTML TEMPLATE (Gamivo + Driffle Style with Logo, Products, Stepper, and My Orders Link)
      const englishHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#080b12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f1f5f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#080b12;width:100%;padding:32px 14px;">
    <tr>
      <td align="center">
        <!-- Main Container Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:580px;background:linear-gradient(180deg,#121724 0%,#0c0f18 100%);border:1px solid #1e283d;border-radius:20px;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.7);">
          
          <!-- Brand Logo Header (GAMIVO & DRIFFLE STYLE) -->
          <tr>
            <td style="background:#090d16;padding:22px 28px;border-bottom:1px solid rgba(255,255,255,0.06);text-align:center;">
              <a href="https://gxstore.me" target="_blank" style="text-decoration:none;display:inline-block;">
                <img src="${OFFICIAL_LOGO_URL}" alt="GX Store" width="140" height="auto" style="max-width:140px;height:auto;display:block;margin:0 auto;" />
              </a>
              <div style="margin-top:12px;font-size:11px;color:#64748b;letter-spacing:0.5px;">
                <a href="https://gxstore.me" style="color:#94a3b8;text-decoration:none;margin:0 8px;">Video Games</a> •
                <a href="https://gxstore.me" style="color:#94a3b8;text-decoration:none;margin:0 8px;">Gift Cards</a> •
                <a href="https://gxstore.me" style="color:#94a3b8;text-decoration:none;margin:0 8px;">Subscriptions</a>
              </div>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding:32px 28px 20px;">
              
              <!-- Title Badge -->
              <div style="display:inline-block;padding:5px 14px;background:rgba(0,229,255,0.08);border:1px solid rgba(0,229,255,0.25);border-radius:30px;margin-bottom:16px;">
                <span style="font-size:12px;font-weight:800;color:#00e5ff;">
                  ${isDelivered ? "✓ Order Completed & Delivered" : "✕ Order Cancelled"}
                </span>
              </div>

              <h1 style="margin:0 0 14px;color:#ffffff;font-size:24px;font-weight:900;line-height:1.3;">
                ${isDelivered ? "Thank you for your purchase!" : "Order Cancellation Notice"}
              </h1>

              <p style="margin:0 0 10px;font-size:15px;color:#e2e8f0;line-height:1.7;">
                Hey <strong style="color:#00e5ff;">${greetingName}</strong>,
              </p>

              <p style="margin:0 0 22px;font-size:14px;color:#cbd5e1;line-height:1.8;">
                ${
                  isDelivered
                    ? "Thank you for shopping at <strong>GX Store</strong>. We are pleased to inform you that your payment has been confirmed and your digital order has been delivered and is ready for activation!"
                    : "We are writing to inform you that your order has been cancelled by store administration. If you have already paid or need assistance, our support team is available immediately."
                }
              </p>

              ${
                notes && notes.trim()
                  ? `<div style="background:rgba(0,229,255,0.06);border:1px dashed rgba(0,229,255,0.3);border-radius:12px;padding:14px 16px;margin-bottom:24px;font-size:13px;color:#e0f2fe;line-height:1.7;">
                      <div style="font-weight:800;color:#00e5ff;margin-bottom:4px;">💡 Order Instructions & Notes:</div>
                      <div>${notes.trim()}</div>
                    </div>`
                  : ""
              }

              <!-- Big Vibrant Action CTA Button (Driffle/Gamivo Style) -->
              <div style="text-align:center;margin:28px 0 14px;">
                <a href="${orderUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#ff7700 0%,#ff5500 100%);background-color:#ff6600;color:#ffffff;text-decoration:none;font-size:16px;font-weight:900;padding:16px 42px;border-radius:12px;box-shadow:0 8px 25px rgba(255,102,0,0.45);letter-spacing:0.5px;">
                  ${isDelivered ? "COLLECT YOUR ORDER 🎮" : "View Order Details"}
                </a>
              </div>

              <!-- Reassurance Note: My Orders Page (USER EXPLICIT REQUIREMENT) -->
              <div style="text-align:center;margin-bottom:28px;">
                <p style="margin:0;font-size:12.5px;color:#94a3b8;line-height:1.6;">
                  ✨ You can reveal and view these products at any time from:
                  <br>
                  <a href="${myOrdersUrl}" target="_blank" style="color:#00e5ff;font-weight:800;text-decoration:underline;">
                    My Orders page in your profile
                  </a>
                </p>
              </div>

              <!-- Divider -->
              <div style="border-top:1px solid #1e283d;margin:24px 0 20px;"></div>

              <!-- Order Metadata Grid -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:20px;">
                <tr>
                  <td width="33%" valign="top" style="padding-bottom:12px;">
                    <div style="font-size:11px;color:#64748b;font-weight:700;">ORDER ID</div>
                    <div style="font-size:14px;color:#ffffff;font-weight:900;font-family:ui-monospace,Menlo,monospace;margin-top:4px;">#${orderNumber}</div>
                  </td>
                  <td width="33%" valign="top" style="padding-bottom:12px;">
                    <div style="font-size:11px;color:#64748b;font-weight:700;">ORDER DATE</div>
                    <div style="font-size:13px;color:#cbd5e1;font-weight:700;margin-top:4px;">${dateFormattedEn}</div>
                  </td>
                  <td width="34%" valign="top" style="padding-bottom:12px;">
                    <div style="font-size:11px;color:#64748b;font-weight:700;">EMAIL ID</div>
                    <div style="font-size:12px;color:#38bdf8;font-weight:700;word-break:break-all;margin-top:4px;">${customerEmail}</div>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <div style="border-top:1px solid #1e283d;margin:10px 0 22px;"></div>

              <!-- Section: ORDER SUMMARY -->
              <div style="font-size:12px;color:#94a3b8;font-weight:800;letter-spacing:1px;margin-bottom:16px;">
                ORDER SUMMARY
              </div>

              <!-- Real Items with Images and Details -->
              ${itemsHtml}

              <!-- Financial Breakdown -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:16px;background:rgba(0,0,0,0.3);border-radius:12px;padding:14px;">
                <tr>
                  <td style="color:#94a3b8;font-size:13px;padding:5px 0;">Order Amount</td>
                  <td align="right" style="color:#cbd5e1;font-size:13px;font-family:ui-monospace,Menlo,monospace;">${formattedSubtotalEn}</td>
                </tr>
                ${
                  formattedDiscountEn
                    ? `<tr>
                        <td style="color:#10b981;font-size:13px;padding:5px 0;">Discount / Credits</td>
                        <td align="right" style="color:#10b981;font-size:13px;font-family:ui-monospace,Menlo,monospace;">${formattedDiscountEn}</td>
                      </tr>`
                    : ""
                }
                <tr>
                  <td style="color:#ffffff;font-size:15px;font-weight:900;padding:12px 0 4px;border-top:1px solid rgba(255,255,255,0.08);">ORDER TOTAL</td>
                  <td align="right" style="color:#00e5ff;font-size:18px;font-weight:900;font-family:ui-monospace,Menlo,monospace;padding:12px 0 4px;border-top:1px solid rgba(255,255,255,0.08);">${formattedTotalEn}</td>
                </tr>
              </table>

              <!-- Payment Method Section -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0 26px;">
                <tr>
                  <td style="color:#64748b;font-size:11px;font-weight:700;">YOU PAID USING</td>
                  <td align="right" style="color:#64748b;font-size:11px;font-weight:700;">AMOUNT</td>
                </tr>
                <tr>
                  <td style="color:#ffffff;font-size:13px;font-weight:800;padding-top:4px;">${pmLabel}</td>
                  <td align="right" style="color:#ffffff;font-size:14px;font-weight:900;font-family:ui-monospace,Menlo,monospace;padding-top:4px;">${formattedTotalEn}</td>
                </tr>
              </table>

              <!-- Support Note (Gamivo/Driffle style) -->
              <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:18px;font-size:13px;color:#cbd5e1;line-height:1.8;">
                <p style="margin:0 0 10px;font-weight:800;color:#ffffff;">
                  Need assistance with activation?
                </p>
                <p style="margin:0 0 12px;font-size:12.5px;color:#94a3b8;">
                  The <strong>GX Store</strong> Support Team is available around the clock to help you through our official channels.
                </p>
                <div style="margin-top:10px;">
                  <a href="https://wa.me/962776252313?text=${encodeURIComponent(`Hello, I need help with my order #${orderNumber}`)}" target="_blank" style="display:inline-block;background:#25D366;color:#051c14;padding:8px 16px;border-radius:8px;font-weight:800;font-size:12px;text-decoration:none;margin-right:8px;">
                    WhatsApp Support
                  </a>
                  <a href="https://discord.gg/DvkUd5PgqV" target="_blank" style="display:inline-block;background:#5865F2;color:#ffffff;padding:8px 16px;border-radius:8px;font-weight:800;font-size:12px;text-decoration:none;">
                    Discord Server
                  </a>
                </div>
              </div>

            </td>
          </tr>

          <!-- Footer with Noreply Disclaimer -->
          <tr>
            <td style="background-color:#070a12;padding:20px 24px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#64748b;">
                Best regards, <strong>GX Store Team</strong> — Your premier digital gaming destination.
              </p>
              <p style="margin:0;font-size:11px;color:#475569;">
                *This email has been generated automatically from noreply@gxstore.me. Please do not reply to it.*
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

      const html = isAr ? arabicHtml : englishHtml;

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
 * Uses the SECURITY DEFINER RPC `get_order_by_number` so guest buyers can see their order details without RLS issues.
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

      // 1. Try our SECURITY DEFINER RPC function (guarantees access for guests)
      const { data: rpcData, error: rpcErr } = await (supabase as any).rpc("get_order_by_number", {
        _order_number: num,
      });

      if (!rpcErr && rpcData) {
        return { ok: true, order: rpcData };
      }

      // 2. Direct query fallback
      const { data: order, error } = await (supabase as any)
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
