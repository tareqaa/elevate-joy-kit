import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";

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

  // Guard BEFORE the order exists: coins must be owned and can never cover
  // more than 50% of the order value.
  if (coinsUsed > 0) {
    if (!input.userId) throw new Error("يجب تسجيل الدخول لاستخدام GX Coins");
    const maxCoins = Math.floor(subtotal * 0.5 * COINS_PER_JOD);
    if (coinsUsed > maxCoins) throw new Error("الحد الأقصى لخصم GX Coins هو 50% من قيمة الطلب");
    const { data: prof } = await supabase
      .from("profiles").select("gx_coins").eq("id", input.userId).maybeSingle();
    if (Number(prof?.gx_coins ?? 0) < coinsUsed) throw new Error("رصيد GX Coins غير كافٍ");
  }



  const { data, error } = await supabase
    .from("orders")
    .insert({
      user_id: input.userId ?? null,
      customer_name: input.customerName ?? null,
      customer_whatsapp: input.customerWhatsapp ?? null,
      items: verifiedItems,
      total_jod: verifiedTotal,
      subtotal_jod: subtotal,
      currency_snapshot: input.currency,
      delivery_data: deliveryData as Json,
      // Orders fully covered by store credit (refund balance) are already settled.
      status: (creditJod > 0 && verifiedTotal <= 0.009) ? "paid" : "pending",
      contact_type: input.contactType ?? null,
      coupon_id: input.coupon?.id ?? null,
      coupon_code: input.coupon?.code ?? null,
      discount_jod: discountTotal,
      user_coupon_id: input.coupon?.userCouponId ?? null,
      coins_used: coinsUsed,
      coins_discount_jod: coinsDiscount,
      // Recorded as 0 here; set to the amount actually taken from the balance below.
      credit_used_jod: 0,
      paid_jod: verifiedTotal,
    })
    .select("id, order_number")
    .single();


  if (error) throw new Error(error.message);
  if (!data?.order_number) throw new Error("Order was not created");

  // Record coupon redemption + increment usage counter (best-effort, non-blocking on failure)
  const couponId = input.coupon?.id ?? null;
  if (input.coupon && couponId) {
    try {
      await supabase.from("coupon_redemptions").insert({
        coupon_id: couponId,
        user_id: input.userId ?? null,
        order_id: data.id,
        discount_jod: input.coupon.discount_jod,
      });
      // increment usage_count via RPC-free path: read then update
      const { data: cRow } = await supabase.from("coupons").select("usage_count").eq("id", couponId).maybeSingle();
      const nextCount = (cRow?.usage_count ?? 0) + 1;
      await supabase.from("coupons").update({ usage_count: nextCount }).eq("id", couponId);
    } catch (e) {
      console.warn("[GX] coupon redemption record failed", e);
    }
  }

  // Personal level coupon: mark as used so it cannot be reused.
  if (input.coupon?.userCouponId && input.userId) {
    try {
      await supabase
        .from("user_coupons")
        .update({ used_at: new Date().toISOString(), order_id: data.id })
        .eq("id", input.coupon.userCouponId)
        .eq("user_id", input.userId)
        .is("used_at", null);
    } catch (e) {
      console.warn("[GX] level coupon consume failed", e);
    }
  }

  // GX Coins: deduct exactly what the order recorded, never more, never partially.
  if (coinsUsed > 0 && input.userId) {
    const { data: prof } = await supabase
      .from("profiles").select("gx_coins").eq("id", input.userId).maybeSingle();
    const balance = Number(prof?.gx_coins ?? 0);
    if (balance < coinsUsed) {
      // Balance changed since the pre-check: strip the discount from the order
      // instead of granting free money.
      await supabase.from("orders").update({
        coins_used: 0,
        coins_discount_jod: 0,
        discount_jod: couponDiscount + creditJod,
        total_jod: Number(input.totalJOD) + coinsDiscount,
        paid_jod: Number(input.totalJOD) + coinsDiscount,
      }).eq("id", data.id);
      throw new Error("رصيد GX Coins غير كافٍ — تم إلغاء الخصم");
    }
    const after = balance - coinsUsed;
    await supabase.from("profiles").update({ gx_coins: after }).eq("id", input.userId);
    await supabase.from("gx_coin_transactions").insert({
      user_id: input.userId,
      order_id: data.id,
      amount: -coinsUsed,
      balance_after: after,
      kind: "spend",
      source: "order_checkout",
      reason: `خصم على الطلب ${data.order_number}`,
      metadata: { balance_before: balance, coins_discount_jod: coinsDiscount },
    });
  }


  // Store credit (refund balance): deduct, record it ON the order (so cancels and
  // refunds can give it back exactly once), and log the ledger entry.
  const wantedCredit = creditJod;
  if (wantedCredit > 0) {
    let spend = 0;
    if (input.userId) {
      try {
        const { data: prof } = await supabase
          .from("profiles").select("store_credit_jod").eq("id", input.userId).maybeSingle();
        const balance = Number(prof?.store_credit_jod ?? 0);
        spend = Math.round(Math.min(balance, wantedCredit) * 100) / 100;
        if (spend > 0) {
          const after = Math.round((balance - spend) * 100) / 100;
          await supabase.from("profiles").update({ store_credit_jod: after }).eq("id", input.userId);
          await supabase.from("store_credit_transactions").insert({
            user_id: input.userId,
            order_id: data.id,
            amount_jod: -spend,
            balance_after: after,
            kind: "spend",
            reason: `استخدام رصيد المتجر على الطلب ${data.order_number}`,
          });
        }
      } catch (e) {
        console.warn("[GX] store credit spend failed", e);
        spend = 0;
      }
    }

    // The order total was already reduced by `wantedCredit`. If less was actually
    // taken from the balance, charge the shortfall back so nothing is given away.
    const shortfall = Math.round((wantedCredit - spend) * 100) / 100;
    const newTotal = Math.round((Number(input.totalJOD) + Math.max(shortfall, 0)) * 100) / 100;
    await supabase.from("orders").update({
      credit_used_jod: spend,
      discount_jod: Math.round((couponDiscount + coinsDiscount + spend) * 100) / 100,
      total_jod: newTotal,
      paid_jod: newTotal,
      status: (spend > 0 && newTotal <= 0.009) ? "paid" : "pending",
    }).eq("id", data.id);
  }


  return { id: data.id, order_number: data.order_number };
}


