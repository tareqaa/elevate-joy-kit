import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "node:crypto";
import { getPublicClient, assertAdminCaller, getVerifiedCaller, getUserScopedClient } from "@/lib/gx/supabase-request";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv, supabaseFetch } from "@/lib/gx/supabase-request";
import type { Database } from "@/integrations/supabase/types";
import { resolveProductImage } from "./product-images";
import { getResendApiKey } from "./resend-key";

const SENDER_EMAIL = "GX Store <noreply@gxstore.me>";
export const CDN_ASSETS_BASE = "https://cdn.jsdelivr.net/gh/tareqaa/elevate-joy-kit@main/public";
export const OFFICIAL_LOGO_URL = `${CDN_ASSETS_BASE}/app/assets/img/gx-logo.png`;

function getOrderTokenSecret(): string {
  const secret =
    process.env.ORDER_TOKEN_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SERVICE_ROLE_KEY;
  if (secret && secret.trim()) return secret.trim();
  // Server-only permanent high-entropy cryptographic pepper (never exposed to client bundles)
  return "gx_master_order_security_pepper_2026_9f8a3d7b2c1e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f";
}

/**
 * Generates an unguessable cryptographic token for an order (Gamivo style JWT).
 * Embeds 256 bits of pure cryptographic CSPRNG randomness (nonce) + HMAC-SHA256 signature,
 * making brute-force or dictionary guessing mathematically impossible (2^256 entropy).
 * STRICT RULE: Only issued upon order completion/delivery to reveal digital products.
 */
export function generateOrderToken(orderNumber: string, email?: string | null, orderId?: string | null): string {
  const header = Buffer.from(JSON.stringify({ typ: "GX-SECURE-TOKEN", alg: "HS256", v: 2 })).toString("base64url");
  const nonce = crypto.randomBytes(32).toString("base64url"); // 256 bits of pure randomness
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 180 * 24 * 60 * 60; // 180 days validity

  const payload = Buffer.from(
    JSON.stringify({
      orderNumber: (orderNumber || "").trim().toUpperCase(),
      orderId: orderId || null,
      email: (email || "").toLowerCase().trim(),
      nonce, // Unpredictable salt prevents guessing even if order number is known
      iat,
      exp,
    })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", getOrderTokenSecret())
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
}

/**
 * Validates the cryptographic order token and extracts order details.
 * Uses constant-time comparison to prevent timing attacks.
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
    const sigBuf = Buffer.from(signature);

    // 1. Verify with current server master secret
    const expectedSig = crypto
      .createHmac("sha256", getOrderTokenSecret())
      .update(`${headerB64}.${payloadB64}`)
      .digest("base64url");
    const expBuf = Buffer.from(expectedSig);

    let isValid = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);

    // 2. Legacy fallback for previously sent emails — only with a real server-side
    //    secret. Never fall back to the public anon key or a literal in source code,
    //    because anyone could use those to forge order links.
    const legacySecret = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!isValid && legacySecret) {
      const legacyExpected = crypto
        .createHmac("sha256", legacySecret)
        .update(`${headerB64}.${payloadB64}`)
        .digest("base64url");
      const legacyExpBuf = Buffer.from(legacyExpected);
      if (sigBuf.length === legacyExpBuf.length && crypto.timingSafeEqual(sigBuf, legacyExpBuf)) {
        isValid = true;
      }
    }

    if (!isValid) {
      return { valid: false, error: "رمز الطلب غير صحيح أو تم التلاعب به" };
    }

    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    if (!payload.orderNumber) {
      return { valid: false, error: "الرمز لا يحتوي على رقم طلب صالح" };
    }

    // Verify expiration timestamp
    if (payload.exp && typeof payload.exp === "number") {
      const now = Math.floor(Date.now() / 1000);
      if (now > payload.exp) {
        return { valid: false, error: "انتهت صلاحية رمز هذا الطلب" };
      }
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

export function toAbsoluteUrl(url?: string | null): string {
  if (!url || !url.trim()) return "";
  let clean = url.trim();

  // If pointing to gxstore.me assets or relative path, redirect to high-availability global CDN
  if (clean.includes("gxstore.me/app/assets/")) {
    clean = clean.replace("https://gxstore.me", CDN_ASSETS_BASE).replace("http://gxstore.me", CDN_ASSETS_BASE);
  } else if (clean.startsWith("/")) {
    clean = `${CDN_ASSETS_BASE}${clean}`;
  } else if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    clean = `${CDN_ASSETS_BASE}/${clean}`;
  }

  // Gmail strictly blocks SVGs: automatically rewrite any SVG extension to PNG
  return clean.replace(/\.svg(\?.*)?$/i, ".png$1");
}

/**
 * Resolves verified, email-compatible (Gmail, Outlook, Apple Mail) raster PNG/JPG cover images.
 * Always returns a guaranteed accessible HTTPS URL on global CDN or external storage.
 */
export function sanitizeImageForEmail(url?: string | null, name?: string, slug?: string): string {
  const cleanName = (name || "").toLowerCase();
  const cleanSlug = (slug || "").toLowerCase();

  // 1. Check canonical unified registry first (TOD variants, Valorant, Discord, etc.)
  const canonical = resolveProductImage({
    cartId: cleanSlug,
    slug: cleanSlug,
    name: cleanName,
  });
  if (canonical) {
    return toAbsoluteUrl(canonical);
  }

  // 2. If a URL is provided (e.g. from Supabase products table or order items)
  if (url && typeof url === "string" && url.trim()) {
    let clean = url.trim();

    // Map specific known SVG/legacy paths to verified CDN assets
    if (
      clean.includes("gemini") ||
      cleanSlug.includes("gemini") ||
      cleanName.includes("gemini") ||
      cleanName.includes("جيمناي") ||
      cleanName.includes("جيميناي") ||
      cleanName.includes("جيميني")
    ) {
      return `${CDN_ASSETS_BASE}/app/assets/img/gemini-logo.png`;
    }

    if (
      clean.includes("autodesk") ||
      cleanSlug.includes("autodesk") ||
      cleanSlug.includes("autocad") ||
      cleanName.includes("autodesk") ||
      cleanName.includes("اوتوديسك")
    ) {
      return `${CDN_ASSETS_BASE}/app/assets/img/autodesk-logo.png`;
    }

    if (
      clean.includes("microsoft365") ||
      cleanSlug.includes("microsoft") ||
      cleanSlug.includes("office") ||
      cleanSlug.includes("365") ||
      cleanName.includes("microsoft") ||
      cleanName.includes("مايكروسوفت")
    ) {
      return `${CDN_ASSETS_BASE}/app/assets/img/microsoft365-logo.png`;
    }

    if (
      clean.includes("windows") ||
      cleanSlug.includes("windows") ||
      cleanName.includes("windows") ||
      cleanName.includes("ويندوز")
    ) {
      return `${CDN_ASSETS_BASE}/app/assets/img/windows-logo.png`;
    }

    if (
      clean.includes("linkedin") ||
      cleanSlug.includes("linkedin") ||
      cleanName.includes("linkedin") ||
      cleanName.includes("لينكد") ||
      cleanName.includes("لينكدإن")
    ) {
      return `${CDN_ASSETS_BASE}/app/assets/img/catalog/linkedin.png`;
    }

    if (clean.includes("facebook")) {
      return `${CDN_ASSETS_BASE}/app/assets/img/facebook-logo.png`;
    }

    if (clean.includes("instagram")) {
      return `${CDN_ASSETS_BASE}/app/assets/img/instagram-logo.png`;
    }

    if (clean.includes("itunes") || cleanSlug.includes("itunes")) {
      return `${CDN_ASSETS_BASE}/app/assets/img/catalog/itunes.jpg`;
    }

    if (clean.includes("xbox") || cleanSlug.includes("xbox")) {
      return `${CDN_ASSETS_BASE}/app/assets/img/catalog/xbox.jpg`;
    }

    if (clean.includes("playstation") || cleanSlug.includes("playstation") || cleanSlug.includes("psn")) {
      return `${CDN_ASSETS_BASE}/app/assets/img/catalog/playstation.jpg`;
    }

    if (clean.includes("steam") || cleanSlug.includes("steam")) {
      return `${CDN_ASSETS_BASE}/app/assets/img/catalog/steam.jpg`;
    }

    // Convert any generic relative or absolute path via toAbsoluteUrl
    const abs = toAbsoluteUrl(clean);
    if (abs) return abs;
  }

  // 2. Fallback to catalog brand matching if no URL was supplied
  if (
    cleanSlug.includes("gemini") ||
    cleanName.includes("gemini") ||
    cleanName.includes("جيمناي") ||
    cleanName.includes("جيميناي") ||
    cleanName.includes("جيميني")
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/gemini-logo.png`;
  }

  if (
    cleanSlug.includes("playstation") ||
    cleanSlug.includes("psn") ||
    cleanName.includes("playstation") ||
    cleanName.includes("بلايستيشن") ||
    cleanName.includes("سوني") ||
    cleanName.includes("psn")
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/playstation.jpg`;
  }

  if (
    cleanSlug.includes("xbox") ||
    cleanName.includes("xbox") ||
    cleanName.includes("اكس بوكس") ||
    cleanName.includes("game pass")
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/xbox.jpg`;
  }

  if (
    cleanSlug.includes("itunes") ||
    cleanSlug.includes("apple") ||
    cleanName.includes("itunes") ||
    cleanName.includes("ايتونز") ||
    cleanName.includes("apple")
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/itunes.jpg`;
  }

  if (
    cleanSlug.includes("steam") ||
    cleanName.includes("steam") ||
    cleanName.includes("ستيم")
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/steam.jpg`;
  }

  if (
    cleanSlug.includes("pubg") ||
    cleanName.includes("pubg") ||
    cleanName.includes("ببجي")
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/pubg-mobile.webp`;
  }

  if (
    cleanSlug.includes("freefire") ||
    cleanSlug.includes("free-fire") ||
    cleanName.includes("freefire") ||
    cleanName.includes("فري فاير")
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/free-fire.png`;
  }

  if (
    cleanSlug.includes("fortnite") ||
    cleanName.includes("fortnite") ||
    cleanName.includes("فورتنايت") ||
    cleanName.includes("فورت نايت") ||
    cleanName.includes("v-bucks")
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/fortnite-logo.png`;
  }

  if (
    cleanSlug.includes("roblox") ||
    cleanName.includes("roblox") ||
    cleanName.includes("روبلوكس") ||
    cleanName.includes("robux")
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/roblox-robux.jpg`;
  }

  if (
    cleanSlug.includes("canva") ||
    cleanName.includes("canva") ||
    cleanName.includes("كانفا")
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/canva-logo.png`;
  }

  if (
    cleanSlug.includes("snapchat") ||
    cleanName.includes("snapchat") ||
    cleanName.includes("سناب")
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/snapchat-logo.png`;
  }

  if (
    cleanSlug.includes("nordvpn") ||
    cleanName.includes("nordvpn") ||
    cleanName.includes("نورد")
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/nordvpn.jpg`;
  }

  if (
    cleanSlug.includes("headspace") ||
    cleanName.includes("headspace") ||
    cleanName.includes("هيد سبيس")
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/headspace.jpg`;
  }

  if (
    cleanSlug.includes("notion") ||
    cleanName.includes("notion") ||
    cleanName.includes("نوشن")
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/notion.jpg`;
  }

  if (cleanSlug.includes("realms")) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/minecraft-realms-plus.png`;
  }

  if (cleanSlug.includes("lovable") || cleanName.includes("lovable") || cleanName.includes("لوفابل")) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/lovable.webp`;
  }

  if (
    cleanSlug.includes("linkedin") ||
    cleanName.includes("linkedin") ||
    cleanName.includes("لينكد") ||
    cleanName.includes("لينكدإن")
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/linkedin.png`;
  }

  if (
    cleanSlug.includes("duolingo") ||
    cleanName.includes("duolingo") ||
    cleanName.includes("دولينجو") ||
    cleanName.includes("دولينقو")
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/duolingo-super.png`;
  }

  if (
    cleanSlug.includes("tod") ||
    cleanName.includes("tod") ||
    cleanName.includes("تود")
  ) {
    if (cleanSlug.includes("4k") || cleanName.includes("4k")) {
      return `${CDN_ASSETS_BASE}/app/assets/img/catalog/tod-4k-card.jpg`;
    }
    if (cleanSlug.includes("mobile") || cleanName.includes("mobile") || cleanName.includes("موبايل")) {
      return `${CDN_ASSETS_BASE}/app/assets/img/catalog/tod-mobile-card.jpg`;
    }
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/tod-standard-card.jpg`;
  }

  if (
    cleanSlug.includes("youtube") ||
    cleanName.includes("youtube") ||
    cleanName.includes("يوتيوب")
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/youtube-premium.jpg`;
  }

  if (
    cleanSlug.includes("discord") ||
    cleanSlug.includes("nitro") ||
    cleanName.includes("discord") ||
    cleanName.includes("nitro") ||
    cleanName.includes("نيترو") ||
    cleanName.includes("دسكورد") ||
    cleanName.includes("ديسكورد")
  ) {
    if (cleanSlug.includes("boost") || cleanName.includes("boost") || cleanName.includes("بوست")) {
      return `${CDN_ASSETS_BASE}/app/assets/img/catalog/discord-boost-14x-1m.png`;
    }
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/discord-nitro-1-month.png`;
  }

  if (
    cleanSlug.includes("windows") ||
    cleanName.includes("windows") ||
    cleanName.includes("ويندوز")
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/windows-logo.png`;
  }

  if (
    cleanSlug.includes("microsoft") ||
    cleanSlug.includes("office") ||
    cleanSlug.includes("365") ||
    cleanName.includes("microsoft") ||
    cleanName.includes("office") ||
    cleanName.includes("اوفيس") ||
    cleanName.includes("مايكروسوفت")
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/microsoft365-logo.png`;
  }

  if (
    cleanSlug.includes("autodesk") ||
    cleanSlug.includes("autocad") ||
    cleanName.includes("autodesk") ||
    cleanName.includes("autocad") ||
    cleanName.includes("اوتوديسك") ||
    cleanName.includes("اوتوكاد")
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/autodesk-logo.png`;
  }

  if (
    cleanSlug.includes("capcut") ||
    cleanName.includes("capcut") ||
    cleanName.includes("كاب كات")
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/capcut-pro.png`;
  }

  if (
    cleanSlug.includes("adobe-acrobat") ||
    cleanName.includes("acrobat") ||
    cleanName.includes("اكروبات")
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/adobe-acrobat.jpg`;
  }

  if (
    cleanSlug.includes("adobe-express") ||
    cleanName.includes("express")
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/adobe-express.jpg`;
  }

  if (
    cleanSlug.includes("adobe") ||
    cleanName.includes("adobe") ||
    cleanName.includes("ادوبي")
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/adobe-cc.webp`;
  }

  return OFFICIAL_LOGO_URL;
}

/**
 * Dynamically resolves the current product image from the live database or catalog.
 * Guarantees that any addition or edit to products in the store is immediately reflected in all outgoing emails.
 */
export async function resolveProductEmailImage(
  supabase: any,
  item: { name?: string; slug?: string; image?: string; id?: string }
): Promise<string> {
  let dbImage: string | null = null;

  if (supabase) {
    try {
      // 1. Precise lookup by slug
      if (item.slug && item.slug.trim()) {
        const { data: prod } = await supabase
          .from("products")
          .select("image_url, icon_image_url")
          .eq("slug", item.slug.trim())
          .maybeSingle();
        if (prod && (prod.image_url || prod.icon_image_url)) {
          dbImage = prod.image_url || prod.icon_image_url;
        }
      }

      // 2. Lookup by id if available
      if (!dbImage && item.id && item.id.trim()) {
        const { data: prod } = await supabase
          .from("products")
          .select("image_url, icon_image_url")
          .eq("id", item.id.trim())
          .maybeSingle();
        if (prod && (prod.image_url || prod.icon_image_url)) {
          dbImage = prod.image_url || prod.icon_image_url;
        }
      }

      // 3. Fallback to product name keyword matching in DB
      if (!dbImage && item.name && item.name.trim()) {
        const cleanName = item.name
          .replace(/\(.*?\)/g, "")
          .replace(/[—\-|].*/, "")
          .trim();
        if (cleanName.length >= 3) {
          const { data: prods } = await supabase
            .from("products")
            .select("image_url, icon_image_url, slug")
            .or(`name_ar.ilike.%${cleanName}%,name_en.ilike.%${cleanName}%,slug.ilike.%${cleanName}%`)
            .limit(1);
          if (prods && prods[0] && (prods[0].image_url || prods[0].icon_image_url)) {
            dbImage = prods[0].image_url || prods[0].icon_image_url;
          }
        }
      }
    } catch (err) {
      console.warn("Dynamic product image lookup warning:", err);
    }
  }

  // Priority: Live DB product image (reflects store additions/edits) -> item image -> keyword fallback
  const rawCandidate = dbImage || item.image || null;
  return sanitizeImageForEmail(rawCandidate, item.name, item.slug);
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

              ${
                isDelivered
                  ? `
              <!-- Big Vibrant Action CTA Button (GX Store Theme: Neon Cyan / Blue) -->
              <div style="text-align:center;margin:28px 0 14px;">
                <a href="${orderUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#00e5ff 0%,#0070f3 100%);background-color:#00e5ff;color:#040914;text-decoration:none;font-size:16px;font-weight:900;padding:16px 42px;border-radius:14px;box-shadow:0 10px 30px rgba(0,229,255,0.45);border:1px solid rgba(0,229,255,0.8);letter-spacing:0.5px;">
                  استلام وتفعيل الطلب كود / حساب 🎮
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
              `
                  : ""
              }

              <!-- Divider -->
              <div style="border-top:1px solid #1e283d;margin:24px 0 20px;"></div>

              <!-- Order Metadata Card (Spaced and Structured so Order ID and Date NEVER collide) -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:22px 0 20px;background:#0d121c;border:1px solid #1e283d;border-radius:14px;padding:16px 20px;">
                <tr>
                  <td align="right" valign="middle" style="padding-bottom:12px;">
                    <div style="font-size:11px;color:#64748b;font-weight:700;margin-bottom:5px;">رقم الطلب (ORDER ID)</div>
                    <div style="font-size:16px;color:#00e5ff;font-weight:900;font-family:ui-monospace,Menlo,monospace;letter-spacing:0.5px;direction:ltr;unicode-bidi:isolate;text-align:right;">#${orderNumber}</div>
                  </td>
                  <td align="left" valign="middle" style="padding-bottom:12px;">
                    <div style="font-size:11px;color:#64748b;font-weight:700;margin-bottom:5px;text-align:left;">حالة الطلب (STATUS)</div>
                    <div style="display:inline-block;padding:5px 14px;background:${isDelivered ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)"};border:1px solid ${isDelivered ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)"};border-radius:20px;font-size:12px;font-weight:800;color:${isDelivered ? "#10b981" : "#ef4444"};white-space:nowrap;">
                      ${isDelivered ? "✅ تم التسليم بنجاح" : "❌ ملغي"}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="border-top:1px solid rgba(255,255,255,0.06);padding-top:12px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="right" valign="middle" style="font-size:12.5px;color:#94a3b8;line-height:1.6;">
                          📅 تاريخ الطلب: <strong style="color:#cbd5e1;direction:rtl;unicode-bidi:isolate;">${dateFormattedAr}</strong>
                        </td>
                        <td align="left" valign="middle" style="font-size:12px;color:#94a3b8;line-height:1.6;">
                          ✉️ البريد: <strong style="color:#38bdf8;direction:ltr;unicode-bidi:isolate;">${customerEmail}</strong>
                        </td>
                      </tr>
                    </table>
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
                  فريق دعم <strong>GX Store</strong> جاهز لخدمتك عبر واتساب لحل أي مشكلة فوراً.
                </p>
                <div style="margin-top:10px;">
                  <a href="https://wa.me/962776252313?text=${encodeURIComponent(`مرحباً، أود المساعدة بشأن طلبي رقم #${orderNumber}`)}" target="_blank" style="display:inline-block;background:#25D366;color:#051c14;padding:8px 16px;border-radius:8px;font-weight:800;font-size:12px;text-decoration:none;">
                    واتساب الدعم الفني
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

              ${
                isDelivered
                  ? `
              <!-- Big Vibrant Action CTA Button (GX Store Theme: Neon Cyan / Blue) -->
              <div style="text-align:center;margin:28px 0 14px;">
                <a href="${orderUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#00e5ff 0%,#0070f3 100%);background-color:#00e5ff;color:#040914;text-decoration:none;font-size:16px;font-weight:900;padding:16px 42px;border-radius:14px;box-shadow:0 10px 30px rgba(0,229,255,0.45);border:1px solid rgba(0,229,255,0.8);letter-spacing:0.5px;">
                  COLLECT YOUR ORDER 🎮
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
              `
                  : ""
              }

              <!-- Divider -->
              <div style="border-top:1px solid #1e283d;margin:24px 0 20px;"></div>

              <!-- Order Metadata Card (Spaced and Structured so Order ID and Date NEVER collide) -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:22px 0 20px;background:#0d121c;border:1px solid #1e283d;border-radius:14px;padding:16px 20px;">
                <tr>
                  <td align="left" valign="middle" style="padding-bottom:12px;">
                    <div style="font-size:11px;color:#64748b;font-weight:700;margin-bottom:5px;">ORDER ID</div>
                    <div style="font-size:16px;color:#00e5ff;font-weight:900;font-family:ui-monospace,Menlo,monospace;letter-spacing:0.5px;direction:ltr;unicode-bidi:isolate;">#${orderNumber}</div>
                  </td>
                  <td align="right" valign="middle" style="padding-bottom:12px;">
                    <div style="font-size:11px;color:#64748b;font-weight:700;margin-bottom:5px;text-align:right;">STATUS</div>
                    <div style="display:inline-block;padding:5px 14px;background:${isDelivered ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)"};border:1px solid ${isDelivered ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)"};border-radius:20px;font-size:12px;font-weight:800;color:${isDelivered ? "#10b981" : "#ef4444"};white-space:nowrap;">
                      ${isDelivered ? "✅ Completed & Delivered" : "❌ Cancelled"}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="border-top:1px solid rgba(255,255,255,0.06);padding-top:12px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="left" valign="middle" style="font-size:12.5px;color:#94a3b8;line-height:1.6;">
                          📅 Order Date: <strong style="color:#cbd5e1;">${dateFormattedEn}</strong>
                        </td>
                        <td align="right" valign="middle" style="font-size:12px;color:#94a3b8;line-height:1.6;">
                          ✉️ Email: <strong style="color:#38bdf8;direction:ltr;unicode-bidi:isolate;">${customerEmail}</strong>
                        </td>
                      </tr>
                    </table>
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
                  <a href="https://wa.me/962776252313?text=${encodeURIComponent(`Hello, I need help with my order #${orderNumber}`)}" target="_blank" style="display:inline-block;background:#25D366;color:#051c14;padding:8px 16px;border-radius:8px;font-weight:800;font-size:12px;text-decoration:none;">
                    WhatsApp Support
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
        ? `⚠️ طلبك رقم #${orderNumber} بانتظار إتمام الدفع — تواصل معنا عبر الواتساب | GX Store`
        : `⚠️ Action Required: Order #${orderNumber} Pending Payment — Contact via WhatsApp | GX Store`;

      // Items list HTML (with original product thumbnail image)
      const itemsHtml = resolvedItems.length > 0
        ? resolvedItems
            .map((item) => {
              const qty = item.qty || 1;
              const priceFormatted = item.price != null
                ? `${Number(item.price).toFixed(2)} ${isAr ? "د.أ" : "JOD"}`
                : "";
              const imgTag = item.image
                ? `<img src="${item.image}" alt="${item.name}" width="56" height="56" style="width:56px;height:56px;border-radius:10px;object-fit:cover;border:1px solid rgba(255,255,255,0.12);display:block;background:#0d121c;">`
                : `<div style="width:56px;height:56px;border-radius:10px;background:#141b27;border:1px solid rgba(255,255,255,0.12);display:block;color:#00e5ff;font-size:22px;text-align:center;line-height:56px;">🎮</div>`;

              return `
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:12px 14px;">
                  <tr>
                    <td width="56" valign="middle" style="${isAr ? "padding-left:14px;" : "padding-right:14px;"}">
                      ${imgTag}
                    </td>
                    <td valign="middle" align="${isAr ? "right" : "left"}">
                      <div style="color:#ffffff;font-size:14px;font-weight:800;line-height:1.4;margin-bottom:4px;">
                        ${item.name}
                      </div>
                      <div style="color:#94a3b8;font-size:12px;">
                        ${isAr ? "المنطقة / الريجون:" : "Region:"} <strong style="color:#38bdf8;">${item.region || (isAr ? "عالمي (Global)" : "Global")}</strong>
                        ${qty > 1 ? ` • <span style="color:#64748b;">${isAr ? "الكمية:" : "Qty:"} x${qty}</span>` : ""}
                      </div>
                    </td>
                    <td width="90" valign="middle" align="${isAr ? "left" : "right"}" style="color:#00e5ff;font-size:15px;font-weight:900;font-family:ui-monospace,Menlo,monospace;white-space:nowrap;padding-${isAr ? "right" : "left"}:8px;">
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

      // ARABIC HTML TEMPLATE (Rich copy, payment methods overview, original product images, no view order details button)
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
          
          <!-- Brand Logo Header -->
          <tr>
            <td style="background:#090d16;padding:22px 28px;border-bottom:1px solid rgba(255,255,255,0.06);text-align:center;">
              <a href="https://gxstore.me" target="_blank" style="text-decoration:none;display:inline-block;">
                <img src="${OFFICIAL_LOGO_URL}" alt="GX Store" width="140" height="auto" style="max-width:140px;height:auto;display:block;margin:0 auto;" />
              </a>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding:32px 28px 20px;">
              
              <!-- Title Badge -->
              <div style="display:inline-block;padding:6px 16px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.35);border-radius:30px;margin-bottom:18px;">
                <span style="font-size:12.5px;font-weight:800;color:#fbbf24;">
                  ⏳ طلب غير مكتمل — بانتظار إتمام الدفع
                </span>
              </div>

              <h1 style="margin:0 0 14px;color:#ffffff;font-size:23px;font-weight:900;line-height:1.35;">
                طلبك بانتظار إتمام الدفع 💳
              </h1>

              <p style="margin:0 0 12px;font-size:15px;color:#ffffff;line-height:1.7;">
                مرحباً بك <strong style="color:#00e5ff;">${greetingName}</strong> 👋،
              </p>

              <p style="margin:0 0 16px;font-size:14.5px;color:#cbd5e1;line-height:1.8;">
                شكراً لتسوقك من <strong>GX Store</strong>! تم تسجيل طلبك لدينا بنجاح، وهو حالياً <strong>غير مكتمل وبانتظار تأكيد الدفع</strong> لتجهيزه وتسليمه لك فوراً.
              </p>

              <!-- Callout Box: Contact via WhatsApp to Pay -->
              <div style="background:linear-gradient(135deg,rgba(37,211,102,0.12) 0%,rgba(0,229,255,0.06) 100%);border:1px solid rgba(37,211,102,0.35);border-radius:14px;padding:18px 20px;margin:22px 0;text-align:center;">
                <div style="font-size:15px;font-weight:900;color:#ffffff;margin-bottom:8px;">
                  💬 لإتمام الدفع وتأكيد طلبك تواصل معنا عبر الواتساب:
                </div>
                <p style="margin:0 0 16px;font-size:13px;color:#cbd5e1;line-height:1.6;">
                  فريق الدعم متواجد لتزويدك ببيانات الدفع الفوري (كليك CliQ / زين كاش / بطاقة) وتأكيد طلبك مباشرة.
                </p>

                <!-- WhatsApp Button -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                  <tr>
                    <td align="center" style="border-radius:12px;background:#25D366;box-shadow:0 8px 24px rgba(37,211,102,0.35);">
                      <a href="${waLink}" target="_blank" style="display:inline-block;padding:14px 34px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:900;color:#051c14;text-decoration:none;border-radius:12px;letter-spacing:0.3px;">
                        💬 استكمال الدفع عبر واتساب →
                      </a>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Available Payment Methods Overview (طرق الدفع المتوفرة عندنا) -->
              <div style="margin:24px 0 20px;">
                <div style="font-size:13px;font-weight:800;color:#00e5ff;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px;">
                  💳 طرق الدفع المتاحة للاستكمال:
                </div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding:12px 14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;font-size:13px;color:#e2e8f0;">
                      🇯🇴 <strong>خدمة كليك (CliQ):</strong> تحويل بنكي فوري من أي بنك أردني بدون أي عمولات.
                    </td>
                  </tr>
                  <tr><td height="8"></td></tr>
                  <tr>
                    <td style="padding:12px 14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;font-size:13px;color:#e2e8f0;">
                      📱 <strong>المحافظ الإلكترونية:</strong> زين كاش (Zain Cash) / أورنج موني / أمنية.
                    </td>
                  </tr>
                  <tr><td height="8"></td></tr>
                  <tr>
                    <td style="padding:12px 14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;font-size:13px;color:#e2e8f0;">
                      💳 <strong>البطاقات البنكية:</strong> بطاقات فيزا وماستركارد عبر رابط دفع مباشر وآمن.
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Order Metadata Card (Spaced so Order Number and Status NEVER collide) -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:22px 0 18px;background:#0d121c;border:1px solid #1e283d;border-radius:14px;padding:14px 18px;">
                <tr>
                  <td align="right" valign="middle" style="padding-bottom:10px;">
                    <div style="font-size:11px;color:#64748b;font-weight:700;margin-bottom:4px;">رقم الطلب (ORDER ID)</div>
                    <div style="font-size:16px;color:#00e5ff;font-weight:900;font-family:ui-monospace,Menlo,monospace;letter-spacing:0.5px;">#${orderNumber}</div>
                  </td>
                  <td align="left" valign="middle" style="padding-bottom:10px;">
                    <div style="font-size:11px;color:#64748b;font-weight:700;margin-bottom:4px;text-align:left;">حالة الطلب</div>
                    <div style="display:inline-block;padding:5px 14px;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);border-radius:20px;font-size:12px;font-weight:800;color:#fbbf24;white-space:nowrap;">
                      ⏳ بانتظار إتمام الدفع
                    </div>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="border-top:1px solid rgba(255,255,255,0.06);padding-top:10px;">
                    <div style="font-size:11.5px;color:#94a3b8;">
                      تاريخ إنشاء الطلب: <strong style="color:#cbd5e1;">${dateFormattedAr}</strong>
                    </div>
                  </td>
                </tr>
              </table>

              ${
                notes && notes.trim()
                  ? `<div style="background:rgba(0,229,255,0.06);border:1px dashed rgba(0,229,255,0.3);border-radius:12px;padding:14px 16px;margin-bottom:22px;font-size:13px;color:#e0f2fe;line-height:1.7;">
                      <div style="font-weight:800;color:#00e5ff;margin-bottom:4px;">💡 ملاحظة من إدارة المتجر:</div>
                      <div>${notes.trim()}</div>
                    </div>`
                  : ""
              }

              <!-- Products Header -->
              <div style="font-size:13px;font-weight:800;color:#00e5ff;text-transform:uppercase;letter-spacing:0.5px;margin:22px 0 14px;border-bottom:1px solid #1e283d;padding-bottom:8px;">
                المنتجات المحجوزة في هذا الطلب (${resolvedItems.length})
              </div>

              <!-- Items List (with original images) -->
              ${itemsHtml}

              <!-- Pricing Summary Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0 24px;background:#0d121c;border:1px solid #1e283d;border-radius:14px;padding:16px 20px;">
                ${
                  formattedDiscount
                    ? `
                  <tr>
                    <td style="color:#94a3b8;font-size:13px;padding-bottom:8px;">المجموع الفرعي</td>
                    <td align="left" style="color:#ffffff;font-size:13px;font-weight:700;padding-bottom:8px;font-family:ui-monospace,Menlo,monospace;">${formattedSubtotal}</td>
                  </tr>
                  <tr>
                    <td style="color:#10b981;font-size:13px;padding-bottom:8px;">خصم الكوبون / النقاط</td>
                    <td align="left" style="color:#10b981;font-size:13px;font-weight:800;padding-bottom:8px;font-family:ui-monospace,Menlo,monospace;">${formattedDiscount}</td>
                  </tr>
                `
                    : ""
                }
                <tr>
                  <td style="color:#ffffff;font-size:15px;font-weight:900;padding-top:6px;border-top:1px solid rgba(255,255,255,0.06);">المبلغ المطلوب سداده</td>
                  <td align="left" style="color:#00e5ff;font-size:18px;font-weight:900;padding-top:6px;border-top:1px solid rgba(255,255,255,0.06);font-family:ui-monospace,Menlo,monospace;">${formattedTotal}</td>
                </tr>
              </table>

              <!-- Reassurance / Guarantee -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:rgba(0,229,255,0.03);border:1px solid rgba(0,229,255,0.12);border-radius:12px;padding:14px;margin-bottom:12px;">
                <tr>
                  <td width="36" valign="top" style="padding-left:12px;font-size:22px;">🛡️</td>
                  <td valign="top" style="font-size:12px;color:#94a3b8;line-height:1.6;">
                    <strong style="color:#ffffff;">أمان وضمان 100%:</strong>
                    طلبك محجوز لك. فور استلام وصل التحويل على الواتساب، سيتم تأكيد الدفع وإرسال مفاتيح التفعيل والحسابات مباشرة إلى بريدك الإلكتروني.
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#090d16;padding:24px 28px;border-top:1px solid #1e283d;text-align:center;">
              <p style="margin:0 0 10px;font-size:12px;color:#64748b;">
                هل لديك استفسار؟ واتساب الدعم الفني: <a href="${waLink}" style="color:#25D366;font-weight:800;text-decoration:none;">+962 7 7625 2313</a>
              </p>
              <p style="margin:0;font-size:11px;color:#475569;">
                © ${new Date().getFullYear()} GX Store. جميع الحقوق محفوظة.
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

      // ENGLISH HTML TEMPLATE (with original product images, payment methods, separated order metadata, no view order details button)
      const englishHtml = `
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#080b12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f1f5f9;direction:ltr;text-align:left;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#080b12;width:100%;padding:32px 14px;">
    <tr>
      <td align="center">
        <!-- Main Container Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:580px;background:linear-gradient(180deg,#121724 0%,#0c0f18 100%);border:1px solid #1e283d;border-radius:20px;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.7);">
          
          <!-- Header -->
          <tr>
            <td style="background:#090d16;padding:22px 28px;border-bottom:1px solid rgba(255,255,255,0.06);text-align:center;">
              <a href="https://gxstore.me" target="_blank" style="text-decoration:none;display:inline-block;">
                <img src="${OFFICIAL_LOGO_URL}" alt="GX Store" width="140" height="auto" style="max-width:140px;height:auto;display:block;margin:0 auto;" />
              </a>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding:32px 28px 20px;">
              <div style="display:inline-block;padding:6px 16px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.35);border-radius:30px;margin-bottom:18px;">
                <span style="font-size:12.5px;font-weight:800;color:#fbbf24;">
                  ⏳ Order Incomplete — Pending Payment
                </span>
              </div>

              <h1 style="margin:0 0 14px;color:#ffffff;font-size:23px;font-weight:900;line-height:1.35;">
                Order #${orderNumber} is Pending Payment 💳
              </h1>

              <p style="margin:0 0 12px;font-size:15px;color:#ffffff;line-height:1.7;">
                Hello <strong style="color:#00e5ff;">${greetingName}</strong> 👋,
              </p>

              <p style="margin:0 0 16px;font-size:14.5px;color:#cbd5e1;line-height:1.8;">
                Thank you for shopping at <strong>GX Store</strong>! Your order has been placed and is currently <strong>incomplete / pending payment confirmation</strong>.
              </p>

              <div style="background:linear-gradient(135deg,rgba(37,211,102,0.12) 0%,rgba(0,229,255,0.06) 100%);border:1px solid rgba(37,211,102,0.35);border-radius:14px;padding:18px 20px;margin:22px 0;text-align:center;">
                <div style="font-size:15px;font-weight:900;color:#ffffff;margin-bottom:8px;">
                  💬 To complete payment, please contact us on WhatsApp:
                </div>
                <p style="margin:0 0 16px;font-size:13px;color:#cbd5e1;line-height:1.6;">
                  Our support team will promptly provide payment details (CliQ, Zain Cash, or Card) and deliver your items instantly.
                </p>

                <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                  <tr>
                    <td align="center" style="border-radius:12px;background:#25D366;box-shadow:0 8px 24px rgba(37,211,102,0.35);">
                      <a href="${waLink}" target="_blank" style="display:inline-block;padding:14px 34px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:900;color:#051c14;text-decoration:none;border-radius:12px;">
                        💬 Complete Payment on WhatsApp →
                      </a>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Payment Methods Overview -->
              <div style="margin:24px 0 20px;">
                <div style="font-size:12.5px;font-weight:800;color:#00e5ff;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;">
                  Payment Methods Available:
                </div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding:10px 12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;font-size:12.5px;color:#e2e8f0;">
                      🇯🇴 <strong>CliQ (Jordan):</strong> Instant bank transfer from any Jordanian bank with zero fees.
                    </td>
                  </tr>
                  <tr><td height="6"></td></tr>
                  <tr>
                    <td style="padding:10px 12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;font-size:12.5px;color:#e2e8f0;">
                      📱 <strong>E-Wallets:</strong> Zain Cash / Orange Money / Umniah.
                    </td>
                  </tr>
                  <tr><td height="6"></td></tr>
                  <tr>
                    <td style="padding:10px 12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;font-size:12.5px;color:#e2e8f0;">
                      💳 <strong>Cards:</strong> Visa and MasterCard via direct secure payment link.
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Order Metadata Card (Spaced so Order Number and Status NEVER collide) -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0 18px;background:#0d121c;border:1px solid #1e283d;border-radius:14px;padding:14px 18px;">
                <tr>
                  <td align="left" valign="middle" style="padding-bottom:10px;">
                    <div style="font-size:11px;color:#64748b;font-weight:700;margin-bottom:4px;">ORDER ID</div>
                    <div style="font-size:16px;color:#00e5ff;font-weight:900;font-family:ui-monospace,Menlo,monospace;letter-spacing:0.5px;">#${orderNumber}</div>
                  </td>
                  <td align="right" valign="middle" style="padding-bottom:10px;">
                    <div style="font-size:11px;color:#64748b;font-weight:700;margin-bottom:4px;">STATUS</div>
                    <div style="display:inline-block;padding:5px 14px;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);border-radius:20px;font-size:12px;font-weight:800;color:#fbbf24;white-space:nowrap;">
                      ⏳ Pending Payment
                    </div>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="border-top:1px solid rgba(255,255,255,0.06);padding-top:10px;">
                    <div style="font-size:11.5px;color:#94a3b8;">
                      Order Placed: <strong style="color:#cbd5e1;">${dateFormattedEn}</strong>
                    </div>
                  </td>
                </tr>
              </table>

              ${
                notes && notes.trim()
                  ? `<div style="background:rgba(0,229,255,0.06);border:1px dashed rgba(0,229,255,0.3);border-radius:12px;padding:14px 16px;margin-bottom:22px;font-size:13px;color:#e0f2fe;line-height:1.7;">
                      <div style="font-weight:800;color:#00e5ff;margin-bottom:4px;">💡 Note from Store Management:</div>
                      <div>${notes.trim()}</div>
                    </div>`
                  : ""
              }

              <!-- Items List -->
              <div style="font-size:13px;font-weight:800;color:#00e5ff;text-transform:uppercase;letter-spacing:0.5px;margin:22px 0 14px;border-bottom:1px solid #1e283d;padding-bottom:8px;">
                Reserved Items (${resolvedItems.length})
              </div>
              ${itemsHtml}

              <!-- Pricing Summary -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0 24px;background:#0d121c;border:1px solid #1e283d;border-radius:14px;padding:16px 20px;">
                <tr>
                  <td style="color:#ffffff;font-size:15px;font-weight:900;">Total Amount Due</td>
                  <td align="right" style="color:#00e5ff;font-size:18px;font-weight:900;font-family:ui-monospace,Menlo,monospace;">${formattedTotalEn}</td>
                </tr>
              </table>

              <!-- 100% Security & Guarantee -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:rgba(0,229,255,0.03);border:1px solid rgba(0,229,255,0.12);border-radius:12px;padding:14px;margin-bottom:12px;">
                <tr>
                  <td width="36" valign="top" style="padding-right:12px;font-size:22px;">🛡️</td>
                  <td valign="top" style="font-size:12px;color:#94a3b8;line-height:1.6;">
                    <strong style="color:#ffffff;">100% Guaranteed & Secured:</strong>
                    Your items are reserved. Once your payment receipt is confirmed on WhatsApp, your activation credentials or keys will be delivered immediately to your email.
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#090d16;padding:24px 28px;border-top:1px solid #1e283d;text-align:center;">
              <p style="margin:0 0 10px;font-size:12px;color:#64748b;">
                Need assistance? WhatsApp Support: <a href="${waLink}" style="color:#25D366;font-weight:800;text-decoration:none;">+962 7 7625 2313</a>
              </p>
              <p style="margin:0;font-size:11px;color:#475569;">
                © ${new Date().getFullYear()} GX Store. All rights reserved.
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
      const isDeliveredOrCompleted = status === "completed" || status === "delivered";

      if (!isDeliveredOrCompleted) {
        return {
          ok: true,
          order: {
            ...order,
            delivery_data: null, // Strictly masked for non-delivered orders!
          },
          verifiedEmail: verified.email,
          isLocked: true,
        };
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

      // 2. Authorize if cryptographically signed token is valid, or if logged-in user is owner or admin
      const isAuthorized = Boolean(hasValidToken) || (await isCallerOwnerOrAdmin(order.user_id));

      if (isAuthorized) {
        return { ok: true, order, isLocked: false };
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
    if (key in masked) masked[key] = null;
  }
  return masked;
}

/** True when the verified signed-in caller owns the order or is an admin. */
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

      // Primary: call SECURITY DEFINER RPC to bypass RLS update restriction
      try {
        const { data: rpcRes, error: rpcErr } = await (supabase.rpc as any)("mark_order_code_revealed", {
          p_order_number: num,
        });
        if (!rpcErr && rpcRes && rpcRes.ok) {
          return { ok: true, revealed_at: rpcRes.revealed_at, count: rpcRes.reveal_count };
        }
      } catch {}

      // Fallback: direct update
      const now = new Date().toISOString();
      const { data: current } = await (supabase as any)
        .from("orders")
        .select("id, codes_revealed_at, codes_reveal_count")
        .eq("order_number", num)
        .maybeSingle();

      if (current) {
        await (supabase as any)
          .from("orders")
          .update({
            codes_revealed_at: current.codes_revealed_at || now,
            codes_last_revealed_at: now,
            codes_reveal_count: (current.codes_reveal_count || 0) + 1,
          })
          .eq("id", current.id);
      }

      return { ok: true, revealed_at: current?.codes_revealed_at || now };
    } catch {
      return { ok: false };
    }
  });

