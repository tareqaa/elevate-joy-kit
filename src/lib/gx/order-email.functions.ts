import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { resolveSafeClientIp } from "./ip";
import { z } from "zod";
import crypto from "node:crypto";
import { getPublicClient, assertAdminCaller, getVerifiedCaller, getUserScopedClient } from "@/lib/gx/supabase-request";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv, supabaseFetch } from "@/lib/gx/supabase-request";
import type { Database } from "@/integrations/supabase/types";
import { resolveProductImage } from "./product-images";
import { getResendApiKey } from "./resend-key";
import { formatFullRegion } from "./region";
import { renderDriffleEmail, escapeHtml, type EmailProductItem } from "./email-theme";

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
    console.error("verifyOrderToken failed:", err?.message);
    return { valid: false, error: "فشل التحقق من صحة الرمز" };
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
export function sanitizeImageForEmail(url?: string | null, name?: string, slug?: string, cartId?: string): string {
  const cleanName = (name || "").toLowerCase();
  const cleanSlug = (slug || "").toLowerCase();
  const cleanId = (cartId || "").toLowerCase();

  // 1. Check canonical unified registry first (TOD variants, Valorant, Discord, Game Pass, Roblox, Gemini, etc.)
  const canonical = resolveProductImage({
    cartId: cleanId || cleanSlug,
    slug: cleanSlug,
    name: cleanName,
  });
  if (canonical) {
    return toAbsoluteUrl(canonical);
  }

  // 2. If a URL is provided (e.g. from Supabase products table or order items)
  if (url && typeof url === "string" && url.trim()) {
    let clean = url.trim();

    // Specific products FIRST before generic brand overrides!
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
      cleanName.includes("robux") ||
      cleanName.includes("روبوكس")
    ) {
      return `${CDN_ASSETS_BASE}/app/assets/img/catalog/roblox-robux.jpg`;
    }

    // Map specific known SVG/legacy paths to verified CDN assets
    if (
      clean.includes("gemini") ||
      cleanSlug.includes("gemini") ||
      cleanName.includes("gemini") ||
      cleanName.includes("جيمناي") ||
      cleanName.includes("جيميناي") ||
      cleanName.includes("جيميني") ||
      cleanName.includes("google ai") ||
      cleanName.includes("قوقل ai")
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

    if (
      clean.includes("itunes") ||
      cleanSlug.includes("itunes") ||
      cleanName.includes("itunes") ||
      cleanName.includes("آيتونز") ||
      cleanName.includes("ايتونز") ||
      clean.includes("apple") ||
      cleanSlug.includes("apple") ||
      cleanName.includes("آبل") ||
      cleanName.includes("ابل")
    ) {
      return `${CDN_ASSETS_BASE}/app/assets/img/itunes-card.png`;
    }

    if (clean.includes("playstation") || cleanSlug.includes("playstation") || cleanSlug.includes("psn")) {
      return `${CDN_ASSETS_BASE}/app/assets/img/playstation-store-card.jpg`;
    }

    if (clean.includes("steam") || cleanSlug.includes("steam")) {
      return `${CDN_ASSETS_BASE}/app/assets/img/catalog/steam.jpg`;
    }

    if (clean.includes("xbox") || cleanSlug.includes("xbox")) {
      return `${CDN_ASSETS_BASE}/app/assets/img/catalog/xbox.jpg`;
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
    cleanName.includes("جيميني") ||
    cleanName.includes("google ai") ||
    cleanName.includes("قوقل ai")
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
    return `${CDN_ASSETS_BASE}/app/assets/img/playstation-store-card.jpg`;
  }

  if (
    cleanSlug === "xbox-game-pass-ultimate" ||
    cleanId.startsWith("gpu-") ||
    cleanSlug.startsWith("gpu-") ||
    cleanName.includes("ultimate") ||
    cleanName.includes("التيمت") ||
    cleanName.includes("التميت")
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/xbox-game-pass-ultimate.jpg`;
  }

  if (
    cleanSlug === "pc-game-pass" ||
    cleanId.startsWith("pcgp-") ||
    cleanSlug.startsWith("pcgp-") ||
    (cleanName.includes("game pass") && cleanName.includes("pc")) ||
    (cleanName.includes("قيم باس") && cleanName.includes("pc"))
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/pc-game-pass.jpg`;
  }

  if (
    cleanSlug.includes("xbox") ||
    cleanName.includes("xbox") ||
    cleanName.includes("اكس بوكس")
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
    cleanSlug.includes("autodesk") ||
    cleanName.includes("autodesk") ||
    cleanName.includes("أوتوديسك")
  ) {
    return `${CDN_ASSETS_BASE}/app/assets/img/catalog/autodesk-cover.jpg`;
  }

  const isExplicitTod =
    cleanSlug === "tod" ||
    cleanSlug.startsWith("tod-") ||
    cleanName.startsWith("tod") ||
    cleanName.includes("تود") ||
    cleanName.includes(" tod");

  if (isExplicitTod && !cleanSlug.includes("autodesk")) {
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
  item: { name?: string; slug?: string; image?: string; id?: string; variant?: string; cartId?: string }
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
  return sanitizeImageForEmail(rawCandidate, item.name, item.slug, item.variant || item.cartId);
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

      const html = renderDriffleEmail({
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

      const html = renderDriffleEmail({
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
        ip = resolveSafeClientIp(getRequestHeader);
      } catch {
        ip = null;
      }
      const country = getRequestHeader("cf-ipcountry")?.trim() || null;
      const city = getRequestHeader("cf-ipcity")?.trim() || null;
      const userAgent = (getRequestHeader("user-agent") || "").slice(0, 300).trim() || null;

      const now = new Date().toISOString();
      const { data: current } = await (supabase as any)
        .from("orders")
        .select("id, delivery_data, codes_revealed_at, codes_reveal_count")
        .eq("order_number", num)
        .maybeSingle();

      if (!current) {
        return { ok: false };
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