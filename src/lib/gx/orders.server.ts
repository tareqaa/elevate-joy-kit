import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { loadCatalogPriceOverrides, priceCartItems, isAdminUser } from "./pricing.server";


type CreateOrderInput = {
  items: Json;
  totalJOD: number;
  currency: string;
  customerName?: string | null;
  customerWhatsapp?: string | null;
  contactType?: "whatsapp" | "telegram" | null;
  deliveryData?: Record<string, unknown>;
  userId?: string | null;
  coupon?: {
    id: string | null;
    userCouponId?: string | null;
    code: string;
    discount_jod: number;
  } | null;
  coins?: {
    coins: number;
    discount_jod: number;
  } | null;
  /** Store credit (refund balance) applied to this order, in JOD. */
  creditJod?: number | null;
};

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

/**
 * Server-side Supabase client used to place the order.
 * Prefers the service-role key. When it is not configured, it falls back to
 * the publishable key while forwarding the shopper's bearer token, so the
 * `create_store_order` security-definer function still runs as the right user.
 */
function getOrderClient(accessToken?: string | null) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SERVICE_ROLE_KEY;
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const key = serviceKey || publishableKey;
  if (!url || !key) {
    throw new Error(
      "Backend is not configured: missing " +
        (!url ? "SUPABASE_URL" : "SUPABASE_PUBLISHABLE_KEY") +
        " in the server environment.",
    );
  }
  const useUserToken = !serviceKey && !!accessToken;
  return createClient<Database>(url, key, {
    global: {
      fetch: createSupabaseFetch(key),
      ...(useUserToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {}),
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}


/** 1000 GX Coins = 1 JOD */
const COINS_PER_JOD = 1000;

/** Max cart lines accepted in a single order (matches the DB guard). */
const MAX_CART_LINES = 30;

/**
 * Abuse / input guard applied before anything touches the database.
 * Mirrors the `guard_order_insert` trigger so the user gets a clear Arabic
 * message instead of a raw database error.
 */
function validateOrderInput(input: CreateOrderInput) {
  const name = String(input.customerName ?? "").trim();
  if (name && (name.length < 2 || name.length > 60)) {
    throw new Error("الاسم غير صالح: يجب أن يكون بين حرفين و60 حرفاً");
  }

  const contact = String(input.customerWhatsapp ?? "").trim();
  if (!contact) {
    if (!input.userId) throw new Error("رقم التواصل مطلوب لإتمام الطلب");
  } else {
    if (contact.length > 30) throw new Error("رقم التواصل غير صالح: طويل جداً");
    if (!/^[0-9+\-\s()]+$/.test(contact)) {
      throw new Error("رقم التواصل غير صالح: استخدم أرقاماً فقط");
    }
    const digits = contact.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) {
      throw new Error("رقم التواصل غير صالح: تأكد من كتابة الرقم بشكل صحيح");
    }
  }

  const items = Array.isArray(input.items) ? (input.items as unknown as any[]) : [];
  if (items.length === 0) throw new Error("السلة فارغة");
  if (items.length > MAX_CART_LINES) {
    throw new Error(`عدد المنتجات في السلة كبير جداً (الحد الأقصى ${MAX_CART_LINES} منتجاً)`);
  }
  for (const it of items) {
    const qty = Number(it?.qty ?? it?.quantity ?? 1);
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
      throw new Error("الكمية غير صالحة: الحد الأقصى 99 لكل منتج");
    }
  }
}

export async function createStoreOrder(input: CreateOrderInput) {
  validateOrderInput(input);
  const supabase = getOrderClient(input.accessToken);



  const deliveryData: Record<string, unknown> = { ...(input.deliveryData ?? {}) };
  if (input.contactType) deliveryData.contact_type = input.contactType;
  // Only the code travels with the order note; the discount is whatever the
  // database says it is.
  if (input.coupon?.code) deliveryData.coupon = { code: input.coupon.code };

  // ---- Server-side price verification -------------------------------------
  // Nothing money-related from the client is trusted. Every line is re-priced
  // from the catalog + live overrides, and the total is rebuilt from scratch.
  const rawItems = Array.isArray(input.items) ? (input.items as unknown as any[]) : [];
  const [overrides, isAdmin] = await Promise.all([
    loadCatalogPriceOverrides(supabase),
    isAdminUser(supabase, input.userId),
  ]);
  const priced = priceCartItems(rawItems, overrides, { allowCustom: isAdmin });
  const subtotal = priced.subtotal;

  // Rewrite the stored line prices with the verified ones.
  const verifiedItems = rawItems.map((it, i) => ({
    ...it,
    qty: priced.lines[i].qty,
    price: priced.lines[i].unitPrice,
  })) as unknown as Json;

  // Coin discount is ALWAYS derived from the coin count server-side so a
  // tampered client can never claim a bigger discount than the coins it spends.
  const coinsUsed = Math.max(0, Math.floor(Number(input.coins?.coins ?? 0)));
  const creditJod = Math.max(0, Number(input.creditJod ?? 0));
  // input.coupon.discount_jod / .id / .userCouponId are IGNORED on purpose:
  // the coupon is re-read and re-priced from the database by its code alone.
  const couponCode = input.coupon?.code?.trim() || null;

  // ---- Single atomic purchase transaction ---------------------------------
  // Everything that follows (coupon validation + redemption, balance checks,
  // order insert, coin + credit deduction, ledger writes) happens inside ONE
  // plpgsql function that locks the buyer's profile row first. Any failure
  // raises and rolls the whole thing back: no half-written orders, no double
  // spending, no coupon used twice.
  const { data, error } = await (supabase as any).rpc("create_store_order", {
    _user_id: input.userId ?? null,
    _customer_name: input.customerName ?? null,
    _customer_whatsapp: input.customerWhatsapp ?? null,
    _items: verifiedItems,
    _subtotal: subtotal,
    _currency: input.currency,
    _delivery_data: deliveryData,
    _contact_type: input.contactType ?? null,
    _coupon_code: couponCode,
    _coins_used: coinsUsed,
    _credit_jod: creditJod,
    // Used for nothing but the integrity check inside the transaction.
    _client_total: Number(input.totalJOD ?? 0),
  });

  if (error) throw new Error(error.message);
  const result = data as { id?: string; order_number?: string } | null;
  if (!result?.order_number) throw new Error("Order was not created");


  return { id: result.id as string, order_number: result.order_number };
}



