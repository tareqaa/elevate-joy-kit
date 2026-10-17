import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "node:crypto";
import { getPublicClient } from "@/lib/gx/supabase-request";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv, supabaseFetch } from "@/lib/gx/supabase-request";
import type { Database } from "@/integrations/supabase/types";

const SENDER_EMAIL = "GX Store <noreply@gxstore.me>";
const OFFICIAL_LOGO_URL = "https://gxstore.me/app/assets/img/gx-logo.png";

const JWT_SECRET =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "gxstore_jwt_secret_salt_2026_unbreakable_gamivo_style";

/**
 * Generates an unguessable cryptographic token for an order (Gamivo style JWT).
 * High entropy 256-bit signature prevents brute-force guessing of order numbers.
 */
export function generateOrderToken(orderNumber: string, email?: string | null, orderId?: string | null): string {
  const header = Buffer.from(JSON.stringify({ typ: "JWT", alg: "HS256" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      orderNumber: (orderNumber || "").trim().toUpperCase(),
      orderId: orderId || null,
      email: (email || "").toLowerCase().trim(),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 180 * 24 * 60 * 60, // 180 days validity
    })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
}

/**
 * Validates the cryptographic order token and extracts order details.
 */
export function verifyOrderToken(token: string): { valid: boolean; orderNumber?: string; email?: string; error?: string } {
  try {
    if (!token || typeof token !== "string") {
      return { valid: false, error: "رمز الطلب مفقود" };
    }
    const clean = token.trim();
    const parts = clean.split(".");
    if (parts.length !== 3) {
      return { valid: false, error: "صيغة رمز الطلب غير صحيحة" };
    }
    const [headerB64, payloadB64, signature] = parts;
    const expectedSig = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest("base64url");

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return { valid: false, error: "رمز الطلب غير صحيح أو تم التلاعب به" };
    }

    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    if (!payload.orderNumber) {
      return { valid: false, error: "الرمز لا يحتوي على رقم طلب صالح" };
    }

    return {
      valid: true,
      orderNumber: payload.orderNumber,
      email: payload.email,
    };
  } catch (err: any) {
    return { valid: false, error: err?.message || "فشل التحقق من صحة الرمز" };
  }
}

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

/**
 * Resolves verified PNG/JPG cover images for emails.
 * Gmail blocks .svg files completely, so this maps all SVGs and catalog items to high-res JPG/PNG artwork.
 */
export function sanitizeImageForEmail(url?: string | null, name?: string, slug?: string): string {
  const cleanName = (name || "").toLowerCase();
  const cleanSlug = (slug || "").toLowerCase();

  if (
    cleanSlug.includes("playstation") ||
    cleanSlug.includes("psn") ||
    cleanName.includes("playstation") ||
    cleanName.includes("بلايستيشن") ||
    cleanName.includes("سوني") ||
    cleanName.includes("psn")
  ) {
    return "https://gxstore.me/app/assets/img/catalog/playstation.jpg";
  }

  if (
    cleanSlug.includes("xbox") ||
    cleanName.includes("xbox") ||
    cleanName.includes("اكس بوكس") ||
    cleanName.includes("game pass")
  ) {
    return "https://gxstore.me/app/assets/img/catalog/xbox.jpg";
  }

  if (
    cleanSlug.includes("itunes") ||
    cleanSlug.includes("apple") ||
    cleanName.includes("itunes") ||
    cleanName.includes("ايتونز") ||
    cleanName.includes("apple")
  ) {
    return "https://gxstore.me/app/assets/img/catalog/itunes.jpg";
  }

  if (
    cleanSlug.includes("steam") ||
    cleanName.includes("steam") ||
    cleanName.includes("ستيم")
  ) {
    return "https://gxstore.me/app/assets/img/catalog/steam.jpg";
  }

  if (
    cleanSlug.includes("pubg") ||
    cleanName.includes("pubg") ||
    cleanName.includes("ببجي")
  ) {
    return "https://gxstore.me/app/assets/img/catalog/pubg-mobile.webp";
  }

  if (
    cleanSlug.includes("freefire") ||
    cleanSlug.includes("free-fire") ||
    cleanName.includes("freefire") ||
    cleanName.includes("فري فاير")
  ) {
    return "https://gxstore.me/app/assets/img/catalog/free-fire.png";
  }

  if (
    cleanSlug.includes("fortnite") ||
    cleanName.includes("fortnite") ||
    cleanName.includes("فورتنايت") ||
    cleanName.includes("فورت نايت") ||
    cleanName.includes("v-bucks")
  ) {
    return "https://gxstore.me/app/assets/img/fortnite-logo.png";
  }

  if (
    cleanSlug.includes("roblox") ||
    cleanName.includes("roblox") ||
    cleanName.includes("روبلوكس") ||
    cleanName.includes("robux")
  ) {
    return "https://gxstore.me/app/assets/img/catalog/roblox-robux.jpg";
  }

  if (
    cleanSlug.includes("canva") ||
    cleanName.includes("canva") ||
    cleanName.includes("كانفا")
  ) {
    return "https://gxstore.me/app/assets/img/canva-logo.png";
  }

  if (
    cleanSlug.includes("snapchat") ||
    cleanName.includes("snapchat") ||
    cleanName.includes("سناب")
  ) {
    return "https://gxstore.me/app/assets/img/snapchat-logo.png";
  }

  if (
    cleanSlug.includes("nordvpn") ||
    cleanName.includes("nordvpn") ||
    cleanName.includes("نورد")
  ) {
    return "https://gxstore.me/app/assets/img/catalog/nordvpn.jpg";
  }

  if (
    cleanSlug.includes("headspace") ||
    cleanName.includes("headspace") ||
    cleanName.includes("هيد سبيس")
  ) {
    return "https://gxstore.me/app/assets/img/catalog/headspace.jpg";
  }

  if (
    cleanSlug.includes("notion") ||
    cleanName.includes("notion") ||
    cleanName.includes("نوشن")
  ) {
    return "https://gxstore.me/app/assets/img/catalog/notion.jpg";
  }

  if (
    cleanSlug.includes("adobe-acrobat") ||
    cleanName.includes("acrobat") ||
    cleanName.includes("اكروبات")
  ) {
    return "https://gxstore.me/app/assets/img/catalog/adobe-acrobat.jpg";
  }

  if (
    cleanSlug.includes("adobe-express") ||
    cleanName.includes("express")
  ) {
    return "https://gxstore.me/app/assets/img/catalog/adobe-express.jpg";
  }

  if (
    cleanSlug.includes("adobe") ||
    cleanName.includes("adobe") ||
    cleanName.includes("ادوبي")
  ) {
    return "https://gxstore.me/app/assets/img/adobe-cc.webp";
  }

  if (url && url.trim()) {
    const abs = toAbsoluteUrl(url);
    if (abs.toLowerCase().endsWith(".svg")) {
      return "https://gxstore.me/app/assets/img/catalog/playstation.jpg";
    }
    return abs;
  }

  return "";
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

      const orderToken = generateOrderToken(orderNumber, customerEmail);
      const orderUrl = `https://gxstore.me/order/completed?order_token=${encodeURIComponent(orderToken)}`;
      const myOrdersUrl = `https://gxstore.me/account?tab=orders`;

      // Resolve product images from database if missing (Guaranteed JPG/PNG for Gmail)
      const resolvedItems: OrderItemEmail[] = [];
      const supabase = getServerServiceClient();

      for (const it of items) {
        let finalImage = sanitizeImageForEmail(it.image, it.name, it.slug);
        if (!finalImage) {
          try {
            const cleanName = it.name.replace(/\(.*?\)/g, "").trim();
            const { data: prod } = await (supabase as any)
              .from("products")
              .select("image_url, icon_image_url")
              .or(`slug.eq.${it.slug || ""},name_ar.ilike.%${cleanName}%,name_en.ilike.%${cleanName}%`)
              .limit(1)
              .maybeSingle();
            if (prod) {
              finalImage = sanitizeImageForEmail(prod.image_url || prod.icon_image_url, it.name, it.slug);
            }
          } catch { /* noop */ }
        }
        if (!finalImage) {
          finalImage = OFFICIAL_LOGO_URL;
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

              <!-- Big Vibrant Action CTA Button (GX Store Theme: Neon Cyan / Blue) -->
              <div style="text-align:center;margin:28px 0 14px;">
                <a href="${orderUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#00e5ff 0%,#0070f3 100%);background-color:#00e5ff;color:#040914;text-decoration:none;font-size:16px;font-weight:900;padding:16px 42px;border-radius:14px;box-shadow:0 10px 30px rgba(0,229,255,0.45);border:1px solid rgba(0,229,255,0.8);letter-spacing:0.5px;">
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

              <!-- Big Vibrant Action CTA Button (GX Store Theme: Neon Cyan / Blue) -->
              <div style="text-align:center;margin:28px 0 14px;">
                <a href="${orderUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#00e5ff 0%,#0070f3 100%);background-color:#00e5ff;color:#040914;text-decoration:none;font-size:16px;font-weight:900;padding:16px 42px;border-radius:14px;box-shadow:0 10px 30px rgba(0,229,255,0.45);border:1px solid rgba(0,229,255,0.8);letter-spacing:0.5px;">
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
 * Server function to fetch an order using the unguessable cryptographic token (Gamivo style order_token).
 * Validates HMAC signature before returning delivery data.
 */
export const getOrderByTokenFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        orderToken: z.string().trim().min(5),
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    try {
      const verified = verifyOrderToken(data.orderToken);
      if (!verified.valid || !verified.orderNumber) {
        return {
          ok: false,
          error: verified.error || "رمز الوصول إلى الطلب غير صالح أو منتهي الصلاحية",
        };
      }

      const supabase = getServerServiceClient();
      const num = verified.orderNumber.trim().toUpperCase();

      // RPC call (SECURITY DEFINER)
      const { data: rpcData, error: rpcErr } = await (supabase as any).rpc("get_order_by_number", {
        _order_number: num,
      });

      if (!rpcErr && rpcData) {
        return { ok: true, order: rpcData, verifiedEmail: verified.email, isLocked: false };
      }

      const { data: order, error } = await (supabase as any)
        .from("orders")
        .select("*")
        .or(`order_number.eq.${num},order_number.ilike.${num}`)
        .maybeSingle();

      if (error || !order) {
        return { ok: false, error: "لم يتم العثور على بيانات هذا الطلب" };
      }

      return { ok: true, order, verifiedEmail: verified.email, isLocked: false };
    } catch (err: any) {
      return { ok: false, error: err?.message || "فشل التحقق من الطلب" };
    }
  });

/**
 * Server function to generate a secret Gamivo-style link for any order (used by admin to copy link).
 */
export const getOrderSecretLinkFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        orderNumber: z.string().trim().min(1),
        customerEmail: z.string().optional(),
        orderId: z.string().optional(),
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    try {
      const token = generateOrderToken(data.orderNumber, data.customerEmail || "", data.orderId);
      const secretUrl = `https://gxstore.me/order/completed?order_token=${encodeURIComponent(token)}`;
      return { ok: true, token, secretUrl };
    } catch (err: any) {
      return { ok: false, error: err?.message || "Failed to generate link" };
    }
  });

/**
 * Server function to fetch an order by its order_number for the public /order/$orderNumber page.
 * If orderToken is provided and valid, full access is granted.
 * If no token is provided, delivery_data is stripped so attackers cannot brute-force codes.
 */
export const getOrderByNumberFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        orderNumber: z.string().trim().min(1),
        orderToken: z.string().optional(),
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    try {
      const supabase = getServerServiceClient();
      const num = data.orderNumber.trim().toUpperCase();

      const tokenCheck = data.orderToken ? verifyOrderToken(data.orderToken) : null;
      const hasValidToken = tokenCheck?.valid && tokenCheck.orderNumber?.toUpperCase() === num;

      // 1. Try our SECURITY DEFINER RPC function (guarantees access for guests)
      const { data: rpcData, error: rpcErr } = await (supabase as any).rpc("get_order_by_number", {
        _order_number: num,
      });

      const order = (!rpcErr && rpcData) ? rpcData : (
        await (supabase as any)
          .from("orders")
          .select("*")
          .or(`order_number.eq.${num},order_number.ilike.${num}`)
          .maybeSingle()
      ).data;

      if (!order) {
        return { ok: false, error: "لم يتم العثور على هذا الطلب" };
      }

      // If valid token passed, return full order
      if (hasValidToken) {
        return { ok: true, order, isLocked: false };
      }

      // If accessed without token, lock delivery keys to prevent unauthorized guessing!
      return {
        ok: true,
        isLocked: true,
        order: {
          ...order,
          delivery_data: null, // MASKED!
        },
      };
    } catch (err: any) {
      return { ok: false, error: err?.message || "Failed to load order" };
    }
  });

/**
 * Server function to record that customer revealed / opened the activation code.
 */
export const markCodeRevealedFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        orderToken: z.string().trim().min(5),
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    try {
      const verified = verifyOrderToken(data.orderToken);
      if (!verified.valid || !verified.orderNumber) {
        return { ok: false };
      }
      const supabase = getServerServiceClient();
      const num = verified.orderNumber.trim().toUpperCase();
      const now = new Date().toISOString();
      await (supabase as any)
        .from("orders")
        .update({
          codes_revealed_at: now,
        })
        .or(`order_number.eq.${num},order_number.ilike.${num}`)
        .is("codes_revealed_at", null);

      return { ok: true };
    } catch {
      return { ok: false };
    }
  });

