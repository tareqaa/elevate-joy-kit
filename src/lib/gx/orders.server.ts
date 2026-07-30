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

function getAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Backend is not configured: missing " +
        (!url ? "SUPABASE_URL" : "SUPABASE_SERVICE_ROLE_KEY") +
        " in the server environment.",
    );
  }
  return createClient<Database>(url, key, {
    global: { fetch: createSupabaseFetch(key) },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

/** 1000 GX Coins = 1 JOD */
const COINS_PER_JOD = 1000;

export async function createStoreOrder(input: CreateOrderInput) {
  const supabase = getAdminClient();

  const deliveryData: Record<string, unknown> = { ...(input.deliveryData ?? {}) };
  if (input.contactType) deliveryData.contact_type = input.contactType;
  if (input.coupon) deliveryData.coupon = { code: input.coupon.code, discount_jod: input.coupon.discount_jod };

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

  let couponDiscount = Math.max(0, Number(input.coupon?.discount_jod ?? 0));
  // Coin discount is ALWAYS derived from the coin count server-side so a
  // tampered client can never claim a bigger discount than the coins it spends.
  const coinsUsed = Math.max(0, Math.floor(Number(input.coins?.coins ?? 0)));
  const coinsDiscount = Math.round((coinsUsed / COINS_PER_JOD) * 1000) / 1000;
  let creditJod = Math.max(0, Number(input.creditJod ?? 0));

  couponDiscount = Math.min(couponDiscount, subtotal);
  creditJod = Math.min(creditJod, Math.max(subtotal - couponDiscount - coinsDiscount, 0));
  const discountTotal = Math.round((couponDiscount + coinsDiscount + creditJod) * 1000) / 1000;
  const verifiedTotal = Math.round(Math.max(subtotal - discountTotal, 0) * 100) / 100;

  // The client-sent total is used for nothing but this integrity check.
  if (Math.abs(Number(input.totalJOD ?? NaN) - verifiedTotal) > 0.001) {
    throw new Error("تغيّر السعر، أعد تحميل الصفحة");
  }

  // ---- Single atomic purchase transaction ---------------------------------
  // Everything that follows (balance checks, order insert, coin + credit
  // deduction, coupon redemption, ledger writes) happens inside ONE plpgsql
  // function that locks the buyer's profile row first. Any failure raises and
  // rolls the whole thing back: no half-written orders, no double spending.
  const { data, error } = await (supabase as any).rpc("create_store_order", {
    _user_id: input.userId ?? null,
    _customer_name: input.customerName ?? null,
    _customer_whatsapp: input.customerWhatsapp ?? null,
    _items: verifiedItems,
    _subtotal: subtotal,
    _currency: input.currency,
    _delivery_data: deliveryData,
    _contact_type: input.contactType ?? null,
    _coupon_id: input.coupon?.id ?? null,
    _user_coupon_id: input.coupon?.userCouponId ?? null,
    _coupon_code: input.coupon?.code ?? null,
    _coupon_discount: couponDiscount,
    _coins_used: coinsUsed,
    _credit_jod: creditJod,
  });

  if (error) throw new Error(error.message);
  const result = data as { id?: string; order_number?: string } | null;
  if (!result?.order_number) throw new Error("Order was not created");

  return { id: result.id as string, order_number: result.order_number };
}



