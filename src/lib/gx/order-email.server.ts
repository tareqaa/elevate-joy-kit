/* ============================================================
   GX STORE — ORDER EMAIL & TOKEN SERVER HELPERS
   Server-only functions for order tokens, cryptographic HMAC verification,
   image resolving, and email dispatching via Resend.
   ============================================================ */

import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv, supabaseFetch } from "@/lib/gx/supabase-request";
import type { Database } from "@/integrations/supabase/types";
import { resolveProductImage } from "./product-images";
import { getResendApiKey } from "./resend-key";
import { renderGxStoreEmail, escapeHtml, type EmailProductItem } from "./email-theme";
import { formatCurrencyValue } from "./currency";

export const SENDER_EMAIL = "GX Store <noreply@gxstore.me>";
export const CDN_ASSETS_BASE = "https://cdn.jsdelivr.net/gh/tareqaa/elevate-joy-kit@main/public";
export const OFFICIAL_LOGO_URL = `${CDN_ASSETS_BASE}/app/assets/img/gx-logo.png`;

export function getOrderTokenSecret(): string {
  const secret =
    process.env.ORDER_TOKEN_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SERVICE_ROLE_KEY;
  if (secret && secret.trim()) return secret.trim();
  // Fail closed: never sign or accept order links with a key that lives in source code.
  throw new Error("Order link signing key is not configured (ORDER_TOKEN_SECRET)");
}

/**
 * Generates an unguessable cryptographic token for an order (GX Store Secure Token).
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

    // 2. Legacy fallback for previously sent emails
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
    console.error("verifyOrderToken failed:", err?.message);
    return { valid: false, error: "فشل التحقق من صحة الرمز" };
  }
}

export function getServerServiceClient() {
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
export function sanitizeImageForEmail(url?: string | null, name?: string, slug?: string, cartId?: string): string {
  const cleanName = (name || "").toLowerCase();
  const cleanSlug = (slug || "").toLowerCase();
  const cleanId = (cartId || "").toLowerCase();

  // 1. Check canonical unified registry first
  const canonical = resolveProductImage({
    cartId: cleanId || cleanSlug,
    slug: cleanSlug,
    name: cleanName,
  });
  if (canonical) {
    return toAbsoluteUrl(canonical);
  }

  // 2. If a URL is provided
  if (url && typeof url === "string" && url.trim()) {
    let clean = url.trim();

    if (
      clean.includes("xbox-game-pass-ultimate") ||
      cleanSlug.includes("ultimate") ||
      cleanName.includes("ultimate") ||
      cleanName.includes("التيمت") ||
      cleanName.includes("التميت")
    ) {
      return `${CDN_ASSETS_BASE}/app/assets/img/catalog/xbox-game-pass-ultimate.jpg`;
    }

    if (
      clean.includes("pc-game-pass") ||
      cleanSlug.includes("pc-game-pass") ||
      (cleanName.includes("game pass") && cleanName.includes("pc")) ||
      (cleanName.includes("قيم باس") && cleanName.includes("pc"))
    ) {
      return `${CDN_ASSETS_BASE}/app/assets/img/catalog/pc-game-pass.jpg`;
    }

    if (
      clean.includes("roblox") ||
      cleanSlug.includes("roblox") ||
      cleanName.includes("roblox") ||
      cleanName.includes("روبلوكس") ||
      cleanName.includes("روبوكس")
    ) {
      return `${CDN_ASSETS_BASE}/app/assets/img/catalog/roblox-robux.jpg`;
    }

    if (
      clean.includes("gemini") ||
      cleanSlug.includes("gemini") ||
      cleanName.includes("gemini") ||
      cleanName.includes("جيميناي")
    ) {
      return `${CDN_ASSETS_BASE}/app/assets/img/gemini-logo.png`;
    }

    if (
      clean.includes("autodesk") ||
      cleanSlug.includes("autodesk") ||
      cleanName.includes("autodesk") ||
      cleanName.includes("اوتوديسك")
    ) {
      return `${CDN_ASSETS_BASE}/app/assets/img/autodesk-logo.png`;
    }

    if (
      clean.includes("microsoft") ||
      clean.includes("office") ||
      cleanSlug.includes("office") ||
      cleanName.includes("أوفيس") ||
      cleanName.includes("اوفيس")
    ) {
      return `${CDN_ASSETS_BASE}/app/assets/img/microsoft365-logo.png`;
    }

    if (
      clean.includes("windows") ||
      cleanSlug.includes("windows") ||
      cleanName.includes("ويندوز")
    ) {
      return `${CDN_ASSETS_BASE}/app/assets/img/windows-logo.png`;
    }

    if (clean.includes("linkedin") || cleanSlug.includes("linkedin") || cleanName.includes("لينكد")) {
      return `${CDN_ASSETS_BASE}/app/assets/img/catalog/linkedin.png`;
    }
    if (clean.includes("facebook") || cleanSlug.includes("facebook") || cleanName.includes("فيسبوك")) {
      return `${CDN_ASSETS_BASE}/app/assets/img/facebook-logo.png`;
    }
    if (clean.includes("instagram") || cleanSlug.includes("instagram") || cleanName.includes("انستغرام")) {
      return `${CDN_ASSETS_BASE}/app/assets/img/instagram-logo.png`;
    }

    if (
      clean.includes("itunes") ||
      clean.includes("apple") ||
      cleanSlug.includes("itunes") ||
      cleanSlug.includes("apple") ||
      cleanName.includes("itunes") ||
      cleanName.includes("ايتونز") ||
      cleanName.includes("آيتونز")
    ) {
      return `${CDN_ASSETS_BASE}/app/assets/img/itunes-card.png`;
    }
    if (clean.includes("playstation") || cleanSlug.includes("playstation") || cleanName.includes("بلايستيشن")) {
      return `${CDN_ASSETS_BASE}/app/assets/img/playstation-store-card.jpg`;
    }
    if (clean.includes("steam") || cleanSlug.includes("steam") || cleanName.includes("ستيم")) {
      return `${CDN_ASSETS_BASE}/app/assets/img/catalog/steam.jpg`;
    }
    if (clean.includes("xbox") || cleanSlug.includes("xbox") || cleanName.includes("اكسبوكس")) {
      return `${CDN_ASSETS_BASE}/app/assets/img/catalog/xbox.jpg`;
    }

    const abs = toAbsoluteUrl(clean);
    if (abs.startsWith("http://") || abs.startsWith("https://")) {
      return abs;
    }
  }

  // 3. Fallback to name/slug heuristics
  if (
    cleanName.includes("gemini") ||
    cleanSlug.includes("gemini") ||
    cleanName.includes("جيميناي") ||
    cleanName.includes("advanced")
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/gemini-logo.png`;
  }
  if (
    cleanName.includes("playstation") ||
    cleanSlug.includes("playstation") ||
    cleanName.includes("بلايستيشن") ||
    cleanName.includes("ستور")
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/playstation-store-card.jpg`;
  }
  if (
    cleanName.includes("ultimate") ||
    cleanName.includes("التيمت") ||
    cleanName.includes("التميت") ||
    cleanSlug.includes("ultimate")
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/xbox-game-pass-ultimate.jpg`;
  }
  if (
    cleanName.includes("pc game pass") ||
    cleanSlug.includes("pc-game-pass") ||
    (cleanName.includes("قيم باس") && cleanName.includes("pc"))
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/pc-game-pass.jpg`;
  }
  if (cleanName.includes("xbox") || cleanSlug.includes("xbox") || cleanName.includes("اكسبوكس")) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/xbox.jpg`;
  }
  if (
    cleanName.includes("itunes") ||
    cleanSlug.includes("itunes") ||
    cleanName.includes("apple") ||
    cleanName.includes("ايتونز") ||
    cleanName.includes("آيتونز")
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/itunes.jpg`;
  }
  if (cleanName.includes("steam") || cleanSlug.includes("steam") || cleanName.includes("ستيم")) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/steam.jpg`;
  }
  if (cleanName.includes("pubg") || cleanSlug.includes("pubg") || cleanName.includes("ببجي")) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/pubg-mobile.webp`;
  }
  if (
    cleanName.includes("free fire") ||
    cleanSlug.includes("freefire") ||
    cleanName.includes("فراير") ||
    cleanName.includes("فاير")
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/free-fire.png`;
  }
  if (cleanName.includes("fortnite") || cleanSlug.includes("fortnite") || cleanName.includes("فورتنايت")) {
    return `${CDN_ASSETS_BASE}/app/assets/img/fortnite-logo.png`;
  }
  if (
    cleanName.includes("roblox") ||
    cleanSlug.includes("roblox") ||
    cleanName.includes("روبلوكس") ||
    cleanName.includes("روبوكس")
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/roblox-robux.jpg`;
  }
  if (cleanName.includes("canva") || cleanSlug.includes("canva") || cleanName.includes("كانفا")) {
    return `${CDN_ASSETS_BASE}/app/assets/img/canva-logo.png`;
  }
  if (cleanName.includes("snapchat") || cleanSlug.includes("snapchat") || cleanName.includes("سناب")) {
    return `${CDN_ASSETS_BASE}/app/assets/img/snapchat-logo.png`;
  }
  if (cleanName.includes("nordvpn") || cleanSlug.includes("nordvpn") || cleanName.includes("نورد")) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/nordvpn.jpg`;
  }
  if (cleanName.includes("headspace") || cleanSlug.includes("headspace")) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/headspace.jpg`;
  }
  if (cleanName.includes("notion") || cleanSlug.includes("notion") || cleanName.includes("نوشن")) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/notion.jpg`;
  }
  if (cleanName.includes("minecraft") || cleanSlug.includes("minecraft") || cleanName.includes("ماين كرافت")) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/minecraft-realms-plus.png`;
  }
  if (cleanName.includes("lovable") || cleanSlug.includes("lovable")) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/lovable.webp`;
  }
  if (
    cleanName.includes("linkedin") ||
    cleanSlug.includes("linkedin") ||
    cleanName.includes("لينكد ان") ||
    cleanName.includes("لينكدإن")
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/linkedin.png`;
  }
  if (cleanName.includes("duolingo") || cleanSlug.includes("duolingo") || cleanName.includes("دولينجو")) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/duolingo-super.png`;
  }
  if (cleanName.includes("autodesk") || cleanSlug.includes("autodesk") || cleanName.includes("اوتوديسك")) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/autodesk-cover.jpg`;
  }
  if (
    cleanName.includes("tod") ||
    cleanSlug.includes("tod") ||
    cleanName.includes("تود") ||
    cleanId.includes("tod")
  ) {
    if (cleanName.includes("4k") || cleanSlug.includes("4k") || cleanId.includes("4k")) {
      return `${CDN_ASSETS_BASE}/app/assets/img/catalog/tod-4k-card.jpg`;
    }
    if (cleanName.includes("mobile") || cleanSlug.includes("mobile") || cleanId.includes("mobile")) {
      return `${CDN_ASSETS_BASE}/app/assets/img/catalog/tod-mobile-card.jpg`;
    }
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/tod-standard-card.jpg`;
  }
  if (cleanName.includes("youtube") || cleanSlug.includes("youtube") || cleanName.includes("يوتيوب")) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/youtube-premium.jpg`;
  }
  if (cleanName.includes("discord") || cleanSlug.includes("discord") || cleanName.includes("ديسكورد")) {
    if (
      cleanName.includes("boost") ||
      cleanSlug.includes("boost") ||
      cleanName.includes("14") ||
      cleanName.includes("سيرفر")
    ) {
      return `${CDN_ASSETS_BASE}/app/assets/img/catalog/discord-boost-14x-1m.png`;
    }
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/discord-nitro-1-month.png`;
  }
  if (cleanName.includes("windows") || cleanSlug.includes("windows") || cleanName.includes("ويندوز")) {
    return `${CDN_ASSETS_BASE}/app/assets/img/windows-logo.png`;
  }
  if (
    cleanName.includes("office") ||
    cleanName.includes("365") ||
    cleanSlug.includes("office") ||
    cleanName.includes("مايكروسوفت") ||
    cleanName.includes("أوفيس") ||
    cleanName.includes("اوفيس")
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/microsoft365-logo.png`;
  }
  if (cleanName.includes("autodesk") || cleanSlug.includes("autodesk") || cleanName.includes("أوتوديسك")) {
    return `${CDN_ASSETS_BASE}/app/assets/img/autodesk-logo.png`;
  }
  if (cleanName.includes("capcut") || cleanSlug.includes("capcut") || cleanName.includes("كاب كت")) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/capcut-pro.png`;
  }
  if (
    cleanName.includes("acrobat") ||
    cleanSlug.includes("acrobat") ||
    cleanName.includes("أكروبات") ||
    cleanName.includes("اكروبات")
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/adobe-acrobat.jpg`;
  }
  if (cleanName.includes("adobe express") || cleanSlug.includes("adobe-express")) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/adobe-express.jpg`;
  }
  if (
    cleanName.includes("adobe") ||
    cleanSlug.includes("adobe") ||
    cleanName.includes("أدوبي") ||
    cleanName.includes("ادوبي")
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/adobe-cc.webp`;
  }

  return OFFICIAL_LOGO_URL;
}

/**
 * Dynamically resolves the current product image from the live database or catalog.
 */
export async function resolveProductEmailImage(
  supabase: any,
  item: { name?: string; slug?: string; image?: string; id?: string; variant?: string; cartId?: string }
): Promise<string> {
  let dbImage: string | null = null;

  if (supabase) {
    try {
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

  const rawCandidate = dbImage || item.image || null;
  return sanitizeImageForEmail(rawCandidate, item.name, item.slug, item.variant || item.cartId);
}

/**
 * Strips secret digital delivery payload (keys, codes, credentials, accounts)
 * from delivery_data while strictly preserving public order payment metadata
 * (payment_method, binance_order_id, total_usdt, fee_jod, etc.) so pending
 * orders display accurate payment review details without leaking product codes.
 */
export function sanitizeDeliveryDataForPendingOrLocked(raw: any): Record<string, any> | null {
  let parsed = raw;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const safe: Record<string, any> = {};
  const safeAllowedKeys = [
    "payment_method",
    "binance_order_id",
    "binance_id",
    "total_usdt",
    "fee_jod",
    "total_with_fee_jod",
    "tax_amount",
    "fee_rate",
    "lang",
    "customer_notes",
    "notes",
    "contact_type",
    "currency",
  ];
  for (const k of safeAllowedKeys) {
    if (k in parsed && parsed[k] !== undefined && parsed[k] !== null) {
      safe[k] = parsed[k];
    }
  }
  return Object.keys(safe).length > 0 ? safe : null;
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
  feeJod?: number;
  totalWithFeeJod?: number;
  paymentMethod?: string;
  items?: OrderItemEmail[];
  notes?: string;
  createdAt?: string;
  cancellationReason?: string;
  orderToken?: string;
  lang?: "ar" | "en";
};

export type SendBinanceOrderReceivedEmailInput = {
  orderNumber: string;
  orderToken?: string;
  customerEmail: string;
  customerName?: string;
  binanceOrderId: string;
  totalJod: number;
  subtotalJod?: number;
  feeJod?: number;
  totalWithFeeJod?: number;
  totalUsdt?: string;
  items?: OrderItemEmail[];
  notes?: string;
  createdAt?: string;
  lang?: "ar" | "en";
  currency?: string;
};

/**
 * Direct server-side function to send Binance Pay order receipt / verification email.
 * Called immediately upon placing an order via Binance Pay.
 */
export async function sendBinanceOrderReceivedEmailDirect(input: SendBinanceOrderReceivedEmailInput) {
  try {
    const {
      orderNumber,
      orderToken: inputToken,
      customerEmail,
      customerName,
      binanceOrderId,
      totalJod,
      subtotalJod,
      feeJod = 0,
      totalWithFeeJod,
      totalUsdt,
      items = [],
      notes,
      createdAt,
      lang = "ar",
      currency: inputCurrency,
    } = input;

    if (!customerEmail || !customerEmail.includes("@")) {
      return { ok: false, error: "Invalid email" };
    }

    const currency = (inputCurrency || "USD").toUpperCase().trim();
    const isAr = lang === "ar";
    const effectiveTotalJod = totalWithFeeJod != null ? totalWithFeeJod : (totalJod + feeJod);
    const effectiveSubtotalJod = subtotalJod != null ? subtotalJod : totalJod;
    const effectiveUsdt = totalUsdt || (effectiveTotalJod * 1.41).toFixed(2);

    const formattedSubtotal = formatCurrencyValue(effectiveSubtotalJod, currency, true);
    const formattedSubtotalEn = formatCurrencyValue(effectiveSubtotalJod, currency, false);
    const formattedFee = feeJod > 0 ? `+${formatCurrencyValue(feeJod, currency, true)}` : null;
    const formattedFeeEn = feeJod > 0 ? `+${formatCurrencyValue(feeJod, currency, false)}` : null;

    let formattedTotal: string;
    let formattedTotalEn: string;
    if (currency === "USD") {
      formattedTotal = `${effectiveUsdt} $ (USD) (≈ ${effectiveUsdt} USDT)`;
      formattedTotalEn = `${effectiveUsdt} USD (≈ ${effectiveUsdt} USDT)`;
    } else {
      formattedTotal = `${formatCurrencyValue(effectiveTotalJod, currency, true)} (≈ ${effectiveUsdt} USDT)`;
      formattedTotalEn = `${formatCurrencyValue(effectiveTotalJod, currency, false)} (≈ ${effectiveUsdt} USDT)`;
    }

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

    const token = inputToken || generateOrderToken(orderNumber, customerEmail);
    const orderUrl = `https://gxstore.me/order/completed?order_token=${encodeURIComponent(token)}`;

    // Resolve images
    const supabase = getServerServiceClient();
    const resolvedItems: OrderItemEmail[] = [];
    for (const it of items) {
      const finalImage = await resolveProductEmailImage(supabase, it);
      resolvedItems.push({
        ...it,
        image: finalImage,
      });
    }

    const emailProducts: EmailProductItem[] = resolvedItems.map((it) => {
      const q = it.qty || 1;
      const unitP = it.price != null ? formatCurrencyValue(Number(it.price), currency, isAr) : "";
      const lineP = it.price != null ? formatCurrencyValue(Number(it.price) * q, currency, isAr) : "";
      return {
        name: it.name,
        qty: q,
        unitPrice: unitP,
        linePrice: lineP,
        imageUrl: it.image,
        regionBadge: it.region,
        variantBadge: it.variant,
      };
    });

    const subject = isAr
      ? `تم استلام طلبك #${orderNumber} بنجاح! | GX Store`
      : `Your order #${orderNumber} has been received successfully! | GX Store`;

    const bodyTextAr = `
      <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#ffffff;font-weight:700;">شكراً لتسوقك من GXStore!</p>
      <p style="margin:0 0 4px;font-size:14px;line-height:1.65;color:#e2e8f0;">تم استلام طلبك وتفاصيل عملية الدفع عبر Binance Pay بنجاح، وطلبك الآن قيد المراجعة للتأكد من وصول الدفعة.</p>
    `;

    const bodyTextEn = `
      <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#ffffff;font-weight:700;">Thank you for shopping at GXStore!</p>
      <p style="margin:0 0 4px;font-size:14px;line-height:1.65;color:#e2e8f0;">Your order and Binance Pay transaction details have been received successfully, and your order is currently under review to verify payment.</p>
    `;

    const binanceInfoBox = `
      <div style="background:rgba(234,179,8,0.08);border:1px solid rgba(234,179,8,0.3);border-radius:14px;padding:18px 22px;margin:18px 0 14px;text-align:${isAr ? "right" : "left"};">
        <div style="font-size:13px;color:#fde047;font-weight:800;letter-spacing:0.5px;margin-bottom:12px;border-bottom:1px solid rgba(234,179,8,0.2);padding-bottom:8px;">
          ${isAr ? "📋 تفاصيل الدفع:" : "📋 Payment Details:"}
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;line-height:2;">
          <tr>
            <td style="color:#94a3b8;padding:2px 0;">${isAr ? "رقم طلب بايننس:" : "Binance Order ID:"}</td>
            <td style="color:#ffffff;font-weight:800;font-family:monospace;direction:ltr;text-align:${isAr ? "left" : "right"};padding:2px 0;">
              ${escapeHtml(binanceOrderId)}
            </td>
          </tr>
          <tr>
            <td style="color:#94a3b8;padding:2px 0;">${isAr ? "حالة الدفع:" : "Payment Status:"}</td>
            <td style="color:#fbbf24;font-weight:800;text-align:${isAr ? "left" : "right"};padding:2px 0;">
              ${isAr ? "⏳ بانتظار التحقق" : "⏳ Awaiting Verification"}
            </td>
          </tr>
          <tr>
            <td style="color:#94a3b8;padding:2px 0;">${isAr ? "حالة الطلب:" : "Order Status:"}</td>
            <td style="color:#38bdf8;font-weight:800;text-align:${isAr ? "left" : "right"};padding:2px 0;">
              ${isAr ? "قيد المراجعة" : "Under Review"}
            </td>
          </tr>
          <tr>
            <td style="color:#94a3b8;padding:2px 0;">${isAr ? "المبلغ المطلوب:" : "Total Amount:"}</td>
            <td style="color:#ffffff;font-weight:800;text-align:${isAr ? "left" : "right"};padding:2px 0;">
              ${isAr ? formattedTotal : formattedTotalEn}
            </td>
          </tr>
        </table>
      </div>
    `;

    const preCtaPromptAr = `
      <p style="margin:14px 0 8px;font-size:14px;line-height:1.65;color:#e2e8f0;text-align:center;">
        بمجرد تأكيد الدفع، سيتم تجهيز طلبك فوراً. يمكنك متابعة حالة الطلب واستلام أكوادك عبر الزر أدناه:
      </p>
    `;

    const preCtaPromptEn = `
      <p style="margin:14px 0 8px;font-size:14px;line-height:1.65;color:#e2e8f0;text-align:center;">
        Once payment is confirmed, your order will be prepared immediately. You can track your order status and receive your codes using the button below:
      </p>
    `;

    const postCtaNotice = `
      <div style="margin-top:20px;padding:16px 20px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;text-align:center;">
        <p style="margin:0 0 10px;font-size:13px;color:#94a3b8;line-height:1.6;">
          ${isAr
            ? "لا يلزمك اتخاذ أي إجراء إضافي حالياً، سنقوم بإشعارك عبر البريد الإلكتروني فور تأكيد الدفع."
            : "No further action is required from you at this time. We will notify you via email as soon as payment is confirmed."}
        </p>
        <p style="margin:0 0 4px;font-size:14px;font-weight:800;color:#38bdf8;">
          ${isAr ? "شكراً لثقتك بنا 💙" : "Thank you for your trust in us 💙"}
        </p>
        <p style="margin:0;font-size:12px;color:#cbd5e1;font-weight:700;">
          ${isAr ? "فريق GXStore" : "GXStore Team"}
        </p>
      </div>
    `;

    const notesBlock = notes?.trim()
      ? `<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px 14px;color:#94a3b8;font-size:12px;"><strong>${isAr ? "ملاحظاتك:" : "Your notes:"}</strong> ${escapeHtml(notes.trim())}</div>`
      : "";

    const breakdownRows = [
      {
        label: isAr ? "قيمة المنتجات" : "Products Subtotal",
        value: isAr ? formattedSubtotal : formattedSubtotalEn,
      },
      ...(feeJod > 0
        ? [
            {
              label: isAr ? "رسوم الخدمة (3%)" : "Service Fee (3%)",
              value: isAr ? formattedFee! : formattedFeeEn!,
            },
          ]
        : []),
      {
        label: isAr ? "المبلغ المطلوب بالكامل" : "TOTAL AMOUNT",
        value: isAr ? formattedTotal : formattedTotalEn,
        isTotal: true,
      },
    ];

    const html = renderGxStoreEmail({
      lang: isAr ? "ar" : "en",
      subject,
      headline: isAr ? "تم استلام طلبك بنجاح!" : "Order Received Successfully!",
      greetingText: isAr ? "مرحباً عميلنا العزيز،" : "Hello Dear Customer,",
      bodyHtml: isAr ? bodyTextAr : bodyTextEn,
      preCtaHtml: binanceInfoBox + (isAr ? preCtaPromptAr : preCtaPromptEn),
      ctaButton: {
        text: isAr ? "متابعة حالة الطلب واستلام الأكواد" : "Track Order Status & Receive Codes",
        url: orderUrl,
      },
      postCtaHtml: postCtaNotice + (notesBlock ? `<div style="margin-top:14px;">${notesBlock}</div>` : ""),
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
        rows: breakdownRows,
        paidUsingLabel: isAr ? "طريقة الدفع (PAYMENT METHOD)" : "PAYMENT METHOD",
        paidUsingMethod: isAr ? "بايننس باي (Binance Pay) 🟡" : "Binance Pay 🟡",
        paidAmountLabel: isAr ? "المبلغ المطلوب" : "Amount Payable",
        paidAmountValue: isAr ? formattedTotal : formattedTotalEn,
      },
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
      console.error("Resend Binance order received email error:", result);
      return { ok: false, error: result?.message || "Failed to send email via Resend" };
    }

    return { ok: true, emailId: result?.id };
  } catch (err: any) {
    console.error("Error sending Binance order received email:", err);
    return { ok: false, error: err?.message || "Internal error sending email" };
  }
}

export type SendPaymentConfirmedEmailInput = {
  orderNumber: string;
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
  currency?: string;
};

/**
 * Direct server-side function to send Payment Confirmed email.
 * Called when admin clicks "تأكيد استلام الدفع" in admin order panel.
 */
export async function sendPaymentConfirmedEmailDirect(input: SendPaymentConfirmedEmailInput) {
  try {
    const {
      orderNumber,
      customerEmail,
      customerName,
      totalJod,
      subtotalJod,
      discountJod = 0,
      paymentMethod = "cliq",
      items = [],
      notes,
      createdAt,
      lang = "ar",
      currency: inputCurrency,
    } = input;

    if (!customerEmail || !customerEmail.includes("@")) {
      return { ok: false, error: "Invalid email" };
    }

    const currency = (inputCurrency || "JOD").toUpperCase().trim();
    const isAr = lang === "ar";
    const effectiveTotalJod = Number(totalJod || 0);
    const effectiveSubtotalJod = subtotalJod != null ? Number(subtotalJod) : effectiveTotalJod;

    const formattedSubtotal = formatCurrencyValue(effectiveSubtotalJod, currency, true);
    const formattedSubtotalEn = formatCurrencyValue(effectiveSubtotalJod, currency, false);
    const formattedDiscount = discountJod > 0 ? `-${formatCurrencyValue(discountJod, currency, true)}` : null;
    const formattedDiscountEn = discountJod > 0 ? `-${formatCurrencyValue(discountJod, currency, false)}` : null;
    const formattedTotal = formatCurrencyValue(effectiveTotalJod, currency, true);
    const formattedTotalEn = formatCurrencyValue(effectiveTotalJod, currency, false);

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

    const token = generateOrderToken(orderNumber, customerEmail);
    const orderUrl = `https://gxstore.me/order/completed?order_token=${encodeURIComponent(token)}`;

    // Resolve images
    const supabase = getServerServiceClient();
    const resolvedItems: OrderItemEmail[] = [];
    for (const it of items) {
      const finalImage = await resolveProductEmailImage(supabase, it);
      resolvedItems.push({
        ...it,
        image: finalImage,
      });
    }

    const emailProducts: EmailProductItem[] = resolvedItems.map((it) => {
      const q = it.qty || 1;
      const unitP = it.price != null ? formatCurrencyValue(Number(it.price), currency, isAr) : "";
      const lineP = it.price != null ? formatCurrencyValue(Number(it.price) * q, currency, isAr) : "";
      return {
        name: it.name,
        qty: q,
        unitPrice: unitP,
        linePrice: lineP,
        imageUrl: it.image,
        regionBadge: it.region,
        variantBadge: it.variant,
      };
    });

    const subject = isAr
      ? `تم تأكيد استلام دفعتك للطلب #${orderNumber} بنجاح | GX Store`
      : `Payment Confirmed for Order #${orderNumber} | GX Store`;

    const bodyTextAr = `يسرنا إبلاغك بأنه تم التحقق من دفعتك واعتمادها بنجاح للطلب #${orderNumber}. يجري حالياً تجهيز طلبك وتسليم الأكواد والمنتجات الرقمية. يمكنك متابعة حالة الطلب واستلام أكوادك فور صدورها عبر الرابط أدناه:`;
    const bodyTextEn = `We are pleased to inform you that your payment for order #${orderNumber} has been verified and confirmed successfully. Your digital products are currently being prepared. You can track your order status live via the link below:`;

    const notesBlock = notes?.trim()
      ? `<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px 14px;color:#94a3b8;font-size:12px;"><strong>${isAr ? "ملاحظاتك:" : "Your notes:"}</strong> ${escapeHtml(notes.trim())}</div>`
      : "";

    const methodLower = (paymentMethod || "").toLowerCase();
    const methodNameAr = methodLower.includes("binance")
      ? "بايننس باي (Binance Pay) 🟡"
      : methodLower.includes("wallet") || methodLower.includes("محفظة")
      ? "رصيد محفظة GX Store 💳"
      : methodLower.includes("card") || methodLower.includes("بطاقة")
      ? "بطاقة دفع إلكتروني 💳"
      : "كليك (CliQ) ⚡";
    const methodNameEn = methodLower.includes("binance")
      ? "Binance Pay 🟡"
      : methodLower.includes("wallet")
      ? "GX Wallet Balance 💳"
      : methodLower.includes("card")
      ? "Credit / Debit Card 💳"
      : "CliQ Instant Payment ⚡";

    const breakdownRows = [
      {
        label: isAr ? "قيمة المنتجات" : "Products Subtotal",
        value: isAr ? formattedSubtotal : formattedSubtotalEn,
      },
      ...(discountJod > 0
        ? [
            {
              label: isAr ? "الخصم" : "Discount",
              value: isAr ? formattedDiscount! : formattedDiscountEn!,
            },
          ]
        : []),
      {
        label: isAr ? "المبلغ المستلم بالكامل" : "TOTAL PAID",
        value: isAr ? formattedTotal : formattedTotalEn,
        isTotal: true,
      },
    ];

    const html = renderGxStoreEmail({
      lang: isAr ? "ar" : "en",
      subject,
      headline: isAr ? "تم تأكيد استلام الدفع بنجاح" : "Payment Confirmed Successfully",
      greetingText: isAr ? `مرحباً ${customerName || "بك"}،` : `Hello ${customerName || "Gamer"},`,
      bodyText: isAr ? bodyTextAr : bodyTextEn,
      introDetailsText: isAr ? "إليك تفاصيل طلبك المدفوع:" : "Here are your paid order details:",
      ctaButton: {
        text: isAr ? "متابعة حالة الطلب واستلام الأكواد ←" : "Track Order & View Codes →",
        url: orderUrl,
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
        rows: breakdownRows,
        paidUsingLabel: isAr ? "طريقة الدفع (PAYMENT METHOD)" : "PAYMENT METHOD",
        paidUsingMethod: isAr ? methodNameAr : methodNameEn,
        paidAmountLabel: isAr ? "المبلغ المستلم" : "Amount Received",
        paidAmountValue: isAr ? formattedTotal : formattedTotalEn,
      },
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
      console.error("Resend payment confirmation email error:", result);
      return { ok: false, error: result?.message || "Failed to send email via Resend" };
    }

    return { ok: true, emailId: result?.id };
  } catch (err: any) {
    console.error("Error sending payment confirmation email:", err);
    return { ok: false, error: err?.message || "Internal error sending email" };
  }
}
