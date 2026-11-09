import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { resolveSafeClientIp, normalizeIp } from "./ip";
import { z } from "zod";
import { getPublicClient, getUserScopedClient } from "@/lib/gx/supabase-request";
import { assertAdminCaller, getVerifiedCaller } from "@/lib/gx/supabase-auth.server";
import { getResendApiKey } from "./resend-key";
import { formatFullRegion } from "./region";
import { renderGxStoreEmail, escapeHtml, type EmailProductItem } from "./email-theme";
import { resolveProductActivationGuide } from "./activation-guide";
import {
  generateOrderToken,
  verifyOrderToken,
  getServerServiceClient,
  resolveProductEmailImage,
  sendBinanceOrderReceivedEmailDirect,
  sendPaymentConfirmedEmailDirect,
  type OrderItemEmail,
  type SendOrderStatusEmailInput,
  type SendBinanceOrderReceivedEmailInput,
  type SendPaymentConfirmedEmailInput,
  CDN_ASSETS_BASE,
  OFFICIAL_LOGO_URL,
  toAbsoluteUrl,
  sanitizeImageForEmail,
  sanitizeDeliveryDataForPendingOrLocked,
} from "./order-email.server";

export type { OrderItemEmail, SendOrderStatusEmailInput, SendBinanceOrderReceivedEmailInput, SendPaymentConfirmedEmailInput };

const SENDER_EMAIL = "GX Store <noreply@gxstore.me>";

function getServerHeader(headerName: string): string | undefined {
  try {
    return getRequestHeader(headerName);
  } catch {
    return undefined;
  }
}

function getServerIp(): string | null {
  try {
    return resolveSafeClientIp(getRequestHeader);
  } catch {
    return null;
  }
}

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
      await assertAdminCaller();
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

      // Generate orderToken ONLY if order status is delivered!
      // Digital products (keys/codes/accounts) must NEVER be exposed or generated for cancelled orders.
      const orderToken = isDelivered ? generateOrderToken(orderNumber, customerEmail) : "";
      const orderUrl = isDelivered
        ? `https://gxstore.me/order/completed?order_token=${encodeURIComponent(orderToken)}`
        : `https://gxstore.me/order/${orderNumber}`;
      const myOrdersUrl = `https://gxstore.me/account?tab=orders`;

      // Dynamically resolve product images from live database (reflects any additions/changes immediately)
      const resolvedItems: OrderItemEmail[] = [];
      const supabase = getServerServiceClient();

      for (const it of items) {
        const finalImage = await resolveProductEmailImage(supabase, it);
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
          ? `تم تسليم وتأكيد طلبك بنجاح #${orderNumber} — متجر GX Store`
          : `إشعار بشأن إلغاء طلبك #${orderNumber} — متجر GX Store`
        : isDelivered
        ? `Order #${orderNumber} Completed & Delivered — GX Store`
        : `Order #${orderNumber} Cancellation Notice — GX Store`;

      const greetingName = (customerName && customerName.trim()) || (isAr ? "عميلنا العزيز" : "Valued Customer");

      const emailProducts: EmailProductItem[] = resolvedItems.map((item) => {
        const itemRegionFormatted = formatFullRegion(
          {
            region: item.region,
            name: item.name,
            cartId: item.slug || item.variant,
          },
          isAr ? "ar" : "en",
          { withDetails: true }
        );

        const priceText = item.price != null
          ? `${Number(item.price).toFixed(2)} ${isAr ? "د.أ" : "JOD"}`
          : "";

        return {
          name: item.name,
          image: item.image,
          region: isAr ? `المنطقة: ${itemRegionFormatted}` : `Region: ${itemRegionFormatted}`,
          price: priceText,
          qty: item.qty || 1,
        };
      });

      const notesBlock = notes && notes.trim()
        ? `<div style="font-weight:700;color:#38bdf8;margin-bottom:6px;">${isAr ? "💡 تعليمات وملاحظات الطلب:" : "💡 Order Instructions & Notes:"}</div><div>${escapeHtml(notes.trim())}</div>`
        : undefined;

      const html = renderGxStoreEmail({
        lang: isAr ? "ar" : "en",
        subject,
        headline: isDelivered
          ? (isAr ? "شكراً لشرائك من متجرنا" : "Thank you for your purchase")
          : (isAr ? "تم إلغاء الطلب" : "Order Cancelled"),
        greetingText: isAr ? "عميلنا العزيز،" : "Dear Customer,",
        bodyText: isDelivered
          ? (isAr
              ? "لقد تم الانتهاء من طلبك بنجاح. يمكنك رؤية منتجاتك في القائمة أدناه."
              : "Thank you for choosing GX Store. We are pleased to inform you that your order has been completed successfully! You can view your products and details in the list below.")
          : (isAr
              ? `نود إعلامك بأنه تم إلغاء طلبك رقم #${orderNumber}. إذا كنت بحاجة إلى مساعدة أو ترغب في اختيار منتج بديل، يسعدنا تواصلك مع فريق الدعم الفني.`
              : `We would like to inform you that your order #${orderNumber} has been cancelled. If you need any assistance or wish to choose an alternative product, our support team is happy to help.`),
        introDetailsText: isDelivered
          ? (isAr ? "إليك تفاصيل طلبك:" : "Here are your order details:")
          : (isAr ? "إليك تفاصيل الطلب الملغي:" : "Here are the cancelled order details:"),
        ctaButton: isDelivered
          ? {
              text: isAr ? "تفاصيل المنتج" : "Product Details",
              url: orderUrl,
            }
          : {
              text: isAr ? "تصفح المتجر 🛍️" : "Visit Store 🛍️",
              url: "https://gxstore.me",
            },
        meta: {
          orderIdLabel: isAr ? "رقم الطلب (ORDER ID)" : "ORDER ID",
          orderIdValue: `#${orderNumber}`,
          dateLabel: isAr ? "تاريخ الطلب (ORDER DATE)" : "ORDER DATE",
          dateValue: isAr ? dateFormattedAr : dateFormattedEn,
          emailLabel: isAr ? "البريد الإلكتروني (EMAIL ID)" : "EMAIL ID",
          emailValue: customerEmail,
        },
        summaryTitle: isAr ? "تفاصيل ومحتويات الطلب (ORDER SUMMARY)" : "ORDER SUMMARY",
        products: emailProducts,
        breakdown: isDelivered
          ? {
              rows: [
                {
                  label: isAr ? "قيمة الطلب" : "Order Amount",
                  value: isAr ? formattedSubtotal : formattedSubtotalEn,
                },
                ...(discountJod && discountJod > 0
                  ? [
                      {
                        label: isAr ? "الخصم الترويجي" : "Promo",
                        value: isAr ? formattedDiscount! : formattedDiscountEn!,
                        isPromo: true,
                      },
                    ]
                  : []),
                {
                  label: isAr ? "المبلغ الإجمالي" : "ORDER TOTAL",
                  value: isAr ? formattedTotal : formattedTotalEn,
                  isTotal: true,
                },
              ],
              paidUsingLabel: isAr ? "طريقة الدفع (YOU PAID USING)" : "YOU PAID USING",
              paidUsingMethod: pmLabel,
              paidAmountLabel: isAr ? "المبلغ (AMOUNT)" : "AMOUNT",
              paidAmountValue: isAr ? formattedTotal : formattedTotalEn,
            }
          : undefined, // Omitted on cancellation (as user explicitly requested: "وشيل منه المبلغ الاجمالي المدفوع مهو ما دفع اشي وطريقة الدفع")
        notesHtml: notesBlock,
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
 * Server function to notify customer that payment was received and confirmed.
 */
export const sendPaymentConfirmedEmail = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        orderNumber: z.string().trim().min(1),
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
    return sendPaymentConfirmedEmailDirect(data);
  });

/**
 * Server function to notify customer that their Binance Pay order was received and is verifying.
 */
export const sendBinanceOrderReceivedEmail = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        orderNumber: z.string().trim().min(1),
        orderToken: z.string().optional(),
        customerEmail: z.string().trim().email(),
        customerName: z.string().optional(),
        binanceOrderId: z.string().trim().min(1),
        totalJod: z.number(),
        subtotalJod: z.number().optional(),
        feeJod: z.number().optional(),
        totalWithFeeJod: z.number().optional(),
        totalUsdt: z.string().optional(),
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
    return sendBinanceOrderReceivedEmailDirect(data);
  });

/**
 * Server function to notify customer that their order is incomplete / pending payment,
 * providing direct WhatsApp contact button to complete payment via CliQ / Zain Cash / Card.
 */
export const sendIncompleteOrderPaymentEmail = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        orderNumber: z.string().trim().min(1),
        customerEmail: z.string().trim().email(),
        customerName: z.string().optional(),
        customerWhatsapp: z.string().optional(),
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
      await assertAdminCaller();
      const {
        orderNumber,
        customerEmail,
        customerName,
        customerWhatsapp,
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

      // Never generate or leak order tokens for incomplete or unpaid orders!
      // Order tokens are strictly reserved for completed/delivered orders to unlock sensitive digital products.
      const orderUrl = `https://gxstore.me/order/${orderNumber}`;

      // Resolve original product images from database or catalog
      const resolvedItems: OrderItemEmail[] = [];
      const supabase = getServerServiceClient();

      for (const it of items) {
        const finalImage = await resolveProductEmailImage(supabase, it);
        resolvedItems.push({
          ...it,
          name: it.name || (isAr ? "منتج رقمي" : "Digital Product"),
          image: finalImage,
        });
      }

      const greetingName = (customerName && customerName.trim()) || (isAr ? "عميلنا العزيز" : "Valued Customer");

      // WhatsApp URL with pre-filled message (matching the deposit system)
      const itemsListText = resolvedItems
        .map((it) => `• ${it.name}${it.qty && it.qty > 1 ? ` (×${it.qty})` : ""}`)
        .join("\n");

      const waMsgAr = `مرحباً متجر GX Store 👋
أود استكمال الدفع وتأكيد طلبي:
📦 رقم الطلب: #${orderNumber}
👤 العميل: ${greetingName}
💰 المبلغ الإجمالي: ${formattedTotal}
${itemsListText ? `🛒 المنتجات:\n${itemsListText}\n` : ""}🔗 رابط الطلب: ${orderUrl}

أرجو تزويدي ببيانات الدفع (كليك CliQ / زين كاش / بطاقة). شكراً لكم!`;

      const waMsgEn = `Hi GX Store 👋
I would like to complete payment for my order:
📦 Order #: #${orderNumber}
👤 Name: ${greetingName}
💰 Total Amount: ${formattedTotalEn}
${itemsListText ? `🛒 Items:\n${itemsListText}\n` : ""}🔗 Order Link: ${orderUrl}

Please provide payment details (CliQ / Zain Cash / Card). Thank you!`;

      const waLink = `https://wa.me/962776252313?text=${encodeURIComponent(isAr ? waMsgAr : waMsgEn)}`;

      // Subject line
      const subject = isAr
        ? `طلبك رقم #${orderNumber} بانتظار إتمام الدفع — تواصل معنا عبر الواتساب | GX Store`
        : `Action Required: Order #${orderNumber} Pending Payment — Contact via WhatsApp | GX Store`;

      const emailProducts: EmailProductItem[] = resolvedItems.map((item) => {
        const itemRegionFormatted = formatFullRegion(
          {
            region: item.region,
            name: item.name,
            cartId: item.slug || item.variant,
          },
          isAr ? "ar" : "en",
          { withDetails: true }
        );

        const priceText = item.price != null
          ? `${Number(item.price).toFixed(2)} ${isAr ? "د.أ" : "JOD"}`
          : "";

        return {
          name: item.name,
          image: item.image,
          region: isAr ? `المنطقة: ${itemRegionFormatted}` : `Region: ${itemRegionFormatted}`,
          price: priceText,
          qty: item.qty || 1,
        };
      });

      const html = renderGxStoreEmail({
        lang: isAr ? "ar" : "en",
        subject,
        headline: isAr ? "طلبك بانتظار إتمام الدفع 💳" : "Complete your payment",
        greetingText: isAr ? "عميلنا العزيز،" : "Dear Customer,",
        bodyText: isAr
          ? "شكراً لتسوقك من متجرنا! تم تسجيل طلبك لدينا بنجاح، وهو حالياً بانتظار إتمام وتأكيد الدفع لنتمكن من تسليمه وتفعيله لك فوراً."
          : "Thank you for shopping at GX Store! Your order has been placed and is currently pending payment confirmation so we can deliver your products immediately.",
        ctaButton: {
          text: isAr ? "استكمال الدفع عبر واتساب 💬" : "Complete Payment on WhatsApp 💬",
          url: waLink,
        },
        meta: {
          orderIdLabel: isAr ? "رقم الطلب (ORDER ID)" : "ORDER ID",
          orderIdValue: `#${orderNumber}`,
          dateLabel: isAr ? "تاريخ الطلب (ORDER DATE)" : "ORDER DATE",
          dateValue: isAr ? dateFormattedAr : dateFormattedEn,
          emailLabel: isAr ? "البريد الإلكتروني (EMAIL ID)" : "EMAIL ID",
          emailValue: customerEmail,
        },
        summaryTitle: isAr ? "تفاصيل ومحتويات الطلب (ORDER SUMMARY)" : "ORDER SUMMARY",
        products: emailProducts,
        breakdown: {
          rows: [
            {
              label: isAr ? "قيمة الطلب" : "Order Amount",
              value: isAr ? formattedSubtotal : formattedSubtotalEn,
            },
            ...(discountJod && discountJod > 0
              ? [
                  {
                    label: isAr ? "الخصم الترويجي" : "Promo",
                    value: isAr ? formattedDiscount! : formattedDiscountEn!,
                    isPromo: true,
                  },
                ]
              : []),
            {
              label: isAr ? "المبلغ المطلوب" : "ORDER TOTAL",
              value: isAr ? formattedTotal : formattedTotalEn,
              isTotal: true,
            },
          ],
        },
      });

      const apiKey = await getResendApiKey();
      if (!apiKey) {
        console.error("Resend API key is not configured.");
        return { ok: false, error: "مفتاح Resend API غير مهيأ" };
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
        console.error("Resend incomplete order email error:", result);
        return {
          ok: false,
          error: result?.message || "Failed to send email via Resend",
        };
      }

      return { ok: true, emailId: result?.id, waLink };
    } catch (err: any) {
      console.error("Error sending incomplete order payment email:", err);
      return { ok: false, error: err?.message || "Internal error sending email" };
    }
  });

/**
 * Server function to fetch an order using the unguessable cryptographic token (GX Store Secure Token).
 * Validates HMAC signature before returning delivery data.
 */
export const getOrderByTokenFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        orderToken: z.string().trim().min(5),
        accessToken: z.string().optional().nullable(),
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

      let order = (!rpcErr && rpcData) ? rpcData : null;
      if (!order) {
        const { data: directOrder } = await (supabase as any)
          .from("orders")
          .select("*")
          .or(`order_number.eq.${num},order_number.ilike.${num}`)
          .maybeSingle();
        order = directOrder;
      }

      if (!order) {
        return { ok: false, error: "لم يتم العثور على بيانات هذا الطلب" };
      }

      // Critical security rule:
      // Even with a valid cryptographic token, digital product delivery data (keys/codes/accounts)
      // must NEVER be revealed unless the order has actually been marked completed or delivered!
      const status = (order.status || "").toLowerCase();
      if (status === "cancelled") {
        return {
          ok: false,
          isCancelled: true,
          error: "تم إلغاء هذا الطلب نهائياً من قبل إدارة المتجر. تم إيقاف وإلغاء صلاحية هذا الرابط تماماً.",
        };
      }
      const isDeliveredOrCompleted = status === "completed" || status === "delivered";

      if (!isDeliveredOrCompleted) {
        return {
          ok: true,
          order: {
            ...order,
            delivery_data: sanitizeDeliveryDataForPendingOrLocked(order.delivery_data),
          },
          verifiedEmail: verified.email,
          isLocked: true,
        };
      }

      // Check caller identity
      let callerUser: { id: string; email?: string } | null = null;
      const authHeader = await getServerHeader("authorization");
      const token = data.accessToken || (authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null);
      if (token) {
        try {
          const { data: userData } = await getPublicClient().auth.getUser(token);
          if (userData?.user) {
            callerUser = {
              id: userData.user.id,
              email: (userData.user.email || "").toLowerCase().trim(),
            };
          }
        } catch {}
      }

      const isOwnerOrAdmin = Boolean(
        (callerUser && order.user_id && callerUser.id === order.user_id) ||
        (callerUser?.email && (callerUser.email === (order.customer_email || "").toLowerCase().trim() ||
                               callerUser.email === (verified.email || "").toLowerCase().trim())) ||
        (await isCallerOwnerOrAdmin(order.user_id))
      );

      // If user is authenticated as the order owner or admin:
      // They have already proven account identity via password login,
      // so grant full access without IP mismatch blocking!
      if (isOwnerOrAdmin) {
        return { ok: true, ipMismatch: false, order, verifiedEmail: verified.email, isLocked: false };
      }

      // --- Security & Anti-Fraud: IP Address Verification for unauthenticated / guest token links ---
      let currentIp: string | null = null;
      try {
        currentIp = await getServerIp();
      } catch {
        currentIp = null;
      }

      const purchaseIp = (order.client_ip || "").trim();
      const normPurchase = purchaseIp ? normalizeIp(purchaseIp) : "";
      const normCurrent = currentIp ? normalizeIp(currentIp) : "";

      // Strict Rule: If visitor is NOT logged in and current IP differs from purchase IP:
      // The secret email token link NEVER reveals the codes directly from an unknown/different IP.
      // The visitor must follow the steps (log in with password) and view via "My Purchases" (/account).
      if (normPurchase && normCurrent && normPurchase !== normCurrent) {
        return {
          ok: true,
          ipMismatch: true,
          purchaseIp,
          currentIp,
          customerEmail: order.customer_email || verified.email || null,
          orderNumber: order.order_number,
          order: {
            ...maskOrderForPublic(order),
            delivery_data: sanitizeDeliveryDataForPendingOrLocked(order.delivery_data),
          },
          verifiedEmail: verified.email,
          isLocked: true,
        };
      }

      return { ok: true, ipMismatch: false, order, verifiedEmail: verified.email, isLocked: false };
    } catch (err: any) {
      return { ok: false, error: err?.message || "فشل التحقق من الطلب" };
    }
  });

/**
 * Server function to generate a secret GX Store token link for any order (used by admin to copy link).
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
      await assertAdminCaller();
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
        accessToken: z.string().optional().nullable(),
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
          .eq("order_number", num)
          .maybeSingle()
      ).data;

      if (!order) {
        return { ok: false, error: "لم يتم العثور على هذا الطلب" };
      }

      const status = (order.status || "").toLowerCase();
      const isAdminCaller = await isCallerAdmin();
      if (status === "cancelled" && !isAdminCaller) {
        return {
          ok: false,
          isCancelled: true,
          error: "تم إلغاء هذا الطلب نهائياً من قبل إدارة المتجر. تم إيقاف وإلغاء صلاحية هذا الرابط تماماً.",
        };
      }

      // Check caller identity
      let callerUser: { id: string; email?: string } | null = null;
      const authHeader = await getServerHeader("authorization");
      const token = data.accessToken || (authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null);
      if (token) {
        try {
          const { data: userData } = await getPublicClient().auth.getUser(token);
          if (userData?.user) {
            callerUser = {
              id: userData.user.id,
              email: (userData.user.email || "").toLowerCase().trim(),
            };
          }
        } catch {}
      }

      const isOwner = Boolean(
        (callerUser && order.user_id && callerUser.id === order.user_id) ||
        (callerUser?.email && (callerUser.email === (order.customer_email || "").toLowerCase().trim() ||
                               callerUser.email === (tokenCheck?.email || "").toLowerCase().trim())) ||
        (await isCallerOwnerOrAdmin(order.user_id))
      );

      // If user is authenticated as the order owner or admin, allow immediate access:
      if (isOwner || isAdminCaller) {
        return { ok: true, ipMismatch: false, order, isLocked: false };
      }

      // Security & Anti-Fraud: IP Address Verification for secret token links (when not logged in)
      // The secret token link NEVER reveals the codes directly from an unknown/different IP.
      // The visitor must log in and view via "My Purchases" (/account).
      if (hasValidToken) {
        let currentIp: string | null = null;
        try {
          currentIp = await getServerIp();
        } catch {
          currentIp = null;
        }

        const purchaseIp = (order.client_ip || "").trim();
        const normPurchase = purchaseIp ? normalizeIp(purchaseIp) : "";
        const normCurrent = currentIp ? normalizeIp(currentIp) : "";

        if (normPurchase && normCurrent && normPurchase !== normCurrent) {
          return {
            ok: true,
            ipMismatch: true,
            purchaseIp,
            currentIp,
            customerEmail: order.customer_email || tokenCheck?.email || null,
            orderNumber: order.order_number,
            order: {
              ...maskOrderForPublic(order),
              delivery_data: sanitizeDeliveryDataForPendingOrLocked(order.delivery_data),
            },
            isLocked: true,
          };
        }

        // Token is valid and IP matches:
        return { ok: true, ipMismatch: false, order, isLocked: false };
      }

      // Without a valid token or owner/admin session, return only the public order
      // summary: no delivery keys and no customer contact / device details.
      return {
        ok: true,
        isLocked: true,
        order: maskOrderForPublic(order),
      };
    } catch (err: any) {
      return { ok: false, error: err?.message || "Failed to load order" };
    }
  });

/** Fields that must never be returned to someone who only knows the order number. */
const PRIVATE_ORDER_FIELDS = [
  "delivery_data",
  "customer_name",
  "customer_email",
  "customer_whatsapp",
  "client_ip",
  "user_agent",
  "client_meta",
  "admin_notes",
  "user_id",
] as const;

function maskOrderForPublic(order: Record<string, any>): Record<string, any> {
  const masked: Record<string, any> = { ...order };
  for (const key of PRIVATE_ORDER_FIELDS) {
    if (key === "delivery_data") {
      masked[key] = sanitizeDeliveryDataForPendingOrLocked(order.delivery_data);
    } else if (key in masked) {
      masked[key] = null;
    }
  }
  return masked;
}

/** True when the verified signed-in caller owns the order or is an admin. */
async function isCallerAdmin(): Promise<boolean> {
  try {
    const caller = await getVerifiedCaller();
    if (!caller?.userId) return false;
    const userClient = getUserScopedClient(caller.token);
    const { data: isAdmin } = await (userClient as any).rpc("has_role", {
      _user_id: caller.userId,
      _role: "admin",
    });
    return isAdmin === true;
  } catch {
    return false;
  }
}

async function isCallerOwnerOrAdmin(orderUserId: string | null | undefined): Promise<boolean> {
  try {
    const caller = await getVerifiedCaller();
    if (!caller?.userId) return false;
    if (orderUserId && caller.userId === orderUserId) return true;
    const userClient = getUserScopedClient(caller.token);
    const { data: isAdmin } = await (userClient as any).rpc("has_role", {
      _user_id: caller.userId,
      _role: "admin",
    });
    return isAdmin === true;
  } catch {
    return false;
  }
}

/**
 * Server function to record that customer revealed / opened the activation code.
 * Only the order's rightful viewer may record a reveal: a valid signed order link
 * for that order, or the signed-in owner / an admin.
 */
export const markCodeRevealedFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        orderToken: z.string().trim().max(4096).optional(),
        orderNumber: z.string().trim().max(64).optional(),
        codeIndex: z.number().int().min(0).optional(),
      })
      .refine((d) => Boolean(d.orderToken || d.orderNumber), {
        message: "orderToken or orderNumber required",
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    try {
      let num = "";
      let tokenAuthorized = false;
      if (data.orderToken) {
        const verified = verifyOrderToken(data.orderToken);
        if (verified.valid && verified.orderNumber) {
          num = verified.orderNumber.trim().toUpperCase();
          tokenAuthorized = true;
        }
      }
      if (!num && data.orderNumber) {
        num = data.orderNumber.trim().toUpperCase();
      }
      if (!num) {
        return { ok: false };
      }

      const supabase = getServerServiceClient();

      // Without a valid signed link, the caller must be the signed-in owner or an admin.
      if (!tokenAuthorized) {
        const { data: orderRow } = await (supabase as any).rpc("get_order_by_number", {
          _order_number: num,
        });
        if (!orderRow || !(await isCallerOwnerOrAdmin(orderRow.user_id))) {
          return { ok: false };
        }
      }

      let ip: string | null = null;
      try {
        ip = await getServerIp();
      } catch {
        ip = null;
      }
      const country = (await getServerHeader("cf-ipcountry"))?.trim() || null;
      const city = (await getServerHeader("cf-ipcity"))?.trim() || null;
      const userAgent = ((await getServerHeader("user-agent")) || "").slice(0, 300).trim() || null;

      const now = new Date().toISOString();
      const { data: current } = await (supabase as any)
        .from("orders")
        .select("id, client_ip, user_id, delivery_data, codes_revealed_at, codes_reveal_count")
        .eq("order_number", num)
        .maybeSingle();

      if (!current) {
        return { ok: false };
      }

      // If token was used without an active owner/admin session, enforce purchase IP matching:
      const isOwnerOrAdmin = await isCallerOwnerOrAdmin(current.user_id);
      if (!isOwnerOrAdmin && tokenAuthorized) {
        const purchaseIp = (current.client_ip || "").trim();
        const normPurchase = purchaseIp ? normalizeIp(purchaseIp) : "";
        const normCurrent = ip ? normalizeIp(ip) : "";
        if (normPurchase && normCurrent && normPurchase !== normCurrent) {
          return {
            ok: false,
            ipMismatch: true,
            error: "عنوان IP الحالي غير مطابق لعنوان الشراء. يرجى تسجيل الدخول بنفس الحساب للوصول إلى طلبك من مشترياتي.",
          };
        }
      }

      const deliveryData = (current.delivery_data && typeof current.delivery_data === "object")
        ? { ...(current.delivery_data as Record<string, any>) }
        : {};
      const codes = Array.isArray(deliveryData.codes) ? [...deliveryData.codes] : [];

      if (typeof data.codeIndex === "number" && codes[data.codeIndex]) {
        const target = codes[data.codeIndex];
        if (target.is_cancelled || target.status === "cancelled" || target.status === "refunded") {
          return {
            ok: false,
            code_cancelled: true,
            error: "تم إلغاء هذا الكود أو المنتج من قِبل إدارة المتجر ولم يعد متاحاً للكشف.",
          };
        }
        const prevCount = Number(target.reveal_count) || (target.revealed_at ? 1 : 0);
        codes[data.codeIndex] = {
          ...target,
          revealed_at: target.revealed_at || now,
          revealed_ip: target.revealed_ip || ip,
          revealed_country: target.revealed_country || country,
          revealed_city: target.revealed_city || city,
          revealed_ua: target.revealed_ua || userAgent,
          reveal_count: prevCount + 1,
          last_revealed_at: now,
          last_revealed_ip: ip,
        };
        deliveryData.codes = codes;
      } else if (data.codeIndex === undefined && codes.length === 1) {
        // If single code in order and no index passed, stamp it
        const target = codes[0];
        const prevCount = Number(target.reveal_count) || (target.revealed_at ? 1 : 0);
        codes[0] = {
          ...target,
          revealed_at: target.revealed_at || now,
          revealed_ip: target.revealed_ip || ip,
          revealed_country: target.revealed_country || country,
          revealed_city: target.revealed_city || city,
          revealed_ua: target.revealed_ua || userAgent,
          reveal_count: prevCount + 1,
          last_revealed_at: now,
          last_revealed_ip: ip,
        };
        deliveryData.codes = codes;
      }

      if (ip) {
        deliveryData.last_reveal_ip = ip;
        deliveryData.last_reveal_country = country;
        deliveryData.last_reveal_city = city;
      }

      await (supabase as any)
        .from("orders")
        .update({
          delivery_data: deliveryData,
          codes_revealed_at: current.codes_revealed_at || now,
          codes_last_revealed_at: now,
          codes_reveal_count: (current.codes_reveal_count || 0) + 1,
        })
        .eq("id", current.id);

      return {
        ok: true,
        codeIndex: data.codeIndex,
        revealed_at: now,
        codes: deliveryData.codes,
      };
    } catch (err: any) {
      console.error("markCodeRevealedFn error:", err);
      return { ok: false };
    }
  });